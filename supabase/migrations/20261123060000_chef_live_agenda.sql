-- ==============================================================================
-- COOKR — Online/offline do chef em tempo real + agenda sem sobreposições
-- Aplicar DEPOIS de 20261123050000_challenge_submissions.sql. Idempotente.
--
-- 1. A tabela chefs entra no Realtime: quando o chef fica online/offline ou a agenda
--    muda (inclui horários ocupados por reservas), todos os clientes veem na hora.
-- 2. Uma reserva ativa não pode começar a menos de 3 horas de outra reserva ativa do
--    mesmo chef no mesmo dia (antes só bloqueava exatamente a mesma hora).
-- ==============================================================================

-- 1. Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    IF to_regclass('public.chefs') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chefs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chefs;
    END IF;
END $$;

-- 2. Sem sobreposição de reservas do mesmo chef
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

-- 3. Gravar a agenda de UM dia de forma atómica (evita que um ecrã desatualizado do chef
--    volte a oferecer horas que entretanto foram reservadas). Devolve os horários guardados.
CREATE OR REPLACE FUNCTION public.set_chef_day_slots(p_date TEXT, p_slots JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_dispo  JSONB;
    v_clean  JSONB;
    v_prev   TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
    END IF;
    IF p_date IS NULL OR p_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'data inválida' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(coalesce(p_slots, '[]'::jsonb)) <> 'array' THEN
        RAISE EXCEPTION 'horários inválidos' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(disponibilidade, '{}'::jsonb) INTO v_dispo
      FROM public.chefs WHERE profile_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'só chefs têm agenda' USING ERRCODE = '42501';
    END IF;

    -- horários válidos (HH:MM), sem duplicados, e a 3h ou mais de qualquer reserva ativa desse dia
    SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) INTO v_clean
    FROM (
        SELECT DISTINCT e #>> '{}' AS t
          FROM jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) AS e
         WHERE (e #>> '{}') ~ '^([01]\d|2[0-3]):[0-5]\d$'
           AND NOT EXISTS (
                SELECT 1 FROM public.bookings b
                 WHERE b.cook_id = v_uid
                   AND b.data::text = p_date
                   AND b.status::text IN ('pending','accepted','in_progress','reschedule_requested')
                   AND b.hora IS NOT NULL AND b.hora::text ~ '^\d{1,2}:\d{2}'
                   AND abs((split_part(b.hora::text, ':', 1)::int * 60 + split_part(b.hora::text, ':', 2)::int)
                         - (split_part(e #>> '{}', ':', 1)::int * 60 + split_part(e #>> '{}', ':', 2)::int)) < 180
           )
    ) AS s;

    v_prev := coalesce(current_setting('cookr.trusted', true), '');
    PERFORM set_config('cookr.trusted', '1', true);
    UPDATE public.chefs
       SET disponibilidade = jsonb_set(v_dispo, ARRAY[p_date], v_clean, true)
     WHERE profile_id = v_uid;
    PERFORM set_config('cookr.trusted', v_prev, true);

    RETURN v_clean;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chef_day_slots(TEXT, JSONB) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_chef_day_slots(TEXT, JSONB) TO authenticated;
