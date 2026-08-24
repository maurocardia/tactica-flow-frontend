import React from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from '../components/Sidebar';
import { AppStateProvider } from '../state/AppStateContext';
import { ModalProvider } from '../state/ModalContext';
import { AuthProvider } from '../state/AuthContext';
import { mountWaHeaderStatus } from './waHeaderStatus';
import indexCss from '../index.css?inline';

const PANEL_WIDTH = 360;
const TOGGLE_EVENT = 'tactica-flow:toggle-panel';

let panelOpen = true;

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

function applyPanelState(hostDiv: HTMLElement, launcher: HTMLElement, open: boolean) {
    panelOpen = open;
    // `right` en vez de `transform`: un ancestro con `transform` pasa a ser el "containing
    // block" de cualquier descendiente `position: fixed` de adentro del Shadow DOM (los
    // modales usan `fixed inset-0`) — quedaban encerrados en la franja de 360px del panel en
    // vez de cubrir toda la pantalla. `right` no tiene ese efecto secundario.
    hostDiv.style.right = open ? '0' : `-${PANEL_WIDTH}px`;
    hostDiv.style.pointerEvents = open ? 'auto' : 'none';
    launcher.style.display = open ? 'none' : 'flex';
    setAppLayoutWidth(open);
}

function injectSidebar() {
    if (document.getElementById('tactica-flow-host')) return;

    // 1. Redimensionar el cuerpo de WhatsApp Web
    setAppLayoutWidth(true);

    // 2. Crear contenedor principal en el DOM
    const hostDiv = document.createElement('div');
    hostDiv.id = 'tactica-flow-host';
    hostDiv.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: ${PANEL_WIDTH}px !important;
    height: 100vh !important;
    z-index: 2147483647 !important;
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
    cursor: pointer !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35) !important;
    z-index: 2147483647 !important;
    overflow: hidden;
  `;
    const launcherIcon = document.createElement('img');
    launcherIcon.src = chrome.runtime.getURL('icons/icon.png');
    launcherIcon.alt = 'TACTICA';
    launcherIcon.style.cssText = 'width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 50% !important;';
    launcher.appendChild(launcherIcon);
    document.body.appendChild(launcher);

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
                <AppStateProvider>
                    <ModalProvider>
                        <Sidebar />
                    </ModalProvider>
                </AppStateProvider>
            </AuthProvider>
        </React.StrictMode>
    );

    // 8. Abrir/cerrar: botón flotante para abrir, evento disparado desde el Header de React para
    //    cerrar (el Header vive dentro del Shadow DOM, así que no puede tocar `launcher` directo).
    launcher.addEventListener('click', () => applyPanelState(hostDiv, launcher, true));
    window.addEventListener(TOGGLE_EVENT, () => applyPanelState(hostDiv, launcher, !panelOpen));

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
