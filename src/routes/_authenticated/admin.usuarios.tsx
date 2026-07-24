import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  listAdminUsers,
  setUserRole,
  setUserSubscription,
} from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UserRole = "user" | "admin";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

type AdminPlan = {
  id: string;
  name?: string | null;
  title?: string | null;
};

type AdminSubscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: SubscriptionStatus | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  gateway: string | null;
  plans?: AdminPlan | AdminPlan[] | null;
};

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;

  user_roles?: Array<{
    user_id: string;
    role: UserRole;
  }>;

  subscriptions?: AdminSubscription[];
};

type RoleMutationInput = {
  userId: string;
  role: UserRole;
};

type SubscriptionMutationInput = {
  userId: string;
  status: SubscriptionStatus;
  plan_id?: string;
  expires_at?: string;
};

const statusLabels: Record<
  SubscriptionStatus,
  string
> = {
  trial: "Teste grátis",
  active: "Ativa",
  past_due: "Pagamento atrasado",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const statusStyles: Record<
  SubscriptionStatus,
  string
> = {
  trial:
    "border-blue-500/30 bg-blue-500/10 text-blue-600",
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  past_due:
    "border-amber-500/30 bg-amber-500/10 text-amber-600",
  cancelled:
    "border-muted-foreground/30 bg-muted text-muted-foreground",
  expired:
    "border-red-500/30 bg-red-500/10 text-red-600",
};

export const Route = createFileRoute(
  "/_authenticated/admin/usuarios",
)({
  component: AdminUsers,

  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

        <div>
          <h2 className="text-sm font-semibold text-destructive">
            Erro ao carregar usuários
          </h2>

          <p className="mt-1 break-words text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  ),

  notFoundComponent: () => (
    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
      Página de usuários não encontrada.
    </div>
  ),
});

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function addDaysToNow(days: number): string {
  const date = new Date();

  date.setDate(
    date.getDate() + days,
  );

  return date.toISOString();
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
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

function getPlanName(
  subscription?: AdminSubscription,
): string {
  if (!subscription?.plans) {
    return subscription?.plan_id
      ? "Plano vinculado"
      : "Sem plano";
  }

  if (
    Array.isArray(
      subscription.plans,
    )
  ) {
    const firstPlan =
      subscription.plans[0];

    return (
      firstPlan?.name ||
      firstPlan?.title ||
      "Plano vinculado"
    );
  }

  return (
    subscription.plans.name ||
    subscription.plans.title ||
    "Plano vinculado"
  );
}

function AdminUsers() {
  const queryClient =
    useQueryClient();

  const listUsers =
    useServerFn(listAdminUsers);

  const updateRole =
    useServerFn(setUserRole);

  const updateSubscription =
    useServerFn(
      setUserSubscription,
    );

  const [search, setSearch] =
    useState("");

  const normalizedSearch =
    useMemo(
      () => search.trim(),
      [search],
    );

  const usersQuery = useQuery({
    queryKey: [
      "admin",
      "users",
      normalizedSearch,
    ],

    queryFn: async () => {
      const result = await listUsers({
        data: {
          q:
            normalizedSearch ||
            undefined,
        },
      });

      return result as AdminUser[];
    },

    staleTime: 15_000,

    retry: 1,

    refetchOnWindowFocus: false,
  });

  const roleMutation =
    useMutation({
      mutationFn: async (
        value: RoleMutationInput,
      ) =>
        updateRole({
          data: value,
        }),

      onSuccess: async (
        result,
      ) => {
        toast.success(
          result.role === "admin"
            ? "Usuário definido como administrador"
            : "Usuário definido como usuário comum",
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "users",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "overview",
            ],
          }),
        ]);
      },

      onError: (error) => {
        console.error(
          "[AdminUsers] Erro ao atualizar papel:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Erro ao atualizar papel",
          ),
        );
      },
    });

  const subscriptionMutation =
    useMutation({
      mutationFn: async (
        value: SubscriptionMutationInput,
      ) =>
        updateSubscription({
          data: value,
        }),

      onSuccess: async (
        result,
      ) => {
        const status =
          result.subscription
            ?.status as SubscriptionStatus;

        toast.success(
          `Assinatura atualizada: ${
            statusLabels[
              status
            ] ?? status
          }`,
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "users",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "overview",
            ],
          }),
        ]);
      },

      onError: (error) => {
        console.error(
          "[AdminUsers] Erro ao atualizar assinatura:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Erro ao atualizar assinatura",
          ),
        );
      },
    });

  const users =
    usersQuery.data ?? [];

  const pendingRoleUserId =
    roleMutation.variables
      ?.userId ?? null;

  const pendingSubscriptionUserId =
    subscriptionMutation.variables
      ?.userId ?? null;

  function activateSubscription(
    userId: string,
  ) {
    subscriptionMutation.mutate({
      userId,
      status: "active",
      expires_at:
        addDaysToNow(30),
    });
  }

  function startTrial(
    userId: string,
  ) {
    subscriptionMutation.mutate({
      userId,
      status: "trial",
      expires_at:
        addDaysToNow(7),
    });
  }

  function cancelSubscription(
    userId: string,
  ) {
    subscriptionMutation.mutate({
      userId,
      status: "cancelled",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Usuários
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie permissões,
            assinaturas e acessos.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className="pl-9"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Atualizar usuários"
            disabled={
              usersQuery.isFetching
            }
            onClick={() =>
              usersQuery.refetch()
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${
                usersQuery.isFetching
                  ? "animate-spin"
                  : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {usersQuery.isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />

            <div>
              <p className="text-sm font-medium text-destructive">
                Não foi possível listar
                os usuários
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {getErrorMessage(
                  usersQuery.error,
                  "Erro desconhecido",
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  Usuário
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Permissão
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Assinatura
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Validade
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {usersQuery.isLoading &&
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <tr
                      key={index}
                      className="border-t border-border"
                    >
                      <td
                        colSpan={5}
                        className="px-4 py-5"
                      >
                        <div className="h-10 animate-pulse rounded-xl bg-muted" />
                      </td>
                    </tr>
                  ),
                )}

              {!usersQuery.isLoading &&
                users.map(
                  (user) => {
                    const role:
                      UserRole =
                      user
                        .user_roles?.[0]
                        ?.role ??
                      "user";

                    const subscription =
                      user
                        .subscriptions?.[0];

                    const status =
                      subscription
                        ?.status ?? null;

                    const isRolePending =
                      pendingRoleUserId ===
                        user.id &&
                      roleMutation.isPending;

                    const isSubscriptionPending =
                      pendingSubscriptionUserId ===
                        user.id &&
                      subscriptionMutation.isPending;

                    const isPending =
                      isRolePending ||
                      isSubscriptionPending;

                    return (
                      <tr
                        key={user.id}
                        className="border-t border-border align-top transition hover:bg-muted/20"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <UserRound className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {user.full_name ||
                                  "Sem nome"}
                              </div>

                              <div className="truncate text-xs text-muted-foreground">
                                {user.email ||
                                  "Sem e-mail"}
                              </div>

                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Cadastro:{" "}
                                {formatDate(
                                  user.created_at,
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <select
                            value={role}
                            disabled={
                              isPending
                            }
                            onChange={(
                              event,
                            ) =>
                              roleMutation.mutate(
                                {
                                  userId:
                                    user.id,

                                  role:
                                    event
                                      .target
                                      .value as UserRole,
                                },
                              )
                            }
                            className="h-9 rounded-xl border border-border bg-background px-3 text-xs outline-none transition focus:border-primary"
                          >
                            <option value="user">
                              Usuário
                            </option>

                            <option value="admin">
                              Administrador
                            </option>
                          </select>
                        </td>

                        <td className="px-4 py-4">
                          {subscription &&
                          status ? (
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                  statusStyles[
                                    status
                                  ] ??
                                  "border-border bg-muted text-muted-foreground"
                                }`}
                              >
                                {statusLabels[
                                  status
                                ] ??
                                  status}
                              </span>

                              <div className="text-xs text-muted-foreground">
                                {getPlanName(
                                  subscription,
                                )}
                              </div>

                              {subscription.gateway && (
                                <div className="text-[11px] text-muted-foreground">
                                  Origem:{" "}
                                  {
                                    subscription.gateway
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                              Sem assinatura
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />

                            {subscription
                              ?.expires_at
                              ? formatDate(
                                  subscription.expires_at,
                                )
                              : "Sem validade"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                isPending
                              }
                              onClick={() =>
                                startTrial(
                                  user.id,
                                )
                              }
                            >
                              {isSubscriptionPending &&
                              subscriptionMutation
                                .variables
                                ?.status ===
                                "trial" ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Clock3 className="mr-2 h-3.5 w-3.5" />
                              )}

                              Teste
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                isPending
                              }
                              onClick={() =>
                                activateSubscription(
                                  user.id,
                                )
                              }
                            >
                              {isSubscriptionPending &&
                              subscriptionMutation
                                .variables
                                ?.status ===
                                "active" ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                              )}

                              Ativar
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                isPending
                              }
                              onClick={() =>
                                cancelSubscription(
                                  user.id,
                                )
                              }
                            >
                              {isSubscriptionPending &&
                              subscriptionMutation
                                .variables
                                ?.status ===
                                "cancelled" ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="mr-2 h-3.5 w-3.5" />
                              )}

                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}

              {!usersQuery.isLoading &&
                users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center"
                    >
                      <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />

                      <p className="mt-3 text-sm font-medium">
                        Nenhum usuário
                        encontrado
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Tente alterar o termo
                        de busca.
                      </p>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
