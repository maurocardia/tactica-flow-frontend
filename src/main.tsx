import React from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from './components/Sidebar';
import indexCss from './index.css?inline';

function mountSidebar() {
  if (document.getElementById('tactica-flow-root')) return;

  // 1. Redimensionar la vista general de WhatsApp
  const appContainer = (document.querySelector('#app > div') || document.querySelector('#app')) as HTMLElement;
  if (appContainer) {
    appContainer.style.width = 'calc(100% - 350px)';
    appContainer.style.position = 'relative';
  }

  // 2. Inyectar estilos
  const styleEl = document.createElement('style');
  styleEl.textContent = indexCss;
  document.head.appendChild(styleEl);

  // 3. Inyectar contenedor del Sidebar
  const container = document.createElement('div');
  container.id = 'tactica-flow-root';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.width = '350px';
  container.style.height = '100vh';
  container.style.zIndex = '999999';

  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Sidebar />
    </React.StrictMode>
  );

  console.log("✅ [Táctica Flow] Sidebar renderizado en el DOM");
}

// Bucle de reintentos
const interval = setInterval(() => {
  if (document.body) {
    mountSidebar();
    if (document.getElementById('tactica-flow-root')) {
      clearInterval(interval);
    }
  }
}, 500);