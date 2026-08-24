import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '@/types/auth';
import { signInWithGoogle } from '@/services/googleAuth.service';
import { getStoredToken, getStoredUser, setStoredAuth, clearStoredAuth } from '@/services/authStorage.service';

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
