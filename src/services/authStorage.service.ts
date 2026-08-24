// Guardado local de la sesión (JWT + datos del usuario) — chrome.storage.local, no hay backend
// de sesiones del lado del navegador más que este.
const TOKEN_KEY = 'tf_auth_token';
const USER_KEY = 'tf_auth_user';

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return (result[TOKEN_KEY] as string) ?? null;
}

export async function getStoredUser<T = unknown>(): Promise<T | null> {
  const result = await chrome.storage.local.get(USER_KEY);
  return (result[USER_KEY] as T) ?? null;
}

export async function setStoredAuth(token: string, user: unknown): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token, [USER_KEY]: user });
}

export async function clearStoredAuth(): Promise<void> {
  await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}
