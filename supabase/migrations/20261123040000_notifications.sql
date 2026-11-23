-- ==============================================================================
-- COOKR — Notificações que respeitam as preferências + mensagens + lembretes
-- Aplicar DEPOIS de 20261123030000_busy_slots.sql. Idempotente.
--
-- 1. notifications.category: 'booking_updates' | 'booking_reminders' | 'chef_messages'.
--    Se o destinatário desligou essa categoria nas Definições, a notificação não é criada.
--    Sem categoria = comunicação essencial (cancelamentos, segurança...): chega sempre.
-- 2. Nova mensagem de chat -> notificação ao destinatário (categoria chef_messages).
-- 3. Lembretes 24h e 2h antes do serviço (categoria booking_reminders), a cada 15 min
--    com pg_cron (se a extensão não estiver ativa, ver aviso no fim).
-- ==============================================================================
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category   TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_user_cat
    ON public.notifications (user_id, category, is_read, created_at DESC);

-- 1. Respeitar preferências
CREATE OR REPLACE FUNCTION public.respect_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_settings JSONB;
BEGIN
    IF NEW.category IS NULL OR NEW.category NOT IN ('booking_updates', 'booking_reminders', 'chef_messages') THEN
        RETURN NEW;
    END IF;

    SELECT to_jsonb(p) -> 'notification_settings' INTO v_settings
    FROM public.profiles p WHERE p.id = NEW.user_id;

    IF v_settings IS NOT NULL AND jsonb_typeof(v_settings) = 'object'
       AND (v_settings -> NEW.category) = 'false'::jsonb THEN
        RETURN NULL;   -- o utilizador desligou esta categoria
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_respect_notification_settings ON public.notifications;
CREATE TRIGGER trg_respect_notification_settings
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.respect_notification_settings();

-- 2. Mensagens de chat -> notificação (no máximo uma por conversa a cada 10 minutos sem ler)
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_name TEXT;
BEGIN
    IF NEW.receiver_id IS NULL OR NEW.sender_id IS NULL OR NEW.receiver_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = NEW.receiver_id
          AND n.category = 'chef_messages'
          AND n.related_id = NEW.sender_id
          AND n.is_read = FALSE
          AND n.created_at > now() - interval '10 minutes'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT nome INTO v_name FROM public.profiles WHERE id = NEW.sender_id;

    INSERT INTO public.notifications (user_id, message, type, category, related_id, is_read)
    VALUES (NEW.receiver_id, 'Nova mensagem de ' || coalesce(v_name, 'um utilizador') || '.',
            'info', 'chef_messages', NEW.sender_id, FALSE);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 3. Lembretes de reservas aceites
CREATE TABLE IF NOT EXISTS public.booking_reminders_sent (
    booking_id UUID NOT NULL,
    kind       TEXT NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (booking_id, kind)
);
ALTER TABLE public.booking_reminders_sent ENABLE ROW LEVEL SECURITY;   -- sem políticas: só o servidor

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    r       RECORD;
    v_count INTEGER := 0;
    v_label TEXT;
BEGIN
    FOR r IN
        SELECT b.id, b.client_id, b.cook_id, b.cook_name, b.client_name, b.data, b.hora, k.kind
        FROM public.bookings b
        CROSS JOIN (VALUES ('24h'), ('2h')) AS k(kind)
        WHERE b.status::text IN ('accepted', 'in_progress')
          AND b.data ~ '^\d{4}-\d{2}-\d{2}$' AND b.hora ~ '^\d{1,2}:\d{2}$'
          AND (
                (k.kind = '24h' AND ((b.data || ' ' || b.hora)::timestamp AT TIME ZONE 'Europe/Lisbon')
                        BETWEEN now() + interval '23 hours' AND now() + interval '24 hours')
             OR (k.kind = '2h'  AND ((b.data || ' ' || b.hora)::timestamp AT TIME ZONE 'Europe/Lisbon')
                        BETWEEN now() + interval '1 hour' AND now() + interval '2 hours')
          )
          AND NOT EXISTS (SELECT 1 FROM public.booking_reminders_sent s WHERE s.booking_id = b.id AND s.kind = k.kind)
    LOOP
        v_label := CASE r.kind WHEN '24h' THEN 'amanhã' ELSE 'daqui a cerca de 2 horas' END;

        IF r.client_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, message, type, category, related_id, is_read)
            VALUES (r.client_id, 'Lembrete: o seu serviço com o Chef ' || coalesce(r.cook_name, '') ||
                    ' é ' || v_label || ' (' || r.data || ' às ' || r.hora || ').',
                    'info', 'booking_reminders', r.id, FALSE);
        END IF;
        IF r.cook_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, message, type, category, related_id, is_read)
            VALUES (r.cook_id, 'Lembrete: serviço para ' || coalesce(r.client_name, 'o cliente') ||
                    ' ' || v_label || ' (' || r.data || ' às ' || r.hora || ').',
                    'info', 'booking_reminders', r.id, FALSE);
        END IF;

        INSERT INTO public.booking_reminders_sent (booking_id, kind) VALUES (r.id, r.kind)
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_booking_reminders() FROM PUBLIC, anon, authenticated;

-- Agendar de 15 em 15 minutos (pg_cron). Se não for possível, ativar em Database > Extensions > pg_cron.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cookr-booking-reminders';
    PERFORM cron.schedule('cookr-booking-reminders', '*/15 * * * *', 'SELECT public.send_booking_reminders();');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron não ficou ativo (%). Ative a extensão pg_cron em Database > Extensions e volte a correr este ficheiro.', SQLERRM;
END $$;
