-- ==============================================================================
-- COOKR - SCRIPT SQL DE SEGURANÇA E POLÍTICAS RLS (SUPABASE)
-- ==============================================================================
-- Este script aplica todas as correções críticas de segurança solicitadas:
-- 1. Remoção definitiva de armazenamento de passwords em texto limpo.
-- 2. Função de validação de administrador 'is_admin()' à prova de recursão.
-- 3. Triggers no motor PostgreSQL que impedem a alteração de 'role' ou 'status'
--    por utilizadores normais (apenas administradores podem alterar).
-- 4. Políticas de Row Level Security (RLS) estritas e granulares para todas as tabelas.
-- 5. Isolamento total de clientes, chefs, mensagens e registos de auditoria.
--
-- ORDEM DE EXECUÇÃO RECOMENDADA NO SUPABASE SQL EDITOR:
--   - Pode executar todo este script em bloco único ("Run"), ou bloco a bloco
--     pela ordem sequencial numerada abaixo (Blocos 1 a 8).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BLOCO 1: REMOÇÃO DE PASSWORDS EM TEXTO SIMPLES NAS TABELAS
-- A autenticação depende exclusivamente do Supabase Auth (auth.users / supabase.auth).
-- Nenhuma tabela pública deve armazenar passwords em texto limpo.
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS password;
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS password;

-- ------------------------------------------------------------------------------
-- BLOCO 2: CRIAÇÃO/GARANTIA DAS TABELAS BASE DO ECOSSISTEMA COOKR
-- Garante que todas as tabelas existem sem apagar dados já presentes.
-- ------------------------------------------------------------------------------

-- 2.1 Tabela de Perfis de Utilizadores
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'cook', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'under_review', 'active', 'suspended')),
    avatar_url TEXT,
    cover_url TEXT,
    morada TEXT,
    cidade TEXT,
    localizacao TEXT,
    zip_code TEXT,
    nif TEXT,
    iban TEXT,
    fiscal_name TEXT,
    billing_address TEXT,
    billing_street TEXT,
    billing_number TEXT,
    billing_floor TEXT,
    billing_zip TEXT,
    billing_city TEXT,
    billing_country TEXT,
    addresses JSONB DEFAULT '[]'::jsonb,
    dietary_restrictions TEXT[] DEFAULT '{}'::text[],
    cuisine_preferences TEXT[] DEFAULT '{}'::text[],
    favorite_chef_ids UUID[] DEFAULT '{}'::uuid[],
    loyalty_points INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}'::text[],
    language TEXT DEFAULT 'pt',
    notification_settings JSONB DEFAULT '{"email":true,"sms":false,"push":true}'::jsonb,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Tabela de Detalhes dos Chefs
CREATE TABLE IF NOT EXISTS public.chefs (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    biografia TEXT DEFAULT '',
    especialidades TEXT[] DEFAULT '{}'::text[],
    experiencia_anos INTEGER DEFAULT 0,
    preco_medio FLOAT DEFAULT 0,
    distrito TEXT DEFAULT '',
    concelho TEXT DEFAULT '',
    localizacao TEXT DEFAULT '',
    idiomas TEXT[] DEFAULT '{"Português"}'::text[],
    equipamento TEXT[] DEFAULT '{}'::text[],
    diferenciais TEXT[] DEFAULT '{}'::text[],
    certifications_and_awards TEXT[] DEFAULT '{}'::text[],
    faqs JSONB DEFAULT '[]'::jsonb,
    sustainability_badges TEXT[] DEFAULT '{}'::text[],
    sustainability_notes TEXT DEFAULT '',
    allergen_certifications TEXT[] DEFAULT '{}'::text[],
    allergen_notes TEXT DEFAULT '',
    portfolio_images TEXT[] DEFAULT '{}'::text[],
    disponibilidade JSONB DEFAULT '{}'::jsonb,
    is_available BOOLEAN DEFAULT TRUE,
    offers_wine_pairing BOOLEAN DEFAULT FALSE,
    approved_by_admin BOOLEAN DEFAULT FALSE,
    bypass_haccp_restrictions BOOLEAN DEFAULT FALSE,
    kitchen_notes TEXT DEFAULT '',
    rating FLOAT DEFAULT 5.0,
    total_avaliacoes INTEGER DEFAULT 0,
    total_reservas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Tabela Legada de Utilizadores (Users) mantida por retrocompatibilidade
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'cook', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'under_review', 'active', 'suspended')),
    avatar_url TEXT,
    cover_url TEXT,
    especialidades TEXT[],
    localizacao TEXT,
    cidade TEXT,
    morada TEXT,
    experiencia INTEGER,
    approved_by_admin BOOLEAN DEFAULT FALSE,
    disponibilidade JSONB DEFAULT '{}'::jsonb,
    addresses JSONB DEFAULT '[]'::jsonb,
    admin_notes TEXT,
    rating FLOAT DEFAULT 0,
    total_reservas INTEGER DEFAULT 0,
    biografia TEXT,
    idiomas TEXT[],
    equipamento TEXT[],
    diferenciais TEXT[],
    nif TEXT,
    fiscal_name TEXT,
    billing_address TEXT,
    billing_street TEXT,
    billing_number TEXT,
    billing_floor TEXT,
    billing_zip TEXT,
    billing_city TEXT,
    billing_country TEXT,
    zip_code TEXT,
    dietary_restrictions TEXT[],
    cuisine_preferences TEXT[],
    preco_medio FLOAT,
    is_available BOOLEAN DEFAULT TRUE,
    is_chef BOOLEAN DEFAULT FALSE,
    kitchen_notes TEXT,
    favorite_chef_ids UUID[] DEFAULT '{}'::uuid[],
    loyalty_points INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Menus
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco FLOAT NOT NULL,
    image_url TEXT,
    gallery_urls TEXT[],
    tags TEXT[],
    is_meal_prep BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    type TEXT DEFAULT 'experience',
    cuisine_type TEXT,
    calories INTEGER,
    courses JSONB DEFAULT '[]'::jsonb,
    pack_size INTEGER DEFAULT 1,
    delivery_type TEXT DEFAULT 'delivery',
    dietary_tags TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 Receitas dos Chefs (chef_recipes)
