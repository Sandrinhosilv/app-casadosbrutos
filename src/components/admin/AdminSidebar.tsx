import {
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  FileClock,
  Inbox,
  Loader2,
  LogOut,
  Menu,
  Shield,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useEffect,
  useState,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import logoManualStock from "@/assets/logo.png";
import {
  getUnreadNotificationCount,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";

type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
};

type AdminSidebarProps = {
  onNavigate?: () => void;
};

const ADMIN_NAV_BASE: AdminNavItem[] = [
  {
    to: "/admin",
    label: "Visão geral",
    icon: BarChart3,
    exact: true,
  },
  {
    to: "/admin/usuarios",
    label: "Usuários",
    icon: Users,
  },
  {
    to: "/admin/manuais",
    label: "Manuais & Drive",
    icon: BookOpen,
  },
  {
    to: "/admin/solicitacoes",
    label: "Solicitações",
    icon: Inbox,
  },
  {
    to: "/admin/logs",
    label: "Logs",
    icon: FileClock,
  },
];

export function AdminSidebar({
  onNavigate,
}: AdminSidebarProps) {
  const { pathname } =
    useLocation();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [signingOut, setSigningOut] =
    useState(false);

  const getUnreadCount =
    useServerFn(
      getUnreadNotificationCount,
    );

  const unreadNotificationsQuery =
    useQuery({
      queryKey: [
        "notifications",
        "unread-count",
        "admin",
      ],

      queryFn: async () => {
        const result =
          await getUnreadCount();

        return result.count;
      },

      staleTime:
        20 * 1000,

      refetchInterval:
        60 * 1000,

      refetchOnWindowFocus:
        true,

      retry: 1,
    });

  const unreadNotifications =
    unreadNotificationsQuery.data ??
    0;

  const adminNav: AdminNavItem[] = [
    ...ADMIN_NAV_BASE,
    {
      to: "/notificacoes",
      label: "Notificações",
      icon: Bell,
      badge:
        unreadNotifications,
    },
  ];

  async function signOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      await queryClient.cancelQueries();

      queryClient.clear();

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      toast.success(
        "Sessão encerrada.",
      );

      onNavigate?.();

      await navigate({
        to: "/auth",
        replace: true,
      });
    } catch (error) {
      console.error(
        "[AdminSidebar] Erro ao sair:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão.",
      );

      setSigningOut(false);
    }
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex min-h-24 items-center justify-center border-b border-sidebar-border px-5 py-4">
        <Link
          to="/admin"
          onClick={
            onNavigate
          }
          aria-label="Ir para o painel administrativo"
          className="flex items-center justify-center transition hover:opacity-85"
        >
          <img
            src={
              logoManualStock
            }
            alt="Manual Stock"
            className="h-16 w-auto max-w-[190px] object-contain"
          />
        </Link>
      </div>

      {/* Identificação do administrador */}
      <div className="px-3 py-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-medium text-foreground">
                Administrador
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />

                <span className="text-[10px] text-muted-foreground">
                  Acesso completo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
        aria-label="Navegação administrativa"
      >
        {adminNav.map(
          (item) => {
            const active =
              item.exact
                ? pathname ===
                    item.to ||
                  pathname ===
                    `${item.to}/`
                : pathname ===
                    item.to ||
                  pathname.startsWith(
                    `${item.to}/`,
                  );

            const Icon =
              item.icon;

            return (
              <Link
                key={
                  item.to
                }
                to={
                  item.to
                }
                onClick={
                  onNavigate
                }
                activeOptions={{
                  exact:
                    item.exact,
                }}
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.66_0.2_254/0.2)]"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <span
                  className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground group-hover:bg-background/60 group-hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />

                  {Boolean(
                    item.badge &&
                      item.badge >
                        0,
                  ) && (
                    <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                      {item.badge! >
                      99
                        ? "99+"
                        : item.badge}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {item.label}
                </span>

                {Boolean(
                  item.badge &&
                    item.badge >
                      0,
                ) && (
                  <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive">
                    {item.badge! >
                    99
                      ? "99+"
                      : item.badge}
                  </span>
                )}
              </Link>
            );
          },
        )}
      </nav>

      {/* Rodapé */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/dashboard"
          onClick={
            onNavigate
          }
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            <Wrench className="h-4 w-4" />
          </span>

          Ver área do usuário
        </Link>

        <button
          type="button"
          onClick={
            signOut
          }
          disabled={
            signingOut
          }
          className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </span>

          {signingOut
            ? "Saindo..."
            : "Sair"}
        </button>
      </div>
    </aside>
  );
}

export function AdminMobileTopbar() {
  const [open, setOpen] =
    useState(false);

  const { pathname } =
    useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
        <Link
          to="/admin"
          aria-label="Ir para o painel administrativo"
          className="flex items-center"
        >
          <img
            src={
              logoManualStock
            }
            alt="Manual Stock"
            className="h-11 w-auto max-w-[155px] object-contain"
          />
        </Link>

        <button
          type="button"
          onClick={() =>
            setOpen(
              (current) =>
                !current,
            )
          }
          className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition active:scale-95"
          aria-label={
            open
              ? "Fechar menu administrativo"
              : "Abrir menu administrativo"
          }
          aria-expanded={
            open
          }
          aria-controls="admin-mobile-navigation"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      <div
        id="admin-mobile-navigation"
        className={`fixed inset-0 z-50 transition lg:hidden ${
          open
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible"
        }`}
        aria-hidden={
          !open
        }
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            open
              ? "opacity-100"
              : "opacity-0"
          }`}
          onClick={() =>
            setOpen(false)
          }
          aria-label="Fechar menu"
        />

        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-300 ease-out ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          <AdminSidebar
            onNavigate={() =>
              setOpen(false)
            }
          />
        </div>
      </div>
    </>
  );
}
