// Espejo de lo que debería devolver el backend en /api/whatsapp/advisors (todavía no existe, ver
// AdvisorManagerModal.tsx). `phone` se guarda como dígitos puros con código de país incluido, sin
// "+" ni espacios (ej. "573001234567") — mismo formato que BotContact.jid, sin el sufijo "@...".
export interface Advisor {
  id: number;
  userId: number;
  name: string;
  phone: string;
  isActive: boolean;
  handoffCount: number;
  lastHandoffAt: string | null;
  createdAt: string;
}
