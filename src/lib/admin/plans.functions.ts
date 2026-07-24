import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  requireSupabaseAuth,
  throwQueryError,
} from "./shared";

type PlanInput = {
  name: string;
  slug: string;
  price: number;
  billing_cycle: string;
  description?: string | null;
  is_active?: boolean;
};

const planInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(120, "O nome deve ter no máximo 120 caracteres"),

  slug: z
    .string()
    .trim()
    .min(2, "O slug deve ter pelo menos 2 caracteres")
    .max(120, "O slug deve ter no máximo 120 caracteres")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens no slug",
    ),

  price: z
    .number()
    .finite()
    .min(0, "O preço não pode ser negativo"),

  billing_cycle: z
    .string()
    .trim()
    .min(1, "Informe o ciclo de cobrança")
    .max(50, "O ciclo de cobrança é muito longo"),

  description: z
    .string()
    .trim()
    .max(1000, "A descrição deve ter no máximo 1000 caracteres")
    .nullable()
    .optional(),

  is_active: z
    .boolean()
    .optional(),
});

const planIdSchema = z.object({
  planId: z
    .string()
    .uuid("ID do plano inválido"),
});

const listPlansSchema = z.object({
  q: z
    .string()
    .trim()
    .max(200)
    .optional(),

  activeOnly: z
    .boolean()
    .optional(),

  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional(),
});

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Lista os planos do SaaS.
 */
