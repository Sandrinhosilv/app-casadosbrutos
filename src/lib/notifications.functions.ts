import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NotificationRow = {
  id: string;
  user_id: string | null;
  target_role: string | null;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationAudience = {
  userId: string;
  isAdmin: boolean;
};

const notificationIdSchema = z.object({
  notificationId: z
    .string()
    .uuid("ID da notificação inválido."),
});

const listNotificationsSchema = z.object({
  filter: z
    .enum([
      "all",
      "read",
      "unread",
    ])
    .optional(),

  q: z
    .string()
    .trim()
    .max(
      200,
      "A busca pode ter no máximo 200 caracteres.",
    )
    .optional(),

  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional(),
});

const createNotificationSchema = z.object({
  userId: z
    .string()
    .uuid()
    .optional()
    .nullable(),

  targetRole: z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable(),

  title: z
    .string()
    .trim()
    .min(
      2,
      "Informe o título da notificação.",
    )
    .max(
      180,
      "O título pode ter no máximo 180 caracteres.",
    ),

  message: z
    .string()
    .trim()
    .min(
      2,
      "Informe a mensagem da notificação.",
    )
    .max(
      2000,
      "A mensagem pode ter no máximo 2000 caracteres.",
    ),

  type: z
    .string()
    .trim()
    .max(80)
    .optional(),

  referenceType: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable(),

  referenceId: z
    .string()
    .uuid()
    .optional()
    .nullable(),
});

/**
 * Lista as notificações visíveis para o usuário autenticado.
 *
 * Usuário comum:
 * - notificações com user_id igual ao próprio usuário.
 *
 * Administrador:
 * - notificações pessoais;
 * - notificações com target_role = admin.
 */
export const listNotifications =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input:
          | z.input<
              typeof listNotificationsSchema
            >
          | undefined,
      ) =>
        listNotificationsSchema.parse(
          input ?? {},
        ),
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

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "notifications",
          )
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            data.limit ??
              250,
          );

        query =
          applyAudienceFilter(
            query,
            audience,
          );

        if (
          data.filter ===
          "read"
        ) {
          query =
            query.not(
              "read_at",
              "is",
              null,
            );
        }

        if (
          data.filter ===
          "unread"
        ) {
          query =
            query.is(
              "read_at",
              null,
            );
        }

        if (
          data.q?.trim()
        ) {
          const search =
            escapePostgrestSearch(
              data.q,
            );

          query =
            query.or(
              [
                `title.ilike.%${search}%`,
                `message.ilike.%${search}%`,
                `type.ilike.%${search}%`,
                `reference_type.ilike.%${search}%`,
              ].join(","),
            );
        }

        const {
          data:
            notifications,
          error,
        } =
          await query;

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return (
          notifications ?? []
        ) as NotificationRow[];
      },
    );

/**
 * Retorna o total de notificações não lidas.
 */
export const getUnreadNotificationCount =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const {
          supabase,
          userId,
        } = context;

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "notifications",
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
          .is(
            "read_at",
            null,
          );

        query =
          applyAudienceFilter(
            query,
            audience,
          );

        const {
          count,
          error,
        } =
          await query;

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          count:
            count ?? 0,
        };
      },
    );

/**
 * Retorna uma notificação específica.
 */
export const getNotification =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof notificationIdSchema
        >,
      ) =>
        notificationIdSchema.parse(
          input,
        ),
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

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "notifications",
          )
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .eq(
            "id",
            data.notificationId,
          );

        query =
          applyAudienceFilter(
            query,
            audience,
          );

        const {
          data:
            notification,
          error,
        } =
          await query.maybeSingle();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "Notificação não encontrada.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

/**
 * Marca uma notificação como lida.
 */
