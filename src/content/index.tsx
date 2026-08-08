import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidebar from '../components/Sidebar';
import indexCss from '../index.css?inline';

function injectSidebar() {
    if (document.getElementById('tactica-flow-host')) return;

    // 1. Redimensionar el cuerpo de WhatsApp Web
    const appLayout = (document.querySelector('#app > div') || document.querySelector('#app')) as HTMLElement;
    if (appLayout) {
        appLayout.style.width = 'calc(100vw - 360px)';
        appLayout.style.float = 'left';
        appLayout.style.transition = 'width 0.2s ease';
    }

    // 2. Crear contenedor principal en el DOM
    const hostDiv = document.createElement('div');
    hostDiv.id = 'tactica-flow-host';
    hostDiv.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 360px !important;
    height: 100vh !important;
    z-index: 2147483647 !important;
    background-color: #ffffff !important;
    box-shadow: -2px 0 8px rgba(0,0,0,0.15) !important;
  `;

    document.body.appendChild(hostDiv);

    // 3. Crear Shadow Root para aislar los estilos
    const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

    // 4. Inyectar CSS de Tailwind en el Shadow Root
    const styleEl = document.createElement('style');
    styleEl.textContent = indexCss;
    shadowRoot.appendChild(styleEl);

    // 5. Contenedor interno para React
    const reactRootDiv = document.createElement('div');
    reactRootDiv.id = 'tactica-flow-root';
    reactRootDiv.style.height = '100%';
    shadowRoot.appendChild(reactRootDiv);

    // 6. Renderizar React
    const root = ReactDOM.createRoot(reactRootDiv);
    root.render(
        <React.StrictMode>
            <Sidebar />
        </React.StrictMode>
    );

    console.log("🚀 [Táctica Flow] Sidebar renderizado en Shadow DOM.");
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