import React from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';

// Login real con Google (Issue #6) — necesario para usar la conexión real de WhatsApp (Baileys,
// ver WhatsappConnectionSection), que es "por usuario autenticado" del lado del backend.
export const AccountSection: React.FC = () => {
  const { user, loading, error, login, logout } = useAuth();

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2.5">
      <h4 className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">Cuenta</h4>
      {user ? (
        <div className="flex items-center gap-2">
          <img
            src={user.avatarUrl || chrome.runtime.getURL('icons/user.png')}
            className="w-8 h-8 rounded-full shrink-0 object-cover bg-slate-200"
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = chrome.runtime.getURL('icons/user.png');
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-[10.5px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 shrink-0" title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={login}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold text-xs py-2 rounded-lg"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Iniciar sesión con Google
          </button>
          {error && <p className="text-[10.5px] text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
};

export default AccountSection;