export const markNotificationRead =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof notificationIdSchema
        >,
      ) =>
        notificationIdSchema.parse(
          input,
        ),
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

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        await assertNotificationAccess({
          supabase,
          notificationId:
            data.notificationId,
          audience,
        });

        const now =
          new Date().toISOString();

        const {
          data:
            notification,
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .update({
            read_at:
              now,
          })
          .eq(
            "id",
            data.notificationId,
          )
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "Não foi possível atualizar a notificação.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

/**
 * Marca uma notificação como não lida.
 */
export const markNotificationUnread =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof notificationIdSchema
        >,
      ) =>
        notificationIdSchema.parse(
          input,
        ),
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

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        await assertNotificationAccess({
          supabase,
          notificationId:
            data.notificationId,
          audience,
        });

        const {
          data:
            notification,
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .update({
            read_at:
              null,
          })
          .eq(
            "id",
            data.notificationId,
          )
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "Não foi possível atualizar a notificação.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

/**
 * Marca todas as notificações visíveis como lidas.
 */
export const markAllNotificationsRead =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const {
          supabase,
          userId,
        } = context;

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "notifications",
          )
          .update({
            read_at:
              new Date().toISOString(),
          })
          .is(
            "read_at",
            null,
          );

        query =
          applyAudienceFilter(
            query,
            audience,
          );

        const {
          error,
        } =
          await query;

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

/**
 * Exclui uma notificação visível para o usuário.
 */
export const deleteNotification =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof notificationIdSchema
        >,
      ) =>
        notificationIdSchema.parse(
          input,
        ),
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

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        await assertNotificationAccess({
          supabase,
          notificationId:
            data.notificationId,
          audience,
        });

        const {
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .delete()
          .eq(
            "id",
            data.notificationId,
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          ok: true,
          notificationId:
            data.notificationId,
        };
      },
    );

/**
 * Exclui todas as notificações já lidas.
 */
export const deleteReadNotifications =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const {
          supabase,
          userId,
        } = context;

        const audience =
          await getNotificationAudience(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "notifications",
          )
          .delete()
          .not(
            "read_at",
            "is",
            null,
          );

        query =
          applyAudienceFilter(
            query,
            audience,
          );

        const {
          error,
        } =
          await query;

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

/**
 * Cria uma notificação manual.
 *
 * Apenas administradores podem executar esta função.
 */
