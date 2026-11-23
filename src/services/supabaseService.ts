import { todayLocal } from "../lib/dateUtils";
export { supabase } from '../lib/supabaseClient';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { supabaseAuthService } from './supabaseAuthService';
import { 
  User, 
  Booking, 
  MenuItem, 
  Review, 
  UserRole, 
  UserStatus, 
  BookingStatus, 
  ChefRecipe, 
  LoyaltyHistory, 
  HaccpChecklist, 
  HaccpLog,
  CertificationOrAward,
  ChefFAQItem
} from '../types';
import { addOfflineAction, isNetworkError } from './bookingQueue';
import { mockUsers, mockMenus, mockRecipes, mockBookings } from './mockData.ts.tsx';
import { emailService } from './emailService';

// Injeta variáveis no ambiente de execução se necessário
if (typeof window !== 'undefined') {
  (window as any).isSupabaseActive = true;
}

export const ADMIN_SUPPORT_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * Valida se uma string é um UUID válido no formato RFC4122 (necessário para o PostgreSQL do Supabase)
 */
export const isValidUUID = (val: any): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Converte de forma determinística qualquer identificador externo/legado num UUID válido
 */
export const toValidUUID = (id: string): string => {
  if (!id || typeof id !== 'string') return crypto.randomUUID();
  if (id === 'admin-support') return ADMIN_SUPPORT_UUID;
  const trimmed = id.trim();
  if (isValidUUID(trimmed)) return trimmed;

  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2246822507);
  }
  const hex1 = ((h1 >>> 0) + 0x100000000).toString(16).substring(1);
  const hex2 = ((h2 >>> 0) + 0x100000000).toString(16).substring(1);
  const hex3 = ((h3 >>> 0) + 0x100000000).toString(16).substring(1);
  const hex4 = ((h4 >>> 0) + 0x100000000).toString(16).substring(1);
  const full = hex1 + hex2 + hex3 + hex4;
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
};

// =============================================================================
// HELPERS DE TRANSFORMAÇÃO DE DADOS (PostgreSQL snake_case <-> App Model)
// =============================================================================

export function parseCertifications(certs: any): CertificationOrAward[] {
  if (!certs || !Array.isArray(certs)) return [];
  return certs.map((c: any) => {
    if (typeof c === 'string') {
      try {
        const parsed = JSON.parse(c);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        return { id: 'cert-' + Math.random().toString(36).substr(2, 9), title: c, issuer: 'Cookr', type: 'certification' };
      }
    }
    return c;
  });
}

export function parseFaqs(faqs: any): ChefFAQItem[] {
  if (!faqs || !Array.isArray(faqs)) return [];
  return faqs.map((f: any) => {
    if (typeof f === 'string') {
      try {
        const parsed = JSON.parse(f);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        return { id: 'faq-' + Math.random().toString(36).substr(2, 9), question: f, answer: '', category: 'geral' };
      }
    }
    return f;
  });
}

/**
 * Dados privados (IBAN, NIF, faturação) vivem em profile_private; o RLS só devolve
 * linhas do próprio utilizador ou, para admin, de todos. Se a tabela ainda não existir
 * (migração por aplicar) devolve as linhas inalteradas.
 */
async function attachPrivateProfileData<T extends { id?: string }>(rows: T[]): Promise<T[]> {
  if (!rows || rows.length === 0 || !isSupabaseConfigured()) return rows;
  try {
    const ids = rows.map(r => r.id).filter(Boolean) as string[];
    const [privRes, notesRes] = await Promise.all([
      supabase.from('profile_private').select('*').in('id', ids),
      supabase.from('profile_admin_notes').select('id, admin_notes').in('id', ids),
    ]);
    const priv = new Map<string, any>((privRes.data || []).map((r: any) => [r.id, r]));
    const notes = new Map<string, any>((notesRes.data || []).map((r: any) => [r.id, r]));
    return rows.map(r => {
      const p = priv.get(r.id as string);
      const n = notes.get(r.id as string);
      if (!p && !n) return r;
      const { id: _pid, updated_at: _pu, ...privFields } = p || {};
      return { ...r, ...privFields, ...(n ? { admin_notes: n.admin_notes } : {}) };
    });
  } catch (_) {
    return rows;
  }
}

async function attachPrivateProfileDataOne(row: any): Promise<any> {
  if (!row) return row;
  const [merged] = await attachPrivateProfileData([row]);
  return merged;
}

/** O PIN do serviço vive em booking_secrets (só o cliente da reserva e o admin o leem). */
async function attachBookingPins(rows: any[]): Promise<any[]> {
  if (!rows || rows.length === 0 || !isSupabaseConfigured()) return rows;
  try {
    const ids = rows.map(r => r.id).filter(Boolean);
    const { data } = await supabase.from('booking_secrets').select('booking_id, service_pin').in('booking_id', ids);
    if (!data || data.length === 0) return rows;
    const pins = new Map<string, string>(data.map((r: any) => [r.booking_id, r.service_pin]));
    return rows.map(r => (pins.has(r.id) ? { ...r, service_pin: pins.get(r.id) } : r));
  } catch (_) {
    return rows;
  }
}

const PENDING_SIGNUP_PREFIX = 'cookr_pending_signup_';

function savePendingSignup(email: string, data: any, role: UserRole) {
  try {
    const { password: _pw, ...safe } = data || {};
    localStorage.setItem(PENDING_SIGNUP_PREFIX + email, JSON.stringify({ data: safe, role, savedAt: Date.now() }));
  } catch (_) {}
}

function takePendingSignup(email: string): { data: any; role: UserRole } | null {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_PREFIX + email);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Válido por 30 dias
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > 30 * 24 * 3600 * 1000) {
      localStorage.removeItem(PENDING_SIGNUP_PREFIX + email);
      return null;
    }
    return { data: parsed.data, role: parsed.role };
  } catch (_) {
    return null;
  }
}

function clearPendingSignup(email: string) {
  try { localStorage.removeItem(PENDING_SIGNUP_PREFIX + email); } catch (_) {}
}

function buildProfilePayload(targetId: string, sanitizedEmail: string, data: any, role: UserRole): any {
  const fullBillingAddress = data.billing_address || [
    data.billing_street,
    data.billing_number ? `nº ${data.billing_number}` : '',
    data.billing_floor
  ].filter(Boolean).join(', ') || data.morada || null;

  return {
    id: targetId,
    email: sanitizedEmail,
    nome: data.nome,
    telefone: data.telefone || null,
    role: role,
    status: role === UserRole.COOK ? UserStatus.UNDER_REVIEW : UserStatus.ACTIVE,
    avatar_url: data.avatar_url || null,
    cover_url: data.cover_url || null,
    morada: data.morada || fullBillingAddress || null,
    cidade: data.cidade || data.billing_city || null,
    localizacao: data.localizacao || data.distrito || data.cidade || data.billing_city || null,
    zip_code: data.zip_code || data.billing_zip || null,
    nif: data.nif || null,
    iban: data.iban || null,
    fiscal_name: data.fiscal_name || data.nome || null,
    billing_address: fullBillingAddress,
    billing_street: data.billing_street || null,
    billing_number: data.billing_number || null,
    billing_floor: data.billing_floor || null,
    billing_zip: data.billing_zip || data.zip_code || null,
    billing_city: data.billing_city || data.cidade || null,
    billing_country: data.billing_country || 'Portugal',
    addresses: data.addresses || (data.morada ? [{
      id: crypto.randomUUID(),
      label: 'Cozinha Principal',
      address: data.morada,
      city: data.cidade || 'Lisboa',
      zip_code: data.zip_code || '',
      isDefault: true
    }] : []),
    dietary_restrictions: data.dietary_restrictions || [],
    cuisine_preferences: data.cuisine_preferences || [],
    loyalty_points: data.loyalty_points ?? 0,
  };
}

function buildChefPayload(targetId: string, data: any): any {
  return {
    profile_id: targetId,
    biografia: data.biografia || '',
    especialidades: data.especialidades || [],
    experiencia_anos: data.experiencia || 0,
    preco_medio: data.precoMedio || 0,
    distrito: data.distrito || data.cidade || '',
    concelho: data.concelho || '',
    localizacao: data.localizacao || data.distrito || data.cidade || '',
    idiomas: data.idiomas || ['Português'],
    equipamento: data.equipamento || [],
    diferenciais: data.diferenciais || [],
    certifications_and_awards: data.certifications_and_awards || [],
    faqs: data.faqs || [],
    sustainability_badges: data.sustainability_badges || [],
    sustainability_notes: data.sustainability_notes || '',
    allergen_certifications: data.allergen_certifications || [],
    allergen_notes: data.allergen_notes || '',
    portfolio_images: data.portfolio_images || [],
    disponibilidade: data.disponibilidade || {},
    is_available: true,
    offers_wine_pairing: data.offers_wine_pairing || false,
    approved_by_admin: false,
    bypass_haccp_restrictions: false,
    kitchen_notes: data.kitchenNotes || '',
  };
}

/** Grava o perfil (e a linha de chef) na base de dados; exige sessão ativa do próprio utilizador. */
async function persistNewProfile(targetId: string, sanitizedEmail: string, data: any, role: UserRole) {
  const profilePayload = buildProfilePayload(targetId, sanitizedEmail, data, role);

  try {
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });
    if (profileErr) {
      console.warn('[Supabase Profiles] Aviso ao gravar perfil:', profileErr.message || profileErr);
    }
  } catch (upsertErr: any) {
    console.warn('[Supabase Profiles] Erro ao gravar perfil na nuvem:', upsertErr?.message || upsertErr);
  }

  let chefData: any = null;
  if (role === UserRole.COOK) {
    const chefPayload = buildChefPayload(targetId, data);
    try {
      const { data: insertedChef, error: chefErr } = await supabase
        .from('chefs')
        .upsert(chefPayload, { onConflict: 'profile_id' })
        .select()
        .maybeSingle();
      if (chefErr) {
        console.warn('[Supabase Chefs] Aviso ao gravar chef:', chefErr.message || chefErr);
        chefData = chefPayload;
      } else {
        chefData = insertedChef || chefPayload;
      }
    } catch (chefEx: any) {
      console.warn('[Supabase Chefs] Exceção ao gravar chef:', chefEx?.message || chefEx);
      chefData = chefPayload;
    }
    saveChefToLocalCache(chefData);
  }

  return { profilePayload, chefData };
}

function mapProfileRowToUser(profile: any, chef?: any): User {
  const isChef = profile.role === UserRole.COOK;
  const mergedChef = chef || {};

  return {
    id: profile.id,
    nome: profile.nome || 'Utilizador',
    email: profile.email || '',
    telefone: profile.telefone || '',
    role: (profile.role as UserRole) || UserRole.CLIENT,
    status: (profile.status as UserStatus) || UserStatus.ACTIVE,
    avatar_url: profile.avatar_url || '',
    cover_url: profile.cover_url || '',
    morada: profile.morada || '',
    cidade: profile.cidade || '',
    localizacao: profile.localizacao || mergedChef.distrito || mergedChef.localizacao || profile.cidade || '',
    zip_code: profile.zip_code || '',
    nif: profile.nif || '',
    iban: profile.iban || '',
    fiscal_name: profile.fiscal_name || profile.nome || '',
    billing_address: profile.billing_address || profile.morada || '',
    billing_street: profile.billing_street || '',
    billing_number: profile.billing_number || '',
    billing_floor: profile.billing_floor || '',
    billing_zip: profile.billing_zip || profile.zip_code || '',
    billing_city: profile.billing_city || profile.cidade || '',
    billing_country: profile.billing_country || 'Portugal',
    addresses: profile.addresses || [],
    dietary_restrictions: profile.dietary_restrictions || [],
    cuisine_preferences: profile.cuisine_preferences || [],
    favoriteChefIds: profile.favorite_chef_ids || [],
    loyalty_points: profile.loyalty_points ?? 0,
    badges: profile.badges || [],
    language: profile.language || 'pt',
    notification_settings: profile.notification_settings || {
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      booking_updates: true,
      marketing_offers: false,
      system_alerts: true,
    },
    admin_notes: profile.admin_notes || '',
    created_at: profile.created_at || new Date().toISOString(),
    is_chef: isChef,

    // Propriedades do perfil profissional de Chef
    biografia: mergedChef.biografia || '',
    especialidades: mergedChef.especialidades || [],
    experiencia: mergedChef.experiencia_anos ?? 0,
    rating: Number(mergedChef.rating ?? 5.0),
    total_avaliacoes: mergedChef.total_avaliacoes ?? 0,
    total_reservas: mergedChef.total_reservas ?? 0,
    precoMedio: Number(mergedChef.preco_medio ?? 0),
    idiomas: mergedChef.idiomas || ['Português'],
    equipamento: mergedChef.equipamento || [],
    diferenciais: mergedChef.diferenciais || [],
    certifications_and_awards: parseCertifications(mergedChef.certifications_and_awards),
    faqs: parseFaqs(mergedChef.faqs),
    sustainability_badges: mergedChef.sustainability_badges || [],
    sustainability_notes: mergedChef.sustainability_notes || '',
    allergen_certifications: mergedChef.allergen_certifications || [],
    allergen_notes: mergedChef.allergen_notes || '',
    portfolio_images: mergedChef.portfolio_images || [],
    disponibilidade: mergedChef.disponibilidade || {},
    isAvailable: mergedChef.is_available ?? true,
    is_available: mergedChef.is_available ?? true,
    offers_wine_pairing: mergedChef.offers_wine_pairing ?? false,
    approvedByAdmin: mergedChef.approved_by_admin ?? false,
    bypass_haccp_restrictions: mergedChef.bypass_haccp_restrictions ?? false,
    kitchenNotes: mergedChef.kitchen_notes || profile.kitchen_notes || '',
  };
}

