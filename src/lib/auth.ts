export const AUTH_STORAGE_KEY = "auth_token";
export const AUTH_EXPIRES_KEY = "auth_expires";
export const AUTH_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function getStoredToken(): string {
  const token = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!token) return "";

  const expires = localStorage.getItem(AUTH_EXPIRES_KEY);
  if (expires && Date.now() > Number(expires)) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_EXPIRES_KEY);
    return "";
  }

  return token;
}
