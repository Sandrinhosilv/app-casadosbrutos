import { createServerFn } from "@tanstack/react-start";

import {
  assertAdmin,
  requireSupabaseAuth,
  throwQueryError,
} from "./shared";

type RecentDownloadRow = {
  id: string;
  downloaded_at: string;
  user_id: string | null;

  manuals:
    | {
        title: string;
      }
    | {
        title: string;
      }[]
    | null;
};

/**
 * Retorna se o usuário autenticado possui
 * permissão administrativa.
 */
export const checkIsAdmin = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } =
      await context.supabase.rpc(
        "has_role",
        {
          _user_id:
            context.userId,

          _role:
            "admin",
        },
      );

    if (error) {
      console.error(
        "[checkIsAdmin] Erro ao verificar administrador:",
        error,
      );

      throw new Error(
        `Erro ao verificar administrador: ${
          error.message ||
          "erro desconhecido"
        }`,
      );
    }

    return {
      isAdmin:
        data === true,

      userId:
        context.userId,
    };
  });

/**
 * Retorna as métricas principais
 * do dashboard administrativo.
 */
export const getAdminOverview =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({ context }) => {
        await assertAdmin(
          context,
        );

        const {
          supabaseAdmin,
        } = await import(
          "@/integrations/supabase/client.server"
        );

        const now =
          new Date();

        const monthStart =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
          ).toISOString();

        const [
          usersResult,
          subscriptionsResult,
          manualsResult,
          downloadsResult,
          lastSyncResult,
          recentDownloadsResult,
        ] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select(
              "id",
              {
                count:
                  "exact",

                head:
                  true,
              },
            ),

          supabaseAdmin
            .from(
              "subscriptions",
            )
            .select(
              "id, status",
            )
            .in(
              "status",
              [
                "active",
                "trial",
              ],
            ),

          supabaseAdmin
            .from("manuals")
            .select(
              "id",
              {
                count:
                  "exact",

                head:
                  true,
              },
            ),

          supabaseAdmin
            .from(
              "downloads",
            )
            .select(
              "id",
              {
                count:
                  "exact",

                head:
                  true,
              },
            )
            .gte(
              "downloaded_at",
              monthStart,
            ),

          supabaseAdmin
            .from(
              "sync_jobs",
            )
            .select("*")
            .order(
              "started_at",
              {
                ascending:
                  false,
              },
            )
            .limit(1)
            .maybeSingle(),

          supabaseAdmin
            .from(
              "downloads",
            )
            .select(
              `
                id,
                downloaded_at,
                user_id,
                manuals (
                  title
                )
              `,
            )
            .order(
              "downloaded_at",
              {
                ascending:
                  false,
              },
            )
            .limit(10),
        ]);

        throwQueryError(
          usersResult.error,
          "Erro ao contar usuários",
        );

        throwQueryError(
          manualsResult.error,
          "Erro ao contar manuais",
        );

        throwQueryError(
          downloadsResult.error,
          "Erro ao contar downloads",
        );

        let activeSubscribers =
          0;

        let subscriptionsWarning:
          | string
          | null = null;

        if (
          subscriptionsResult.error
        ) {
          console.error(
            "[getAdminOverview] Erro ao contar assinaturas:",
            subscriptionsResult.error,
          );

          subscriptionsWarning =
            subscriptionsResult
              .error.message ||
            subscriptionsResult
              .error.details ||
            subscriptionsResult
              .error.hint ||
            subscriptionsResult
              .error.code ||
            "Não foi possível carregar as assinaturas.";
        } else {
          activeSubscribers =
            subscriptionsResult
              .data?.length ??
            0;
        }

        if (
          lastSyncResult.error
        ) {
          console.error(
            "[getAdminOverview] Erro ao carregar sincronização:",
            lastSyncResult.error,
          );
        }

        if (
          recentDownloadsResult.error
        ) {
          console.error(
            "[getAdminOverview] Erro ao carregar downloads recentes:",
            recentDownloadsResult.error,
          );
        }

        const recentDownloads =
          (recentDownloadsResult.data ??
            []) as RecentDownloadRow[];

        const userIds =
          Array.from(
            new Set(
              recentDownloads
                .map(
                  (
                    download,
                  ) =>
                    download.user_id,
                )
                .filter(
                  (
                    userId,
                  ): userId is string =>
                    typeof userId ===
                      "string" &&
                    userId.length >
                      0,
                ),
            ),
          );

        const profilesMap =
          new Map<
            string,
            {
              email:
                | string
                | null;

              full_name:
                | string
                | null;
            }
          >();

        if (
          userIds.length > 0
        ) {
          const profilesResult =
            await supabaseAdmin
              .from(
                "profiles",
              )
              .select(
                `
                  id,
                  email,
                  full_name
                `,
              )
              .in(
                "id",
                userIds,
              );

          if (
            profilesResult.error
          ) {
            console.error(
              "[getAdminOverview] Erro ao carregar perfis:",
              profilesResult.error,
            );
          } else {
            for (
              const profile of
              profilesResult.data ??
              []
            ) {
              profilesMap.set(
                profile.id,
                {
                  email:
                    profile.email,

                  full_name:
                    profile.full_name,
                },
              );
            }
          }
        }

        return {
          totalUsers:
            usersResult.count ??
            0,

          activeSubscribers,

          subscriptionsWarning,

          totalManuals:
            manualsResult.count ??
            0,

          downloadsThisMonth:
            downloadsResult.count ??
            0,

          lastSync:
            lastSyncResult.error
              ? null
              : lastSyncResult.data ??
                null,

          recentDownloads:
            recentDownloads.map(
              (
                download,
              ) => ({
                ...download,

                profiles:
                  download.user_id
                    ? profilesMap.get(
                        download.user_id,
                      ) ??
                      null
                    : null,
              }),
            ),
        };
      },
    );