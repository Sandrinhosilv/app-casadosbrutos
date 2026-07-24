import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  normalizeSearchTerm,
  requireSupabaseAuth,
  throwQueryError,
  type ManualType,
} from "./shared";

const listManualsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(200, "A busca deve ter no máximo 200 caracteres")
    .optional(),

  brandId: z
    .string()
    .uuid("ID da marca inválido")
    .optional(),

  modelId: z
    .string()
    .uuid("ID do modelo inválido")
    .optional(),

  manualType: z
    .enum([
      "servico",
      "proprietario",
      "pecas",
      "diagrama_eletrico",
      "esquema_eletrico",
      "injecao",
      "torque",
      "manutencao",
      "hidraulico",
      "boletim",
      "atualizacao",
      "outro",
    ])
    .optional(),

  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional(),
});

const manualIdSchema = z.object({
  manualId: z
    .string()
    .uuid("ID do manual inválido"),
});

const manualInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "O título deve ter pelo menos 2 caracteres")
    .max(250, "O título deve ter no máximo 250 caracteres"),

  model_id: z
    .string()
    .uuid("ID do modelo inválido"),

  manual_type: z.enum([
    "servico",
    "proprietario",
    "pecas",
    "diagrama_eletrico",
    "esquema_eletrico",
    "injecao",
    "torque",
    "manutencao",
    "hidraulico",
    "boletim",
    "atualizacao",
    "outro",
  ]),

  year: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .nullable()
    .optional(),

  language: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .optional(),

  format: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .optional(),

  description: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional(),

  file_size_bytes: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional(),

  thumbnail_url: z
    .string()
    .url("URL da miniatura inválida")
    .nullable()
    .optional(),

  drive_file_id: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .nullable()
    .optional(),

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(100),
    )
    .max(50)
    .optional(),
});

/**
 * Lista manuais no painel administrativo.
 */
export const listAdminManuals = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      q?: string;
      brandId?: string;
      modelId?: string;
      manualType?: ManualType;
      limit?: number;
    }) => listManualsSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const searchTerm =
      normalizeSearchTerm(data.q);

    let query = supabaseAdmin
      .from("manuals")
      .select(
        `
          id,
          title,
          description,
          manual_type,
          year,
          language,
          format,
          file_size_bytes,
          thumbnail_url,
          drive_file_id,
          tags,
          last_updated,
          created_at,
          updated_at,
          model_id,
          models (
            id,
            name,
            slug,
            year_start,
            year_end,
            brand_id,
            brands (
              id,
              name,
              slug
            )
          )
        `,
      )
      .order("last_updated", {
        ascending: false,
      })
      .limit(data.limit ?? 200);

    if (searchTerm) {
      query = query.ilike(
        "title",
        `%${searchTerm}%`,
      );
    }

    if (data.modelId) {
      query = query.eq(
        "model_id",
        data.modelId,
      );
    }

    if (data.manualType) {
      query = query.eq(
        "manual_type",
        data.manualType,
      );
    }

    const result = await query;

    throwQueryError(
      result.error,
      "Erro ao listar manuais",
    );

    let manuals = result.data ?? [];

    if (data.brandId) {
      manuals = manuals.filter((manual) => {
        const models = manual.models;

        if (!models) {
          return false;
        }

        if (Array.isArray(models)) {
          return models.some(
            (model) =>
              model.brand_id ===
              data.brandId,
          );
        }

        return (
          models.brand_id ===
          data.brandId
        );
      });
    }

    return manuals;
  });

/**
 * Busca um manual específico.
 */
export const getAdminManual = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      manualId: string;
    }) =>
      manualIdSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const result = await supabaseAdmin
      .from("manuals")
      .select(
        `
          id,
          title,
          description,
          manual_type,
          year,
          language,
          format,
          file_size_bytes,
          thumbnail_url,
          drive_file_id,
          tags,
          last_updated,
          created_at,
          updated_at,
          model_id,
          models (
            id,
            name,
            slug,
            year_start,
            year_end,
            brand_id,
            brands (
              id,
              name,
              slug
            )
          )
        `,
      )
      .eq("id", data.manualId)
      .maybeSingle();

    throwQueryError(
      result.error,
      "Erro ao carregar manual",
    );

    if (!result.data) {
      throw new Error(
        "Manual não encontrado",
      );
    }

    return result.data;
  });

