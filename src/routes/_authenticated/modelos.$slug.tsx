import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText } from "lucide-react";
import { getModel } from "@/lib/manuals.functions";

export const Route = createFileRoute("/_authenticated/modelos/$slug")({
  head: () => ({ meta: [{ title: "Modelo — Manual Stock" }] }),
  component: ModelDetail,
});

function ModelDetail() {
  const { slug } = Route.useParams();
  const fetch = useServerFn(getModel);
  const { data, isLoading } = useQuery({
    queryKey: ["model", slug],
    queryFn: () => fetch({ data: { slug } }),
  });

  if (!isLoading && !data?.model) throw notFound();
  const m = data?.model;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {m?.brands && (
        <Link
          to="/marcas/$slug"
          params={{ slug: m.brands.slug }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← {m.brands.name}
        </Link>
      )}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
        {m?.name ?? "…"}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-6 aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-transparent" />
          <dl className="space-y-3 text-sm">
            <Row label="Marca" value={m?.brands?.name} />
            <Row label="Ano" value={m?.year_start ? `${m.year_start}${m.year_end ? `–${m.year_end}` : "+"}` : "—"} />
            <Row label="Motor" value={m?.engine ?? "—"} />
            <Row label="Cilindrada" value={m?.displacement_cc ? `${m.displacement_cc}cc` : "—"} />
            <Row label="Alimentação" value={m?.fuel_system ?? "—"} />
            <Row label="Combustível" value={m?.fuel ?? "—"} />
            <Row label="Categoria" value={m?.categories?.name ?? "—"} />
            {m?.ecu_code && <Row label="ECU" value={m.ecu_code} />}
          </dl>
          {m?.description && (
            <p className="mt-6 text-sm text-muted-foreground">{m.description}</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
            Arquivos disponíveis
          </p>
          {data && data.manuals.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Nenhum manual cadastrado ainda para este modelo.
            </div>
          )}
          <div className="space-y-2">
            {data?.manuals.map((mn) => (
              <Link
                key={mn.id}
                to="/manuais/$id"
                params={{ id: mn.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mn.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {mn.format} · atualizado em{" "}
                    {new Date(mn.last_updated).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}
