import React from 'react';
import { fieldInputClass } from './Field';

// Único patrón visual del panel para marcar algo explícitamente no implementado (hoy solo lo usa
// el campo IP/proxy de la cuenta de LinkedIn). No confundir con el resto del prototipo, que se
// presenta como funcional aunque simule sus resultados.
export const ComingSoonField: React.FC<{ label: string; placeholder?: string }> = ({ label, placeholder }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1.5">
      {label}
      <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">próximamente</span>
    </span>
    <input className={fieldInputClass} placeholder={placeholder ?? 'próximamente'} disabled />
  </div>
);

export default ComingSoonField;
