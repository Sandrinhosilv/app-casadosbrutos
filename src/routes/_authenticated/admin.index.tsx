import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview } from "@/lib/admin";
import { BookOpen, Download, ShieldCheck, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const opts = queryOptions({
  queryKey: ["admin", "overview"],
  queryFn: () => getAdminOverview(),
});

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: AdminHome,
  errorComponent: ({ error }) => (
    <div className="text-sm text-destructive">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="text-sm">Não encontrado</div>,
});

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AdminHome() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Usuários totais" value={data.totalUsers} />
        <Stat icon={ShieldCheck} label="Assinantes ativos" value={data.activeSubscribers} />
        <Stat icon={BookOpen} label="Manuais na base" value={data.totalManuals} />
        <Stat icon={Download} label="Downloads no mês" value={data.downloadsThisMonth} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium">Última sincronização com Drive</h2>
        {data.lastSync ? (
          <div className="text-sm">
            <div className="mb-1 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(data.lastSync.started_at), { addSuffix: true, locale: ptBR })}
            </div>
            <div>
              Status: <span className="font-medium">{data.lastSync.status}</span> · Vistos:{" "}
              {data.lastSync.files_seen} · Importados: {data.lastSync.files_imported} · Atualizados:{" "}
              {data.lastSync.files_updated} · Pulados: {data.lastSync.files_skipped}
            </div>
            {data.lastSync.error_message && (
              <div className="mt-2 text-xs text-destructive">{data.lastSync.error_message}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma sincronização realizada ainda.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium">Downloads recentes</h2>
        <div className="divide-y divide-border">
          {data.recentDownloads.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem downloads ainda.</p>
          )}
          {data.recentDownloads.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate">{d.manuals?.title ?? "â€”"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.profiles?.email ?? "â€”"}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(d.downloaded_at), { addSuffix: true, locale: ptBR })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

