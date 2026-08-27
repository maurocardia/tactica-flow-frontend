import React from 'react';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, children }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 tracking-tight">{label}</span>
    {children}
  </label>
);

export const fieldInputClass =
  'border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 [color-scheme:light] focus:outline-none focus:border-red-500 font-semibold w-full shadow-2xs disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-colors';

export default Field;
