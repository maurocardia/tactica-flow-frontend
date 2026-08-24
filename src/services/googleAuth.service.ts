import { AuthUser } from '@/types/auth';

// El login en sí (chrome.identity.launchWebAuthFlow) corre en el service worker
// (background/index.ts), no acá: `chrome.identity` no existe en un content script (el código que
// se inyecta en web.whatsapp.com). Este archivo solo le pide el resultado por mensaje.
export function signInWithGoogle(): Promise<{ token: string; user: AuthUser }> {
  return new Promise((resolve, reject) => {
    if (!chrome.runtime?.id) {
      reject(new Error('Contexto de extensión no disponible'));
      return;
    }

    chrome.runtime.sendMessage({ type: 'GOOGLE_SIGN_IN' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'No se pudo iniciar sesión con Google.'));
      }
    });
  });
}
