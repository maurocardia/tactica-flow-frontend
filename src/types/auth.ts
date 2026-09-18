// Espejo de AiPromptSections/AiGeneralRules/AiPromptConfig en auth.service.ts.
export interface AiPromptSections {
  behavior: string;
  objective: string;
  rules: string;
  tone: string;
  companyInfo: string;
  callToAction: string;
  notes: string;
}

export interface AiGeneralRules {
  mainLanguage: string;
  followClientLanguage: boolean;
  noSwearing: boolean;
  neverInvent: boolean;
  shortAnswers: boolean;
  focusOnCompany: boolean;
  addressByFirstName: boolean;
  noSpecialCharacters: boolean;
  noEmojis: boolean;
  offerHumanAgent: boolean;
  protectSensitiveData: boolean;
}

export interface AiPromptConfig {
  sections: AiPromptSections;
  generalRules: AiGeneralRules;
}

// Espejo de AuthService.User en el backend (tactica-flow-backend/src/services/auth.service.ts).
export interface AuthUser {
  id: number;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  whatsappChannel: string;
  aiProvider: string;
  aiModel: string;
  botEnabled: boolean;
  aiFallbackEnabled: boolean;
  aiCustomInstructions: string;
  // Desglose estructurado del prompt del Agente IA (ver AiAgentConfigModal.tsx) — null si el
  // usuario nunca guardó desde el formulario nuevo (cuentas viejas con solo aiCustomInstructions).
  aiPromptConfig: AiPromptConfig | null;
  botEnabledForNewContacts: boolean;
  botReplyToAll: boolean;
  // Modo de respuesta del bot: si usa el flujo visual, el Agente IA, o ambos (con IA de respaldo
  // cuando el flujo no matchea) — ver selector de modo en ChatbotModule.tsx y
  // PUT /api/whatsapp/bot-mode.
  botMode: 'flow_only' | 'ai_only' | 'hybrid';
  // "Delay humanizado": espera un tiempo aleatorio entre botReplyDelayMinMs y botReplyDelayMaxMs
  // antes de mandar la respuesta del bot, para que no se sienta instantánea/robótica — ver
  // ChatbotModule.tsx (sección "replyDelay") y PUT /api/whatsapp/bot-reply-delay.
  botReplyDelayEnabled: boolean;
  botReplyDelayMinMs: number;
  botReplyDelayMaxMs: number;
  createdAt: string;
  updatedAt: string;
}
