import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [tokenInput, setTokenInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;

    setError("");
    setLoading(true);
    const ok = await login(trimmed, rememberMe);
    setLoading(false);

    if (!ok) {
      setError("Invalid token");
    }
  }, [tokenInput, rememberMe, login]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <Lock size={20} />
          <h1 className="text-lg font-semibold">Task Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">Enter your token to continue.</p>

        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Token"
          autoFocus
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-border"
          />
          Remember me for 7 days
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !tokenInput.trim()}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
