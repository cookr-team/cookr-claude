-- ==============================================================================
-- COOKR - HARDENING DE SEGURANÇA (RLS, privilégios e integridade)
-- ==============================================================================
-- Aplicar no SQL Editor do projeto Supabase da Cookr, DEPOIS do SUPABASE_SETUP.sql
-- (ou como migração normal). É idempotente: pode ser executado mais do que uma vez.
--
-- O que corrige:
--  1. is_admin() deixava de confiar em user_metadata (que o próprio utilizador edita).
--  2. Contexto de confiança (service_role / SQL Editor / admin) para triggers de proteção.
--  3. profiles: registo sem auto-promoção; role/status/pontos/badges/notas protegidos.
--  4. chefs: aprovação, bypass HACCP e rating deixam de ser editáveis pelo chef;
--     o rating passa a ser calculado por trigger a partir das avaliações.
--  5. bookings: estado, preço, PIN e participantes protegidos; estados terminais bloqueados.
--  6. notifications / reviews / loyalty_history: já não se podem falsificar.
--  7. profiles/users deixam de ser legíveis por utilizadores anónimos.
--  8. Realtime: só as tabelas necessárias (em vez de FOR ALL TABLES).
--  9. Índices em chaves estrangeiras usadas pelo RLS.
--
-- NOTA: os campos sensíveis dos chefs (iban, nif, morada de faturação, admin_notes) continuam
-- na tabela profiles. Mover para uma tabela privada exige alterações na app (ver PR).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. is_admin() e contexto de confiança
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- app_metadata só pode ser alterado com a service role (não pelo utilizador).
    -- user_metadata NUNCA é de confiança: o utilizador edita-o com auth.updateUser().
    IF coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' THEN
        RETURN TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Compatibilidade com a tabela legada public.users
    IF to_regclass('public.users') IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Contexto "de confiança": admin, service_role, SQL Editor/migrações, ou funções internas
-- que ativaram a flag cookr.trusted dentro da transação.
CREATE OR REPLACE FUNCTION public.is_trusted_context()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.is_admin()
        OR coalesce(auth.role(), '') = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin')
        OR coalesce(current_setting('cookr.trusted', true), '') = '1';
$$;

REVOKE EXECUTE ON FUNCTION public.is_trusted_context() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. PROFILES: registo seguro e campos privilegiados
-- ------------------------------------------------------------------------------
-- 2.1 INSERT: ninguém se regista como admin; chefs entram "em revisão"; sem pontos iniciais.
CREATE OR REPLACE FUNCTION public.sanitize_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    -- Upsert de um perfil que já existe: o trigger de UPDATE trata das proteções.
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    IF NEW.role NOT IN ('client', 'cook') THEN
        RAISE EXCEPTION 'Acesso negado: não é permitido registar uma conta com role "%".', NEW.role;
    END IF;

    NEW.status := CASE WHEN NEW.role = 'cook' THEN 'under_review' ELSE 'active' END;
    NEW.loyalty_points := 0;
    NEW.admin_notes := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_role_insert ON public.profiles;
DROP TRIGGER IF EXISTS trg_sanitize_profile_insert ON public.profiles;
CREATE TRIGGER trg_sanitize_profile_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sanitize_profile_insert();

-- 2.2 UPDATE: role/status continuam a dar erro; pontos, badges e notas são repostos em silêncio
--     (compatível com upserts da app que enviam o objeto de perfil completo).
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_trusted_context() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "role".';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "status".';
        END IF;
        NEW.loyalty_points := OLD.loyalty_points;
        NEW.badges := OLD.badges;
        NEW.admin_notes := OLD.admin_notes;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role_status ON public.profiles;
DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- 2.3 Tabela legada public.users: mantém a proteção de role/status (agora com search_path fixo)
CREATE OR REPLACE FUNCTION public.prevent_role_status_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_trusted_context() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "role".';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "status".';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_self_promotion_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.role = 'admin' AND NOT public.is_trusted_context() THEN
        RAISE EXCEPTION 'Acesso negado: não é permitido registar uma conta com role "admin" diretamente.';
    END IF;
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. CHEFS: campos privilegiados e rating calculado
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_chef_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Upsert de um chef existente: tratado como UPDATE abaixo (repõe os valores antigos).
        IF EXISTS (SELECT 1 FROM public.chefs WHERE profile_id = NEW.profile_id) THEN
            RETURN NEW;
        END IF;
        NEW.approved_by_admin := FALSE;
        NEW.bypass_haccp_restrictions := FALSE;
        NEW.rating := 5.0;
        NEW.total_avaliacoes := 0;
        NEW.total_reservas := 0;
    ELSE
        NEW.approved_by_admin := OLD.approved_by_admin;
        NEW.bypass_haccp_restrictions := OLD.bypass_haccp_restrictions;
        NEW.rating := OLD.rating;
        NEW.total_avaliacoes := OLD.total_avaliacoes;
        NEW.total_reservas := OLD.total_reservas;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_chef_privileged_fields ON public.chefs;
