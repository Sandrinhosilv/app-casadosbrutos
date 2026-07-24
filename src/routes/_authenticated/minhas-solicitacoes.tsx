import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Wrench,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type MaterialRequestStatus =
  | "pending"
  | "reviewing"
  | "completed"
  | "rejected";

type MaterialRequestRow = {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: string | null;
  material_type: string | null;
  description: string | null;
  status: MaterialRequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type StatusFilter =
  | "all"
  | MaterialRequestStatus;

type MaterialTypeOption = {
  value: string;
  label: string;
};

const MATERIAL_TYPES: MaterialTypeOption[] = [
  {
    value: "manual_servico",
    label: "Manual de serviço",
  },
  {
    value: "manual_proprietario",
    label: "Manual do proprietário",
  },
  {
    value: "esquema_eletrico",
    label: "Esquema elétrico",
  },
  {
    value: "catalogo_pecas",
    label: "Catálogo de peças",
  },
  {
    value: "boletim_tecnico",
    label: "Boletim técnico",
  },
  {
    value: "outro",
    label: "Outro material",
  },
];

const STATUS_FILTERS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Todas",
  },
  {
    value: "pending",
    label: "Pendentes",
  },
  {
    value: "reviewing",
    label: "Em análise",
  },
  {
    value: "completed",
    label: "Concluídas",
  },
  {
    value: "rejected",
    label: "Não encontradas",
  },
];

export const Route = createFileRoute(
  "/_authenticated/minhas-solicitacoes",
)({
  head: () => ({
    meta: [
      {
        title:
          "Minhas solicitações — Manual Stock",
      },
    ],
  }),

  component: MyMaterialRequestsPage,
});

