-- ==============================================================================
-- COOKR — Dados privados (IBAN/NIF/faturação/notas de admin) e PIN do serviço
-- Aplicar DEPOIS de 20261122000000_security_hardening.sql.
--
-- 1. profile_private: nif, iban, dados de faturação. Só o próprio e o admin leem.
-- 2. profile_admin_notes: notas internas. Só o admin lê.
-- 3. booking_secrets: PIN do serviço. Só o cliente da reserva e o admin leem.
-- 4. complete_booking_with_pin(): o servidor valida o PIN (máx. 5 tentativas);
--    o chef deixa de poder ler o PIN ou concluir sem ele.
--
-- A app continua a escrever nas colunas antigas (profiles.iban, bookings.service_pin...);
-- triggers movem o valor para as tabelas privadas e deixam a coluna antiga a NULL.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabelas privadas de perfis
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_private (
    id              UUID PRIMARY KEY,
    nif             TEXT,
    iban            TEXT,
    fiscal_name     TEXT,
    billing_address TEXT,
    billing_street  TEXT,
    billing_number  TEXT,
    billing_floor   TEXT,
    billing_zip     TEXT,
    billing_city    TEXT,
    billing_country TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.profile_private
        ADD CONSTRAINT profile_private_id_fkey FOREIGN KEY (id)
        REFERENCES public.profiles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN OTHERS THEN RAISE NOTICE 'FK profile_private não criada: %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS public.profile_admin_notes (
    id          UUID PRIMARY KEY,
    admin_notes TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    ALTER TABLE public.profile_admin_notes
        ADD CONSTRAINT profile_admin_notes_id_fkey FOREIGN KEY (id)
        REFERENCES public.profiles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL;
          WHEN OTHERS THEN RAISE NOTICE 'FK profile_admin_notes não criada: %', SQLERRM;
END $$;

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_private_select ON public.profile_private;
CREATE POLICY profile_private_select ON public.profile_private
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS profile_private_admin_all ON public.profile_private;
CREATE POLICY profile_private_admin_all ON public.profile_private
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS profile_admin_notes_admin ON public.profile_admin_notes;
CREATE POLICY profile_admin_notes_admin ON public.profile_admin_notes
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger: tudo o que a app escreve nestas colunas de profiles vai para as tabelas privadas.
CREATE OR REPLACE FUNCTION public.move_profile_private_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_new   JSONB := to_jsonb(NEW);
    v_keys  TEXT[] := ARRAY['nif','iban','fiscal_name','billing_address','billing_street',
                            'billing_number','billing_floor','billing_zip','billing_city','billing_country'];
    v_patch JSONB;
    v_nulls JSONB;
BEGIN
    SELECT coalesce(jsonb_object_agg(k, v_new -> k), '{}'::jsonb) INTO v_patch
    FROM unnest(v_keys) AS k
    WHERE v_new ? k AND jsonb_typeof(v_new -> k) <> 'null';

    IF v_patch <> '{}'::jsonb THEN
        INSERT INTO public.profile_private AS pp
            (id, nif, iban, fiscal_name, billing_address, billing_street, billing_number,
             billing_floor, billing_zip, billing_city, billing_country)
        SELECT NEW.id, r.nif, r.iban, r.fiscal_name, r.billing_address, r.billing_street, r.billing_number,
               r.billing_floor, r.billing_zip, r.billing_city, r.billing_country
        FROM jsonb_populate_record(NULL::public.profile_private, v_patch) AS r
        ON CONFLICT (id) DO UPDATE SET
            nif             = coalesce(EXCLUDED.nif, pp.nif),
            iban            = coalesce(EXCLUDED.iban, pp.iban),
            fiscal_name     = coalesce(EXCLUDED.fiscal_name, pp.fiscal_name),
            billing_address = coalesce(EXCLUDED.billing_address, pp.billing_address),
            billing_street  = coalesce(EXCLUDED.billing_street, pp.billing_street),
            billing_number  = coalesce(EXCLUDED.billing_number, pp.billing_number),
            billing_floor   = coalesce(EXCLUDED.billing_floor, pp.billing_floor),
            billing_zip     = coalesce(EXCLUDED.billing_zip, pp.billing_zip),
            billing_city    = coalesce(EXCLUDED.billing_city, pp.billing_city),
            billing_country = coalesce(EXCLUDED.billing_country, pp.billing_country),
            updated_at      = now();

        SELECT jsonb_object_agg(k, 'null'::jsonb) INTO v_nulls FROM jsonb_object_keys(v_patch) AS k;
        NEW := jsonb_populate_record(NEW, v_nulls);
    END IF;

    -- Notas internas: só o admin as grava; para os outros ficam sempre a NULL.
    IF v_new ? 'admin_notes' AND jsonb_typeof(v_new -> 'admin_notes') <> 'null' THEN
        IF public.is_trusted_context() THEN
            INSERT INTO public.profile_admin_notes AS pn (id, admin_notes)
            VALUES (NEW.id, v_new ->> 'admin_notes')
            ON CONFLICT (id) DO UPDATE SET admin_notes = EXCLUDED.admin_notes, updated_at = now();
        END IF;
        NEW := jsonb_populate_record(NEW, '{"admin_notes": null}'::jsonb);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zz_move_profile_private ON public.profiles;
CREATE TRIGGER trg_zz_move_profile_private
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.move_profile_private_fields();

-- Migração dos dados existentes (só para colunas que existem nesta base de dados).
DO $$
DECLARE
    k TEXT;
    keys TEXT[] := ARRAY['nif','iban','fiscal_name','billing_address','billing_street',
                         'billing_number','billing_floor','billing_zip','billing_city','billing_country'];
BEGIN
    PERFORM set_config('cookr.trusted', '1', true);

    FOREACH k IN ARRAY keys LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = k) THEN
            EXECUTE format(
                'INSERT INTO public.profile_private (id, %1$I) SELECT id, %1$I::text FROM public.profiles WHERE %1$I IS NOT NULL '
                'ON CONFLICT (id) DO UPDATE SET %1$I = EXCLUDED.%1$I', k);
        END IF;
    END LOOP;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'admin_notes') THEN
        INSERT INTO public.profile_admin_notes (id, admin_notes)
        SELECT id, admin_notes FROM public.profiles WHERE admin_notes IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET admin_notes = EXCLUDED.admin_notes;
    END IF;

    FOREACH k IN ARRAY keys || ARRAY['admin_notes'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = k) THEN
            EXECUTE format('UPDATE public.profiles SET %1$I = NULL WHERE %1$I IS NOT NULL', k);
        END IF;
    END LOOP;

    PERFORM set_config('cookr.trusted', '', true);
