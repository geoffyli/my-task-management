import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { type ThemePreference, type ResolvedTheme, THEME_STORAGE_KEY, resolveTheme } from "@/lib/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function applyTheme(theme: ResolvedTheme) {
  if (document.documentElement.dataset.theme === theme) return;
  document.documentElement.dataset.theme = theme;
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", theme === "dark" ? "#08090a" : "#fbfbfc");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(preference));

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
    setPreferenceState(pref);
    setResolvedTheme(resolveTheme(pref));
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
