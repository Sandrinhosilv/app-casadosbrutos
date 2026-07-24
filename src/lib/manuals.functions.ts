import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function createPublicSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase público não configurado. Verifique SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined,
      },
    },
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function isFutureDate(
  value: string | null,
): boolean {
  if (!value) {
    return true;
  }

  const timestamp =
    new Date(value).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now()
  );
}

/**
 * Verifica no servidor se o usuário é administrador
 * ou possui assinatura ativa.
 *
 * Usa supabaseAdmin para não depender das políticas RLS
 * aplicadas à tabela subscriptions.
 */
async function verifyUserAccess(
  userId: string,
): Promise<{
  allowed: boolean;
  reason:
    | "admin"
    | "active_subscription"
    | "no_subscription"
    | "inactive_subscription"
    | "expired_subscription";
}> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const [roleResult, subscriptionResult] =
    await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("subscriptions")
        .select(
          `
            id,
            status,
            started_at,
            expires_at,
            cancelled_at
          `,
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (roleResult.error) {
    console.error(
      "[verifyUserAccess] Erro ao consultar papel:",
      roleResult.error,
    );
  }

  if (
    roleResult.data?.role === "admin"
  ) {
    return {
      allowed: true,
      reason: "admin",
    };
  }

  if (subscriptionResult.error) {
    console.error(
      "[verifyUserAccess] Erro ao consultar assinatura:",
      subscriptionResult.error,
    );

    throw new Error(
      subscriptionResult.error.message ||
        "Não foi possível verificar a assinatura.",
    );
  }

  const subscription =
    subscriptionResult.data;

  if (!subscription) {
    return {
      allowed: false,
      reason: "no_subscription",
    };
  }

  const allowedStatus =
    subscription.status === "active" ||
    subscription.status === "trial";

  if (!allowedStatus) {
    return {
      allowed: false,
      reason: "inactive_subscription",
    };
  }

  if (
    !isFutureDate(
      subscription.expires_at,
    )
  ) {
    return {
      allowed: false,
      reason: "expired_subscription",
    };
  }

  return {
    allowed: true,
    reason: "active_subscription",
  };
}

/**
 * Pesquisa pública na biblioteca.
 */
export const searchLibrary =
  createServerFn({
    method: "POST",
  })
    .validator(
      (input: {
        q: string;
        limit?: number;
      }) =>
        z
          .object({
            q: z
              .string()
              .trim()
              .max(
                200,
                "A busca deve ter no máximo 200 caracteres.",
              ),

            limit: z
              .number()
              .int()
              .min(1)
              .max(60)
              .optional(),
          })
          .parse(input),
    )
    .handler(async ({ data }) => {
      const supabase =
        createPublicSupabaseClient();

      const {
        data: rows,
        error,
      } = await supabase.rpc(
        "search_library",
        {
          _q: data.q,
          _limit:
            data.limit ?? 30,
        },
      );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return rows ?? [];
    });

/**
 * Dashboard do usuário.
 */
export const getDashboardOverview =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({ context }) => {
        const {
          supabase,
          userId,
        } = context;

        const monthStart =
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ).toISOString();

        const [
          profileResult,
          subscriptionResult,
          downloadsMonthResult,
          recentDownloadsResult,
          favoritesCountResult,
          newestManualsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              `
                full_name,
                email,
                avatar_url
              `,
            )
            .eq("id", userId)
            .maybeSingle(),

          supabase
            .from("subscriptions")
            .select(
              `
                id,
                user_id,
                plan_id,
                status,
                started_at,
                expires_at,
                cancelled_at,
                gateway,
                created_at,
                updated_at
              `,
            )
            .eq(
              "user_id",
              userId,
            )
            .maybeSingle(),

          supabase
            .from("downloads")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "user_id",
              userId,
            )
            .gte(
              "downloaded_at",
              monthStart,
            ),

          supabase
            .from("downloads")
            .select(
              `
                id,
                downloaded_at,
                manuals (
                  id,
                  title,
                  manual_type,
                  thumbnail_url,
                  models (
                    name,
                    brands (
                      name
                    )
                  )
                )
              `,
            )
            .eq(
              "user_id",
              userId,
            )
            .order(
              "downloaded_at",
              {
                ascending: false,
              },
            )
            .limit(6),

          supabase
            .from("favorites")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "user_id",
              userId,
            ),

          supabase
            .from("manuals")
            .select(
              `
                id,
                title,
                manual_type,
                thumbnail_url,
                last_updated,
                models (
                  name,
                  brands (
                    name
                  )
                )
              `,
            )
            .order(
              "last_updated",
              {
                ascending: false,
              },
            )
            .limit(6),
        ]);

        if (
          profileResult.error
        ) {
          console.error(
            "[getDashboardOverview] Perfil:",
            profileResult.error,
          );
        }

        if (
          subscriptionResult.error
        ) {
          console.error(
            "[getDashboardOverview] Assinatura:",
            subscriptionResult.error,
          );
        }

        return {
          profile:
            profileResult.data ??
            null,

          subscription:
            subscriptionResult.data ??
            null,

          downloadsThisMonth:
            downloadsMonthResult.count ??
            0,

          recentDownloads:
            recentDownloadsResult.data ??
            [],

          favoritesCount:
            favoritesCountResult.count ??
            0,

          newestManuals:
            newestManualsResult.data ??
            [],
        };
      },
    );

