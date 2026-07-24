import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Heart } from "lucide-react";
import { listMyFavorites } from "@/lib/manuals.functions";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — Manual Stock" }] }),
  component: Favorites,
});

function Favorites() {
  const fetch = useServerFn(listMyFavorites);
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: () => fetch() });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Favoritos</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manuais salvos para acesso rápido.</p>

      <div className="mt-10 space-y-2">
        {isLoading && <SkeletonRows />}
        {!isLoading && (!data || data.length === 0) && (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center">
            <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Você ainda não favoritou nenhum manual.
            </p>
          </div>
        )}
        {data?.map((f: any) => (
          <Link
            key={f.id}
            to="/manuais/$id"
            params={{ id: f.manuals?.id }}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.manuals?.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {f.manuals?.models?.brands?.name} · {f.manuals?.models?.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
      ))}
    </>
  );
}
