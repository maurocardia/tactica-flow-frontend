import React from 'react';
import { Clock } from 'lucide-react';

// Aviso reutilizado en todos los módulos que todavía no tienen backend real detrás (cuentas
// multicanal, campañas, leads, plantillas, programados, modales rápidos). No implica que la UI
// esté rota: es una vista previa interactiva, pero ninguna acción de acá sale de verdad hacia
// LinkedIn/Gmail/Meta/etc. todavía.
export const PrototypeNotice: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-amber-800">
    <Clock className="w-3.5 h-3.5 shrink-0" />
    <span>{text ?? 'Próximamente: esta función es una vista previa, todavía no está conectada a un sistema real.'}</span>
  </div>
);

export default PrototypeNotice;
