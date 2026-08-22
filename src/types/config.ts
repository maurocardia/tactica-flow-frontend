import { WhatsAppMode } from './account';

export interface Ficha360TabVisibility {
  historial: boolean;
  pendientes: boolean;
  presupuestos: boolean;
  facturacion: boolean;
  compras: boolean;
  ctacte: boolean;
}

export interface ModuleVisibility {
  contactCard: boolean;
  aiModule: boolean;
  selectMessages: boolean;
  ficha360: boolean;
  chatbot: boolean;
  toolsGrid: boolean;
}

export interface AppConfig {
  whatsappMode: WhatsAppMode;
  // Campos de Meta Cloud API (solo se usan si whatsappMode === 'api')
  cloudApiVersion: string;
  cloudPhoneNumberId: string;
  cloudWabaId: string;
  cloudAppId: string;
  cloudToken: string;
  cloudWebhookUrl: string;
  cloudWebhookVerifyToken: string;
  cloudConnectionStatus: 'idle' | 'testing' | 'connected';

  aiProvider: string;
  autoSummarizeOnOpen: boolean;
  autoTranscribe: boolean;
  // Estado real del chatbot (no prototipo): lo lee/escribe tanto ChatbotModule como el ícono de
  // estado en ContactCard, así que vive acá en vez de en un useState local de un solo componente.
  botEnabled: boolean;

  ficha360Tabs: Ficha360TabVisibility;
  moduleVisibility: ModuleVisibility;
}
