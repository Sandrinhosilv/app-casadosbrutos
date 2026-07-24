import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Manual Stock" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-hero opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground glow-soft">
            <Wrench className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Manual Stock</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma nova senha segura para sua conta.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nova senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            disabled={loading}
            className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 glow-soft"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar senha
          </button>
        </form>
      </div>
    </div>
  );
}
