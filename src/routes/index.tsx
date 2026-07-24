import { HeroSection } from "@/components/landing/hero-section";
import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Download,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";

import {
  getStoredAttribution,
  trackMetaEvent,
} from "@/components/PixelTracker";
import { Marcas } from "@/components/landing/marcas";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { TestimonialsSection2 } from "@/components/landing/testimonials-section-2";
export const Route =
  createFileRoute("/")({
    head: () => ({
      meta: [
        {
          title:
            "Manual Stock — Biblioteca técnica premium para motocicletas",
        },
        {
          name: "description",
          content:
            "Manuais de serviço, esquemas elétricos, injeção eletrônica e catálogos de peças de todas as marcas. Pesquisa instantânea, downloads ilimitados.",
        },
        {
          property: "og:title",
          content: "Manual Stock",
        },
        {
          property: "og:description",
          content:
            "A maior biblioteca técnica para motocicletas do Brasil.",
        },
      ],
    }),

    component: Landing,
  });

const BRANDS = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "BMW",
  "Ducati",
  "Triumph",
  "KTM",
  "Harley-Davidson",
  "Royal Enfield",
  "CFMoto",
  "Dafra",
  "Bajaj",
  "Shineray",
  "Haojue",
];

const FEATURES = [
  {
    icon: Search,
    title: "Pesquisa instantânea",
    desc:
      "Encontre por marca, modelo, ano, cilindrada, ECU ou tags em milissegundos.",
  },
  {
    icon: BookOpen,
    title: "Biblioteca completa",
    desc:
      "Manuais de serviço, catálogos de peças, esquemas elétricos e injeção eletrônica.",
  },
  {
    icon: Download,
    title: "Downloads ilimitados",
    desc:
      "Baixe quantos manuais precisar. Sem limite diário, sem espera.",
  },
  {
    icon: Cpu,
    title: "Atualizações contínuas",
    desc:
      "Novos manuais e boletins técnicos adicionados toda semana.",
  },
  {
    icon: ShieldCheck,
    title: "Arquivos seguros",
    desc:
      "Nada de links públicos: entregamos direto para você, autenticado.",
  },
  {
    icon: Sparkles,
    title: "Favoritos e histórico",
    desc:
      "Organize seus manuais e volte de onde parou.",
  },
];

const AUDIENCE = [
  "Mecânicos de moto",
  "Oficinas",
  "Eletricistas",
  "Preparadores",
  "Proprietários",
  "Lojas especializadas",
];