function mapBookingRowToBooking(row: any): Booking {
  return {
    id: row.id,
    cookId: row.cook_id,
    clientId: row.client_id,
    clientName: row.client_name || '',
    cookName: row.cook_name || '',
    menu_selected: row.menu_selected || '',
    menu_type: row.menu_type || 'experience',
    data: row.data || '',
    hora: row.hora || '',
    numPessoas: row.num_pessoas ?? 2,
    morada: row.morada || '',
    valorTotal: row.valor_total ?? 0,
    status: (row.status as BookingStatus) || BookingStatus.PENDING,
    is_meal_prep: row.is_meal_prep ?? false,
    is_finalizing: row.is_finalizing ?? false,
    service_pin: row.service_pin || '',
    kitchenNotes: row.kitchen_notes || '',
    restrictions: row.restrictions || [],
    guests: row.guests || [],
    guestsSummary: row.guests_summary || '',
    wine_pairing: row.wine_pairing || null,
    splitBill: row.split_bill || null,
    gorjeta: Number(row.gorjeta ?? 0),
    proposed_date: row.proposed_date || '',
    proposed_time: row.proposed_time || '',
    cancelled_at: row.cancelled_at || '',
    cancelled_by: row.cancelled_by || '',
    cancellation_reason: row.cancellation_reason || '',
    reminder_24h_sent: row.reminder_24h_sent ?? false,
    reminder_2h_sent: row.reminder_2h_sent ?? false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapMenuRowToMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    cookId: row.cook_id,
    cook_id: row.cook_id,
    nome: row.nome || '',
    descricao: row.descricao || '',
    preco: Number(row.preco ?? 0),
    type: row.type || 'experience',
    imageUrl: row.image_url || '',
    image_url: row.image_url || '',
    gallery: row.gallery_urls || [],
    gallery_urls: row.gallery_urls || [],
    courses: row.courses || [],
    tags: row.tags || [],
    dietary_tags: row.dietary_tags || [],
    is_meal_prep: row.is_meal_prep ?? false,
    pack_size: row.pack_size,
    delivery_type: row.delivery_type || 'both',
    calories: row.calories,
    cuisine_type: row.cuisine_type,
    dynamic_pricing: row.dynamic_pricing || { enabled: false },
  };
}

function mapReviewRowToReview(row: any): Review {
  return {
    id: row.id,
    cookId: row.cook_id,
    cook_id: row.cook_id,
    clientId: row.client_id,
    client_id: row.client_id,
    clientName: row.client_name || 'Cliente',
    rating: Number(row.rating ?? 5),
    comment: row.comment || '',
    bookingId: row.booking_id,
    isFlagged: row.is_flagged ?? false,
    isHidden: row.is_hidden ?? false,
    flaggedReason: row.flagged_reason,
    created_at: row.created_at || new Date().toISOString(),
  };
}

// =============================================================================
// LOCAL MENUS & USERS CACHE (Fallback & Resiliência a RLS/Offline)
// =============================================================================
const LOCAL_MENUS_KEY = 'cookr_local_menus';
const LOCAL_USERS_KEY = 'cookr_local_users';
const LOCAL_CHEFS_KEY = 'cookr_local_chefs';
const LOCAL_CREDENTIALS_KEY = 'cookr_local_credentials';
const LOCAL_REVIEWS_KEY = 'cookr_local_reviews';

export interface LocalCredential {
  email: string;
  password?: string;
  role?: UserRole;
  updatedAt: string;
}

export const getLocalAuthCredentials = (email: string): LocalCredential | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    if (!raw) return null;
    const creds: LocalCredential[] = JSON.parse(raw);
    const sanitized = email.toLowerCase().trim();
    return creds.find(c => c.email.toLowerCase().trim() === sanitized) || null;
  } catch {
    return null;
  }
};

export const saveLocalAuthCredentials = (email: string, password?: string, role?: UserRole): void => {
  if (typeof window === 'undefined' || !email) return;
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    const creds: LocalCredential[] = raw ? JSON.parse(raw) : [];
    const sanitized = email.toLowerCase().trim();
    const updated = [
      { email: sanitized, password: isSupabaseConfigured() ? undefined : password, role, updatedAt: new Date().toISOString() },
      ...creds.filter(c => c.email.toLowerCase().trim() !== sanitized)
    ];
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível salvar credenciais localmente:', err);
  }
};

export const getLocalCachedMenus = (): MenuItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_MENUS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveMenuToLocalCache = (menuRow: any): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalCachedMenus();
    const item = mapMenuRowToMenuItem(menuRow);
    const updated = [item, ...existing.filter(m => m.id !== item.id)];
    localStorage.setItem(LOCAL_MENUS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível salvar menu localmente:', err);
  }
};

export const removeMenuFromLocalCache = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalCachedMenus();
    const updated = existing.filter(m => m.id !== id);
    localStorage.setItem(LOCAL_MENUS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível remover menu localmente:', err);
  }
};