/**
 * Lista pública de marcas.
 */
export const listBrands =
  createServerFn({
    method: "GET",
  }).handler(async () => {
    const supabase =
      createPublicSupabaseClient();

    const {
      data,
      error,
    } = await supabase
      .from("brands")
      .select(
        `
          id,
          slug,
          name,
          country
        `,
      )
      .order("name");

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return data ?? [];
  });

/**
 * Marca e modelos.
 */
export const getBrand =
  createServerFn({
    method: "POST",
  })
    .validator(
      (input: {
        slug: string;
      }) =>
        z
          .object({
            slug: z
              .string()
              .trim()
              .min(1),
          })
          .parse(input),
    )
    .handler(async ({ data }) => {
      const supabase =
        createPublicSupabaseClient();

      const {
        data: brand,
        error: brandError,
      } = await supabase
        .from("brands")
        .select("*")
        .eq(
          "slug",
          data.slug,
        )
        .maybeSingle();

      if (brandError) {
        throw new Error(
          brandError.message,
        );
      }

      if (!brand) {
        return {
          brand: null,
          models: [],
        };
      }

      const {
        data: models,
        error: modelsError,
      } = await supabase
        .from("models")
        .select(
          `
            id,
            slug,
            name,
            year_start,
            year_end,
            engine,
            displacement_cc,
            image_url
          `,
        )
        .eq(
          "brand_id",
          brand.id,
        )
        .order("name");

      if (modelsError) {
        throw new Error(
          modelsError.message,
        );
      }

      return {
        brand,
        models: models ?? [],
      };
    });

/**
 * Modelo e seus manuais.
 */
export const getModel =
  createServerFn({
    method: "POST",
  })
    .validator(
      (input: {
        slug: string;
      }) =>
        z
          .object({
            slug: z
              .string()
              .trim()
              .min(1),
          })
          .parse(input),
    )
    .handler(async ({ data }) => {
      const supabase =
        createPublicSupabaseClient();

      const {
        data: model,
        error: modelError,
      } = await supabase
        .from("models")
        .select(
          `
            *,
            brands (
              id,
              name,
              slug
            ),
            categories (
              id,
              name,
              slug
            )
          `,
        )
        .eq(
          "slug",
          data.slug,
        )
        .maybeSingle();

      if (modelError) {
        throw new Error(
          modelError.message,
        );
      }

      if (!model) {
        return {
          model: null,
          manuals: [],
        };
      }

      const {
        data: manuals,
        error: manualsError,
      } = await supabase
        .from("manuals")
        .select(
          `
            id,
            title,
            manual_type,
            format,
            file_size_bytes,
            thumbnail_url,
            last_updated,
            tags
          `,
        )
        .eq(
          "model_id",
          model.id,
        )
        .order(
          "last_updated",
          {
            ascending: false,
          },
        );

      if (manualsError) {
        throw new Error(
          manualsError.message,
        );
      }

      return {
        model,
        manuals:
          manuals ?? [],
      };
    });

/**
 * Detalhes de um manual.
 */
/** Manual (detalhe) */
export const getManual = createServerFn({
  method: "POST",
})
  .validator((input: { id: string }) =>
    z
      .object({
        id: z
          .string()
          .uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const {
      createClient,
    } = await import(
      "@supabase/supabase-js"
    );

    const supabase =
      createClient(
        process.env
          .SUPABASE_URL!,
        process.env
          .SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
            storage:
              undefined,
          },
        },
      );

    const {
      data: manual,
      error,
    } = await supabase
      .from("manuals")
      .select(`
        id,
        model_id,
        title,
        description,
        manual_type,
        year,
        language,
        format,
        file_size_bytes,
        thumbnail_url,
        drive_file_id,
        last_updated,
        tags,
        created_at,
        updated_at,
        models (
          id,
          name,
          slug,
          year_start,
          year_end,
          engine,
          displacement_cc,
          brands (
            id,
            name,
            slug
          )
        )
      `)
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return manual;
  });
