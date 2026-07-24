
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  getStoredAttribution,
  trackMetaEvent,
} from "@/components/PixelTracker";

type SubscriptionPlan = {
  id: "mensal" | "trimestral" | "anual";
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

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      {
        title: "Assinatura — Manual Stock",
      },
      {
        name: "description",
        content:
          "Escolha seu plano do Manual Stock e tenha acesso à biblioteca completa de manuais técnicos para motocicletas.",
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
    name: "Plano Mensal",
    description: "Acesso completo com cobrança mensal.",
    price: "R$ 39,90",
    priceValue: 39.9,
    priceDetail: "por mês",
    billingPeriod: "1 mês de acesso",
    billingMonths: 1,
    checkoutUrl:
      import.meta.env.VITE_LASTLINK_CHECKOUT_MENSAL ?? "",
  },
  {
    id: "trimestral",
    name: "Plano Trimestral",
    description: "Economize escolhendo três meses de acesso.",
    price: "R$ 89,90",
    priceValue: 89.9,
    priceDetail: "a cada 3 meses",
    billingPeriod: "3 meses de acesso",
    billingMonths: 3,
    badge: "Mais escolhido",
    highlighted: true,
    checkoutUrl:
      import.meta.env.VITE_LASTLINK_CHECKOUT_TRIMESTRAL ?? "",
  },
  {
    id: "anual",
    name: "Plano Anual",
    description:
      "O melhor custo-benefício para acesso contínuo.",
    price: "R$ 297,00",
    priceValue: 297,
    priceDetail: "por ano",
    billingPeriod: "1 ano de acesso",
    billingMonths: 12,
    badge: "Maior economia",
    checkoutUrl:
      import.meta.env.VITE_LASTLINK_CHECKOUT_ANUAL ?? "",
  },
];

const TRACKING_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "utm_source_platform",
  "utm_marketing_tactic",
  "utm_creative_format",
  "utm_campaign_id",
  "utm_adset_id",
  "utm_ad_id",
  "campaign_id",
  "adset_id",
  "ad_id",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ttclid",
  "twclid",
  "li_fat_id",
  "ref",
  "af",
] as const;

