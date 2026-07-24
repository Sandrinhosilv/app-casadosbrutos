import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";
import { listBrands } from "@/lib/manuals.functions";

export const Route = createFileRoute("/_authenticated/marcas/")({
  head: () => ({ meta: [{ title: "Marcas — Manual Stock" }] }),
  component: BrandsIndex,
});

function BrandsIndex() {
  const fetch = useServerFn(listBrands);
  const { data, isLoading } = useQuery({ queryKey: ["brands"], queryFn: () => fetch() });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Marcas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Explore por fabricante.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        {data?.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <Link
              to="/marcas/$slug"
              params={{ slug: b.slug }}
              className="group flex h-24 flex-col items-start justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Tag className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-[11px] text-muted-foreground">{b.country}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
