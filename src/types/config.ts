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
  // Switch "Responder con IA" (mismo patrón que botEnabled): con el bot habilitado, si ninguna
  // regla de palabra clave matchea, decide si se cae al agente de IA o si no se manda ninguna
  // respuesta automática (solo chatbot manual). Ver PUT /api/whatsapp/ai-fallback-enabled.
  aiFallbackEnabled: boolean;
  // Switch "Responder también en grupos" (mismo patrón que botEnabled/aiFallbackEnabled): por
  // default el bot solo autoresponde en chats individuales — ver
  // PUT /api/whatsapp/bot-groups-enabled y WhatsappService.handleIncomingMessage.
  botGroupsEnabled: boolean;
  // Configuración de "Resumir charla" (gear junto al botón, ver AiSummaryConfigModal): prompt
  // que se le manda a la IA y, opcionalmente, una base de conocimiento cuyos documentos se
  // agregan como contexto extra al pedir el resumen. Solo frontend — no hay endpoint dedicado,
  // se arma el mensaje completo del lado del cliente antes de llamar a /api/ai/chat.
  aiSummaryPrompt: string;
  aiSummaryKnowledgeBaseId: number | null;

  ficha360Tabs: Ficha360TabVisibility;
  moduleVisibility: ModuleVisibility;
  theme?: 'light' | 'dark';
}
