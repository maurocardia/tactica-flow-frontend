// Espejo de WhatsappConnectionStatus en el backend (whatsapp.service.ts, motor real vía Baileys).
export type WhatsappConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface WhatsappStatusResponse {
  status: WhatsappConnectionStatus;
}
