// Inyecta los 4 íconos de estado (programados, alarma de pendientes, bot, secuencias) directo en
// el header REAL de WhatsApp Web — a propósito fuera del panel de Tactica (Shadow DOM), para que
// se vean como parte nativa de la conversación (estilo Blueticks) en vez de vivir adentro del
// panel lateral. Como está en un árbol de DOM totalmente distinto al de React, se comunica con
// el panel vía CustomEvent en `window` (ver components/ExternalBridge.tsx, que escucha/emite
// estos mismos eventos desde adentro del Shadow DOM).

const CONTAINER_ID = 'tactica-wa-status';
export const OPEN_MODAL_EVENT = 'tactica-flow:open-modal';
export const TOGGLE_BOT_EVENT = 'tactica-flow:toggle-bot';
export const STATUS_UPDATE_EVENT = 'tactica-flow:status-update';

type WaConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

interface StatusDetail {
    pendingCount: number;
    sequenceCount: number;
    botEnabled: boolean;
    waStatus: WaConnectionStatus;
}

let lastStatus: StatusDetail = { pendingCount: 0, sequenceCount: 0, botEnabled: true, waStatus: 'disconnected' };

const WA_STATUS_COLOR: Record<WaConnectionStatus, string> = {
    connected: '#25d366',
    connecting: '#f0a93a',
    qr_ready: '#f0a93a',
    disconnected: '#98a2a9',
};

const WA_STATUS_LABEL: Record<WaConnectionStatus, string> = {
    connected: 'Conectado',
    connecting: 'Conectando…',
    qr_ready: 'Esperando que escanees el código QR',
    disconnected: 'Desconectado',
};

function dispatchOpenModal(id: string, payload?: unknown) {
    window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT, { detail: { id, payload } }));
}

function makeIconButton(emoji: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.title = title;
    btn.type = 'button';
    btn.style.cssText = `
    position: relative; border: none; background: transparent; cursor: pointer;
    font-size: 17px; line-height: 1; padding: 4px; opacity: .72; font-family: inherit;
  `;
    btn.textContent = emoji;
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '.72'; });
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return btn;
}

function makeBadge(): HTMLSpanElement {
    const badge = document.createElement('span');
    badge.style.cssText = `
    display: none; position: absolute; top: -4px; right: -3px; background: #e8181e; color: #fff;
    font-size: 9px; font-weight: 700; border-radius: 8px; min-width: 14px; height: 14px;
    line-height: 14px; text-align: center; padding: 0 3px; font-family: sans-serif;
  `;
    return badge;
}

interface ContainerRefs {
    alarmBadge: HTMLSpanElement;
    seqBadge: HTMLSpanElement;
    botDot: HTMLSpanElement;
    waBtn: HTMLButtonElement;
    waDot: HTMLSpanElement;
}

function buildContainer(): { el: HTMLDivElement; refs: ContainerRefs } {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.style.cssText = 'display: flex; align-items: center; gap: 2px; margin-left: 6px;';

    const calBtn = makeIconButton('📅', 'Programados y secuencias', () => dispatchOpenModal('scheduled', { tab: 'msgs' }));

    const alarmBtn = makeIconButton('⏰', 'Mensajes programados pendientes', () => dispatchOpenModal('scheduled', { tab: 'msgs' }));
    const alarmBadge = makeBadge();
    alarmBtn.appendChild(alarmBadge);

    const botBtn = makeIconButton('🤖', 'Chatbot / autoatención — click para activar o pausar', () =>
        window.dispatchEvent(new CustomEvent(TOGGLE_BOT_EVENT))
    );
    const botDot = document.createElement('span');
    botDot.style.cssText = 'display:none; position:absolute; bottom:2px; right:2px; width:7px; height:7px; border-radius:50%; background:#25d366; border:1.5px solid #f0f2f5;';
    botBtn.appendChild(botDot);

    const seqBtn = makeIconButton('🔁', 'Secuencias activas', () => dispatchOpenModal('scheduled', { tab: 'secs' }));
    const seqBadge = makeBadge();
    seqBtn.appendChild(seqBadge);

    // Estado real de la sesión de WhatsApp (Baileys, backend) — a diferencia del botDot (on/off),
    // este punto siempre está visible y solo cambia de color según el estado real.
    const waBtn = makeIconButton('📱', 'WhatsApp (conexión real): desconectado', () => dispatchOpenModal('config'));
    const waDot = document.createElement('span');
    waDot.style.cssText = `position:absolute; bottom:2px; right:2px; width:7px; height:7px; border-radius:50%; background:${WA_STATUS_COLOR.disconnected}; border:1.5px solid #f0f2f5;`;
    waBtn.appendChild(waDot);

    container.append(calBtn, alarmBtn, botBtn, seqBtn, waBtn);
    return { el: container, refs: { alarmBadge, seqBadge, botDot, waBtn, waDot } };
}

const containerRefs = new WeakMap<HTMLDivElement, ContainerRefs>();

function applyStatus(container: HTMLDivElement, status: StatusDetail) {
    const refs = containerRefs.get(container);
    if (!refs) return;
    refs.alarmBadge.textContent = String(status.pendingCount);
    refs.alarmBadge.style.display = status.pendingCount > 0 ? 'block' : 'none';
    refs.seqBadge.textContent = String(status.sequenceCount);
    refs.seqBadge.style.display = status.sequenceCount > 0 ? 'block' : 'none';
    refs.botDot.style.display = status.botEnabled ? 'block' : 'none';
    refs.waDot.style.background = WA_STATUS_COLOR[status.waStatus];
    refs.waBtn.title = `WhatsApp (conexión real): ${WA_STATUS_LABEL[status.waStatus]}`;
}

export function mountWaHeaderStatus() {
    window.addEventListener(STATUS_UPDATE_EVENT, ((e: Event) => {
        lastStatus = (e as CustomEvent<StatusDetail>).detail;
        const existing = document.getElementById(CONTAINER_ID) as HTMLDivElement | null;
        if (existing) applyStatus(existing, lastStatus);
    }) as EventListener);

    // A propósito NO guarda una referencia al `#main`/`header` de un momento dado: al cambiar de
    // chat varias veces seguidas, WhatsApp a veces reemplaza el nodo `#main` entero (no solo sus
    // hijos) — un observer atado a esa referencia vieja queda escuchando un nodo muerto para
    // siempre y los íconos dejaban de reaparecer. Acá se vuelve a buscar todo desde cero en cada
    // chequeo, así que no importa si el nodo de abajo cambió.
    const tryInject = () => {
        const header = document.querySelector('#main header');
        if (!header || header.querySelector(`#${CONTAINER_ID}`)) return;
        const { el, refs } = buildContainer();
        containerRefs.set(el, refs);
        header.appendChild(el);
        applyStatus(el, lastStatus);
    };

    tryInject();

    // Observa un contenedor estable (el `body`, que WhatsApp nunca reemplaza) en vez de `#main`
    // directo — así el observer sigue vivo aunque `#main` se reemplace entero.
    const observer = new MutationObserver(() => tryInject());
    observer.observe(document.body, { childList: true, subtree: true });

    // Red de seguridad barata además del observer: si por lo que sea se pierde alguna transición
    // (el observer no dispara, o dispara antes de que el nuevo header termine de armarse), este
    // polling de baja frecuencia igual termina reinyectando los íconos.
    window.setInterval(tryInject, 2000);
}
