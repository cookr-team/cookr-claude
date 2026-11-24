-- ==============================================================================
-- COOKR — Segurança das contas de chef + agenda sem sobreposições (à prova de corridas)
-- Aplicar DEPOIS de 20261123100000_stripe_payments.sql. Idempotente.
--
-- 1. Duas pessoas a reservar o mesmo chef ao mesmo tempo: o gatilho de sobreposição
--    passa a bloquear (por chef e por dia) antes de verificar, por isso a segunda
--    reserva espera pela primeira e é recusada. Antes, duas reservas simultâneas a
--    horas diferentes mas a menos de 3 h uma da outra podiam passar as duas.
-- 2. Só se pode reservar um chef ativo/aprovado e numa data válida (nem passada nem a
--    mais de 1 ano), com hora no formato HH:MM.
-- 3. Chefs por aprovar e os seus menus deixam de ser públicos: só o próprio chef, os
--    admins e clientes com reserva nesse chef os veem. O catálogo mostra só aprovados/ativos.
-- 4. Garante o índice único do horário (uma reserva ativa por chef, data e hora).
-- ==============================================================================

-- 1. Sobreposição com bloqueio por chef+dia ------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_active CONSTANT TEXT[] := ARRAY['pending','accepted','in_progress','reschedule_requested'];
    v_min    INT;
BEGIN
    IF NEW.cook_id IS NULL OR NEW.data IS NULL OR NEW.hora IS NULL THEN
        RETURN NEW;
    END IF;
    IF NOT (NEW.status::text = ANY (v_active)) THEN
        RETURN NEW;
    END IF;
    IF NEW.hora::text !~ '^\d{1,2}:\d{2}' THEN
        RETURN NEW;
    END IF;

    -- Serializa as reservas do mesmo chef no mesmo dia (liberta no fim da transação).
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.cook_id::text || ':' || NEW.data::text, 0));

    v_min := split_part(NEW.hora::text, ':', 1)::int * 60 + split_part(NEW.hora::text, ':', 2)::int;

    IF EXISTS (
        SELECT 1 FROM public.bookings b
         WHERE b.cook_id = NEW.cook_id
           AND b.data::text = NEW.data::text
           AND b.id <> NEW.id
           AND b.status::text = ANY (v_active)
           AND b.hora IS NOT NULL
           AND b.hora::text ~ '^\d{1,2}:\d{2}'
           AND abs((split_part(b.hora::text, ':', 1)::int * 60 + split_part(b.hora::text, ':', 2)::int) - v_min) < 180
    ) THEN
        RAISE EXCEPTION 'slot_conflict: o chef já tem uma reserva perto desta hora'
            USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_overlap ON public.bookings;
CREATE TRIGGER trg_prevent_booking_overlap
BEFORE INSERT OR UPDATE OF data, hora, status, cook_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();

-- 4. Índice único do horário (rede de segurança extra) ---------------------------
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
        ON public.bookings (cook_id, data, hora)
        WHERE status IN ('pending', 'accepted', 'in_progress', 'reschedule_requested')
          AND hora IS NOT NULL AND data IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Índice uq_bookings_active_slot não criado (há reservas ativas duplicadas?): %', SQLERRM;
END $$;

-- 2. Reservar só chefs ativos e datas válidas ---------------------------------
CREATE OR REPLACE FUNCTION public.validate_booking_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_ok    BOOLEAN;
    v_date  DATE;
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;

    IF NEW.cook_id IS NOT NULL THEN
        SELECT (coalesce(c.approved_by_admin, FALSE)
                OR coalesce(c.bypass_haccp_restrictions, FALSE)
                OR p.status = 'active')
          INTO v_ok
          FROM public.chefs c
          JOIN public.profiles p ON p.id = c.profile_id
         WHERE c.profile_id = NEW.cook_id;
        IF v_ok IS NOT TRUE THEN
            RAISE EXCEPTION 'Reserva inválida: este chef não está disponível para reservas.';
        END IF;
    END IF;

    IF NEW.data IS NOT NULL THEN
        IF NEW.data::text !~ '^\d{4}-\d{2}-\d{2}$' THEN
            RAISE EXCEPTION 'Reserva inválida: data em formato incorreto.';
        END IF;
        BEGIN
            v_date := NEW.data::text::date;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Reserva inválida: data inexistente.';
        END;
        IF v_date < (now() AT TIME ZONE 'Europe/Lisbon')::date
           OR v_date > (now() AT TIME ZONE 'Europe/Lisbon')::date + 366 THEN
            RAISE EXCEPTION 'Reserva inválida: escolha uma data entre hoje e daqui a 1 ano.';
        END IF;
    END IF;

    IF NEW.hora IS NOT NULL AND NEW.hora::text !~ '^([01]?\d|2[0-3]):[0-5]\d' THEN
        RAISE EXCEPTION 'Reserva inválida: hora em formato incorreto.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_target ON public.bookings;
CREATE TRIGGER trg_validate_booking_target
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_target();

-- 3. Chefs por aprovar deixam de ser públicos -----------------------------------
DROP POLICY IF EXISTS "chefs_select_policy" ON public.chefs;
CREATE POLICY "chefs_select_policy" ON public.chefs
FOR SELECT TO authenticated, anon
USING (
    approved_by_admin = TRUE
    OR bypass_haccp_restrictions = TRUE
    OR profile_id = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = chefs.profile_id AND p.status = 'active')
    OR EXISTS (SELECT 1 FROM public.bookings b
                WHERE b.cook_id = chefs.profile_id AND b.client_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "menus_select_policy" ON public.menus;
CREATE POLICY "menus_select_policy" ON public.menus
FOR SELECT TO authenticated, anon
USING (
    cook_id = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.chefs c WHERE c.profile_id = menus.cook_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_cook_client ON public.bookings (cook_id, client_id);
