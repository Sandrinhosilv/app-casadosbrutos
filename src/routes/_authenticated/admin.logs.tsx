import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminLogs } from "@/lib/admin";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
  errorComponent: ({ error }) => (
    <div className="text-sm text-destructive">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div className="text-sm">Não encontrado</div>,
});

function AdminLogs() {
  const list = useServerFn(listAdminLogs);
  const logsQ = useQuery({ queryKey: ["admin", "logs"], queryFn: () => list() });
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3 text-sm font-medium">Atividade recente</div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Quando</th>
              <th className="px-3 py-2 text-left">Ação</th>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Meta</th>
            </tr>
          </thead>
          <tbody>
            {(logsQ.data ?? []).map((l: any) => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{l.action}</td>
                <td className="px-3 py-2 text-xs">{l.profiles?.email ?? "â€”"}</td>
                <td className="px-3 py-2 text-xs">
                  <pre className="max-w-xl overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                    {JSON.stringify(l.meta ?? {}, null, 0).slice(0, 300)}
                  </pre>
                </td>
              </tr>
            ))}
            {(logsQ.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  Sem logs ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

