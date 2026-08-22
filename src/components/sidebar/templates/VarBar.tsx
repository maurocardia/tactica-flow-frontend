import React from 'react';

const VARIABLES = ['{nombre}', '{empresa}', '{telefono}', '{email}', '{presupuesto}', '{usuario}'];

export const VarBar: React.FC<{ onInsert: (variable: string) => void }> = ({ onInsert }) => (
  <div className="flex flex-wrap gap-1.5">
    {VARIABLES.map((v) => (
      <button
        key={v}
        onClick={() => onInsert(v)}
        className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-1 hover:bg-purple-100"
      >
        {v}
      </button>
    ))}
  </div>
);

export default VarBar;
