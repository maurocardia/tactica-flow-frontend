// src/types/conversation.ts
// Espejo de ConversationService.Conversation en el backend (tactica-flow-backend/src/services/conversation.service.ts).

export type ConversationStatus = 'active' | 'bot' | 'resolved';
export type MessageSender = 'customer' | 'agent' | 'bot';

export interface Conversation {
  id: number;
  name: string;
  phone: string;
  lastMsg: string;
  lastMessageAt: string; // ISO timestamp
  unread: number;
  tag: string;
  status: ConversationStatus;
  userId: number | null;
  // Nombre del grupo de WhatsApp si esta conversación es la de UN participante puntual dentro
  // de un grupo (ver WhatsappService.handleIncomingMessage) — null en chats individuales. Varias
  // conversaciones pueden compartir el mismo groupName (una por cada participante del grupo).
  groupName: string | null;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  sender: MessageSender;
  text: string;
  createdAt: string; // ISO timestamp
  sourceKbIds: number[];
}
