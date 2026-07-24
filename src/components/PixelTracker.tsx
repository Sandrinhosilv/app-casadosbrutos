import {
  useEffect,
  useRef,
} from "react";
import { useLocation } from "@tanstack/react-router";

type MetaPixelCommand =
  | "init"
  | "track"
  | "trackCustom";

type MetaPixelFunction = {
  (
    command: "init",
    pixelId: string,
    advancedMatching?: Record<
      string,
      string
    >,
  ): void;

  (
    command:
      | "track"
      | "trackCustom",
    eventName: string,
    parameters?: Record<
      string,
      unknown
    >,
    options?: {
      eventID?: string;
    },
  ): void;

  callMethod?: (
    ...args: unknown[]
  ) => void;

  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: (
    ...args: unknown[]
  ) => void;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
    __manualStockPixelLoaded?: boolean;
  }
}

type UtmData = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_id: string | null;
  utm_term: string | null;
  utm_content: string | null;

  fbclid: string | null;
  gclid: string | null;
  msclkid: string | null;

  ref: string | null;
  af: string | null;
};

type AttributionData = UtmData & {
  landing_page: string;
  referrer: string | null;
  first_seen_at: string;
  last_seen_at: string;

  fbp: string | null;
  fbc: string | null;
};

type StoredAttribution = {
  firstTouch: AttributionData;
  lastTouch: AttributionData;
};

type BrowserEventPayload = {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  eventTime: number;
  actionSource: "website";

  customData: Record<
    string,
    unknown
  >;

  attribution: StoredAttribution;

  browser: {
    language: string | null;
    screenWidth: number | null;
    screenHeight: number | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    userAgent: string | null;
  };
};

const PIXEL_ID =
  import.meta.env
    .VITE_META_PIXEL_ID?.trim() ??
  "";

const CAPI_ENDPOINT =
  import.meta.env
    .VITE_META_CAPI_ENDPOINT?.trim() ||
  "/api/public/tracking/meta";

const ATTRIBUTION_STORAGE_KEY =
  "manual-stock:attribution";

const SESSION_ID_STORAGE_KEY =
  "manual-stock:session-id";

const PAGE_VIEW_STORAGE_KEY =
  "manual-stock:last-page-view";

const UTM_KEYS: Array<
  keyof UtmData
> = [
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
];

/**
 * Componente global do Meta Pixel.
 *
 * Deve ser renderizado uma única vez em __root.tsx:
 *
 * <PixelTracker />
 * <Outlet />
 */
export function PixelTracker() {
  const location =
    useLocation();

  const initializedRef =
    useRef(false);

  const currentUrl =
    typeof window !==
    "undefined"
      ? window.location.href
      : `${location.pathname}${location.searchStr ?? ""}`;

  useEffect(() => {
    if (
      typeof window ===
        "undefined" ||
      !PIXEL_ID
    ) {
      return;
    }

    captureAttribution();

    initializeMetaPixel(
      PIXEL_ID,
    );

    initializedRef.current =
      true;
  }, []);

  useEffect(() => {
    if (
      typeof window ===
        "undefined" ||
      !PIXEL_ID ||
      !initializedRef.current
    ) {
      return;
    }

    const normalizedUrl =
      removeSensitiveParameters(
        currentUrl,
      );

    if (
      wasPageViewAlreadyTracked(
        normalizedUrl,
      )
    ) {
      return;
    }

    markPageViewAsTracked(
      normalizedUrl,
    );

    const eventId =
      createEventId(
        "pageview",
      );

    const attribution =
      captureAttribution();

    const customData = {
      page_title:
        document.title,

      page_path:
        window.location.pathname,

      page_url:
        normalizedUrl,

      session_id:
        getSessionId(),

      ...buildAttributionEventData(
        attribution,
      ),
    };

    trackBrowserEvent({
      eventName:
        "PageView",

      eventId,

      parameters:
        customData,
    });

    void sendServerEvent({
      eventName:
        "PageView",

      eventId,

      customData,

      attribution,
    });
  }, [
    location.pathname,
    location.searchStr,
    currentUrl,
  ]);

  return null;
}

