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

export async function addOfflineAction(type: 'create' | 'update_status' | 'delete_booking', data: any): Promise<number> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const action: OfflineAction = {
        type,
        data,
        createdAt: Date.now(),
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
    localQueue.push({ id, type, data, createdAt: Date.now() });
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

export async function syncOfflineBookings(
  onProgress?: (msg: string, type: 'success' | 'error' | 'info') => void
): Promise<void> {
  const actions = await getOfflineActions();
  if (actions.length === 0) return;

  if (onProgress) {
    onProgress(`A sincronizar ${actions.length} ações offline pendentes...`, 'info');
  }

  const service = await getService();
  for (const action of actions) {
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
    } catch (err: any) {
      console.warn('Error syncing offline action:', action, err);
      if (isNetworkError(err)) {
        if (onProgress) {
          onProgress('Falha na sincronização devido a erro de rede. Tentará novamente mais tarde.', 'error');
        }
        return;
      } else {
        if (action.id !== undefined) {
          await removeOfflineAction(action.id);
        }
        if (onProgress) {
          onProgress(`Não foi possível aplicar ação offline: ${err.message || 'Erro desconhecido'}`, 'error');
        }
      }
    }
  }

  if (onProgress) {
    onProgress('Todas as ações de reserva offline foram sincronizadas com sucesso!', 'success');
  }
}
