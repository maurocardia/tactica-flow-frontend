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
  // Cliente con el que este asesor está en relay activo AHORA MISMO (null = ninguno) — GET
  // /advisors lo arma con BotContactService.getActiveClientForAdvisor. Se usa para mostrar
  // "Atendiendo a: Fulano" y habilitar el botón "Liberar" de su fila.
  activeClient: { jid: string; name: string; expiresAt: string } | null;
}
