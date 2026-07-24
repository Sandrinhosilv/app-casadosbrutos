import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  requireSupabaseAuth,
  throwQueryError,
  type SubscriptionStatus,
} from "./shared";

export const setUserSubscription = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      userId: string;
      status: SubscriptionStatus;
      plan_id?: string;
      expires_at?: string;
    }) =>
      z
        .object({
          userId: z.string().uuid(),

          status: z.enum([
            "trial",
            "active",
            "past_due",
            "cancelled",
            "expired",
          ]),

          plan_id: z.string().uuid().optional(),

          expires_at: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const now = new Date().toISOString();

    let planId = data.plan_id ?? null;

    if (!planId) {
      const planResult = await supabaseAdmin
        .from("plans")
        .select("id")
        .limit(1)
        .maybeSingle();

      throwQueryError(
        planResult.error,
        "Erro ao localizar plano",
      );

      planId = planResult.data?.id ?? null;
    }

    const subscriptionData = {
      user_id: data.userId,

      plan_id: planId,

      status: data.status,

      started_at:
        data.status === "active" ||
        data.status === "trial"
          ? now
          : null,

      expires_at:
        data.expires_at ?? null,

      cancelled_at:
        data.status === "cancelled"
          ? now
          : null,

      gateway: "admin",

      updated_at: now,
    };

    const result =
      await supabaseAdmin
        .from("subscriptions")
        .upsert(subscriptionData, {
          onConflict: "user_id",
        })
        .select()
        .single();

    throwQueryError(
      result.error,
      "Erro ao salvar assinatura",
    );

    if (!result.data) {
      throw new Error(
        "A assinatura foi salva, porém o banco não retornou os dados."
      );
    }

    return {
      ok: true,
      subscription: result.data,
    };
  });