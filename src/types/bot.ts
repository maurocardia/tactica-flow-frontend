// src/types/bot.ts

export type RuleAction = 'STATIC_REPLY' | 'CALL_AI' | 'TACTICA_STOCK_LOOKUP' | 'CREATE_SUPPORT_TICKET';

export interface KeywordRule {
  id: string;
  name: string;
  keywords: string[];
  replyText: string;
  action: RuleAction;
  isActive: boolean;
  createdAt: string;
}

export interface KeywordRuleInput {
  name: string;
  keywords: string[];
  replyText: string;
  action?: RuleAction;
  isActive?: boolean;
}
