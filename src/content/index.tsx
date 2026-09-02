import React from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from '../components/Sidebar';
import { AppStateProvider } from '../state/AppStateContext';
import { ModalProvider } from '../state/ModalContext';
import { AuthProvider } from '../state/AuthContext';
import { KnowledgeBaseProvider } from '../state/KnowledgeBaseContext';
import { WhatsappStatusProvider } from '../state/WhatsappStatusContext';
import { mountWaHeaderStatus } from './waHeaderStatus';
import indexCss from '../index.css?inline';

const PANEL_WIDTH = 360;
const TOGGLE_EVENT = 'tactica-flow:toggle-panel';
const MODAL_STATE_EVENT = 'tactica-flow:modal-state';
const LAUNCHER_SIZE = 48;
const LAUNCHER_POSITION_KEY = 'tactica_launcher_position';

let panelOpen = false;
// Si un modal se abrió desde los íconos inyectados en el header real de WhatsApp (ver
// waHeaderStatus.ts) mientras el panel estaba cerrado, necesitamos poder interactuar con ese
// modal aunque el panel siga "cerrado" — ver updatePointerEvents().
let modalOpen = false;

function setAppLayoutWidth(shrink: boolean) {
    const appLayout = (document.querySelector('#app > div') || document.querySelector('#app')) as HTMLElement | null;
    if (!appLayout) return;
    // Sin transition a propósito: `width` dispara layout (reflow) en cada frame de la animación,
    // y sobre el árbol completo de WhatsApp Web (con su lista de mensajes virtualizada) eso se
    // sentía lento/con tirones al abrir y cerrar. El panel en sí sigue deslizando suave porque
    // usa `transform` (no dispara reflow), así que el cambio de ancho de WhatsApp puede ser
    // instantáneo sin que se note feo.
    appLayout.style.width = shrink ? `calc(100vw - ${PANEL_WIDTH}px)` : '100vw';
    appLayout.style.float = 'left';
}

function injectWaGlobalStyles() {
    if (document.getElementById('tactica-flow-wa-styles')) return;
    const style = document.createElement('style');
    style.id = 'tactica-flow-wa-styles';
    style.textContent = `
        /* Asegurar que los menús desplegables contextuales de WhatsApp Web se vean con sombra limpia */
        div[role="menu"],
        div[data-animate-dropdown-item],
        div[data-js-context-menu] {
            box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        }
    `;
    document.head.appendChild(style);
}

function injectMainWorldBridge() {
    if (document.getElementById('tactica-flow-main-bridge')) return;
    const script = document.createElement('script');
    script.id = 'tactica-flow-main-bridge';
    script.textContent = `
        (function() {
            window.__tactica_audio_blobs = window.__tactica_audio_blobs || new Map();
            window.__tactica_last_audio_src = window.__tactica_last_audio_src || null;

            // Interceptar createObjectURL para registrar en memoria los blobs de audio de WhatsApp
            const origCreateObjectURL = URL.createObjectURL;
            URL.createObjectURL = function(obj) {
                const url = origCreateObjectURL.call(this, obj);
                if (obj instanceof Blob && !obj.type.includes('html')) {
                    window.__tactica_audio_blobs.set(url, obj);
                }
                return url;
            };

            // Interceptar reproducción de audio
            const origPlay = HTMLAudioElement.prototype.play;
            HTMLAudioElement.prototype.play = function() {
                const src = this.currentSrc || this.src;
                if (src && src.startsWith('blob:')) {
                    window.__tactica_last_audio_src = src;
                    window.dispatchEvent(new CustomEvent('tactica:audio-playing', { detail: { src } }));
                }
                return origPlay.call(this);
            };

            // Responder a peticiones de conversión de blob a base64
            window.addEventListener('tactica:blob-request', async (e) => {
                const { blobUrl, requestId } = e.detail || {};
                if (!requestId) return;

                try {
                    let blob = (blobUrl && blobUrl.startsWith('blob:')) ? window.__tactica_audio_blobs.get(blobUrl) : null;
                    if (!blob && blobUrl && blobUrl.startsWith('blob:')) {
                        try {
                            const res = await fetch(blobUrl);
                            blob = await res.blob();
                        } catch {}
                    }

                    if (!blob && window.__tactica_last_audio_src && window.__tactica_last_audio_src.startsWith('blob:')) {
                        blob = window.__tactica_audio_blobs.get(window.__tactica_last_audio_src);
                        if (!blob) {
                            try {
                                const res = await fetch(window.__tactica_last_audio_src);
                                blob = await res.blob();
                            } catch {}
                        }
                    }

                    if (!blob) {
                        // Buscar en todos los <audio> de la página que tengan blob
                        const audios = Array.from(document.querySelectorAll('audio'));
                        for (const a of audios) {
                            const s = a.currentSrc || a.src;
                            if (s && s.startsWith('blob:')) {
                                try {
                                    const res = await fetch(s);
                                    const b = await res.blob();
                                    if (b && !b.type.includes('html') && b.size > 100) {
                                        blob = b;
                                        break;
                                    }
                                } catch {}
                            }
                        }
                    }

                    if (!blob || blob.type.includes('html') || blob.size < 100) {
                        throw new Error('No se pudo encontrar el blob de audio en el navegador. Por favor dale Play en WhatsApp Web.');
                    }

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        window.dispatchEvent(new CustomEvent('tactica:blob-response', {
                            detail: { requestId, base64: reader.result }
                        }));
                    };
                    reader.onerror = (err) => {
                        window.dispatchEvent(new CustomEvent('tactica:blob-response', {
                            detail: { requestId, error: 'Error al leer blob: ' + (err?.message || 'Error') }
                        }));
                    };
                    reader.readAsDataURL(blob);
                } catch (err) {
                    window.dispatchEvent(new CustomEvent('tactica:blob-response', {
                        detail: { requestId, error: err?.message || 'Error al procesar audio' }
                    }));
                }
            });
        })();
    `;
    (document.head || document.documentElement).appendChild(script);
}

