import { createServerFn } from "@tanstack/react-start";

import type { Json } from "@/integrations/supabase/types";

import {
  assertAdmin,
  requireSupabaseAuth,
  throwQueryError,
} from "./shared";

type ActivityLog = {
  id: string;
  action: string;
  meta: Json;
  created_at: string;
  user_id: string | null;
};

type Profile = {
  email: string | null;
  full_name: string | null;
};

/**
 * Lista os logs administrativos mais recentes
 * junto com os dados básicos do usuário.
 */
export const listAdminLogs = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const logsResult = await supabaseAdmin
      .from("activity_logs")
      .select(
        `
          id,
          action,
          meta,
          created_at,
          user_id
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    throwQueryError(
      logsResult.error,
      "Erro ao listar logs",
    );

    const logs =
      (logsResult.data ?? []) as ActivityLog[];

    if (logs.length === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(
        logs
          .map((log) => log.user_id)
          .filter(
            (userId): userId is string =>
              typeof userId === "string" &&
              userId.length > 0,
          ),
      ),
    );

    const profilesMap = new Map<
      string,
      Profile
    >();

    if (userIds.length > 0) {
      const profilesResult =
        await supabaseAdmin
          .from("profiles")
          .select(
            `
              id,
              email,
              full_name
            `,
          )
          .in("id", userIds);

      throwQueryError(
        profilesResult.error,
        "Erro ao carregar usuários dos logs",
      );

      for (
        const profile of
        profilesResult.data ?? []
      ) {
        profilesMap.set(profile.id, {
          email: profile.email,
          full_name: profile.full_name,
        });
      }
    }

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      meta: log.meta,
      created_at: log.created_at,
      user_id: log.user_id,

      profile: log.user_id
        ? profilesMap.get(log.user_id) ?? null
        : null,
    }));
  });