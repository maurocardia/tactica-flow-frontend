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

export interface VisibleMessage {
    sender: 'me' | 'them';
    text: string;
}

export const DOMService = {
    /**
     * Lee el nombre del contacto/grupo del chat abierto. Verificado a mano en consola (ago-2026):
     * el nombre es un <span> sin `title` y sin clases con significado (todo atómico), y es el
     * PRIMER span-hoja del header — el único otro span-hoja con texto es la línea de estado
     * ("último. vez...", "en línea", "escribiendo...") y esa sí trae las clases
     * `selectable-text copyable-text`. Antes se buscaba por `span[title]`, pero el nombre no
     * siempre tiene ese atributo (solo lo agrega WhatsApp cuando el texto se trunca) — por eso a
     * veces se leía la línea de estado en vez del nombre.
     */
    getChatTitle(): string | null {
        try {
            const header = document.querySelector('#main header');
            if (!header) return null;

            const nameSpan = Array.from(header.querySelectorAll('span')).find((el) => {
                if (el.children.length > 0) return false; // solo nodos hoja (sin íconos adentro)
                const text = el.textContent?.trim();
                if (!text) return false;
                if (/selectable-text|copyable-text/.test(el.className)) return false; // línea de estado
                return true;
            });

            return nameSpan?.textContent?.trim() || null;
        } catch (err) {
            console.warn('[DOMService] Error al leer el título del chat:', err);
            return null;
        }
    },

    insertMessage(text: string): boolean {
        try {
            const messageBox = document.querySelector('#main footer div[contenteditable="true"]') as HTMLElement;
            if (messageBox) {
                messageBox.focus();

                // Insertar el texto completo de una sola vez con un '\n' suelto NO genera un salto
                // de línea real en un contenteditable — el navegador lo colapsa en un espacio (por
                // eso un mensaje con varios renglones llegaba pegado en un solo párrafo). Hay que
                // insertar línea por línea y meter un salto real (`insertLineBreak`, el mismo que
                // dispara Shift+Enter) entre cada una.
                const lines = text.split('\n');
                lines.forEach((line, i) => {
                    if (i > 0) document.execCommand('insertLineBreak');
                    if (line) document.execCommand('insertText', false, line);
                });

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
     *
     * Con debounce (400ms): un mensaje entrante no llega al DOM en un solo cambio — WhatsApp
     * dispara varias mutaciones seguidas para la misma fila (texto, tilde de estado, etc.), y
     * justo al conectar el watcher (o al abrir un chat) puede haber una ráfaga de mutaciones
     * mientras termina de cargar. Sin debounce, cada mutación de la ráfaga podía pasar la
     * deduplicación por separado y disparar `onMessage` más de una vez para el mismo mensaje —
     * esto era la causa real de que el primer mensaje se respondiera doble. Ahora se espera a
     * que la ráfaga se asiente y se evalúa una sola vez el último estado.
     */
    startIncomingMessageWatcher(onMessage: (text: string) => void): () => void {
        let stopped = false;
        let debounceTimer: number | null = null;

        const evaluate = (container: Element) => {
            const row = getLastIncomingRow(container);
            if (!row) return;
            const messageId = row.getAttribute('data-id');
            if (!messageId || messageId === lastProcessedMessageId) return;
            const text = extractMessageText(row);
            if (!text) return;
            lastProcessedMessageId = messageId;
            console.log('[DOMService] Mensaje entrante nuevo detectado:', text);
            onMessage(text);
        };

        const attach = (container: Element) => {
            // Marca como "ya visto" lo que hay al entrar, para no reprocesar historial viejo.
            const initialRow = getLastIncomingRow(container);
            lastProcessedMessageId = initialRow?.getAttribute('data-id') ?? null;
            console.log('[DOMService] Watcher conectado a #main. Último mensaje entrante ya visto (data-id):', lastProcessedMessageId);

            if (messagesObserver) messagesObserver.disconnect();

            messagesObserver = new MutationObserver(() => {
                if (debounceTimer) window.clearTimeout(debounceTimer);
                debounceTimer = window.setTimeout(() => {
                    debounceTimer = null;
                    evaluate(container);
                }, 400);
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
            if (debounceTimer) window.clearTimeout(debounceTimer);
            debounceTimer = null;
            messagesObserver?.disconnect();
            messagesObserver = null;
        };
    },

    /**
     * Lee los mensajes con texto que estén cargados en el DOM del chat abierto ahora mismo, en
     * orden cronológico. Limitación real: WhatsApp Web virtualiza la lista de mensajes — solo
     * devuelve lo que ya está renderizado en pantalla (lo visible + lo que quedó cargado por
     * scroll previo), no la charla completa si nunca se scrolleó hacia arriba. Los mensajes sin
     * texto (audio, imagen sin caption) se omiten, no se inventan.
     */
    getVisibleMessages(): VisibleMessage[] {
        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return [];

            const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
            const messages: VisibleMessage[] = [];

            rows.forEach((row) => {
                const isIncoming = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_IN);
                const isOutgoing = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT);
                if (!isIncoming && !isOutgoing) return; // separador de fecha, sistema, etc.

                const text = extractMessageText(row);
                if (!text) return; // audio/imagen sin texto, o placeholder virtualizado sin renderizar

                messages.push({ sender: isIncoming ? 'them' : 'me', text });
            });

            return messages;
        } catch (err) {
            console.error('[DOMService] Error al leer los mensajes visibles del chat:', err);
            return [];
        }
    },

    /**
     * Detecta notas de voz y audios visibles en la conversación activa.
     */
    getVisibleAudios(): { id: string; sender: 'me' | 'them'; duration: string; src: string | null }[] {
        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return [];

            const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
            const audios: { id: string; sender: 'me' | 'them'; duration: string; src: string | null }[] = [];

            rows.forEach((row, index) => {
                const isIncoming = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_IN);
                const isOutgoing = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT);
                if (!isIncoming && !isOutgoing) return;

                // Buscar elemento audio o reproductor PTT
                const audioElement = row.querySelector('audio') as HTMLAudioElement | null;
                const pttContainer = row.querySelector('[data-testid="audio-player"], [data-testid="ptt-player"], [data-icon="ptt-play"], [data-icon="audio-play"]');

                if (audioElement || pttContainer) {
                    const rowId = row.getAttribute('data-id') || `audio_${index}`;
                    // Extraer duración visible si existe
                    const durationEl = row.querySelector('div[dir="auto"], span[dir="auto"]');
                    const durationText = durationEl?.textContent?.trim() || '0:15';

                    audios.push({
                        id: rowId,
                        sender: isIncoming ? 'them' : 'me',
                        duration: durationText,
                        src: audioElement?.src || null
                    });
                }
            });

            return audios;
        } catch (err) {
            console.error('[DOMService] Error al detectar audios:', err);
            return [];
        }
    },

    /**
     * Convierte una URL de blob de audio del navegador a base64 para enviarla al backend.
     */
    async convertBlobUrlToBase64(blobUrl: string): Promise<string> {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Activa el modo de selección inyectando checkboxes visuales en cada burbuja visible de WhatsApp Web,
     * evitando interferir con el seleccionador nativo de WhatsApp.
     */
    enableMessageSelectionMode(onSelectionChange: (selectedMessages: { id: string; text: string; sender: 'me' | 'them' }[]) => void): () => void {
        const selectedMap = new Map<string, { id: string; text: string; sender: 'me' | 'them' }>();
        const injectedBadges: HTMLElement[] = [];
        const modifiedBubbles: HTMLElement[] = [];

        const attachCheckboxes = () => {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return;

            const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
            rows.forEach((row) => {
                const messageId = row.getAttribute('data-id');
                if (!messageId || row.querySelector('.tf-msg-select-badge')) return;

                const text = extractMessageText(row);
                if (!text) return;

                const isIncoming = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_IN);
                const bubble = (row.querySelector('div.copyable-text') || row.querySelector('div[class*="message-"]') || row.firstElementChild || row) as HTMLElement;
                if (!bubble) return;

                // Asegurar posición relativa en la burbuja para anclar el badge
                const prevPosition = bubble.style.position;
                if (getComputedStyle(bubble).position === 'static') {
                    bubble.style.position = 'relative';
                }
                modifiedBubbles.push(bubble);

                // Badge circular de selección
                const badge = document.createElement('div');
                badge.className = 'tf-msg-select-badge';
                
                const updateBadgeVisual = (isSelected: boolean) => {
                    if (isSelected) {
                        badge.style.cssText = `
                            position: absolute !important;
                            top: 4px !important;
                            ${isIncoming ? 'right: 6px !important;' : 'left: 6px !important;'}
                            width: 22px !important;
                            height: 22px !important;
                            border-radius: 50% !important;
                            background-color: #9e1114 !important;
                            border: 2px solid #ffffff !important;
                            color: #ffffff !important;
                            font-size: 13px !important;
                            font-weight: 900 !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            box-shadow: 0 2px 8px rgba(158,17,20,0.5) !important;
                            cursor: pointer !important;
                            z-index: 100 !important;
                            user-select: none !important;
                        `;
                        badge.innerHTML = '✓';
                        bubble.style.outline = '2px solid #9e1114';
                        bubble.style.outlineOffset = '2px';
                    } else {
                        badge.style.cssText = `
                            position: absolute !important;
                            top: 4px !important;
                            ${isIncoming ? 'right: 6px !important;' : 'left: 6px !important;'}
                            width: 22px !important;
                            height: 22px !important;
                            border-radius: 50% !important;
                            background-color: rgba(255, 255, 255, 0.9) !important;
                            border: 2px solid #94a3b8 !important;
                            color: transparent !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
                            cursor: pointer !important;
                            z-index: 100 !important;
                            user-select: none !important;
                        `;
                        badge.innerHTML = '';
                        bubble.style.outline = 'none';
                    }
                };

                updateBadgeVisual(selectedMap.has(messageId));

                const toggleSelection = (e: Event) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (selectedMap.has(messageId)) {
                        selectedMap.delete(messageId);
                        updateBadgeVisual(false);
                    } else {
                        selectedMap.set(messageId, { id: messageId, text, sender: isIncoming ? 'them' : 'me' });
                        updateBadgeVisual(true);
                    }
                    onSelectionChange(Array.from(selectedMap.values()));
                };

                badge.addEventListener('click', toggleSelection);
                bubble.appendChild(badge);
                injectedBadges.push(badge);
            });
        };

        attachCheckboxes();
        const observer = new MutationObserver(() => attachCheckboxes());
        const main = document.querySelector(WA_SELECTORS.MAIN_CHAT);
        if (main) observer.observe(main, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            injectedBadges.forEach((b) => b.remove());
            document.querySelectorAll('.tf-msg-select-badge').forEach((el) => el.remove());
            modifiedBubbles.forEach((b) => {
                b.style.outline = 'none';
            });
            selectedMap.clear();
            onSelectionChange([]);
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