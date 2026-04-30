import { Sun, Moon } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <p className="text-sm text-muted-foreground">
        Read-only Notion task analytics dashboard
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