END $$;

-- ------------------------------------------------------------------------------
-- 2. PIN do serviço
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_secrets (
    booking_id      UUID PRIMARY KEY,
    service_pin     TEXT,
    failed_attempts INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_secrets_select ON public.booking_secrets;
CREATE POLICY booking_secrets_select ON public.booking_secrets
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (SELECT 1 FROM public.bookings b
                   WHERE b.id = booking_secrets.booking_id AND b.client_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS booking_secrets_admin_all ON public.booking_secrets;
CREATE POLICY booking_secrets_admin_all ON public.booking_secrets
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.move_service_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.service_pin IS NOT NULL AND btrim(NEW.service_pin::text) <> '' THEN
        INSERT INTO public.booking_secrets AS bs (booking_id, service_pin)
        VALUES (NEW.id, btrim(NEW.service_pin::text))
        ON CONFLICT (booking_id) DO UPDATE
            SET service_pin = EXCLUDED.service_pin, failed_attempts = 0, updated_at = now();
    END IF;
    NEW.service_pin := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zz_move_service_pin ON public.bookings;
CREATE TRIGGER trg_zz_move_service_pin
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.move_service_pin();

CREATE OR REPLACE FUNCTION public.delete_booking_secret()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.booking_secrets WHERE booking_id = OLD.id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_booking_secret ON public.bookings;
CREATE TRIGGER trg_delete_booking_secret
AFTER DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.delete_booking_secret();

-- Migração dos PINs existentes.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'service_pin') THEN
        PERFORM set_config('cookr.trusted', '1', true);
        INSERT INTO public.booking_secrets (booking_id, service_pin)
        SELECT id, btrim(service_pin::text) FROM public.bookings
        WHERE service_pin IS NOT NULL AND btrim(service_pin::text) <> ''
        ON CONFLICT (booking_id) DO NOTHING;
        UPDATE public.bookings SET service_pin = NULL WHERE service_pin IS NOT NULL;
        PERFORM set_config('cookr.trusted', '', true);
    END IF;
END $$;

-- Guardas de reservas: só o cliente define o PIN; só o servidor conclui com PIN.
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

    IF auth.uid() IS DISTINCT FROM NEW.client_id THEN
        RAISE EXCEPTION 'Acesso negado: só o cliente pode criar a reserva.';
    END IF;

    NEW.status := 'pending';
    NEW.is_finalizing := FALSE;
    NEW.cancelled_at := NULL;
    NEW.cancelled_by := NULL;
    NEW.cancellation_reason := NULL;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_client BOOLEAN := (auth.uid() IS NOT NULL AND auth.uid() = OLD.client_id);
    v_is_cook   BOOLEAN := (auth.uid() IS NOT NULL AND auth.uid() = OLD.cook_id);
    v_old       JSONB := to_jsonb(OLD);
    v_new       JSONB := to_jsonb(NEW);
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    IF NEW.cook_id IS DISTINCT FROM OLD.cook_id OR NEW.client_id IS DISTINCT FROM OLD.client_id THEN
        RAISE EXCEPTION 'Acesso negado: não é possível alterar os participantes de uma reserva.';
    END IF;

    -- O PIN pertence ao cliente: o chef nunca o define.
    IF (v_new ->> 'service_pin') IS DISTINCT FROM (v_old ->> 'service_pin') AND NOT v_is_client THEN
        RAISE EXCEPTION 'Acesso negado: só o cliente define o PIN do serviço.';
    END IF;

    IF OLD.status <> 'pending' AND (
           (v_new ->> 'valor_total')  IS DISTINCT FROM (v_old ->> 'valor_total')
        OR (v_new ->> 'valortotal')   IS DISTINCT FROM (v_old ->> 'valortotal')
        OR (v_new ->> 'service_pin')  IS DISTINCT FROM (v_old ->> 'service_pin')
    ) THEN
        RAISE EXCEPTION 'Acesso negado: o valor e o PIN só podem ser alterados numa reserva pendente.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF OLD.status IN ('completed', 'cancelled', 'cancelled_partial_refund', 'rejected') THEN
            RAISE EXCEPTION 'Acesso negado: a reserva já está em estado final (%).', OLD.status;
        END IF;

        IF NEW.status = 'completed' THEN
            -- A conclusão com PIN passa por complete_booking_with_pin() (contexto de confiança).
            RAISE EXCEPTION 'Acesso negado: o serviço só é concluído com o PIN do cliente.';
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

CREATE OR REPLACE FUNCTION public.complete_booking_with_pin(p_booking_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cook   UUID;
    v_status TEXT;
    v_pin    TEXT;
    v_fails  INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: sessão necessária.';
    END IF;

    SELECT cook_id, status::text INTO v_cook, v_status
    FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

    IF NOT FOUND OR v_cook IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Acesso negado: só o chef desta reserva pode concluí-la.';
    END IF;

    IF v_status NOT IN ('accepted', 'in_progress') THEN
        RAISE EXCEPTION 'A reserva não está em curso.';
    END IF;

    SELECT service_pin, failed_attempts INTO v_pin, v_fails
    FROM public.booking_secrets WHERE booking_id = p_booking_id FOR UPDATE;

    IF NOT FOUND OR v_pin IS NULL OR v_fails >= 5 THEN
        RETURN FALSE;   -- sem PIN ou bloqueada: contactar o suporte/admin
    END IF;

    IF btrim(coalesce(p_pin, '')) <> btrim(v_pin) THEN
        UPDATE public.booking_secrets
           SET failed_attempts = failed_attempts + 1, updated_at = now()
         WHERE booking_id = p_booking_id;
        RETURN FALSE;
    END IF;

    PERFORM set_config('cookr.trusted', '1', true);
    UPDATE public.bookings SET status = 'completed', is_finalizing = FALSE WHERE id = p_booking_id;
    PERFORM set_config('cookr.trusted', '', true);

    UPDATE public.booking_secrets SET failed_attempts = 0, updated_at = now() WHERE booking_id = p_booking_id;
    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_booking_with_pin(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_booking_with_pin(UUID, TEXT) TO authenticated;
