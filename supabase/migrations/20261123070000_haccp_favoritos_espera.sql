-- ==============================================================================
-- COOKR — HACCP, favoritos e lista de espera (tabelas + permissões). Idempotente.
-- Aplicar DEPOIS de 20261123060000_chef_live_agenda.sql.
--
-- A app grava aqui os registos HACCP do chef, os favoritos do cliente e a lista de espera.
-- Se as tabelas não existirem, ou o RLS recusar a gravação, a app agora mostra o erro
-- (antes dizia "guardado" sem guardar).
-- ==============================================================================

-- 1. HACCP: checklist de serviço
CREATE TABLE IF NOT EXISTS public.haccp_checklists (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id               UUID,
    cook_name             TEXT,
    booking_id            UUID,
    client_name           TEXT,
    date                  TEXT,
    transport_temp        NUMERIC,
    transport_isothermal  BOOLEAN,
    hygiene_hands         BOOLEAN,
    hygiene_hair          BOOLEAN,
    hygiene_uniform       BOOLEAN,
    sanitized_utensils    BOOLEAN,
    sanitized_surfaces    BOOLEAN,
    separation_raw_cooked BOOLEAN,
    washed_ingredients    BOOLEAN,
    observations          TEXT,
    signature_checked     BOOLEAN,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. HACCP: registo geral da cozinha
CREATE TABLE IF NOT EXISTS public.haccp_logs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id               UUID,
    cook_name             TEXT,
    booking_id            UUID,
    client_name           TEXT,
    log_type              TEXT,
    date                  TEXT,
    temperatures_ok       BOOLEAN,
    surfaces_sanitized    BOOLEAN,
    personal_hygiene_ok   BOOLEAN,
    waste_disposed        BOOLEAN,
    pest_control_ok       BOOLEAN,
    raw_ready_separation  BOOLEAN,
    observations          TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Favoritos e lista de espera (já podem existir; garante as colunas usadas pela app)
CREATE TABLE IF NOT EXISTS public.favorites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID NOT NULL,
    cook_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.waitlist (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id        UUID NOT NULL,
    client_id      UUID,
    preferred_date TEXT,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_client_cook ON public.favorites (client_id, cook_id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Índice uq_favorites_client_cook não criado (há favoritos duplicados?): %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_haccp_checklists_cook ON public.haccp_checklists (cook_id);
CREATE INDEX IF NOT EXISTS idx_haccp_logs_cook       ON public.haccp_logs (cook_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_cook         ON public.waitlist (cook_id);

ALTER TABLE public.haccp_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haccp_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist         ENABLE ROW LEVEL SECURITY;

-- 4. Permissões
-- HACCP: o chef vê e cria os seus; o admin vê tudo.
DROP POLICY IF EXISTS cookr_haccp_checklists_select ON public.haccp_checklists;
CREATE POLICY cookr_haccp_checklists_select ON public.haccp_checklists
    FOR SELECT TO authenticated USING (cook_id = (SELECT auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS cookr_haccp_checklists_insert ON public.haccp_checklists;
CREATE POLICY cookr_haccp_checklists_insert ON public.haccp_checklists
    FOR INSERT TO authenticated WITH CHECK (cook_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS cookr_haccp_logs_select ON public.haccp_logs;
CREATE POLICY cookr_haccp_logs_select ON public.haccp_logs
    FOR SELECT TO authenticated USING (cook_id = (SELECT auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS cookr_haccp_logs_insert ON public.haccp_logs;
CREATE POLICY cookr_haccp_logs_insert ON public.haccp_logs
    FOR INSERT TO authenticated WITH CHECK (cook_id = (SELECT auth.uid()) OR public.is_admin());

-- Favoritos: cada cliente gere os seus.
DROP POLICY IF EXISTS cookr_favorites_select ON public.favorites;
CREATE POLICY cookr_favorites_select ON public.favorites
    FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS cookr_favorites_insert ON public.favorites;
CREATE POLICY cookr_favorites_insert ON public.favorites
    FOR INSERT TO authenticated WITH CHECK (client_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS cookr_favorites_delete ON public.favorites;
CREATE POLICY cookr_favorites_delete ON public.favorites
    FOR DELETE TO authenticated USING (client_id = (SELECT auth.uid()));

-- Lista de espera: o cliente entra e vê as suas; o chef vê quem espera por ele.
DROP POLICY IF EXISTS cookr_waitlist_select ON public.waitlist;
CREATE POLICY cookr_waitlist_select ON public.waitlist
    FOR SELECT TO authenticated
    USING (client_id = (SELECT auth.uid()) OR cook_id = (SELECT auth.uid()) OR public.is_admin());
DROP POLICY IF EXISTS cookr_waitlist_insert ON public.waitlist;
CREATE POLICY cookr_waitlist_insert ON public.waitlist
    FOR INSERT TO authenticated WITH CHECK (client_id = (SELECT auth.uid()));
