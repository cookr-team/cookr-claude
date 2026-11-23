-- ==============================================================================
-- COOKR — Validações de sanidade em reservas (defesa em profundidade)
-- Aplicar DEPOIS de 20261122000000_security_hardening.sql. Idempotente.
--
-- Rejeita valores absurdos enviados por um cliente adulterado (preço negativo ou
-- gigante, nº de pessoas fora do intervalo, gorjeta negativa). O preço final deve
-- ser sempre recalculado no servidor quando existirem pagamentos reais (Stripe).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_booking_sanity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v JSONB := to_jsonb(NEW);
    v_total NUMERIC := coalesce((v ->> 'valor_total')::numeric, (v ->> 'valortotal')::numeric);
    v_guests NUMERIC := (v ->> 'num_pessoas')::numeric;
    v_tip NUMERIC := (v ->> 'gorjeta')::numeric;
BEGIN
    IF public.is_trusted_context() THEN
        RETURN NEW;
    END IF;
    IF v_total IS NOT NULL AND (v_total < 0 OR v_total > 100000) THEN
        RAISE EXCEPTION 'Reserva inválida: valor total fora do intervalo permitido.';
    END IF;
    IF v_guests IS NOT NULL AND (v_guests < 1 OR v_guests > 200) THEN
        RAISE EXCEPTION 'Reserva inválida: número de pessoas fora do intervalo permitido.';
    END IF;
    IF v_tip IS NOT NULL AND (v_tip < 0 OR v_tip > 10000) THEN
        RAISE EXCEPTION 'Reserva inválida: gorjeta fora do intervalo permitido.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_sanity ON public.bookings;
CREATE TRIGGER trg_validate_booking_sanity
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_sanity();
