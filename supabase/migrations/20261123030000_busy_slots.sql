-- ==============================================================================
-- COOKR — Horários ocupados de um chef (sem dados pessoais)
-- Aplicar DEPOIS de 20261123020000_storage_buckets.sql. Idempotente.
--
-- O cliente só consegue ler as suas próprias reservas (RLS), por isso não via que um
-- horário já estava ocupado por outra pessoa. Esta função devolve apenas data e hora
-- das reservas ativas de um chef, nada mais.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_chef_busy_slots(p_chef UUID)
RETURNS TABLE (data TEXT, hora TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT b.data::text, b.hora::text
    FROM public.bookings b
    WHERE b.cook_id = p_chef
      AND b.status::text IN ('pending', 'accepted', 'in_progress', 'reschedule_requested')
      AND b.data IS NOT NULL AND b.hora IS NOT NULL
      AND b.data::text >= to_char(current_date - 1, 'YYYY-MM-DD');
$$;

REVOKE EXECUTE ON FUNCTION public.get_chef_busy_slots(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_chef_busy_slots(UUID) TO authenticated;
