import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppState } from '@/state/AppStateContext';

export const ThemeSection: React.FC = () => {
  const { config, setConfig } = useAppState();
  const currentTheme = config.theme ?? 'light';

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Apariencia / Tema</h4>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfig((c) => ({ ...c, theme: 'light' }))}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
            currentTheme === 'light'
              ? 'bg-white border-red-500 text-[#9e1114] shadow-sm ring-2 ring-red-500/20'
              : 'bg-white/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Modo Claro</span>
        </button>

        <button
          type="button"
          onClick={() => setConfig((c) => ({ ...c, theme: 'dark' }))}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
            currentTheme === 'dark'
              ? 'bg-slate-900 border-red-500 text-white shadow-sm ring-2 ring-red-500/30'
              : 'bg-white/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Moon className="w-4 h-4 text-purple-400" />
          <span>Modo Oscuro</span>
        </button>
      </div>
    </div>
  );
};

export default ThemeSection;
