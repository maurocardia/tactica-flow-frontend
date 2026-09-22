import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '@/types/auth';
import { signInWithGoogle } from '@/services/googleAuth.service';
import { getStoredToken, getStoredUser, setStoredAuth, setStoredUser, clearStoredAuth } from '@/services/authStorage.service';
import { ApiService } from '@/services/api.service';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  // Mergea campos en el usuario en memoria y en chrome.storage.local — para usar después de un PUT
  // de configuración en background (reserva de asesor, recordatorio de cola, delay humanizado,
  // etc.) que ya devuelve el valor guardado. Sin esto, esos ajustes "no se guardaban": el backend
  // sí los persistía, pero el `user` de este contexto (hidratado una sola vez desde storage al
  // iniciar sesión) quedaba desactualizado, así que cualquier modal que lo usara como valor
  // inicial (`useState(user?.campo ?? default)`) volvía a mostrar el valor viejo la próxima vez
  // que se abría, aunque el servidor tuviera el nuevo.
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidratar la sesión guardada al montar (chrome.storage.local, ver authStorage.service.ts).
  useEffect(() => {
    (async () => {
      const [token, storedUser] = await Promise.all([getStoredToken(), getStoredUser<AuthUser>()]);
      if (token && storedUser) setUser(storedUser);
    })();
  }, []);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: loggedUser } = await signInWithGoogle();
      await setStoredAuth(token, loggedUser);
      setUser(loggedUser);
    } catch (err: any) {
      console.error('[AuthContext] Error al iniciar sesión con Google:', err);
      setError(err?.message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Desconecta también la sesión real de WhatsApp (Baileys) de este usuario — si no, queda
    // colgada en el backend y el próximo "Conectar" falla en vez de pedir un QR nuevo. Se hace
    // antes de borrar el token guardado porque necesita mandarlo en el pedido.
    try {
      await ApiService.whatsappDisconnect();
    } catch (err) {
      console.error('[AuthContext] No se pudo desconectar WhatsApp al cerrar sesión:', err);
    }
    
    // Limpiar toda la caché local para evitar que queden rastros de chats o contactos en la siguiente sesión
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.clear();
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('[AuthContext] Error al limpiar la caché:', err);
    }

    await clearStoredAuth();
    setUser(null);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setStoredUser(next).catch((err) => {
        console.error('[AuthContext] No se pudo persistir el usuario actualizado en storage:', err);
      });
      return next;
    });
  };

  return <AuthContext.Provider value={{ user, loading, error, login, logout, updateUser }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
