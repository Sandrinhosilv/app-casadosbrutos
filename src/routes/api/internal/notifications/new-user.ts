import { createFileRoute } from "@tanstack/react-router";

type SupabaseProfileRecord = {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  created_at?: string | null;
};

type SupabaseWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: SupabaseProfileRecord | null;
  old_record?: SupabaseProfileRecord | null;
};

type DirectPayload = {
  id?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  full_name?: string;
  createdAt?: string;
  created_at?: string;
  source?: string;
};

export const Route = createFileRoute(
  "/api/internal/notifications/new-user",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        /*
         * Token usado para impedir chamadas não autorizadas.
         *
         * Configure na Vercel:
         * NEW_USER_WEBHOOK_SECRET=uma_senha_forte
         *
         * No Database Webhook do Supabase, envie:
         * x-webhook-secret: uma_senha_forte
         */
        const configuredSecret =
          process.env.NEW_USER_WEBHOOK_SECRET?.trim();

        if (!configuredSecret) {
          console.error(
            "[Novo usuário] NEW_USER_WEBHOOK_SECRET não configurado.",
          );

          return jsonResponse(
            {
              ok: false,
              error: "Webhook não configurado.",
            },
            500,
          );
        }

        const requestUrl = new URL(request.url);

        const authorization =
          request.headers.get("authorization") ?? "";

        const bearerToken =
          authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : "";

        const headerSecret =
          request.headers
            .get("x-webhook-secret")
            ?.trim() ?? "";

        const querySecret =
          requestUrl.searchParams
            .get("secret")
            ?.trim() ?? "";

        const receivedSecret =
          headerSecret ||
          bearerToken ||
          querySecret;

        if (
          !receivedSecret ||
          !safeCompare(
            receivedSecret,
            configuredSecret,
          )
        ) {
          console.warn(
            "[Novo usuário] Tentativa não autorizada.",
          );

          return jsonResponse(
            {
              ok: false,
              error: "Não autorizado.",
            },
            401,
          );
        }

        let payload:
          | SupabaseWebhookPayload
          | DirectPayload;

        try {
          payload = await request.json();
        } catch {
          return jsonResponse(
            {
              ok: false,
              error: "JSON inválido.",
            },
            400,
          );
        }

        /*
         * O Supabase Database Webhook envia:
         *
         * {
         *   "type": "INSERT",
         *   "table": "profiles",
         *   "schema": "public",
         *   "record": { ... }
         * }
         *
         * Também permitimos um payload direto:
         *
         * {
         *   "userId": "...",
         *   "email": "...",
         *   "fullName": "..."
         * }
         */
        const webhookPayload =
          payload as SupabaseWebhookPayload;

        const directPayload =
          payload as DirectPayload;

        if (
          webhookPayload.type &&
          webhookPayload.type !== "INSERT"
        ) {
          console.log(
            "[Novo usuário] Evento ignorado:",
            webhookPayload.type,
          );

          return jsonResponse(
            {
              ok: true,
              ignored: true,
              reason: "Evento diferente de INSERT.",
            },
            200,
          );
        }

        if (
          webhookPayload.table &&
          webhookPayload.table !== "profiles"
        ) {
          console.log(
            "[Novo usuário] Tabela ignorada:",
            webhookPayload.table,
          );

          return jsonResponse(
            {
              ok: true,
              ignored: true,
              reason: "Tabela diferente de profiles.",
            },
            200,
          );
        }

        const record =
          webhookPayload.record ?? null;

        const userId =
          getFirstString([
            record?.id,
            directPayload.userId,
            directPayload.id,
          ]) ?? null;

        const email =
          getFirstString([
            record?.email,
            directPayload.email,
          ])
            ?.trim()
            .toLowerCase() ?? null;

        const fullName =
          getFirstString([
            record?.full_name,
            directPayload.fullName,
            directPayload.full_name,
          ]) ?? null;

        const createdAt =
          normalizeDate(
            getFirstString([
              record?.created_at,
              directPayload.createdAt,
              directPayload.created_at,
            ]),
          ) ??
          new Date().toISOString();

        const source =
          getFirstString([
            directPayload.source,
          ]) ??
          "Cadastro na plataforma";

        if (!email) {
          console.warn(
            "[Novo usuário] Payload sem e-mail:",
            payload,
          );

          return jsonResponse(
            {
              ok: false,
              error: "E-mail não informado.",
            },
            400,
          );
        }

        const adminEmail =
          process.env.ADMIN_EMAIL
            ?.trim()
            .toLowerCase() ?? null;

        /*
         * Não envia notificação quando o próprio
         * administrador é criado ou atualizado.
         */
        if (
          adminEmail &&
          email === adminEmail
        ) {
          console.log(
            "[Novo usuário] Cadastro do administrador ignorado.",
          );

          return jsonResponse(
            {
              ok: true,
              ignored: true,
              reason: "Usuário administrador.",
            },
            200,
          );
        }

        const message = [
          "👤 <b>NOVO MEMBRO CADASTRADO</b>",
          "",
          `<b>Nome:</b> ${escapeHtml(
            fullName ?? "Não informado",
          )}`,
          `<b>E-mail:</b> ${escapeHtml(email)}`,
          `<b>Origem:</b> ${escapeHtml(source)}`,
          `<b>Data:</b> ${escapeHtml(
            formatBrazilDate(createdAt),
          )}`,
          userId
            ? `<b>ID:</b> <code>${escapeHtml(
                userId,
              )}</code>`
            : null,
        ]
          .filter(
            (
              line,
            ): line is string =>
              typeof line === "string",
          )
          .join("\n");

        const telegramResult =
          await sendAdminTelegramNotification(
            message,
          );

        if (!telegramResult.ok) {
          /*
           * Retornamos erro para que o Supabase
           * registre que o webhook não foi entregue.
           */
          return jsonResponse(
            {
              ok: false,
              error:
                "Não foi possível enviar a notificação.",
              telegramError:
                telegramResult.error,
            },
            502,
          );
        }

        console.log(
          "[Novo usuário] Administrador notificado:",
          {
            userId,
            email,
            fullName,
            createdAt,
          },
        );

        return jsonResponse(
          {
            ok: true,
            message:
              "Notificação enviada ao administrador.",
          },
          200,
        );
      },

      GET: async () => {
        /*
         * Endpoint simples para confirmar que
         * a rota foi publicada.
         *
         * Não revela tokens nem informações privadas.
         */
        return jsonResponse(
          {
            ok: true,
            service:
              "new-user-notification",
            configured: {
              telegram:
                Boolean(
                  process.env
                    .TELEGRAM_BOT_TOKEN &&
                    process.env
                      .TELEGRAM_CHAT_ID,
                ),

              webhookSecret:
                Boolean(
                  process.env
                    .NEW_USER_WEBHOOK_SECRET,
                ),
            },
          },
          200,
        );
      },
    },
  },
});

