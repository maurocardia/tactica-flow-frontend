// src/services/dom.service.ts
import { WA_SELECTORS } from '@/config/constants';

export interface VisibleMessage {
    sender: 'me' | 'them';
    text: string;
    dateCategory?: 'today' | 'past';
}

let lastProcessedMessageId: string | null = null;
let messagesObserver: MutationObserver | null = null;
let watcherRetryInterval: number | null = null;
let lastSeenChatTitle: string | null = null;
const chatMessagesCache = new Map<string, { all: VisibleMessage[]; today: VisibleMessage[] }>();

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

    /**
     * Extrae el número de teléfono del chat abierto actualmente.
     */
    getChatPhone(contactName?: string): string | null {
        try {
            // 1. Buscar en todos los spans del header si alguno tiene formato de teléfono (+57 300 123 4567, etc.)
            const headerSpans = document.querySelectorAll('#main header span');
            for (const span of headerSpans) {
                const text = span.textContent?.trim() || '';
                const phoneMatch = text.match(/\+?(\d[\d\s\-()]{7,}\d)/);
                if (phoneMatch) {
                    const clean = phoneMatch[0].replace(/[^0-9]/g, '');
                    if (clean.length >= 8 && clean.length <= 18) {
                        return clean;
                    }
                }
            }

            // 2. Buscar en data-id / data-item-id de cualquier mensaje dentro de #main
            // En WhatsApp Web data-id puede tener @c.us o @s.whatsapp.net (ej: false_573001234567@c.us_...)
            const elementsWithDataId = document.querySelectorAll('#main [data-id], #main [data-item-id]');
            for (const el of elementsWithDataId) {
                const dataId = el.getAttribute('data-id') || el.getAttribute('data-item-id') || '';
                const match = dataId.match(/(\d{8,18})@(c\.us|s\.whatsapp\.net)/);
                if (match && match[1]) {
                    return match[1];
                }
            }

            // 3. Buscar en el panel lateral (#pane-side) el chat seleccionado o que coincida con contactName
            const listItems = document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]');
            for (const item of listItems) {
                const itemText = item.textContent || '';
                const isSelected = item.getAttribute('aria-selected') === 'true' || item.classList.contains('_ak72');
                const matchesName = contactName && itemText.toLowerCase().includes(contactName.toLowerCase());

                if (isSelected || matchesName) {
                    const dataId = item.getAttribute('data-id') || item.querySelector('[data-id]')?.getAttribute('data-id') || '';
                    const match = dataId.match(/(\d{8,18})@(c\.us|s\.whatsapp\.net)/);
                    if (match && match[1]) {
                        return match[1];
                    }
                    const img = item.querySelector('img') as HTMLImageElement | null;
                    if (img && img.src) {
                        const imgMatch = img.src.match(/[?&]u=(\d{8,18})%40/) || img.src.match(/[?&]u=(\d{8,18})@/);
                        if (imgMatch && imgMatch[1]) {
                            return imgMatch[1];
                        }
                    }
                }
            }

            // 4. Buscar en la foto de perfil del header (#main header img src contiene u=NUMERO%40c.us)
            const headerImgs = document.querySelectorAll('#main header img');
            for (const img of headerImgs) {
                const src = (img as HTMLImageElement).src || '';
                const match = src.match(/[?&]u=(\d{8,18})%40/) || src.match(/[?&]u=(\d{8,18})@/);
                if (match && match[1]) {
                    return match[1];
                }
            }
        } catch (err) {
            console.warn('[DOMService] Error al obtener teléfono del chat:', err);
        }
        return null;
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
     * Limpia la caché en memoria de un chat o de todos los chats.
     */
    clearChatCache(chatTitle?: string) {
        if (chatTitle) {
            chatMessagesCache.delete(chatTitle);
        } else {
            chatMessagesCache.clear();
        }
    },

    /**
     * Lee los mensajes con texto cargados en el chat abierto.
     * Incorpora un acumulador en memoria para que al hacer scroll hacia arriba el contador
     * de mensajes siga sumando y no disminuya cuando WhatsApp Web virtualiza los mensajes de abajo.
     */
    getVisibleMessages(filter?: 'today' | 'all'): VisibleMessage[] {
        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return [];

            const currentTitle = DOMService.getChatTitle() || 'default_chat';
            if (lastSeenChatTitle && lastSeenChatTitle !== currentTitle) {
                chatMessagesCache.delete(lastSeenChatTitle);
            }
            lastSeenChatTitle = currentTitle;

            const allElements = container.querySelectorAll('[data-id], [role="row"], div.focusable-list-item');
            const currentMessagesAll: VisibleMessage[] = [];
            const currentMessagesToday: VisibleMessage[] = [];
            let currentSectionDate: 'today' | 'past' = 'past'; // Default past

            const processedMsgIds = new Set<string>();

            allElements.forEach((el) => {
                const text = extractMessageText(el);

                // Si NO tiene texto de mensaje seleccionable, comprobamos si es un badge/separador de fecha
                if (!text) {
                    const rawBadge = el.textContent?.trim().toUpperCase() || '';
                    const firstWord = rawBadge.split('\n')[0].trim();
                    if (/^(HOY|TODAY)$/i.test(firstWord) || firstWord === 'HOY' || firstWord === 'TODAY') {
                        currentSectionDate = 'today';
                    } else if (
                        /^(AYER|YESTERDAY)$/i.test(firstWord) ||
                        /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(firstWord) ||
                        /^(LUNES|MARTES|MIÉRCOLES|MIERCOLES|JUEVES|VIERNES|SÁBADO|SABADO|DOMINGO)$/i.test(firstWord)
                    ) {
                        currentSectionDate = 'past';
                    }
                    return;
                }

                // Es un mensaje real
                const dataId = el.getAttribute('data-id') || el.closest('[data-id]')?.getAttribute('data-id') || '';
                if (dataId && processedMsgIds.has(dataId)) return;
                if (dataId) processedMsgIds.add(dataId);

                const isOutgoing =
                    dataId.startsWith('true_') ||
                    !!el.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT) ||
                    el.classList.contains('message-out') ||
                    !!el.querySelector('.message-out');

                const msg: VisibleMessage = {
                    sender: isOutgoing ? 'me' : 'them',
                    text,
                    dateCategory: currentSectionDate
                };

                currentMessagesAll.push(msg);

                if (currentSectionDate === 'today') {
                    currentMessagesToday.push(msg);
                }
            });

            // Obtener o inicializar caché del chat
            let chatCache = chatMessagesCache.get(currentTitle);
            if (!chatCache) {
                chatCache = { all: [], today: [] };
                chatMessagesCache.set(currentTitle, chatCache);
            }

            const mergeMessages = (cached: VisibleMessage[], current: VisibleMessage[]): VisibleMessage[] => {
                const seen = new Set<string>();
                const merged: VisibleMessage[] = [];

                for (const m of cached) {
                    const sig = `${m.sender}:${m.text.trim()}`;
                    if (!seen.has(sig)) {
                        seen.add(sig);
                        merged.push(m);
                    }
                }

                for (const m of current) {
                    const sig = `${m.sender}:${m.text.trim()}`;
                    if (!seen.has(sig)) {
                        seen.add(sig);
                        merged.push(m);
                    }
                }

                return merged;
            };

            chatCache.all = mergeMessages(chatCache.all, currentMessagesAll);
            chatCache.today = mergeMessages(chatCache.today, currentMessagesToday);

            return filter === 'today' ? chatCache.today : chatCache.all;
        } catch (err) {
            console.error('[DOMService] Error al leer los mensajes visibles del chat:', err);
            return [];
        }
    },

    /**
     * Detecta notas de voz y audios visibles en la conversación activa.
     */
    /**
     * Detecta notas de voz y audios visibles en la conversación activa (sin duplicados).
     */
    getVisibleAudios(): { id: string; sender: 'me' | 'them'; duration: string; src: string | null; timestamp?: string }[] {
        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT) || document.querySelector('#main');
            if (!container) return [];

            // Buscar todos los reproductores/botones de audio visibles
            const audioElements = container.querySelectorAll(
                'audio, [data-testid*="audio"], [data-testid*="ptt"], [data-testid*="waveform"], [data-icon*="ptt"], [data-icon*="audio"], [data-icon*="play"], button[aria-label*="reproducir" i], button[aria-label*="play" i], button[aria-label*="nota de voz" i], div._ak27, div._ak28, div._amjz, div._amjv'
            );

            const audios: { id: string; sender: 'me' | 'them'; duration: string; src: string | null; timestamp?: string }[] = [];
            const processedRows = new Set<Element>();
            const processedIds = new Set<string>();

            audioElements.forEach((el, index) => {
                // Localizar el mensaje contenedor más cercano
                const row = (
                    el.closest('div[data-id]') ||
                    el.closest('div[role="row"]') ||
                    el.closest('div.message-in, div.message-out') ||
                    el.closest('.copyable-text') ||
                    el
                ) as HTMLElement;

                if (!row || processedRows.has(row)) return;
                processedRows.add(row);

                // Generar o leer ID único y estamparlo
                const rawId = row.getAttribute('data-id');
                const rowId = rawId || `audio_item_${index}_${Date.now()}`;
                if (processedIds.has(rowId)) return;
                processedIds.add(rowId);

                row.setAttribute('data-tactica-audio-id', rowId);

                const isOutgoing =
                    rowId.startsWith('true_') ||
                    !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT) ||
                    row.classList.contains('message-out') ||
                    !!row.closest('.message-out') ||
                    !!row.querySelector('.message-out');

                // Extraer duración visible si existe (formato mm:ss)
                const durationMatch = row.textContent?.match(/(\d{1,2}:\d{2})/);
                const durationText = durationMatch ? durationMatch[1] : '0:15';

                // Extraer fecha/hora del timestamp del mensaje
                let timestamp: string | undefined;
                const tsEl = row.querySelector(
                    '[data-pre-plain-text], [aria-label*="Hoy"], span[class*="time"], span[class*="Time"], [data-testid*="msg-meta"] span, ._amk6 span, ._ao3e'
                );
                if (tsEl) {
                    const prePlain = tsEl.getAttribute('data-pre-plain-text');
                    if (prePlain) {
                        const m = prePlain.match(/\[([^\]]+)\]/);
                        if (m) timestamp = m[1];
                    } else {
                        const t = tsEl.textContent?.trim();
                        if (t && t.length < 30) timestamp = t;
                    }
                }
                if (!timestamp && rowId && rowId.includes('_')) {
                    const parts = rowId.split('_');
                    const epochMs = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(epochMs) && epochMs > 1_000_000_000_000) {
                        timestamp = new Date(epochMs).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        });
                    }
                }

                const directAudio = row.querySelector('audio') as HTMLAudioElement | null;
                const audioSrc =
                    directAudio?.currentSrc ||
                    directAudio?.src ||
                    directAudio?.querySelector('source')?.src ||
                    null;

                audios.push({
                    id: rowId,
                    sender: isOutgoing ? 'me' : 'them',
                    duration: durationText,
                    src: audioSrc,
                    timestamp
                });
            });

            return audios;
        } catch (err) {
            console.error('[DOMService] Error al detectar audios:', err);
            return [];
        }
    },

    /**
     * Extrae el contenido en Base64 de un audio específico en WhatsApp Web.
     * Si el audio aún no tiene su blob cargado, localiza su botón de reproducción,
     * silencia temporalmente el audio, dispara la reproducción/descarga y espera hasta capturar el blob.
     */
    async getAudioBase64(audioId: string, maxWaitMs: number = 15000): Promise<string> {
        // 1. Localizar el elemento del mensaje en el DOM
        let targetRow: HTMLElement | null =
            document.querySelector(`[data-tactica-audio-id="${audioId}"]`) ||
            document.querySelector(`[data-id="${audioId}"]`);

        if (!targetRow) {
            const main = document.querySelector(WA_SELECTORS.MAIN_CHAT) || document.querySelector('#main');
            const allAudioRows = main?.querySelectorAll('div[data-id], div[role="row"], div.message-in, div.message-out');
            if (allAudioRows) {
                for (let i = 0; i < allAudioRows.length; i++) {
                    const r = allAudioRows[i] as HTMLElement;
                    if (r.getAttribute('data-id') === audioId || r.getAttribute('data-tactica-audio-id') === audioId) {
                        targetRow = r;
                        break;
                    }
                }
            }
        }

        // 2. Verificar si ya hay un blob cargado en el elemento
        let blobUrl: string | null = null;
        if (targetRow) {
            const directAudio = targetRow.querySelector('audio') as HTMLAudioElement | null;
            if (directAudio && (directAudio.currentSrc || directAudio.src)) {
                const s = directAudio.currentSrc || directAudio.src;
                if (s.startsWith('blob:') || s.startsWith('data:')) {
                    blobUrl = s;
                }
            }
        }

        // 3. Si no está cargado, activar reproducción automática silenciosa para forzar la carga del blob
        if (!blobUrl) {
            // Guardar blobs existentes antes del clic para detectar el nuevo
            const existingBlobs = new Set(
                Array.from(document.querySelectorAll('audio'))
                    .map((a) => a.currentSrc || a.src)
                    .filter((s) => s && s.startsWith('blob:'))
            );

            // Silenciar todos los elementos de audio para evitar ruidos al transcribir
            document.querySelectorAll('audio').forEach((a) => {
                a.muted = true;
            });

            // Localizar el botón de Play del mensaje
            const playBtn = (targetRow || document.querySelector('#main'))?.querySelector(
                'button[aria-label*="play" i], button[aria-label*="reproducir" i], button[aria-label*="nota de voz" i], button[aria-label*="voice" i], [data-icon="play"], [data-icon="audio-play"], [data-icon="ptt-play"], [data-icon="play-theme"], [data-testid*="audio-play"], [data-testid*="ptt-play"], [data-testid*="play"], [role="button"][aria-label*="reproducir" i], [role="button"][aria-label*="play" i]'
            ) as HTMLElement | null;

            if (playBtn) {
                const clickable = (playBtn.closest('button, [role="button"]') || playBtn) as HTMLElement;
                clickable.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                clickable.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
                clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                clickable.click();
            }

            // Esperar polling hasta que WhatsApp cargue el blob
            const startTime = Date.now();
            while (Date.now() - startTime < maxWaitMs) {
                await new Promise((r) => setTimeout(r, 150));

                // Asegurar silencio
                document.querySelectorAll('audio').forEach((a) => {
                    a.muted = true;
                });

                // Revisar en el targetRow
                if (targetRow) {
                    const rowAudio = targetRow.querySelector('audio') as HTMLAudioElement | null;
                    if (rowAudio && (rowAudio.currentSrc || rowAudio.src)?.startsWith('blob:')) {
                        blobUrl = rowAudio.currentSrc || rowAudio.src;
                        rowAudio.pause();
                        break;
                    }
                }

                // Revisar en cualquier <audio> global del documento
                const allAudios = Array.from(document.querySelectorAll('audio'));
                const activeAudio = allAudios.find(
                    (a) =>
                        (a.currentSrc || a.src)?.startsWith('blob:') &&
                        (!a.paused || a.currentTime > 0 || !existingBlobs.has(a.currentSrc || a.src))
                );

                if (activeAudio) {
                    blobUrl = activeAudio.currentSrc || activeAudio.src;
                    activeAudio.pause();
                    break;
                }

                // Fallback: si hay algún blob nuevo en la página
                const anyNewBlob = allAudios.find(
                    (a) => (a.currentSrc || a.src)?.startsWith('blob:')
                );
                if (anyNewBlob) {
                    blobUrl = anyNewBlob.currentSrc || anyNewBlob.src;
                    anyNewBlob.pause();
                    break;
                }
            }

            // Pausar cualquier botón de pausa en el mensaje
            if (targetRow) {
                const pauseBtn = targetRow.querySelector(
                    '[data-icon*="pause"], button[aria-label*="pausar" i], button[aria-label*="pause" i]'
                ) as HTMLElement | null;
                if (pauseBtn) {
                    pauseBtn.click();
                }
            }

            // Restaurar sonido para que WhatsApp funcione con normalidad
            document.querySelectorAll('audio').forEach((a) => {
                a.muted = false;
            });
        }

        if (!blobUrl || !blobUrl.startsWith('blob:')) {
            throw new Error('No se pudo capturar el audio en el navegador. Por favor dale Play en WhatsApp Web y volvé a presionar Transcribir.');
        }

        return await this.convertBlobUrlToBase64(blobUrl);
    },

    /**
     * Convierte una URL de blob de audio del navegador a base64 para enviarla al backend.
     */
    async convertBlobUrlToBase64(blobUrl: string): Promise<string> {
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Error al descargar blob de audio (HTTP ${response.status})`);
        }
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
     * Activa el modo de selección interactivo: permite hacer clic directamente en cualquier burbuja
     * de mensaje para seleccionarla/deseleccionarla con un resalte visual limpio y sin tapar el texto.
     */
    enableMessageSelectionMode(onSelectionChange: (selectedMessages: { id: string; text: string; sender: 'me' | 'them' }[]) => void): () => void {
        const selectedMap = new Map<string, { id: string; text: string; sender: 'me' | 'them' }>();
        const cleanupListeners: (() => void)[] = [];

        const applySelectionVisual = (bubble: HTMLElement, isSelected: boolean) => {
            if (isSelected) {
                bubble.style.outline = '3px solid #9e1114';
                bubble.style.outlineOffset = '3px';
                bubble.style.boxShadow = '0 0 0 6px rgba(158, 17, 20, 0.2), 0 4px 12px rgba(158, 17, 20, 0.25)';
                bubble.style.transition = 'all 0.15s ease';
            } else {
                bubble.style.outline = '';
                bubble.style.outlineOffset = '';
                bubble.style.boxShadow = '';
                bubble.style.transition = '';
            }
        };

        const attachBubbleListeners = () => {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return;

            const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
            rows.forEach((row) => {
                const messageId = row.getAttribute('data-id');
                if (!messageId || row.getAttribute('data-tf-selectable') === 'true') return;

                const text = extractMessageText(row);
                if (!text) return;

                const isIncoming = !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_IN);
                const bubble = (row.querySelector(WA_SELECTORS.MESSAGE_CONTAINER) || row.querySelector('div.copyable-text') || row.querySelector('div[class*="message-"]') || row) as HTMLElement;
                if (!bubble) return;

                row.setAttribute('data-tf-selectable', 'true');
                bubble.style.cursor = 'pointer';

                const handleMouseEnter = () => {
                    if (!selectedMap.has(messageId)) {
                        bubble.style.outline = '2px dashed #9e1114';
                        bubble.style.outlineOffset = '2px';
                    }
                };

                const handleMouseLeave = () => {
                    if (!selectedMap.has(messageId)) {
                        bubble.style.outline = '';
                        bubble.style.outlineOffset = '';
                    }
                };

                const handleClick = (e: MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (selectedMap.has(messageId)) {
                        selectedMap.delete(messageId);
                        applySelectionVisual(bubble, false);
                    } else {
                        selectedMap.set(messageId, { id: messageId, text, sender: isIncoming ? 'them' : 'me' });
                        applySelectionVisual(bubble, true);
                    }
                    onSelectionChange(Array.from(selectedMap.values()));
                };

                bubble.addEventListener('mouseenter', handleMouseEnter);
                bubble.addEventListener('mouseleave', handleMouseLeave);
                bubble.addEventListener('click', handleClick, true);

                cleanupListeners.push(() => {
                    row.removeAttribute('data-tf-selectable');
                    bubble.style.cursor = '';
                    applySelectionVisual(bubble, false);
                    bubble.removeEventListener('mouseenter', handleMouseEnter);
                    bubble.removeEventListener('mouseleave', handleMouseLeave);
                    bubble.removeEventListener('click', handleClick, true);
                });
            });
        };

        attachBubbleListeners();
        const observer = new MutationObserver(() => attachBubbleListeners());
        const main = document.querySelector(WA_SELECTORS.MAIN_CHAT);
        if (main) observer.observe(main, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            cleanupListeners.forEach((cleanup) => cleanup());
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