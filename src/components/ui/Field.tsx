import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, children }) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10.5px] font-semibold text-slate-500">{label}</span>
    {children}
  </label>
);

export const fieldInputClass =
  'border border-slate-300 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-800 [color-scheme:light] focus:outline-none focus:border-red-400 w-full disabled:bg-slate-100 disabled:text-slate-400';

export default Field;