/**
 * Dispara um evento padrão do Meta Pixel e,
 * opcionalmente, o mesmo evento pela CAPI.
 *
 * Use em outros componentes:
 *
 * trackMetaEvent("InitiateCheckout", {
 *   value: 29.9,
 *   currency: "BRL",
 *   content_name: "Plano Mensal",
 * });
 */
export async function trackMetaEvent(
  eventName: string,
  parameters: Record<
    string,
    unknown
  > = {},
  options?: {
    eventId?: string;
    sendToServer?: boolean;
  },
): Promise<string> {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const eventId =
    options?.eventId ??
    createEventId(
      eventName,
    );

  const attribution =
    captureAttribution();

  const enrichedParameters = {
    ...parameters,

    page_title:
      document.title,

    page_path:
      window.location.pathname,

    page_url:
      removeSensitiveParameters(
        window.location.href,
      ),

    session_id:
      getSessionId(),

    ...buildAttributionEventData(
      attribution,
    ),
  };

  if (PIXEL_ID) {
    initializeMetaPixel(
      PIXEL_ID,
    );

    trackBrowserEvent({
      eventName,
      eventId,
      parameters:
        enrichedParameters,
    });
  }

  if (
    options?.sendToServer !==
    false
  ) {
    await sendServerEvent({
      eventName,
      eventId,
      customData:
        enrichedParameters,
      attribution,
    });
  }

  return eventId;
}

/**
 * Dispara um evento personalizado.
 *
 * Exemplo:
 *
 * trackMetaCustomEvent("ManualDownload", {
 *   manual_id: manual.id,
 *   brand: "Honda",
 *   model: "CG 160",
 * });
 */
export async function trackMetaCustomEvent(
  eventName: string,
  parameters: Record<
    string,
    unknown
  > = {},
  options?: {
    eventId?: string;
    sendToServer?: boolean;
  },
): Promise<string> {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const eventId =
    options?.eventId ??
    createEventId(
      eventName,
    );

  const attribution =
    captureAttribution();

  const enrichedParameters = {
    ...parameters,

    page_title:
      document.title,

    page_path:
      window.location.pathname,

    page_url:
      removeSensitiveParameters(
        window.location.href,
      ),

    session_id:
      getSessionId(),

    ...buildAttributionEventData(
      attribution,
    ),
  };

  if (PIXEL_ID) {
    initializeMetaPixel(
      PIXEL_ID,
    );

    window.fbq?.(
      "trackCustom",
      eventName,
      cleanObject(
        enrichedParameters,
      ),
      {
        eventID:
          eventId,
      },
    );
  }

  if (
    options?.sendToServer !==
    false
  ) {
    await sendServerEvent({
      eventName,
      eventId,
      customData:
        enrichedParameters,
      attribution,
    });
  }

  return eventId;
}

/**
 * Retorna a atribuição atual para relatórios,
 * formulários ou integrações.
 */
export function getStoredAttribution():
  | StoredAttribution
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const raw =
    window.localStorage.getItem(
      ATTRIBUTION_STORAGE_KEY,
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(
      raw,
    ) as StoredAttribution;
  } catch {
    window.localStorage.removeItem(
      ATTRIBUTION_STORAGE_KEY,
    );

    return null;
  }
}

function initializeMetaPixel(
  pixelId: string,
) {
  if (
    typeof window ===
      "undefined" ||
    !pixelId
  ) {
    return;
  }

  if (
    window.__manualStockPixelLoaded &&
    window.fbq
  ) {
    return;
  }

  if (!window.fbq) {
    const fbq =
      function (
        ...args: unknown[]
      ) {
        if (
          fbq.callMethod
        ) {
          fbq.callMethod(
            ...args,
          );
        } else {
          fbq.queue =
            fbq.queue ?? [];

          fbq.queue.push(
            args,
          );
        }
      } as MetaPixelFunction;

    fbq.queue = [];
    fbq.loaded =
      true;
    fbq.version =
      "2.0";

    window.fbq =
      fbq;

    window._fbq =
      fbq;
  }

  const existingScript =
    document.querySelector(
      'script[data-manual-stock-meta-pixel="true"]',
    );

  if (!existingScript) {
    const script =
      document.createElement(
        "script",
      );

    script.async =
      true;

    script.src =
      "https://connect.facebook.net/en_US/fbevents.js";

    script.dataset.manualStockMetaPixel =
      "true";

    document.head.appendChild(
      script,
    );
  }

  window.fbq?.(
    "init",
    pixelId,
  );

  window.__manualStockPixelLoaded =
    true;
}