function Subscription() {
  const pageViewTrackedRef = useRef(false);

  useEffect(() => {
    if (pageViewTrackedRef.current) {
      return;
    }

    pageViewTrackedRef.current = true;

    void trackMetaEvent("ViewContent", {
      content_name: "Página pública de assinatura",
      content_category: "Assinatura",
      content_type: "product_group",
      content_ids: PLANS.map((plan) => plan.id),
      currency: "BRL",
      page_type: "public_subscription",
    });
  }, []);

  async function handleCheckout(plan: SubscriptionPlan) {
    if (!plan.checkoutUrl) {
      console.error(
        `[Assinatura pública] Checkout do plano ${plan.id} não configurado.`,
      );

      toast.error(
        `O checkout do ${plan.name} ainda não foi configurado.`,
      );

      return;
    }

    try {
      const checkoutUrl = buildCheckoutUrl(
        plan.checkoutUrl,
        plan,
      );

      await trackMetaEvent("InitiateCheckout", {
        content_name: plan.name,
        content_category: "Assinatura Manual Stock",
        content_type: "product",
        content_ids: [plan.id],
        value: plan.priceValue,
        currency: "BRL",
        plan_id: plan.id,
        billing_period: plan.billingPeriod,
        billing_months: plan.billingMonths,
        gateway: "lastlink",
        source_page: "public_subscription",
        checkout_url: sanitizeCheckoutUrl(checkoutUrl),
      });

      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error(
        "[Assinatura pública] Erro ao abrir checkout:",
        error,
      );

      toast.error("Não foi possível abrir o checkout.");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Zap className="h-3 w-3" />
            Manual Stock Pro
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
            Escolha seu plano
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Tenha acesso completo à biblioteca de manuais,
            diagramas, catálogos e materiais técnicos.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <motion.article
              key={plan.id}
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.08,
              }}
              className={`relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border p-6 md:p-7 ${
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

              <div className="min-w-0 pr-24">
                <p className="truncate text-xs uppercase tracking-wider text-primary">
                  {plan.billingPeriod}
                </p>

                <h2 className="mt-2 truncate text-2xl font-semibold">
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
                {BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" />
                    </span>

                    <span className="text-muted-foreground">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  void handleCheckout(plan);
                }}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium transition ${
                  plan.highlighted
                    ? "glow bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                Escolher plano
                <ExternalLink className="h-4 w-4" />
              </button>
            </motion.article>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card/60 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>
              <p className="text-sm font-medium">
                Pagamento seguro pela Lastlink
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Após a confirmação do pagamento, o sistema cria seu acesso
                e libera sua assinatura automaticamente.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Já possui acesso?{" "}
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="font-medium text-primary transition hover:opacity-80"
          >
            Entrar na plataforma
          </Link>
        </p>
      </div>
    </main>
  );
}

function buildCheckoutUrl(
  checkoutUrl: string,
  plan: SubscriptionPlan,
): string {
  const url = new URL(checkoutUrl);
  const currentParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const storedAttribution = getStoredAttribution();
  const lastTouch = storedAttribution?.lastTouch;

  for (const parameter of TRACKING_PARAMETERS) {
    const currentValue = normalizeTrackingValue(
      currentParams.get(parameter),
    );

    const storedValue = readStoredTrackingValue(parameter);

    const pixelValue = getPixelAttributionValue(
      parameter,
      lastTouch,
    );

    const value =
      currentValue ??
      storedValue ??
      pixelValue;

    if (value) {
      url.searchParams.set(parameter, value);
    }
  }

  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "manual-stock");
  }

  if (!url.searchParams.has("utm_medium")) {
    url.searchParams.set("utm_medium", "assinatura");
  }

  if (!url.searchParams.has("utm_campaign")) {
    url.searchParams.set(
      "utm_campaign",
      `checkout-${plan.id}`,
    );
  }

  if (!url.searchParams.has("utm_content")) {
    url.searchParams.set("utm_content", plan.id);
  }

  url.searchParams.set("plan", plan.id);
  url.searchParams.set("plan_name", plan.name);
  url.searchParams.set(
    "plan_value",
    String(plan.priceValue),
  );
  url.searchParams.set("currency", "BRL");

  return url.toString();
}

function getPixelAttributionValue(
  parameter: (typeof TRACKING_PARAMETERS)[number],
  lastTouch:
    | NonNullable<
        ReturnType<typeof getStoredAttribution>
      >["lastTouch"]
    | undefined,
): string | null {
  if (!lastTouch) {
    return null;
  }

  switch (parameter) {
    case "utm_source":
      return lastTouch.utm_source;

    case "utm_medium":
      return lastTouch.utm_medium;

    case "utm_campaign":
      return lastTouch.utm_campaign;

    case "utm_id":
      return lastTouch.utm_id;

    case "utm_term":
      return lastTouch.utm_term;

    case "utm_content":
      return lastTouch.utm_content;

    case "fbclid":
      return lastTouch.fbclid;

    case "gclid":
      return lastTouch.gclid;

    case "msclkid":
      return lastTouch.msclkid;

    case "ref":
      return lastTouch.ref;

    case "af":
      return lastTouch.af;

    default:
      return null;
  }
}

function readStoredTrackingValue(
  parameter: string,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return normalizeTrackingValue(
      window.localStorage.getItem(
        `manual-stock:tracking:${parameter}`,
      ),
    );
  } catch {
    return null;
  }
}

function normalizeTrackingValue(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .slice(0, 500);

  return normalized || null;
}

function sanitizeCheckoutUrl(
  value: string,
): string {
  try {
    const url = new URL(value);

    const sensitiveParameters = [
      "email",
      "name",
      "phone",
      "cpf",
      "password",
      "token",
      "access_token",
      "refresh_token",
      "code",
    ];

    for (const parameter of sensitiveParameters) {
      url.searchParams.delete(parameter);
    }

    return url.toString();
  } catch {
    return "";
  }
}
