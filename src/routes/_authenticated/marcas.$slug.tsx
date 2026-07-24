import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { getBrand } from "@/lib/manuals.functions";

export const Route = createFileRoute("/_authenticated/marcas/$slug")({
  head: () => ({ meta: [{ title: "Marca — Manual Stock" }] }),
  component: BrandDetail,
});

function BrandDetail() {
  const { slug } = Route.useParams();
  const fetch = useServerFn(getBrand);
  const { data, isLoading } = useQuery({
    queryKey: ["brand", slug],
    queryFn: () => fetch({ data: { slug } }),
  });

  if (!isLoading && !data?.brand) throw notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/marcas" className="text-xs text-muted-foreground hover:text-foreground">
        ← Marcas
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
        {data?.brand?.name ?? "…"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{data?.brand?.country}</p>

      <p className="mt-10 mb-4 text-xs uppercase tracking-wider text-muted-foreground">
        Modelos
      </p>

      {data && data.models.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Nenhum modelo cadastrado ainda para esta marca.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.models.map((m) => (
          <Link
            key={m.id}
            to="/modelos/$slug"
            params={{ slug: m.slug }}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.year_start ? `${m.year_start}${m.year_end ? `–${m.year_end}` : "+"}` : ""}
                {m.engine ? ` · ${m.engine}` : ""}
                {m.displacement_cc ? ` · ${m.displacement_cc}cc` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
