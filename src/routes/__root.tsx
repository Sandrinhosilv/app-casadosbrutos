import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import {
  useEffect,
  type ReactNode,
} from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

import { PixelTracker } from "@/components/PixelTracker";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="glow-soft mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="text-3xl font-bold">
            404
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          O conteúdo que você procura não existe ou foi movido.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="glow inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);

    reportLovableError(error, {
      boundary:
        "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Algo deu errado
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos carregar essa página. Tente novamente em alguns instantes.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Tentar novamente
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1",
        },
        {
          name: "theme-color",
          content: "#050505",
        },
        {
          title:
            "Manual Stock — A maior biblioteca de manuais técnicos para motocicletas do Brasil",
        },
        {
          name: "description",
          content:
            "Acesso ilimitado a manuais de serviço, catálogos de peças, diagramas elétricos e esquemas de injeção para mecânicos, oficinas e proprietários de moto.",
        },
        {
          property: "og:title",
          content: "Manual Stock",
        },
        {
          property:
            "og:description",
          content:
            "A maior plataforma de manuais técnicos para motocicletas do Brasil.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content:
            "summary_large_image",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        {
          rel: "icon",
          href: "/favicon.ico",
          type: "image/x-icon",
        },
        {
          rel: "preconnect",
          href:
            "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href:
            "https://fonts.gstatic.com",
          crossOrigin:
            "anonymous",
        },
        {
          rel: "stylesheet",
          href:
            "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap",
        },
      ],
    }),

    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent:
      NotFoundComponent,
    errorComponent:
      ErrorComponent,
  });

function RootShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className="dark"
    >
      <head>
        <HeadContent />
      </head>

      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } =
    Route.useRouteContext();

  const router =
    useRouter();

  useEffect(() => {
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          const shouldRefresh =
            event ===
              "SIGNED_IN" ||
            event ===
              "SIGNED_OUT" ||
            event ===
              "USER_UPDATED";

          if (!shouldRefresh) {
            return;
          }

          void router.invalidate();

          if (
            event !==
            "SIGNED_OUT"
          ) {
            void queryClient.invalidateQueries();
          }
        },
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [
    queryClient,
    router,
  ]);

  return (
    <QueryClientProvider
      client={queryClient}
    >
      <PixelTracker />

      <Outlet />

      <Toaster
        theme="dark"
        position="top-right"
        richColors
      />
    </QueryClientProvider>
  );
}

