import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MaterialRequestStatus =
  | "pending"
  | "reviewing"
  | "completed"
  | "rejected";

type MaterialRequestRow = {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: string | null;
  material_type: string | null;
  description: string | null;
  status: MaterialRequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type MaterialRequestWithProfile =
  MaterialRequestRow & {
    profiles:
      | {
          id: string;
          full_name: string | null;
          email: string | null;
        }
      | Array<{
          id: string;
          full_name: string | null;
          email: string | null;
        }>
      | null;
  };

const materialRequestStatusSchema =
  z.enum([
    "pending",
    "reviewing",
    "completed",
    "rejected",
  ]);

const materialTypeSchema =
  z.enum([
    "manual_servico",
    "manual_proprietario",
    "esquema_eletrico",
    "catalogo_pecas",
    "boletim_tecnico",
    "outro",
  ]);

const createMaterialRequestSchema =
  z.object({
    brand: z
      .string()
      .trim()
      .min(
        2,
        "Informe a montadora.",
      )
      .max(
        100,
        "A montadora é muito longa.",
      ),

    model: z
      .string()
      .trim()
      .min(
        2,
        "Informe o modelo.",
      )
      .max(
        160,
        "O modelo é muito longo.",
      ),

    year: z
      .string()
      .trim()
      .max(
        20,
        "O ano é muito longo.",
      )
      .optional()
      .nullable(),

    materialType:
      materialTypeSchema,

    description: z
      .string()
      .trim()
      .max(
        1000,
        "A descrição pode ter no máximo 1000 caracteres.",
      )
      .optional()
      .nullable(),
  });

const updateMaterialRequestSchema =
  z.object({
    requestId: z
      .string()
      .uuid(
        "ID da solicitação inválido.",
      ),

    status:
      materialRequestStatusSchema,

    adminNote: z
      .string()
      .trim()
      .max(
        1500,
        "A resposta pode ter no máximo 1500 caracteres.",
      )
      .optional()
      .nullable(),
  });

const requestIdSchema =
  z.object({
    requestId: z
      .string()
      .uuid(
        "ID da solicitação inválido.",
      ),
  });

const listAdminRequestsSchema =
  z.object({
    status:
      materialRequestStatusSchema
        .optional(),

    q: z
      .string()
      .trim()
      .max(200)
      .optional(),

    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional(),
  });

/**
 * Cria uma nova solicitação de material para o usuário autenticado.
 */
export const createMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof createMaterialRequestSchema
        >,
      ) =>
        createMaterialRequestSchema.parse(
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

        const brand =
          normalizeTextValue(
            data.brand,
          );

        const model =
          normalizeTextValue(
            data.model,
          );

        const year =
          normalizeNullableText(
            data.year,
          );

        const description =
          normalizeNullableText(
            data.description,
          );

        if (
          year &&
          !isValidYearValue(
            year,
          )
        ) {
          throw new Error(
            "Informe um ano válido, como 2020 ou 2018-2022.",
          );
        }

        /*
         * Impede o usuário de criar várias solicitações
         * abertas para o mesmo material.
         */
        const {
          data:
            duplicateRequest,
          error:
            duplicateError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            "id, status",
          )
          .eq(
            "user_id",
            userId,
          )
          .ilike(
            "brand",
            brand,
          )
          .ilike(
            "model",
            model,
          )
          .in(
            "status",
            [
              "pending",
              "reviewing",
            ],
          )
          .limit(1)
          .maybeSingle();

        if (duplicateError) {
          throw new Error(
            duplicateError.message,
          );
        }

        if (
          duplicateRequest
        ) {
          throw new Error(
            "Você já possui uma solicitação pendente para este material.",
          );
        }

        const {
          data:
            createdRequest,
          error:
            createError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .insert({
            user_id:
              userId,

            brand,

            model,

            year,

            material_type:
              data.materialType,

            description,

            status:
              "pending",
          })
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .single();

        if (createError) {
          throw new Error(
            createError.message,
          );
        }

        if (
          !createdRequest
        ) {
          throw new Error(
            "A solicitação foi criada, mas não retornou os dados.",
          );
        }

        return createdRequest as
          MaterialRequestRow;
      },
    );

/**
 * Lista as solicitações do usuário autenticado.
 */
export const listMyMaterialRequests =
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

        const {
          data,
          error,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .eq(
            "user_id",
            userId,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(200);

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return (
          data ?? []
        ) as MaterialRequestRow[];
      },
    );

/**
 * Retorna uma solicitação específica.
 *
 * Usuários comuns só podem visualizar solicitações próprias.
 * Administradores podem visualizar qualquer solicitação.
 */