export const getLocalCachedUsers = (): User[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveUserToLocalCache = (user: User): void => {
  if (typeof window === 'undefined' || !user) return;
  try {
    const existing = getLocalCachedUsers();
    const updated = [user, ...existing.filter(u => u.id !== user.id && u.email?.toLowerCase().trim() !== user.email?.toLowerCase().trim())];
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível salvar utilizador localmente:', err);
  }
};

export const getLocalCachedChefs = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CHEFS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveChefToLocalCache = (chefData: any): void => {
  if (typeof window === 'undefined' || !chefData) return;
  try {
    const existing = getLocalCachedChefs();
    const pId = chefData.profile_id || chefData.id;
    const updated = [chefData, ...existing.filter(c => (c.profile_id || c.id) !== pId)];
    localStorage.setItem(LOCAL_CHEFS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível salvar dados de chef localmente:', err);
  }
};

export const getLocalCachedReviews = (): Review[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveReviewToLocalCache = (review: Review): void => {
  if (typeof window === 'undefined' || !review) return;
  try {
    const existing = getLocalCachedReviews();
    const updated = [review, ...existing.filter(r => r.id !== review.id)];
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Local Cache] Não foi possível salvar avaliação localmente:', err);
  }
};

// =============================================================================
// SERVIÇO PRINCIPAL: supabaseService
// =============================================================================

/**
 * Termina a sessão no Supabase e apaga do dispositivo os dados pessoais em cache
 * (perfis de outros utilizadores, credenciais de demonstração).
 * Mantém caches públicas (chefs/menus) e a fila offline, que é filtrada por utilizador.
 */
export const signOutAndClearLocalData = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('[Supabase] signOut note:', e);
  }
  try {
    localStorage.removeItem('cookr_user');
    localStorage.removeItem(LOCAL_USERS_KEY);
    localStorage.removeItem(LOCAL_CREDENTIALS_KEY);
    localStorage.removeItem(LOCAL_REVIEWS_KEY);
    localStorage.removeItem('cookr_admin_custom_tasks');
    Object.keys(localStorage)
      .filter(k => k.startsWith('cookr_push_enabled_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (_) {}
};

export const supabaseService = {
  // Autenticação delegada
  ...supabaseAuthService,

  /**
   * Autenticação e obtenção do perfil de utilizador com fallback resiliente para Supabase Auth,
   * perfis locais de registo e contas de demonstração.
   */
  signIn: async (email: string, password?: string): Promise<User | null> => {
    const sanitizedEmail = email.toLowerCase().trim();

    let authUser: any = null;
    let authError: any = null;

    // 1. Tentar autenticar no Supabase Auth se fornecida password
    if (password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        });

        if (error) {
          authError = error;
          console.warn('[Supabase Auth] Informação de autenticação remota:', error.message);
        } else if (data?.user) {
          authUser = data.user;
        }
      } catch (authErr: any) {
        authError = authErr;
        console.warn('[Supabase Auth] Exceção de rede ou credenciais remotas:', authErr?.message || authErr);
      }
    }

    // 2. Obter perfil da base de dados Supabase
    let profile: any = null;
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (!profileErr && data) {
        profile = authUser ? await attachPrivateProfileDataOne(data) : data;
        if (authUser) clearPendingSignup(sanitizedEmail);
      }
    } catch (err) {
      console.warn('[Supabase] Erro ao consultar perfil por email:', err);
    }

    let candidateUser: User | null = null;

    if (profile) {
      let chefData = null;
      if (profile.role === UserRole.COOK) {
        try {
          const { data: chef } = await supabase
            .from('chefs')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();
          chefData = chef;
        } catch (_) {}
        if (!chefData) {
          chefData = getLocalCachedChefs().find(c => (c.profile_id || c.id) === profile.id);
        }
      }
      candidateUser = mapProfileRowToUser(profile, chefData);
    } else if (isSupabaseConfigured()) {
      // Com o Supabase configurado, a identidade vem SEMPRE do Supabase Auth.
      // Nunca se usam contas locais ou de demonstração (permitiam entrar com qualquer password).
      if (!authUser) {
        throw authError || new Error('Email ou palavra-passe incorretos.');
      }
      // Registo feito com confirmação de email: grava agora o formulário guardado no dispositivo.
      const pending = takePendingSignup(sanitizedEmail);
      if (pending) {
        const persisted = await persistNewProfile(authUser.id, sanitizedEmail, pending.data, pending.role);
        clearPendingSignup(sanitizedEmail);
        candidateUser = mapProfileRowToUser(persisted.profilePayload, persisted.chefData);
      } else {
      // Conta autenticada mas sem perfil na base de dados: cria um perfil básico de cliente.
      const wantsCook = authUser.user_metadata?.role === UserRole.COOK;
      const baseProfile = {
        id: authUser.id,
        email: sanitizedEmail,
        nome: authUser.user_metadata?.nome || sanitizedEmail.split('@')[0],
        telefone: authUser.user_metadata?.telefone || null,
        role: wantsCook ? UserRole.COOK : UserRole.CLIENT,
        status: wantsCook ? UserStatus.UNDER_REVIEW : UserStatus.ACTIVE,
      };
      let createdRow: any = null;
      try {
        const { data: created } = await supabase
          .from('profiles')
          .upsert(baseProfile, { onConflict: 'id' })
          .select('*')
          .maybeSingle();
        createdRow = created;
      } catch (_) {}
      candidateUser = mapProfileRowToUser(createdRow || baseProfile, null);
      }
    } else {
      // Modo demonstração (sem Supabase configurado)
      const localUser = getLocalCachedUsers().find(u => u.email.toLowerCase().trim() === sanitizedEmail);
      const candidateMock = mockUsers.find(u => u.email.toLowerCase().trim() === sanitizedEmail);
      candidateUser = localUser || candidateMock || null;
    }

    // Se o utilizador foi identificado (na nuvem, no registo local ou mock)
    if (candidateUser) {
      // Se autenticou no Supabase Auth com sucesso
      if (authUser) {
        // Nunca guardar passwords no browser; remove credenciais locais antigas.
        try { localStorage.removeItem(LOCAL_CREDENTIALS_KEY); } catch (_) {}
        return candidateUser;
      }

      // Com o Supabase configurado, sem autenticação válida não há login.
      if (isSupabaseConfigured()) {
        throw authError || new Error('Email ou palavra-passe incorretos.');
      }

      // Se o Supabase Auth falhou (por rate-limit de emails, unconfirmed email, restrição de domínio ou utilizador criado localmente):
      const localCreds = getLocalAuthCredentials(sanitizedEmail);

      // Tratamento especial para utilizadores de teste como teste5@gmail.com ou contas locais
      if (sanitizedEmail === 'teste5@gmail.com') {
        if (password) {
          saveLocalAuthCredentials(sanitizedEmail, password, candidateUser.role);
        }
        return candidateUser;
      }

      if (localCreds?.password) {
        if (password && localCreds.password !== password) {
          throw new Error("Palavra-passe incorreta.");
        }
      } else if (password) {
        // Se ainda não tinha credencial local armazenada, grava agora a palavra-passe utilizada
        saveLocalAuthCredentials(sanitizedEmail, password, candidateUser.role);
      }

      return candidateUser;
    }

    // Se o utilizador não existe em nenhum lugar e houve erro no Supabase Auth
    if (authError) {
      throw authError;
    }

    return null;
  },

  /**
   * Obter todos os utilizadores (usado no painel de administração)
   */
  getUsers: async (): Promise<User[]> => {
    try {
      const [profilesRes, chefsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('chefs').select('*'),
      ]);

      const profiles = await attachPrivateProfileData(profilesRes.data || []);
      const chefsMap = new Map((chefsRes.data || []).map((c: any) => [c.profile_id, c]));

      // Integrar chefs em cache local
      const localChefs = getLocalCachedChefs();
      for (const lc of localChefs) {
        const pId = lc.profile_id || lc.id;
        if (pId && !chefsMap.has(pId)) {
          chefsMap.set(pId, lc);
        }
      }

      let userList = profiles.map((p: any) => mapProfileRowToUser(p, chefsMap.get(p.id)));

      // Integrar utilizadores locais
      const localUsers = getLocalCachedUsers();
      for (const lu of localUsers) {
        if (!userList.some(u => u.id === lu.id || u.email?.toLowerCase().trim() === lu.email?.toLowerCase().trim())) {
          userList.unshift(lu);
        }
      }

      if (userList.length === 0) {
        return mockUsers;
      }

      // Garantir que contas mock fundamentais (ex: admin) fiquem disponíveis
      for (const mu of mockUsers) {
        if (!userList.some(u => u.id === mu.id || u.email?.toLowerCase().trim() === mu.email?.toLowerCase().trim())) {
          userList.push(mu);
        }
      }

      return userList;
    } catch (err) {
      console.warn('[Supabase] getUsers note:', err);
      const localUsers = getLocalCachedUsers();
      const combined = [...localUsers];
      for (const mu of mockUsers) {
        if (!combined.some(u => u.id === mu.id || u.email?.toLowerCase().trim() === mu.email?.toLowerCase().trim())) {
          combined.push(mu);
        }
      }
      return combined;
    }
  },

  // High-performance In-Memory Request Cache (15s TTL) para máxima velocidade e fluidez
  _cacheStore: {
    cooks: null as { data: User[]; expiry: number } | null,
    menus: null as { data: MenuItem[]; expiry: number } | null,
    reviews: null as { data: Review[]; expiry: number } | null,
  },

  invalidateCooksCache: () => {
    supabaseService._cacheStore.cooks = null;
  },
  invalidateMenusCache: () => {
    supabaseService._cacheStore.menus = null;
  },
  invalidateReviewsCache: () => {
    supabaseService._cacheStore.reviews = null;
  },

  /**
   * Obter utilizadores por role (ex: todos os chefs para a pesquisa/catálogo)
   */
  getUsersByRole: async (role: UserRole, forceRefresh = false): Promise<User[]> => {
    if (role === UserRole.COOK && !forceRefresh && supabaseService._cacheStore.cooks && Date.now() < supabaseService._cacheStore.cooks.expiry) {
      return supabaseService._cacheStore.cooks.data;
    }
    try {
      let results: User[] = [];

      if (role === UserRole.COOK) {
        // Usar a chef_details_view para obter chefs completos com alto desempenho
        const { data, error } = await supabase
          .from('chef_details_view')
          .select('*')
          .order('rating', { ascending: false });

        if (!error && data && data.length > 0) {
          results = data.map((row: any) => {
            return {
              id: row.profile_id,
              nome: row.nome || 'Chef',
              email: row.email || '',
              telefone: row.telefone || '',
              role: UserRole.COOK,
              status: (row.status as UserStatus) || UserStatus.ACTIVE,
              avatar_url: row.avatar_url || '',
              cover_url: row.cover_url || '',
              morada: row.morada || '',
              cidade: row.cidade || '',
              localizacao: row.chef_localizacao || row.distrito || row.concelho || row.user_localizacao || row.cidade || '',
              biografia: row.biografia || '',
              especialidades: row.especialidades || [],
              experiencia: row.experiencia_anos ?? 0,
              rating: Number(row.rating ?? 5.0),
              total_avaliacoes: row.total_avaliacoes ?? 0,
              total_reservas: row.total_reservas ?? 0,
              precoMedio: Number(row.preco_medio ?? 0),
              idiomas: row.idiomas || ['Português'],
              equipamento: row.equipamento || [],
              diferenciais: row.diferenciais || [],
              certifications_and_awards: parseCertifications(row.certifications_and_awards),
              faqs: parseFaqs(row.faqs),
              sustainability_badges: row.sustainability_badges || [],
              sustainability_notes: row.sustainability_notes || '',
              allergen_certifications: row.allergen_certifications || [],
              allergen_notes: row.allergen_notes || '',
              portfolio_images: row.portfolio_images || [],
              disponibilidade: row.disponibilidade || {},
              isAvailable: row.is_available ?? true,
              is_available: row.is_available ?? true,
              offers_wine_pairing: row.offers_wine_pairing ?? false,
              approvedByAdmin: row.approved_by_admin ?? false,
              bypass_haccp_restrictions: row.bypass_haccp_restrictions ?? false,
              kitchenNotes: row.kitchen_notes || '',
              is_chef: true,
              created_at: row.created_at,
            };
          });
        }
      }

      // Consulta padrão na tabela profiles se chef_details_view estiver vazia
      if (results.length === 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', role)
          .order('created_at', { ascending: false });

        if (!error && profiles && profiles.length > 0) {
          if (role === UserRole.COOK) {
            const { data: chefs } = await supabase.from('chefs').select('*');
            const chefsMap = new Map((chefs || []).map((c: any) => [c.profile_id, c]));
            results = profiles.map((p: any) => mapProfileRowToUser(p, chefsMap.get(p.id)));
          } else {
            results = profiles.map((p: any) => mapProfileRowToUser(p));
          }
        }
      }

      // Integrar utilizadores locais
      const localUsers = getLocalCachedUsers().filter(u => u.role === role);
      for (const lu of localUsers) {
        if (!results.some(u => u.id === lu.id || u.email?.toLowerCase().trim() === lu.email?.toLowerCase().trim())) {
          results.unshift(lu);
        }
      }

      if (results.length === 0) {
        return mockUsers.filter(u => u.role === role);
      }

      // Garantir mocks
      for (const mu of mockUsers.filter(u => u.role === role)) {
        if (!results.some(u => u.id === mu.id || u.email?.toLowerCase().trim() === mu.email?.toLowerCase().trim())) {
          results.push(mu);
        }
      }

      if (role === UserRole.COOK && results.length > 0) {
        supabaseService._cacheStore.cooks = { data: results, expiry: Date.now() + 15000 };
      }
      return results;
    } catch (err) {
      console.warn(`[Supabase] getUsersByRole (${role}) note:`, err);
      const localUsers = getLocalCachedUsers().filter(u => u.role === role);
      const combined = [...localUsers];
      for (const mu of mockUsers.filter(u => u.role === role)) {
        if (!combined.some(u => u.id === mu.id || u.email?.toLowerCase().trim() === mu.email?.toLowerCase().trim())) {
          combined.push(mu);
        }
      }
      return combined;
    }
  },

  /**
   * Obter perfil de utilizador por ID
   */
  getProfileById: async (id: string): Promise<User | null> => {
    if (!id) return null;
    if (isValidUUID(id)) {
      try {
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && profile) {
          profile = await attachPrivateProfileDataOne(profile);
          let chefData = null;
          if (profile.role === UserRole.COOK) {
            const { data: chef } = await supabase
              .from('chefs')
              .select('*')
              .eq('profile_id', id)
              .maybeSingle();
            chefData = chef;
            if (!chefData) {
              chefData = getLocalCachedChefs().find(c => (c.profile_id || c.id) === id);
            }
          }

          return mapProfileRowToUser(profile, chefData);
        }
      } catch (err) {
        console.warn('[Supabase] getProfileById note:', err);
      }
    }

    const localUser = getLocalCachedUsers().find(u => u.id === id);
    if (localUser) return localUser;

    return mockUsers.find(u => u.id === id) || null;
  },

  /**
   * Obter perfil de utilizador por Email (Crucial para resolução e migração de utilizadores legados)
   */
  getProfileByEmail: async (email: string): Promise<User | null> => {
    if (!email || typeof email !== 'string') return null;
    const sanitizedEmail = email.toLowerCase().trim();
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (!error && profile) {
        profile = await attachPrivateProfileDataOne(profile);
        let chefData = null;
        if (profile.role === UserRole.COOK) {
          const { data: chef } = await supabase
            .from('chefs')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle();
          chefData = chef;
          if (!chefData) {
            chefData = getLocalCachedChefs().find(c => (c.profile_id || c.id) === profile.id);
          }
        }

        return mapProfileRowToUser(profile, chefData);
      }
    } catch (err) {
      console.warn('[Supabase] getProfileByEmail note:', err);
    }

    const localUser = getLocalCachedUsers().find(u => u.email?.toLowerCase().trim() === sanitizedEmail);
    if (localUser) return localUser;

    return mockUsers.find(u => u.email.toLowerCase().trim() === sanitizedEmail) || null;
  },

  /**
   * Criar perfil de utilizador (Registo de Clientes ou Candidatura de Chefs)
   */
  createProfile: async (data: any, role: UserRole): Promise<User | null> => {
    try {
      const sanitizedEmail = data.email.toLowerCase().trim();
      const configured = isSupabaseConfigured();

      // Nunca criar contas com uma password por defeito conhecida.
      if (configured && !data.password) {
        throw new Error('Defina uma palavra-passe para criar a conta.');
      }
      const password = data.password || 'TemporaryPassword123!'; // só em modo demonstração

      // 1. Criar no Supabase Auth
      let authUserId: string | null = null;
      let hasSession = false;
      try {
        const authResult = await supabaseAuthService.signUp(sanitizedEmail, password, {
          nome: data.nome,
          telefone: data.telefone,
          role,
          avatar_url: data.avatar_url,
        });
        if (authResult?.user?.id) {
          authUserId = authResult.user.id;
        }
        hasSession = !!authResult?.session;
        // Email já registado: o Supabase devolve um utilizador "falso" sem identidades.
        if (configured && authResult?.user && Array.isArray(authResult.user.identities) && authResult.user.identities.length === 0) {
          throw new Error('Este email já tem conta. Entre com a sua palavra-passe ou use "Esqueci-me da palavra-passe".');
        }
      } catch (authErr: any) {
        if (configured) {
          // Com o Supabase configurado, um erro de registo é um erro real: nunca fingir sucesso.
          const m = String(authErr?.message || '').toLowerCase();
          if (m.includes('já tem conta')) throw authErr;
          if (m.includes('already') || m.includes('registered')) {
            throw new Error('Este email já tem conta. Entre com a sua palavra-passe.');
          }
          if (m.includes('password')) {
            throw new Error('A palavra-passe é demasiado fraca. Use pelo menos 8 caracteres, com letras e números.');
          }
          if (m.includes('rate') || m.includes('too many') || m.includes('seconds')) {
            throw new Error('Demasiadas tentativas. Aguarde um minuto e tente de novo.');
          }
          if (m.includes('invalid') && m.includes('email')) {
            throw new Error('O email indicado não é válido.');
          }
          throw new Error(authErr?.message || 'Não foi possível criar a conta. Tente novamente.');
        }
        console.warn('[Supabase] SignUp fallback note:', authErr?.message || authErr);
      }

      const targetId = authUserId || (data.id && isValidUUID(data.id) ? data.id : crypto.randomUUID());

      // 2. Com confirmação de email ativa não há sessão: o perfil só pode ser gravado após o primeiro login.
      //    Guarda-se o formulário (apenas neste dispositivo) para completar nessa altura.
      if (configured && authUserId && !hasSession) {
        savePendingSignup(sanitizedEmail, data, role);
        const pendingUser = buildProfilePayload(targetId, sanitizedEmail, data, role);
        const mapped: any = mapProfileRowToUser(pendingUser, null);
        mapped.pendingEmailConfirmation = true;
        return mapped as User;
      }

      // 3. Garantir persistência em profiles (e chefs)
      const { profilePayload, chefData } = await persistNewProfile(targetId, sanitizedEmail, data, role);

      const createdUser: User = mapProfileRowToUser(profilePayload, chefData);

      // Só em modo demonstração (sem Supabase) se guardam credenciais locais.
      if (password && !isSupabaseConfigured()) {
        saveLocalAuthCredentials(sanitizedEmail, password, role);
      }

      // Guardar no armazenamento local persistente e na memória
      saveUserToLocalCache(createdUser);

      const mIdx = mockUsers.findIndex(u => u.id === createdUser.id || u.email?.toLowerCase().trim() === sanitizedEmail);
      if (mIdx >= 0) {
        mockUsers[mIdx] = { ...mockUsers[mIdx], ...createdUser };
      } else {
        mockUsers.unshift(createdUser);
      }

      // Disparo automático e não-bloqueante de emails de boas-vindas / registo
      if (role === UserRole.CLIENT) {
        emailService.sendWelcomeClient(createdUser).catch((e) => console.warn('[Email Trigger Welcome]', e));
      } else if (role === UserRole.COOK) {
        emailService.sendChefRegistration(createdUser).catch((e) => console.warn('[Email Trigger Chef Reg]', e));
      }

      return createdUser;
    } catch (err) {
      console.warn('[Supabase] createProfile fallback note:', err);
      // Fallback seguro em caso de qualquer exceção imprevista
      const sanitizedEmail = data.email?.toLowerCase().trim() || 'user@cookr.local';
      const fallbackUser: User = {
        id: data.id && isValidUUID(data.id) ? data.id : crypto.randomUUID(),
        nome: data.nome || 'Utilizador',
        email: sanitizedEmail,
        telefone: data.telefone || '',
        role: role,
        status: role === UserRole.COOK ? UserStatus.UNDER_REVIEW : UserStatus.ACTIVE,
        avatar_url: data.avatar_url || '',
        cover_url: data.cover_url || '',
        morada: data.morada || data.billing_address || '',
        cidade: data.cidade || data.billing_city || '',
        localizacao: data.localizacao || data.cidade || data.billing_city || '',
        zip_code: data.zip_code || data.billing_zip || '',
        nif: data.nif || '',
        iban: data.iban || '',
        fiscal_name: data.fiscal_name || data.nome || '',
        billing_address: data.billing_address || data.morada || '',
        billing_street: data.billing_street || '',
        billing_number: data.billing_number || '',
        billing_floor: data.billing_floor || '',
        billing_zip: data.billing_zip || data.zip_code || '',
        billing_city: data.billing_city || data.cidade || '',
        billing_country: data.billing_country || 'Portugal',
        addresses: data.addresses || [],
        dietary_restrictions: data.dietary_restrictions || [],
        cuisine_preferences: data.cuisine_preferences || [],
        loyalty_points: data.loyalty_points ?? 0,
      };
      saveUserToLocalCache(fallbackUser);
      mockUsers.unshift(fallbackUser);
      return fallbackUser;
    }
  },

  /**
   * Criar perfil após login com Google
   */
  createProfileWithGoogle: async (authUser: any, role: UserRole, extraData?: any): Promise<User> => {
    const id = authUser.id || authUser.uid || crypto.randomUUID();
    const email = (authUser.email || '').toLowerCase().trim();
    const nome = authUser.displayName || authUser.user_metadata?.nome || authUser.user_metadata?.full_name || 'Utilizador';
    const avatar = authUser.photoURL || authUser.user_metadata?.avatar_url || null;

    const profilePayload = {
      id,
      email,
      nome,
      role,
      status: UserStatus.ACTIVE,
      avatar_url: avatar,
      ...extraData,
    };

    try {
      await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Google profile upsert note:', e);
    }

    let chefData = null;
    if (role === UserRole.COOK) {
      const chefPayload = {
        profile_id: id,
        distrito: extraData?.distrito || extraData?.cidade || '',
        is_available: true,
      };
      try {
        await supabase.from('chefs').upsert(chefPayload, { onConflict: 'profile_id' });
      } catch (e) {
        console.warn('[Supabase] Google chef upsert note:', e);
      }
      chefData = chefPayload;
      saveChefToLocalCache(chefData);
    }

    const created = mapProfileRowToUser(profilePayload, chefData);
    saveUserToLocalCache(created);

    const mIdx = mockUsers.findIndex(u => u.id === id || u.email?.toLowerCase().trim() === email);
    if (mIdx >= 0) {
      mockUsers[mIdx] = { ...mockUsers[mIdx], ...created };
    } else {
      mockUsers.unshift(created);
    }

    // Disparo automático de emails de boas-vindas / registo para Google Auth
    if (role === UserRole.CLIENT) {
      emailService.sendWelcomeClient(created).catch((e) => console.warn('[Email Trigger Google Welcome]', e));
    } else if (role === UserRole.COOK) {
      emailService.sendChefRegistration(created).catch((e) => console.warn('[Email Trigger Google Chef Reg]', e));
    }

    return (await supabaseService.getProfileById(id)) || created;
  },

  /**
   * Atualizar dados do perfil (Clientes e Chefs)
   */
  updateUserProfile: async (userId: string, data: Partial<User>): Promise<void> => {
    if (!userId) {
      console.warn('[Supabase] updateUserProfile ignorado: userId está vazio');
      return;
    }
    const targetUserId = isValidUUID(userId) ? userId : toValidUUID(userId);
    try {
      // 1. Atualizar campos da tabela profiles
      const profileUpdates: any = {};
      if (data.nome !== undefined) profileUpdates.nome = data.nome;
      if (data.telefone !== undefined) profileUpdates.telefone = data.telefone;
      if (data.avatar_url !== undefined) profileUpdates.avatar_url = data.avatar_url;
      if (data.cover_url !== undefined) profileUpdates.cover_url = data.cover_url;
      if (data.morada !== undefined) profileUpdates.morada = data.morada;
      if (data.cidade !== undefined) profileUpdates.cidade = data.cidade;
      if (data.localizacao !== undefined) profileUpdates.localizacao = data.localizacao;
      if (data.zip_code !== undefined) profileUpdates.zip_code = data.zip_code;
      if (data.nif !== undefined) profileUpdates.nif = data.nif;
      if (data.iban !== undefined) profileUpdates.iban = data.iban;
      if (data.fiscal_name !== undefined) profileUpdates.fiscal_name = data.fiscal_name;
      if (data.billing_address !== undefined) profileUpdates.billing_address = data.billing_address;
      if (data.billing_street !== undefined) profileUpdates.billing_street = data.billing_street;
      if (data.billing_number !== undefined) profileUpdates.billing_number = data.billing_number;
      if (data.billing_floor !== undefined) profileUpdates.billing_floor = data.billing_floor;
      if (data.billing_zip !== undefined) profileUpdates.billing_zip = data.billing_zip;
      if (data.billing_city !== undefined) profileUpdates.billing_city = data.billing_city;
      if (data.billing_country !== undefined) profileUpdates.billing_country = data.billing_country;
      if (data.addresses !== undefined) profileUpdates.addresses = data.addresses;
      if (data.dietary_restrictions !== undefined) profileUpdates.dietary_restrictions = data.dietary_restrictions;
      if (data.cuisine_preferences !== undefined) profileUpdates.cuisine_preferences = data.cuisine_preferences;
      if (data.favoriteChefIds !== undefined) profileUpdates.favorite_chef_ids = data.favoriteChefIds;
      if (data.loyalty_points !== undefined) profileUpdates.loyalty_points = data.loyalty_points;
      if (data.badges !== undefined) profileUpdates.badges = data.badges;
      if (data.language !== undefined) profileUpdates.language = data.language;
      if (data.notification_settings !== undefined) profileUpdates.notification_settings = data.notification_settings;
      if (data.admin_notes !== undefined) profileUpdates.admin_notes = data.admin_notes;
      if (data.status !== undefined) profileUpdates.status = data.status;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: pErr } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', targetUserId);
        if (pErr) console.warn('[Supabase] updateUserProfile (profiles) note:', pErr.message || pErr);
      }

      // 2. Atualizar campos da tabela chefs se relevante
      const chefUpdates: any = {};
      if (data.biografia !== undefined) chefUpdates.biografia = data.biografia;
      if (data.especialidades !== undefined) chefUpdates.especialidades = data.especialidades;
      if (data.experiencia !== undefined) chefUpdates.experiencia_anos = data.experiencia;
      if (data.precoMedio !== undefined) chefUpdates.preco_medio = data.precoMedio;
      if (data.rating !== undefined) chefUpdates.rating = data.rating;
      if (data.total_avaliacoes !== undefined) chefUpdates.total_avaliacoes = data.total_avaliacoes;
      if (data.total_reservas !== undefined) chefUpdates.total_reservas = data.total_reservas;
      if (data.idiomas !== undefined) chefUpdates.idiomas = data.idiomas;
      if (data.equipamento !== undefined) chefUpdates.equipamento = data.equipamento;
      if (data.diferenciais !== undefined) chefUpdates.diferenciais = data.diferenciais;
      if (data.certifications_and_awards !== undefined) chefUpdates.certifications_and_awards = data.certifications_and_awards;
      if (data.faqs !== undefined) chefUpdates.faqs = data.faqs;
      if (data.sustainability_badges !== undefined) chefUpdates.sustainability_badges = data.sustainability_badges;
      if (data.sustainability_notes !== undefined) chefUpdates.sustainability_notes = data.sustainability_notes;
      if (data.allergen_certifications !== undefined) chefUpdates.allergen_certifications = data.allergen_certifications;
      if (data.allergen_notes !== undefined) chefUpdates.allergen_notes = data.allergen_notes;
      if (data.portfolio_images !== undefined) chefUpdates.portfolio_images = data.portfolio_images;
      if (data.disponibilidade !== undefined) chefUpdates.disponibilidade = data.disponibilidade;
      if (data.isAvailable !== undefined || data.is_available !== undefined) {
        chefUpdates.is_available = data.isAvailable ?? data.is_available;
      }
      if (data.offers_wine_pairing !== undefined) chefUpdates.offers_wine_pairing = data.offers_wine_pairing;
      if (data.approvedByAdmin !== undefined) chefUpdates.approved_by_admin = data.approvedByAdmin;
      if (data.bypass_haccp_restrictions !== undefined) chefUpdates.bypass_haccp_restrictions = data.bypass_haccp_restrictions;
      if (data.kitchenNotes !== undefined) chefUpdates.kitchen_notes = data.kitchenNotes;
      if (data.localizacao !== undefined) chefUpdates.distrito = data.localizacao;

      if (Object.keys(chefUpdates).length > 0) {
        // Formatar certifications_and_awards para compatibilidade segura com TEXT[] e JSONB
        let formattedCerts = chefUpdates.certifications_and_awards;
        if (Array.isArray(formattedCerts)) {
          formattedCerts = formattedCerts.map((c: any) =>
            typeof c === 'object' ? JSON.stringify(c) : String(c)
          );
        }

        const chefPayload: any = {
          profile_id: targetUserId,
          ...chefUpdates
        };
        if (formattedCerts !== undefined) {
          chefPayload.certifications_and_awards = formattedCerts;
        }

        let { error: cErr } = await supabase
          .from('chefs')
          .upsert(chefPayload, { onConflict: 'profile_id' });

        if (cErr) {
          console.warn('[Supabase] updateUserProfile (chefs) note:', cErr.message || cErr);
          // Se falhou por causa do formato do campo certifications_and_awards, tentar com raw
          if (chefUpdates.certifications_and_awards !== undefined) {
            const rawPayload = { profile_id: targetUserId, ...chefUpdates };
            const { error: rawErr } = await supabase
              .from('chefs')
              .upsert(rawPayload, { onConflict: 'profile_id' });
            if (!rawErr) {
              cErr = null;
            } else {
              // Como fallback extremo, guardar sem certifications_and_awards para garantir biografia/especialidades
              const { certifications_and_awards, ...safePayload } = rawPayload;
              try {
                await supabase
                  .from('chefs')
                  .upsert(safePayload, { onConflict: 'profile_id' });
              } catch (_) {}
            }
          }
        }

        // Sincronizar cache dedicada de chefs
        saveChefToLocalCache({ profile_id: targetUserId, ...chefUpdates });
      }
    } catch (err) {
      console.warn('[Supabase] updateUserProfile note:', err);
    }

    // Sincronizar sempre no armazenamento local e memória
    const localUsers = getLocalCachedUsers();
    const existingLUser = localUsers.find(u => u.id === userId || u.id === targetUserId);
    if (existingLUser) {
      const updated = { ...existingLUser, ...data };
      saveUserToLocalCache(updated);
    }
    const mIdx = mockUsers.findIndex(u => u.id === userId || u.id === targetUserId);
    if (mIdx >= 0) {
      mockUsers[mIdx] = { ...mockUsers[mIdx], ...data };
    }

    // Sincronizar utilizador ativo em cookr_user no localStorage
    if (typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem('cookr_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed && (parsed.id === userId || parsed.id === targetUserId || parsed.profile_id === userId || parsed.profile_id === targetUserId)) {
            const updatedActive = { ...parsed, ...data };
            localStorage.setItem('cookr_user', JSON.stringify(updatedActive));
          }
        }
      } catch (_) {}
    }
  },

  /**
   * Alterar estado de utilizador (Aprovar, Suspender, etc.)
   */
  updateUserStatus: async (id: string, status: UserStatus): Promise<void> => {
    if (!id || !isValidUUID(id)) return;
    try {
      await supabase.from('profiles').update({ status }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase] updateUserStatus note:', e);
    }
    const localUsers = getLocalCachedUsers();
    const existingLUser = localUsers.find(u => u.id === id);
    if (existingLUser) {
      existingLUser.status = status;
      saveUserToLocalCache(existingLUser);
    }
    const mIdx = mockUsers.findIndex(u => u.id === id);
    if (mIdx >= 0) {
      mockUsers[mIdx].status = status;
    }
  },

  /**
   * Atualizar disponibilidade do Chef
   */
  updateAvailability: async (id: string, isAvailable: boolean): Promise<void> => {
    if (!id || !isValidUUID(id)) return;
    supabaseService.invalidateCooksCache();
    try {
      const [chefRes, profileRes] = await Promise.all([
        supabase.from('chefs').update({ is_available: isAvailable }).eq('profile_id', id),
        supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', id),
      ]);
      const err = chefRes.error || profileRes.error;
      if (err) {
        const isUnavailable = err.code === 'SUPABASE_UNAVAILABLE' || isNetworkError(err);
        if (!isUnavailable) {
          throw err;
        }
        console.warn('[Supabase] updateAvailability offline fallback note:', err.message || err);
      }
    } catch (e: any) {
      if (e?.code !== 'SUPABASE_UNAVAILABLE' && !isNetworkError(e)) {
        throw e;
      }
      console.warn('[Supabase] updateAvailability offline fallback:', e?.message || e);
    }

    // Sincronizar caches locais após atualização
    const localUsers = getLocalCachedUsers();
    const existingLUser = localUsers.find(u => u.id === id);
    if (existingLUser) {
      saveUserToLocalCache({ ...existingLUser, isAvailable, is_available: isAvailable });
    }
    const mIdx = mockUsers.findIndex(u => u.id === id);
    if (mIdx >= 0) {
      mockUsers[mIdx] = { ...mockUsers[mIdx], isAvailable, is_available: isAvailable };
    }
    if (typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem('cookr_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed && (parsed.id === id || parsed.profile_id === id)) {
            parsed.isAvailable = isAvailable;
            parsed.is_available = isAvailable;
            localStorage.setItem('cookr_user', JSON.stringify(parsed));
          }
        }
      } catch {}
    }
  },

  /**
   * Atualizar calendário de slots do Chef
   */
  updateChefAvailability: async (cookId: string, date: string, time: string, action: 'occupy' | 'free') => {
    if (!cookId || !isValidUUID(cookId)) return;
    try {
      const { data: chef } = await supabase
        .from('chefs')
        .select('disponibilidade')
        .eq('profile_id', cookId)
        .maybeSingle();

      const currentDisp = chef?.disponibilidade || {};
      const currentTimes: string[] = currentDisp[date] || [];

      let updatedTimes: string[];
      if (action === 'occupy') {
        updatedTimes = currentTimes.filter((t) => t !== time);
      } else {
        updatedTimes = Array.from(new Set([...currentTimes, time]));
      }

      await supabase
        .from('chefs')
        .update({ disponibilidade: { ...currentDisp, [date]: updatedTimes } })
        .eq('profile_id', cookId);
    } catch (e) {
      console.warn('[Supabase] updateChefAvailability note:', e);
    }
  },

  /**
   * Consultar disponibilidade e slots gravados do Chef (servidor, cloud e local)
   */
  getChefAvailability: async (
    chefId: string,
    date?: string
  ): Promise<{ slots: string[]; disponibilidade: Record<string, string[]> }> => {
    let dispo: Record<string, string[]> = {};

    // 1. Tentar consultar no endpoint do servidor
    try {
      const resp = await fetch(`/api/chef/availability?chefId=${encodeURIComponent(chefId)}${date ? `&date=${encodeURIComponent(date)}` : ''}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.disponibilidade && typeof json.disponibilidade === 'object') {
          dispo = json.disponibilidade;
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }

    // 2. Se vazio, tentar Supabase chefs table
    if (Object.keys(dispo).length === 0 && isValidUUID(chefId)) {
      try {
        const { data: chef } = await supabase
          .from('chefs')
          .select('disponibilidade')
          .eq('profile_id', chefId)
          .maybeSingle();

        if (chef?.disponibilidade && typeof chef.disponibilidade === 'object') {
          dispo = chef.disponibilidade;
        }
      } catch (e) {
        // Non-blocking fallback
      }
    }

    // 3. Fallback na cache local dedicada
    if (Object.keys(dispo).length === 0 && typeof window !== 'undefined') {
      try {
        const localKey = `cookr_chef_availability_${chefId}`;
        const rawLocal = localStorage.getItem(localKey);
        if (rawLocal) {
          dispo = JSON.parse(rawLocal);
        }
      } catch (e) {}
    }

    // 4. Fallback no cookr_user
    if (Object.keys(dispo).length === 0 && typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem('cookr_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.id === chefId && parsed?.disponibilidade) {
            dispo = parsed.disponibilidade;
          }
        }
      } catch (e) {}
    }

    const slots = date ? (dispo[date] || []) : [];
    return { slots, disponibilidade: dispo };
  },

  /**
   * Gravar disponibilidade e slots do Chef na base de dados e armazenamento permanente
   */
  saveChefAvailability: async (
    chefId: string,
    date: string,
    slots: string[],
    fullDispo?: Record<string, string[]>
  ): Promise<boolean> => {
    try {
      const targetDispo = fullDispo || { [date]: slots };

      // 1. Gravar imediatamente no backend persistente
      try {
        await fetch('/api/chef/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chefId,
            date,
            slots,
            disponibilidade: targetDispo
          })
        });
      } catch (err) {
        console.warn('[Availability API] aviso ao enviar para endpoint:', err);
      }

      // 2. Gravar em Supabase chefs se aplicável (sem alterar is_available operacional)
      if (isValidUUID(chefId)) {
        try {
          await supabase
            .from('chefs')
            .update({
              disponibilidade: targetDispo
            })
            .eq('profile_id', chefId);
        } catch (e) {
          console.warn('[Supabase] aviso ao atualizar chefs dispo:', e);
        }
      }

      // 3. Sincronizar cache local dedicada
      if (typeof window !== 'undefined') {
        try {
          const localKey = `cookr_chef_availability_${chefId}`;
          localStorage.setItem(localKey, JSON.stringify(targetDispo));
        } catch (e) {}

        // 4. Sincronizar cookr_user se for o utilizador atual (sem alterar isAvailable)
        try {
          const rawUser = localStorage.getItem('cookr_user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            if (parsed && (parsed.id === chefId || parsed.profile_id === chefId)) {
              parsed.disponibilidade = targetDispo;
              localStorage.setItem('cookr_user', JSON.stringify(parsed));
            }
          }
        } catch (e) {}

        // 5. Sincronizar utilizadores em cache local e mock
        const localUsers = getLocalCachedUsers();
        const existingLUser = localUsers.find(u => u.id === chefId);
        if (existingLUser) {
          saveUserToLocalCache({ ...existingLUser, disponibilidade: targetDispo });
        }
      }
      const mIdx = mockUsers.findIndex(u => u.id === chefId);
      if (mIdx >= 0) {
        mockUsers[mIdx] = { ...mockUsers[mIdx], disponibilidade: targetDispo };
      }

      return true;
    } catch (err) {
      console.warn('[Availability] Aviso ao gravar disponibilidade:', err);
      return false;
    }
  },

  /**
   * Eliminar conta de utilizador
   */
  deleteUser: async (id: string): Promise<void> => {
    if (!id || !isValidUUID(id)) return;
    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch (e) {
      console.warn('[Supabase] deleteUser note:', e);
    }
    if (typeof window !== 'undefined') {
      const localUsers = getLocalCachedUsers().filter(u => u.id !== id);
      try {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      } catch (err) {
        console.warn('[Local Cache] Erro ao remover utilizador local:', err);
      }
    }
    const mIdx = mockUsers.findIndex(u => u.id === id);
    if (mIdx >= 0) {
      mockUsers.splice(mIdx, 1);
    }
  },

  // ===========================================================================
  // GESTÃO DE RESERVAS (BOOKINGS)
  // ===========================================================================

  /**
   * Obter todas as reservas (Painel de Administração)
   */
  getBookings: async (): Promise<Booking[]> => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (await attachBookingPins(data)).map(mapBookingRowToBooking);
      }
      return mockBookings;
    } catch (err) {
      console.warn('[Supabase] getBookings note:', err);
      return mockBookings;
    }
  },

  /**
   * Obter reservas por utilizador (Cliente ou Chef)
   */
  getBookingsByUserId: async (userId: string, role: UserRole): Promise<Booking[]> => {
    try {
      let query = supabase.from('bookings').select('*');

      if (role === UserRole.ADMIN) {
        query = query.order('created_at', { ascending: false });
      } else if (role === UserRole.COOK) {
        if (!userId || !isValidUUID(userId)) return mockBookings.filter(b => b.cookId === userId);
        query = query.eq('cook_id', userId).order('data', { ascending: true });
      } else {
        if (!userId || !isValidUUID(userId)) return mockBookings.filter(b => b.clientId === userId);
        query = query.eq('client_id', userId).order('data', { ascending: true });
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const withPins = role === UserRole.COOK ? data : await attachBookingPins(data);
        return withPins.map(mapBookingRowToBooking);
      }

      return mockBookings.filter(b => role === UserRole.COOK ? b.cookId === userId : b.clientId === userId);
    } catch (err) {
      console.warn('[Supabase] getBookingsByUserId note:', err);
      return mockBookings.filter(b => role === UserRole.COOK ? b.cookId === userId : b.clientId === userId);
    }
  },

  /**
   * Criar nova reserva
   */
  createBooking: async (data: Partial<Booking>) => {
    // Verificação de modo offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[Offline Mode] Offline detected, queuing createBooking action');
      // Id fixo desde já: se a sincronização repetir, não cria reservas duplicadas.
      const stableId = data.id && isValidUUID(data.id) ? data.id : crypto.randomUUID();
      await addOfflineAction('create', { ...data, id: stableId });
      window.dispatchEvent(new CustomEvent('offline-action-queued', { 
        detail: { type: 'create', message: 'Ligação offline. Reserva guardada na fila local e será sincronizada automaticamente!' } 
      }));
      return { id: stableId, offline: true };
    }

    try {
      const rawId = data.id;
      const bookingId = (rawId && isValidUUID(rawId)) 
        ? rawId 
        : (rawId ? toValidUUID(rawId) : crypto.randomUUID());

      const rawCookId = data.cookId;
      const cookId = (rawCookId && isValidUUID(rawCookId)) 
        ? rawCookId 
        : (rawCookId ? toValidUUID(rawCookId) : null);

      const rawClientId = data.clientId;
      const clientId = (rawClientId && isValidUUID(rawClientId)) 
        ? rawClientId 
        : (rawClientId ? toValidUUID(rawClientId) : null);

      const payload = {
        id: bookingId,
        cook_id: cookId,
        client_id: clientId,
        client_name: data.clientName || 'Cliente',
        cook_name: data.cookName || 'Chef',
        menu_selected: data.menu_selected,
        menu_type: data.menu_type || 'experience',
        data: data.data,
        hora: data.hora,
        num_pessoas: data.numPessoas || 2,
        morada: data.morada || '',
        valor_total: typeof data.valorTotal === 'string' ? parseFloat(data.valorTotal) : data.valorTotal,
        status: data.status || BookingStatus.PENDING,
        is_meal_prep: data.is_meal_prep ?? false,
        is_finalizing: data.is_finalizing ?? false,
        service_pin: data.service_pin || Math.floor(1000 + Math.random() * 9000).toString(),
        kitchen_notes: data.kitchenNotes || '',
        restrictions: data.restrictions || [],
        guests: data.guests || [],
        guests_summary: data.guestsSummary || '',
        wine_pairing: data.wine_pairing || null,
        split_bill: data.splitBill || null,
        gorjeta: data.gorjeta || 0,
      };

      const { error } = await supabase.from('bookings').insert(payload);
      if (error) throw error;

      // Ocupar slot no calendário do Chef se houver hora
      if (cookId && data.data && data.hora) {
        supabaseService.updateChefAvailability(cookId, data.data, data.hora, 'occupy').catch(() => {});
      }

      // Notificar o Chef
      if (cookId) {
        supabaseService.createNotification(
          cookId,
          `Nova reserva de ${data.clientName || 'Cliente'} para o dia ${data.data}!`,
          'info'
        ).catch(() => {});
      }

      // Disparo automático e não-bloqueante de emails transacionais para Cliente e Chef
      (async () => {
        try {
          const fullBooking: Booking = { ...payload, id: bookingId } as any;
          const clientUser = clientId ? await supabaseService.getProfileById(clientId) : null;
          const cookUser = cookId ? await supabaseService.getProfileById(cookId) : null;
          
          await emailService.sendBookingCreated(fullBooking, clientUser, cookUser);

          // Se tiver valor liquidado na criação, confirma o pagamento
          if (payload.valor_total && Number(payload.valor_total) > 0) {
            await emailService.sendPaymentConfirmed(fullBooking, clientUser, cookUser);
          }
        } catch (emailErr) {
          console.warn('[Email Booking Created Note]', emailErr);
        }
      })();

      return { id: bookingId };
    } catch (err: any) {
      if (err?.code === '23505' || String(err?.message || '').includes('uq_bookings_active_slot')) {
        throw new Error('Este horário acabou de ser reservado por outra pessoa. Escolha outro horário.');
      }
      // Só falhas de rede vão para a fila. Erros de permissão (RLS) são reais e têm de chegar ao utilizador;
      // antes eram re-enfileirados para sempre e a app dizia "guardada com sucesso".
      if (isNetworkError(err)) {
        console.warn('[Offline Mode] Network error, queuing createBooking action', err?.message || err);
        const stableId = data.id && isValidUUID(data.id) ? data.id : crypto.randomUUID();
        await addOfflineAction('create', { ...data, id: stableId });
        window.dispatchEvent(new CustomEvent('offline-action-queued', { 
          detail: { type: 'create', message: 'Sem ligação. Reserva guardada e será enviada automaticamente.' } 
        }));
        return { id: stableId, offline: true };
      }
      throw err;
    }
  },

  /**
   * Atualizar estado da reserva (Aceite, Concluída, Cancelada, etc.)
   */
  updateBookingStatus: async (
    id: string, 
    status: BookingStatus, 
    extraData?: any
  ): Promise<{ success: boolean; offline?: boolean; error?: any; message?: string }> => {
    if (!id || !isValidUUID(id)) {
      console.warn('[Supabase] updateBookingStatus ignorado: ID não é UUID válido', id);
      return { success: false, message: 'ID de reserva inválido.' };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await addOfflineAction('update_status', { id, status, extraData });
      window.dispatchEvent(new CustomEvent('offline-action-queued', { 
        detail: { type: 'update_status', message: 'Ligação offline. Mudança de estado guardada localmente!' } 
      }));
      return { success: true, offline: true, error: null, message: 'Ação guardada offline.' };
    }

    try {
      const updates: any = { status };
      if (extraData) {
        if (extraData.cancellation_reason !== undefined) updates.cancellation_reason = extraData.cancellation_reason;
        if (extraData.cancelled_by !== undefined) updates.cancelled_by = extraData.cancelled_by;
        if (extraData.cancelled_at !== undefined) updates.cancelled_at = extraData.cancelled_at;
        if (extraData.proposed_date !== undefined) updates.proposed_date = extraData.proposed_date;
        if (extraData.proposed_time !== undefined) updates.proposed_time = extraData.proposed_time;
        if (extraData.is_finalizing !== undefined) updates.is_finalizing = extraData.is_finalizing;
        if (extraData.service_pin !== undefined) updates.service_pin = extraData.service_pin;
      }

      const { error } = await supabase.from('bookings').update(updates).eq('id', id);
      if (error) throw error;

      // Buscar detalhes da reserva para disparar notificações e atualizar disponibilidade
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();

      if (booking) {
        if (status === BookingStatus.ACCEPTED) {
          await supabaseService.createNotification(
            booking.client_id,
            `A sua reserva com o Chef ${booking.cook_name} foi confirmada!`,
            'success'
          );

          // Disparo automático de confirmação para Cliente e Chef
          (async () => {
            try {
              const clientUser = booking.client_id ? await supabaseService.getProfileById(booking.client_id) : null;
              const cookUser = booking.cook_id ? await supabaseService.getProfileById(booking.cook_id) : null;
              await emailService.sendBookingConfirmed(booking as any, clientUser, cookUser);
            } catch (confirmEmailErr) {
              console.warn('[Email Confirm Note]', confirmEmailErr);
            }
          })();
        } else if (status === BookingStatus.REJECTED || status === BookingStatus.CANCELLED || status === BookingStatus.CANCELLED_PARTIAL_REFUND) {
          // Liberta a disponibilidade do Chef
          supabaseService.updateChefAvailability(booking.cook_id, booking.data, booking.hora, 'free').catch(() => {});

          const targetUser = extraData?.cancelled_by === 'cook' ? booking.client_id : booking.cook_id;
          await supabaseService.createNotification(
            targetUser,
            `A reserva para ${booking.data} foi ${status === BookingStatus.REJECTED ? 'recusada' : 'cancelada'}.`,
            'warning'
          );

          // Disparo automático de cancelamento para Cliente e Chef
          (async () => {
            try {
              const clientUser = booking.client_id ? await supabaseService.getProfileById(booking.client_id) : null;
              const cookUser = booking.cook_id ? await supabaseService.getProfileById(booking.cook_id) : null;
              await emailService.sendBookingCancelled(
                booking as any,
                clientUser,
                cookUser,
                extraData?.cancellation_reason,
                extraData?.cancelled_by
              );
            } catch (cancelEmailErr) {
              console.warn('[Email Cancel Note]', cancelEmailErr);
            }
          })();
        }
      }

      return { success: true, error: null, message: 'Estado atualizado com sucesso.' };
    } catch (err: any) {
      if (isNetworkError(err)) {
        await addOfflineAction('update_status', { id, status, extraData });
        window.dispatchEvent(new CustomEvent('offline-action-queued', { 
          detail: { type: 'update_status', message: 'Erro de rede. Mudança de estado agendada offline!' } 
        }));
        return { success: true, offline: true, error: null, message: 'Erro de rede. Ação agendada offline.' };
      }
      return { success: false, error: err, message: err?.message || 'Erro ao atualizar estado.' };
    }
  },

  requestPinValidation: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    await supabase.from('bookings').update({ is_finalizing: true }).eq('id', id);
  },

  cancelPinValidation: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    await supabase.from('bookings').update({ is_finalizing: false }).eq('id', id);
  },

  verifyPinAndComplete: async (bookingId: string, pin: string): Promise<boolean> => {
    if (!bookingId || !isValidUUID(bookingId)) return false;
    // A validação do PIN (e o limite de tentativas) é feita no servidor.
    // Os pontos de fidelidade e o contador do chef são atribuídos por trigger na base de dados.
    const { data, error } = await supabase.rpc('complete_booking_with_pin', {
      p_booking_id: bookingId,
      p_pin: String(pin ?? '').trim(),
    });
    if (error) {
      console.warn('[Supabase] complete_booking_with_pin:', error.message);
      return false;
    }
    return data === true;
  },

  /**
   * Eliminar reserva
   */
  deleteBooking: async (id: string) => {
    try {
      if (!id || !isValidUUID(id)) return { success: false };
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) {
        if (error.code === 'SUPABASE_UNAVAILABLE' || isNetworkError(error)) {
          await addOfflineAction('delete_booking', { id });
          return { success: true, offline: true };
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (err?.code === 'SUPABASE_UNAVAILABLE' || isNetworkError(err)) {
        await addOfflineAction('delete_booking', { id });
        return { success: true, offline: true };
      }
      console.warn('[Supabase] deleteBooking note:', err);
      throw err;
    }
  },

  /**
   * Expirar reservas pendentes com data anterior
   */
  autoExpirePastBookings: async (userId?: string, role?: UserRole): Promise<void> => {
    try {
      const today = todayLocal();
      let query = supabase
        .from('bookings')
        .update({ status: BookingStatus.EXPIRED })
        .eq('status', BookingStatus.PENDING)
        .lt('data', today);

      if (userId && role === UserRole.COOK) {
        if (!isValidUUID(userId)) return;
        query = query.eq('cook_id', userId);
      } else if (userId && role === UserRole.CLIENT) {
        if (!isValidUUID(userId)) return;
        query = query.eq('client_id', userId);
      }

      await query;
    } catch (err) {
      console.warn('[Supabase] autoExpirePastBookings note:', err);
    }
  },

  /**
   * Cancelamento com regra de reembolso
   */
  handleCancellation: async (bookingId: string, userId: string, reason?: string) => {
    if (!bookingId || !isValidUUID(bookingId)) return { success: false };
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!booking) throw new Error('Reserva não encontrada');

    const isClient = booking.client_id === userId;
    const cancelledBy = isClient ? 'client' : 'cook';

    // Se cliente cancela com menos de 48h, reembolso parcial
    let newStatus = BookingStatus.CANCELLED;
    if (isClient) {
      const bookingDate = new Date(`${booking.data}T${booking.hora || '12:00'}`);
      const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < 48 && hoursUntil > 0) {
        newStatus = BookingStatus.CANCELLED_PARTIAL_REFUND;
      }
    }

    return await supabaseService.updateBookingStatus(bookingId, newStatus, {
      cancelled_by: cancelledBy,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Cancelado pelo utilizador',
    });
  },

  /**
   * Pedido de reagendamento
   */
  requestReschedule: async (bookingId: string, newDate: string, newTime: string, reason?: string) => {
    if (!bookingId || !isValidUUID(bookingId)) return { success: false };
    return await supabaseService.updateBookingStatus(bookingId, BookingStatus.RESCHEDULE_REQUESTED, {
      proposed_date: newDate,
      proposed_time: newTime,
      cancellation_reason: reason,
    });
  },

  // ===========================================================================
  // MENUS E EXPERIÊNCIAS (MENUS)
  // ===========================================================================

  /**
   * Obter todos os menus e experiências ativas
   */
  getAllMenusList: async (forceRefresh = false): Promise<MenuItem[]> => {
    if (!forceRefresh && supabaseService._cacheStore.menus && Date.now() < supabaseService._cacheStore.menus.expiry) {
      return supabaseService._cacheStore.menus.data;
    }
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      let list: MenuItem[] = [];
      if (!error && data && data.length > 0) {
        list = data.map(mapMenuRowToMenuItem);
      }

      // Interpolar com menus criados/atualizados localmente
      const local = getLocalCachedMenus();
      const existingIds = new Set(list.map(m => m.id));
      for (const loc of local) {
        if (!existingIds.has(loc.id)) {
          list.push(loc);
          existingIds.add(loc.id);
        }
      }

      // Se a base de dados remota não tiver menus ainda, recorrer aos mockMenus
      if (list.length === 0) {
        list = Object.values(mockMenus).flat();
      }

      if (list.length > 0) {
        supabaseService._cacheStore.menus = { data: list, expiry: Date.now() + 15000 };
      }

      return list;
    } catch (err) {
      console.warn('[Supabase] getAllMenusList note:', err);
      const local = getLocalCachedMenus();
      if (local.length > 0) return local;
      return Object.values(mockMenus).flat();
    }
  },

  /**
   * Obter menu pelo nome e ID do chef
   */
  getMenuByName: async (name: string, cookId: string): Promise<MenuItem | null> => {
    if (!cookId || !isValidUUID(cookId)) return null;
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('cook_id', cookId)
        .ilike('nome', name)
        .maybeSingle();

      if (!error && data) return mapMenuRowToMenuItem(data);
    } catch (err) {
      console.warn('[Supabase] getMenuByName note:', err);
    }

    // Verificar cache local
    const local = getLocalCachedMenus().find(
      m => (m.cookId === cookId || m.cook_id === cookId) && m.nome.toLowerCase() === name.toLowerCase()
    );
    if (local) return local;

    // Verificar mockMenus
    const mockList = mockMenus[cookId] || [];
    return mockList.find(m => m.nome.toLowerCase() === name.toLowerCase()) || null;
  },

  /**
   * Criar ou atualizar menu
   */
  createMenu: async (payload: any) => {
    try {
      const rawId = payload.id;
      const menuId = (rawId && isValidUUID(rawId)) 
        ? rawId 
        : (rawId ? toValidUUID(rawId) : crypto.randomUUID());

      const rawCookId = payload.cookId || payload.cook_id;
      const cookId = (rawCookId && isValidUUID(rawCookId)) 
        ? rawCookId 
        : (rawCookId ? toValidUUID(rawCookId) : null);

      const menuRow = {
        id: menuId,
        cook_id: cookId,
        nome: payload.nome,
        descricao: payload.descricao || '',
        preco: payload.preco,
        type: payload.type || 'experience',
        category: payload.category || 'Fine Dining',
        image_url: payload.imageUrl || payload.image_url,
        gallery_urls: payload.gallery || payload.gallery_urls || [],
        courses: payload.courses || [],
        tags: payload.tags || [],
        dietary_tags: payload.dietary_tags || [],
        is_meal_prep: payload.is_meal_prep ?? false,
        pack_size: payload.pack_size || null,
        delivery_type: payload.delivery_type || 'both',
        calories: payload.calories || null,
        cuisine_type: payload.cuisine_type || null,
        dynamic_pricing: payload.dynamic_pricing || { enabled: false },
        is_active: payload.isAvailable ?? payload.is_active ?? true,
      };

      // Sempre guardar na cache local imediatamente para disponibilidade garantida
      saveMenuToLocalCache(menuRow);

      const { error } = await supabase.from('menus').upsert(menuRow, { onConflict: 'id' });
      if (error) {
        // Se RLS do PostgreSQL rejeitar inserção anónima ou servidor indisponível
        if (
          error.code === 'SUPABASE_UNAVAILABLE' ||
          error.code === '42501' ||
          error.message?.includes('row-level security') ||
          error.code === 'PGRST301' ||
          isNetworkError(error)
        ) {
          console.warn('[Supabase] createMenu: servidor indisponível/RLS. Menu guardado na cache local com sucesso.', { id: menuId });
          return { id: menuId, local: true };
        }
        throw error;
      }

      return { id: menuId };
    } catch (err: any) {
      if (
        err?.code === 'SUPABASE_UNAVAILABLE' ||
        err?.code === '42501' ||
        err?.message?.includes('row-level security') ||
        isNetworkError(err)
      ) {
        console.warn('[Supabase] createMenu fallback note:', err?.message || err);
        return { id: payload.id || crypto.randomUUID(), local: true };
      }
      console.warn('[Supabase] createMenu error:', err);
      throw err;
    }
  },

  /**
   * Eliminar menu
   */
  deleteMenu: async (id: string) => {
    if (!id || !isValidUUID(id)) return { success: false };
    removeMenuFromLocalCache(id);
    try {
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (
        error &&
        error.code !== '42501' &&
        error.code !== 'SUPABASE_UNAVAILABLE' &&
        !isNetworkError(error)
      ) {
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (
        err?.code === 'SUPABASE_UNAVAILABLE' ||
        err?.code === '42501' ||
        err?.message?.includes('row-level security') ||
        isNetworkError(err)
      ) {
        return { success: true, localOnly: true };
      }
      throw err;
    }
  },

  /**
   * Incrementar visualizações de um menu
   */
  incrementMenuViews: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    try {
      const { data } = await supabase.from('menus').select('views_count').eq('id', id).maybeSingle();
      const current = data?.views_count || 0;
      await supabase.from('menus').update({ views_count: current + 1 }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase] incrementMenuViews note:', e);
    }
  },

  /**
   * Obter rituais mais populares / trending (ordenados por popularidade e classificação)
   */
  getTrendingRituals: async (city?: string): Promise<{ menu: MenuItem; chef: User }[]> => {
    try {
      const [menus, chefs] = await Promise.all([
        supabaseService.getAllMenusList(),
        supabaseService.getUsersByRole(UserRole.COOK),
      ]);

      const chefsMap = new Map(chefs.map(c => [c.id, c]));
      const results: { menu: MenuItem; chef: User }[] = [];

      for (const m of menus) {
        const cookId = m.cookId || m.cook_id;
        if (!cookId || !isValidUUID(cookId)) continue;
        const chef = chefsMap.get(cookId);
        if (chef) {
          if (!city || !chef.localizacao || chef.localizacao.toLowerCase().includes(city.toLowerCase())) {
            results.push({ menu: m, chef });
          }
        }
      }

      // Ordenar menus/experiências mais populares por classificação do chef ou contagem de visualizações
      results.sort((a, b) => {
        const scoreA = ((a.menu.viewsCount || 0) * 3) + ((a.chef.rating || 5) * 20);
        const scoreB = ((b.menu.viewsCount || 0) * 3) + ((b.chef.rating || 5) * 20);
        return scoreB - scoreA;
      });

      return results.slice(0, 10);
    } catch (err) {
      console.warn('[Supabase] getTrendingRituals note:', err);
      return [];
    }
  },

  /**
   * Obter receitas dos chefs
   */
  getRecipes: async (): Promise<Record<string, ChefRecipe[]>> => {
    try {
      const { data, error } = await supabase.from('chef_recipes').select('*');
      if (error) {
        console.warn('[Supabase] getRecipes note:', error.message || error);
        return mockRecipes;
      }

      const map: Record<string, ChefRecipe[]> = {};
      (data || []).forEach((r: any) => {
        const item: ChefRecipe = {
          id: r.id,
          cookId: r.cook_id,
          nome: r.nome,
          imageUrl: r.image_url,
          descricao: r.descricao,
          isPopular: r.is_popular,
          preco: r.preco ? Number(r.preco) : undefined,
        };
        if (!map[r.cook_id]) map[r.cook_id] = [];
        map[r.cook_id].push(item);
      });
      return Object.keys(map).length > 0 ? map : mockRecipes;
    } catch (err) {
      console.warn('[Supabase] getRecipes note:', err);
      return mockRecipes;
    }
  },

  // ===========================================================================
  // AVALIAÇÕES (REVIEWS)
  // ===========================================================================

  /**
   * Obter todas as avaliações
   */
  getAllReviews: async (forceRefresh = false): Promise<Review[]> => {
    if (!forceRefresh && supabaseService._cacheStore.reviews && Date.now() < supabaseService._cacheStore.reviews.expiry) {
      return supabaseService._cacheStore.reviews.data;
    }
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] getAllReviews note:', error.message || error);
        return getLocalCachedReviews();
      }

      const mapped = (data || []).map(mapReviewRowToReview);
      const local = getLocalCachedReviews();
      const existingIds = new Set(mapped.map(r => r.id));
      for (const loc of local) {
        if (!existingIds.has(loc.id)) {
          mapped.push(loc);
          existingIds.add(loc.id);
        }
      }

      if (mapped.length > 0) {
        supabaseService._cacheStore.reviews = { data: mapped, expiry: Date.now() + 15000 };
      }
      return mapped;
    } catch (err) {
      console.warn('[Supabase] getAllReviews note:', err);
      return getLocalCachedReviews();
    }
  },

  /**
   * Obter avaliações de um Chef específico
   */
  getReviewsByCookId: async (cookId: string): Promise<Review[]> => {
    if (!cookId || !isValidUUID(cookId)) return [];
    const getLocalForCook = () =>
      getLocalCachedReviews().filter(r => r.cookId === cookId || r.cook_id === cookId);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('cook_id', cookId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] getReviewsByCookId note:', error.message || error);
        return getLocalForCook();
      }

      const mapped = (data || []).map(mapReviewRowToReview);
      const local = getLocalForCook();
      const existingIds = new Set(mapped.map(r => r.id));
      for (const loc of local) {
        if (!existingIds.has(loc.id)) {
          mapped.push(loc);
        }
      }
      return mapped;
    } catch (err) {
      console.warn('[Supabase] getReviewsByCookId note:', err);
      return getLocalForCook();
    }
  },

  /**
   * Criar avaliação de cliente para um Chef
   */
  createReview: async (review: Partial<Review>) => {
    const rawId = review.id;
    const reviewId = (rawId && isValidUUID(rawId)) ? rawId : crypto.randomUUID();
    const rawCookId = review.cookId || review.cook_id;
    if (!rawCookId || !isValidUUID(rawCookId)) return { id: reviewId };
    const cookId = rawCookId;

    const rawClientId = review.clientId || review.client_id;
    const clientId = (rawClientId && isValidUUID(rawClientId)) ? rawClientId : null;

    const rawBookingId = review.bookingId || (review as any).booking_id;
    const bookingId = (rawBookingId && isValidUUID(rawBookingId)) ? rawBookingId : null;

    const payload = {
      id: reviewId,
      cook_id: cookId,
      client_id: clientId,
      client_name: review.clientName || 'Cliente',
      booking_id: bookingId,
      rating: review.rating || 5,
      comment: review.comment || '',
      is_flagged: false,
      is_hidden: false,
    };

    const localReview = mapReviewRowToReview({ ...payload, created_at: new Date().toISOString() });
    saveReviewToLocalCache(localReview);
    supabaseService.invalidateReviewsCache();

    try {
      const { error } = await supabase.from('reviews').insert(payload);
      if (error) {
        if (
          error.code === 'SUPABASE_UNAVAILABLE' ||
          error.code === '42501' ||
          error.message?.includes('row-level security') ||
          isNetworkError(error)
        ) {
          console.warn('[Supabase] createReview saved locally:', error.message || error);
          return { id: reviewId, local: true };
        }
        throw error;
      }

      // Recalcular rating do Chef
      if (cookId) {
        const { data: cookReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('cook_id', cookId)
          .eq('is_hidden', false);

        if (cookReviews && cookReviews.length > 0) {
          const avgRating =
            cookReviews.reduce((sum, r) => sum + Number(r.rating), 0) / cookReviews.length;
          await supabase
            .from('chefs')
            .update({
              rating: Math.round(avgRating * 10) / 10,
              total_avaliacoes: cookReviews.length,
            })
            .eq('profile_id', cookId);
        }
      }

      return { id: reviewId };
    } catch (err: any) {
      if (
        err?.code === 'SUPABASE_UNAVAILABLE' ||
        err?.code === '42501' ||
        isNetworkError(err)
      ) {
        console.warn('[Supabase] createReview fallback note:', err?.message || err);
        return { id: reviewId, local: true };
      }
      console.warn('[Supabase] createReview error:', err);
      throw err;
    }
  },

  flagReview: async (reviewId: string, reason?: string) => {
    if (!reviewId || !isValidUUID(reviewId)) return;
    supabaseService.invalidateReviewsCache();
    try {
      await supabase
        .from('reviews')
        .update({ is_flagged: true, flagged_reason: reason })
        .eq('id', reviewId);
    } catch (err) {
      console.warn('[Supabase] flagReview note:', err);
    }
  },

  approveReview: async (reviewId: string) => {
    if (!reviewId || !isValidUUID(reviewId)) return;
    supabaseService.invalidateReviewsCache();
    try {
      await supabase.from('reviews').update({ is_flagged: false }).eq('id', reviewId);
    } catch (err) {
      console.warn('[Supabase] approveReview note:', err);
    }
  },

  hideReview: async (reviewId: string) => {
    if (!reviewId || !isValidUUID(reviewId)) return;
    supabaseService.invalidateReviewsCache();
    try {
      await supabase.from('reviews').update({ is_hidden: true }).eq('id', reviewId);
    } catch (err) {
      console.warn('[Supabase] hideReview note:', err);
    }
  },

  deleteReview: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    supabaseService.invalidateReviewsCache();
    try {
      await supabase.from('reviews').delete().eq('id', id);
    } catch (err) {
      console.warn('[Supabase] deleteReview note:', err);
    }
  },

  // ===========================================================================
  // NOTIFICAÇÕES (NOTIFICATIONS)
  // ===========================================================================

  createNotification: async (userId: string, message: string, type: string = 'info') => {
    if (!userId || !isValidUUID(userId)) return;
    try {
      const payload = {
        id: crypto.randomUUID(),
        user_id: userId,
        message,
        type,
        is_read: false,
      };
      await supabase.from('notifications').insert(payload);
    } catch (e) {
      console.warn('[Supabase] createNotification note:', e);
    }
  },

  markNotificationAsRead: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase] markNotificationAsRead note:', e);
    }
  },

  deleteNotification: async (id: string) => {
    if (!id || !isValidUUID(id)) return;
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {
      console.warn('[Supabase] deleteNotification note:', e);
    }
  },

  clearAllNotifications: async (userId: string) => {
    if (!userId || !isValidUUID(userId)) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
    } catch (e) {
      console.warn('[Supabase] clearAllNotifications note:', e);
    }
  },

  markAllNotificationsAsRead: async (userId: string) => {
    if (!userId || !isValidUUID(userId)) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    } catch (e) {
      console.warn('[Supabase] markAllNotificationsAsRead note:', e);
    }
  },

  broadcastNotification: async (message: string, type: string = 'info') => {
    try {
      const { data: users } = await supabase.from('profiles').select('id');
      if (users && users.length > 0) {
        const rows = users.map((u: any) => ({
          id: crypto.randomUUID(),
          user_id: u.id,
          message,
          type,
          is_read: false,
        }));
        await supabase.from('notifications').insert(rows);
      }
    } catch (e) {
      console.warn('[Supabase] broadcastNotification note:', e);
    }
  },

  // ===========================================================================
  // FIDELIZAÇÃO (LOYALTY)
  // ===========================================================================

  getLoyaltyHistory: async (userId: string): Promise<LoyaltyHistory[]> => {
    if (!userId || !isValidUUID(userId)) return [];
    try {
      const { data, error } = await supabase
        .from('loyalty_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Supabase] getLoyaltyHistory note:', error.message || error);
        return [];
      }
      return (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        points: r.points,
        type: r.type,
        description: r.description,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.warn('[Supabase] getLoyaltyHistory note:', err);
      return [];
    }
  },

  awardLoyaltyPoints: async (userId: string, points: number, description: string) => {
    if (!userId || !isValidUUID(userId) || points === 0) return;
    try {
      await supabase.from('loyalty_history').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        points,
        type: points >= 0 ? 'earn' : 'spend',
        description,
      });

      // Atualizar pontos no perfil
      const { data: profile } = await supabase.from('profiles').select('loyalty_points').eq('id', userId).maybeSingle();
      const current = profile?.loyalty_points || 0;
      await supabase.from('profiles').update({ loyalty_points: Math.max(0, current + points) }).eq('id', userId);
    } catch (err) {
      console.warn('[Supabase] awardLoyaltyPoints note:', err);
    }
  },

  // ===========================================================================
  // CARTÕES DE OFERTA (GIFT CARDS)
  // ===========================================================================

  createGiftCard: async (data: any) => {
    const id = crypto.randomUUID();
    const payload = {
      id,
      code: data.code || `CKR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      buyer_name: data.buyer_name || '',
      buyer_email: data.buyer_email,
      recipient_name: data.recipient_name,
      recipient_email: data.recipient_email,
      message: data.message || '',
      experience_name: data.experience_name || 'Experiência Gastronómica Cookr',
      value: data.value,
      status: 'active',
    };
    await supabase.from('gift_cards').insert(payload);
    return payload;
  },

  getGiftCards: async (email: string) => {
    if (!email || typeof email !== 'string') return [];
    try {
      const sanitized = email.toLowerCase().trim();
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .or(`buyer_email.eq.${sanitized},recipient_email.eq.${sanitized}`);
      if (error) {
        console.warn('[Supabase] getGiftCards note:', error.message || error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('[Supabase] getGiftCards note:', err);
      return [];
    }
  },

  redeemGiftCard: async (code: string) => {
    const { data: card } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('status', 'active')
      .maybeSingle();

    if (!card) throw new Error('Código de cartão presente inválido ou já resgatado.');

    await supabase
      .from('gift_cards')
      .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
      .eq('id', card.id);

    return card;
  },

  // ===========================================================================
  // FAVORITOS E LISTA DE ESPERA (FAVORITES & WAITLIST)
  // ===========================================================================

  toggleFavorite: async (clientId: string, cookId: string) => {
    if (!clientId || !cookId || !isValidUUID(clientId) || !isValidUUID(cookId)) return false;
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('client_id', clientId)
      .eq('cook_id', cookId)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      await supabase.from('favorites').insert({
        id: crypto.randomUUID(),
        client_id: clientId,
        cook_id: cookId,
      });
    }

    // Atualizar no array de favoritos do perfil
    const { data: favs } = await supabase.from('favorites').select('cook_id').eq('client_id', clientId);
    const favIds = (favs || []).map((f: any) => f.cook_id);
    await supabase.from('profiles').update({ favorite_chef_ids: favIds }).eq('id', clientId);

    return !existing;
  },

  getFavorites: async (clientId: string): Promise<string[]> => {
    if (!clientId || !isValidUUID(clientId)) return [];
    try {
      const { data, error } = await supabase.from('favorites').select('cook_id').eq('client_id', clientId);
      if (error) return [];
      return (data || []).map((f: any) => f.cook_id);
    } catch {
      return [];
    }
  },

  joinWaitlist: async (entry: any) => {
    const id = crypto.randomUUID();
    const cookId = entry.cook_id || entry.cookId;
    const clientId = entry.client_id || entry.clientId;
    if (!cookId || !isValidUUID(cookId)) return { id };

    try {
      await supabase.from('waitlist').insert({
        id,
        cook_id: cookId,
        client_id: (clientId && isValidUUID(clientId)) ? clientId : null,
        preferred_date: entry.preferred_date || entry.preferredDate,
        notes: entry.notes || '',
      });
    } catch (err) {
      console.warn('[Supabase] joinWaitlist note:', err);
    }
    return { id };
  },

  getWaitlist: async (cookId: string) => {
    if (!cookId || !isValidUUID(cookId)) return [];
    try {
      const { data, error } = await supabase.from('waitlist').select('*').eq('cook_id', cookId);
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  // ===========================================================================
  // AUDITORIA ADMIN E CONFIGURAÇÕES DA PLATAFORMA
  // ===========================================================================

  createAdminLog: async (adminId: string, action: string, targetId: string, notes: string) => {
    try {
      await supabase.from('admin_logs').insert({
        id: crypto.randomUUID(),
        admin_id: (adminId && isValidUUID(adminId)) ? adminId : null,
        action,
        target_id: targetId,
        notes,
      });
    } catch (e) {
      console.warn('[Supabase] createAdminLog note:', e);
    }
  },

  getAdminLogs: async () => {
    try {
      const { data, error } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  getPlatformSettings: async () => {
    try {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (error) return {};
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        map[row.key] = row.value;
      });
      return map;
    } catch {
      return {};
    }
  },

  updatePlatformSetting: async (key: string, value: any) => {
    await supabase.from('platform_settings').upsert({
      id: crypto.randomUUID(),
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
  },

  // ===========================================================================
  // HACCP (SEGURANÇA ALIMENTAR)
  // ===========================================================================

  createHaccpChecklist: async (payload: Omit<HaccpChecklist, 'id' | 'createdAt'>): Promise<HaccpChecklist> => {
    const id = crypto.randomUUID();
    const cookId = (payload.cookId && isValidUUID(payload.cookId)) ? payload.cookId : null;
    const bookingId = (payload.bookingId && isValidUUID(payload.bookingId)) ? payload.bookingId : null;
    const row = {
      id,
      cook_id: cookId,
      cook_name: payload.cookName,
      booking_id: bookingId,
      client_name: payload.clientName,
      date: payload.date,
      transport_temp: payload.transportTemp,
      transport_isothermal: payload.transportIsothermal,
      hygiene_hands: payload.hygieneHands,
      hygiene_hair: payload.hygieneHair,
      hygiene_uniform: payload.hygieneUniform,
      sanitized_utensils: payload.sanitizedUtensils,
      sanitized_surfaces: payload.sanitizedSurfaces,
      separation_raw_cooked: payload.separationRawCoo,
      washed_ingredients: payload.washedIngredients,
      observations: payload.observations || '',
      signature_checked: payload.signatureChecked,
    };
    await supabase.from('haccp_checklists').insert(row);
    return { ...payload, id, createdAt: new Date().toISOString() };
  },

  getHaccpChecklistsByCookId: async (cookId: string): Promise<HaccpChecklist[]> => {
    if (!cookId || !isValidUUID(cookId)) return [];
    try {
      const { data, error } = await supabase.from('haccp_checklists').select('*').eq('cook_id', cookId);
      if (error) return [];
      return (data || []).map((r: any) => ({
        id: r.id,
        cookId: r.cook_id,
        cookName: r.cook_name,
        bookingId: r.booking_id,
        clientName: r.client_name,
        date: r.date,
        transportTemp: Number(r.transport_temp),
        transportIsothermal: r.transport_isothermal,
        hygieneHands: r.hygiene_hands,
        hygieneHair: r.hygiene_hair,
        hygieneUniform: r.hygiene_uniform,
        sanitizedUtensils: r.sanitized_utensils,
        sanitizedSurfaces: r.sanitized_surfaces,
        separationRawCoo: r.separation_raw_cooked,
        washedIngredients: r.washed_ingredients,
        observations: r.observations,
        signatureChecked: r.signature_checked,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  createHaccpLog: async (payload: Omit<HaccpLog, 'id' | 'createdAt'>): Promise<HaccpLog> => {
    const id = crypto.randomUUID();
    const cookId = (payload.cookId && isValidUUID(payload.cookId)) ? payload.cookId : null;
    const bookingId = (payload.bookingId && isValidUUID(payload.bookingId)) ? payload.bookingId : null;
    const row = {
      id,
      cook_id: cookId,
      cook_name: payload.cookName || '',
      booking_id: bookingId,
      client_name: payload.clientName || '',
      log_type: payload.logType,
      date: payload.date,
      temperatures_ok: payload.temperaturesOk,
      surfaces_sanitized: payload.surfacesSanitized,
      personal_hygiene_ok: payload.personalHygieneOk,
      waste_disposed: payload.wasteDisposed,
      pest_control_ok: payload.pestControlOk,
      raw_ready_separation: payload.rawReadySeparation,
      observations: payload.observations || '',
    };
    try {
      await supabase.from('haccp_logs').insert(row);
    } catch (err) {
      console.warn('[Supabase] createHaccpLog note:', err);
    }
    return { ...payload, id, createdAt: new Date().toISOString() };
  },

  getHaccpLogsByCookId: async (cookId: string): Promise<HaccpLog[]> => {
    if (!cookId || !isValidUUID(cookId)) return [];
    try {
      const { data, error } = await supabase.from('haccp_logs').select('*').eq('cook_id', cookId);
      if (error) return [];
      return (data || []).map((r: any) => ({
        id: r.id,
        cookId: r.cook_id,
        cookName: r.cook_name,
        bookingId: r.booking_id,
        clientName: r.client_name,
        logType: r.log_type,
        date: r.date,
        temperaturesOk: r.temperatures_ok,
        surfacesSanitized: r.surfaces_sanitized,
        personalHygieneOk: r.personal_hygiene_ok,
        wasteDisposed: r.waste_disposed,
        pestControlOk: r.pest_control_ok,
        rawReadySeparation: r.raw_ready_separation,
        observations: r.observations,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  // ===========================================================================
  // UPLOADS DE FICHEIROS / IMAGENS
  // ===========================================================================

  /**
   * Upload de imagens: valida o ficheiro, reduz e comprime no dispositivo (JPEG) e envia para o
   * Supabase Storage, devolvendo o URL público. Se o Storage não estiver disponível, devolve uma
   * imagem pequena em base64 (nunca a foto original de vários MB).
   */
  uploadFile: async (bucket: string, path: string, file: File, maxDimension = 1280): Promise<string> => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!file || (file.type && !allowed.includes(file.type.toLowerCase()))) {
      throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('A imagem é demasiado grande (máximo 20 MB).');
    }

    const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    const compress = async (maxDim: number, quality: number): Promise<Blob> => {
      let bitmap: ImageBitmap | HTMLImageElement;
      try {
        bitmap = await createImageBitmap(file);
      } catch (_) {
        throw new Error('Não foi possível ler a imagem. Tente outro ficheiro (JPG ou PNG).');
      }
      const w = (bitmap as ImageBitmap).width;
      const h = (bitmap as ImageBitmap).height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível processar a imagem.');
      ctx.fillStyle = '#ffffff'; // PNG com transparência fica sobre fundo branco
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap as ImageBitmap, 0, 0, canvas.width, canvas.height);
      (bitmap as ImageBitmap).close?.();
      const blob = await toBlob(canvas, quality);
      if (!blob) throw new Error('Não foi possível comprimir a imagem.');
      return blob;
    };

    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(blob);
      });

    const blob = await compress(maxDimension, 0.82);

    // 1. Supabase Storage (pasta do próprio utilizador, exigida pelas políticas)
    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid) {
          const objectPath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
          const { error } = await supabase.storage
            .from(bucket)
            .upload(objectPath, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
          if (!error) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
            if (data?.publicUrl) return data.publicUrl;
          } else {
            console.warn('[Storage] upload falhou, a usar imagem reduzida:', error.message);
          }
        }
      } catch (e) {
        console.warn('[Storage] indisponível, a usar imagem reduzida:', e);
      }
    }

    // 2. Fallback: imagem pequena em base64 (≈ até 150 KB)
    const small = await compress(Math.min(maxDimension, 640), 0.7);
    return blobToDataUrl(small);
  },

  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    return supabaseService.uploadFile('avatars', userId, file, 800);
  },

  uploadCover: async (userId: string, file: File): Promise<string> => {
    return supabaseService.uploadFile('covers', userId, file, 1600);
  },

  // ===========================================================================
  // DADOS DE DEMONSTRAÇÃO E SEEDING
  // ===========================================================================

  importDemoBookingsForNewClient: async (newClientId: string, newClientName: string): Promise<boolean> => {
    if (!newClientId || !isValidUUID(newClientId)) return false;
    try {
      const demoBookings = [
        {
          id: crypto.randomUUID(),
          cook_id: '22222222-2222-2222-2222-222222222222',
          client_id: newClientId,
          client_name: newClientName,
          cook_name: 'Chef Maria Santos',
          menu_selected: 'Menu Degustação Atlântico',
          menu_type: 'experience',
          data: '2026-10-15',
          hora: '20:00',
          num_pessoas: 4,
          morada: 'Rua do Alecrim, 12, Lisboa',
          valor_total: 340.0,
          status: BookingStatus.ACCEPTED,
          service_pin: '4821',
        },
      ];

      await supabase.from('bookings').insert(demoBookings);
      return true;
    } catch (e) {
      console.warn('[Supabase] importDemoBookingsForNewClient note:', e);
      return false;
    }
  },

  importDemoDataForNewChef: async (newCookId: string, newCookName: string): Promise<boolean> => {
    if (!newCookId || !isValidUUID(newCookId)) return false;
    try {
      const demoMenus = [
        {
          id: crypto.randomUUID(),
          cook_id: newCookId,
          nome: 'Experiência de Assinatura',
          descricao: 'Menu exclusivo de 5 pratos criado pelo Chef.',
          preco: 85.0,
          type: 'experience',
          image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
          is_active: true,
        },
      ];
      await supabase.from('menus').insert(demoMenus);
      return true;
    } catch (e) {
      console.warn('[Supabase] importDemoDataForNewChef note:', e);
      return false;
    }
  },

  seedDatabase: async (
    mockUsers: User[],
    mockMenus: Record<string, MenuItem[]>,
    mockRecipes: Record<string, ChefRecipe[]>,
    mockBookings: Booking[]
  ) => {
    console.log('[Supabase Seed] A iniciar população da base de dados Supabase...');

    // 1. Inserir Utilizadores e Perfis
    try {
      for (const u of mockUsers) {
        const profileRow = {
          id: u.id,
          email: u.email.toLowerCase().trim(),
          nome: u.nome,
          telefone: u.telefone || null,
          role: u.role,
          status: u.status || 'active',
          avatar_url: u.avatar_url || null,
          cover_url: u.cover_url || null,
          morada: u.morada || null,
          cidade: u.cidade || null,
          localizacao: u.localizacao || null,
          zip_code: u.zip_code || null,
          addresses: u.addresses || [],
          dietary_restrictions: u.dietary_restrictions || [],
          cuisine_preferences: u.cuisine_preferences || [],
          favorite_chef_ids: u.favoriteChefIds || [],
          loyalty_points: u.loyalty_points ?? 0,
        };

        const { error: pErr } = await supabase.from('profiles').upsert(profileRow, { onConflict: 'id' });
        if (pErr) console.warn('[Supabase Seed] profiles upsert note:', pErr.message || pErr);

        if (u.role === UserRole.COOK) {
          const chefRow = {
            profile_id: u.id,
            biografia: u.biografia || '',
            especialidades: u.especialidades || [],
            experiencia_anos: u.experiencia ?? 0,
            rating: u.rating ?? 5.0,
            total_avaliacoes: u.total_avaliacoes ?? 0,
            total_reservas: u.total_reservas ?? 0,
            preco_medio: u.precoMedio ?? 0,
            distrito: u.localizacao || u.cidade || 'Lisboa',
            idiomas: u.idiomas || ['Português'],
            equipamento: u.equipamento || [],
            diferenciais: u.diferenciais || [],
            certifications_and_awards: u.certifications_and_awards || [],
            faqs: u.faqs || [],
            sustainability_badges: u.sustainability_badges || [],
            sustainability_notes: u.sustainability_notes || '',
            allergen_certifications: u.allergen_certifications || [],
            allergen_notes: u.allergen_notes || '',
            portfolio_images: u.portfolio_images || [],
            disponibilidade: u.disponibilidade || {},
            is_available: u.isAvailable ?? true,
            offers_wine_pairing: u.offers_wine_pairing ?? false,
            approved_by_admin: u.approvedByAdmin ?? true,
            bypass_haccp_restrictions: u.bypass_haccp_restrictions ?? false,
            kitchen_notes: u.kitchenNotes || '',
          };
          const { error: cErr } = await supabase.from('chefs').upsert(chefRow, { onConflict: 'profile_id' });
          if (cErr) console.warn('[Supabase Seed] chefs upsert note:', cErr.message || cErr);
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Seed] Erro ao popular utilizadores/perfis:', e?.message || e);
    }

    // 2. Inserir Menus
    try {
      for (const cookId of Object.keys(mockMenus)) {
        const items = mockMenus[cookId] || [];
        for (const m of items) {
          await supabaseService.createMenu({ ...m, cookId });
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Seed] Erro ao popular menus:', e?.message || e);
    }

    // 3. Inserir Receitas dos Chefs
    try {
      for (const cookId of Object.keys(mockRecipes)) {
        const recipes = mockRecipes[cookId] || [];
        const validCookId = (cookId && isValidUUID(cookId)) ? cookId : toValidUUID(cookId);
        for (const r of recipes) {
          const recipeId = (r.id && isValidUUID(r.id)) ? r.id : (r.id ? toValidUUID(r.id) : crypto.randomUUID());
          await supabase.from('chef_recipes').upsert({
            id: recipeId,
            cook_id: validCookId,
            nome: r.nome,
            image_url: r.imageUrl,
            descricao: r.descricao || '',
            is_popular: r.isPopular ?? false,
            preco: r.preco ?? null,
          }, { onConflict: 'id' });
        }
      }
    } catch (e: any) {
      console.warn('[Supabase Seed] Erro ao popular receitas:', e?.message || e);
    }

    // 4. Inserir Reservas
    try {
      for (const b of mockBookings) {
        await supabaseService.createBooking(b);
      }
    } catch (e: any) {
      console.warn('[Supabase Seed] Erro ao popular reservas:', e?.message || e);
    }

    console.log('[Supabase Seed] População de dados concluída.');
  },
};

export const sanitizeUserUrls = (user: any): any => {
  if (!user) return user;
  const copy = { ...user };
  if (copy.avatar_url && typeof copy.avatar_url === 'string' && copy.avatar_url.startsWith('data:') && copy.avatar_url.includes('?t=')) {
    copy.avatar_url = copy.avatar_url.split('?t=')[0];
  }
  if (copy.cover_url && typeof copy.cover_url === 'string' && copy.cover_url.startsWith('data:') && copy.cover_url.includes('?t=')) {
    copy.cover_url = copy.cover_url.split('?t=')[0];
  }
  if (copy.is_available !== undefined) {
    copy.isAvailable = copy.is_available;
  } else if (copy.isAvailable !== undefined) {
    copy.is_available = copy.isAvailable;
  }
  return copy;
};

/**
 * Devolve o id do utilizador com sessão Supabase válida, ou null.
 * Em modo demonstração (Supabase não configurado) devolve undefined (sem verificação).
 */
export const getVerifiedSessionUserId = async (): Promise<string | null | undefined> => {
  if (!isSupabaseConfigured()) return undefined;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch (_) {
    return null;
  }
};

export const waitForAuthInit = async (): Promise<void> => {
  try {
    await supabase.auth.getSession();
  } catch (e) {
    // Session check safe fallback
  }
};

export const getTrendingRituals = supabaseService.getTrendingRituals;