/**
 * Reposiciona dinámicamente cualquier menú desplegable nativo de WhatsApp Web
 * (menú del mensaje, selector de reacciones, adjuntos) si intenta abrirse hacia
 * la derecha dentro de los 360px ocupados por el panel lateral.
 */
function observeAndRepositionWaDropdowns() {
    const repositionElement = (el: HTMLElement) => {
        if (!panelOpen) return;
        const rect = el.getBoundingClientRect();
        const maxRight = window.innerWidth - PANEL_WIDTH - 12;
        if (rect.right > maxRight) {
            const overflow = rect.right - maxRight;
            const computedLeft = parseFloat(el.style.left) || rect.left;
            const newLeft = Math.max(10, computedLeft - overflow - 8);
            el.style.setProperty('left', `${newLeft}px`, 'important');
        }
    };

    const scanAndShift = () => {
        if (!panelOpen) return;
        const menus = document.querySelectorAll(
            'div[role="menu"], div[data-animate-dropdown-item], div[aria-label*="Reacc"], div[data-js-context-menu], div._ak8l'
        );
        menus.forEach((m) => {
            const el = (m.closest('div[style*="position: absolute"], div[style*="position: fixed"]') || m) as HTMLElement;
            repositionElement(el);
        });
    };

    // 1. Escuchar mutaciones del DOM cuando WhatsApp monta un menú
    const observer = new MutationObserver(() => {
        if (!panelOpen) return;
        scanAndShift();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 2. Escuchar clics en el chat para ajustar en el frame exacto de apertura
    document.addEventListener('click', () => {
        if (!panelOpen) return;
        requestAnimationFrame(scanAndShift);
        setTimeout(scanAndShift, 10);
        setTimeout(scanAndShift, 50);
        setTimeout(scanAndShift, 150);
    }, true);
}

// El host completo (panel + cualquier modal que renderice adentro) solo debe interceptar clics
// cuando hace falta: con el panel abierto siempre, y con el panel cerrado únicamente si hay un
// modal abierto encima (si no, `pointer-events: none` deja pasar los clics hacia WhatsApp).
function updatePointerEvents(hostDiv: HTMLElement) {
    hostDiv.style.pointerEvents = panelOpen || modalOpen ? 'auto' : 'none';
    hostDiv.style.zIndex = modalOpen ? '2147483647' : '10000';
}

function clampLauncherTop(top: number) {
    const maxTop = window.innerHeight - LAUNCHER_SIZE - 4;
    return Math.min(Math.max(4, top), Math.max(4, maxTop));
}

// Mantiene el botón siempre pegado al lateral derecho (`right` fijo) — lo único que cambia es
// `top`, así se desliza de arriba a abajo por el borde en vez de poder soltarse por cualquier
// lado de la pantalla.
function applyLauncherTop(launcher: HTMLElement, top: number) {
    launcher.style.setProperty('top', `${clampLauncherTop(top)}px`, 'important');
}

// Deja el botón flotante deslizable verticalmente por el lateral: mousedown arranca el
// seguimiento, mousemove lo mueve en vivo (con una transición corta para que se sienta fluido en
// vez de saltar de golpe), y mouseup decide si fue un CLIC (abre el panel) o un ARRASTRE (guarda
// la nueva posición) según cuánto se movió el mouse.
const LAUNCHER_TRANSITION = 'top 0.12s ease-out, transform 0.15s ease, box-shadow 0.15s ease';

function makeLauncherDraggable(launcher: HTMLElement, onClick: () => void) {
    let dragging = false;
    let moved = false;
    let startY = 0;
    let startTop = 0;

    launcher.addEventListener('mousedown', (e) => {
        dragging = true;
        moved = false;
        startY = e.clientY;
        startTop = launcher.getBoundingClientRect().top;
        // Sin transición mientras se arrastra activamente: el mouse ya se mueve suave frame a
        // frame, y agregarle un delay encima solo lo haría sentir atrasado respecto al cursor.
        // Se usa setProperty con "important" porque el estilo base también lo trae con
        // "important" — un `style.transition = 'none'` normal no le habría ganado.
        launcher.style.setProperty('transition', 'none', 'important');
        launcher.classList.add('tactica-launcher-dragging');
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dy = e.clientY - startY;
        if (Math.abs(dy) > 4) moved = true;
        if (moved) applyLauncherTop(launcher, startTop + dy);
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        // Al soltar sí queremos la transición: acompaña el pequeño ajuste de "asentado" (por el
        // clamp a los bordes) y el regreso de la escala/sombra con una animación suave.
        launcher.style.setProperty('transition', LAUNCHER_TRANSITION, 'important');
        launcher.classList.remove('tactica-launcher-dragging');
        if (moved) {
            const rect = launcher.getBoundingClientRect();
            try {
                chrome.storage.local.set({ [LAUNCHER_POSITION_KEY]: { top: rect.top } });
            } catch {}
        } else {
            onClick();
        }
    });

    // Si la ventana cambia de tamaño, reacomoda el botón por si quedó fuera de la pantalla.
    window.addEventListener('resize', () => {
        const rect = launcher.getBoundingClientRect();
        if (rect.width === 0) return; // launcher oculto (panel abierto)
        applyLauncherTop(launcher, rect.top);
    });
}

function applyPanelState(hostDiv: HTMLElement, launcher: HTMLElement, open: boolean) {
    panelOpen = open;
    // `right` en vez de `transform`: un ancestro con `transform` pasa a ser el "containing
    // block" de cualquier descendiente `position: fixed` de adentro del Shadow DOM (los
    // modales usan `fixed inset-0`) — quedaban encerrados en la franja de 360px del panel en
    // vez de cubrir toda la pantalla. `right` no tiene ese efecto secundario.
    hostDiv.style.right = open ? '0' : `-${PANEL_WIDTH}px`;
    updatePointerEvents(hostDiv);
    launcher.style.display = open ? 'none' : 'flex';
    setAppLayoutWidth(open);
}

function injectSidebar() {
    if (document.getElementById('tactica-flow-host')) return;

    injectWaGlobalStyles();
    injectMainWorldBridge();
    observeAndRepositionWaDropdowns();

    // 2. Crear contenedor principal en el DOM
    const hostDiv = document.createElement('div');
    hostDiv.id = 'tactica-flow-host';
    hostDiv.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: ${PANEL_WIDTH}px !important;
    height: 100vh !important;
    z-index: 10000 !important;
    background-color: #ffffff !important;
    box-shadow: -2px 0 8px rgba(0,0,0,0.15) !important;
    transition: right 0.2s ease !important;
  `;

    document.body.appendChild(hostDiv);

    // 3. Botón flotante para reabrir el panel cuando está cerrado (vive fuera del Shadow DOM a
    //    propósito: si el panel se oculta, un botón adentro del mismo host también quedaría oculto).
    const launcher = document.createElement('button');
    launcher.id = 'tactica-flow-launcher';
    launcher.title = 'Abrir TACTICA · WA Sync';
    launcher.style.cssText = `
    display: none;
    position: fixed !important;
    right: 16px !important;
    bottom: 16px !important;
    width: 48px !important;
    height: 48px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    border: none !important;
    background: #ffffff !important;
    align-items: center;
    justify-content: center;
    cursor: grab !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35) !important;
    z-index: 2147483647 !important;
    overflow: hidden;
    transition: ${LAUNCHER_TRANSITION} !important;
  `;
    // Estado "agarrado" mientras se arrastra: un poco más grande y con más sombra, para que se
    // sienta como que lo estás levantando en vez de solo teletransportarlo por la pantalla.
    if (!document.getElementById('tactica-flow-launcher-style')) {
        const dragStyle = document.createElement('style');
        dragStyle.id = 'tactica-flow-launcher-style';
        dragStyle.textContent = `
            #tactica-flow-launcher.tactica-launcher-dragging {
                cursor: grabbing !important;
                transform: scale(1.12) !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.45) !important;
            }
        `;
        document.head.appendChild(dragStyle);
    }
    const launcherIcon = document.createElement('img');
    launcherIcon.src = chrome.runtime.getURL('icons/icon.png');
    launcherIcon.alt = 'TACTICA';
    launcherIcon.style.cssText = 'width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 50% !important;';
    launcher.appendChild(launcherIcon);
    document.body.appendChild(launcher);

    // Restaura la posición donde el usuario lo haya dejado arrastrado la última vez — si nunca lo
    // movió, se queda en el lateral inferior derecho de siempre.
    try {
        chrome.storage.local.get([LAUNCHER_POSITION_KEY], (result: any) => {
            const saved = result?.[LAUNCHER_POSITION_KEY];
            if (saved && typeof saved.top === 'number') {
                applyLauncherTop(launcher, saved.top);
            }
        });
    } catch {}

    // Arranca cerrado: aplica de una el estado "cerrado" (right negativo, pointer-events:none,
    // launcher visible, ancho completo para WhatsApp) en vez de nacer abierto y tener que
    // cerrarlo a mano cada vez.
    applyPanelState(hostDiv, launcher, false);

    // 4. Crear Shadow Root para aislar los estilos
    const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

    // 5. Inyectar CSS de Tailwind en el Shadow Root
    const styleEl = document.createElement('style');
    styleEl.textContent = indexCss;
    shadowRoot.appendChild(styleEl);

    // 6. Contenedor interno para React
    const reactRootDiv = document.createElement('div');
    reactRootDiv.id = 'tactica-flow-root';
    reactRootDiv.style.height = '100%';
    shadowRoot.appendChild(reactRootDiv);

    // 7. Renderizar React
    const root = createRoot(reactRootDiv);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <WhatsappStatusProvider>
                    <AppStateProvider>
                        <KnowledgeBaseProvider>
                            <ModalProvider>
                                <Sidebar />
                            </ModalProvider>
                        </KnowledgeBaseProvider>
                    </AppStateProvider>
                </WhatsappStatusProvider>
            </AuthProvider>
        </React.StrictMode>
    );

    // 8. Abrir/cerrar: botón flotante para abrir, evento disparado desde el Header de React para
    //    cerrar (el Header vive dentro del Shadow DOM, así que no puede tocar `launcher` directo).
    makeLauncherDraggable(launcher, () => applyPanelState(hostDiv, launcher, true));
    window.addEventListener(TOGGLE_EVENT, () => applyPanelState(hostDiv, launcher, !panelOpen));

    // Un modal abierto desde los íconos del header real de WhatsApp (ver waHeaderStatus.ts)
    // necesita poder tocarse/cerrarse aunque el panel esté cerrado — ver ExternalBridge.tsx,
    // que avisa acá cada vez que cambia si hay un modal activo.
    window.addEventListener(MODAL_STATE_EVENT, (e) => {
        modalOpen = !!(e as CustomEvent<{ open: boolean }>).detail?.open;
        updatePointerEvents(hostDiv);
    });

    import('../config/env').then(({ IS_CLOUD_DEV, IS_LOCAL_DEV, API_URL }) => {
        console.log(`🚀 [Táctica Flow] Sidebar renderizado en Shadow DOM. API: ${API_URL} (Cloud: ${IS_CLOUD_DEV}, Local: ${IS_LOCAL_DEV})`);
    });
}

// Escuchador de mensajes seguro (responde inmediatamente para evitar cerrar el canal)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHECK_STATUS') {
        const isMounted = !!document.getElementById('tactica-flow-host');
        sendResponse({
            success: true,
            status: isMounted ? 'Conectado' : 'Desconectado',
        });
        return true; // Canal abierto respondiendo de inmediato
    }
    return false;
});

// Bucle de inicialización
const interval = setInterval(() => {
    if (document.body) {
        injectSidebar();
        if (document.getElementById('tactica-flow-host')) {
            clearInterval(interval);
        }
    }
}, 500);

// Íconos de estado inyectados directo en el header real de WhatsApp (fuera del panel) — ver
// content/waHeaderStatus.ts. Independiente del loop de arriba: no depende de que el panel ya
// esté montado, solo de que exista #main.
mountWaHeaderStatus();