export const listAdminPlans = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      q?: string;
      activeOnly?: boolean;
      limit?: number;
    }) =>
      listPlansSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("plans")
      .select(
        `
          id,
          name,
          slug,
          price,
          billing_cycle,
          description,
          is_active,
          created_at,
          updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(data.limit ?? 100);

    if (data.activeOnly) {
      query = query.eq(
        "is_active",
        true,
      );
    }

    const searchTerm =
      data.q?.trim();

    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
      );
    }

    const result = await query;

    throwQueryError(
      result.error,
      "Erro ao listar planos",
    );

    return result.data ?? [];
  });

/**
 * Busca um plano pelo ID.
 */
export const getAdminPlan = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      planId: string;
    }) =>
      planIdSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const result = await supabaseAdmin
      .from("plans")
      .select(
        `
          id,
          name,
          slug,
          price,
          billing_cycle,
          description,
          is_active,
          created_at,
          updated_at
        `,
      )
      .eq("id", data.planId)
      .maybeSingle();

    throwQueryError(
      result.error,
      "Erro ao carregar plano",
    );

    if (!result.data) {
      throw new Error(
        "Plano não encontrado",
      );
    }

    return result.data;
  });

/**
 * Cria um novo plano.
 */
export const createAdminPlan = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: PlanInput) =>
      planInputSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const slug = normalizeSlug(
      data.slug,
    );

    const existingResult =
      await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    throwQueryError(
      existingResult.error,
      "Erro ao verificar slug do plano",
    );

    if (existingResult.data) {
      throw new Error(
        "Já existe um plano com este slug.",
      );
    }

    const now =
      new Date().toISOString();

    const result =
      await supabaseAdmin
        .from("plans")
        .insert({
          name: data.name,
          slug,
          price: data.price,
          billing_cycle:
            data.billing_cycle,
          description:
            data.description ?? null,
          is_active:
            data.is_active ?? true,
          created_at: now,
          updated_at: now,
        })
        .select(
          `
            id,
            name,
            slug,
            price,
            billing_cycle,
            description,
            is_active,
            created_at,
            updated_at
          `,
        )
        .single();

    throwQueryError(
      result.error,
      "Erro ao criar plano",
    );

    if (!result.data) {
      throw new Error(
        "O plano foi criado, mas o Supabase não retornou os dados.",
      );
    }

    return {
      ok: true,
      plan: result.data,
    };
  });

/**
 * Atualiza um plano existente.
 */
export const updateAdminPlan = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      planId: string;
      name: string;
      slug: string;
      price: number;
      billing_cycle: string;
      description?: string | null;
      is_active?: boolean;
    }) =>
      planInputSchema
        .extend({
          planId: z
            .string()
            .uuid("ID do plano inválido"),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const existingPlanResult =
      await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("id", data.planId)
        .maybeSingle();

    throwQueryError(
      existingPlanResult.error,
      "Erro ao localizar plano",
    );

    if (!existingPlanResult.data) {
      throw new Error(
        "Plano não encontrado",
      );
    }

    const slug = normalizeSlug(
      data.slug,
    );

    const duplicatedSlugResult =
      await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("slug", slug)
        .neq("id", data.planId)
        .maybeSingle();

    throwQueryError(
      duplicatedSlugResult.error,
      "Erro ao verificar slug duplicado",
    );

    if (duplicatedSlugResult.data) {
      throw new Error(
        "Já existe outro plano com este slug.",
      );
    }

    const result =
      await supabaseAdmin
        .from("plans")
        .update({
          name: data.name,
          slug,
          price: data.price,
          billing_cycle:
            data.billing_cycle,
          description:
            data.description ?? null,
          is_active:
            data.is_active ?? true,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", data.planId)
        .select(
          `
            id,
            name,
            slug,
            price,
            billing_cycle,
            description,
            is_active,
            created_at,
            updated_at
          `,
        )
        .single();

    throwQueryError(
      result.error,
      "Erro ao atualizar plano",
    );

    if (!result.data) {
      throw new Error(
        "O plano foi atualizado, mas o Supabase não retornou os dados.",
      );
    }

    return {
      ok: true,
      plan: result.data,
    };
  });

/**
 * Ativa ou desativa um plano.
 */
export const setAdminPlanStatus = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      planId: string;
      is_active: boolean;
    }) =>
      z
        .object({
          planId: z
            .string()
            .uuid(
              "ID do plano inválido",
            ),

          is_active: z.boolean(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const result =
      await supabaseAdmin
        .from("plans")
        .update({
          is_active:
            data.is_active,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", data.planId)
        .select(
          `
            id,
            name,
            slug,
            price,
            billing_cycle,
            description,
            is_active,
            created_at,
            updated_at
          `,
        )
        .single();

    throwQueryError(
      result.error,
      "Erro ao alterar status do plano",
    );

    if (!result.data) {
      throw new Error(
        "O plano foi alterado, mas o Supabase não retornou os dados.",
      );
    }

    return {
      ok: true,
      plan: result.data,
    };
  });

/**
 * Retorna os planos com contagem de assinaturas.
 */
export const getAdminPlanUsage = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const plansResult =
      await supabaseAdmin
        .from("plans")
        .select(
          `
            id,
            name,
            slug,
            price,
            billing_cycle,
            description,
            is_active,
            created_at,
            updated_at
          `,
        )
        .order("created_at", {
          ascending: false,
        });

    throwQueryError(
      plansResult.error,
      "Erro ao listar planos",
    );

    const plans =
      plansResult.data ?? [];

    if (plans.length === 0) {
      return [];
    }

    const subscriptionsResult =
      await supabaseAdmin
        .from("subscriptions")
        .select(
          `
            id,
            plan_id,
            status
          `,
        )
        .in(
          "plan_id",
          plans.map(
            (plan) => plan.id,
          ),
        );

    throwQueryError(
      subscriptionsResult.error,
      "Erro ao carregar assinaturas dos planos",
    );

    const usageMap = new Map<
      string,
      {
        total: number;
        active: number;
        trial: number;
        past_due: number;
        cancelled: number;
        expired: number;
      }
    >();

    for (const plan of plans) {
      usageMap.set(plan.id, {
        total: 0,
        active: 0,
        trial: 0,
        past_due: 0,
        cancelled: 0,
        expired: 0,
      });
    }

    for (
      const subscription of
      subscriptionsResult.data ?? []
    ) {
      if (!subscription.plan_id) {
        continue;
      }

      const usage =
        usageMap.get(
          subscription.plan_id,
        );

      if (!usage) {
        continue;
      }

      usage.total += 1;

      switch (
        subscription.status
      ) {
        case "active":
          usage.active += 1;
          break;

        case "trial":
          usage.trial += 1;
          break;

        case "past_due":
          usage.past_due += 1;
          break;

        case "cancelled":
          usage.cancelled += 1;
          break;

        case "expired":
          usage.expired += 1;
          break;
      }
    }

    return plans.map(
      (plan) => ({
        ...plan,

        usage:
          usageMap.get(plan.id) ?? {
            total: 0,
            active: 0,
            trial: 0,
            past_due: 0,
            cancelled: 0,
            expired: 0,
          },
      }),
    );
  });

/**
 * Exclui um plano sem assinaturas vinculadas.
 */
export const deleteAdminPlan = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      planId: string;
    }) =>
      planIdSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const existingResult =
      await supabaseAdmin
        .from("plans")
        .select(
          `
            id,
            name,
            slug,
            price,
            billing_cycle,
            description,
            is_active,
            created_at,
            updated_at
          `,
        )
        .eq("id", data.planId)
        .maybeSingle();

    throwQueryError(
      existingResult.error,
      "Erro ao localizar plano",
    );

    if (!existingResult.data) {
      throw new Error(
        "Plano não encontrado",
      );
    }

    const subscriptionsResult =
      await supabaseAdmin
        .from("subscriptions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "plan_id",
          data.planId,
        );

    throwQueryError(
      subscriptionsResult.error,
      "Erro ao verificar assinaturas vinculadas",
    );

    const totalSubscriptions =
      subscriptionsResult.count ??
      0;

    if (totalSubscriptions > 0) {
      throw new Error(
        `Este plano possui ${totalSubscriptions} assinatura(s) vinculada(s). Desative-o em vez de excluir.`,
      );
    }

    const deleteResult =
      await supabaseAdmin
        .from("plans")
        .delete()
        .eq("id", data.planId);

    throwQueryError(
      deleteResult.error,
      "Erro ao excluir plano",
    );

    return {
      ok: true,
      deletedPlan:
        existingResult.data,
    };
  });