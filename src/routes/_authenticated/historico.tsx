import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText, History } from "lucide-react";
import { listMyDownloads } from "@/lib/manuals.functions";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — Manual Stock" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const fetch = useServerFn(listMyDownloads);
  const { data, isLoading } = useQuery({ queryKey: ["downloads"], queryFn: () => fetch() });
  const [q, setQ] = useState("");
  const filtered = data?.filter((d: any) =>
    (d.manuals?.title ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Histórico</h1>
      <p className="mt-2 text-sm text-muted-foreground">Todos os downloads realizados.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar no histórico…"
        className="mt-8 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-6 space-y-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q ? "Nada encontrado." : "Nenhum download ainda."}
            </p>
          </div>
        )}
        {filtered?.map((d: any) => (
          <Link
            key={d.id}
            to="/manuais/$id"
            params={{ id: d.manuals?.id }}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.manuals?.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.manuals?.models?.brands?.name} · {d.manuals?.models?.name}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(d.downloaded_at).toLocaleDateString("pt-BR")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
