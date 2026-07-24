import { createFileRoute } from "@tanstack/react-router";

import type { Json } from "@/integrations/supabase/types";

type SubscriptionStatus =
  | "active"
  | "trial"
  | "past_due"
  | "cancelled"
  | "expired";

type PaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "chargeback"
  | "failed";

type BuyerProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type AuthUserSummary = {
  id: string;
  email?: string;
};

type ExistingSubscription = {
  id: string;
  plan_id: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  gateway_subscription_id: string | null;
};

const ACTIVATE_EVENTS = new Set([
  "Product_Access_Started",
  "Purchase_Order_Confirmed",
  "Subscription_Created",
  "Recurrent_Payment",
  "Subscription_Renewed",
  "Payment_Approved",
]);

const PAST_DUE_EVENTS = new Set([
  "Recurrent_Payment_Failed",
  "Subscription_Payment_Failed",
  "Purchase_Order_Overdue",
  "Purchase_Order_Expired",
  "Purchase_Request_Expired",
  "Subscription_Renewal_Pending",
  "Payment_Overdue",
  "Payment_Failed",
]);

const CANCEL_EVENTS = new Set([
  "Purchase_Refund",
  "Payment_Refund",
  "Purchase_Request_Chargeback",
  "Payment_Chargeback",
  "Subscription_Canceled",
  "Subscription_Cancelled",
]);

const EXPIRE_EVENTS = new Set([
  "Subscription_Expired",
  "Product_Access_Ended",
  "Product_access_ended",
]);

