-- ==============================================================================
-- COOKR — Guardar dados privados (NIF, IBAN, faturação) do próprio utilizador
-- Aplicar DEPOIS de 20261123000000_private_data.sql.
--
-- A app passa a gravar diretamente em profile_private através desta função,
-- sem depender de colunas antigas em profiles. Só grava na linha de auth.uid().
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.save_my_private(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    INSERT INTO public.profile_private AS pp
        (id, nif, iban, fiscal_name, billing_address, billing_street, billing_number,
         billing_floor, billing_zip, billing_city, billing_country)
    VALUES (v_uid, p->>'nif', p->>'iban', p->>'fiscal_name', p->>'billing_address',
            p->>'billing_street', p->>'billing_number', p->>'billing_floor',
            p->>'billing_zip', p->>'billing_city', p->>'billing_country')
    ON CONFLICT (id) DO UPDATE SET
        nif             = CASE WHEN p ? 'nif'             THEN p->>'nif'             ELSE pp.nif END,
        iban            = CASE WHEN p ? 'iban'            THEN p->>'iban'            ELSE pp.iban END,
        fiscal_name     = CASE WHEN p ? 'fiscal_name'     THEN p->>'fiscal_name'     ELSE pp.fiscal_name END,
        billing_address = CASE WHEN p ? 'billing_address' THEN p->>'billing_address' ELSE pp.billing_address END,
        billing_street  = CASE WHEN p ? 'billing_street'  THEN p->>'billing_street'  ELSE pp.billing_street END,
        billing_number  = CASE WHEN p ? 'billing_number'  THEN p->>'billing_number'  ELSE pp.billing_number END,
        billing_floor   = CASE WHEN p ? 'billing_floor'   THEN p->>'billing_floor'   ELSE pp.billing_floor END,
        billing_zip     = CASE WHEN p ? 'billing_zip'     THEN p->>'billing_zip'     ELSE pp.billing_zip END,
        billing_city    = CASE WHEN p ? 'billing_city'    THEN p->>'billing_city'    ELSE pp.billing_city END,
        billing_country = CASE WHEN p ? 'billing_country' THEN p->>'billing_country' ELSE pp.billing_country END,
        updated_at      = now();
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_private(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_private(JSONB) TO authenticated;
