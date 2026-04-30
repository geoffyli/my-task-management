import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AUTH_STORAGE_KEY, AUTH_EXPIRES_KEY, AUTH_DURATION_MS, getStoredToken } from "@/lib/auth";

interface AuthContextValue {
  token: string;
  isAuthenticated: boolean;
  login: (token: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getStoredToken);

  const login = useCallback(async (inputToken: string, rememberMe: boolean): Promise<boolean> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: inputToken }),
    });

    if (!res.ok) return false;

    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, inputToken);
      localStorage.setItem(AUTH_EXPIRES_KEY, String(Date.now() + AUTH_DURATION_MS));
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, inputToken);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_EXPIRES_KEY);
    }

    setToken(inputToken);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_EXPIRES_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setToken("");
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
