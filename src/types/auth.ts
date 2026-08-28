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
  botEnabledForNewContacts: boolean;
  botReplyToAll: boolean;
  createdAt: string;
  updatedAt: string;
}
