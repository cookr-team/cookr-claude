import { supabase } from './supabaseClient';

/**
 * Obter o token de acesso JWT da sessão ativa do Supabase Auth
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (err) {
    console.warn('[apiClient] Erro ao obter sessão ativa do Supabase:', err);
    return null;
  }
}

/**
 * Fetch wrapper que anexa automaticamente o cabeçalho 'Authorization: Bearer <token>'
 * para autenticar chamadas a endpoints /api/* protegidos pelo Express server.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = await getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