const TRACKING_KEYS = [
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

type TrackingKey =
  (typeof TRACKING_KEYS)[number];

type TrackingSearch = Partial<
  Record<
    TrackingKey,
    string
  >
>;

type AuthSearch =
  TrackingSearch & {
    mode:
      | "login"
      | "signup";
  };

type ExtendedAttribution = Partial<
  Record<
    TrackingKey,
    string
  >
> & {
  landing_page: string;
  landing_path: string;
  referrer: string | null;
  captured_at: string;
  first_captured_at: string;
};

const EXTENDED_ATTRIBUTION_KEY =
  "manual-stock:extended-attribution";

const FIRST_LANDING_KEY =
  "manual-stock:first-landing";

const FIRST_REFERRER_KEY =
  "manual-stock:first-referrer";

function Landing() {
  const trackedLandingRef =
    useRef(false);

  /*
   * Login mantém mode=signin.
   */
  const signinSearch =
    getAuthSearch(
      "login",
    );

  /*
   * Os botões de assinatura levam para /assinatura
   * preservando UTMs e identificadores.
   */
  const subscriptionSearch =
    getTrackingSearch();

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    captureLandingAttribution();

    if (
      trackedLandingRef.current
    ) {
      return;
    }

    trackedLandingRef.current =
      true;

    const attribution =
      getCombinedAttribution();

    void trackMetaEvent(
      "ViewContent",
      {
        content_name:
          "Landing Page Manual Stock",

        content_category:
          "Página de vendas",

        content_type:
          "product_group",

        page_type:
          "landing_page",

        product:
          "Manual Stock Pro",

        ...attribution,
      },
    );
  }, []);

  async function handleSubscriptionClick(
    ctaName: string,
    position: string,
  ) {
    const attribution =
      getCombinedAttribution();

    await trackMetaEvent(
      "ViewContent",
      {
        content_name:
          ctaName,

        content_category:
          "Planos e assinatura",

        content_type:
          "product_group",

        cta_name:
          ctaName,

        cta_position:
          position,

        destination:
          buildTrackingDestination(
            "/planos",
            subscriptionSearch,
          ),

        action:
          "view_subscription_plans",

        ...attribution,
      },
    );
  }

  async function handleSigninClick(
    ctaName: string,
    position: string,
  ) {
    const attribution =
      getCombinedAttribution();

    await trackMetaEvent(
      "ViewContent",
      {
        content_name:
          ctaName,

        content_category:
          "Login",

        cta_name:
          ctaName,

        cta_position:
          position,

        destination:
          buildTrackingDestination(
            "/auth",
            signinSearch,
          ),

        action:
          "signin",

        ...attribution,
      },
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection
        plansSearch={subscriptionSearch}
        loginSearch={signinSearch}
        onPlansClick={handleSubscriptionClick}
        onLoginClick={handleSigninClick}
      />

      <Marcas />
      <TestimonialsSection />
      <TestimonialsSection2 />

      {/* Recursos */}
      <section
        id="recursos"
        className="py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Feito para trabalhar rápido.
            </h2>

            <p className="mt-4 text-muted-foreground">
              Uma plataforma pensada de ponta a ponta para quem depende de
              informação técnica precisa, todos os dias.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(
              (
                feature,
                index,
              ) => {
                const Icon =
                  feature.icon;

                return (
                  <motion.div
                    key={
                      feature.title
                    }
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                      margin: "-80px",
                    }}
                    transition={{
                      duration: 0.5,
                      delay:
                        index *
                        0.05,
                    }}
                    className="group rounded-3xl border border-border bg-card p-8 transition hover:border-primary/40 hover:bg-card/80"
                  >
                    <div className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:glow-soft">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="text-lg font-semibold tracking-tight">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.desc}
                    </p>
                  </motion.div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        id="planos"
        className="pb-32"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            whileInView={{
              opacity: 1,
              scale: 1,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
            }}
            className="relative overflow-hidden rounded-[32px] border border-border bg-card p-8 text-center sm:p-10 md:p-16"
          >
            <div className="absolute inset-0 bg-hero opacity-70" />

            <div className="relative">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
                <Zap className="h-3 w-3" />

                Manual Stock Pro
              </div>

              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Biblioteca completa por uma
                <br className="hidden sm:block" />
                assinatura simples.
              </h2>

              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Downloads ilimitados, pesquisa instantânea, favoritos,
                histórico e suporte. Cancele quando quiser.
              </p>

              <div className="mt-10">
                <Link
                  to="/planos"
                  search={
                    subscriptionSearch as any
                  }
                  onClick={() =>
                    void handleSubscriptionClick(
                      "Assinar agora",
                      "cta_final",
                    )
                  }
                  className="glow inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Assinar agora

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/20 text-primary">
              <Wrench className="h-3 w-3" />
            </div>

            <span>
              ©{" "}
              {new Date().getFullYear()}{" "}
              Manual Stock
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/auth"
              search={
                signinSearch as any
              }
              onClick={() =>
                void handleSigninClick(
                  "Entrar",
                  "footer",
                )
              }
              className="transition hover:text-foreground"
            >
              Entrar
            </Link>

            <a
              href="#planos"
              className="transition hover:text-foreground"
            >
              Planos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getAuthSearch(
  mode:
    | "login"
    | "signup",
): AuthSearch {
  return {
    ...getTrackingSearch(),
    mode,
  };
}

function getTrackingSearch(): TrackingSearch {
  const search: TrackingSearch =
    {};

  if (
    typeof window ===
    "undefined"
  ) {
    return search;
  }

  const currentParams =
    new URLSearchParams(
      window.location.search,
    );

  const storedAttribution =
    readExtendedAttribution();

  const pixelAttribution =
    getStoredAttribution();

  const lastTouch =
    pixelAttribution
      ?.lastTouch;

  for (
    const key of
    TRACKING_KEYS
  ) {
    const currentValue =
      normalizeTrackingValue(
        currentParams.get(
          key,
        ),
      );

    const extendedValue =
      normalizeTrackingValue(
        storedAttribution?.[
          key
        ] ??
        null,
      );

    const storedValue =
      readStorageValue(
        `manual-stock:tracking:${key}`,
      );

    const pixelValue =
      getPixelTrackingValue(
        key,
        lastTouch,
      );

    const value =
      currentValue ??
      extendedValue ??
      storedValue ??
      pixelValue;

    if (value) {
      search[key] =
        value;
    }
  }

  return search;
}

function getPixelTrackingValue(
  key: TrackingKey,
  lastTouch:
    | NonNullable<
        ReturnType<
          typeof getStoredAttribution
        >
      >["lastTouch"]
    | undefined,
): string | null {
  if (!lastTouch) {
    return null;
  }

  switch (key) {
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

function buildTrackingDestination(
  pathname: string,
  search:
    | TrackingSearch
    | AuthSearch,
): string {
  const params =
    new URLSearchParams();

  for (
    const [
      key,
      value,
    ] of Object.entries(
      search,
    )
  ) {
    if (value) {
      params.set(
        key,
        value,
      );
    }
  }

  const query =
    params.toString();

  return query
    ? `${pathname}?${query}`
    : pathname;
}

function captureLandingAttribution(): ExtendedAttribution {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      landing_page: "",
      landing_path: "",
      referrer: null,
      captured_at: "",
      first_captured_at: "",
    };
  }

  const now =
    new Date().toISOString();

  const params =
    new URLSearchParams(
      window.location.search,
    );

  const currentTracking: Partial<
    Record<
      TrackingKey,
      string
    >
  > = {};

  for (
    const key of
    TRACKING_KEYS
  ) {
    const value =
      normalizeTrackingValue(
        params.get(
          key,
        ),
      );

    if (value) {
      currentTracking[key] =
        value;

      try {
        window.localStorage.setItem(
          `manual-stock:tracking:${key}`,
          value,
        );
      } catch {
        // O tracking continua sem localStorage.
      }
    }
  }

  const existing =
    readExtendedAttribution();

  const firstLanding =
    readStorageValue(
      FIRST_LANDING_KEY,
    ) ??
    sanitizeUrl(
      window.location.href,
    );

  const firstReferrer =
    readStorageValue(
      FIRST_REFERRER_KEY,
    ) ??
    document.referrer ??
    "";

  try {
    if (
      !readStorageValue(
        FIRST_LANDING_KEY,
      )
    ) {
      window.localStorage.setItem(
        FIRST_LANDING_KEY,
        firstLanding,
      );
    }

    if (
      !readStorageValue(
        FIRST_REFERRER_KEY,
      )
    ) {
      window.localStorage.setItem(
        FIRST_REFERRER_KEY,
        firstReferrer,
      );
    }
  } catch {
    // Ignora bloqueios de storage.
  }

  const attribution: ExtendedAttribution =
    {
      ...existing,

      ...currentTracking,

      landing_page:
        sanitizeUrl(
          window.location.href,
        ),

      landing_path:
        `${window.location.pathname}${window.location.search}`,

      referrer:
        document.referrer ||
        existing?.referrer ||
        null,

      captured_at:
        now,

      first_captured_at:
        existing
          ?.first_captured_at ??
        now,
    };

  try {
    window.localStorage.setItem(
      EXTENDED_ATTRIBUTION_KEY,
      JSON.stringify(
        attribution,
      ),
    );
  } catch {
    // O tracking continua sem persistência.
  }

  return attribution;
}

function getCombinedAttribution(): Record<
  string,
  unknown
> {
  const extended =
    readExtendedAttribution();

  const pixelAttribution =
    getStoredAttribution();

  const firstTouch =
    pixelAttribution
      ?.firstTouch;

  const lastTouch =
    pixelAttribution
      ?.lastTouch;

  return cleanObject({
    ...extended,

    first_utm_source:
      firstTouch
        ?.utm_source,

    first_utm_medium:
      firstTouch
        ?.utm_medium,

    first_utm_campaign:
      firstTouch
        ?.utm_campaign,

    first_utm_content:
      firstTouch
        ?.utm_content,

    first_landing_page:
      firstTouch
        ?.landing_page,

    last_utm_source:
      lastTouch
        ?.utm_source,

    last_utm_medium:
      lastTouch
        ?.utm_medium,

    last_utm_campaign:
      lastTouch
        ?.utm_campaign,

    last_utm_content:
      lastTouch
        ?.utm_content,

    fbp:
      lastTouch?.fbp,

    fbc:
      lastTouch?.fbc,
  });
}

function readExtendedAttribution():
  | ExtendedAttribution
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const value =
      window.localStorage.getItem(
        EXTENDED_ATTRIBUTION_KEY,
      );

    if (!value) {
      return null;
    }

    return JSON.parse(
      value,
    ) as ExtendedAttribution;
  } catch {
    return null;
  }
}

function readStorageValue(
  key: string,
): string | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    return window.localStorage.getItem(
      key,
    );
  } catch {
    return null;
  }
}

function normalizeTrackingValue(
  value:
    | string
    | null,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        500,
      );

  return normalized ||
    null;
}

function sanitizeUrl(
  value: string,
): string {
  try {
    const url =
      new URL(
        value,
      );

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

    for (
      const parameter of
      sensitiveParameters
    ) {
      url.searchParams.delete(
        parameter,
      );
    }

    return url.toString();
  } catch {
    return value;
  }
}

function cleanObject(
  input: Record<
    string,
    unknown
  >,
): Record<
  string,
  unknown
> {
  return Object.fromEntries(
    Object.entries(
      input,
    ).filter(
      ([, value]) =>
        value !==
          null &&
        value !==
          undefined &&
        value !==
          "",
    ),
  );
}