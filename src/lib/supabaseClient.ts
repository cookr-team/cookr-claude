import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean trailing '/rest/v1' or trailing '/' if environment supplied full rest endpoint
const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';
const rawUrl = envUrl.trim();
export const supabaseUrl =
  rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') ||
  'https://sirwzxcdnakhmxczfvth.supabase.co';
const envKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';
export const supabaseAnonKey = envKey.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseAnonKey !== 'your-anon-key' &&
      supabaseAnonKey !== 'placeholder-key'
  );
};

// Circuit breaker to avoid spamming failing network/DNS fetches when Supabase is unreachable
let supabaseUnreachableUntil = 0;
let hasLoggedUnreachable = false;

export const isSupabaseReachable = (): boolean => {
  if (!isSupabaseConfigured()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return Date.now() >= supabaseUnreachableUntil;
};

export const resetSupabaseReachability = (): void => {
  supabaseUnreachableUntil = 0;
  hasLoggedUnreachable = false;
  try {
    if (isSupabaseConfigured()) {
      supabaseInstance?.auth?.startAutoRefresh?.();
    }
  } catch {
    // Ignore auto-refresh restart errors
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    resetSupabaseReachability();
  });
}

function createUnavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      message: 'Supabase unavailable (offline/network fallback active)',
      code: 'SUPABASE_UNAVAILABLE',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

let supabaseInstance: SupabaseClient<any, any, any> | null = null;

const resilientSupabaseFetch: typeof fetch = async (input, init) => {
  if (!isSupabaseReachable()) {
    return createUnavailableResponse();
  }

  try {
    const response = await fetch(input, init);
    // Remote host answered (HTTP level), clear unreachable cooldown
    supabaseUnreachableUntil = 0;
    hasLoggedUnreachable = false;
    return response;
  } catch (err: any) {
    // Allow explicit caller aborts to behave normally
    if (err?.name === 'AbortError') {
      throw err;
    }

    const msg = String(err?.message || err || '').toLowerCase();
    const isNetworkFailure =
      err?.name === 'TypeError' ||
      msg.includes('failed to fetch') ||
      msg.includes('load failed') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed') ||
      msg.includes('name_not_resolved');

    if (isNetworkFailure) {
      supabaseUnreachableUntil = Date.now() + 30000;
      if (!hasLoggedUnreachable) {
        hasLoggedUnreachable = true;
        console.warn('[Supabase] Ligação remota indisponível. A utilizar cache local e modo resiliente.');
      }
      // Disconnect any active realtime socket retries and background token refresh cleanly
      try {
        supabaseInstance?.realtime?.disconnect?.();
      } catch {
        // Ignore realtime disconnect cleanup errors
      }
      try {
        supabaseInstance?.auth?.stopAutoRefresh?.();
      } catch {
        // Ignore auto-refresh stop errors
      }
      return createUnavailableResponse();
    }

    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured(),
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientSupabaseFetch,
  },
});

supabaseInstance = supabase;

