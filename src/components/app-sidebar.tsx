import {
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  Heart,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  MessageSquarePlus,
  Search,
  Shield,
  Tag,
  User,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import logoManualStock from "@/assets/logo.png";
import { checkIsAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";

type NavItemConfig = {
  to: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  badge?: number;
};

type AppSidebarProps = {
  onNavigate?: () => void;
  mobile?: boolean;
};

const NAV: NavItemConfig[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/pesquisar",
    label: "Pesquisar",
    icon: Search,
  },
  {
    to: "/marcas",
    label: "Marcas",
    icon: Tag,
  },
  {
    to: "/favoritos",
    label: "Favoritos",
    icon: Heart,
  },
  {
    to: "/historico",
    label: "Histórico",
    icon: History,
  },
  {
    to: "/solicitar-material",
    label: "Solicitar material",
    icon: MessageSquarePlus,
  },
  {
    to: "/minhas-solicitacoes",
    label: "Minhas solicitações",
    icon: ListChecks,
  },
];

const FOOTER: NavItemConfig[] = [
  {
    to: "/assinatura",
    label: "Minha assinatura",
    icon: CreditCard,
  },
  {
    to: "/perfil",
    label: "Perfil",
    icon: User,
  },
  {
    to: "/suporte",
    label: "Suporte",
    icon: LifeBuoy,
  },
];

export function AppSidebar({
  onNavigate,
  mobile = false,
}: AppSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [signingOut, setSigningOut] =
    useState(false);

  const checkAdmin =
    useServerFn(checkIsAdmin);

  const adminQuery =
    useQuery({
      queryKey: [
        "admin",
        "check",
      ],

      queryFn: () =>
        checkAdmin(),

      staleTime:
        5 * 60 * 1000,

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  /*
   * Busca a quantidade de notificações ainda não lidas
   * destinadas ao usuário autenticado.
   */
  const unreadNotificationsQuery =
    useQuery({
      queryKey: [
        "notifications",
        "unread-count",
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
          return 0;
        }

        const {
          count,
          error,
        } =
          await supabase
            .from("notifications")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "user_id",
              user.id,
            )
            .is(
              "read_at",
              null,
            );

        if (error) {
          /*
           * Enquanto a tabela ainda não tiver sido criada,
           * evita quebrar todo o menu lateral.
           */
          console.warn(
            "[AppSidebar] Não foi possível carregar notificações:",
            error,
          );

          return 0;
        }

        return count ?? 0;
      },

      staleTime:
        30 * 1000,

      refetchInterval:
        60 * 1000,

      refetchOnWindowFocus:
        true,

      retry: 1,
    });

  const unreadNotifications =
    unreadNotificationsQuery.data ??
    0;

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
        "[AppSidebar] Erro ao sair:",
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
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar ${
        mobile
          ? "w-[min(86vw,320px)] shadow-2xl"
          : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex min-h-24 items-center justify-center border-b border-sidebar-border px-4 py-4">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center justify-center transition hover:opacity-85"
          aria-label="Ir para o dashboard"
        >
          <img
            src={logoManualStock}
            alt="Manual Stock"
            className="h-16 w-auto max-w-[190px] object-contain"
          />
        </Link>
      </div>

      {/* Navegação principal */}
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
        aria-label="Navegação principal"
      >
        {NAV.map(
          (item) => (
            <NavItem
              key={item.to}
              {...item}
              active={isActiveRoute(
                pathname,
                item.to,
              )}
              onClick={onNavigate}
            />
          ),
        )}

        <NavItem
          to="/notificacoes"
          label="Notificações"
          icon={Bell}
          badge={
            unreadNotifications
          }
          active={isActiveRoute(
            pathname,
            "/notificacoes",
          )}
          onClick={onNavigate}
        />

        {adminQuery.isLoading && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />

            Verificando acesso...
          </div>
        )}

        {adminQuery.data
          ?.isAdmin && (
          <NavItem
            to="/admin"
            label="Admin"
            icon={Shield}
            active={isActiveRoute(
              pathname,
              "/admin",
            )}
            onClick={onNavigate}
          />
        )}
      </nav>

      {/* Conta */}
      <div className="border-t border-sidebar-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          Conta
        </p>

        <div className="space-y-1">
          {FOOTER.map(
            (item) => (
              <NavItem
                key={item.to}
                {...item}
                active={isActiveRoute(
                  pathname,
                  item.to,
                )}
                onClick={onNavigate}
              />
            ),
          )}

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg">
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </span>

            <span>
              {signingOut
                ? "Saindo..."
                : "Sair"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

type NavItemProps =
  NavItemConfig & {
    active: boolean;
    onClick?: () => void;
  };

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  badge = 0,
  onClick,
}: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
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

        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
            {badge > 99
              ? "99+"
              : badge}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>

      {badge > 0 && (
        <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive">
          {badge > 99
            ? "99+"
            : badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Barra superior mobile com menu lateral.
 */
export function MobileTopbar() {
  const [open, setOpen] =
    useState(false);

  const { pathname } =
    useLocation();

  /*
   * Fecha o menu ao mudar de rota.
   */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /*
   * Bloqueia o scroll da página e permite fechar com Esc.
   */
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
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:hidden">
        <Link
          to="/dashboard"
          className="flex min-w-0 items-center"
          aria-label="Ir para o dashboard"
        >
          <img
            src={logoManualStock}
            alt="Manual Stock"
            className="h-11 w-auto max-w-[150px] object-contain"
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
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-sm transition active:scale-95"
          aria-label={
            open
              ? "Fechar menu"
              : "Abrir menu"
          }
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </header>

      <div
        id="mobile-navigation"
        className={`fixed inset-0 z-50 transition md:hidden ${
          open
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() =>
            setOpen(false)
          }
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            open
              ? "opacity-100"
              : "opacity-0"
          }`}
        />

        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-300 ease-out ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          <AppSidebar
            mobile
            onNavigate={() =>
              setOpen(false)
            }
          />
        </div>
      </div>
    </>
  );
}

function isActiveRoute(
  pathname: string,
  to: string,
): boolean {
  if (
    to === "/dashboard"
  ) {
    return pathname ===
      "/dashboard";
  }

  return (
    pathname === to ||
    pathname.startsWith(
      `${to}/`,
    )
  );
}
