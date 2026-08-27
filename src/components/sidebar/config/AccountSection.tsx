import React from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';

// Login real con Google (Issue #6) — necesario para usar la conexión real de WhatsApp (Baileys,
// ver WhatsappConnectionSection), que es "por usuario autenticado" del lado del backend.
export const AccountSection: React.FC = () => {
  const { user, loading, error, login, logout } = useAuth();

  return (
    <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100">Cuenta</h4>
      {user ? (
        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
          <img
            src={user.avatarUrl || chrome.runtime.getURL('icons/user.png')}
            className="w-8 h-8 rounded-full shrink-0 object-cover bg-slate-200 ring-2 ring-red-500/20"
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = chrome.runtime.getURL('icons/user.png');
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">{user.email}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-700 shrink-0 transition-colors" title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={login}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-50 text-slate-900 dark:text-slate-100 font-bold text-xs py-2.5 rounded-xl shadow-2xs cursor-pointer transition-all"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Iniciar sesión con Google
          </button>
          {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
        </>
      )}
    </div>
  );
};

export default AccountSection;
