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
  Search,
  Send,
  Tag,
  Wrench,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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

type MaterialRequestForm = {
  brand: string;
  model: string;
  year: string;
  materialType: string;
  description: string;
};

const INITIAL_FORM: MaterialRequestForm = {
  brand: "",
  model: "",
  year: "",
  materialType: "manual_servico",
  description: "",
};

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
  "/_authenticated/solicitar-material",
)({
  head: () => ({
    meta: [
      {
        title: "Solicitar material — Manual Stock",
      },
    ],
  }),

  component: RequestMaterialPage,
});

function RequestMaterialPage() {
  const queryClient = useQueryClient();

  const [form, setForm] =
    useState<MaterialRequestForm>(
      INITIAL_FORM,
    );

  /*
   * Temporário até você regenerar:
   * src/integrations/supabase/types.ts
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
            "Usuário não autenticado.",
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
                ascending:
                  false,
              },
            )
            .limit(8);

        if (error) {
          throw error;
        }

        return (
          data ?? []
        ) as MaterialRequestRow[];
      },

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  const submitMutation =
    useMutation({
      mutationFn:
        async () => {
          const normalizedBrand =
            form.brand
              .trim()
              .replace(
                /\s+/g,
                " ",
              );

          const normalizedModel =
            form.model
              .trim()
              .replace(
                /\s+/g,
                " ",
              );

          const normalizedYear =
            form.year
              .trim()
              .replace(
                /\s+/g,
                " ",
              );

          const normalizedDescription =
            form.description
              .trim()
              .replace(
                /\s+/g,
                " ",
              );

          if (
            normalizedBrand.length <
            2
          ) {
            throw new Error(
              "Informe a montadora.",
            );
          }

          if (
            normalizedModel.length <
            2
          ) {
            throw new Error(
              "Informe o modelo.",
            );
          }

          if (
            normalizedYear &&
            !isValidYearValue(
              normalizedYear,
            )
          ) {
            throw new Error(
              "Informe um ano válido, como 2020 ou 2018-2022.",
            );
          }

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

          /*
           * Evita o mesmo usuário enviar exatamente
           * a mesma solicitação várias vezes.
           */
          const {
            data:
              duplicateRequest,
            error:
              duplicateError,
          } =
            await untypedSupabase
              .from(
                "material_requests",
              )
              .select(
                "id, status",
              )
              .eq(
                "user_id",
                user.id,
              )
              .ilike(
                "brand",
                normalizedBrand,
              )
              .ilike(
                "model",
                normalizedModel,
              )
              .in(
                "status",
                [
                  "pending",
                  "reviewing",
                ],
              )
              .limit(1)
              .maybeSingle();

          if (
            duplicateError
          ) {
            throw duplicateError;
          }

          if (
            duplicateRequest
          ) {
            throw new Error(
              "Você já possui uma solicitação pendente para esse material.",
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
              .insert({
                user_id:
                  user.id,

                brand:
                  normalizedBrand,

                model:
                  normalizedModel,

                year:
                  normalizedYear ||
                  null,

                material_type:
                  form.materialType,

                description:
                  normalizedDescription ||
                  null,

                status:
                  "pending",
              })
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
        async () => {
          toast.success(
            "Solicitação enviada com sucesso!",
          );

          setForm(
            INITIAL_FORM,
          );

          await queryClient.invalidateQueries({
            queryKey: [
              "material-requests",
              "mine",
            ],
          });

          await queryClient.invalidateQueries({
            queryKey: [
              "notifications",
              "unread-count",
            ],
          });
        },

      onError:
        (error) => {
          console.error(
            "[SolicitarMaterial] Erro:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const pendingCount =
    useMemo(
      () =>
        (
          requestsQuery.data ??
          []
        ).filter(
          (request) =>
            request.status ===
              "pending" ||
            request.status ===
              "reviewing",
        ).length,
      [
        requestsQuery.data,
      ],
    );

  function updateField<
    Key extends keyof MaterialRequestForm,
  >(
    field: Key,
    value: MaterialRequestForm[Key],
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    );
  }

  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitMutation.isPending
    ) {
      return;
    }

    submitMutation.mutate();
  }

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

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <FileQuestion className="h-3.5 w-3.5" />
              Central de solicitações
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Solicitar material
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Não encontrou o modelo ou material que procura?
              Envie os detalhes abaixo para nossa equipe analisar.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Solicitações em andamento
            </p>

            <p className="mt-1 text-2xl font-semibold text-foreground">
              {pendingCount}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquareText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Detalhes do material
              </h2>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Quanto mais informações você enviar, mais fácil será
                localizar o arquivo correto.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Montadora"
                icon={Tag}
                required
              >
                <input
                  type="text"
                  value={
                    form.brand
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "brand",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ex.: Case"
                  maxLength={100}
                  disabled={
                    submitMutation.isPending
                  }
                  className={inputClassName}
                  required
                />
              </FormField>

              <FormField
                label="Modelo"
                icon={Wrench}
                required
              >
                <input
                  type="text"
                  value={
                    form.model
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "model",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ex.: W20 F, PC 200"
                  maxLength={160}
                  disabled={
                    submitMutation.isPending
                  }
                  className={inputClassName}
                  required
                />
              </FormField>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Ano"
                icon={CalendarDays}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    form.year
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "year",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ex.: 2020 ou 2018-2022"
                  maxLength={20}
                  disabled={
                    submitMutation.isPending
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField
                label="Tipo de material"
                icon={FileQuestion}
                required
              >
                <select
                  value={
                    form.materialType
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "materialType",
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    submitMutation.isPending
                  }
                  className={inputClassName}
                  required
                >
                  {MATERIAL_TYPES.map(
                    (type) => (
                      <option
                        key={
                          type.value
                        }
                        value={
                          type.value
                        }
                      >
                        {
                          type.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </FormField>
            </div>

            <FormField
              label="Informações adicionais"
              icon={MessageSquareText}
            >
              <textarea
                value={
                  form.description
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "description",
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Ex.: versão ABS, cilindrada, país, idioma ou alguma característica específica."
                maxLength={1000}
                rows={5}
                disabled={
                  submitMutation.isPending
                }
                className={`${inputClassName} min-h-32 resize-y py-3`}
              />

              <div className="mt-1 flex justify-end">
                <span className="text-[10px] text-muted-foreground">
                  {
                    form
                      .description
                      .length
                  }
                  /1000
                </span>
              </div>
            </FormField>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Antes de enviar, confirme se a montadora e o modelo
                  estão escritos corretamente. Você poderá acompanhar
                  o andamento em “Minhas solicitações”.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                submitMutation.isPending
              }
              className="glow-soft inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando solicitação...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar solicitação
                </>
              )}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Solicitações recentes
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Acompanhe seus últimos pedidos.
              </p>
            </div>

            <Link
              to="/minhas-solicitacoes"
              className="text-xs font-medium text-primary transition hover:opacity-80"
            >
              Ver todas
            </Link>
          </div>

          <div className="mt-6">
            {requestsQuery.isLoading && (
              <div className="flex min-h-44 items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              </div>
            )}

            {requestsQuery.isError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Não foi possível carregar as solicitações
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {getErrorMessage(
                        requestsQuery.error,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!requestsQuery.isLoading &&
              !requestsQuery.isError &&
              (
                requestsQuery.data ??
                []
              ).length === 0 && (
                <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border bg-background/40 px-5 text-center">
                  <div>
                    <FileQuestion className="mx-auto h-8 w-8 text-muted-foreground/50" />

                    <p className="mt-3 text-sm font-medium">
                      Nenhuma solicitação
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Seus pedidos aparecerão aqui depois do envio.
                    </p>
                  </div>
                </div>
              )}

            <div className="space-y-3">
              {(
                requestsQuery.data ??
                []
              ).map(
                (request) => (
                  <RequestCard
                    key={
                      request.id
                    }
                    request={
                      request
                    }
                  />
                ),
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FormField({
  label,
  icon: Icon,
  required = false,
  children,
}: {
  label: string;
  icon: typeof Tag;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />

        {label}

        {required && (
          <span className="text-destructive">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function RequestCard({
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
    <article className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {request.brand}{" "}
            {request.model}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            {request.year && (
              <span>
                {request.year}
              </span>
            )}

            {request.material_type && (
              <>
                <span>•</span>

                <span>
                  {getMaterialTypeLabel(
                    request.material_type,
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.className}`}
        >
          <StatusIcon className="h-3 w-3" />

          {status.label}
        </span>
      </div>

      {request.admin_note && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resposta da equipe
          </p>

          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {request.admin_note}
          </p>
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground">
        Enviado em{" "}
        {formatDateTime(
          request.created_at,
        )}
      </p>
    </article>
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
        icon: AlertCircle,
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
        type.value ===
        value,
    )?.label ??
    "Outro material"
  );
}

function isValidYearValue(
  value: string,
): boolean {
  return /^(19|20)\d{2}(?:\s*[-–]\s*(19|20)\d{2})?$/.test(
    value,
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
      return "A tabela de solicitações ainda não foi criada no Supabase.";
    }

    if (
      message.includes(
        "row-level security",
      )
    ) {
      return "Você não tem permissão para criar esta solicitação. Verifique as políticas RLS.";
    }

    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