export const getManualDownloadUrl =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (input: {
        manualId: string;
      }) =>
        z
          .object({
            manualId: z
              .string()
              .uuid(
                "ID do manual inválido.",
              ),
          })
          .parse(input),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        try {
          const access =
            await verifyUserAccess(
              context.userId,
            );

          console.log(
            "[getManualDownloadUrl] Acesso:",
            {
              userId:
                context.userId,
              allowed:
                access.allowed,
              reason:
                access.reason,
            },
          );

          if (!access.allowed) {
            return {
              ok: false as const,

              reason:
                access.reason,
            };
          }

          const {
            supabaseAdmin,
          } = await import(
            "@/integrations/supabase/client.server"
          );

          const manualResult =
            await supabaseAdmin
              .from("manuals")
              .select(
                `
                  id,
                  title,
                  drive_file_id
                `,
              )
              .eq(
                "id",
                data.manualId,
              )
              .maybeSingle();

          if (
            manualResult.error
          ) {
            console.error(
              "[getManualDownloadUrl] Erro ao localizar manual:",
              manualResult.error,
            );

            throw new Error(
              manualResult.error.message,
            );
          }

          const manual =
            manualResult.data;

          if (!manual) {
            return {
              ok: false as const,
              reason:
                "not_found" as const,
            };
          }

          if (
            !manual.drive_file_id
          ) {
            return {
              ok: false as const,
              reason:
                "file_not_ready" as const,
            };
          }

          const {
            issueDownloadToken,
          } = await import(
            "@/lib/download-token.server"
          );

          const {
            token,
            expiresAt,
          } =
            issueDownloadToken(
              manual.id,
              context.userId,
            );

          return {
            ok: true as const,

            manual: {
              id: manual.id,
              title: manual.title,
            },

            url:
              `/api/public/downloads/${manual.id}` +
              `?t=${encodeURIComponent(
                token,
              )}`,

            expiresAt,
          };
        } catch (error) {
          console.error(
            "[getManualDownloadUrl] Erro:",
            error,
          );

          throw new Error(
            getErrorMessage(
              error,
              "Não foi possível liberar o download.",
            ),
          );
        }
      },
    );

/**
 * Histórico de downloads do usuário.
 */
export const listMyDownloads =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({ context }) => {
        const {
          data,
          error,
        } =
          await context.supabase
            .from("downloads")
            .select(
              `
                id,
                downloaded_at,
                manuals (
                  id,
                  title,
                  manual_type,
                  thumbnail_url,
                  models (
                    name,
                    brands (
                      name
                    )
                  )
                )
              `,
            )
            .eq(
              "user_id",
              context.userId,
            )
            .order(
              "downloaded_at",
              {
                ascending: false,
              },
            )
            .limit(200);

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return data ?? [];
      },
    );

/**
 * Favoritos do usuário.
 */
export const listMyFavorites =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({ context }) => {
        const {
          data,
          error,
        } =
          await context.supabase
            .from("favorites")
            .select(
              `
                id,
                created_at,
                manuals (
                  id,
                  title,
                  manual_type,
                  thumbnail_url,
                  models (
                    name,
                    brands (
                      name
                    )
                  )
                )
              `,
            )
            .eq(
              "user_id",
              context.userId,
            )
            .order(
              "created_at",
              {
                ascending: false,
              },
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return data ?? [];
      },
    );

export const toggleFavorite =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (input: {
        manualId: string;
      }) =>
        z
          .object({
            manualId: z
              .string()
              .uuid(
                "ID do manual inválido.",
              ),
          })
          .parse(input),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const {
          supabase,
          userId,
        } = context;

        const {
          data: existing,
          error: lookupError,
        } = await supabase
          .from("favorites")
          .select("id")
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "manual_id",
            data.manualId,
          )
          .maybeSingle();

        if (lookupError) {
          throw new Error(
            lookupError.message,
          );
        }

        if (existing) {
          const {
            error: deleteError,
          } = await supabase
            .from("favorites")
            .delete()
            .eq(
              "id",
              existing.id,
            );

          if (deleteError) {
            throw new Error(
              deleteError.message,
            );
          }

          return {
            favorited: false,
          };
        }

        const {
          error: insertError,
        } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            manual_id:
              data.manualId,
          });

        if (insertError) {
          throw new Error(
            insertError.message,
          );
        }

        return {
          favorited: true,
        };
      },
    );

export const updateProfile =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (input: {
        full_name?: string;
        phone?: string;
        avatar_url?: string;
      }) =>
        z
          .object({
            full_name: z
              .string()
              .trim()
              .max(120)
              .optional(),

            phone: z
              .string()
              .trim()
              .max(40)
              .optional(),

            avatar_url: z
              .string()
              .url()
              .optional(),
          })
          .parse(input),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const {
          error,
        } =
          await context.supabase
            .from("profiles")
            .update(data)
            .eq(
              "id",
              context.userId,
            );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          ok: true,
        };
      },
    );