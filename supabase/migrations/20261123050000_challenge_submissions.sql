-- ==============================================================================
-- COOKR — Submissões dos Desafios Cookr (chefs). Idempotente.
-- Cada chef só vê/cria/edita as suas; o admin vê todas. O estado só o admin altera.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id  TEXT NOT NULL,
    chef_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chef_name     TEXT,
    chef_avatar   TEXT,
    dish_title    TEXT NOT NULL,
    description   TEXT,
    photo_url     TEXT,
    course_type   TEXT,
    prep_time     TEXT,
    allergens     JSONB NOT NULL DEFAULT '[]'::jsonb,
    pairing_notes TEXT,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    status        TEXT NOT NULL DEFAULT 'in_review',
    UNIQUE (challenge_id, chef_id)
);
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_select ON public.challenge_submissions;
CREATE POLICY cs_select ON public.challenge_submissions FOR SELECT TO authenticated
    USING (chef_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS cs_insert ON public.challenge_submissions;
CREATE POLICY cs_insert ON public.challenge_submissions FOR INSERT TO authenticated
    WITH CHECK (chef_id = auth.uid() AND status = 'in_review');

DROP POLICY IF EXISTS cs_update ON public.challenge_submissions;
CREATE POLICY cs_update ON public.challenge_submissions FOR UPDATE TO authenticated
    USING (chef_id = auth.uid() OR public.is_admin())
    WITH CHECK ((chef_id = auth.uid() AND status = 'in_review') OR public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.challenge_submissions TO authenticated;
