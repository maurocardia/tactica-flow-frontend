import React from 'react';
import { fieldInputClass } from './Field';

// Único patrón visual del panel para marcar algo explícitamente no implementado (hoy solo lo usa
// el campo IP/proxy de la cuenta de LinkedIn). No confundir con el resto del prototipo, que se
// presenta como funcional aunque simule sus resultados.
export const ComingSoonField: React.FC<{ label: string; placeholder?: string }> = ({ label, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
      {label}
      <span className="text-[9.5px] font-extrabold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
        próximamente
      </span>
    </span>
    <input className={fieldInputClass} placeholder={placeholder ?? 'próximamente'} disabled />
  </div>
);

export default ComingSoonField;
