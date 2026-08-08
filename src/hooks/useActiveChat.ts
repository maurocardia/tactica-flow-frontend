// src/hooks/useActiveChat.ts
import { useState, useEffect } from 'react';
import { DOMService } from '@/services/dom.service';

export const useActiveChat = () => {
    const [activeContact, setActiveContact] = useState<string>('Sin chat seleccionado');

    useEffect(() => {
        const updateContact = () => {
            try {
                const title = DOMService.getChatTitle();
                setActiveContact(title || 'Sin chat seleccionado');
            } catch (error) {
                console.error('[useActiveChat] Error actualizando contacto:', error);
            }
        };

        updateContact();
        const interval = setInterval(updateContact, 1000);

        const observer = new MutationObserver(updateContact);
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }

        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    return {
        activeContact,
        refreshChat: () => setActiveContact(DOMService.getChatTitle() || 'Sin chat seleccionado')
    };
};