function MyMaterialRequestsPage() {
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [searchTerm, setSearchTerm] =
    useState("");

  /*
   * Temporário até os tipos do Supabase serem regenerados
   * com a tabela material_requests.
   */
  const untypedSupabase =
    supabase as any;

  const requestsQuery =
    useQuery({
      queryKey: [
        "material-requests",
        "mine",
      ],

      queryFn: async () => {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Sua sessão expirou. Entre novamente.",
          );
        }

        const {
          data,
          error,
        } =
          await untypedSupabase
            .from(
              "material_requests",
            )
            .select(
              `
                id,
                user_id,
                brand,
                model,
                year,
                material_type,
                description,
                status,
                admin_note,
                created_at,
                updated_at,
                completed_at
              `,
            )
            .eq(
              "user_id",
              user.id,
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            )
            .limit(200);

        if (error) {
          throw error;
        }

        return (
          data ?? []
        ) as MaterialRequestRow[];
      },

      retry: 1,

      refetchOnWindowFocus:
        true,
    });

  const requests =
    requestsQuery.data ?? [];

  const filteredRequests =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          searchTerm,
        );

      return requests.filter(
        (request) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            request.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          const searchableText =
            normalizeText(
              [
                request.brand,
                request.model,
                request.year,
                request.material_type,
                request.description,
                request.admin_note,
              ]
                .filter(Boolean)
                .join(" "),
            );

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      requests,
      statusFilter,
      searchTerm,
    ]);

  const statusCounts =
    useMemo(() => {
      return {
        all:
          requests.length,

        pending:
          requests.filter(
            (request) =>
              request.status ===
              "pending",
          ).length,

        reviewing:
          requests.filter(
            (request) =>
              request.status ===
              "reviewing",
          ).length,

        completed:
          requests.filter(
            (request) =>
              request.status ===
              "completed",
          ).length,

        rejected:
          requests.filter(
            (request) =>
              request.status ===
              "rejected",
          ).length,
      };
    }, [requests]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o dashboard
        </Link>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <FileQuestion className="h-3.5 w-3.5" />
              Central de solicitações
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Minhas solicitações
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Acompanhe os materiais que você
              solicitou e veja as respostas da
              equipe.
            </p>
          </div>

          <Link
            to="/solicitar-material"
            className="glow-soft inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nova solicitação
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={statusCounts.all}
          icon={FileQuestion}
          className="border-border bg-card"
        />

        <SummaryCard
          label="Pendentes"
          value={statusCounts.pending}
          icon={Clock3}
          className="border-amber-500/30 bg-amber-500/5"
          iconClassName="text-amber-500"
        />

        <SummaryCard
          label="Em análise"
          value={statusCounts.reviewing}
          icon={Search}
          className="border-blue-500/30 bg-blue-500/5"
          iconClassName="text-blue-500"
        />

        <SummaryCard
          label="Concluídas"
          value={statusCounts.completed}
          icon={CheckCircle2}
          className="border-emerald-500/30 bg-emerald-500/5"
          iconClassName="text-emerald-500"
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Buscar por montadora, modelo ou ano..."
              className="h-11 w-full rounded-2xl border border-border bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              requestsQuery.refetch()
            }
            disabled={
              requestsQuery.isFetching
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                requestsQuery.isFetching
                  ? "animate-spin"
                  : ""
              }`}
            />

            Atualizar
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(
            (filter) => {
              const active =
                statusFilter ===
                filter.value;

              const count =
                statusCounts[
                  filter.value
                ];

              return (
                <button
                  key={
                    filter.value
                  }
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      filter.value,
                    )
                  }
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-medium transition ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {filter.label}

                  <span
                    className={`grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="mt-6">
        {requestsQuery.isLoading && (
          <LoadingState />
        )}

        {requestsQuery.isError && (
          <ErrorState
            error={
              requestsQuery.error
            }
            onRetry={() =>
              requestsQuery.refetch()
            }
          />
        )}

        {!requestsQuery.isLoading &&
          !requestsQuery.isError &&
          requests.length === 0 && (
            <EmptyState />
          )}

        {!requestsQuery.isLoading &&
          !requestsQuery.isError &&
          requests.length > 0 &&
          filteredRequests.length ===
            0 && (
            <NoResultsState
              onClear={() => {
                setSearchTerm("");
                setStatusFilter(
                  "all",
                );
              }}
            />
          )}

        {!requestsQuery.isLoading &&
          !requestsQuery.isError &&
          filteredRequests.length >
            0 && (
            <div className="space-y-4">
              {filteredRequests.map(
                (request) => (
                  <MaterialRequestCard
                    key={request.id}
                    request={
                      request
                    }
                  />
                ),
              )}
            </div>
          )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
  iconClassName = "text-primary",
}: {
  label: string;
  value: number;
  icon: typeof FileQuestion;
  className: string;
  iconClassName?: string;
}) {
  return (
    <article
      className={`rounded-3xl border p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-background/60">
          <Icon
            className={`h-5 w-5 ${iconClassName}`}
          />
        </span>
      </div>
    </article>
  );
}

function MaterialRequestCard({
  request,
}: {
  request: MaterialRequestRow;
}) {
  const status =
    getStatusData(
      request.status,
    );

  const StatusIcon =
    status.icon;

  return (
    <article className="overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {request.brand}{" "}
                {request.model}
              </h2>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {request.year && (
                <DetailBadge
                  icon={
                    CalendarDays
                  }
                  label={
                    request.year
                  }
                />
              )}

              {request.material_type && (
                <DetailBadge
                  icon={
                    FileQuestion
                  }
                  label={getMaterialTypeLabel(
                    request.material_type,
                  )}
                />
              )}

              <DetailBadge
                icon={Clock3}
                label={`Enviado em ${formatDate(
                  request.created_at,
                )}`}
              />
            </div>
          </div>

          <span className="shrink-0 text-[10px] text-muted-foreground">
            Atualizado em{" "}
            {formatDateTime(
              request.updated_at,
            )}
          </span>
        </div>

        {request.description && (
          <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Informações enviadas
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {
                    request.description
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {request.admin_note && (
          <div
            className={`mt-4 rounded-2xl border p-4 ${
              request.status ===
              "completed"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : request.status ===
                    "rejected"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <MessageSquareText
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  request.status ===
                  "completed"
                    ? "text-emerald-500"
                    : request.status ===
                        "rejected"
                      ? "text-destructive"
                      : "text-primary"
                }`}
              />

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Resposta da equipe
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {
                    request.admin_note
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {request.status ===
          "completed" && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />

              <div>
                <p className="text-sm font-medium text-emerald-500">
                  Material disponível
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  A equipe marcou esta
                  solicitação como concluída.
                </p>
              </div>
            </div>

            <Link
              to="/pesquisar"
              search={{
                q: `${request.brand} ${request.model}`,
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-medium text-white transition hover:opacity-90"
            >
              <Search className="h-3.5 w-3.5" />
              Procurar material
            </Link>
          </div>
        )}

        {request.status ===
          "reviewing" && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
            <Search className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Nossa equipe está procurando
              esse material. Você receberá
              uma notificação quando houver
              uma atualização.
            </p>
          </div>
        )}

        {request.status ===
          "pending" && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Sua solicitação foi recebida
              e aguarda análise da equipe.
            </p>
          </div>
        )}

        {request.status ===
          "rejected" &&
          !request.admin_note && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

              <p className="text-xs leading-relaxed text-muted-foreground">
                Não foi possível localizar
                este material no momento.
              </p>
            </div>
          )}
      </div>
    </article>
  );
}

function DetailBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Tag;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-[28px] border border-border bg-card">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">
          Carregando suas
          solicitações...
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-destructive">
            Não foi possível carregar
            suas solicitações
          </h2>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {getErrorMessage(
              error,
            )}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-80 place-items-center rounded-[28px] border border-dashed border-border bg-card px-6 text-center">
      <div className="max-w-sm">
        <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground/50" />

        <h2 className="mt-4 text-lg font-semibold">
          Nenhuma solicitação enviada
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Quando você não encontrar um
          modelo ou material, envie uma
          solicitação para nossa equipe.
        </p>

        <Link
          to="/solicitar-material"
          className="glow-soft mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Solicitar material
        </Link>
      </div>
    </div>
  );
}

function NoResultsState({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[28px] border border-dashed border-border bg-card px-6 text-center">
      <div>
        <Search className="mx-auto h-9 w-9 text-muted-foreground/50" />

        <h2 className="mt-4 text-base font-semibold">
          Nenhum resultado encontrado
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Tente outro termo ou remova os
          filtros aplicados.
        </p>

        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-xs font-medium transition hover:bg-secondary"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

function getStatusData(
  status: MaterialRequestStatus,
) {
  switch (status) {
    case "reviewing":
      return {
        label: "Em análise",
        icon: Search,
        className:
          "border-blue-500/30 bg-blue-500/10 text-blue-500",
      };

    case "completed":
      return {
        label: "Concluída",
        icon: CheckCircle2,
        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
      };

    case "rejected":
      return {
        label: "Não encontrada",
        icon: XCircle,
        className:
          "border-destructive/30 bg-destructive/10 text-destructive",
      };

    default:
      return {
        label: "Pendente",
        icon: Clock3,
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-500",
      };
  }
}

function getMaterialTypeLabel(
  value: string,
): string {
  return (
    MATERIAL_TYPES.find(
      (type) =>
        type.value === value,
    )?.label ??
    "Outro material"
  );
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "data indisponível";
  }

  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function formatDateTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "data indisponível";
  }

  return date.toLocaleString(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  );
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    const message =
      error.message.toLowerCase();

    if (
      message.includes(
        "material_requests",
      ) &&
      message.includes(
        "does not exist",
      )
    ) {
      return "A tabela material_requests ainda não foi criada no Supabase.";
    }

    if (
      message.includes(
        "row-level security",
      ) ||
      message.includes(
        "permission denied",
      )
    ) {
      return "Você não tem permissão para acessar essas solicitações. Verifique as políticas RLS.";
    }

    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}