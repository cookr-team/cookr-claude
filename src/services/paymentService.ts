import { apiFetch } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export type PaymentStatus =
  | 'checkout_created' | 'authorized' | 'captured' | 'paid_out'
  | 'released' | 'refunded' | 'partially_refunded' | 'expired' | 'failed';

export class PaymentRequiredError extends Error {
  code = 'payment_required';
}

let enabledCache: { value: boolean; at: number } | null = null;

async function post(path: string, body: any) {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export const paymentService = {
  /** True quando o servidor tem o Stripe configurado (chaves e service role). */
  isEnabled: async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    if (enabledCache && Date.now() - enabledCache.at < 5 * 60 * 1000) return enabledCache.value;
    try {
      const res = await apiFetch('/api/stripe/status');
      const json = await res.json();
      enabledCache = { value: !!json.enabled, at: Date.now() };
      return enabledCache.value;
    } catch {
      return false;
    }
  },

  /** Cria a sessão de pagamento e devolve o URL do Stripe Checkout. */
  startCheckout: async (bookingId: string): Promise<string> => {
    const r = await post('/api/stripe/checkout', { bookingId });
    if (!r.ok || !r.json.url) throw new Error(r.json.error || 'Não foi possível iniciar o pagamento.');
    return r.json.url as string;
  },

  /** O chef aceita: captura o pagamento autorizado. Lança PaymentRequiredError se o cliente ainda não pagou. */
  capture: async (bookingId: string): Promise<void> => {
    const r = await post('/api/stripe/capture', { bookingId });
    if (r.status === 402) throw new PaymentRequiredError(r.json.error);
    if (!r.ok) throw new Error(r.json.error || 'Não foi possível confirmar o pagamento.');
  },

  release: async (bookingId: string): Promise<void> => {
    const r = await post('/api/stripe/release', { bookingId });
    if (!r.ok) throw new Error(r.json.error || 'Não foi possível libertar o pagamento.');
  },

  payout: async (bookingId: string): Promise<{ ok: boolean; code?: string }> => {
    const r = await post('/api/stripe/payout', { bookingId });
    return r.ok ? r.json : { ok: false, code: r.json.code };
  },

  connectOnboard: async (): Promise<string> => {
    const r = await post('/api/stripe/connect/onboard', {});
    if (!r.ok || !r.json.url) throw new Error(r.json.error || 'Não foi possível iniciar a configuração.');
    return r.json.url as string;
  },

  connectStatus: async (): Promise<{ enabled: boolean; connected?: boolean; detailsSubmitted?: boolean; payoutsEnabled?: boolean }> => {
    try {
      const res = await apiFetch('/api/stripe/connect/status');
      return await res.json();
    } catch {
      return { enabled: false };
    }
  },

  /** Estado do pagamento de várias reservas (RLS: só as do próprio). */
  getStatuses: async (bookingIds: string[]): Promise<Record<string, PaymentStatus>> => {
    if (!bookingIds.length || !isSupabaseConfigured()) return {};
    const { data } = await supabase.from('booking_payments').select('booking_id, status').in('booking_id', bookingIds);
    return Object.fromEntries((data || []).map((r: any) => [r.booking_id, r.status as PaymentStatus]));
  },
};
