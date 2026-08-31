import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '@/types/auth';
import { signInWithGoogle } from '@/services/googleAuth.service';
import { getStoredToken, getStoredUser, setStoredAuth, clearStoredAuth } from '@/services/authStorage.service';
import { ApiService } from '@/services/api.service';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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

  return <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
