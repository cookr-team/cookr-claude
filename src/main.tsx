import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { getAuthToken } from './lib/apiClient.ts';

// Os endpoints /api/* exigem 'Authorization: Bearer <token>'. Alguns serviços usam fetch simples,
// por isso anexamos o token da sessão automaticamente a pedidos para o nosso próprio servidor.
if (typeof window !== 'undefined' && !(window as any).__cookrFetchPatched) {
  (window as any).__cookrFetchPatched = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const isOwnApi = url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/');
      if (isOwnApi) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('Authorization')) {
          const token = await getAuthToken();
          if (token) headers.set('Authorization', `Bearer ${token}`);
        }
        return nativeFetch(input, { ...init, headers });
      }
    } catch {
      // em caso de erro, segue com o fetch normal
    }
    return nativeFetch(input, init);
  };
}

// Disable cellular/tablet zooming gestures globally (pinch-to-zoom & double-tap zoom)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Prevent pinch-to-zoom (multi-touch gesture)
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // Prevent iOS Safari specific gestures
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
