// src/types/botContact.ts
// Espejo de BotContactService.BotContact en el backend (tactica-flow-backend/src/services/botContact.service.ts).
// Tabla propia y separada de `conversations`/`messages`: nunca borra ni modifica el historial
// real de chats, solo refleja la lista de contactos/grupos de WhatsApp para el switch de bot.

export interface BotContact {
  id: number;
  userId: number;
  jid: string;
  name: string;
  isGroup: boolean;
  botEnabled: boolean;
  lastActivity: string; // ISO timestamp
}
