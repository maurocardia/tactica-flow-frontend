export interface ActiveChatInfo {
    name: string;
    phoneOrDetails: string;
}

export function getActiveChatInfo(): ActiveChatInfo | null {
    // Selectores comunes de la cabecera de conversación en WhatsApp Web
    const headerTitleEl = document.querySelector('#main header div[role="button"] span[title]') ||
        document.querySelector('#main header span[title]');

    if (!headerTitleEl) return null;

    const name = headerTitleEl.getAttribute('title') || headerTitleEl.textContent || 'Desconocido';

    // Buscar subtexto si existe (ej. número o estado)
    const subTextEl = document.querySelector('#main header div[role="button"] span.selectable-text');
    const phoneOrDetails = subTextEl?.textContent || '';

    return { name, phoneOrDetails };
}

export function sendResponseToWhatsAppInput(text: string) {
    // Buscar la caja de texto editable de WhatsApp Web
    const messageInput = document.querySelector('#main footer div[contenteditable="true"]') as HTMLElement;

    if (messageInput) {
        messageInput.focus();
        // Insertar el texto vía execCommand para disparar los eventos internos de React/DraftJS de WA
        document.execCommand('insertText', false, text);
    }
}