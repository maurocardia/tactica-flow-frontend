import { AppConfig } from '@/types/config';
import { ChannelAccount } from '@/types/account';
import { MessageTemplate } from '@/types/template';
import { CampaignStep, CollectedLead } from '@/types/campaign';
import { ScheduledMessage, Sequence } from '@/types/scheduled';

export const INITIAL_CONFIG: AppConfig = {
  whatsappMode: 'web',
  cloudApiVersion: 'v20.0',
  cloudPhoneNumberId: '',
  cloudWabaId: '',
  cloudAppId: '',
  cloudToken: '',
  cloudWebhookUrl: '',
  cloudWebhookVerifyToken: '',
  cloudConnectionStatus: 'idle',

  aiProvider: 'Gemini', // el backend hoy solo soporta Gemini de verdad (ver ai.service.ts) — que el default coincida con la realidad
  autoSummarizeOnOpen: false,
  autoTranscribe: true,
  botEnabled: true,
  aiFallbackEnabled: true,
  botGroupsEnabled: false,
  aiSummaryPrompt:
    'Resumí la conversación identificando: qué pidió el cliente, puntos clave, compromisos y próximo paso sugerido. Usá español rioplatense, tono profesional.',
  aiSummaryKnowledgeBaseId: null,

  ficha360Tabs: {
    historial: true,
    pendientes: true,
    presupuestos: true,
    facturacion: true,
    compras: true,
    ctacte: true,
  },
  moduleVisibility: {
    contactCard: true,
    aiModule: true,
    selectMessages: true,
    ficha360: true,
    chatbot: true,
    toolsGrid: true,
  },
};

export const INITIAL_ACCOUNTS: ChannelAccount[] = [
  { id: 'acc-wa-1', channel: 'wa', name: 'Línea comercial', connected: true, dailyLimit: 40, waMode: 'web' },
  { id: 'acc-li-1', channel: 'li', name: 'Perfil comercial', connected: false, dailyLimit: 25, invitesPerDay: 15, linkedinSessionDetected: false },
  { id: 'acc-gm-1', channel: 'gm', name: '', connected: false, dailyLimit: 80 },
];

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  { id: 'tpl-1', name: '/saludo', kind: 'fijo', text: 'Hola {nombre}, gracias por escribirnos a {empresa}. ¿En qué te ayudamos?' },
  { id: 'tpl-2', name: '/seguimiento', kind: 'ia', text: 'Redactar un seguimiento cordial sobre el presupuesto {presupuesto} enviado a {empresa}, preguntando si tiene dudas.' },
  { id: 'tpl-3', name: '/fuera-horario', kind: 'fijo', text: 'Gracias por tu mensaje. Nuestro horario de atención es de 9 a 18hs, te respondemos a la brevedad.' },
];

export const INITIAL_CAMPAIGN_STEPS: CampaignStep[] = [
  { id: 'step-1', channel: 'wa', delayLabel: 'Inmediato', kind: 'fijo', text: 'Hola {nombre}, te contactamos de {empresa} por tu consulta reciente.', useChatContext: false, fallbackMode: 'esperar' },
  { id: 'step-2', channel: 'gm', delayLabel: '+2 días · si no respondió', kind: 'ia', text: 'Reenviar la propuesta adaptada al rubro, tono cordial.', useChatContext: true, fallbackMode: 'otro', fallbackChannel: 'wa' },
  { id: 'step-3', channel: 'li', delayLabel: '+5 días · si no respondió', kind: 'fijo', text: 'Última oportunidad: recordarle la propuesta antes de cerrarla.', useChatContext: false, fallbackMode: 'omitir' },
];

export const INITIAL_LEADS: CollectedLead[] = [
  { id: 'lead-1', name: 'Martín Suárez', company: 'Suárez Hnos. SRL', channels: ['li', 'wa'], source: 'LinkedIn · Búsqueda' },
  { id: 'lead-2', name: 'Carla Domínguez', company: 'Domínguez Consultora', channels: ['gm'], source: 'Google Contacts' },
];

export const INITIAL_SCHEDULED_MESSAGES: ScheduledMessage[] = [
  {
    id: 'sched-1',
    contactName: 'Juan Pérez',
    scope: 'este',
    text: 'Te recuerdo la reunión de mañana a las 10hs.',
    datetimeLabel: 'Mañana · 09:00',
    recurrenceLabel: 'Una vez',
    active: true,
  },
];

export const INITIAL_SEQUENCES: Sequence[] = [
  { id: 'seq-1', contactName: 'Grupo · Compras', scope: 'otro', name: 'Seguimiento de pedido', stepsCount: 3, active: true },
];

export const INITIAL_TAGS: string[] = ['Cliente', 'Prospecto', 'Proveedor', 'Mayorista', 'VIP'];
