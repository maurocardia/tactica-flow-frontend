// src/services/api.service.ts

import { Conversation } from "@/types/conversation";
import { KeywordRule, KeywordRuleInput } from "@/types/bot";

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
    }
};