// src/hooks/useActiveChat.ts
import { useState, useEffect } from 'react';
import { DOMService } from '@/services/dom.service';
import { ApiService } from '@/services/api.service';
import { Conversation } from '@/types/conversation';





export const useActiveChat = () => {
    const [activeContact, setActiveContact] = useState<string>('Sin chat seleccionado');
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

    useEffect(() => {
        const updateContact = async () => {
            try {
                const title = DOMService.getChatTitle();
                if (title && title !== activeContact) {
                    setActiveContact(title);

                    // Opcional: Aquí podemos consultar al backend por la conversación que coincida con este nombre/teléfono
                    const conversations: Conversation[] = await ApiService.getConversations();
                    const found = conversations.find((c) => c.name === title || c.phone === title);
                    if (found) {
                        setActiveConversationId(found.id);
                    }
                }
            } catch (error) {
                console.error('[useActiveChat] Error actualizando contacto:', error);
            }
        };

        updateContact();
        const interval = setInterval(updateContact, 2000);

        return () => clearInterval(interval);
    }, [activeContact]);

    return {
        activeContact,
        activeConversationId,
        refreshChat: () => setActiveContact(DOMService.getChatTitle() || 'Sin chat seleccionado')
    };
};