/**
 * Cria um manual manualmente pelo painel.
 */
export const createAdminManual = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      title: string;
      model_id: string;
      manual_type: ManualType;
      year?: number | null;
      language?: string;
      format?: string;
      description?: string | null;
      file_size_bytes?: number | null;
      thumbnail_url?: string | null;
      drive_file_id?: string | null;
      tags?: string[];
    }) => manualInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const modelResult =
      await supabaseAdmin
        .from("models")
        .select("id")
        .eq("id", data.model_id)
        .maybeSingle();

    throwQueryError(
      modelResult.error,
      "Erro ao localizar modelo",
    );

    if (!modelResult.data) {
      throw new Error(
        "Modelo não encontrado",
      );
    }

    if (data.drive_file_id) {
      const duplicateResult =
        await supabaseAdmin
          .from("manuals")
          .select("id")
          .eq(
            "drive_file_id",
            data.drive_file_id,
          )
          .maybeSingle();

      throwQueryError(
        duplicateResult.error,
        "Erro ao verificar arquivo duplicado",
      );

      if (duplicateResult.data) {
        throw new Error(
          "Já existe um manual vinculado a este arquivo do Drive.",
        );
      }
    }

    const now =
      new Date().toISOString();

    const result =
      await supabaseAdmin
        .from("manuals")
        .insert({
          title: data.title,
          model_id: data.model_id,
          manual_type:
            data.manual_type,
          year: data.year ?? null,
          language:
            data.language ?? "pt-BR",
          format:
            data.format ?? "PDF",
          description:
            data.description ?? null,
          file_size_bytes:
            data.file_size_bytes ??
            null,
          thumbnail_url:
            data.thumbnail_url ?? null,
          drive_file_id:
            data.drive_file_id ?? null,
          tags:
            data.tags ?? [],
          last_updated: now,
          updated_at: now,
        })
        .select(
          `
            id,
            title,
            description,
            manual_type,
            year,
            language,
            format,
            file_size_bytes,
            thumbnail_url,
            drive_file_id,
            tags,
            last_updated,
            created_at,
            updated_at,
            model_id
          `,
        )
        .single();

    throwQueryError(
      result.error,
      "Erro ao criar manual",
    );

    if (!result.data) {
      throw new Error(
        "O manual foi criado, mas o Supabase não retornou os dados.",
      );
    }

    return {
      ok: true,
      manual: result.data,
    };
  });

/**
 * Atualiza um manual existente.
 */