CREATE TRIGGER trg_guard_chef_privileged_fields
BEFORE INSERT OR UPDATE ON public.chefs
FOR EACH ROW EXECUTE FUNCTION public.guard_chef_privileged_fields();

-- O rating e o nº de avaliações passam a ser calculados no servidor.
CREATE OR REPLACE FUNCTION public.refresh_chef_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cook UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_cook := OLD.cook_id;
    ELSE
        v_cook := NEW.cook_id;
    END IF;
    IF v_cook IS NULL THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('cookr.trusted', '1', true);
    UPDATE public.chefs c
       SET rating = coalesce(s.avg_rating, 5.0),
           total_avaliacoes = coalesce(s.cnt, 0)
      FROM (
            SELECT round(avg(r.rating)::numeric, 1) AS avg_rating, count(*) AS cnt
              FROM public.reviews r
             WHERE r.cook_id = v_cook
               AND coalesce((to_jsonb(r) ->> 'is_hidden')::boolean, FALSE) = FALSE
           ) s
     WHERE c.profile_id = v_cook;
    PERFORM set_config('cookr.trusted', '', true);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_chef_rating ON public.reviews;
CREATE TRIGGER trg_refresh_chef_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_chef_rating();

-- ------------------------------------------------------------------------------
-- 4. BOOKINGS: estado, preço, PIN e participantes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_booking_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    IF NEW.client_id IS NULL OR NEW.cook_id IS NULL OR NEW.client_id = NEW.cook_id THEN
        RAISE EXCEPTION 'Reserva inválida: cliente e chef têm de ser pessoas diferentes.';
    END IF;

    -- Uma reserva nova nasce sempre pendente e sem dados de cancelamento/finalização.
    NEW.status := 'pending';
    NEW.is_finalizing := FALSE;
    NEW.cancelled_at := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancellation_reason := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_insert ON public.bookings;
CREATE TRIGGER trg_guard_booking_insert
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_insert();

CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_is_client BOOLEAN := (auth.uid() IS NOT NULL AND auth.uid() = OLD.client_id);
    v_is_cook   BOOLEAN := (auth.uid() IS NOT NULL AND auth.uid() = OLD.cook_id);
    v_old       JSONB := to_jsonb(OLD);
    v_new       JSONB := to_jsonb(NEW);
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    -- Os participantes não mudam.
    IF NEW.cook_id IS DISTINCT FROM OLD.cook_id OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
        RAISE EXCEPTION 'Acesso negado: não é possível alterar os participantes de uma reserva.';
    END IF;

    -- Preço e PIN só mudam enquanto a reserva está pendente.
    -- (cobre as duas grafias de coluna: valor_total e valortotal)
    IF OLD.status <> 'pending' AND (
           (v_new ->> 'valor_total')  IS DISTINCT FROM (v_old ->> 'valor_total')
        OR (v_new ->> 'valortotal')   IS DISTINCT FROM (v_old ->> 'valortotal')
        OR (v_new ->> 'service_pin')  IS DISTINCT FROM (v_old ->> 'service_pin')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: o valor e o PIN só podem ser alterados numa reserva pendente.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Estados terminais são definitivos.
        IF OLD.status IN ('completed', 'cancelled', 'cancelled_partial_refund', 'rejected') THEN
            RAISE EXCEPTION 'Acesso negado: a reserva já está em estado final (%).', OLD.status;
        END IF;

        IF NEW.status = 'completed' THEN
            -- Só o chef conclui, e só um serviço já aceite.
            IF NOT (v_is_cook AND OLD.status IN ('accepted', 'in_progress')) THEN
                RAISE EXCEPTION 'Acesso negado: apenas o chef pode concluir um serviço aceite.';
            END IF;
        ELSIF v_is_cook THEN
            IF NEW.status NOT IN ('accepted', 'rejected', 'in_progress', 'cancelled',
                                  'cancelled_partial_refund', 'reschedule_requested') THEN
                RAISE EXCEPTION 'Acesso negado: transição de estado não permitida (%).', NEW.status;
            END IF;
        ELSIF v_is_client THEN
            IF NOT (
                NEW.status IN ('cancelled', 'cancelled_partial_refund', 'reschedule_requested')
                OR (NEW.status = 'accepted' AND OLD.status = 'reschedule_requested')
            ) THEN
                RAISE EXCEPTION 'Acesso negado: o cliente não pode definir o estado "%".', NEW.status;
            END IF;
        ELSE
            RAISE EXCEPTION 'Acesso negado: sem permissão para alterar o estado desta reserva.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_update ON public.bookings;
CREATE TRIGGER trg_guard_booking_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_update();

-- Pontos de fidelidade atribuídos no servidor, uma única vez por reserva concluída
-- (antes a app tentava inserir no histórico de outro utilizador e o RLS recusava).
ALTER TABLE public.loyalty_history ADD COLUMN IF NOT EXISTS booking_id UUID;

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_history_booking
        ON public.loyalty_history (user_id, booking_id) WHERE booking_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Índice uq_loyalty_history_booking não criado: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.award_booking_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_value  NUMERIC;
    v_points INTEGER;
    v_rows   INTEGER;
BEGIN
    BEGIN
        PERFORM set_config('cookr.trusted', '1', true);

        IF NEW.cook_id IS NOT NULL THEN
            UPDATE public.chefs SET total_reservas = coalesce(total_reservas, 0) + 1
             WHERE profile_id = NEW.cook_id;
        END IF;

        v_value := coalesce((to_jsonb(NEW) ->> 'valor_total')::numeric,
                            (to_jsonb(NEW) ->> 'valortotal')::numeric, 0);
        v_points := floor(v_value)::integer;

        IF NEW.client_id IS NOT NULL AND v_points > 0 THEN
            INSERT INTO public.loyalty_history (user_id, points, type, description, booking_id)
            VALUES (NEW.client_id, v_points, 'earn',
                    'Reserva concluída: ' || coalesce(NEW.menu_selected, ''), NEW.id)
            ON CONFLICT (user_id, booking_id) WHERE booking_id IS NOT NULL DO NOTHING;
            GET DIAGNOSTICS v_rows = ROW_COUNT;

            IF v_rows > 0 THEN
                UPDATE public.profiles
                   SET loyalty_points = coalesce(loyalty_points, 0) + v_points
                 WHERE id = NEW.client_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Nunca bloquear a conclusão do serviço por causa dos pontos.
        RAISE WARNING 'award_booking_completion: %', SQLERRM;
    END;
    PERFORM set_config('cookr.trusted', '', true);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_booking_completion ON public.bookings;
CREATE TRIGGER trg_award_booking_completion
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.award_booking_completion();

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS RLS
-- ------------------------------------------------------------------------------
-- 5.1 profiles/users: sem acesso anónimo; chefs só visíveis quando ativos
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
    OR (role = 'cook' AND status = 'active')
);

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        DROP POLICY IF EXISTS "users_select_policy" ON public.users;
        CREATE POLICY "users_select_policy" ON public.users
        FOR SELECT TO authenticated
        USING (
            auth.uid() = id
            OR public.is_admin()
            OR (role = 'cook' AND status = 'active')
        );
    END IF;
END $$;

-- 5.2 notifications: só para si, para quem partilha uma reserva consigo, ou admin
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.bookings b
         WHERE (b.client_id = auth.uid() AND b.cook_id = notifications.user_id)
            OR (b.cook_id = auth.uid() AND b.client_id = notifications.user_id)
    )
);

-- 5.3 reviews: só quem concluiu uma reserva com esse chef; no máximo uma por reserva
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
CREATE POLICY "reviews_insert_policy" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        auth.uid() = client_id
        AND EXISTS (
            SELECT 1 FROM public.bookings b
             WHERE b.client_id = auth.uid()
               AND b.cook_id = reviews.cook_id
               AND b.status = 'completed'
               AND (reviews.booking_id IS NULL OR b.id = reviews.booking_id)
        )
    )
);

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_booking
        ON public.reviews (booking_id) WHERE booking_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Índice uq_reviews_booking não criado (há avaliações duplicadas por reserva?): %', SQLERRM;
END $$;

-- 5.4 loyalty_history: só o servidor/admin escreve (os pontos vêm do trigger acima)
DROP POLICY IF EXISTS "loyalty_history_insert_policy" ON public.loyalty_history;
CREATE POLICY "loyalty_history_insert_policy" ON public.loyalty_history
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. REALTIME: apenas as tabelas necessárias (em vez de FOR ALL TABLES)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables) THEN
        DROP PUBLICATION supabase_realtime;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH t IN ARRAY ARRAY['messages', 'notifications', 'bookings'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 7. ÍNDICES nas chaves usadas pelo RLS e pelas listagens
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_cook_id     ON public.bookings (cook_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id   ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id   ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_cook_id      ON public.reviews (cook_id);
CREATE INDEX IF NOT EXISTS idx_menus_cook_id        ON public.menus (cook_id);

-- ==============================================================================
-- FIM. Depois de aplicar, confirme que o seu utilizador admin tem role = 'admin'
-- na tabela public.profiles (já não basta user_metadata):
--   SELECT id, email, role FROM public.profiles WHERE role = 'admin';
-- ==============================================================================
