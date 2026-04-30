import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
      <Card variant="elevated" className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2.5 text-foreground">
            <Lock size={18} strokeWidth={1.5} />
            <h1 className="text-[20px] font-[590] tracking-[-0.24px]">Task Analytics</h1>
          </div>
          <p className="text-[14px] text-foreground-tertiary">
            Enter your token to continue.
          </p>

          <Input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Token"
            autoFocus
          />

          <label className="flex items-center gap-2 text-[13px] font-[510] text-foreground-tertiary cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border-solid accent-accent"
            />
            Remember me for 7 days
          </label>

          {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !tokenInput.trim()}
            className="w-full"
          >
            {loading ? "Verifying..." : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
