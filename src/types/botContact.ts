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
  // 'lid' = usuario con nombre de usuario (@) de WhatsApp: su número está oculto y el jid es un
  // identificador interno, NO un teléfono (no mostrarlo como "+número" ni usarlo para abrir chats
  // por número o exportarlo como teléfono). Ausente/'phone' = contacto normal.
  identityType?: 'phone' | 'lid';
  lastActivity: string; // ISO timestamp
  // Reserva de asesor por derivación (bloque "Contactar Asesor" del editor de flujos) — el bot
  // sigue respondiendo con normalidad mientras tanto, esto solo evita derivar al mismo cliente a
  // un segundo asesor. Ver ApiService.resumeBotForContact.
  handoffAdvisorId: number | null;
  handoffExpiresAt: string | null; // ISO timestamp, null/vencido = sin reserva activa
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
