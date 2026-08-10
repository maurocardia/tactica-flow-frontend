// src/background/index.ts

const API_URL = 'http://localhost:5000/api';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'FETCH_API') {
        const { endpoint, method = 'GET', body } = request.payload;

        fetch(`${API_URL}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
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
});