export const Route = createFileRoute(
  "/api/public/webhooks/lastlink",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const configuredToken =
          process.env.LASTLINK_WEBHOOK_TOKEN?.trim();

        if (!configuredToken) {
          console.error(
            "[Lastlink] LASTLINK_WEBHOOK_TOKEN não configurado.",
          );

          return new Response("Webhook not configured", {
            status: 500,
          });
        }

        const requestUrl =
          new URL(request.url);

        const authorization =
          request.headers.get("authorization") ?? "";

        const bearerToken =
          authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : "";

        const headerToken =
          request.headers
            .get("x-webhook-token")
            ?.trim() ?? "";

        const queryToken =
          requestUrl.searchParams
            .get("token")
            ?.trim() ?? "";

        const receivedToken =
          bearerToken ||
          headerToken ||
          queryToken;

        if (
          receivedToken !==
          configuredToken
        ) {
          console.warn(
            "[Lastlink] Tentativa com token inválido.",
          );

          return new Response("Invalid token", {
            status: 401,
          });
        }

        let payload: any;

        try {
          payload =
            await request.json();
        } catch {
          return new Response("Invalid JSON", {
            status: 400,
          });
        }

        const event =
          getFirstString([
            payload?.Event,
            payload?.event,
            payload?.Type,
            payload?.type,
          ]);

        const email =
          getFirstString([
            payload?.Data?.Member?.Email,
            payload?.Data?.Member?.email,

            payload?.Data?.Buyer?.Email,
            payload?.Data?.Buyer?.email,

            payload?.Data?.Customer?.Email,
            payload?.Data?.Customer?.email,

            payload?.Data?.Purchaser?.Email,
            payload?.Data?.Purchaser?.email,

            payload?.data?.member?.email,
            payload?.data?.buyer?.email,
            payload?.data?.customer?.email,
            payload?.data?.purchaser?.email,

            payload?.member?.email,
            payload?.buyer?.email,
            payload?.customer?.email,

            payload?.Email,
            payload?.email,
          ])
            ?.trim()
            .toLowerCase();

        if (
          !event ||
          !email
        ) {
          console.warn(
            "[Lastlink] Payload sem evento ou e-mail:",
            {
              event,
              email,
              payloadId:
                payload?.Id ??
                payload?.id ??
                null,
            },
          );

          return new Response("Missing fields", {
            status: 400,
          });
        }

        const isTest =
          payload?.IsTest === true ||
          payload?.isTest === true;

        if (
          isTest ||
          email === "contato@lastlink.com"
        ) {
          console.log(
            "[Lastlink] Evento de teste ignorado:",
            {
              event,
              email,
              payloadId:
                payload?.Id ??
                payload?.id ??
                null,
            },
          );

          return new Response("test ignored", {
            status: 200,
          });
        }

        const subscriptionStatus =
          resolveSubscriptionStatus(
            event,
          );

        if (
          !subscriptionStatus
        ) {
          console.log(
            `[Lastlink] Evento ignorado: ${event}`,
          );

          return new Response("ignored", {
            status: 200,
          });
        }

        const buyerName =
          getFirstString([
            payload?.Data?.Member?.Name,
            payload?.Data?.Member?.name,

            payload?.Data?.Buyer?.Name,
            payload?.Data?.Buyer?.name,

            payload?.Data?.Customer?.Name,
            payload?.Data?.Customer?.name,

            payload?.data?.member?.name,
            payload?.data?.buyer?.name,
            payload?.data?.customer?.name,

            payload?.member?.name,
            payload?.buyer?.name,
            payload?.customer?.name,
          ]);

        const productId =
          getFirstString([
            payload?.Data?.Product?.Id,
            payload?.Data?.Product?.id,

            payload?.Data?.Products?.[0]?.Id,
            payload?.Data?.Products?.[0]?.id,

            payload?.Products?.[0]?.Id,
            payload?.Products?.[0]?.id,

            payload?.Data?.Purchase
              ?.Product?.Id,

            payload?.Data
              ?.Subscriptions?.[0]
              ?.ProductId,

            payload?.data?.product?.id,
            payload?.product?.id,
          ]);

        const productName =
          getFirstString([
            payload?.Data?.Product?.Name,
            payload?.Data?.Product?.name,

            payload?.Data?.Products?.[0]?.Name,
            payload?.Data?.Products?.[0]?.name,

            payload?.Products?.[0]?.Name,
            payload?.Products?.[0]?.name,

            payload?.Data?.Purchase
              ?.Product?.Name,

            payload?.Data
              ?.Subscriptions?.[0]
              ?.ProductName,

            payload?.data?.product?.name,
            payload?.product?.name,
          ]) ??
          "Casa dos brutos";

        const offerId =
          getFirstString([
            payload?.Data?.Offer?.Id,
            payload?.Data?.Offer?.id,

            payload?.data?.offer?.id,

            payload?.Offer?.Id,
            payload?.Offer?.id,
          ]);

        const offerName =
          getFirstString([
            payload?.Data?.Offer?.Name,
            payload?.Data?.Offer?.name,

            payload?.data?.offer?.name,

            payload?.Offer?.Name,
            payload?.Offer?.name,
          ]);

        const accessType =
          getFirstString([
            payload?.Data?.AccessType,
            payload?.Data?.accessType,

            payload?.data?.accessType,
            payload?.accessType,
          ]);

        const gatewaySubscriptionId =
          getFirstString([
            payload?.Data?.SubscriptionId,
            payload?.Data?.subscriptionId,

            payload?.Data
              ?.Subscriptions?.[0]?.Id,

            payload?.Data
              ?.Subscriptions?.[0]?.id,

            payload?.Subscriptions?.[0]?.Id,
            payload?.Subscriptions?.[0]?.id,

            payload?.Data
              ?.Subscription?.Id,

            payload?.Data
              ?.Subscription?.id,

            payload?.data
              ?.subscriptions?.[0]?.id,

            payload?.subscription?.id,
            payload?.subscription_id,
          ]);

        /*
         * O ID real do pagamento enviado pela Lastlink.
         */
        const transactionId =
          getFirstString([
            payload?.Data?.Purchase?.PaymentId,
            payload?.Data?.Purchase?.paymentId,
            payload?.Data?.Purchase?.payment_id,

            payload?.Purchase?.PaymentId,
            payload?.Purchase?.paymentId,

            payload?.data?.purchase?.payment_id,
            payload?.data?.purchase?.paymentId,

            payload?.Data?.Purchase?.Id,
            payload?.Data?.Purchase?.id,

            payload?.Data?.Purchase
              ?.TransactionId,

            payload?.Data?.Payment?.Id,
            payload?.Data?.Payment?.id,

            payload?.Data?.Order?.Id,
            payload?.Data?.Order?.id,

            payload?.transaction?.id,
            payload?.transaction_id,
            payload?.order_id,

            payload?.Id,
            payload?.id,
          ]);

        /*
         * Data real em que a Lastlink liberou o acesso.
         */
        const accessStartedAt =
          normalizeDate(
            getFirstString([
              payload?.Data
                ?.AccessStartedAt,

              payload?.Data
                ?.accessStartedAt,

              payload?.AccessStartedAt,
              payload?.accessStartedAt,
            ]),
          );

        /*
         * Data real em que a Lastlink encerrou o acesso.
         */
        const accessEndedAt =
          normalizeDate(
            getFirstString([
              payload?.Data
                ?.AccessEndedAt,

              payload?.Data
                ?.accessEndedAt,

              payload?.AccessEndedAt,
              payload?.accessEndedAt,
            ]),
          );

        const createdAt =
          normalizeDate(
            getFirstString([
              payload?.CreatedAt,
              payload?.createdAt,
            ]),
          );

        /*
         * Data de pagamento enviada no evento
         * Purchase_Order_Confirmed.
         */
        const paymentDate =
          normalizeDate(
            getFirstString([
              payload?.Data?.Purchase
                ?.PaymentDate,

              payload?.Data?.Purchase
                ?.paymentDate,

              payload?.Data?.Purchase
                ?.payment_date,

              payload?.Purchase
                ?.PaymentDate,

              payload?.Purchase
                ?.paymentDate,

              payload?.Data?.Purchase
                ?.PaidAt,

              payload?.Data?.Payment
                ?.PaidAt,

              payload?.data?.purchase
                ?.payment_date,

              payload?.payment_date,
              payload?.paid_at,
            ]),
          ) ??
          accessStartedAt ??
          createdAt;

        /*
         * Próxima cobrança enviada pela Lastlink.
         * Esse é o fim oficial do período atual.
         *
         * Mensal:
         * 20/07/2026 -> 20/08/2026
         *
         * Anual:
         * 20/07/2026 -> 20/07/2027
         */
        const nextBilling =
          normalizeDate(
            getFirstString([
              payload?.Data?.Purchase
                ?.NextBilling,

              payload?.Data?.Purchase
                ?.nextBilling,

              payload?.Data?.Purchase
                ?.next_billing,

              payload?.Purchase
                ?.NextBilling,

              payload?.Purchase
                ?.nextBilling,

              payload?.data?.purchase
                ?.nextBilling,

              payload?.data?.purchase
                ?.next_billing,

              payload?.NextBilling,
              payload?.nextBilling,
              payload?.next_billing,
            ]),
          );

        /*
         * Data oficial de cancelamento enviada
         * em Subscription_Canceled.
         */
        const canceledDate =
          normalizeDate(
            getFirstString([
              payload?.Data
                ?.Subscriptions?.[0]
                ?.CanceledDate,

              payload?.Data
                ?.Subscriptions?.[0]
                ?.CancelledDate,

              payload?.Data
                ?.Subscriptions?.[0]
                ?.canceledDate,

              payload?.Subscriptions?.[0]
                ?.CanceledDate,

              payload?.Subscriptions?.[0]
                ?.CancelledDate,

              payload?.Data
                ?.Subscription
                ?.CanceledDate,

              payload?.Data
                ?.Subscription
                ?.CancelledDate,

              payload?.data
                ?.subscriptions?.[0]
                ?.canceled_date,

              payload?.data
                ?.subscription
                ?.canceled_date,

              payload?.CanceledDate,
              payload?.CancelledDate,
              payload?.canceled_at,
            ]),
          );

        /*
         * Alguns eventos de expiração possuem
         * ExpiredDate dentro de Subscriptions.
         */
        const expiredDate =
          normalizeDate(
            getFirstString([
              payload?.Data
                ?.Subscriptions?.[0]
                ?.ExpiredDate,

              payload?.Data
                ?.Subscriptions?.[0]
                ?.ExpiresAt,

              payload?.Subscriptions?.[0]
                ?.ExpiredDate,

              payload?.Subscriptions?.[0]
                ?.ExpiresAt,

              payload?.Data
                ?.Subscription
                ?.ExpiredDate,

              payload?.Data
                ?.Subscription
                ?.ExpiresAt,

              payload?.data
                ?.subscriptions?.[0]
                ?.expired_date,

              payload?.ExpiredDate,
              payload?.ExpiresAt,
              payload?.expires_at,
            ]),
          );

        const paymentMethod =
          getFirstString([
            payload?.Data?.Purchase
              ?.Payment?.PaymentMethod,

            payload?.Data?.Purchase
              ?.Payment?.paymentMethod,

            payload?.Data?.Purchase
              ?.Payment?.payment_method,

            payload?.Purchase
              ?.Payment?.PaymentMethod,

            payload?.Data?.Purchase
              ?.PaymentMethod,

            payload?.Data?.Payment
              ?.Method,

            payload?.data?.purchase
              ?.payment
              ?.payment_method,

            payload?.data?.purchase
              ?.payment_method,

            payload?.payment_method,

            accessType,
          ]) ?? null;

        const amount =
          getFirstNumber([
            payload?.Data?.Purchase
              ?.Price?.Value,

            payload?.Data?.Purchase
              ?.OriginalPrice?.Value,

            payload?.Purchase
              ?.Price?.Value,

            payload?.Data?.Purchase
              ?.Amount,

            payload?.Data?.Purchase
              ?.Total,

            payload?.Data?.Payment
              ?.Amount,

            payload?.Data?.Products?.[0]
              ?.Price,

            payload?.Products?.[0]?.Price,

            payload?.data?.purchase
              ?.price?.value,

            payload?.data?.purchase
              ?.amount,

            payload?.transaction
              ?.amount,

            payload?.amount,
          ]);

        const { supabaseAdmin } =
          await import(
            "@/integrations/supabase/client.server"
          );

        try {
          const profile =
            await findOrCreateBuyer({
              supabaseAdmin,
              email,
              fullName:
                buyerName ?? null,
            });

          if (!profile) {
            console.error(
              `[Lastlink] Não foi possível criar ou localizar o usuário ${email}.`,
            );

            return new Response(
              "User creation failed",
              {
                status: 500,
              },
            );
          }

          if (
            buyerName &&
            !profile.full_name
          ) {
            const updateProfileResult =
              await supabaseAdmin
                .from("profiles")
                .update({
                  full_name:
                    buyerName,
                })
                .eq(
                  "id",
                  profile.id,
                );

            if (
              updateProfileResult.error
            ) {
              console.error(
                "[Lastlink] Erro ao atualizar nome:",
                updateProfileResult.error,
              );
            }
          }

          const existingSubscriptionResult =
            await supabaseAdmin
              .from("subscriptions")
              .select(
                `
                  id,
                  plan_id,
                  status,
                  started_at,
                  expires_at,
                  cancelled_at,
                  gateway_subscription_id
                `,
              )
              .eq(
                "user_id",
                profile.id,
              )
              .maybeSingle();

          if (
            existingSubscriptionResult.error
          ) {
            console.error(
              "[Lastlink] Erro ao consultar assinatura:",
              existingSubscriptionResult.error,
            );

            return new Response(
              "Database error",
              {
                status: 500,
              },
            );
          }

          const existingSubscription =
            existingSubscriptionResult
              .data as
              | ExistingSubscription
              | null;

          const now =
            new Date().toISOString();

          /*
           * O plano não controla o prazo.
           * Mantém apenas o plano já vinculado,
           * caso exista.
           */
          const planId =
            existingSubscription
              ?.plan_id ??
            null;

          const startedAt =
            resolveStartedAt({
              event,
              accessStartedAt,
              paymentDate,
              createdAt,

              existingStartedAt:
                existingSubscription
                  ?.started_at ??
                null,

              now,
            });

          const expiresAt =
            resolveExpiresAt({
              event,
              nextBilling,
              accessEndedAt,
              expiredDate,
              createdAt,

              existingExpiresAt:
                existingSubscription
                  ?.expires_at ??
                null,

              now,
            });

          const cancelledAt =
            resolveCancelledAt({
              event,
              canceledDate,
              accessEndedAt,
              createdAt,

              existingCancelledAt:
                existingSubscription
                  ?.cancelled_at ??
                null,

              now,
            });

          console.log(
            "[Lastlink] Período de assinatura processado:",
            {
              event,
              email,

              productId,
              productName,

              offerId:
                offerId ?? null,

              offerName:
                offerName ?? null,

              accessType,
              gatewaySubscriptionId,
              subscriptionStatus,

              paymentDate,
              nextBilling,
              canceledDate,
              expiredDate,

              accessStartedAt,
              accessEndedAt,

              startedAt,
              expiresAt,
              cancelledAt,

              transactionId,
              paymentMethod,
              amount,
            },
          );

          const subscriptionResult =
            await supabaseAdmin
              .from("subscriptions")
              .upsert(
                {
                  user_id:
                    profile.id,

                  plan_id:
                    planId,

                  status:
                    subscriptionStatus,

                  started_at:
                    startedAt,

                  expires_at:
                    expiresAt,

                  cancelled_at:
                    cancelledAt,

                  gateway:
                    "lastlink",

                  gateway_subscription_id:
                    gatewaySubscriptionId ??
                    existingSubscription
                      ?.gateway_subscription_id ??
                    null,

                  updated_at:
                    now,
                },
                {
                  onConflict:
                    "user_id",
                },
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
                  gateway,
                  gateway_subscription_id
                `,
              )
              .single();

          if (
            subscriptionResult.error ||
            !subscriptionResult.data
          ) {
            console.error(
              "[Lastlink] Erro ao salvar assinatura:",
              subscriptionResult.error,
            );

            return new Response(
              "Subscription error",
              {
                status: 500,
              },
            );
          }

          const subscription =
            subscriptionResult.data;

          await ensureUserRole(
            supabaseAdmin,
            profile.id,
          );

          const paymentStatus =
            resolvePaymentStatus(
              event,
            );

          if (
            transactionId &&
            paymentStatus
          ) {
            await savePayment({
              supabaseAdmin,
              transactionId,

              userId:
                profile.id,

              subscriptionId:
                subscription.id,

              status:
                paymentStatus,

              amount,

              paymentMethod,

              paidAt:
                paymentStatus ===
                "paid"
                  ? paymentDate ??
                    accessStartedAt ??
                    now
                  : null,

              now,
            });
          }

          const logResult =
            await supabaseAdmin
              .from("activity_logs")
              .insert({
                user_id:
                  profile.id,

                action:
                  `lastlink.${event}`,

                meta:
                  payload as Json,
              });

          if (
            logResult.error
          ) {
            console.error(
              "[Lastlink] Erro ao salvar log:",
              logResult.error,
            );
          }

          console.log(
            "[Lastlink] Evento processado:",
            {
              event,
              email,

              userId:
                profile.id,

              subscriptionId:
                subscription.id,

              subscriptionStatus,

              startedAt:
                subscription.started_at,

              expiresAt:
                subscription.expires_at,

              cancelledAt:
                subscription.cancelled_at,

              transactionId,
              paymentStatus,
            },
          );

          return new Response(
            "ok",
            {
              status: 200,
            },
          );
        } catch (error) {
          console.error(
            "[Lastlink] Erro inesperado:",
            error,
          );

          return new Response(
            "Internal server error",
            {
              status: 500,
            },
          );
        }
      },
    },
  },
});

function resolveStartedAt({
  event,
  accessStartedAt,
  paymentDate,
  createdAt,
  existingStartedAt,
  now,
}: {
  event: string;
  accessStartedAt: string | null;
  paymentDate: string | null;
  createdAt: string | null;
  existingStartedAt: string | null;
  now: string;
}): string {
  /*
   * A primeira compra utiliza PaymentDate.
   */
  if (
    event ===
      "Purchase_Order_Confirmed" &&
    !existingStartedAt
  ) {
    return (
      paymentDate ??
      accessStartedAt ??
      createdAt ??
      now
    );
  }

  /*
   * Product_Access_Started pode chegar antes
   * de Purchase_Order_Confirmed.
   */
  if (
    event ===
      "Product_Access_Started" &&
    !existingStartedAt
  ) {
    return (
      accessStartedAt ??
      paymentDate ??
      createdAt ??
      now
    );
  }

  /*
   * Renovação ou upgrade mantém a data inicial
   * histórica da assinatura.
   */
  return (
    existingStartedAt ??
    paymentDate ??
    accessStartedAt ??
    createdAt ??
    now
  );
}

function resolveExpiresAt({
  event,
  nextBilling,
  accessEndedAt,
  expiredDate,
  createdAt,
  existingExpiresAt,
  now,
}: {
  event: string;
  nextBilling: string | null;
  accessEndedAt: string | null;
  expiredDate: string | null;
  createdAt: string | null;
  existingExpiresAt: string | null;
  now: string;
}): string | null {
  /*
   * Compra, renovação e pagamento aprovado:
   * NextBilling é a validade oficial do período.
   */
  if (
    event ===
      "Purchase_Order_Confirmed" ||
    event ===
      "Recurrent_Payment" ||
    event ===
      "Subscription_Renewed" ||
    event ===
      "Payment_Approved" ||
    event ===
      "Subscription_Created"
  ) {
    return (
      nextBilling ??
      existingExpiresAt
    );
  }

  /*
   * Product_Access_Started apenas confirma
   * a liberação. Não apaga NextBilling salvo
   * pelo evento da compra.
   */
  if (
    event ===
    "Product_Access_Started"
  ) {
    return (
      existingExpiresAt ??
      nextBilling
    );
  }

  /*
   * Encerramento real do acesso.
   */
  if (
    event ===
      "Product_Access_Ended" ||
    event ===
      "Product_access_ended"
  ) {
    return (
      accessEndedAt ??
      expiredDate ??
      createdAt ??
      now
    );
  }

  /*
   * Expiração normal da assinatura.
   */
  if (
    event ===
    "Subscription_Expired"
  ) {
    return (
      expiredDate ??
      accessEndedAt ??
      createdAt ??
      now
    );
  }

  return existingExpiresAt;
}

function resolveCancelledAt({
  event,
  canceledDate,
  accessEndedAt,
  createdAt,
  existingCancelledAt,
  now,
}: {
  event: string;
  canceledDate: string | null;
  accessEndedAt: string | null;
  createdAt: string | null;
  existingCancelledAt: string | null;
  now: string;
}): string | null {
  /*
   * Nova compra, renovação ou liberação
   * limpa cancelamento anterior.
   */
  if (
    ACTIVATE_EVENTS.has(
      event,
    )
  ) {
    return null;
  }

  if (
    CANCEL_EVENTS.has(
      event,
    )
  ) {
    return (
      canceledDate ??
      accessEndedAt ??
      createdAt ??
      now
    );
  }

  return existingCancelledAt;
}

async function findOrCreateBuyer({
  supabaseAdmin,
  email,
  fullName,
}: {
  supabaseAdmin: any;
  email: string;
  fullName: string | null;
}): Promise<BuyerProfile | null> {
  const normalizedEmail =
    email.trim().toLowerCase();

  const existingProfileResult =
    await supabaseAdmin
      .from("profiles")
      .select(
        `
          id,
          email,
          full_name
        `,
      )
      .ilike(
        "email",
        normalizedEmail,
      )
      .limit(1)
      .maybeSingle();

  if (
    existingProfileResult.error
  ) {
    console.error(
      "[Lastlink] Erro ao procurar perfil:",
      existingProfileResult.error,
    );

    return null;
  }

  if (
    existingProfileResult.data
  ) {
    return existingProfileResult.data;
  }

  const existingAuthUser =
    await findAuthUserByEmail(
      supabaseAdmin,
      normalizedEmail,
    );

  if (
    existingAuthUser
  ) {
    return createBuyerProfile({
      supabaseAdmin,

      userId:
        existingAuthUser.id,

      email:
        normalizedEmail,

      fullName,
    });
  }

  const defaultPassword =
    process.env
      .DEFAULT_USER_PASSWORD
      ?.trim();

  if (
    !defaultPassword ||
    defaultPassword.length < 8
  ) {
    console.error(
      "[Lastlink] DEFAULT_USER_PASSWORD ausente ou inválida.",
    );

    return null;
  }

  const authResult =
    await supabaseAdmin
      .auth.admin.createUser({
        email:
          normalizedEmail,

        password:
          defaultPassword,

        email_confirm:
          true,

        user_metadata: {
          full_name:
            fullName ??
            normalizedEmail.split(
              "@",
            )[0],

          source:
            "lastlink",

          must_change_password:
            true,
        },
      });

  if (
    authResult.error ||
    !authResult.data?.user
  ) {
    console.error(
      "[Lastlink] Erro ao criar usuário:",
      authResult.error,
    );

    const userAfterError =
      await findAuthUserByEmail(
        supabaseAdmin,
        normalizedEmail,
      );

    if (
      !userAfterError
    ) {
      return null;
    }

    return createBuyerProfile({
      supabaseAdmin,

      userId:
        userAfterError.id,

      email:
        normalizedEmail,

      fullName,
    });
  }

  console.log(
    "[Lastlink] Usuário criado automaticamente:",
    {
      userId:
        authResult.data.user.id,

      email:
        normalizedEmail,
    },
  );

  return createBuyerProfile({
    supabaseAdmin,

    userId:
      authResult.data.user.id,

    email:
      normalizedEmail,

    fullName,
  });
}

async function createBuyerProfile({
  supabaseAdmin,
  userId,
  email,
  fullName,
}: {
  supabaseAdmin: any;
  userId: string;
  email: string;
  fullName: string | null;
}): Promise<BuyerProfile | null> {
  const now =
    new Date().toISOString();

  const profileResult =
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id:
            userId,

          email,

          full_name:
            fullName ??
            email.split("@")[0],

          updated_at:
            now,
        },
        {
          onConflict:
            "id",
        },
      )
      .select(
        `
          id,
          email,
          full_name
        `,
      )
      .single();

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    console.error(
      "[Lastlink] Erro ao criar perfil:",
      profileResult.error,
    );

    return null;
  }

  await ensureUserRole(
    supabaseAdmin,
    userId,
  );

  return profileResult.data;
}

async function findAuthUserByEmail(
  supabaseAdmin: any,
  email: string,
): Promise<AuthUserSummary | null> {
  const normalizedEmail =
    email.trim().toLowerCase();

  const perPage =
    200;

  for (
    let page = 1;
    page <= 20;
    page += 1
  ) {
    const result =
      await supabaseAdmin
        .auth.admin.listUsers({
          page,
          perPage,
        });

    if (
      result.error
    ) {
      console.error(
        "[Lastlink] Erro ao consultar Auth:",
        result.error,
      );

      return null;
    }

    const user =
      result.data.users.find(
        (
          candidate: {
            id: string;
            email?: string;
          },
        ) =>
          candidate.email
            ?.trim()
            .toLowerCase() ===
          normalizedEmail,
      );

    if (
      user
    ) {
      return {
        id:
          user.id,

        email:
          user.email,
      };
    }

    if (
      result.data.users.length <
      perPage
    ) {
      break;
    }
  }

  return null;
}

function resolveSubscriptionStatus(
  event: string,
): SubscriptionStatus | null {
  if (
    ACTIVATE_EVENTS.has(
      event,
    )
  ) {
    return "active";
  }

  if (
    PAST_DUE_EVENTS.has(
      event,
    )
  ) {
    return "past_due";
  }

  if (
    CANCEL_EVENTS.has(
      event,
    )
  ) {
    return "cancelled";
  }

  if (
    EXPIRE_EVENTS.has(
      event,
    )
  ) {
    return "expired";
  }

  return null;
}

function resolvePaymentStatus(
  event: string,
): PaymentStatus | null {
  if (
    ACTIVATE_EVENTS.has(
      event,
    )
  ) {
    return "paid";
  }

  if (
    event ===
      "Purchase_Refund" ||
    event ===
      "Payment_Refund"
  ) {
    return "refunded";
  }

  if (
    event ===
      "Purchase_Request_Chargeback" ||
    event ===
      "Payment_Chargeback"
  ) {
    return "chargeback";
  }

  if (
    PAST_DUE_EVENTS.has(
      event,
    )
  ) {
    return "failed";
  }

  return null;
}

async function ensureUserRole(
  supabaseAdmin: any,
  userId: string,
): Promise<void> {
  const roleResult =
    await supabaseAdmin
      .from("user_roles")
      .select(
        `
          id,
          role
        `,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    roleResult.error
  ) {
    console.error(
      "[Lastlink] Erro ao consultar papel:",
      roleResult.error,
    );

    return;
  }

  if (
    roleResult.data
  ) {
    return;
  }

  const insertResult =
    await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id:
          userId,

        role:
          "user",
      });

  if (
    insertResult.error
  ) {
    console.error(
      "[Lastlink] Erro ao criar papel:",
      insertResult.error,
    );
  }
}

async function savePayment({
  supabaseAdmin,
  transactionId,
  userId,
  subscriptionId,
  status,
  amount,
  paymentMethod,
  paidAt,
  now,
}: {
  supabaseAdmin: any;
  transactionId: string;
  userId: string;
  subscriptionId: string;
  status: PaymentStatus;
  amount: number | null;
  paymentMethod: string | null;
  paidAt: string | null;
  now: string;
}): Promise<void> {
  const existingPaymentResult =
    await supabaseAdmin
      .from("payments")
      .select("id")
      .eq(
        "gateway",
        "lastlink",
      )
      .eq(
        "transaction_id",
        transactionId,
      )
      .limit(1)
      .maybeSingle();

  if (
    existingPaymentResult.error
  ) {
    console.error(
      "[Lastlink] Erro ao consultar pagamento:",
      existingPaymentResult.error,
    );

    return;
  }

  const paymentData = {
    user_id:
      userId,

    subscription_id:
      subscriptionId,

    amount,

    status,

    payment_method:
      paymentMethod,

    gateway:
      "lastlink",

    transaction_id:
      transactionId,

    paid_at:
      paidAt,
  };

  if (
    existingPaymentResult.data
  ) {
    const updateResult =
      await supabaseAdmin
        .from("payments")
        .update(
          paymentData,
        )
        .eq(
          "id",
          existingPaymentResult
            .data.id,
        );

    if (
      updateResult.error
    ) {
      console.error(
        "[Lastlink] Erro ao atualizar pagamento:",
        updateResult.error,
      );
    }

    return;
  }

  const insertResult =
    await supabaseAdmin
      .from("payments")
      .insert({
        ...paymentData,

        created_at:
          now,
      });

  if (
    insertResult.error
  ) {
    console.error(
      "[Lastlink] Erro ao criar pagamento:",
      insertResult.error,
    );
  }
}

function getFirstString(
  values: unknown[],
): string | undefined {
  for (
    const value of values
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }

    if (
      typeof value ===
        "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return undefined;
}

function getFirstNumber(
  values: unknown[],
): number | null {
  for (
    const value of values
  ) {
    if (
      typeof value ===
        "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value ===
        "string"
    ) {
      const cleaned =
        value
          .trim()
          .replace(
            /[^\d,.-]/g,
            "",
          );

      const normalized =
        cleaned.includes(",") &&
        cleaned.includes(".")
          ? cleaned
              .replace(
                /\./g,
                "",
              )
              .replace(
                ",",
                ".",
              )
          : cleaned.replace(
              ",",
              ".",
            );

      const parsed =
        Number(
          normalized,
        );

      if (
        Number.isFinite(
          parsed,
        )
      ) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeDate(
  value?: string,
): string | null {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}
