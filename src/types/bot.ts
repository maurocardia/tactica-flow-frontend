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
}

export type NodeType =
  | 'TRIGGER'
  | 'STATIC_REPLY'
  | 'OPTIONS_MENU'
  | 'CALL_AI'
  | 'HANDOFF'
  | 'CONDITION'
  | 'DELAY';

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