export const updateAdminManual = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      manualId: string;
      title: string;
      model_id: string;
      manual_type: ManualType;
      year?: number | null;
      language?: string;
      format?: string;
      description?: string | null;
      file_size_bytes?: number | null;
      thumbnail_url?: string | null;
      drive_file_id?: string | null;
      tags?: string[];
    }) =>
      manualInputSchema
        .extend({
          manualId: z
            .string()
            .uuid(
              "ID do manual inválido",
            ),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const existingResult =
      await supabaseAdmin
        .from("manuals")
        .select("id")
        .eq("id", data.manualId)
        .maybeSingle();

    throwQueryError(
      existingResult.error,
      "Erro ao localizar manual",
    );

    if (!existingResult.data) {
      throw new Error(
        "Manual não encontrado",
      );
    }

    const modelResult =
      await supabaseAdmin
        .from("models")
        .select("id")
        .eq("id", data.model_id)
        .maybeSingle();

    throwQueryError(
      modelResult.error,
      "Erro ao localizar modelo",
    );

    if (!modelResult.data) {
      throw new Error(
        "Modelo não encontrado",
      );
    }

    if (data.drive_file_id) {
      const duplicateResult =
        await supabaseAdmin
          .from("manuals")
          .select("id")
          .eq(
            "drive_file_id",
            data.drive_file_id,
          )
          .neq("id", data.manualId)
          .maybeSingle();

      throwQueryError(
        duplicateResult.error,
        "Erro ao verificar arquivo duplicado",
      );

      if (duplicateResult.data) {
        throw new Error(
          "Outro manual já está vinculado a este arquivo do Drive.",
        );
      }
    }

    const now =
      new Date().toISOString();

    const result =
      await supabaseAdmin
        .from("manuals")
        .update({
          title: data.title,
          model_id: data.model_id,
          manual_type:
            data.manual_type,
          year: data.year ?? null,
          language:
            data.language ?? "pt-BR",
          format:
            data.format ?? "PDF",
          description:
            data.description ?? null,
          file_size_bytes:
            data.file_size_bytes ??
            null,
          thumbnail_url:
            data.thumbnail_url ?? null,
          drive_file_id:
            data.drive_file_id ?? null,
          tags:
            data.tags ?? [],
          last_updated: now,
          updated_at: now,
        })
        .eq("id", data.manualId)
        .select(
          `
            id,
            title,
            description,
            manual_type,
            year,
            language,
            format,
            file_size_bytes,
            thumbnail_url,
            drive_file_id,
            tags,
            last_updated,
            created_at,
            updated_at,
            model_id
          `,
        )
        .single();

    throwQueryError(
      result.error,
      "Erro ao atualizar manual",
    );

    if (!result.data) {
      throw new Error(
        "O manual foi atualizado, mas o Supabase não retornou os dados.",
      );
    }

    return {
      ok: true,
      manual: result.data,
    };
  });

/**
 * Exclui um manual.
 */
export const deleteManual = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      manualId: string;
    }) =>
      manualIdSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
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
        .eq("id", data.manualId)
        .maybeSingle();

    throwQueryError(
      manualResult.error,
      "Erro ao localizar manual",
    );

    if (!manualResult.data) {
      throw new Error(
        "Manual não encontrado",
      );
    }

    const deleteResult =
      await supabaseAdmin
        .from("manuals")
        .delete()
        .eq("id", data.manualId);

    throwQueryError(
      deleteResult.error,
      "Erro ao excluir manual",
    );

    return {
      ok: true,

      deletedManual: {
        id:
          manualResult.data.id,

        title:
          manualResult.data.title,

        drive_file_id:
          manualResult.data
            .drive_file_id,
      },
    };
  });

/**
 * Lista marcas para filtros e formulários.
 */
export const listAdminBrands = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const result =
      await supabaseAdmin
        .from("brands")
        .select(
          `
            id,
            name,
            slug,
            logo_url,
            country,
            created_at
          `,
        )
        .order("name", {
          ascending: true,
        });

    throwQueryError(
      result.error,
      "Erro ao listar marcas",
    );

    return result.data ?? [];
  });

/**
 * Lista modelos, opcionalmente filtrados por marca.
 */
export const listAdminModels = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      brandId?: string;
      q?: string;
      limit?: number;
    }) =>
      z
        .object({
          brandId: z
            .string()
            .uuid(
              "ID da marca inválido",
            )
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
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("models")
      .select(
        `
          id,
          brand_id,
          category_id,
          name,
          slug,
          year_start,
          year_end,
          engine,
          displacement_cc,
          fuel_system,
          fuel,
          ecu_code,
          description,
          image_url,
          drive_folder_id,
          created_at,
          updated_at,
          brands (
            id,
            name,
            slug
          )
        `,
      )
      .order("name", {
        ascending: true,
      })
      .limit(data.limit ?? 300);

    if (data.brandId) {
      query = query.eq(
        "brand_id",
        data.brandId,
      );
    }

    const searchTerm =
      normalizeSearchTerm(data.q);

    if (searchTerm) {
      query = query.ilike(
        "name",
        `%${searchTerm}%`,
      );
    }

    const result = await query;

    throwQueryError(
      result.error,
      "Erro ao listar modelos",
    );

    return result.data ?? [];
  });