function trackBrowserEvent({
  eventName,
  eventId,
  parameters,
}: {
  eventName: string;
  eventId: string;
  parameters: Record<
    string,
    unknown
  >;
}) {
  if (
    typeof window ===
      "undefined" ||
    !window.fbq
  ) {
    return;
  }

  window.fbq(
    "track",
    eventName,
    cleanObject(
      parameters,
    ),
    {
      eventID:
        eventId,
    },
  );
}

async function sendServerEvent({
  eventName,
  eventId,
  customData,
  attribution,
}: {
  eventName: string;
  eventId: string;
  customData: Record<
    string,
    unknown
  >;
  attribution: StoredAttribution;
}) {
  if (
    typeof window ===
    "undefined" ||
    !CAPI_ENDPOINT
  ) {
    return;
  }

  const payload: BrowserEventPayload =
    {
      eventName,

      eventId,

      eventSourceUrl:
        removeSensitiveParameters(
          window.location.href,
        ),

      eventTime:
        Math.floor(
          Date.now() /
            1000,
        ),

      actionSource:
        "website",

      customData:
        cleanObject(
          customData,
        ),

      attribution,

      browser: {
        language:
          navigator.language ??
          null,

        screenWidth:
          window.screen
            ?.width ??
          null,

        screenHeight:
          window.screen
            ?.height ??
          null,

        viewportWidth:
          window.innerWidth ??
          null,

        viewportHeight:
          window.innerHeight ??
          null,

        userAgent:
          navigator.userAgent ??
          null,
      },
    };

  try {
    const response =
      await fetch(
        CAPI_ENDPOINT,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "include",

          keepalive:
            true,

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    if (!response.ok) {
      const responseText =
        await response
          .text()
          .catch(
            () => "",
          );

      console.warn(
        "[Meta CAPI] Evento não enviado:",
        {
          status:
            response.status,

          eventName,

          eventId,

          response:
            responseText,
        },
      );
    }
  } catch (error) {
    /*
     * Uma falha de tracking nunca deve quebrar
     * a experiência principal do usuário.
     */
    console.warn(
      "[Meta CAPI] Falha de rede:",
      {
        eventName,
        eventId,
        error,
      },
    );
  }
}

function captureAttribution(): StoredAttribution {
  const now =
    new Date().toISOString();

  const currentUtm =
    readUtmParameters();

  const existing =
    getStoredAttribution();

  const hasCampaignData =
    Object.values(
      currentUtm,
    ).some(Boolean);

  const currentTouch: AttributionData =
    {
      ...currentUtm,

      landing_page:
        removeSensitiveParameters(
          window.location.href,
        ),

      referrer:
        document.referrer ||
        existing
          ?.lastTouch
          ?.referrer ||
        null,

      first_seen_at:
        existing
          ?.firstTouch
          ?.first_seen_at ??
        now,

      last_seen_at:
        now,

      fbp:
        readCookie(
          "_fbp",
        ),

      fbc:
        readFbc(
          currentUtm.fbclid,
        ),
    };

  const firstTouch =
    existing?.firstTouch ??
    currentTouch;

  /*
   * Só substitui a última atribuição quando
   * chegaram novos parâmetros de campanha.
   *
   * Caso contrário, mantém a campanha anterior
   * e atualiza apenas dados de navegação.
   */
  const lastTouch =
    hasCampaignData ||
    !existing
      ? currentTouch
      : {
          ...existing.lastTouch,

          landing_page:
            currentTouch.landing_page,

          last_seen_at:
            now,

          fbp:
            currentTouch.fbp ??
            existing
              .lastTouch
              .fbp,

          fbc:
            currentTouch.fbc ??
            existing
              .lastTouch
              .fbc,
        };

  const attribution: StoredAttribution =
    {
      firstTouch,
      lastTouch,
    };

  try {
    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(
        attribution,
      ),
    );
  } catch (error) {
    console.warn(
      "[Attribution] Não foi possível salvar UTMs:",
      error,
    );
  }

  return attribution;
}

