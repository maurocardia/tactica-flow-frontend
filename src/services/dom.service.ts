// src/services/dom.service.ts
import { WA_SELECTORS } from '@/config/constants';

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
                return true;
            }
        } catch (err) {
            console.error('[DOMService] Error al insertar mensaje:', err);
        }
        return false;
    }
};