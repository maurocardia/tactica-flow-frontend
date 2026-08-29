// src/services/api.service.ts

import { BotContact } from "@/types/botContact";
import { KeywordRule, KeywordRuleInput, BotFlowData } from "@/types/bot";
import { KnowledgeBase, KnowledgeBaseInput, KnowledgeDocument } from "@/types/knowledgeBase";
import { AuthUser } from "@/types/auth";
import { WhatsappStatusResponse } from "@/types/whatsapp";
import { API_URL } from '../config/env';
import { getStoredToken } from './authStorage.service';

export const ApiService = {
    async sendBackgroundRequest<T>(endpoint: string, method = 'GET', body?: any): Promise<T> {
        const token = await getStoredToken();

        return new Promise<T>((resolve, reject) => {
            if (!chrome.runtime?.id) {
                return reject(new Error('Contexto de extensión no disponible'));
            }

            chrome.runtime.sendMessage(
                {
                    type: 'FETCH_API',
                    payload: { endpoint, method, body, token },
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        return reject(new Error(chrome.runtime.lastError.message));
                    }
                    if (response?.success) {
                        resolve(response.data as T);
                    } else {
                        reject(new Error(response?.error || 'Error en la petición a la API'));
                    }
                }
            );
        });
    },

    // === AUTENTICACIÓN (Google OAuth, Issue #6) ===

    // El login en sí pasa por el mensaje GOOGLE_SIGN_IN (ver background/index.ts y
    // services/googleAuth.service.ts) — necesita chrome.identity, que no existe en el content
    // script. Este método queda para reconsultar el usuario actual con el JWT ya guardado.
    async getMe(): Promise<AuthUser> {
        return this.sendBackgroundRequest<AuthUser>('/auth/me');
    },

    // === WHATSAPP REAL (Baileys, por usuario autenticado) ===

    async whatsappConnect(): Promise<{ status: string }> {
        return this.sendBackgroundRequest<{ status: string }>('/whatsapp/connect', 'POST');
    },

    async whatsappDisconnect(): Promise<{ status: string }> {
        return this.sendBackgroundRequest<{ status: string }>('/whatsapp/disconnect', 'POST');
    },

    async whatsappStatus(): Promise<WhatsappStatusResponse> {
        return this.sendBackgroundRequest<WhatsappStatusResponse>('/whatsapp/status');
    },

    async whatsappQr(): Promise<{ qr: string }> {
        return this.sendBackgroundRequest<{ qr: string }>('/whatsapp/qr');
    },

    // Switch "Habilitar bot" del panel: apaga/enciende el auto-responder también para la sesión
    // real de Baileys (ver botEnabled en whatsapp.service.ts) — no solo el motor por DOM.
    async setBotEnabled(enabled: boolean): Promise<{ botEnabled: boolean }> {
        return this.sendBackgroundRequest<{ botEnabled: boolean }>('/whatsapp/bot-enabled', 'PUT', { enabled });
    },

    // Switch "Responder con IA" del panel: si ninguna regla de palabra clave matchea, decide si
    // el bot cae al agente de IA (true) o no manda ninguna respuesta automática (false) — ver
    // aiFallbackEnabled en botEngine.service.ts.
    async setAiFallbackEnabled(enabled: boolean): Promise<{ aiFallbackEnabled: boolean }> {
        return this.sendBackgroundRequest<{ aiFallbackEnabled: boolean }>('/whatsapp/ai-fallback-enabled', 'PUT', { enabled });
    },

    // Prompt/instrucciones de comportamiento personalizadas para el Agente IA (bot real de
    // WhatsApp): texto libre que el backend inyecta en el system prompt junto con la Base de
    // Conocimiento activa — ver AIService.processMessage.
    async setAiCustomInstructions(instructions: string): Promise<{ aiCustomInstructions: string }> {
        return this.sendBackgroundRequest<{ aiCustomInstructions: string }>('/whatsapp/ai-custom-instructions', 'PUT', { instructions });
    },

    // Switch "Activar el bot para contactos nuevos": si está prendido, un contacto que escribe por
    // primera vez arranca con el switch de bot YA activado (en vez de apagado) en bot_contacts.
    async setBotEnabledForNewContacts(enabled: boolean): Promise<{ botEnabledForNewContacts: boolean }> {
        return this.sendBackgroundRequest<{ botEnabledForNewContacts: boolean }>('/whatsapp/bot-enabled-for-new-contacts', 'PUT', { enabled });
    },

    // "Responder a todos" vs "Responder a contactos seleccionados": con "todos" prendido, el bot
    // le responde a cualquier contacto sin importar el switch de "Bot habilitado por contacto".
    async setBotReplyToAll(enabled: boolean): Promise<{ botReplyToAll: boolean }> {
        return this.sendBackgroundRequest<{ botReplyToAll: boolean }>('/whatsapp/bot-reply-to-all', 'PUT', { enabled });
    },

    // === ENDPOINTS DE LA RAMA 5-base-chatbot ===

    // `userId` filtra por cuenta de WhatsApp conectada — sin esto, si hay más de una sesión
    // conectada al backend, la lista mezcla contactos de cuentas distintas.
    async getConversations(userId?: number): Promise<Conversation[]> {
        return this.sendBackgroundRequest<Conversation[]>(userId ? `/conversations?userId=${userId}` : '/conversations');
    },

    // === "Bot habilitado por contacto" (tabla bot_contacts, separada de conversations/messages) ===

    // Lista propia de contactos/grupos administrables para el switch de bot por contacto — un
    // grupo es una sola fila acá, y nunca toca el historial real de chats.
    async getBotContacts(): Promise<BotContact[]> {
        return this.sendBackgroundRequest<BotContact[]>('/whatsapp/bot-contacts');
    },

    async setBotContactEnabled(id: number, enabled: boolean): Promise<BotContact> {
        return this.sendBackgroundRequest<BotContact>(`/whatsapp/bot-contacts/${id}/enabled`, 'PUT', { enabled });
    },

    // Botón "X" del panel: borra un contacto/grupo puntual de la lista (solo bot_contacts, nunca
    // toca conversations/messages).
    async deleteBotContact(id: number): Promise<void> {
        return this.sendBackgroundRequest<void>(`/whatsapp/bot-contacts/${id}`, 'DELETE');
    },

    // Registra (o encuentra) un número de teléfono como contacto administrable, sin esperar a que
    // ese número le escriba primero al bot.
    async addBotContact(phone: string, name: string | undefined, enabled: boolean): Promise<BotContact> {
        return this.sendBackgroundRequest<BotContact>('/whatsapp/bot-contacts', 'POST', { phone, name, enabled });
    },

    // "Recargar" un contacto puntual (botón de refrescar en el panel) — corrige el JID/nombre de
    // una fila ya existente que quedó mal agregada (ej. con un @lid viejo en vez del número real).
    async refreshBotContactIdentity(id: number, phone: string, name: string): Promise<BotContact> {
        return this.sendBackgroundRequest<BotContact>(`/whatsapp/bot-contacts/${id}/identity`, 'PUT', { phone, name });
    },

    // Sincronización manual de una sola vez (ver ContactBotSwitchesModal, que la llama solo la
    // primera vez que se abre el panel en la sesión): relee grupos y nombres de contacto que
    // Baileys ya sabe pero que todavía no habían quedado guardados en bot_contacts. Devuelve la
    // lista ya actualizada.
    async syncBotContacts(): Promise<BotContact[]> {
        return this.sendBackgroundRequest<BotContact[]>('/whatsapp/bot-contacts/sync', 'POST');
    },

    // Intenta resolver el JID real de nombres tal cual los muestra WhatsApp (ej. los ya
    // renderizados en la lista de chats, ver DOMService.getRecentIndividualContacts) cruzando
    // contra lo que el backend ya sabe (sin llamar a WhatsApp). Los que resuelve quedan sembrados
    // en bot_contacts del lado del backend — este método solo informa el resultado por nombre.
    async resolveBotContactsByName(
        names: string[]
    ): Promise<{ name: string; jid: string | null; source: 'known-contact' | 'conversations' | 'unresolved' }[]> {
        return this.sendBackgroundRequest('/whatsapp/bot-contacts/resolve-names', 'POST', { names });
    },

    async getMessages(conversationId: string | number): Promise<ConversationMessage[]> {
        return this.sendBackgroundRequest<ConversationMessage[]>(`/conversations/${conversationId}/messages`);
    },

    async sendMessage(conversationId: string | number, text: string, sender: 'agent' | 'customer' = 'agent'): Promise<any> {
        return this.sendBackgroundRequest<any>(`/conversations/${conversationId}/messages`, 'POST', { text, sender });
    },

    async testBotReply(message: string): Promise<any> {
        return this.sendBackgroundRequest<any>('/bot/reply', 'POST', { message });
    },

    // Va directo al agente de IA (/ai/chat → AIService.processMessage), sin pasar por el
    // matcheo de reglas de palabra clave del bot de atención al cliente. Para utilidades de IA
    // del panel (resumir, redactar) en vez de simular un mensaje entrante de un cliente.
    async aiChat(message: string): Promise<{ reply: string }> {
        return this.sendBackgroundRequest<{ reply: string }>('/ai/chat', 'POST', { message });
    },

    async getBotRules(): Promise<KeywordRule[]> {
        return this.sendBackgroundRequest<KeywordRule[]>('/bot/rules');
    },

    async createBotRule(data: KeywordRuleInput): Promise<KeywordRule> {
        return this.sendBackgroundRequest<KeywordRule>('/bot/rules', 'POST', data);
    },

    async updateBotRule(id: string, data: Partial<KeywordRuleInput>): Promise<KeywordRule> {
        return this.sendBackgroundRequest<KeywordRule>(`/bot/rules/${id}`, 'PUT', data);
    },

    async deleteBotRule(id: string): Promise<void> {
        return this.sendBackgroundRequest<void>(`/bot/rules/${id}`, 'DELETE');
    },

    async getBotFlow(): Promise<BotFlowData | null> {
        return this.sendBackgroundRequest<BotFlowData | null>('/bot/flow');
    },

    async saveBotFlow(data: BotFlowData): Promise<{ success: boolean; message: string }> {
        return this.sendBackgroundRequest<{ success: boolean; message: string }>('/bot/flow', 'POST', data);
    },

    // === BASE DE CONOCIMIENTO (real, rama 7-epic-knowledge-base) ===

    async getKnowledgeBases(): Promise<KnowledgeBase[]> {
        return this.sendBackgroundRequest<KnowledgeBase[]>('/knowledge-bases');
    },

    async createKnowledgeBase(data: KnowledgeBaseInput): Promise<KnowledgeBase> {
        return this.sendBackgroundRequest<KnowledgeBase>('/knowledge-bases', 'POST', data);
    },

    async updateKnowledgeBase(id: number, data: Partial<KnowledgeBaseInput>): Promise<KnowledgeBase> {
        return this.sendBackgroundRequest<KnowledgeBase>(`/knowledge-bases/${id}`, 'PUT', data);
    },

    async deleteKnowledgeBase(id: number): Promise<void> {
        return this.sendBackgroundRequest<void>(`/knowledge-bases/${id}`, 'DELETE');
    },

    async getKbDocuments(knowledgeBaseId: number): Promise<KnowledgeDocument[]> {
        return this.sendBackgroundRequest<KnowledgeDocument[]>(`/knowledge-bases/${knowledgeBaseId}/documents`);
    },

    // Sube un archivo directo con fetch (no vía background/sendMessage: el puente actual solo
    // transporta JSON y este endpoint es multipart/form-data).
    async uploadKbDocument(knowledgeBaseId: number, file: File): Promise<KnowledgeDocument> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/knowledge-bases/${knowledgeBaseId}/documents`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || `Error al subir el archivo (HTTP ${res.status})`);
        }
        return data as KnowledgeDocument;
    },

    async deleteKbDocument(knowledgeBaseId: number, documentId: number): Promise<void> {
        return this.sendBackgroundRequest<void>(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`, 'DELETE');
    },

    // === IA AVANZADA: REDACCIÓN Y TRANSCRIPCIÓN ===

    async draftReply(params: {
        conversationText: string;
        contactName?: string;
        tone?: 'formal' | 'cordial' | 'directo';
        instruction?: string;
        userPrompt?: string;
    }): Promise<{ success: boolean; draft: string; foundInKb?: boolean; sourceKbIds?: number[] }> {
        return this.sendBackgroundRequest<{ success: boolean; draft: string; foundInKb?: boolean; sourceKbIds?: number[] }>('/ai/draft', 'POST', params);
    },

    async transcribeAudio(
        input: string | { audioBase64?: string; messageId?: string; mimeType?: string },
        mimeType: string = 'audio/ogg'
    ): Promise<{ success: boolean; transcription: string }> {
        const payload = typeof input === 'string'
            ? { audioBase64: input, mimeType }
            : { audioBase64: input.audioBase64, messageId: input.messageId, mimeType: input.mimeType || mimeType };

        return this.sendBackgroundRequest<{ success: boolean; transcription: string }>('/ai/transcribe', 'POST', payload);
    },

    // === MENSAJES PROGRAMADOS (Feature #5) ===

    async getScheduledJobs(): Promise<any[]> {
        return this.sendBackgroundRequest<any[]>('/scheduled-jobs');
    },

    async createScheduledJob(data: {
        contactName: string;
        phone: string;
        messageText: string;
        executeAt: string | Date;
        recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
        stopOnReply?: boolean;
    }): Promise<any> {
        return this.sendBackgroundRequest<any>('/scheduled-jobs', 'POST', data);
    },

    async cancelScheduledJob(id: number): Promise<any> {
        return this.sendBackgroundRequest<any>(`/scheduled-jobs/${id}/cancel`, 'PUT');
    },

    async deleteScheduledJob(id: number): Promise<void> {
        return this.sendBackgroundRequest<void>(`/scheduled-jobs/${id}`, 'DELETE');
    },

    // === SINCRONIZACIÓN Y LIMPIEZA DE CONVERSACIONES ===

    async syncConversationMessages(params: {
        phone: string;
        name: string;
        groupName?: string | null;
        messages: { sender: 'customer' | 'agent' | 'bot'; text: string; createdAt?: string }[];
        mode?: 'replace' | 'merge';
    }): Promise<{ status: string; conversation: any; syncedCount: number; lastMessageId: number | null }> {
        return this.sendBackgroundRequest<{ status: string; conversation: any; syncedCount: number; lastMessageId: number | null }>(
            '/conversations/sync',
            'POST',
            params
        );
    },

    async clearConversationMessages(conversationId: number): Promise<{ status: string; message: string }> {
        return this.sendBackgroundRequest<{ status: string; message: string }>(
            `/conversations/${conversationId}/messages`,
            'DELETE'
        );
    },

    // Revierte solo los mensajes traídos por el auto-scroll del resumen de IA (id > afterId) —
    // usado al cancelar/cerrar el modal sin confirmar, para no dejar historial que solo se pidió
    // para calcular ese resumen puntual.
    async rollbackConversationMessages(conversationId: number, afterId: number): Promise<{ status: string; deletedCount: number }> {
        return this.sendBackgroundRequest<{ status: string; deletedCount: number }>(
            `/conversations/${conversationId}/messages/after/${afterId}`,
            'DELETE'
        );
    },
};