// Cuentas de canales (WhatsApp, LinkedIn, Gmail, Facebook, Instagram, TikTok, Mercado Libre).
// Todo lo que no sea WhatsApp/DOM es un prototipo visual: no hay OAuth ni API real detrás,
// igual que en el mockup del cliente (conectar resuelve siempre "ok" tras un delay simulado).

export type ChannelId = 'wa' | 'li' | 'gm' | 'fb' | 'ig' | 'tt' | 'ml';

export type WhatsAppMode = 'web' | 'api';

export interface ChannelAccount {
  id: string;
  channel: ChannelId;
  name: string;
  connected: boolean;
  dailyLimit: number;
  // Solo WhatsApp usa estos campos (modo Cloud API)
  waMode?: WhatsAppMode;
  phoneNumberId?: string;
  wabaId?: string;
  token?: string;
  // Solo LinkedIn
  linkedinSessionDetected?: boolean;
  invitesPerDay?: number;
}