async function sendAdminTelegramNotification(
  message: string,
): Promise<
  | {
      ok: true;
      messageId?: number;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN?.trim();

  const adminChatId =
    process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !adminChatId) {
    const error =
      "TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.";

    console.error(
      `[Telegram Admin] ${error}`,
    );

    return {
      ok: false,
      error,
    };
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      10_000,
    );

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",

          signal:
            controller.signal,

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
          },

          body: JSON.stringify({
            chat_id:
              adminChatId,

            text:
              message,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true,
          }),
        },
      );

    const responseText =
      await response.text();

    let responseData: {
      ok?: boolean;
      description?: string;
      result?: {
        message_id?: number;
      };
    } | null = null;

    try {
      responseData =
        JSON.parse(
          responseText,
        );
    } catch {
      responseData = null;
    }

    if (
      !response.ok ||
      responseData?.ok !== true
    ) {
      const error =
        responseData?.description ??
        responseText ??
        `Erro HTTP ${response.status}`;

      console.error(
        "[Telegram Admin] Falha ao enviar notificação:",
        {
          status:
            response.status,

          error,
        },
      );

      return {
        ok: false,
        error,
      };
    }

    console.log(
      "[Telegram Admin] Notificação enviada com sucesso.",
    );

    return {
      ok: true,
      messageId:
        responseData.result
          ?.message_id,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      console.error(
        "[Telegram Admin] Tempo limite excedido.",
      );

      return {
        ok: false,
        error:
          "Tempo limite excedido ao acessar o Telegram.",
      };
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Erro desconhecido.";

    console.error(
      "[Telegram Admin] Erro inesperado:",
      error,
    );

    return {
      ok: false,
      error:
        errorMessage,
    };
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function getFirstString(
  values: unknown[],
): string | undefined {
  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return undefined;
}

function normalizeDate(
  value?: string,
): string | null {
  if (!value) {
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

function formatBrazilDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      dateStyle:
        "short",

      timeStyle:
        "medium",
    },
  ).format(date);
}

function escapeHtml(
  value: string,
): string {
  return value
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function safeCompare(
  received: string,
  expected: string,
): boolean {
  if (
    received.length !==
    expected.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < received.length;
    index += 1
  ) {
    difference |=
      received.charCodeAt(
        index,
      ) ^
      expected.charCodeAt(
        index,
      );
  }

  return difference === 0;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

