import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Dynamic import or typed service interface to avoid circular dependency
let _supabaseService: any = null;
async function getService() {
  if (!_supabaseService) {
    const mod = await import('./supabaseService');
    _supabaseService = mod.supabaseService;
  }
  return _supabaseService;
}

export interface OfflineAction {
  id?: number;
  type: 'create' | 'update_status' | 'delete_booking';
  data: any;
  createdAt: number;
  /** Utilizador que criou a ação (a fila é partilhada pelo dispositivo). */
  userId?: string | null;
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch (_) {
    return null;
  }
}

const DB_NAME = 'BookingOfflineQueueDB';
const STORE_NAME = 'offline_actions';
const DB_VERSION = 1;

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('connection aborted') ||
    msg.includes('timeout')
  );
}

export function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/** Verdadeiro enquanto a fila está a ser reenviada: nessa altura uma falha de rede NUNCA pode voltar a enfileirar a ação. */
let replaying = false;

const MAX_ATTEMPTS = 5;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ATTEMPTS_KEY = 'offline_attempts_v1';
const MIN_SYNC_INTERVAL_MS = 10_000;
const ERROR_TOAST_INTERVAL_MS = 60_000;
let lastSyncAt = 0;
let lastErrorToastAt = 0;

function readAttempts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); } catch (_) { return {}; }
}
function writeAttempts(a: Record<string, number>) {
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(a)); } catch (_) {}
}

export async function addOfflineAction(type: 'create' | 'update_status' | 'delete_booking', data: any): Promise<number> {
  if (replaying) {
    // Reenvio em curso: assinala falha de rede para a ação original ficar na fila (sem criar cópias).
    throw new Error('network error: replay in progress');
  }
  const userId = await getCurrentUserId();
  try {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const action: OfflineAction = {
        type,
        data,
        createdAt: Date.now(),
        userId,
      };
      const req = store.add(action);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('Failed to add to IndexedDB queue, falling back to localStorage', error);
    const localQueueStr = localStorage.getItem('offline_actions_fallback') || '[]';
    const localQueue = JSON.parse(localQueueStr);
    const id = Date.now();
    localQueue.push({ id, type, data, createdAt: Date.now(), userId });
    localStorage.setItem('offline_actions_fallback', JSON.stringify(localQueue));
    return id;
  }
}

export async function getOfflineActions(): Promise<OfflineAction[]> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('Failed to read from IndexedDB, falling back to localStorage', error);
    const localQueueStr = localStorage.getItem('offline_actions_fallback') || '[]';
    return JSON.parse(localQueueStr);
  }
}

export async function removeOfflineAction(id: number): Promise<void> {
  try {
    const db = await initOfflineDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('Failed to delete from IndexedDB, falling back to localStorage', error);
    const localQueueStr = localStorage.getItem('offline_actions_fallback') || '[]';
    const localQueue = JSON.parse(localQueueStr);
    const updated = localQueue.filter((item: any) => item.id !== id);
    localStorage.setItem('offline_actions_fallback', JSON.stringify(updated));
  }
}

let syncInFlight = false;

export async function syncOfflineBookings(
  onProgress?: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  // Evita sincronizações em paralelo (arranque + evento 'online' + Service Worker) que duplicariam reservas.
  if (syncInFlight) return;
  // Limita a frequência: vários gatilhos seguidos (online, SW, arranque) não podem gerar rajadas.
  if (Date.now() - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
  syncInFlight = true;
  lastSyncAt = Date.now();
  replaying = true;
  try {
    await runSync(onProgress);
  } finally {
    replaying = false;
    syncInFlight = false;
  }
}

async function runSync(
  onProgress?: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  const all = await getOfflineActions();
  if (all.length === 0) return;

  // Sem sessão não se sincroniza (o servidor recusaria e as ações perder-se-iam).
  const currentUserId = await getCurrentUserId();
  if (isSupabaseConfigured() && !currentUserId) return;

  // Só as ações do utilizador atual; as de outras contas ficam à espera do respetivo login.
  const actions = all
    .filter(a => !a.userId || !currentUserId || a.userId === currentUserId)
    .sort((a, b) => a.createdAt - b.createdAt);
  if (actions.length === 0) return;

  const service = await getService();
  const attempts = readAttempts();
  let applied = 0;
  const errorToast = (msg: string) => {
    if (!onProgress) return;
    if (Date.now() - lastErrorToastAt < ERROR_TOAST_INTERVAL_MS) return;
    lastErrorToastAt = Date.now();
    onProgress(msg, 'error');
  };

  for (const action of actions) {
    const key = String(action.id);
    // Ações demasiado antigas ou que já falharam várias vezes são descartadas (nunca ficam em ciclo).
    if (Date.now() - action.createdAt > MAX_AGE_MS || (attempts[key] || 0) >= MAX_ATTEMPTS) {
      if (action.id !== undefined) await removeOfflineAction(action.id);
      delete attempts[key];
      errorToast('Uma ação offline pendente expirou e foi descartada. Verifique as suas reservas.');
      continue;
    }
    try {
      if (action.type === 'create') {
        await service.createBooking(action.data);
      } else if (action.type === 'update_status') {
        const { id, status, extraData } = action.data;
        await service.updateBookingStatus(id, status, extraData);
      } else if (action.type === 'delete_booking') {
        const { id } = action.data;
        await service.deleteBooking(id);
      }
      
      if (action.id !== undefined) {
        await removeOfflineAction(action.id);
      }
      delete attempts[key];
      applied++;
    } catch (err: any) {
      console.warn('Error syncing offline action:', action, err);
      if (isNetworkError(err)) {
        attempts[key] = (attempts[key] || 0) + 1;
        writeAttempts(attempts);
        errorToast('Falha na sincronização devido a erro de rede. Tentará novamente mais tarde.');
        return;
      } else {
        if (action.id !== undefined) {
          await removeOfflineAction(action.id);
        }
        delete attempts[key];
        errorToast(`Não foi possível aplicar ação offline: ${err.message || 'Erro desconhecido'}`);
      }
    }
  }
  writeAttempts(attempts);

  // Só se anuncia sucesso quando algo foi realmente sincronizado.
  if (onProgress && applied > 0) {
    onProgress(`${applied} ${applied === 1 ? 'ação offline sincronizada' : 'ações offline sincronizadas'} com sucesso.`, 'success');
  }
}
