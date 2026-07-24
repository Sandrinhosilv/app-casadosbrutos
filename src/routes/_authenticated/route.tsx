import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import {
  AppSidebar,
  MobileTopbar,
} from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({
        to: "/auth",
      });
    }

    return {
      user: data.user,
    };
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { pathname } = useLocation();

  const isAdminRoute =
    pathname === "/admin" ||
    pathname === "/admin/" ||
    pathname.startsWith("/admin/");

  /*
   * As rotas administrativas possuem seu próprio layout,
   * menu lateral e cabeçalho.
   */
  if (isAdminRoute) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <MobileTopbar />

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}