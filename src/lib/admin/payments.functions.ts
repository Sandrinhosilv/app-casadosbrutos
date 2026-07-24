import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  requireSupabaseAuth,
  throwQueryError,
} from "./shared";

type PaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "chargeback"
  | "failed";

type PaymentProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type PaymentSubscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  status:
    | "trial"
    | "active"
    | "past_due"
    | "cancelled"
    | "expired"
    | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
};

type AdminPayment = {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  amount: number | null;
  status: PaymentStatus | null;
  payment_method: string | null;
  gateway: string | null;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type AdminPaymentWithRelations = AdminPayment & {
  profile: PaymentProfile | null;
  subscription: PaymentSubscription | null;
};

const listPaymentsSchema = z.object({
  userId: z
    .string()
    .uuid("ID do usuário inválido")
    .optional(),

  status: z
    .enum([
      "pending",
      "paid",
      "refunded",
      "chargeback",
      "failed",
    ])
    .optional(),

  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional(),
});

const getPaymentSchema = z.object({
  paymentId: z
    .string()
    .uuid("ID do pagamento inválido"),
});

/**
 * Lista pagamentos no painel administrativo.
 */
export const listAdminPayments = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (
      input: {
        userId?: string;
        status?: PaymentStatus;
        limit?: number;
      },
    ) => listPaymentsSchema.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let paymentsQuery = supabaseAdmin
      .from("payments")
      .select(
        `
          id,
          user_id,
          subscription_id,
          amount,
          status,
          payment_method,
          gateway,
          transaction_id,
          paid_at,
          created_at
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(data.limit ?? 200);

    if (data.userId) {
      paymentsQuery = paymentsQuery.eq(
        "user_id",
        data.userId,
      );
    }

    if (data.status) {
      paymentsQuery = paymentsQuery.eq(
        "status",
        data.status,
      );
    }

    const paymentsResult =
      await paymentsQuery;

    throwQueryError(
      paymentsResult.error,
      "Erro ao listar pagamentos",
    );

    const payments =
      (paymentsResult.data ??
        []) as AdminPayment[];

    if (payments.length === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.user_id)
          .filter(
            (userId): userId is string =>
              typeof userId === "string" &&
              userId.length > 0,
          ),
      ),
    );

    const subscriptionIds = Array.from(
      new Set(
        payments
          .map(
            (payment) =>
              payment.subscription_id,
          )
          .filter(
            (
              subscriptionId,
            ): subscriptionId is string =>
              typeof subscriptionId ===
                "string" &&
              subscriptionId.length > 0,
          ),
      ),
    );

    const profilesMap = new Map<
      string,
      PaymentProfile
    >();

    const subscriptionsMap = new Map<
      string,
      PaymentSubscription
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
        "Erro ao carregar usuários dos pagamentos",
      );

      for (
        const profile of
        profilesResult.data ?? []
      ) {
        profilesMap.set(profile.id, {
          id: profile.id,
          email: profile.email,
          full_name:
            profile.full_name,
        });
      }
    }

    if (subscriptionIds.length > 0) {
      const subscriptionsResult =
        await supabaseAdmin
          .from("subscriptions")
          .select(
            `
              id,
              user_id,
              plan_id,
              status,
              started_at,
              expires_at,
              cancelled_at
            `,
          )
          .in("id", subscriptionIds);

      throwQueryError(
        subscriptionsResult.error,
        "Erro ao carregar assinaturas dos pagamentos",
      );

      for (
        const subscription of
        subscriptionsResult.data ?? []
      ) {
        subscriptionsMap.set(
          subscription.id,
          {
            id: subscription.id,
            user_id:
              subscription.user_id,
            plan_id:
              subscription.plan_id,
            status:
              subscription.status,
            started_at:
              subscription.started_at,
            expires_at:
              subscription.expires_at,
            cancelled_at:
              subscription.cancelled_at,
          },
        );
      }
    }

    const result: AdminPaymentWithRelations[] =
      payments.map((payment) => ({
        ...payment,

        profile: payment.user_id
          ? profilesMap.get(
              payment.user_id,
            ) ?? null
          : null,

        subscription:
          payment.subscription_id
            ? subscriptionsMap.get(
                payment.subscription_id,
              ) ?? null
            : null,
      }));

    return result;
  });

/**
 * Busca um pagamento específico.
 */
export const getAdminPayment =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .validator(
      (
        input: {
          paymentId: string;
        },
      ) => getPaymentSchema.parse(input),
    )
    .handler(
      async ({ data, context }) => {
        await assertAdmin(context);

        const { supabaseAdmin } =
          await import(
            "@/integrations/supabase/client.server"
          );

        const paymentResult =
          await supabaseAdmin
            .from("payments")
            .select(
              `
                id,
                user_id,
                subscription_id,
                amount,
                status,
                payment_method,
                gateway,
                transaction_id,
                paid_at,
                created_at
              `,
            )
            .eq("id", data.paymentId)
            .maybeSingle();

        throwQueryError(
          paymentResult.error,
          "Erro ao carregar pagamento",
        );

        if (!paymentResult.data) {
          throw new Error(
            "Pagamento não encontrado",
          );
        }

        const payment =
          paymentResult.data as AdminPayment;

        let profile:
          | PaymentProfile
          | null = null;

        let subscription:
          | PaymentSubscription
          | null = null;

        if (payment.user_id) {
          const profileResult =
            await supabaseAdmin
              .from("profiles")
              .select(
                `
                  id,
                  email,
                  full_name
                `,
              )
              .eq(
                "id",
                payment.user_id,
              )
              .maybeSingle();

          throwQueryError(
            profileResult.error,
            "Erro ao carregar usuário do pagamento",
          );

          if (profileResult.data) {
            profile = {
              id:
                profileResult.data.id,
              email:
                profileResult.data
                  .email,
              full_name:
                profileResult.data
                  .full_name,
            };
          }
        }

        if (
          payment.subscription_id
        ) {
          const subscriptionResult =
            await supabaseAdmin
              .from("subscriptions")
              .select(
                `
                  id,
                  user_id,
                  plan_id,
                  status,
                  started_at,
                  expires_at,
                  cancelled_at
                `,
              )
              .eq(
                "id",
                payment.subscription_id,
              )
              .maybeSingle();

          throwQueryError(
            subscriptionResult.error,
            "Erro ao carregar assinatura do pagamento",
          );

          if (
            subscriptionResult.data
          ) {
            subscription = {
              id:
                subscriptionResult
                  .data.id,

              user_id:
                subscriptionResult
                  .data.user_id,

              plan_id:
                subscriptionResult
                  .data.plan_id,

              status:
                subscriptionResult
                  .data.status,

              started_at:
                subscriptionResult
                  .data.started_at,

              expires_at:
                subscriptionResult
                  .data.expires_at,

              cancelled_at:
                subscriptionResult
                  .data.cancelled_at,
            };
          }
        }

        const result: AdminPaymentWithRelations =
          {
            ...payment,
            profile,
            subscription,
          };

        return result;
      },
    );

/**
 * Atualiza manualmente o status de um pagamento.
 *
 * Útil para correções administrativas.
 */
export const setAdminPaymentStatus =
  createServerFn({
    method: "POST",
  })
    .middleware([requireSupabaseAuth])
    .validator(
      (
        input: {
          paymentId: string;
          status: PaymentStatus;
        },
      ) =>
        z
          .object({
            paymentId: z
              .string()
              .uuid(
                "ID do pagamento inválido",
              ),

            status: z.enum([
              "pending",
              "paid",
              "refunded",
              "chargeback",
              "failed",
            ]),
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

        const now =
          new Date().toISOString();

        const paymentResult =
          await supabaseAdmin
            .from("payments")
            .update({
              status: data.status,

              paid_at:
                data.status === "paid"
                  ? now
                  : null,
            })
            .eq("id", data.paymentId)
            .select(
              `
                id,
                user_id,
                subscription_id,
                amount,
                status,
                payment_method,
                gateway,
                transaction_id,
                paid_at,
                created_at
              `,
            )
            .single();

        throwQueryError(
          paymentResult.error,
          "Erro ao atualizar pagamento",
        );

        if (!paymentResult.data) {
          throw new Error(
            "O pagamento foi atualizado, mas o Supabase não retornou os dados.",
          );
        }

        return {
          ok: true,
          payment:
            paymentResult.data,
        };
      },
    );