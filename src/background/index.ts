// src/background/index.ts

import { API_URL } from '../config/env';

// Client ID de la credencial OAuth "Aplicación web" en Google Cloud Console, con
// "https://<ID-de-la-extensión>.chromiumapp.org/" cargado como URI de redirección autorizada.
const GOOGLE_CLIENT_ID = '960361389679-qibfdmr3vokgjd1en906niu9fql2gvvt.apps.googleusercontent.com';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'FETCH_API') {
        const { endpoint, method = 'GET', body, token } = request.payload;

        fetch(`${API_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        })
            .then(async (res) => {
                // 204 (No Content) u otras respuestas sin body: no hay nada que parsear como JSON.
                const hasBody = res.status !== 204 && res.headers.get('content-length') !== '0';
                const data = hasBody ? await res.json().catch(() => null) : null;
                if (!res.ok) {
                    throw new Error(data?.error || `HTTP Error ${res.status}`);
                }
                return data;
            })
            .then((data) => sendResponse({ success: true, data }))
            .catch((error) => sendResponse({ success: false, error: error.message }));

        return true; // Obligatorio para respuestas asíncronas
    }

    // chrome.identity solo existe en el service worker, no en el content script (que corre
    // inyectado en web.whatsapp.com) — por eso todo el login de Google se hace acá y el panel
    // solo pide el resultado por mensaje.
    if (request.type === 'GOOGLE_SIGN_IN') {
        (async () => {
            try {
                const redirectUri = chrome.identity.getRedirectURL();
                const nonce = crypto.randomUUID();

                const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
                authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
                authUrl.searchParams.set('response_type', 'id_token');
                authUrl.searchParams.set('redirect_uri', redirectUri);
                authUrl.searchParams.set('scope', 'openid email profile');
                authUrl.searchParams.set('nonce', nonce);
                authUrl.searchParams.set('prompt', 'select_account');

                const responseUrl = await new Promise<string>((resolve, reject) => {
                    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (url) => {
                        if (chrome.runtime.lastError || !url) {
                            reject(new Error(chrome.runtime.lastError?.message || 'Inicio de sesión cancelado.'));
                            return;
                        }
                        resolve(url);
                    });
                });

                const hash = new URL(responseUrl).hash.replace(/^#/, '');
                const idToken = new URLSearchParams(hash).get('id_token');
                if (!idToken) throw new Error('Google no devolvió un id_token.');

                const res = await fetch(`${API_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(data?.error || `HTTP Error ${res.status}`);

                sendResponse({ success: true, data });
            } catch (error: any) {
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }
});
