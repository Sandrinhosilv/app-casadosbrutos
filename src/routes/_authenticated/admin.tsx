import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { checkIsAdmin } from "@/lib/admin";
import {
  AdminMobileTopbar,
  AdminSidebar,
} from "@/components/admin/AdminSidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,

  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </div>

        <h1 className="mt-4 text-lg font-semibold">
          Erro no painel administrativo
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {error.message}
        </p>

        <Link
          to="/dashboard"
          className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  ),

  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <h1 className="text-lg font-semibold">
          PÃ¡gina administrativa nÃ£o encontrada
        </h1>

        <Link
          to="/admin"
          className="mt-3 inline-flex text-sm text-primary hover:underline"
        >
          Voltar para o painel
        </Link>
      </div>
    </div>
  ),
});

function AdminLayout() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(checkIsAdmin);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "check"],
    queryFn: () => checkAdmin(),
    staleTime: 0,
    retry: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!data?.isAdmin) {
      navigate({
        to: "/dashboard",
        replace: true,
      });
    }
  }, [data, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />

          <p className="text-sm text-muted-foreground">
            Verificando acesso administrativo...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 text-center">
          <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />

          <h1 className="mt-4 text-lg font-semibold">
            NÃ£o foi possÃ­vel verificar seu acesso
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Ocorreu um erro inesperado."}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminMobileTopbar />

        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-border bg-background/85 px-8 backdrop-blur lg:flex">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              Painel administrativo
            </h1>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Métricas, usuários, biblioteca e acessos
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
          >
            Ver Área do usuário
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