function readUtmParameters(): UtmData {
  const searchParams =
    new URLSearchParams(
      window.location.search,
    );

  const result =
    {} as UtmData;

  for (
    const key of
    UTM_KEYS
  ) {
    result[key] =
      normalizeParameter(
        searchParams.get(
          key,
        ),
      );
  }

  return result;
}

function buildAttributionEventData(
  attribution: StoredAttribution,
): Record<
  string,
  unknown
> {
  const first =
    attribution.firstTouch;

  const last =
    attribution.lastTouch;

  return cleanObject({
    utm_source:
      last.utm_source,

    utm_medium:
      last.utm_medium,

    utm_campaign:
      last.utm_campaign,

    utm_id:
      last.utm_id,

    utm_term:
      last.utm_term,

    utm_content:
      last.utm_content,

    fbclid:
      last.fbclid,

    gclid:
      last.gclid,

    msclkid:
      last.msclkid,

    ref:
      last.ref,

    af:
      last.af,

    fbp:
      last.fbp,

    fbc:
      last.fbc,

    landing_page:
      last.landing_page,

    referrer:
      last.referrer,

    first_utm_source:
      first.utm_source,

    first_utm_medium:
      first.utm_medium,

    first_utm_campaign:
      first.utm_campaign,

    first_utm_content:
      first.utm_content,

    first_landing_page:
      first.landing_page,

    first_seen_at:
      first.first_seen_at,

    last_seen_at:
      last.last_seen_at,
  });
}

function readCookie(
  name: string,
): string | null {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const prefix =
    `${encodeURIComponent(
      name,
    )}=`;

  const cookies =
    document.cookie.split(
      ";",
    );

  for (
    const cookie of
    cookies
  ) {
    const normalized =
      cookie.trim();

    if (
      normalized.startsWith(
        prefix,
      )
    ) {
      return decodeURIComponent(
        normalized.slice(
          prefix.length,
        ),
      );
    }
  }

  return null;
}

function readFbc(
  fbclid: string | null,
): string | null {
  const cookieFbc =
    readCookie(
      "_fbc",
    );

  if (cookieFbc) {
    return cookieFbc;
  }

  if (!fbclid) {
    return null;
  }

  return `fb.1.${Date.now()}.${fbclid}`;
}

function getSessionId(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const existing =
    window.sessionStorage.getItem(
      SESSION_ID_STORAGE_KEY,
    );

  if (existing) {
    return existing;
  }

  const sessionId =
    createEventId(
      "session",
    );

  window.sessionStorage.setItem(
    SESSION_ID_STORAGE_KEY,
    sessionId,
  );

  return sessionId;
}

function createEventId(
  eventName: string,
): string {
  const safeName =
    eventName
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "_",
      )
      .replace(
        /^_+|_+$/g,
        "",
      ) ||
    "event";

  const randomId =
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`;

  return `${safeName}-${randomId}`;
}

function wasPageViewAlreadyTracked(
  url: string,
): boolean {
  try {
    const raw =
      window.sessionStorage.getItem(
        PAGE_VIEW_STORAGE_KEY,
      );

    if (!raw) {
      return false;
    }

    const stored =
      JSON.parse(
        raw,
      ) as {
        url?: string;
        trackedAt?: number;
      };

    const recentlyTracked =
      typeof stored.trackedAt ===
        "number" &&
      Date.now() -
        stored.trackedAt <
        1_500;

    return (
      stored.url ===
        url &&
      recentlyTracked
    );
  } catch {
    return false;
  }
}

function markPageViewAsTracked(
  url: string,
) {
  try {
    window.sessionStorage.setItem(
      PAGE_VIEW_STORAGE_KEY,
      JSON.stringify({
        url,

        trackedAt:
          Date.now(),
      }),
    );
  } catch {
    // O tracking continua mesmo sem sessionStorage.
  }
}

function removeSensitiveParameters(
  inputUrl: string,
): string {
  try {
    const url =
      new URL(
        inputUrl,
        window.location.origin,
      );

    const sensitiveKeys = [
      "token",
      "access_token",
      "refresh_token",
      "code",
      "password",
      "email",
      "phone",
      "cpf",
      "document",
    ];

    for (
      const key of
      sensitiveKeys
    ) {
      url.searchParams.delete(
        key,
      );
    }

    return url.toString();
  } catch {
    return inputUrl;
  }
}

function normalizeParameter(
  value: string | null,
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