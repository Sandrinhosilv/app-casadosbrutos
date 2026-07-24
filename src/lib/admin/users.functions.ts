import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  normalizeSearchTerm,
  requireSupabaseAuth,
  throwQueryError,
  type UserRole,
} from "./shared";


export const listAdminUsers =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .validator(
      (input: { q?: string }) =>
        z
          .object({
            q: z
              .string()
              .trim()
              .max(200)
              .optional(),
          })
          .parse(input),
    )
    .handler(
      async ({ data, context }) => {
        await assertAdmin(context);

        const { supabaseAdmin } =
          await import(
            "@/integrations/supabase/client.server"
          );

        const searchTerm =
          normalizeSearchTerm(data.q);

        let profilesQuery =
          supabaseAdmin
            .from("profiles")
            .select(
              `
                id,
                email,
                full_name,
                created_at
              `,
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            )
            .limit(200);

        if (searchTerm) {
          profilesQuery =
            profilesQuery.or(
              `email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`,
            );
        }

        const profilesResult =
          await profilesQuery;

        throwQueryError(
          profilesResult.error,
          "Erro ao listar usuários",
        );

        const profiles =
          profilesResult.data ?? [];

        const userIds =
          profiles.map(
            (profile) =>
              profile.id,
          );

        if (
          userIds.length === 0
        ) {
          return [];
        }

        const [
          subscriptionsResult,
          rolesResult,
        ] = await Promise.all([
          supabaseAdmin
            .from(
              "subscriptions",
            )
            .select(
              `
                id,
                user_id,
                plan_id,
                status,
                started_at,
                expires_at,
                cancelled_at,
                gateway
              `,
            )
            .in(
              "user_id",
              userIds,
            ),

          supabaseAdmin
            .from(
              "user_roles",
            )
            .select(
              "user_id, role",
            )
            .in(
              "user_id",
              userIds,
            ),
        ]);

        throwQueryError(
          subscriptionsResult.error,
          "Erro ao carregar assinaturas",
        );

        throwQueryError(
          rolesResult.error,
          "Erro ao carregar papéis",
        );

        const subscriptionsByUser =
          new Map<string, any[]>();

        for (
          const subscription of
          subscriptionsResult.data ??
          []
        ) {
          const current =
            subscriptionsByUser.get(
              subscription.user_id,
            ) ?? [];

          current.push(
            subscription,
          );

          subscriptionsByUser.set(
            subscription.user_id,
            current,
          );
        }

        const rolesByUser =
          new Map<string, any[]>();

        for (
          const role of
          rolesResult.data ?? []
        ) {
          const current =
            rolesByUser.get(
              role.user_id,
            ) ?? [];

          current.push(role);

          rolesByUser.set(
            role.user_id,
            current,
          );
        }

        return profiles.map(
          (profile) => ({
            ...profile,

            subscriptions:
              subscriptionsByUser.get(
                profile.id,
              ) ?? [],

            user_roles:
              rolesByUser.get(
                profile.id,
              ) ?? [],
          }),
        );
      },
    );


    export const setUserRole =
      createServerFn({
        method: "POST",
      })
        .middleware([requireSupabaseAuth])
        .validator(
          (input: {
            userId: string;
            role: UserRole;
          }) =>
            z
              .object({
                userId: z
                  .string()
                  .uuid(
                    "ID do usuário inválido",
                  ),
    
                role: z.enum([
                  "user",
                  "admin",
                ]),
              })
              .parse(input),
        )
        .handler(
          async ({ data, context }) => {
            await assertAdmin(context);
    
            if (
              data.userId ===
                context.userId &&
              data.role !== "admin"
            ) {
              throw new Error(
                "Você não pode remover sua própria permissão de administrador.",
              );
            }
    
            const { supabaseAdmin } =
              await import(
                "@/integrations/supabase/client.server"
              );
    
            const profileResult =
              await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq(
                  "id",
                  data.userId,
                )
                .maybeSingle();
    
            throwQueryError(
              profileResult.error,
              "Erro ao localizar usuário",
            );
    
            if (!profileResult.data) {
              throw new Error(
                "Usuário não encontrado",
              );
            }
    
            const roleResult =
              await supabaseAdmin
                .from("user_roles")
                .upsert(
                  {
                    user_id:
                      data.userId,
                    role:
                      data.role,
                    updated_at:
                      new Date().toISOString(),
                  },
                  {
                    onConflict:
                      "user_id",
                  },
                )
                .select(
                  "user_id, role",
                )
                .single();
    
            throwQueryError(
              roleResult.error,
              "Erro ao definir papel",
            );
            if (!roleResult.data) {
      throw new Error(
        "O papel foi atualizado, mas o Supabase não retornou os dados.",
      );
    }
    
            return {
              ok: true,
              userId:
                data.userId,
              role:
                roleResult.data.role,
            };
          },
        );
    