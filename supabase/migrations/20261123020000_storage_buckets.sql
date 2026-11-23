-- ==============================================================================
-- COOKR — Storage para fotos (avatares e capas) em vez de base64 dentro das tabelas
-- Aplicar DEPOIS de 20261123010000_agenda_slots.sql. Idempotente.
--
-- Leitura pública dos ficheiros (por URL); escrita só na pasta do próprio utilizador
-- (<user_id>/ficheiro.jpg); limite de 2 MB (avatares) e 5 MB (capas), só imagens.
-- ==============================================================================
DO $$
BEGIN
    IF to_regclass('storage.buckets') IS NULL THEN
        RAISE NOTICE 'Schema storage não existe: criar os buckets avatars e covers no painel.';
        RETURN;
    END IF;

    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
        ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
        ('covers',  'covers',  TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
    ON CONFLICT (id) DO UPDATE
        SET public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;

    DROP POLICY IF EXISTS cookr_images_insert ON storage.objects;
    CREATE POLICY cookr_images_insert ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id IN ('avatars','covers')
                    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

    DROP POLICY IF EXISTS cookr_images_update ON storage.objects;
    CREATE POLICY cookr_images_update ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id IN ('avatars','covers')
               AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

    DROP POLICY IF EXISTS cookr_images_delete ON storage.objects;
    CREATE POLICY cookr_images_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id IN ('avatars','covers')
               AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage não configurado automaticamente (%). Crie os buckets avatars e covers (públicos) no painel.', SQLERRM;
END $$;
