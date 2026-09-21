// src/types/bot.ts

export type RuleAction =
  | 'STATIC_REPLY'
  | 'CALL_AI'
  | 'HANDOFF'
  | 'CONDITION'
  | 'DELAY'
  | 'WEBHOOK'
  | 'TACTICA_STOCK_LOOKUP'
  | 'CREATE_SUPPORT_TICKET';

export interface KeywordRule {
  id: string;
  name: string;
  keywords: string[];
  replyText: string;
  action: RuleAction;
  isActive: boolean;
  createdAt: string;
  position?: { x: number; y: number };
  options?: FlowNodeOption[];
  delaySeconds?: number;
  targetNodeId?: string | null;
}

export interface KeywordRuleInput {
  name: string;
  keywords: string[];
  replyText: string;
  action?: RuleAction;
  isActive?: boolean;
  position?: { x: number; y: number };
  options?: FlowNodeOption[];
  delaySeconds?: number;
  targetNodeId?: string | null;
}

export interface FlowNodeOption {
  id: string;
  label: string;      // ej: "1. Consultar Catálogo"
  keyword: string;    // ej: "1" o "catalogo"
  targetNodeId?: string | null;
  // Usados por BUTTONS_REPLY/LIST_MESSAGE (reutilizan options[] a propósito — ver FlowNodeMedia
  // más abajo — para que FlowEdgeLayer/FlowNodeCard no necesiten ningún cambio de puertos).
  description?: string;   // subtítulo de la fila, solo LIST_MESSAGE
  sectionTitle?: string;  // agrupa filas consecutivas con el mismo valor en una sección de la lista
}

export type NodeType =
  | 'TRIGGER'
  | 'STATIC_REPLY'
  | 'OPTIONS_MENU'
  | 'CALL_AI'
  | 'HANDOFF'
  | 'CONDITION'
  | 'DELAY'
  | 'SEND_IMAGE'
  | 'SEND_VIDEO'
  | 'SEND_AUDIO'
  | 'SEND_DOCUMENT'
  | 'BUTTONS_REPLY'
  | 'LIST_MESSAGE'
  | 'FINISH_FLOW';

// Adjunto multimedia de un nodo SEND_IMAGE/SEND_VIDEO/SEND_AUDIO/SEND_DOCUMENT — 'url' no requiere
// subir nada (más simple, ideal para archivos grandes), 'upload' referencia un FlowMediaAsset ya
// subido al backend (ver types/flowMedia.ts).
export interface FlowNodeMedia {
  kind: 'image' | 'video' | 'audio' | 'document';
  source: 'url' | 'upload';
  url?: string;
  assetId?: number;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface BotFlowNode {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  data: {
    name?: string;
    keywords?: string[];
    replyText?: string;
    action?: RuleAction;
    options?: FlowNodeOption[];
    delaySeconds?: number;
    targetNodeId?: string | null;
    isActive?: boolean;
    // SEND_IMAGE / SEND_VIDEO / SEND_AUDIO / SEND_DOCUMENT
    media?: FlowNodeMedia;
    asVoiceNote?: boolean;   // SEND_AUDIO: mandarlo como nota de voz (ptt)
    gifPlayback?: boolean;   // SEND_VIDEO: mandarlo como GIF en loop
    // LIST_MESSAGE
    listTitle?: string;
    listButtonText?: string; // texto del botón que abre la lista (default "Ver opciones")
    footerText?: string;
    // OPTIONS_MENU / BUTTONS_REPLY / LIST_MESSAGE: si el cliente no responde en este tiempo, el
    // bot sigue por su cuenta la conexión del puerto 'timeout' de este nodo (ver
    // FlowEngineService.scheduleTimeout, backend). null/undefined = sin tiempo de espera (nunca
    // manda nada si el cliente no responde, comportamiento histórico).
    waitTimeoutMinutes?: number | null;
    // HANDOFF ("Contactar Asesor") — el bot NUNCA se pausa por esto, sigue respondiendo con
    // normalidad; el asesor elegido solo queda reservado 30 minutos fijos (backend) para no
    // derivar al mismo cliente a una segunda persona.
    advisorMode?: 'auto' | 'fixed';
    advisorId?: number | null;
    advisorNotifyTemplate?: string;
  };
}

export interface BotFlowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId?: string; // ej: option_1 o 'default'
  targetNodeId: string;
}

export interface BotFlowData {
  id: string;
  name: string;
  nodes: BotFlowNode[];
  connections: BotFlowConnection[];
  updatedAt?: string;
}
