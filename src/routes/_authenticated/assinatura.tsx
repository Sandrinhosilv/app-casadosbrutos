import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";

import { getDashboardOverview } from "@/lib/manuals.functions";
import {
  getStoredAttribution,
  trackMetaEvent,
} from "@/components/PixelTracker";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

type UserProfile = {
  full_name?: string | null;
  email?: string | null;
};

type SubscriptionPlanInfo = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  billing_cycle?: string | null;
};

type UserSubscription = {
  id?: string;
  status?: SubscriptionStatus | null;
  started_at?: string | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
  gateway?: string | null;
  plan_id?: string | null;

  plans?:
    | SubscriptionPlanInfo
    | SubscriptionPlanInfo[]
    | null;
};

type SubscriptionPlan = {
  id:
    | "mensal"
    | "trimestral"
    | "anual";

  name: string;
  description: string;

  price: string;
  priceValue: number;

  priceDetail: string;
  billingPeriod: string;
  billingMonths: number;

  badge?: string;
  highlighted?: boolean;

  checkoutUrl: string;
};

export const Route = createFileRoute(
  "/_authenticated/assinatura",
)({
  head: () => ({
    meta: [
      {
        title:
          "Assinatura — Casa dos Brutos",
      },
    ],
  }),

  component: Subscription,
});

const BENEFITS = [
  "Biblioteca completa de manuais",
  "Atualizações frequentes",
  "Downloads ilimitados",
  "Pesquisa inteligente",
  "Favoritos e histórico",
  "Suporte prioritário",
];

const PLANS: SubscriptionPlan[] = [
  {
    id: "mensal",

    name:
      "Plano Mensal",

    description:
      "Acesso completo com cobrança mensal.",

    price:
      "R$ 39,90",

    priceValue:
      39.9,

    priceDetail:
      "por mês",

    billingPeriod:
      "1 mês de acesso",

    billingMonths:
      1,

    checkoutUrl:
      import.meta.env
        .VITE_LASTLINK_CHECKOUT_MENSAL ??
      "",
  },

  {
    id:
      "trimestral",

    name:
      "Plano Trimestral",

    description:
      "Economize escolhendo três meses de acesso.",

    price:
      "R$ 89,90",

    priceValue:
      89.9,

    priceDetail:
      "a cada 3 meses",

    billingPeriod:
      "3 meses de acesso",

    billingMonths:
      3,

    badge:
      "Mais escolhido",

    highlighted:
      true,

    checkoutUrl:
      import.meta.env
        .VITE_LASTLINK_CHECKOUT_TRIMESTRAL ??
      "",
  },

  {
    id: "anual",

    name:
      "Plano Anual",

    description:
      "O melhor custo-benefício para acesso contínuo.",

    price:
      "R$ 297,00",

    priceValue:
      297,

    priceDetail:
      "por ano",

    billingPeriod:
      "1 ano de acesso",

    billingMonths:
      12,

    badge:
      "Maior economia",

    checkoutUrl:
      import.meta.env
        .VITE_LASTLINK_CHECKOUT_ANUAL ??
      "",
  },
];

const TRACKING_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
  "af",
] as const;

