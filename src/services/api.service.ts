// src/services/api.service.ts

import { Conversation } from "@/types/conversation";
import { KeywordRule, KeywordRuleInput } from "@/types/bot";
import { KnowledgeBase, KnowledgeBaseInput, KnowledgeDocument } from "@/types/knowledgeBase";

export const ApiService = {
    async sendBackgroundRequest<T>(endpoint: string, method = 'GET', body?: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (!chrome.runtime?.id) {
                return reject(new Error('Contexto de extensión no disponible'));
            }

            chrome.runtime.sendMessage(
                {
                    type: 'FETCH_API',
                    payload: { endpoint, method, body },
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

    // === ENDPOINTS DE LA RAMA 5-base-chatbot ===

    async getConversations(): Promise<Conversation[]> {
        return this.sendBackgroundRequest<Conversation[]>('/conversations');
    },

    async getMessages(conversationId: string | number): Promise<any[]> {
        return this.sendBackgroundRequest<any[]>(`/conversations/${conversationId}/messages`);
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
        const res = await fetch(`http://localhost:5000/api/knowledge-bases/${knowledgeBaseId}/documents`, {
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
};