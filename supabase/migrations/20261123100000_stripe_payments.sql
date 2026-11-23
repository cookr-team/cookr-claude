-- ==============================================================================
-- COOKR — Pagamentos Stripe (estado dos pagamentos e contas Connect dos chefs)
-- Aplicar DEPOIS de 20261123090000_booking_sanity.sql. Idempotente.
--
-- As duas tabelas só são ESCRITAS pelo servidor (service role). Os utilizadores
-- apenas leem o que lhes diz respeito.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.booking_payments (
    booking_id              UUID PRIMARY KEY,
    client_id               UUID,
    cook_id                 UUID,
    amount_cents            INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents      INTEGER NOT NULL DEFAULT 0,
    chef_payout_cents       INTEGER NOT NULL DEFAULT 0,
    currency                TEXT NOT NULL DEFAULT 'eur',
    status                  TEXT NOT NULL DEFAULT 'checkout_created',
    -- checkout_created | authorized | captured | paid_out | released | refunded | partially_refunded | expired | failed
    checkout_session_id     TEXT,
    payment_intent_id       TEXT,
    transfer_id             TEXT,
    refunded_cents          INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_accounts (
    user_id             UUID PRIMARY KEY,
    account_id          TEXT NOT NULL UNIQUE,
    details_submitted   BOOLEAN NOT NULL DEFAULT FALSE,
    charges_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_payments_select ON public.booking_payments;
CREATE POLICY booking_payments_select ON public.booking_payments
    FOR SELECT TO authenticated
    USING (client_id = (SELECT auth.uid()) OR cook_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS stripe_accounts_select ON public.stripe_accounts;
CREATE POLICY stripe_accounts_select ON public.stripe_accounts
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE ALL ON public.booking_payments, public.stripe_accounts FROM anon, authenticated;
GRANT SELECT ON public.booking_payments, public.stripe_accounts TO authenticated;

CREATE INDEX IF NOT EXISTS idx_booking_payments_pi ON public.booking_payments (payment_intent_id);
