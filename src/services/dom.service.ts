// src/services/dom.service.ts
import { WA_SELECTORS } from '@/config/constants';

export interface VisibleMessage {
    sender: 'me' | 'them';
    text: string;
    dateCategory?: 'today' | 'past';
    /** Fecha y hora reales del mensaje (leídas de data-pre-plain-text), si se pudieron parsear. */
    at?: Date;
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

/**
 * Fecha y hora REALES de un mensaje, leyendo `data-pre-plain-text` — WhatsApp lo pone en formato
 * "[H:MM a. m./p. m., D/M/AAAA] Remitente: " (usado hasta ahora solo para la hora, ver
 * getVisibleAudios) — acá se parsea completo (hora + fecha) para tener un timestamp real por
 * mensaje en vez de solo la categoría "hoy/pasado". Devuelve null si el formato no calza (puede
 * variar según el idioma configurado en WhatsApp) — quien llama debe tener un respaldo.
 */
function parseMessageDateTime(row: Element): Date | null {
    const prePlainEl = row.querySelector('[data-pre-plain-text]');
    const raw = prePlainEl?.getAttribute('data-pre-plain-text');
    if (!raw) return null;

    const match = raw.match(/\[(\d{1,2}):(\d{2})\s*([ap])\.?\s*\.?\s*m\.?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/i);
    if (!match) return null;

    const [, hhStr, mmStr, ap, ddStr, moStr, yyStr] = match;
    let hour = parseInt(hhStr, 10);
    const minute = parseInt(mmStr, 10);
    const isPM = ap.toLowerCase() === 'p';
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    const day = parseInt(ddStr, 10);
    const month = parseInt(moStr, 10) - 1;
    let year = parseInt(yyStr, 10);
    if (year < 100) year += 2000;

    const date = new Date(year, month, day, hour, minute, 0, 0);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Busca el ancestro real con scroll de un elemento (overflow-y auto/scroll y contenido más alto
 * que su alto visible) — en vez de adivinar una clase/selector fijo para el contenedor de
 * mensajes de WhatsApp (que cambia con actualizaciones), esto encuentra el que sea, sea cual sea
 * su clase. Usado por loadOlderMessages para saber qué elemento scrollear hacia arriba.
 */
function findScrollableAncestor(el: Element): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 10) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

// Tabla de códigos de país (E.164) con el largo TOTAL esperado del número (código de país +
// número de abonado, sin el "+") — sirve para distinguir un teléfono real de un identificador
// interno de WhatsApp (@lid) con pinta de número: los @lid observados en este proyecto son
// siempre de 14 a 16 dígitos y no calzan con NINGÚN código de país real a esa longitud exacta
// (ej. "148237239484423" no es un +1 482... de 15 dígitos porque +1 son 11 en total). No es
// una lista exhaustiva de los ~200 países — cubre los códigos más comunes para la región y
// algunos globales — pero alcanza para filtrar la inmensa mayoría de los falsos positivos sin
// bloquear números reales de países no listados (esos siguen aceptándose por el rango genérico
// de respaldo, ver looksLikeRealPhoneNumber).
const COUNTRY_CODE_LENGTHS: Record<string, number[]> = {
    '1': [11], // EE.UU./Canadá/Caribe angloparlante
    '52': [12, 13], // México (formato moderno 12; algunos todavía con el "1" extra, 13)
    '54': [12, 13], // Argentina (fijo 12; celular con el "9" insertado, 13)
    '55': [12, 13], // Brasil
    '56': [11], // Chile
    '57': [12], // Colombia
    '58': [12], // Venezuela
    '51': [11], // Perú
    '593': [12], // Ecuador
    '595': [12], // Paraguay
    '598': [11], // Uruguay
    '591': [11], // Bolivia
    '507': [11], // Panamá
    '506': [11], // Costa Rica
    '502': [11], // Guatemala
    '503': [11], // El Salvador
    '504': [11], // Honduras
    '505': [11], // Nicaragua
    '34': [11], // España
    '44': [12, 13], // Reino Unido
    '33': [11], // Francia
    '49': [12, 13], // Alemania
    '39': [12, 13], // Italia
    '91': [12], // India
    '27': [11], // Sudáfrica
};

/**
 * Además del chequeo por código de país (más preciso), acepta cualquier largo entre 8 y 15 —
 * el máximo real permitido por el estándar E.164 — para no bloquear países que no están en la
 * tabla de arriba. Un candidato que SÍ matchea un código de país conocido se prioriza sobre uno
 * que no, cuando hay que elegir entre varios encontrados en el mismo escaneo.
 */
function looksLikeRealPhoneNumber(digits: string): boolean {
    if (digits.length < 8 || digits.length > 15) return false;
    return true;
}

function matchesKnownCountryCode(digits: string): boolean {
    for (const [code, lengths] of Object.entries(COUNTRY_CODE_LENGTHS)) {
        if (digits.startsWith(code) && lengths.includes(digits.length)) return true;
    }
    return false;
}

/**
 * Deja el buscador de WhatsApp vacío y cierra el panel de resultados (Escape), para que después
 * de abrir un chat por búsqueda no quede visible el texto buscado ni la lista de resultados
 * pisando el chat recién abierto — se llama siempre al final de openChatByQuery, haya abierto o no.
 */
function clearSearch(searchInput: HTMLInputElement) {
    try {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
            nativeSetter.call(searchInput, '');
        } else {
            searchInput.value = '';
        }
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        const escInit: KeyboardEventInit = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
        searchInput.dispatchEvent(new KeyboardEvent('keydown', escInit));
        searchInput.dispatchEvent(new KeyboardEvent('keyup', escInit));
        searchInput.blur();
    } catch (err) {
        console.warn('[DOMService] No se pudo limpiar el buscador:', err);
    }
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
            // 1. Buscar en todos los spans del header si alguno tiene formato de teléfono (+57 300 123 4567,
            // etc.) — prioriza un candidato cuyo código de país+largo calcen con un país real (ver
            // matchesKnownCountryCode) sobre uno que solo "parece" un número por su longitud, así no se
            // confunde con un identificador interno de WhatsApp (@lid) que también tenga forma numérica.
            const headerSpans = document.querySelectorAll('#main header span');
            let genericPhoneMatch: string | null = null;
            for (const span of headerSpans) {
                const text = span.textContent?.trim() || '';
                const phoneMatch = text.match(/\+?(\d[\d\s\-()]{7,}\d)/);
                if (phoneMatch) {
                    const clean = phoneMatch[0].replace(/[^0-9]/g, '');
                    if (matchesKnownCountryCode(clean)) return clean;
                    if (!genericPhoneMatch && looksLikeRealPhoneNumber(clean)) genericPhoneMatch = clean;
                }
            }
            if (genericPhoneMatch) return genericPhoneMatch;

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

    /**
     * Respaldo de getChatPhone() para cuando el header no muestra el número a simple vista (ej.
     * contactos guardados con nombre y foto — confirmado a mano, ago-2026: el header de "Ángel
     * Univer" no trae ningún número, solo el nombre). Abre el panel "Información del perfil"
     * (clic en el mismo botón que usa un humano para ver los datos del contacto), busca ahí el
     * número real y, de paso, un nombre mejor que el que ya teníamos — de dos formas posibles:
     * (a) el nombre que la persona se puso a sí misma, que WhatsApp muestra como "~nombre" cuando
     * no es un contacto guardado (confirmado a mano: "+57 316 6140287" con "~samira" debajo), o
     * (b) para un perfil de EMPRESA (WhatsApp Business), el nombre real SIN "~" dentro de
     * `data-testid="business-top-card-name-title"` (confirmado a mano: "Hernan Seivane" / rubro
     * "Finanzas"). Cierra el panel de nuevo con el mismo botón para dejar la UI como estaba —
     * imperceptible, mismo criterio que el resto de la automatización de este archivo.
     */
    async getChatPhoneViaProfile(): Promise<{ phone: string | null; selfSetName: string | null }> {
        try {
            const infoButton = document.querySelector(
                '[data-testid="conversation-info-header"], div[aria-label="Información del perfil"][role="button"]'
            ) as HTMLElement | null;
            if (!infoButton) return { phone: null, selfSetName: null };

            infoButton.click();
            await new Promise((resolve) => setTimeout(resolve, 500));

            let phone: string | null = null;
            let selfSetName: string | null = null;
            let genericPhoneMatch: string | null = null;

            const businessNameEl = document.querySelector(
                '[data-testid="business-top-card-name-title"] span[data-testid="selectable-text"]'
            );
            const businessName = businessNameEl?.textContent?.trim();
            if (businessName) selfSetName = businessName;

            const scope = document.querySelector('#app') || document.body;
            const spans = scope.querySelectorAll('span');
            for (const span of spans) {
                if (span.closest('#pane-side')) continue; // ignorar la lista de chats de la izquierda
                const text = span.textContent?.trim() || '';

                if (!phone) {
                    const match = text.match(/\+?(\d[\d\s\-()]{7,}\d)/);
                    if (match) {
                        const clean = match[0].replace(/[^0-9]/g, '');
                        if (matchesKnownCountryCode(clean)) {
                            phone = clean;
                        } else if (!genericPhoneMatch && looksLikeRealPhoneNumber(clean)) {
                            genericPhoneMatch = clean;
                        }
                    }
                }

                if (!selfSetName && text.startsWith('~') && text.length > 1) {
                    selfSetName = text.slice(1).trim();
                }

                if (phone && selfSetName) break;
            }
            if (!phone) phone = genericPhoneMatch;

            // El mismo botón togglea el panel — lo volvemos a tocar para cerrarlo de nuevo.
            infoButton.click();
            await new Promise((resolve) => setTimeout(resolve, 200));

            return { phone, selfSetName };
        } catch (err) {
            console.warn('[DOMService] Error al leer los datos desde el panel de información del contacto:', err);
            return { phone: null, selfSetName: null };
        }
    },

    /**
     * Después de resolver un contacto en segundo plano (buscarlo, abrirlo, leer su número) hay que
     * dejar WhatsApp Web como estaba — no tiene sentido dejar abierto un chat que el usuario no
     * pidió ver. Un solo Escape cierra el panel de info si quedó abierto; un segundo Escape
     * deselecciona el chat y vuelve a la pantalla de inicio. Se usa SOLO en flujos de resolución
     * en segundo plano (agregar por nombre, contacto pendiente, alta desde el ícono del header,
     * recargar) — nunca en "abrir chat", donde el usuario sí quiere quedarse viendo esa charla.
     */
    async returnToHome(): Promise<void> {
        try {
            const escInit: KeyboardEventInit = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
            const pressEscape = () => {
                document.dispatchEvent(new KeyboardEvent('keydown', escInit));
                document.dispatchEvent(new KeyboardEvent('keyup', escInit));
            };
            pressEscape();
            await new Promise((resolve) => setTimeout(resolve, 200));
            pressEscape();
        } catch (err) {
            console.warn('[DOMService] Error al volver al inicio (Escape):', err);
        }
    },

    /**
     * Extrae el JID real (ej. "1203634...@g.us") del GRUPO abierto actualmente, leyendo el
     * `data-id` de sus mensajes — a diferencia de un contacto individual, dos grupos distintos
     * pueden tener EXACTAMENTE el mismo nombre visible (confirmado a mano: dos grupos separados
     * llamados "tactica flow"), así que matchear un grupo por nombre no es seguro. El JID real, en
     * cambio, es único de verdad — se usa en vez del nombre para saber con certeza a cuál de los
     * grupos homónimos corresponde el chat abierto.
     */
    getOpenGroupJid(): string | null {
        try {
            const elements = document.querySelectorAll('#main [data-id], #main [data-item-id]');
            for (const el of elements) {
                const dataId = el.getAttribute('data-id') || el.getAttribute('data-item-id') || '';
                const match = dataId.match(/(\d{8,20}(?:-\d+)?)@g\.us/);
                if (match && match[1]) {
                    return `${match[1]}@g.us`;
                }
            }
        } catch (err) {
            console.warn('[DOMService] Error al obtener el JID del grupo abierto:', err);
        }
        return null;
    },

    /**
     * Lee los nombres de los contactos INDIVIDUALES (sin grupos) ya renderizados en la lista de
     * chats — sin scrollear, solo lo que ya está en el DOM (normalmente entre 10 y 20 filas según
     * el alto de la ventana). Sirve para tener de entrada los contactos más recientes sin
     * necesidad de un scroll automático completo por las ~500 conversaciones.
     *
     * Excluir grupos acá es más difícil de lo que parece: un grupo SIN foto propia muestra el
     * ícono `ic-group-filled` (fácil de detectar), pero un grupo CON foto propia se ve igual que
     * un contacto individual — para esos, la señal que sí es confiable es que la vista previa del
     * último mensaje trae el nombre de quién lo mandó antes del texto ("Fulano: mensaje..."),
     * cosa que WhatsApp NUNCA hace en un chat individual.
     */
    getRecentIndividualContacts(limit: number = 10): string[] {
        try {
            const items = document.querySelectorAll(WA_SELECTORS.CHAT_ITEM);
            const names: string[] = [];
            const seen = new Set<string>();

            for (const item of items) {
                if (names.length >= limit) break;

                const titleEl = item.querySelector('span[dir="auto"][title]');
                const name = titleEl?.getAttribute('title')?.trim();
                if (!name || seen.has(name)) continue;

                const hasGroupIcon = Array.from(item.querySelectorAll('svg title')).some(
                    (t) => t.textContent === 'ic-group-filled'
                );
                const secondary = item.querySelector('[data-testid="cell-frame-secondary"]');
                const hasSenderPrefix = !!secondary && Array.from(secondary.querySelectorAll('span')).some(
                    (s) => s.textContent === ': ' || s.textContent === ': '
                );

                if (hasGroupIcon || hasSenderPrefix) continue; // es un grupo, no lo contamos

                seen.add(name);
                names.push(name);
            }

            return names;
        } catch (err) {
            console.error('[DOMService] Error al leer los contactos recientes:', err);
            return [];
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
            // Default "today", no "past": WhatsApp solo pinta un separador de fecha cuando el
            // historial visible SALTA de un día a otro — un chat donde todo lo cargado es de hoy
            // (charla reciente sin scrollear hacia atrás) no tiene ningún separador "HOY" que
            // detectar, y con el default en "past" esos mensajes quedaban mal etiquetados como
            // viejos (confirmado: rompía el resumen con IA en modo "Hoy", que sincronizaba esos
            // mensajes con una fecha falsa de hace 3 días y después no encontraba nada al filtrar).
            let currentSectionDate: 'today' | 'past' = 'today';

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

                const at = parseMessageDateTime(el) || undefined;

                const msg: VisibleMessage = {
                    sender: isOutgoing ? 'me' : 'them',
                    text,
                    dateCategory: currentSectionDate,
                    at
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
     * Scrollea el chat abierto hacia arriba para que WhatsApp vaya cargando mensajes más viejos
     * (lo mismo que hace un humano al subir con la rueda), recolectando cada tanda nueva a medida
     * que aparece — con su fecha REAL (ver parseMessageDateTime), no la aproximación de
     * "hoy/pasado". Llama a `onBatch` una vez por cada tanda nueva encontrada, para que quien
     * llame la pueda ir guardando en el backend sin esperar a que termine todo el scroll.
     *
     * Usa el contenedor real de scroll de los mensajes (WA_SELECTORS.MESSAGES_SCROLL_CONTAINER,
     * con fallback al ancestro con overflow si cambiara). Si WhatsApp deja de crecer el alto del
     * scroll entre dos pasadas, asume que llegó al principio del historial y corta ahí.
     *
     * `options.until`, si se pasa, corta el scroll apenas aparece un mensaje con fecha igual o
     * anterior a ese límite (ej. "hace 7 días") — sirve para no traer más historial del que hace
     * falta para el rango que pidió el usuario.
     */
    async loadOlderMessages(
        options: { maxSteps: number; until?: Date },
        onBatch: (newMessages: VisibleMessage[]) => void | Promise<void>
    ): Promise<{ batches: number; messagesLoaded: number; reachedStart: boolean; reachedThreshold: boolean }> {
        const { maxSteps, until } = options;
        let batches = 0;
        let messagesLoaded = 0;
        let reachedStart = false;
        let reachedThreshold = false;

        try {
            const container = document.querySelector(WA_SELECTORS.MAIN_CHAT);
            if (!container) return { batches, messagesLoaded, reachedStart: true, reachedThreshold: false };

            const firstRow = container.querySelector(WA_SELECTORS.MESSAGE_ROW);
            const scrollEl =
                document.querySelector<HTMLElement>(WA_SELECTORS.MESSAGES_SCROLL_CONTAINER) ||
                (firstRow ? findScrollableAncestor(firstRow) : null);
            if (!scrollEl) {
                console.warn('[DOMService] No se encontró el contenedor con scroll de los mensajes.');
                return { batches, messagesLoaded, reachedStart: true, reachedThreshold: false };
            }

            // Ya marcamos como "vistos" los mensajes que ya están cargados en pantalla, para no
            // volver a mandarlos en el primer lote.
            const seenIds = new Set<string>();
            container.querySelectorAll('[data-id]').forEach((el) => {
                const id = el.getAttribute('data-id');
                if (id) seenIds.add(id);
            });

            for (let i = 0; i < maxSteps; i++) {
                const beforeHeight = scrollEl.scrollHeight;
                scrollEl.scrollTop = 0;
                await new Promise((resolve) => setTimeout(resolve, 900));

                // Cuando WhatsApp agota el historial cacheado localmente muestra un botón propio
                // ("Haz clic aquí para obtener mensajes anteriores de tu teléfono") — sin clickearlo
                // el scroll por sí solo nunca trae más allá de lo que el navegador ya tenía cacheado.
                const loadMoreButton = Array.from(
                    scrollEl.querySelectorAll<HTMLButtonElement>(WA_SELECTORS.LOAD_OLDER_FROM_PHONE_BUTTON)
                ).find((btn) => btn.textContent?.includes('mensajes anteriores'));
                if (loadMoreButton) {
                    loadMoreButton.click();
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                }

                const afterHeight = scrollEl.scrollHeight;

                if (afterHeight <= beforeHeight) {
                    reachedStart = true;
                    break;
                }

                const rows = container.querySelectorAll(WA_SELECTORS.MESSAGE_ROW);
                const newOnes: VisibleMessage[] = [];
                rows.forEach((row) => {
                    const id = row.getAttribute('data-id');
                    if (!id || seenIds.has(id)) return;
                    seenIds.add(id);
                    const text = extractMessageText(row);
                    if (!text) return;
                    const isOutgoing =
                        id.startsWith('true_') ||
                        !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT) ||
                        row.classList.contains('message-out') ||
                        !!row.querySelector('.message-out');
                    const at = parseMessageDateTime(row) || undefined;
                    newOnes.push({ sender: isOutgoing ? 'me' : 'them', text, at });
                });

                if (newOnes.length > 0) {
                    await onBatch(newOnes);
                    batches++;
                    messagesLoaded += newOnes.length;
                }

                // Se guarda la tanda completa (aunque traiga algún mensaje más viejo que el límite)
                // pero se corta ahí — no hace falta seguir scrolleando más atrás del rango pedido.
                if (until) {
                    const oldestInBatch = newOnes.reduce<Date | null>((min, m) => {
                        if (!m.at) return min;
                        if (!min || m.at < min) return m.at;
                        return min;
                    }, null);
                    if (oldestInBatch && oldestInBatch <= until) {
                        reachedThreshold = true;
                        break;
                    }
                }
            }

            return { batches, messagesLoaded, reachedStart, reachedThreshold };
        } catch (err) {
            console.error('[DOMService] Error cargando mensajes más antiguos:', err);
            return { batches, messagesLoaded, reachedStart: true, reachedThreshold: false };
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

            // Buscar elementos de mensaje únicos (priorizando div[data-id] para evitar duplicados por anidamiento)
            let rows = container.querySelectorAll('div[data-id]');
            if (rows.length === 0) {
                rows = container.querySelectorAll('div[role="row"]');
            }
            if (rows.length === 0) {
                rows = container.querySelectorAll('div.message-in, div.message-out');
            }

            const audios: { id: string; sender: 'me' | 'them'; duration: string; src: string | null; timestamp?: string }[] = [];
            const processedIds = new Set<string>();

            rows.forEach((row, index) => {
                const audioElement = row.querySelector('audio') as HTMLAudioElement | null;
                const pttContainer = row.querySelector(
                    '[data-testid*="audio"], [data-testid*="ptt"], [data-testid*="waveform"], [data-icon*="ptt"], [data-icon*="audio"], [data-icon*="play"], button[aria-label*="reproducir" i], button[aria-label*="play" i], button[aria-label*="nota de voz" i], div._ak27, div._ak28, div._amjz, div._amjv'
                );

                if (audioElement || pttContainer) {
                    const rowId = row.getAttribute('data-id') || `audio_item_${index}`;
                    if (processedIds.has(rowId)) return;
                    processedIds.add(rowId);

                    (row as HTMLElement).setAttribute('data-tactica-audio-id', rowId);

                    const isOutgoing =
                        rowId.startsWith('true_') ||
                        !!row.querySelector(WA_SELECTORS.MESSAGE_TAIL_OUT) ||
                        row.classList.contains('message-out') ||
                        !!row.closest('.message-out') ||
                        !!row.querySelector('.message-out');

                    // Extraer duración (formato mm:ss)
                    const durationMatch = row.textContent?.match(/(\d{1,2}:\d{2})/);
                    const durationText = durationMatch ? durationMatch[1] : '0:15';

                    // Extraer hora/fecha exacta del mensaje
                    let timestamp: string | undefined;
                    const prePlainEl = row.querySelector('[data-pre-plain-text]');
                    if (prePlainEl) {
                        const prePlain = prePlainEl.getAttribute('data-pre-plain-text');
                        if (prePlain) {
                            const m = prePlain.match(/\[([^,\]]+)/);
                            if (m) timestamp = m[1].trim();
                        }
                    }
                    if (!timestamp) {
                        const metaEl = row.querySelector('[data-testid="msg-meta"] span, [data-testid="meta"] span, ._amk6 span, ._ao3e');
                        if (metaEl && metaEl.textContent) {
                            const t = metaEl.textContent.trim();
                            if (t && t.length < 20) timestamp = t;
                        }
                    }
                    if (!timestamp && rowId.includes('_')) {
                        const parts = rowId.split('_');
                        const epochMs = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(epochMs) && epochMs > 1_000_000_000_000) {
                            timestamp = new Date(epochMs).toLocaleString('es-AR', {
                                hour: '2-digit', minute: '2-digit'
                            });
                        }
                    }

                    const directAudio = audioElement || (row.querySelector('audio') as HTMLAudioElement | null);
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
     * Soporta Chrome MV3 con aislamiento de mundos mediante el bridge de la página principal.
     */
    async convertBlobUrlToBase64(blobUrl: string, timeoutMs: number = 8000): Promise<string> {
        if (!blobUrl || !blobUrl.startsWith('blob:')) {
            throw new Error('URL de audio inválida. Dale Play en WhatsApp Web y reintenta.');
        }

        // 1. Intentar primero con fetch directo en el contexto actual
        try {
            const response = await fetch(blobUrl);
            if (response.ok) {
                const blob = await response.blob();
                if (blob && !blob.type.includes('html') && blob.size > 100) {
                    return await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }
            }
        } catch {
            // El fetch directo falló por aislamiento de contexto en Chrome MV3; usar el puente del Main World
        }

        // 2. Usar el bridge del Main World mediante CustomEvent
        return new Promise<string>((resolve, reject) => {
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const timer = setTimeout(() => {
                window.removeEventListener('tactica:blob-response', handler as EventListener);
                reject(new Error('No se pudo descargar el audio del navegador. Por favor dale Play en WhatsApp y reintenta.'));
            }, timeoutMs);

            const handler = (e: any) => {
                if (e.detail && e.detail.requestId === requestId) {
                    clearTimeout(timer);
                    window.removeEventListener('tactica:blob-response', handler as EventListener);
                    if (e.detail.error) {
                        reject(new Error(e.detail.error));
                    } else if (e.detail.base64 && !e.detail.base64.startsWith('data:text/html')) {
                        resolve(e.detail.base64);
                    } else {
                        reject(new Error('Audio inválido retornado por el navegador'));
                    }
                }
            };

            window.addEventListener('tactica:blob-response', handler as EventListener);
            window.dispatchEvent(new CustomEvent('tactica:blob-request', {
                detail: { blobUrl, requestId }
            }));
        });
    },

    /**
     * Obtiene el Base64 de una nota de voz a partir de su ID de fila o su URL de blob.
     */
    async getAudioBase64(rowIdOrSrc: string): Promise<string> {
        let blobUrl = rowIdOrSrc && rowIdOrSrc.startsWith('blob:') ? rowIdOrSrc : null;

        if (!blobUrl) {
            const row = document.querySelector(`div[data-id="${rowIdOrSrc}"]`);
            if (row) {
                const audioEl = row.querySelector('audio') as HTMLAudioElement | null;
                blobUrl = audioEl?.currentSrc || audioEl?.src || audioEl?.querySelector('source')?.src || null;
            }
        }

        if (!blobUrl) {
            const detected = this.getVisibleAudios();
            const found = detected.find((a) => a.id === rowIdOrSrc);
            if (found && found.src) {
                blobUrl = found.src;
            }
        }

        if (!blobUrl) {
            const anyAudio = document.querySelector(WA_SELECTORS.MAIN_CHAT)?.querySelector('audio') as HTMLAudioElement | null;
            blobUrl = anyAudio?.currentSrc || anyAudio?.src || null;
        }

        return this.convertBlobUrlToBase64(blobUrl || '');
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
    },

    /**
     * Busca `query` (teléfono o nombre) en el buscador de WhatsApp Web y abre el primer chat que
     * aparezca — usado desde "Bot habilitado por contacto" para saltar directo a ese chat al
     * tocar su foto. Best-effort: si WhatsApp cambia el buscador o no hay resultados, no rompe
     * nada, solo devuelve false.
     *
     * Verificado a mano (ago-2026): el buscador NO es un `div[contenteditable]` como el resto de
     * los cuadros de texto de WhatsApp — es un `<input type="text">` real
     * (`aria-label="Buscar un chat o iniciar uno nuevo"`), y ni siquiera existe en el DOM hasta
     * que se hace clic en el ícono de lupa. Por eso primero hay que asegurarse de abrirlo, y
     * para escribirle el valor hay que usar el setter nativo de <input> en vez de
     * `el.value = ...` directo — React pisa ese setter en la instancia del elemento, así que
     * asignarlo directo no dispara su detección de cambios y el buscador no filtra nada.
     */
    async openChatByQuery(query: string): Promise<boolean> {
        try {
            const INPUT_SELECTOR = 'input[aria-label*="uscar" i], input[aria-label*="earch" i], input[data-tab="3"]';
            const ICON_SELECTOR = 'button[aria-label*="uscar" i], span[data-icon="search"], div[role="button"][aria-label*="uscar" i], button[aria-label*="earch" i]';

            let searchInput = document.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;

            if (!searchInput) {
                const searchIcon = document.querySelector(ICON_SELECTOR) as HTMLElement | null;
                if (!searchIcon) {
                    console.warn('[DOMService] No se encontró ni el buscador ni el ícono para abrirlo.');
                    return false;
                }
                searchIcon.click();
                await new Promise((resolve) => setTimeout(resolve, 300));
                searchInput = document.querySelector(INPUT_SELECTOR) as HTMLInputElement | null;
                if (!searchInput) {
                    console.warn('[DOMService] Se clickeó el ícono de búsqueda pero el buscador no apareció.');
                    return false;
                }
            }

            searchInput.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (nativeSetter) {
                nativeSetter.call(searchInput, query);
            } else {
                searchInput.value = query;
            }
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Reintentar por hasta ~1.5s en vez de una sola espera fija: WhatsApp puede tardar un
            // toque en filtrar la lista según qué tan pesada esté la vista en ese momento.
            let firstResult: HTMLElement | null = null;
            for (let attempt = 0; attempt < 6 && !firstResult; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                firstResult = document.querySelector(WA_SELECTORS.CHAT_ITEM) as HTMLElement | null;
            }
            if (!firstResult) {
                console.warn(`[DOMService] Se encontró el buscador pero ningún resultado para "${query}".`);
                clearSearch(searchInput);
                return false;
            }

            const titleBefore = DOMService.getChatTitle();

            // Un solo Enter en el buscador abre directo el primer resultado (así lo usaría una
            // persona). Si eso no cambió de chat, clickeamos el resultado a mano — probando primero
            // un botón/target interno de la fila (algunas filas de resultado, sobre todo dentro de
            // "Mensajes", envuelven el click real en un div[role="button"] anidado, no en el
            // listitem completo) y si no, la fila entera.
            const enterInit: KeyboardEventInit = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
            searchInput.dispatchEvent(new KeyboardEvent('keydown', enterInit));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', enterInit));
            await new Promise((resolve) => setTimeout(resolve, 300));

            let opened = DOMService.getChatTitle() !== titleBefore && DOMService.getChatTitle() !== null;
            if (!opened) {
                const clickTarget = (firstResult.querySelector('div[role="button"]') as HTMLElement | null) || firstResult;
                clickTarget.click();
                await new Promise((resolve) => setTimeout(resolve, 400));
                opened = DOMService.getChatTitle() !== titleBefore && DOMService.getChatTitle() !== null;
            }

            if (!opened) {
                console.warn(`[DOMService] Se encontró un resultado para "${query}" pero no se pudo confirmar que el chat se haya abierto.`);
            } else {
                console.log(`[DOMService] Chat abierto para "${query}".`);
            }

            // Ya sea que haya abierto o no, dejamos el buscador limpio (imperceptible) en vez de
            // que quede con el texto buscado y los resultados a la vista.
            clearSearch(searchInput);

            return opened;
        } catch (err) {
            console.error('[DOMService] Error al abrir el chat por búsqueda:', err);
            return false;
        }
    }
};