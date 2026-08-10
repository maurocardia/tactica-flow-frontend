// src/services/dom.service.ts
import { WA_SELECTORS } from '@/config/constants';

let lastProcessedMessageId: string | null = null;
let messagesObserver: MutationObserver | null = null;
let watcherRetryInterval: number | null = null;

/** Última fila de mensaje ENTRANTE (con la "colita" tail-in) dentro del contenedor dado. */
function getLastIncomingRow(container: Element): Element | null {
    const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].querySelector(WA_SELECTORS.MESSAGE_TAIL_IN)) return rows[i];
    }
    return null;
}

function extractMessageText(row: Element): string | null {
    const textEl = row.querySelector(WA_SELECTORS.MESSAGE_TEXT);
    return textEl?.textContent?.trim() || null;
}

export const DOMService = {
    getChatTitle(): string | null {
        const selectors = [
            '#main header div[role="button"] span[title]',
            '#main header span[title]',
            '#main header h2 span',
            '#main header div._amoi span[title]',
            '#main header div span[dir="auto"]'
        ];

        for (const selector of selectors) {
            // 1. Guardrail: Ignorar selectores inválidos o vacíos
            if (!selector || selector.trim() === '#') continue;

            try {
                const el = document.querySelector(selector);
                if (el) {
                    const titleAttr = el.getAttribute('title');
                    const textContent = el.textContent?.trim();

                    if (titleAttr && titleAttr.length > 0) return titleAttr;
                    if (
                        textContent &&
                        textContent.length > 0 &&
                        !textContent.includes(':') &&
                        textContent.toLowerCase() !== 'en línea'
                    ) {
                        return textContent;
                    }
                }
            } catch (err) {
                console.warn(`[DOMService] Selector no válido omitido: "${selector}"`, err);
            }
        }
        return null;
    },

    insertMessage(text: string): boolean {
        try {
            const messageBox = document.querySelector('#main footer div[contenteditable="true"]') as HTMLElement;
            if (messageBox) {
                messageBox.focus();
                document.execCommand('insertText', false, text);
                // Algunas versiones de WhatsApp Web sólo habilitan el botón de enviar cuando
                // detectan un evento 'input' real sobre el compositor (React controla el estado
                // internamente). execCommand ya dispara uno en la mayoría de los navegadores,
                // pero lo forzamos igual como red de seguridad.
                messageBox.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                return true;
            }
            console.warn('[DOMService] No se encontró el cuadro de mensaje para insertar texto.');
        } catch (err) {
            console.error('[DOMService] Error al insertar mensaje:', err);
        }
        return false;
    },

    /** Lee el texto del último mensaje entrante visible ahora mismo (sin esperar a uno nuevo). Útil para probar el matcheo de reglas manualmente. */
    getLastIncomingMessageText(): string | null {
        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return null;
            const row = getLastIncomingRow(container);
            if (!row) return null;
            return extractMessageText(row);
        } catch (err) {
            console.error('[DOMService] Error al leer el último mensaje entrante:', err);
            return null;
        }
    },

    /** Hace clic en el botón de enviar de WhatsApp Web (asume que ya hay texto cargado en el compositor). */
    clickSendButton(): boolean {
        try {
            const sendIcon = document.querySelector(WA_SELECTORS.SEND_BUTTON);
            let button = sendIcon?.closest('button') as HTMLElement | null;
            // Fallback si WhatsApp vuelve a renombrar el ícono: buscar por aria-label del botón.
            if (!button) {
                button = document.querySelector('#main footer button[aria-label="Enviar"]') as HTMLElement | null;
            }
            if (button) {
                button.click();
                return true;
            }
        } catch (err) {
            console.error('[DOMService] Error al hacer clic en enviar:', err);
        }
        return false;
    },

    /**
     * Observa el chat activo y llama a onMessage(texto) cada vez que aparece un mensaje
     * ENTRANTE nuevo. No dispara sobre el historial que ya estaba cargado al momento de
     * empezar a observar. Devuelve una función para dejar de observar (llamarla al cambiar
     * de chat o desmontar).
     *
     * Si todavía no hay ningún chat abierto (#main no existe), reintenta cada 500ms hasta
     * encontrarlo en vez de rendirse — si no, el watcher nunca se conectaba cuando la
     * extensión cargaba antes de que el usuario abriera un chat.
     *
     * Deduplicación por data-id (id único de mensaje que pone WhatsApp en cada fila) — más
     * preciso que comparar texto, no falla con mensajes entrantes idénticos seguidos.
     */
    startIncomingMessageWatcher(onMessage: (text: string) => void): () => void {
        let stopped = false;

        const attach = (container: Element) => {
            // Marca como "ya visto" lo que hay al entrar, para no reprocesar historial viejo.
            const initialRow = getLastIncomingRow(container);
            lastProcessedMessageId = initialRow?.getAttribute('data-id') ?? null;
            console.log('[DOMService] Watcher conectado a #main. Último mensaje entrante ya visto (data-id):', lastProcessedMessageId);

            if (messagesObserver) messagesObserver.disconnect();

            messagesObserver = new MutationObserver(() => {
                const row = getLastIncomingRow(container);
                if (!row) return;
                const messageId = row.getAttribute('data-id');
                if (!messageId || messageId === lastProcessedMessageId) return;
                const text = extractMessageText(row);
                if (!text) return;
                lastProcessedMessageId = messageId;
                console.log('[DOMService] Mensaje entrante nuevo detectado:', text);
                onMessage(text);
            });

            messagesObserver.observe(container, { childList: true, subtree: true });
        };

        const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
        if (container) {
            attach(container);
        } else {
            console.log('[DOMService] #main todavía no existe, reintentando cada 500ms...');
            watcherRetryInterval = window.setInterval(() => {
                if (stopped) return;
                const found = document.querySelector(WA_SELECTORS.MAIN_CHAT);
                if (found) {
                    if (watcherRetryInterval) window.clearInterval(watcherRetryInterval);
                    watcherRetryInterval = null;
                    attach(found);
                }
            }, 500);
        }

        return () => {
            stopped = true;
            if (watcherRetryInterval) window.clearInterval(watcherRetryInterval);
            watcherRetryInterval = null;
            messagesObserver?.disconnect();
            messagesObserver = null;
        };
    },

    /**
     * Lee los contactos visibles hoy en la lista de chats de WhatsApp Web (barra izquierda).
     * Sólo devuelve lo que ya está cargado en el DOM — si hay muchos chats y no se scrolleó
     * la lista completa, no van a aparecer todos acá.
     */
    getAvailableContacts(): string[] {
        try {
            const items = document.querySelectorAll(WA_SELECTORS.CHAT_ITEM);
            const names = new Set<string>();
            items.forEach((item) => {
                const titleEl = item.querySelector(WA_SELECTORS.CHAT_TITLE);
                const name = titleEl?.getAttribute('title')?.trim() || titleEl?.textContent?.trim();
                if (name) names.add(name);
            });
            return Array.from(names);
        } catch (err) {
            console.error('[DOMService] Error al leer la lista de contactos:', err);
            return [];
        }
    }
};