import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type MaterialRequestStatus =
  | "pending"
  | "reviewing"
  | "completed"
  | "rejected";

type StatusFilter =
  | "all"
  | MaterialRequestStatus;

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

  profiles?:
    | {
        id?: string;
        full_name?: string | null;
        email?: string | null;
      }
    | Array<{
        id?: string;
        full_name?: string | null;
        email?: string | null;
      }>
    | null;
};

type UpdateRequestInput = {
  requestId: string;
  status: MaterialRequestStatus;
  adminNote: string;
};

type RequestDrafts = Record<
  string,
  {
    status: MaterialRequestStatus;
    adminNote: string;
  }
>;

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
    label: "Recusadas",
  },
];

const MATERIAL_TYPES = [
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

export const Route = createFileRoute(
  "/_authenticated/admin/solicitacoes",
)({
  head: () => ({
    meta: [
      {
        title:
          "Solicitações de materiais — Admin",
      },
    ],
  }),

  component:
    AdminMaterialRequestsPage,
});

function AdminMaterialRequestsPage() {
  const queryClient =
    useQueryClient();

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [drafts, setDrafts] =
    useState<RequestDrafts>({});

  /*
   * Temporário até material_requests e notifications
   * aparecerem nos tipos gerados do Supabase.
   */
  const untypedSupabase =
    supabase as any;

  const adminQuery =
    useQuery({
      queryKey: [
        "admin",
        "material-requests",
        "access",
      ],

      queryFn: async () => {
        const {
          data: {
            user,
          },
          error:
            userError,
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
          data: role,
          error:
            roleError,
        } =
          await supabase
            .from("user_roles")
            .select("role")
            .eq(
              "user_id",
              user.id,
            )
            .maybeSingle();

        if (roleError) {
          throw roleError;
        }

        if (
          role?.role !==
          "admin"
        ) {
          throw new Error(
            "Você não possui permissão de administrador.",
          );
        }

        return {
          userId:
            user.id,
        };
      },

      staleTime:
        5 * 60 * 1000,

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  const requestsQuery =
    useQuery({
      queryKey: [
        "admin",
        "material-requests",
        "list",
      ],

      enabled:
        Boolean(
          adminQuery.data,
        ),

      queryFn: async () => {
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
                completed_at,
                profiles (
                  id,
                  full_name,
                  email
                )
              `,
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            )
            .limit(500);

        if (error) {
          throw error;
        }

        const rows =
          (data ??
            []) as MaterialRequestRow[];

        setDrafts(
          (current) => {
            const next = {
              ...current,
            };

            for (
              const request of
              rows
            ) {
              if (
                !next[
                  request.id
                ]
              ) {
                next[
                  request.id
                ] = {
                  status:
                    request.status,

                  adminNote:
                    request.admin_note ??
                    "",
                };
              }
            }

            return next;
          },
        );

        return rows;
      },

      retry: 1,

      refetchOnWindowFocus:
        true,
    });

  const updateMutation =
    useMutation({
      mutationFn:
        async ({
          requestId,
          status,
          adminNote,
        }: UpdateRequestInput) => {
          const normalizedNote =
            adminNote
              .trim()
              .replace(
                /\s+/g,
                " ",
              );

          if (
            status ===
              "rejected" &&
            normalizedNote.length <
              3
          ) {
            throw new Error(
              "Informe o motivo da recusa.",
            );
          }

          const updateData: {
            status: MaterialRequestStatus;
            admin_note: string | null;
            completed_at?: string | null;
          } = {
            status,

            admin_note:
              normalizedNote ||
              null,
          };

          if (
            status ===
            "completed"
          ) {
            updateData.completed_at =
              new Date().toISOString();
          } else {
            updateData.completed_at =
              null;
          }

          const {
            data,
            error,
          } =
            await untypedSupabase
              .from(
                "material_requests",
              )
              .update(
                updateData,
              )
              .eq(
                "id",
                requestId,
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
              .single();

          if (error) {
            throw error;
          }

          return data as
            MaterialRequestRow;
        },

      onSuccess:
        async (
          request,
        ) => {
          toast.success(
            getUpdateSuccessMessage(
              request.status,
            ),
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "admin",
                "material-requests",
                "list",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "material-requests",
                "mine",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "notifications",
                "list",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "notifications",
                "unread-count",
              ],
            }),
          ]);
        },

      onError:
        (error) => {
          console.error(
            "[AdminSolicitacoes] Erro ao atualizar:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const requests =
    requestsQuery.data ??
    [];

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

          const profile =
            normalizeRelation(
              request.profiles,
            );

          const searchable =
            normalizeText(
              [
                request.brand,
                request.model,
                request.year,
                request.material_type,
                request.description,
                request.admin_note,
                profile?.full_name,
                profile?.email,
              ]
                .filter(Boolean)
                .join(" "),
            );

          return searchable.includes(
            normalizedSearch,
          );
        },
      );
    }, [
      requests,
      statusFilter,
      searchTerm,
    ]);

  const counts =
    useMemo(
      () => ({
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
      }),
      [requests],
    );

  const isLoading =
    adminQuery.isLoading ||
    requestsQuery.isLoading;

  const isError =
    adminQuery.isError ||
    requestsQuery.isError;

  const pageError =
    adminQuery.error ??
    requestsQuery.error;

  function updateDraft(
    requestId: string,
    field:
      | "status"
      | "adminNote",
    value: string,
  ) {
    setDrafts(
      (current) => ({
        ...current,

        [requestId]: {
          status:
            field ===
            "status"
              ? (value as MaterialRequestStatus)
              : current[
                  requestId
                ]?.status ??
                "pending",

          adminNote:
            field ===
            "adminNote"
              ? value
              : current[
                  requestId
                ]?.adminNote ??
                "",
        },
      }),
    );
  }

  function saveRequest(
    request: MaterialRequestRow,
  ) {
    const draft =
      drafts[
        request.id
      ] ?? {
        status:
          request.status,

        adminNote:
          request.admin_note ??
          "",
      };

    updateMutation.mutate({
      requestId:
        request.id,

      status:
        draft.status,

      adminNote:
        draft.adminNote,
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao painel
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Área administrativa
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Solicitações de materiais
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Analise os materiais solicitados
              pelos usuários, atualize o status e
              envie uma resposta.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              requestsQuery.refetch()
            }
            disabled={
              requestsQuery.isFetching
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total"
          value={counts.all}
          icon={FileQuestion}
        />

        <SummaryCard
          label="Pendentes"
          value={counts.pending}
          icon={Clock3}
          className="border-amber-500/30 bg-amber-500/5"
          iconClassName="text-amber-500"
        />

        <SummaryCard
          label="Em análise"
          value={counts.reviewing}
          icon={Search}
          className="border-blue-500/30 bg-blue-500/5"
          iconClassName="text-blue-500"
        />

        <SummaryCard
          label="Concluídas"
          value={counts.completed}
          icon={CheckCircle2}
          className="border-emerald-500/30 bg-emerald-500/5"
          iconClassName="text-emerald-500"
        />

        <SummaryCard
          label="Recusadas"
          value={counts.rejected}
          icon={XCircle}
          className="border-destructive/30 bg-destructive/5"
          iconClassName="text-destructive"
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
              placeholder="Buscar por usuário, e-mail, marca, modelo ou ano..."
              className="h-11 w-full rounded-2xl border border-border bg-background/70 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {
              filteredRequests.length
            }{" "}
            solicitação
            {filteredRequests.length ===
            1
              ? ""
              : "ões"}
          </p>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(
            (filter) => {
              const active =
                statusFilter ===
                filter.value;

              const count =
                counts[
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
                  {
                    filter.label
                  }

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
        {isLoading && (
          <LoadingState />
        )}

        {isError && (
          <ErrorState
            error={
              pageError
            }
            onRetry={() => {
              void adminQuery.refetch();
              void requestsQuery.refetch();
            }}
          />
        )}

        {!isLoading &&
          !isError &&
          requests.length ===
            0 && (
            <EmptyState />
          )}

        {!isLoading &&
          !isError &&
          requests.length >
            0 &&
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

        {!isLoading &&
          !isError &&
          filteredRequests.length >
            0 && (
            <div className="space-y-5">
              {filteredRequests.map(
                (request) => {
                  const draft =
                    drafts[
                      request.id
                    ] ?? {
                      status:
                        request.status,

                      adminNote:
                        request.admin_note ??
                        "",
                    };

                  const saving =
                    updateMutation.isPending &&
                    updateMutation
                      .variables
                      ?.requestId ===
                      request.id;

                  return (
                    <RequestCard
                      key={
                        request.id
                      }
                      request={
                        request
                      }
                      draft={
                        draft
                      }
                      saving={
                        saving
                      }
                      onStatusChange={(
                        value,
                      ) =>
                        updateDraft(
                          request.id,
                          "status",
                          value,
                        )
                      }
                      onNoteChange={(
                        value,
                      ) =>
                        updateDraft(
                          request.id,
                          "adminNote",
                          value,
                        )
                      }
                      onSave={() =>
                        saveRequest(
                          request,
                        )
                      }
                    />
                  );
                },
              )}
            </div>
          )}
      </section>
    </main>
  );
}

function RequestCard({
  request,
  draft,
  saving,
  onStatusChange,
  onNoteChange,
  onSave,
}: {
  request: MaterialRequestRow;
  draft: {
    status: MaterialRequestStatus;
    adminNote: string;
  };
  saving: boolean;
  onStatusChange: (
    value: MaterialRequestStatus,
  ) => void;
  onNoteChange: (
    value: string,
  ) => void;
  onSave: () => void;
}) {
  const status =
    getStatusData(
      request.status,
    );

  const StatusIcon =
    status.icon;

  const profile =
    normalizeRelation(
      request.profiles,
    );

  const hasChanges =
    draft.status !==
      request.status ||
    draft.adminNote.trim() !==
      (
        request.admin_note ??
        ""
      ).trim();

  return (
    <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
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

            <div className="mt-4 flex flex-wrap gap-2">
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

              <DetailBadge
                icon={
                  FileQuestion
                }
                label={getMaterialTypeLabel(
                  request.material_type,
                )}
              />

              <DetailBadge
                icon={
                  Clock3
                }
                label={`Enviado em ${formatDateTime(
                  request.created_at,
                )}`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 xl:min-w-64">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile
                    ?.full_name ??
                    "Usuário"}
                </p>

                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {profile
                    ?.email ??
                    request.user_id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {request.description && (
          <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Detalhes enviados
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {
                    request.description
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Status
            </span>

            <select
              value={
                draft.status
              }
              onChange={(
                event,
              ) =>
                onStatusChange(
                  event.target
                    .value as MaterialRequestStatus,
                )
              }
              disabled={saving}
              className={inputClassName}
            >
              <option value="pending">
                Pendente
              </option>

              <option value="reviewing">
                Em análise
              </option>

              <option value="completed">
                Concluída
              </option>

              <option value="rejected">
                Recusada
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5" />
              Resposta para o usuário
            </span>

            <textarea
              value={
                draft.adminNote
              }
              onChange={(
                event,
              ) =>
                onNoteChange(
                  event.target
                    .value,
                )
              }
              placeholder={
                draft.status ===
                "completed"
                  ? "Ex.: O material já foi adicionado e está disponível na pesquisa."
                  : draft.status ===
                      "rejected"
                    ? "Informe por que o material não pôde ser localizado."
                    : "Adicione uma observação opcional."
              }
              maxLength={1500}
              rows={4}
              disabled={saving}
              className={`${inputClassName} min-h-28 resize-y py-3`}
            />

            <div className="mt-1 flex justify-end">
              <span className="text-[10px] text-muted-foreground">
                {
                  draft
                    .adminNote
                    .length
                }
                /1500
              </span>
            </div>
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted-foreground">
            Última atualização:{" "}
            {formatDateTime(
              request.updated_at,
            )}
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={
              saving ||
              !hasChanges
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Salvar atualização
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className =
    "border-border bg-card",
  iconClassName =
    "text-primary",
}: {
  label: string;
  value: number;
  icon: typeof FileQuestion;
  className?: string;
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
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">
          Carregando solicitações...
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
        <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />

        <div>
          <h2 className="font-semibold text-destructive">
            Não foi possível carregar as solicitações
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(
              error,
            )}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-medium"
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
      <div>
        <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground/50" />

        <h2 className="mt-4 text-lg font-semibold">
          Nenhuma solicitação
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          As solicitações enviadas pelos usuários aparecerão aqui.
        </p>
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
          Nenhuma solicitação encontrada
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Tente outro termo ou remova os filtros.
        </p>

        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-xs font-medium"
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
        label:
          "Em análise",

        icon:
          Search,

        className:
          "border-blue-500/30 bg-blue-500/10 text-blue-500",
      };

    case "completed":
      return {
        label:
          "Concluída",

        icon:
          CheckCircle2,

        className:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
      };

    case "rejected":
      return {
        label:
          "Recusada",

        icon:
          XCircle,

        className:
          "border-destructive/30 bg-destructive/10 text-destructive",
      };

    default:
      return {
        label:
          "Pendente",

        icon:
          Clock3,

        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-500",
      };
  }
}

function getMaterialTypeLabel(
  value:
    | string
    | null,
): string {
  return (
    MATERIAL_TYPES.find(
      (item) =>
        item.value ===
        value,
    )?.label ??
    "Outro material"
  );
}

function getUpdateSuccessMessage(
  status: MaterialRequestStatus,
): string {
  switch (status) {
    case "reviewing":
      return "Solicitação marcada como em análise.";

    case "completed":
      return "Solicitação concluída e usuário notificado.";

    case "rejected":
      return "Solicitação recusada e usuário notificado.";

    default:
      return "Solicitação atualizada.";
  }
}

function normalizeRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    return value[0] ??
      null;
  }

  return value;
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
      /[_-]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
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
      dateStyle:
        "short",

      timeStyle:
        "short",
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
      return "A tabela material_requests ainda não foi criada.";
    }

    if (
      message.includes(
        "permission denied",
      ) ||
      message.includes(
        "row-level security",
      )
    ) {
      return "O administrador não possui permissão para acessar ou atualizar as solicitações. Verifique as políticas RLS.";
    }

    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";