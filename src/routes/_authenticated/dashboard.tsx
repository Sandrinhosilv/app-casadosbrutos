import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Download,
  Heart,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { getDashboardOverview } from "@/lib/manuals.functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard",
)({
  head: () => ({
    meta: [
      {
        title: "Dashboard — Casa dos brutos",
      },
    ],
  }),

  component: Dashboard,
});

function Dashboard() {
  const fetchOverview =
    useServerFn(
      getDashboardOverview,
    );

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      "dashboard-overview",
    ],

    queryFn: () =>
      fetchOverview(),
  });

  const firstName =
    data?.profile?.full_name
      ?.split(" ")[0] ??
    "Piloto";

  const sub =
    data?.subscription;

  const active =
    sub?.status ===
      "active" ||
    sub?.status ===
      "trial";

  const planName =
    getPlanDisplayName(
      sub?.status,
    );

  const subscriptionHint =
    getSubscriptionHint(
      sub?.status,
    );

  const expirationLabel =
    sub?.status ===
    "trial"
      ? "Fim do período de teste"
      : "Próximo vencimento";

  const expirationValue =
    sub?.expires_at
      ? formatDate(
          sub.expires_at,
        )
      : "—";

  const expirationHint =
    active
      ? sub?.expires_at
        ? "Acesso liberado até esta data"
        : "Acesso ativo sem vencimento definido"
      : sub?.status ===
          "expired"
        ? "Assinatura expirada"
        : sub?.status ===
            "cancelled"
          ? "Assinatura cancelada"
          : sub?.status ===
              "past_due"
            ? "Pagamento pendente"
            : "Ative sua assinatura";

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 md:py-14">
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
        }}
        className="min-w-0"
      >
        <p className="text-sm text-muted-foreground">
          Olá,
        </p>

        <h1 className="mt-1 truncate text-4xl font-semibold tracking-tight md:text-5xl">
          {firstName}.
        </h1>
      </motion.div>

      {/* Cards de status */}
      <div className="mt-10 grid min-w-0 max-w-full gap-4 md:grid-cols-3">
        <StatCard
          label="Plano atual"
          value={planName}
          hint={subscriptionHint}
          accent={active}
          icon={Sparkles}
          loading={isLoading}
        />

        <StatCard
          label={expirationLabel}
          value={expirationValue}
          hint={expirationHint}
          icon={Calendar}
          loading={isLoading}
        />

        <StatCard
          label="Downloads este mês"
          value={String(
            data?.downloadsThisMonth ??
              0,
          )}
          hint={`${
            data?.favoritesCount ??
            0
          } favoritos`}
          icon={Download}
          loading={isLoading}
        />
      </div>

      {!active && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="glow-soft mt-6 flex min-w-0 max-w-full flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-primary/30 bg-primary/5 p-6"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Ative o Casa dos brutos
            </p>

            <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              Downloads ilimitados,
              pesquisa instantânea e
              novos manuais toda semana.
            </p>
          </div>

          <Link
            to="/assinatura"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Assinar agora

            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Blocos */}
      <div className="mt-10 grid min-w-0 max-w-full gap-6 lg:grid-cols-2">
        <Panel
          title="Últimos downloads"
          icon={Download}
          empty={
            !data
              ?.recentDownloads
              ?.length
          }
          emptyLabel="Nenhum download ainda. Comece pesquisando um manual."
          action={{
            to: "/historico",
            label:
              "Ver histórico",
          }}
        >
          {data?.recentDownloads?.map(
            (download: any) => {
              const manualId =
                download
                  .manuals
                  ?.id;

              if (!manualId) {
                return null;
              }

              return (
                <ManualRow
                  key={
                    download.id
                  }
                  title={
                    download
                      .manuals
                      ?.title
                  }
                  subtitle={buildManualSubtitle(
                    download
                      .manuals
                      ?.models
                      ?.brands
                      ?.name,
                    download
                      .manuals
                      ?.models
                      ?.name,
                  )}
                  hint={formatDate(
                    download.downloaded_at,
                  )}
                  to={`/manuais/${manualId}`}
                />
              );
            },
          )}
        </Panel>

        <Panel
          title="Novidades da biblioteca"
          icon={TrendingUp}
          empty={
            !data
              ?.newestManuals
              ?.length
          }
          emptyLabel="A biblioteca ainda está sendo carregada."
          action={{
            to: "/pesquisar",
            label: "Explorar",
          }}
        >
          {data?.newestManuals?.map(
            (manual: any) => (
              <ManualRow
                key={
                  manual.id
                }
                title={
                  manual.title
                }
                subtitle={buildManualSubtitle(
                  manual.models
                    ?.brands
                    ?.name,
                  manual.models
                    ?.name,
                )}
                hint={formatDate(
                  manual.last_updated,
                )}
                to={`/manuais/${manual.id}`}
              />
            ),
          )}
        </Panel>
      </div>

      {/* Ações rápidas */}
      <div className="mt-10 grid min-w-0 max-w-full gap-4 md:grid-cols-3">
        <QuickAction
          to="/pesquisar"
          icon={Search}
          label="Pesquisar manuais"
        />

        <QuickAction
          to="/marcas"
          icon={BookOpen}
          label="Explorar marcas"
        />

        <QuickAction
          to="/favoritos"
          icon={Heart}
          label="Meus favoritos"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`relative min-w-0 max-w-full overflow-hidden rounded-3xl border p-6 transition ${
        accent
          ? "glow-soft border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        <Icon
          className={`h-4 w-4 shrink-0 ${
            accent
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        />
      </div>

      <div
        className="min-w-0 truncate text-2xl font-semibold tracking-tight"
        title={value}
      >
        {loading ? (
          <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" />
        ) : (
          value
        )}
      </div>

      {hint && (
        <p
          className="mt-1 min-w-0 truncate text-xs text-muted-foreground"
          title={hint}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  empty,
  emptyLabel,
  action,
}: {
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  children: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
  action?: {
    to: string;
    label: string;
  };
}) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 shrink-0 text-primary" />

          <span className="truncate">
            {title}
          </span>
        </div>

        {action && (
          <Link
            to={action.to}
            className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {action.label} →
          </Link>
        )}
      </div>

      {empty ? (
        <p className="break-words py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="min-w-0 max-w-full space-y-1 overflow-hidden">
          {children}
        </div>
      )}
    </section>
  );
}