CREATE TABLE IF NOT EXISTS public.chef_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    image_url TEXT,
    descricao TEXT,
    is_popular BOOLEAN DEFAULT FALSE,
    preco FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.6 Reservas (bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_name TEXT,
    cook_name TEXT,
    data TEXT,
    hora TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'cancelled_partial_refund', 'reschedule_requested')),
    menu_selected TEXT,
    morada TEXT,
    valortotal FLOAT,
    is_meal_prep BOOLEAN DEFAULT FALSE,
    menu_type TEXT,
    num_pessoas INTEGER,
    kitchen_notes TEXT,
    service_pin TEXT,
    is_finalizing BOOLEAN DEFAULT FALSE,
    proposed_date TEXT,
    proposed_time TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.7 Avaliações (reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    client_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.8 Mensagens de Chat (messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.9 Notificações (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.10 Logs Administrativos (admin_logs)
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.11 Configurações da Plataforma (platform_settings)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.12 Favoritos (favorites)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, cook_id)
);

-- 2.13 Lista de Espera (waitlist)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cook_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferred_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.14 Histórico de Pontos de Fidelidade (loyalty_history)
CREATE TABLE IF NOT EXISTS public.loyalty_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- BLOCO 3: FUNÇÃO DE VERIFICAÇÃO DE ADMINISTRADOR (is_admin)
-- Executa com SECURITY DEFINER para ler os metadados sem acionar recursão no RLS.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Verificação rápida em Claims do JWT (sem consulta de I/O)
    IF (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin') OR
       (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin') THEN
        RETURN TRUE;
    END IF;

    -- 2. Verificação na tabela profiles (SECURITY DEFINER evita loop infinito de RLS)
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Verificação na tabela users (compatibilidade legada)
    IF EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- BLOCO 4: PROTEÇÃO CONTRA ESCALADA DE PRIVILÉGIOS (role e status)
-- Impede que utilizadores alterem o seu próprio 'role' ou 'status' via update direto.
-- Apenas um administrador autenticado pode alterar 'role' ou 'status'.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_status_elevation()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o utilizador NÃO for administrador
    IF NOT public.is_admin() THEN
        -- Bloquear tentativa de alteração do role
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "role".';
        END IF;

        -- Bloquear tentativa de alteração do status
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o campo "status".';
        END IF;
    END IF;

    -- Atualizar timestamp se aplicável
    IF TG_TABLE_NAME = 'profiles' THEN
        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o trigger em public.profiles
DROP TRIGGER IF EXISTS trg_protect_profile_role_status ON public.profiles;
CREATE TRIGGER trg_protect_profile_role_status
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_status_elevation();

-- Aplicar o trigger em public.users (compatibilidade legada)
DROP TRIGGER IF EXISTS trg_protect_users_role_status ON public.users;
CREATE TRIGGER trg_protect_users_role_status
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_status_elevation();

-- Trigger que impede criação direta de perfis com role='admin' no INSERT
CREATE OR REPLACE FUNCTION public.prevent_admin_self_promotion_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'admin' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: não é permitido registar uma conta com role "admin" diretamente.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_profile_role_insert ON public.profiles;
CREATE TRIGGER trg_validate_profile_role_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_self_promotion_insert();

DROP TRIGGER IF EXISTS trg_validate_users_role_insert ON public.users;
CREATE TRIGGER trg_validate_users_role_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_self_promotion_insert();

-- ------------------------------------------------------------------------------
-- BLOCO 5: HABILITAÇÃO DO ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_history ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- BLOCO 6: LIMPEZA DE TODAS AS POLÍTICAS ANTERIORES / INSEGURAS
-- Remove políticas abertas (ex: "Acesso total") criadas anteriormente.
-- ------------------------------------------------------------------------------
-- users
DROP POLICY IF EXISTS "Acesso total users" ON public.users;
DROP POLICY IF EXISTS "Acesso total para users" ON public.users;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- profiles
DROP POLICY IF EXISTS "Acesso total profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon to view" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- chefs
DROP POLICY IF EXISTS "Acesso total chefs" ON public.chefs;
DROP POLICY IF EXISTS "chefs_select_policy" ON public.chefs;
DROP POLICY IF EXISTS "chefs_insert_policy" ON public.chefs;
DROP POLICY IF EXISTS "chefs_update_policy" ON public.chefs;
DROP POLICY IF EXISTS "chefs_delete_policy" ON public.chefs;

-- menus
DROP POLICY IF EXISTS "Acesso total menus" ON public.menus;
DROP POLICY IF EXISTS "Acesso público para leitura de menus" ON public.menus;
DROP POLICY IF EXISTS "Chefs podem gerir os seus menus" ON public.menus;
DROP POLICY IF EXISTS "menus_select_policy" ON public.menus;
DROP POLICY IF EXISTS "menus_manage_policy" ON public.menus;

-- chef_recipes
DROP POLICY IF EXISTS "Acesso total chef_recipes" ON public.chef_recipes;
DROP POLICY IF EXISTS "chef_recipes_select_policy" ON public.chef_recipes;
DROP POLICY IF EXISTS "chef_recipes_manage_policy" ON public.chef_recipes;

-- bookings
DROP POLICY IF EXISTS "Acesso total bookings" ON public.bookings;
DROP POLICY IF EXISTS "Utilizadores podem ver as suas reservas" ON public.bookings;
DROP POLICY IF EXISTS "Utilizadores podem criar reservas" ON public.bookings;
DROP POLICY IF EXISTS "Utilizadores podem atualizar as suas reservas" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_policy" ON public.bookings;

-- reviews
DROP POLICY IF EXISTS "Acesso total reviews" ON public.reviews;
DROP POLICY IF EXISTS "Acesso público para leitura de reviews" ON public.reviews;
DROP POLICY IF EXISTS "Clientes podem criar reviews" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_policy" ON public.reviews;

-- messages
DROP POLICY IF EXISTS "Acesso total messages" ON public.messages;
DROP POLICY IF EXISTS "Utilizadores podem ver as suas mensagens" ON public.messages;
DROP POLICY IF EXISTS "Utilizadores podem enviar mensagens" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

-- notifications
DROP POLICY IF EXISTS "Acesso total notifications" ON public.notifications;
DROP POLICY IF EXISTS "Acesso total para notificações" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

-- admin_logs
DROP POLICY IF EXISTS "Acesso total admin_logs" ON public.admin_logs;
DROP POLICY IF EXISTS "admin_logs_admin_only_policy" ON public.admin_logs;

-- platform_settings
DROP POLICY IF EXISTS "Acesso total platform_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Acesso público para leitura de settings" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_select_policy" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_admin_mutation_policy" ON public.platform_settings;

-- favorites
DROP POLICY IF EXISTS "Acesso total favorites" ON public.favorites;
DROP POLICY IF EXISTS "Acesso total para favoritos" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_policy" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_policy" ON public.favorites;

-- waitlist
DROP POLICY IF EXISTS "Acesso total waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_select_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_modify_policy" ON public.waitlist;

-- loyalty_history
DROP POLICY IF EXISTS "Acesso total loyalty_history" ON public.loyalty_history;
DROP POLICY IF EXISTS "Utilizadores podem ver o seu histórico de pontos" ON public.loyalty_history;
DROP POLICY IF EXISTS "loyalty_history_select_policy" ON public.loyalty_history;
DROP POLICY IF EXISTS "loyalty_history_insert_policy" ON public.loyalty_history;
DROP POLICY IF EXISTS "loyalty_history_update_policy" ON public.loyalty_history;
DROP POLICY IF EXISTS "loyalty_history_delete_policy" ON public.loyalty_history;

-- ------------------------------------------------------------------------------
-- BLOCO 7: POLÍTICAS RLS ESTRITAS E DETALHADAS POR TABELA
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- 7.1 TABELA: public.profiles
-- - Leitura: Dono do perfil, Admin, ou Perfis de Chefs (para descoberta na plataforma).
--   Dados de clientes permanecem estritamente isolados e privados.
-- - Inserção: O próprio utilizador autenticado (auth.uid() = id) ou Admin.
-- - Atualização: O próprio utilizador ou Admin (trigger impede mudar role/status).
-- - Eliminação: O próprio utilizador ou Admin.
-- ==============================================================================
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated, anon
USING (
    auth.uid() = id
    OR public.is_admin()
    OR role = 'cook'
);

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated, anon
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.2 TABELA: public.users (compatibilidade com tabela legada)
-- Políticas idênticas a public.profiles.
-- ==============================================================================
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated, anon
USING (
    auth.uid() = id
    OR public.is_admin()
    OR role = 'cook'
);

CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated, anon
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.3 TABELA: public.chefs
-- - Leitura: Pública/Autenticada para catálogo de chefs, especialidades e bio.
-- - Edição: Apenas o próprio chef (profile_id = auth.uid()) ou Admin.
-- ==============================================================================
CREATE POLICY "chefs_select_policy" ON public.chefs
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "chefs_insert_policy" ON public.chefs
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = profile_id
    OR public.is_admin()
);

CREATE POLICY "chefs_update_policy" ON public.chefs
FOR UPDATE TO authenticated
USING (
    auth.uid() = profile_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = profile_id
    OR public.is_admin()
);

CREATE POLICY "chefs_delete_policy" ON public.chefs
FOR DELETE TO authenticated
USING (
    auth.uid() = profile_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.4 TABELAS: public.menus e public.chef_recipes
-- - Leitura: Pública/Autenticada para visualização de menus e pratos disponíveis.
-- - Edição: Apenas o Chef autor (cook_id = auth.uid()) ou Admin.
-- ==============================================================================
CREATE POLICY "menus_select_policy" ON public.menus
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "menus_manage_policy" ON public.menus
FOR ALL TO authenticated
USING (
    auth.uid() = cook_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = cook_id
    OR public.is_admin()
);

CREATE POLICY "chef_recipes_select_policy" ON public.chef_recipes
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "chef_recipes_manage_policy" ON public.chef_recipes
FOR ALL TO authenticated
USING (
    auth.uid() = cook_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = cook_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.5 TABELA: public.bookings
-- - Leitura: Cliente da reserva (client_id = auth.uid()),
--            Chef da reserva (cook_id = auth.uid()),
--            ou Admin com role='admin'.
-- - Inserção: Apenas o cliente para as suas próprias reservas (client_id = auth.uid()) ou Admin.
-- - Atualização: Cliente envolvido, Chef envolvido, ou Admin.
-- - Eliminação: Cliente ou Admin.
-- ==============================================================================
CREATE POLICY "bookings_select_policy" ON public.bookings
FOR SELECT TO authenticated
USING (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
);

CREATE POLICY "bookings_insert_policy" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "bookings_update_policy" ON public.bookings
FOR UPDATE TO authenticated
USING (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
);

CREATE POLICY "bookings_delete_policy" ON public.bookings
FOR DELETE TO authenticated
USING (
    auth.uid() = client_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.6 TABELA: public.reviews
-- - Leitura: Pública/Autenticada (testemunhos e avaliações dos chefs).
-- - Inserção: Apenas o cliente autor da avaliação ou Admin.
-- - Atualização/Eliminação: Apenas o cliente autor ou Admin.
-- ==============================================================================
CREATE POLICY "reviews_select_policy" ON public.reviews
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "reviews_insert_policy" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "reviews_update_policy" ON public.reviews
FOR UPDATE TO authenticated
USING (
    auth.uid() = client_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "reviews_delete_policy" ON public.reviews
FOR DELETE TO authenticated
USING (
    auth.uid() = client_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.7 TABELA: public.messages (Chat)
-- - Leitura: Apenas o remetente (sender_id), o destinatário (receiver_id) ou Admin.
-- - Inserção: O remetente autenticado deve coincidir com sender_id (ou Admin).
-- - Atualização: O próprio autor (sender_id) ou Admin.
-- - Eliminação: Os intervenientes (sender/receiver) ou Admin.
-- ==============================================================================
CREATE POLICY "messages_select_policy" ON public.messages
FOR SELECT TO authenticated
USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR public.is_admin()
);

CREATE POLICY "messages_insert_policy" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    OR public.is_admin()
);

CREATE POLICY "messages_update_policy" ON public.messages
FOR UPDATE TO authenticated
USING (
    auth.uid() = sender_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = sender_id
    OR public.is_admin()
);

CREATE POLICY "messages_delete_policy" ON public.messages
FOR DELETE TO authenticated
USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.8 TABELA: public.notifications
-- - Leitura: Apenas o destinatário (user_id = auth.uid()) ou Admin.
-- - Inserção: Utilizadores autenticados (para notificações de reservas) ou Admin.
-- - Atualização (marcar como lida): Apenas o destinatário ou Admin.
-- - Eliminação: Apenas o destinatário ou Admin.
-- ==============================================================================
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR public.is_admin()
);

CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    OR public.is_admin()
);

CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE TO authenticated
USING (
    auth.uid() = user_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
);

CREATE POLICY "notifications_delete_policy" ON public.notifications
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.9 TABELA: public.admin_logs
-- - Acesso total (SELECT, INSERT, UPDATE, DELETE): Estritamente restrito a Administradores.
-- ==============================================================================
CREATE POLICY "admin_logs_admin_only_policy" ON public.admin_logs
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 7.10 TABELA: public.platform_settings
-- - Leitura: Pública / Autenticada (taxas de comissão, limites de reservas, etc.).
-- - Mutação (INSERT, UPDATE, DELETE): Exclusiva de Administradores.
-- ==============================================================================
CREATE POLICY "platform_settings_select_policy" ON public.platform_settings
FOR SELECT TO authenticated, anon
USING (true);

CREATE POLICY "platform_settings_admin_mutation_policy" ON public.platform_settings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 7.11 TABELA: public.favorites
-- - Leitura/Escrita/Eliminação: Apenas o próprio cliente (client_id = auth.uid()) ou Admin.
-- ==============================================================================
CREATE POLICY "favorites_select_policy" ON public.favorites
FOR SELECT TO authenticated
USING (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "favorites_insert_policy" ON public.favorites
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "favorites_delete_policy" ON public.favorites
FOR DELETE TO authenticated
USING (
    auth.uid() = client_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.12 TABELA: public.waitlist
-- - Leitura/Gestão: Cliente da inscrição, Chef associado ou Admin.
-- ==============================================================================
CREATE POLICY "waitlist_select_policy" ON public.waitlist
FOR SELECT TO authenticated
USING (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
);

CREATE POLICY "waitlist_insert_policy" ON public.waitlist
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = client_id
    OR public.is_admin()
);

CREATE POLICY "waitlist_modify_policy" ON public.waitlist
FOR ALL TO authenticated
USING (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = client_id
    OR auth.uid() = cook_id
    OR public.is_admin()
);

-- ==============================================================================
-- 7.13 TABELA: public.loyalty_history
-- - Leitura: Apenas o dono dos pontos (user_id = auth.uid()) ou Admin.
-- - Inserção: Dono dos pontos ou Admin.
-- - Atualização e Eliminação: Estritamente restritas a Administradores.
-- ==============================================================================
CREATE POLICY "loyalty_history_select_policy" ON public.loyalty_history
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR public.is_admin()
);

CREATE POLICY "loyalty_history_insert_policy" ON public.loyalty_history
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
);

CREATE POLICY "loyalty_history_update_policy" ON public.loyalty_history
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "loyalty_history_delete_policy" ON public.loyalty_history
FOR DELETE TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 7.14 TABELA: public.email_events (Sistema de Emails Transacionais & Idempotência)
-- - Logs e rastreamento de emails transacionais (Resend / Edge Functions)
-- - Leitura: Administradores ou o próprio utilizador destinatário.
-- - Inserção / Modificação: Service Role ou Administrador.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_idempotency ON public.email_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_events_booking_id ON public.email_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON public.email_events(email_type);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_events_admin_select" ON public.email_events
FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "email_events_user_select" ON public.email_events
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR recipient_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "email_events_service_role" ON public.email_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- BLOCO 8: PUBLICAÇÃO SUPABASE REALTIME
-- Garante que o Realtime funciona respeitando as regras RLS definidas acima.
-- ------------------------------------------------------------------------------
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- ==============================================================================
-- FIM DO SCRIPT DE SEGURANÇA E RLS COOKR
-- ==============================================================================