export const getMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof requestIdSchema
        >,
      ) =>
        requestIdSchema.parse(
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

        const isAdmin =
          await checkUserIsAdmin(
            supabase,
            userId,
          );

        let query = (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at,
              profiles (
                id,
                full_name,
                email
              )
            `,
          )
          .eq(
            "id",
            data.requestId,
          );

        if (!isAdmin) {
          query =
            query.eq(
              "user_id",
              userId,
            );
        }

        const {
          data:
            request,
          error,
        } =
          await query.maybeSingle();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (!request) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        return request as
          MaterialRequestWithProfile;
      },
    );

/**
 * Lista todas as solicitações para o administrador.
 */
export const listAdminMaterialRequests =
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
              typeof listAdminRequestsSchema
            >
          | undefined,
      ) =>
        listAdminRequestsSchema.parse(
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

        await assertAdmin(
          supabase,
          userId,
        );

        let query = (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at,
              profiles (
                id,
                full_name,
                email
              )
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
              500,
          );

        if (data.status) {
          query =
            query.eq(
              "status",
              data.status,
            );
        }

        if (
          data.q?.trim()
        ) {
          const queryText =
            escapePostgrestSearch(
              data.q,
            );

          query =
            query.or(
              [
                `brand.ilike.%${queryText}%`,
                `model.ilike.%${queryText}%`,
                `year.ilike.%${queryText}%`,
                `description.ilike.%${queryText}%`,
                `admin_note.ilike.%${queryText}%`,
              ].join(","),
            );
        }

        const {
          data:
            requests,
          error,
        } = await query;

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return (
          requests ?? []
        ) as MaterialRequestWithProfile[];
      },
    );

/**
 * Atualiza uma solicitação.
 *
 * Somente administradores podem executar esta função.
 */
export const updateMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof updateMaterialRequestSchema
        >,
      ) =>
        updateMaterialRequestSchema.parse(
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

        const adminNote =
          normalizeNullableText(
            data.adminNote,
          );

        if (
          data.status ===
            "rejected" &&
          (
            !adminNote ||
            adminNote.length <
              3
          )
        ) {
          throw new Error(
            "Informe o motivo da recusa.",
          );
        }

        const {
          data:
            existingRequest,
          error:
            existingError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .eq(
            "id",
            data.requestId,
          )
          .maybeSingle();

        if (existingError) {
          throw new Error(
            existingError.message,
          );
        }

        if (
          !existingRequest
        ) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        const now =
          new Date().toISOString();

        const updatePayload: {
          status: MaterialRequestStatus;
          admin_note: string | null;
          completed_at: string | null;
          updated_at: string;
        } = {
          status:
            data.status,

          admin_note:
            adminNote,

          completed_at:
            data.status ===
            "completed"
              ? now
              : null,

          updated_at:
            now,
        };

        const {
          data:
            updatedRequest,
          error:
            updateError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .update(
            updatePayload,
          )
          .eq(
            "id",
            data.requestId,
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .single();

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }

        if (
          !updatedRequest
        ) {
          throw new Error(
            "A solicitação foi atualizada, mas não retornou os dados.",
          );
        }

        /*
         * Caso você tenha criado o trigger no Supabase,
         * a notificação será gerada automaticamente.
         *
         * Esta função não cria outra notificação para
         * evitar duplicidade.
         */
        return updatedRequest as
          MaterialRequestRow;
      },
    );

/**
 * Marca rapidamente uma solicitação como em análise.
 */
export const markMaterialRequestReviewing =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof requestIdSchema
        >,
      ) =>
        requestIdSchema.parse(
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

        const {
          data:
            updatedRequest,
          error,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .update({
            status:
              "reviewing",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            data.requestId,
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (
          !updatedRequest
        ) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        return updatedRequest as
          MaterialRequestRow;
      },
    );

/**
 * Marca rapidamente uma solicitação como concluída.
 */
export const completeMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: {
          requestId: string;
          adminNote?: string;
        },
      ) =>
        z
          .object({
            requestId: z
              .string()
              .uuid(),

            adminNote: z
              .string()
              .trim()
              .max(1500)
              .optional(),
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
          userId,
        } = context;

        await assertAdmin(
          supabase,
          userId,
        );

        const now =
          new Date().toISOString();

        const adminNote =
          normalizeNullableText(
            data.adminNote,
          ) ??
          "O material solicitado já está disponível na biblioteca.";

        const {
          data:
            updatedRequest,
          error,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .update({
            status:
              "completed",

            admin_note:
              adminNote,

            completed_at:
              now,

            updated_at:
              now,
          })
          .eq(
            "id",
            data.requestId,
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (
          !updatedRequest
        ) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        return updatedRequest as
          MaterialRequestRow;
      },
    );

/**
 * Recusa uma solicitação.
 */
export const rejectMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: {
          requestId: string;
          adminNote: string;
        },
      ) =>
        z
          .object({
            requestId: z
              .string()
              .uuid(),

            adminNote: z
              .string()
              .trim()
              .min(
                3,
                "Informe o motivo da recusa.",
              )
              .max(1500),
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
          userId,
        } = context;

        await assertAdmin(
          supabase,
          userId,
        );

        const {
          data:
            updatedRequest,
          error,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .update({
            status:
              "rejected",

            admin_note:
              normalizeTextValue(
                data.adminNote,
              ),

            completed_at:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            data.requestId,
          )
          .select(
            `
              id,
              user_id,
              brand,
              model,
              year,
              material_type,
              description,
              status,
              admin_note,
              created_at,
              updated_at,
              completed_at
            `,
          )
          .single();

        if (error) {
          throw new Error(
            error.message,
          );
        }

        if (
          !updatedRequest
        ) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        return updatedRequest as
          MaterialRequestRow;
      },
    );

/**
 * Exclui uma solicitação.
 *
 * O usuário pode excluir apenas uma solicitação própria ainda pendente.
 * O administrador pode excluir qualquer solicitação.
 */
export const deleteMaterialRequest =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .validator(
      (
        input: z.input<
          typeof requestIdSchema
        >,
      ) =>
        requestIdSchema.parse(
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

        const isAdmin =
          await checkUserIsAdmin(
            supabase,
            userId,
          );

        const {
          data:
            request,
          error:
            requestError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .select(
            "id, user_id, status",
          )
          .eq(
            "id",
            data.requestId,
          )
          .maybeSingle();

        if (requestError) {
          throw new Error(
            requestError.message,
          );
        }

        if (!request) {
          throw new Error(
            "Solicitação não encontrada.",
          );
        }

        if (
          !isAdmin &&
          request.user_id !==
            userId
        ) {
          throw new Error(
            "Você não pode excluir esta solicitação.",
          );
        }

        if (
          !isAdmin &&
          request.status !==
            "pending"
        ) {
          throw new Error(
            "Somente solicitações pendentes podem ser excluídas.",
          );
        }

        const {
          error:
            deleteError,
        } = await (
          supabase as any
        )
          .from(
            "material_requests",
          )
          .delete()
          .eq(
            "id",
            data.requestId,
          );

        if (deleteError) {
          throw new Error(
            deleteError.message,
          );
        }

        return {
          ok: true,
          requestId:
            data.requestId,
        };
      },
    );

/**
 * Retorna os totais das solicitações para o painel administrativo.
 */
export const getMaterialRequestStats =
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

        await assertAdmin(
          supabase,
          userId,
        );

        const [
          totalResult,
          pendingResult,
          reviewingResult,
          completedResult,
          rejectedResult,
        ] =
          await Promise.all([
            (
              supabase as any
            )
              .from(
                "material_requests",
              )
              .select(
                "id",
                {
                  count:
                    "exact",
                  head:
                    true,
                },
              ),

            (
              supabase as any
            )
              .from(
                "material_requests",
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
              .eq(
                "status",
                "pending",
              ),

            (
              supabase as any
            )
              .from(
                "material_requests",
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
              .eq(
                "status",
                "reviewing",
              ),

            (
              supabase as any
            )
              .from(
                "material_requests",
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
              .eq(
                "status",
                "completed",
              ),

            (
              supabase as any
            )
              .from(
                "material_requests",
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
              .eq(
                "status",
                "rejected",
              ),
          ]);

        const firstError =
          totalResult.error ??
          pendingResult.error ??
          reviewingResult.error ??
          completedResult.error ??
          rejectedResult.error;

        if (firstError) {
          throw new Error(
            firstError.message,
          );
        }

        return {
          total:
            totalResult.count ??
            0,

          pending:
            pendingResult.count ??
            0,

          reviewing:
            reviewingResult.count ??
            0,

          completed:
            completedResult.count ??
            0,

          rejected:
            rejectedResult.count ??
            0,
        };
      },
    );

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
  } = await supabase
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

function isValidYearValue(
  value: string,
): boolean {
  return /^(19|20)\d{2}(?:\s*[-–]\s*(19|20)\d{2})?$/.test(
    value,
  );
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
  MaterialRequestRow,
  MaterialRequestStatus,
  MaterialRequestWithProfile,
};

