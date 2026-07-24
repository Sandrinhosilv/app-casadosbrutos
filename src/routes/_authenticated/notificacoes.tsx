import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock3,
  FileQuestion,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  type NotificationRow,
} from "@/lib/notifications.functions";

type NotificationFilter =
  | "all"
  | "unread"
  | "read";

const FILTERS: Array<{
  value: NotificationFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Todas",
  },
  {
    value: "unread",
    label: "Não lidas",
  },
  {
    value: "read",
    label: "Lidas",
  },
];

export const Route = createFileRoute(
  "/_authenticated/notificacoes",
)({
  head: () => ({
    meta: [
      {
        title:
          "Notificações — Manual Stock",
      },
    ],
  }),

  component:
    NotificationsPage,
});

function NotificationsPage() {
  const queryClient =
    useQueryClient();

  const [filter, setFilter] =
    useState<NotificationFilter>(
      "all",
    );

  const [searchTerm, setSearchTerm] =
    useState("");

  const listNotificationsFn =
    useServerFn(
      listNotifications,
    );

  const markReadFn =
    useServerFn(
      markNotificationRead,
    );

  const markUnreadFn =
    useServerFn(
      markNotificationUnread,
    );

  const markAllReadFn =
    useServerFn(
      markAllNotificationsRead,
    );

  const deleteNotificationFn =
    useServerFn(
      deleteNotification,
    );

  const notificationsQuery =
    useQuery({
      queryKey: [
        "notifications",
        "list",
      ],

      queryFn: async () => {
        return listNotificationsFn({
          data: {
            filter:
              "all",
            limit:
              250,
          },
        });
      },

      retry: 1,

      refetchInterval:
        60 * 1000,

      refetchOnWindowFocus:
        true,

      staleTime:
        20 * 1000,
    });

  const markReadMutation =
    useMutation({
      mutationFn:
        async (
          notificationId: string,
        ) => {
          return markReadFn({
            data: {
              notificationId,
            },
          });
        },

      onSuccess:
        async () => {
          await refreshNotificationQueries(
            queryClient,
          );
        },

      onError:
        (error) => {
          console.error(
            "[Notificações] Erro ao marcar como lida:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const markUnreadMutation =
    useMutation({
      mutationFn:
        async (
          notificationId: string,
        ) => {
          return markUnreadFn({
            data: {
              notificationId,
            },
          });
        },

      onSuccess:
        async () => {
          await refreshNotificationQueries(
            queryClient,
          );
        },

      onError:
        (error) => {
          console.error(
            "[Notificações] Erro ao marcar como não lida:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const markAllReadMutation =
    useMutation({
      mutationFn:
        async () => {
          return markAllReadFn();
        },

      onSuccess:
        async () => {
          toast.success(
            "Todas as notificações foram marcadas como lidas.",
          );

          await refreshNotificationQueries(
            queryClient,
          );
        },

      onError:
        (error) => {
          console.error(
            "[Notificações] Erro ao marcar todas como lidas:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        async (
          notificationId: string,
        ) => {
          return deleteNotificationFn({
            data: {
              notificationId,
            },
          });
        },

      onSuccess:
        async () => {
          toast.success(
            "Notificação removida.",
          );

          await refreshNotificationQueries(
            queryClient,
          );
        },

      onError:
        (error) => {
          console.error(
            "[Notificações] Erro ao excluir:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const notifications =
    notificationsQuery.data ??
    [];

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.read_at,
        ).length,
      [notifications],
    );

  const readCount =
    notifications.length -
    unreadCount;

  const filteredNotifications =
    useMemo(() => {
      const normalizedSearch =
        normalizeText(
          searchTerm,
        );

      return notifications.filter(
        (notification) => {
          const matchesFilter =
            filter ===
              "all" ||
            (filter ===
              "unread" &&
              !notification.read_at) ||
            (filter ===
              "read" &&
              Boolean(
                notification.read_at,
              ));

          if (
            !matchesFilter
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const searchableText =
            normalizeText(
              [
                notification.title,
                notification.message,
                notification.type,
                notification.reference_type,
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
      notifications,
      filter,
      searchTerm,
    ]);

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
              <Bell className="h-3.5 w-3.5" />

              Central de notificações
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Notificações
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Acompanhe atualizações sobre solicitações,
              assinatura, downloads e avisos da plataforma.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() =>
                markAllReadMutation.mutate()
              }
              disabled={
                markAllReadMutation.isPending
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-5 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}

              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total"
          value={
            notifications.length
          }
          icon={Bell}
          className="border-border bg-card"
          iconClassName="text-primary"
        />

        <SummaryCard
          label="Não lidas"
          value={unreadCount}
          icon={BellOff}
          className="border-amber-500/30 bg-amber-500/5"
          iconClassName="text-amber-500"
        />

        <SummaryCard
          label="Lidas"
          value={readCount}
          icon={CheckCheck}
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
              placeholder="Buscar notificações..."
              className="h-11 w-full rounded-2xl border border-border bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              notificationsQuery.refetch()
            }
            disabled={
              notificationsQuery.isFetching
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background/70 px-4 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                notificationsQuery.isFetching
                  ? "animate-spin"
                  : ""
              }`}
            />

            Atualizar
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(
            (item) => {
              const active =
                filter ===
                item.value;

              const count =
                item.value ===
                "all"
                  ? notifications.length
                  : item.value ===
                      "unread"
                    ? unreadCount
                    : readCount;

              return (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.value,
                    )
                  }
                  className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-medium transition ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}

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
        {notificationsQuery.isLoading && (
          <LoadingState />
        )}

        {notificationsQuery.isError && (
          <ErrorState
            error={
              notificationsQuery.error
            }
            onRetry={() =>
              notificationsQuery.refetch()
            }
          />
        )}

        {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length ===
            0 && (
            <EmptyState />
          )}

        {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length >
            0 &&
          filteredNotifications.length ===
            0 && (
            <NoResultsState
              onClear={() => {
                setSearchTerm("");
                setFilter(
                  "all",
                );
              }}
            />
          )}

        {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          filteredNotifications.length >
            0 && (
            <div className="space-y-4">
              {filteredNotifications.map(
                (
                  notification,
                ) => (
                  <NotificationCard
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    markingRead={
                      markReadMutation.isPending &&
                      markReadMutation.variables ===
                        notification.id
                    }
                    markingUnread={
                      markUnreadMutation.isPending &&
                      markUnreadMutation.variables ===
                        notification.id
                    }
                    deleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables ===
                        notification.id
                    }
                    onMarkRead={() =>
                      markReadMutation.mutate(
                        notification.id,
                      )
                    }
                    onMarkUnread={() =>
                      markUnreadMutation.mutate(
                        notification.id,
                      )
                    }
                    onDelete={() => {
                      const confirmed =
                        window.confirm(
                          "Deseja excluir esta notificação?",
                        );

                      if (
                        confirmed
                      ) {
                        deleteMutation.mutate(
                          notification.id,
                        );
                      }
                    }}
                  />
                ),
              )}
            </div>
          )}
      </section>
    </main>
  );
}

function NotificationCard({
  notification,
  markingRead,
  markingUnread,
  deleting,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: {
  notification: NotificationRow;
  markingRead: boolean;
  markingUnread: boolean;
  deleting: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}) {
  const unread =
    !notification.read_at;

  const visual =
    getNotificationVisual(
      notification,
    );

  const Icon =
    visual.icon;

  const destination =
    getNotificationDestination(
      notification,
    );

  return (
    <article
      className={`overflow-hidden rounded-[26px] border shadow-sm transition ${
        unread
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${visual.iconContainerClass}`}
          >
            <Icon
              className={`h-5 w-5 ${visual.iconClass}`}
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold leading-relaxed text-foreground sm:text-base">
                    {
                      notification.title
                    }
                  </h2>

                  {unread && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Nova
                    </span>
                  )}
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {
                    notification.message
                  }
                </p>
              </div>

              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatRelativeDate(
                  notification.created_at,
                )}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {destination && (
                <Link
                  to={
                    destination.to as any
                  }
                  search={
                    destination.search as any
                  }
                  onClick={
                    unread
                      ? onMarkRead
                      : undefined
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                >
                  {destination.icon ===
                  "request" ? (
                    <FileQuestion className="h-3.5 w-3.5" />
                  ) : (
                    <MessageSquareText className="h-3.5 w-3.5" />
                  )}

                  {
                    destination.label
                  }
                </Link>
              )}

              {unread ? (
                <button
                  type="button"
                  onClick={
                    onMarkRead
                  }
                  disabled={
                    markingRead
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingRead ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}

                  Marcar como lida
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    onMarkUnread
                  }
                  disabled={
                    markingUnread
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingUnread ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" />
                  )}

                  Marcar como não lida
                </button>
              )}

              <button
                type="button"
                onClick={
                  onDelete
                }
                disabled={
                  deleting
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}

                Excluir
              </button>
            </div>

            <p className="mt-4 text-[10px] text-muted-foreground">
              Recebida em{" "}
              {formatDateTime(
                notification.created_at,
              )}

              {notification.read_at && (
                <>
                  {" "}
                  • Lida em{" "}
                  {formatDateTime(
                    notification.read_at,
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: typeof Bell;
  className: string;
  iconClassName: string;
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

function LoadingState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-[28px] border border-border bg-card">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">
          Carregando notificações...
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
            Não foi possível carregar as notificações
          </h2>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {getErrorMessage(
              error,
            )}
          </p>

          <button
            type="button"
            onClick={
              onRetry
            }
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
        <BellOff className="mx-auto h-10 w-10 text-muted-foreground/50" />

        <h2 className="mt-4 text-lg font-semibold">
          Nenhuma notificação
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Atualizações sobre seus pedidos e sua conta
          aparecerão nesta página.
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
          Nenhuma notificação encontrada
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Tente outro termo ou remova os filtros.
        </p>

        <button
          type="button"
          onClick={
            onClear
          }
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-xs font-medium transition hover:bg-secondary"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

function getNotificationVisual(
  notification: NotificationRow,
) {
  const type =
    normalizeText(
      `${notification.type} ${notification.reference_type ?? ""}`,
    );

  if (
    type.includes(
      "material request",
    )
  ) {
    return {
      icon:
        FileQuestion,

      iconContainerClass:
        "bg-blue-500/10",

      iconClass:
        "text-blue-500",
    };
  }

  if (
    type.includes(
      "subscription",
    ) ||
    type.includes(
      "assinatura",
    ) ||
    type.includes(
      "payment",
    )
  ) {
    return {
      icon:
        Clock3,

      iconContainerClass:
        "bg-amber-500/10",

      iconClass:
        "text-amber-500",
    };
  }

  return {
    icon:
      Bell,

    iconContainerClass:
      "bg-primary/10",

    iconClass:
      "text-primary",
  };
}

function getNotificationDestination(
  notification: NotificationRow,
): {
  to: string;
  label: string;
  icon:
    | "request"
    | "default";
  search?: Record<
    string,
    string
  >;
} | null {
  if (
    notification.reference_type ===
    "material_request"
  ) {
    if (
      notification.target_role ===
      "admin"
    ) {
      return {
        to:
          "/admin/solicitacoes",

        label:
          "Ver solicitação",

        icon:
          "request",
      };
    }

    return {
      to:
        "/minhas-solicitacoes",

      label:
        "Ver solicitação",

      icon:
        "request",
    };
  }

  return null;
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

function formatRelativeDate(
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

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.floor(
      difference /
        60_000,
    );

  if (
    minutes < 1
  ) {
    return "Agora";
  }

  if (
    minutes < 60
  ) {
    return `Há ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  if (
    hours < 24
  ) {
    return `Há ${hours}h`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  if (
    days < 7
  ) {
    return `Há ${days} dia${
      days === 1
        ? ""
        : "s"
    }`;
  }

  return date.toLocaleDateString(
    "pt-BR",
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
        "notifications",
      ) &&
      (
        message.includes(
          "does not exist",
        ) ||
        message.includes(
          "schema cache",
        )
      )
    ) {
      return "A tabela notifications ainda não foi criada no Supabase ou não está disponível no cache da API.";
    }

    if (
      message.includes(
        "row-level security",
      ) ||
      message.includes(
        "permission denied",
      ) ||
      message.includes(
        "access denied",
      )
    ) {
      return "Você não tem permissão para acessar ou alterar essas notificações. Verifique as políticas RLS.";
    }

    if (
      message.includes(
        "notificação não encontrada",
      )
    ) {
      return "Essa notificação não existe mais ou você não possui acesso.";
    }

    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

async function refreshNotificationQueries(
  queryClient: ReturnType<
    typeof useQueryClient
  >,
) {
  await Promise.all([
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
}
