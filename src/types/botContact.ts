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
  isBlacklisted: boolean;
  lastActivity: string; // ISO timestamp
  // Pausa del bot por derivación a un asesor (bloque "Contactar Asesor" del editor de flujos) —
  // ver ApiService.resumeBotForContact.
  handoffAdvisorId: number | null;
  handoffPausedUntil: string | null; // ISO timestamp, null = no está pausado
}

// Contacto ya parseado desde un archivo CSV/Excel, listo para mandar a
// POST /whatsapp/bot-contacts/bulk-import — ver BulkImportPreview.tsx.
export interface BulkImportContact {
  phone: string;
  name?: string;
  enabled: boolean;
  // true = va a la pestaña Blacklist (nunca recibe respuesta del bot), en vez de solo apagar su
  // switch — ver BotContactService.bulkImport en el backend.
  blacklisted?: boolean;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  blacklisted?: number;
  errors: number;
  errorDetails?: string[];
}
