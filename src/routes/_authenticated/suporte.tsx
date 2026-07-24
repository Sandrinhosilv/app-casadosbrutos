import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Manual Stock" }] }),
  component: Support,
});

function Support() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <LifeBuoy className="h-5 w-5" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Suporte</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Estamos aqui para ajudar você a encontrar qualquer manual.
      </p>

      <div className="mt-10 grid gap-3 md:grid-cols-2">
        <a
          href="mailto:suporte@manualstock.com.br"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">E-mail</p>
            <p className="text-xs text-muted-foreground">suporte@manualstock.com.br</p>
          </div>
        </a>
        <a
          href="https://wa.me/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">WhatsApp</p>
            <p className="text-xs text-muted-foreground">Resposta rápida em horário comercial</p>
          </div>
        </a>
      </div>

      <div className="mt-10 rounded-3xl border border-border bg-card p-6">
        <p className="text-sm font-medium">Não encontrou um manual?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie a marca, modelo e ano — buscamos e adicionamos à biblioteca.
        </p>
      </div>
    </div>
  );
}