function Subscription() {
  const pageViewTrackedRef =
    useRef(false);

  const fetchOverview =
    useServerFn(
      getDashboardOverview,
    );

  const overviewQuery =
    useQuery({
      queryKey: [
        "dashboard-overview",
      ],

      queryFn: () =>
        fetchOverview(),

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  useEffect(() => {
    if (
      pageViewTrackedRef.current
    ) {
      return;
    }

    pageViewTrackedRef.current =
      true;

    void trackMetaEvent(
      "ViewContent",
      {
        content_name:
          "Página de assinatura",

        content_category:
          "Assinatura",

        content_type:
          "product_group",

        content_ids:
          PLANS.map(
            (plan) =>
              plan.id,
          ),

        currency:
          "BRL",
      },
    );
  }, []);

  if (
    overviewQuery.isLoading
  ) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />

          Carregando assinatura...
        </div>
      </div>
    );
  }

  if (
    overviewQuery.isError
  ) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div>
              <h1 className="font-semibold text-destructive">
                Não foi possível carregar sua assinatura
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                {getErrorMessage(
                  overviewQuery.error,
                  "Ocorreu um erro inesperado.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profile =
    overviewQuery.data
      ?.profile as
      | UserProfile
      | null;

  const subscription =
    overviewQuery.data
      ?.subscription as
      | UserSubscription
      | null;

  const active =
    hasActiveSubscription(
      subscription,
    );

  const statusLabel =
    getStatusLabel(
      subscription?.status,
    );

  async function handleCheckout(
    plan: SubscriptionPlan,
  ) {
    if (
      !plan.checkoutUrl
    ) {
      console.error(
        `[Assinatura] Checkout do plano ${plan.id} não configurado.`,
      );

      toast.error(
        `O checkout do ${plan.name} ainda não foi configurado.`,
      );

      return;
    }

    try {
      const checkoutUrl =
        buildCheckoutUrl(
          plan.checkoutUrl,
          profile,
          plan,
        );

      await trackMetaEvent(
        "InitiateCheckout",
        {
          content_name:
            plan.name,

          content_category:
            "Assinatura Manual Stock",

          content_type:
            "product",

          content_ids: [
            plan.id,
          ],

          value:
            plan.priceValue,

          currency:
            "BRL",

          plan_id:
            plan.id,

          billing_period:
            plan.billingPeriod,

          billing_months:
            plan.billingMonths,

          subscription_status:
            subscription?.status ??
            "none",

          gateway:
            "lastlink",

          checkout_url:
            sanitizeCheckoutUrl(
              checkoutUrl,
            ),
        },
      );

      window.location.assign(
        checkoutUrl,
      );
    } catch (error) {
      console.error(
        "[Assinatura] Erro ao abrir checkout:",
        error,
      );

      toast.error(
        "Não foi possível abrir o checkout.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="mx-auto max-w-3xl text-center">
        

        <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
          Escolha seu plano
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          Tenha acesso completo à biblioteca de manuais,
          diagramas, catálogos e materiais técnicos.
        </p>
      </div>

      {subscription && (
        <SubscriptionStatusCard
          subscription={
            subscription
          }
          active={
            active
          }
          statusLabel={
            statusLabel
          }
        />
      )}

      {active && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6"
        >
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/15">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </span>

            <div>
              <p className="font-medium text-emerald-500">
                Seu acesso está liberado
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Você já possui uma assinatura ativa. Os planos
                abaixo continuam disponíveis para renovação ou
                troca de período.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PLANS.map(
          (
            plan,
            index,
          ) => (
            <motion.article
              key={
                plan.id
              }
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay:
                  index *
                  0.08,
              }}
              className={`relative flex flex-col overflow-hidden rounded-[28px] border p-6 md:p-7 ${
                plan.highlighted
                  ? "border-primary/50 bg-primary/5 shadow-[0_0_45px_-18px_hsl(var(--primary))]"
                  : "border-border bg-card"
              }`}
            >
              {plan.badge && (
                <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">
                  <Sparkles className="h-3 w-3" />

                  {plan.badge}
                </div>
              )}

              <div className="pr-24">
                <p className="text-xs uppercase tracking-wider text-primary">
                  {plan.billingPeriod}
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {plan.name}
                </h2>
              </div>

              <p className="mt-3 min-h-10 text-sm leading-relaxed text-muted-foreground">
                {plan.description}
              </p>

              <div className="mt-6">
                <p className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.priceDetail}
                </p>
              </div>

              <ul className="mt-7 space-y-3">
                {BENEFITS.map(
                  (
                    benefit,
                  ) => (
                    <li
                      key={
                        benefit
                      }
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-3 w-3" />
                      </span>

                      <span className="text-muted-foreground">
                        {benefit}
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <button
                type="button"
                onClick={() =>
                  void handleCheckout(
                    plan,
                  )
                }
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition ${
                  plan.highlighted
                    ? "glow bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {active
                  ? "Renovar ou trocar"
                  : "Escolher plano"}

                <ExternalLink className="h-4 w-4" />
              </button>
            </motion.article>
          ),
        )}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card/60 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <p className="text-sm font-medium">
              Pagamento seguro pela Lastlink
            </p>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Após a confirmação do pagamento, sua assinatura será
              atualizada automaticamente pelo webhook e o acesso aos
              downloads será liberado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionStatusCard({
  subscription,
  active,
  statusLabel,
}: {
  subscription: UserSubscription;
  active: boolean;
  statusLabel: string;
}) {
  const plan =
    normalizeRelation(
      subscription.plans,
    );

  const startedAt =
    parseValidDate(
      subscription.started_at,
    );

  const expiresAt =
    parseValidDate(
      subscription.expires_at,
    );

  const cancelledAt =
    parseValidDate(
      subscription.cancelled_at,
    );

  const displayedPlanName =
    getDisplayedPlanName(
      plan,
    );

  const periodMessage =
    getSubscriptionPeriodMessage({
      status:
        subscription.status,

      startedAt,

      expiresAt,

      cancelledAt,
    });

  return (
    <div
      className={`mx-auto mt-8 max-w-3xl rounded-3xl border p-6 ${
        active
          ? "glow-soft border-primary/30 bg-primary/5"
          : subscription.status ===
              "cancelled"
            ? "border-amber-500/30 bg-amber-500/5"
            : subscription.status ===
                "expired"
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs uppercase tracking-wider ${
              active
                ? "text-primary"
                : subscription.status ===
                    "cancelled"
                  ? "text-amber-500"
                  : subscription.status ===
                      "expired"
                    ? "text-destructive"
                    : "text-muted-foreground"
            }`}
          >
            {statusLabel}
          </p>

          <p className="mt-1 text-xl font-semibold">
            {displayedPlanName}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {periodMessage}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            active
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : subscription.status ===
                  "cancelled"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                : subscription.status ===
                    "expired"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {getAccessLabel(
            subscription.status,
            active,
          )}
        </span>
      </div>
    </div>
  );
}

function hasActiveSubscription(
  subscription:
    | UserSubscription
    | null
    | undefined,
): boolean {
  if (!subscription) {
    return false;
  }

  const validStatus =
    subscription.status ===
      "active" ||
    subscription.status ===
      "trial";

  if (!validStatus) {
    return false;
  }

  const expiresAt =
    parseValidDate(
      subscription.expires_at,
    );

  if (!expiresAt) {
    return true;
  }

  return (
    expiresAt.getTime() >
    Date.now()
  );
}

function getSubscriptionPeriodMessage({
  status,
  startedAt,
  expiresAt,
  cancelledAt,
}: {
  status:
    | SubscriptionStatus
    | null
    | undefined;

  startedAt:
    | Date
    | null;

  expiresAt:
    | Date
    | null;

  cancelledAt:
    | Date
    | null;
}): string {
  switch (status) {
    case "active":
      if (expiresAt) {
        return `Acesso válido até ${formatDate(
          expiresAt,
        )}`;
      }

      if (startedAt) {
        return `Acesso liberado desde ${formatDate(
          startedAt,
        )}`;
      }

      return "Acesso liberado.";

    case "trial":
      if (expiresAt) {
        return `Período de teste válido até ${formatDate(
          expiresAt,
        )}`;
      }

      if (startedAt) {
        return `Período de teste iniciado em ${formatDate(
          startedAt,
        )}`;
      }

      return "Período de teste liberado.";

    case "past_due":
      if (expiresAt) {
        return `Pagamento pendente. Período atual até ${formatDate(
          expiresAt,
        )}`;
      }

      return "O pagamento da assinatura está pendente.";

    case "cancelled":
      if (cancelledAt) {
        return `Assinatura cancelada em ${formatDate(
          cancelledAt,
        )}`;
      }

      if (expiresAt) {
        return `Acesso disponível até ${formatDate(
          expiresAt,
        )}`;
      }

      return "A assinatura foi cancelada.";

    case "expired":
      if (expiresAt) {
        return `Acesso encerrado em ${formatDate(
          expiresAt,
        )}`;
      }

      return "O período de acesso foi encerrado.";

    default:
      return "Nenhum período de assinatura disponível.";
  }
}

function getDisplayedPlanName(
  plan:
    | SubscriptionPlanInfo
    | null,
): string {
  if (
    plan?.name?.trim()
  ) {
    return plan.name.trim();
  }

  const slug =
    normalizeText(
      plan?.slug,
    );

  switch (slug) {
    case "mensal":
      return "Plano Mensal";

    case "trimestral":
      return "Plano Trimestral";

    case "anual":
      return "Plano Anual";

    default:
      return "Casa dos Brutos";
  }
}

function getAccessLabel(
  status:
    | SubscriptionStatus
    | null
    | undefined,
  active: boolean,
): string {
  if (active) {
    return "Acesso liberado";
  }

  switch (status) {
    case "cancelled":
      return "Cancelada";

    case "expired":
      return "Acesso encerrado";

    case "past_due":
      return "Pagamento pendente";

    default:
      return "Acesso bloqueado";
  }
}

function getStatusLabel(
  status?:
    | SubscriptionStatus
    | null,
): string {
  switch (status) {
    case "active":
      return "Assinatura ativa";

    case "trial":
      return "Período de teste";

    case "past_due":
      return "Pagamento pendente";

    case "cancelled":
      return "Assinatura cancelada";

    case "expired":
      return "Assinatura expirada";

    default:
      return "Sem assinatura ativa";
  }
}

function buildCheckoutUrl(
  checkoutUrl: string,
  profile:
    | UserProfile
    | null
    | undefined,
  plan: SubscriptionPlan,
): string {
  const url =
    new URL(
      checkoutUrl,
    );

  if (
    profile?.email
  ) {
    url.searchParams.set(
      "email",
      profile.email,
    );
  }

  if (
    profile?.full_name
  ) {
    url.searchParams.set(
      "name",
      profile.full_name,
    );
  }

  const storedAttribution =
    getStoredAttribution();

  const lastTouch =
    storedAttribution
      ?.lastTouch;

  for (
    const parameter of
    TRACKING_PARAMETERS
  ) {
    const currentValue =
      typeof window !==
      "undefined"
        ? new URLSearchParams(
            window.location.search,
          ).get(
            parameter,
          )
        : null;

    const storedValue =
      lastTouch?.[
        parameter
      ];

    const value =
      currentValue ??
      storedValue;

    if (value) {
      url.searchParams.set(
        parameter,
        value,
      );
    }
  }

  if (
    !url.searchParams.has(
      "utm_source",
    )
  ) {
    url.searchParams.set(
      "utm_source",
      "casa-dos-brutos",
    );
  }

  if (
    !url.searchParams.has(
      "utm_medium",
    )
  ) {
    url.searchParams.set(
      "utm_medium",
      "assinatura",
    );
  }

  if (
    !url.searchParams.has(
      "utm_campaign",
    )
  ) {
    url.searchParams.set(
      "utm_campaign",
      `checkout-${plan.id}`,
    );
  }

  if (
    !url.searchParams.has(
      "utm_content",
    )
  ) {
    url.searchParams.set(
      "utm_content",
      plan.id,
    );
  }

  url.searchParams.set(
    "plan",
    plan.id,
  );

  url.searchParams.set(
    "plan_name",
    plan.name,
  );

  url.searchParams.set(
    "plan_value",
    String(
      plan.priceValue,
    ),
  );

  url.searchParams.set(
    "currency",
    "BRL",
  );

  return url.toString();
}

function sanitizeCheckoutUrl(
  value: string,
): string {
  try {
    const url =
      new URL(
        value,
      );

    url.searchParams.delete(
      "email",
    );

    url.searchParams.delete(
      "name",
    );

    return url.toString();
  } catch {
    return "";
  }
}

function parseValidDate(
  value:
    | string
    | null
    | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatDate(
  date: Date,
): string {
  return date.toLocaleDateString(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",
    },
  );
}

function normalizeRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function normalizeText(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value
      ?.normalize(
        "NFD",
      )
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        " ",
      ) ??
    ""
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error &&
    typeof error.message ===
      "string"
  ) {
    return error.message;
  }

  return fallback;
}