export const createNotification =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof createNotificationSchema
        >,
      ) =>
        createNotificationSchema.parse(
          input,
        ),
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

        await assertAdmin(
          supabase,
          userId,
        );

        const notificationUserId =
          data.userId ??
          null;

        const targetRole =
          normalizeNullableText(
            data.targetRole,
          );

        if (
          !notificationUserId &&
          !targetRole
        ) {
          throw new Error(
            "Informe um usuário ou uma função de destino.",
          );
        }

        const {
          data:
            notification,
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .insert({
            user_id:
              notificationUserId,

            target_role:
              targetRole,

            title:
              normalizeTextValue(
                data.title,
              ),

            message:
              normalizeTextValue(
                data.message,
              ),

            type:
              normalizeTextValue(
                data.type ??
                "info",
              ),

            reference_type:
              normalizeNullableText(
                data.referenceType,
              ),

            reference_id:
              data.referenceId ??
              null,

            read_at:
              null,
          })
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "A notificação foi criada, mas não retornou os dados.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

/**
 * Cria uma notificação para todos os administradores.
 */
export const notifyAdmins =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: {
          title: string;
          message: string;
          type?: string;
          referenceType?: string | null;
          referenceId?: string | null;
        },
      ) =>
        z
          .object({
            title: z
              .string()
              .trim()
              .min(2)
              .max(180),

            message: z
              .string()
              .trim()
              .min(2)
              .max(2000),

            type: z
              .string()
              .trim()
              .max(80)
              .optional(),

            referenceType: z
              .string()
              .trim()
              .max(80)
              .optional()
              .nullable(),

            referenceId: z
              .string()
              .uuid()
              .optional()
              .nullable(),
          })
          .parse(
            input,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const {
          supabase,
        } = context;

        const {
          data:
            notification,
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .insert({
            user_id:
              null,

            target_role:
              "admin",

            title:
              normalizeTextValue(
                data.title,
              ),

            message:
              normalizeTextValue(
                data.message,
              ),

            type:
              normalizeTextValue(
                data.type ??
                "info",
              ),

            reference_type:
              normalizeNullableText(
                data.referenceType,
              ),

            reference_id:
              data.referenceId ??
              null,

            read_at:
              null,
          })
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "Não foi possível criar a notificação.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

/**
 * Cria uma notificação para um usuário específico.
 */
export const notifyUser =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: {
          userId: string;
          title: string;
          message: string;
          type?: string;
          referenceType?: string | null;
          referenceId?: string | null;
        },
      ) =>
        z
          .object({
            userId: z
              .string()
              .uuid(),

            title: z
              .string()
              .trim()
              .min(2)
              .max(180),

            message: z
              .string()
              .trim()
              .min(2)
              .max(2000),

            type: z
              .string()
              .trim()
              .max(80)
              .optional(),

            referenceType: z
              .string()
              .trim()
              .max(80)
              .optional()
              .nullable(),

            referenceId: z
              .string()
              .uuid()
              .optional()
              .nullable(),
          })
          .parse(
            input,
          ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const {
          supabase,
          userId:
            authenticatedUserId,
        } = context;

        await assertAdmin(
          supabase,
          authenticatedUserId,
        );

        const {
          data:
            notification,
          error,
        } = await (
          supabase as any
        )
          .from(
            "notifications",
          )
          .insert({
            user_id:
              data.userId,

            target_role:
              null,

            title:
              normalizeTextValue(
                data.title,
              ),

            message:
              normalizeTextValue(
                data.message,
              ),

            type:
              normalizeTextValue(
                data.type ??
                "info",
              ),

            reference_type:
              normalizeNullableText(
                data.referenceType,
              ),

            reference_id:
              data.referenceId ??
              null,

            read_at:
              null,
          })
          .select(
            `
              id,
              user_id,
              target_role,
              title,
              message,
              type,
              reference_type,
              reference_id,
              read_at,
              created_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!notification) {
          throw new Error(
            "Não foi possível criar a notificação.",
          );
        }

        return notification as
          NotificationRow;
      },
    );

async function getNotificationAudience(
  supabase: any,
  userId: string,
): Promise<NotificationAudience> {
  const isAdmin =
    await checkUserIsAdmin(
      supabase,
      userId,
    );

  return {
    userId,
    isAdmin,
  };
}

function applyAudienceFilter(
  query: any,
  audience: NotificationAudience,
) {
  if (
    audience.isAdmin
  ) {
    return query.or(
      `user_id.eq.${audience.userId},target_role.eq.admin`,
    );
  }

  return query.eq(
    "user_id",
    audience.userId,
  );
}

async function assertNotificationAccess({
  supabase,
  notificationId,
  audience,
}: {
  supabase: any;
  notificationId: string;
  audience: NotificationAudience;
}): Promise<void> {
  let query =
    supabase
      .from(
        "notifications",
      )
      .select(
        "id, user_id, target_role",
      )
      .eq(
        "id",
        notificationId,
      );

  query =
    applyAudienceFilter(
      query,
      audience,
    );

  const {
    data,
    error,
  } =
    await query.maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (!data) {
    throw new Error(
      "Notificação não encontrada ou acesso negado.",
    );
  }
}

async function assertAdmin(
  supabase: any,
  userId: string,
): Promise<void> {
  const isAdmin =
    await checkUserIsAdmin(
      supabase,
      userId,
    );

  if (!isAdmin) {
    throw new Error(
      "Você não possui permissão de administrador.",
    );
  }
}

async function checkUserIsAdmin(
  supabase: any,
  userId: string,
): Promise<boolean> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "user_roles",
      )
      .select(
        "role",
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Não foi possível verificar o acesso administrativo: ${error.message}`,
    );
  }

  return (
    data?.role ===
    "admin"
  );
}

function normalizeTextValue(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /\s+/g,
      " ",
    );
}

function normalizeNullableText(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    normalizeTextValue(
      value,
    );

  return normalized ||
    null;
}

function escapePostgrestSearch(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[%_,()]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

export type {
  NotificationAudience,
  NotificationRow,
};
