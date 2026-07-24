import {
  createFileRoute,
  redirect,
} from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const {
      data: { session },
      error,
    } =
      await supabase.auth.getSession();

    if (error) {
      console.error(
        "[Index] Erro ao recuperar sessão:",
        error,
      );
    }

    if (session?.user) {
      throw redirect({
        to: "/dashboard",
        replace: true,
      });
    }

    throw redirect({
      to: "/auth",
      search: {
        mode: "login",
      },
      replace: true,
    });
  },
});