function ManualRow({
  title,
  subtitle,
  hint,
  to,
}: {
  title?: string;
  subtitle?: string;
  hint?: string;
  to: string;
}) {
  const navigate =
    useNavigate();

  return (
    <button
      type="button"
      onClick={() =>
        navigate({
          to,
        })
      }
      className="group flex w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition hover:bg-secondary/50"
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className="block w-full min-w-0 truncate text-sm font-medium"
          title={
            title ??
            "Sem título"
          }
        >
          {title ??
            "Sem título"}
        </p>

        {subtitle && (
          <p
            className="mt-0.5 block w-full min-w-0 truncate text-xs text-muted-foreground"
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>

      {hint && (
        <span
          className="max-w-24 shrink-0 truncate text-right text-xs text-muted-foreground"
          title={hint}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 max-w-full items-center justify-between gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-card/80"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:glow-soft">
          <Icon className="h-4 w-4" />
        </div>

        <span className="min-w-0 truncate text-sm font-medium">
          {label}
        </span>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
    </Link>
  );
}

function getPlanDisplayName(
  status:
    | "trial"
    | "active"
    | "past_due"
    | "cancelled"
    | "expired"
    | null
    | undefined,
): string {
  switch (status) {
    case "trial":
      return "Período de teste";

    case "active":
      return "Casa dos brutos Pro";

    case "past_due":
      return "Pagamento pendente";

    case "cancelled":
      return "Assinatura cancelada";

    case "expired":
      return "Assinatura expirada";

    default:
      return "Nenhum";
  }
}

function getSubscriptionHint(
  status:
    | "trial"
    | "active"
    | "past_due"
    | "cancelled"
    | "expired"
    | null
    | undefined,
): string {
  switch (status) {
    case "trial":
      return "Período de teste ativo";

    case "active":
      return "Assinatura ativa";

    case "past_due":
      return "Pagamento pendente";

    case "cancelled":
      return "Cancelada";

    case "expired":
      return "Expirada";

    default:
      return "Sem assinatura ativa";
  }
}

function buildManualSubtitle(
  brand?: string | null,
  model?: string | null,
): string {
  return [brand, model]
    .filter(
      (
        value,
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim().length >
          0,
    )
    .join(" · ");
}

function formatDate(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "pt-BR",
  );
}
