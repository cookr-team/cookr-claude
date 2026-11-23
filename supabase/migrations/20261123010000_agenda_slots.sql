-- ==============================================================================
-- COOKR — Agenda: horários ocupados/libertados no servidor + sem dupla reserva
-- Aplicar DEPOIS de 20261123000000_private_data.sql.
--
-- Antes, o CLIENTE tentava marcar o horário do chef como ocupado (chefs.disponibilidade),
-- mas o RLS recusava (a linha é do chef) e a app ignorava o erro: o horário ficava livre
-- e era possível reservar a mesma hora duas vezes. Agora é feito por trigger.
-- ==============================================================================

-- 1. Um chef não pode ter duas reservas ativas na mesma data e hora.
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_active_slot
        ON public.bookings (cook_id, data, hora)
        WHERE status IN ('pending', 'accepted', 'in_progress', 'reschedule_requested')
          AND hora IS NOT NULL AND data IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Índice uq_bookings_active_slot não criado (há reservas ativas duplicadas?): %', SQLERRM;
END $$;

-- 2. Ocupar o horário ao criar a reserva; libertá-lo se for cancelada/recusada/expirada.
CREATE OR REPLACE FUNCTION public.sync_chef_slot_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_active  CONSTANT TEXT[] := ARRAY['pending','accepted','in_progress','reschedule_requested'];
    v_dispo   JSONB;
    v_slots   JSONB;
    v_date    TEXT;
    v_time    TEXT;
    v_prev    TEXT;
BEGIN
    IF NEW.cook_id IS NULL OR NEW.data IS NULL OR NEW.hora IS NULL THEN
        RETURN NEW;
    END IF;
    v_date := NEW.data::text;
    v_time := NEW.hora::text;
    IF v_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RETURN NEW;
    END IF;

    SELECT coalesce(disponibilidade::jsonb, '{}'::jsonb) INTO v_dispo
    FROM public.chefs WHERE profile_id = NEW.cook_id;
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    v_slots := coalesce(v_dispo -> v_date, '[]'::jsonb);

    IF NEW.status::text = ANY (v_active)
       AND (TG_OP = 'INSERT' OR OLD.status::text <> ALL (v_active)
            OR OLD.data IS DISTINCT FROM NEW.data OR OLD.hora IS DISTINCT FROM NEW.hora) THEN
        -- ocupar: remove a hora da lista de horários livres
        SELECT coalesce(jsonb_agg(e), '[]'::jsonb) INTO v_slots
        FROM jsonb_array_elements(v_slots) AS e WHERE e #>> '{}' <> v_time;
    ELSIF TG_OP = 'UPDATE' AND NEW.status::text <> ALL (v_active) AND OLD.status::text = ANY (v_active) THEN
        -- libertar: volta a pôr a hora (ordenada, sem duplicados) se a data ainda não passou
        IF v_date::date >= current_date THEN
            SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) INTO v_slots
            FROM (SELECT DISTINCT x AS t FROM (
                    SELECT e #>> '{}' AS x FROM jsonb_array_elements(v_slots) AS e
                    UNION SELECT v_time) AS u) AS d;
        ELSE
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    v_prev := coalesce(current_setting('cookr.trusted', true), '');
    PERFORM set_config('cookr.trusted', '1', true);
    UPDATE public.chefs
       SET disponibilidade = jsonb_set(v_dispo, ARRAY[v_date], v_slots, true)
     WHERE profile_id = NEW.cook_id;
    PERFORM set_config('cookr.trusted', v_prev, true);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chef_slot ON public.bookings;
CREATE TRIGGER trg_sync_chef_slot
AFTER INSERT OR UPDATE OF status, data, hora ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_chef_slot_from_booking();
