import {
  createServerFn,
} from "@tanstack/react-start";
import { z } from "zod";

const newUserSchema = z.object({
  userId:
    z.string().min(1),

  email:
    z.string().email(),

  fullName:
    z.string().min(1),
});

type TelegramResponse = {
  ok: boolean;

  description?: string;

  result?: {
    message_id?: number;
  };
};

export const notifyNewUserServer =
  createServerFn({
    method: "POST",
  })
    .validator(
      (input: unknown) =>
        newUserSchema.parse(
          input,
        ),
    )
    .handler(
      async ({ data }) => {
        console.log(
          "[Telegram Server] Função iniciada.",
        );

        const botToken =
          process.env
            .TELEGRAM_BOT_TOKEN
            ?.trim();

        const chatId =
          process.env
            .TELEGRAM_CHAT_ID
            ?.trim();

        console.log(
          "[Telegram Server] Variáveis disponíveis:",
          {
            hasBotToken:
              Boolean(
                botToken,
              ),

            hasChatId:
              Boolean(
                chatId,
              ),

            userId:
              data.userId,

            email:
              data.email,
          },
        );

        if (!botToken) {
          console.error(
            "[Telegram Server] TELEGRAM_BOT_TOKEN não configurado.",
          );

          return {
            ok: false,
            status: 500,
            messageId: null,
            error:
              "TELEGRAM_BOT_TOKEN não configurado.",
          };
        }

        if (!chatId) {
          console.error(
            "[Telegram Server] TELEGRAM_CHAT_ID não configurado.",
          );

          return {
            ok: false,
            status: 500,
            messageId: null,
            error:
              "TELEGRAM_CHAT_ID não configurado.",
          };
        }

        let createdAt:
          string;

        try {
          createdAt =
            new Intl
              .DateTimeFormat(
                "pt-BR",
                {
                  dateStyle:
                    "short",

                  timeStyle:
                    "medium",

                  timeZone:
                    "America/Maceio",
                },
              )
              .format(
                new Date(),
              );
        } catch {
          createdAt =
            new Date()
              .toISOString();
        }

        const message = [
          "🆕 NOVO USUÁRIO CADASTRADO",
          "",
          `👤 Nome: ${data.fullName}`,
          `📧 E-mail: ${data.email}`,
          `🆔 ID: ${data.userId}`,
          `🕒 Data: ${createdAt}`,
          "",
          "📍 Origem: Cadastro realizado pelo site",
        ].join("\n");

        const endpoint =
          `https://api.telegram.org/bot${botToken}/sendMessage`;

        try {
          console.log(
            "[Telegram Server] Enviando mensagem...",
          );

          const response =
            await fetch(
              endpoint,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    chat_id:
                      chatId,

                    text:
                      message,

                    disable_web_page_preview:
                      true,
                  }),

                cache:
                  "no-store",
              },
            );

          const responseText =
            await response.text();

          console.log(
            "[Telegram Server] Status HTTP:",
            response.status,
          );

          console.log(
            "[Telegram Server] Resposta:",
            responseText,
          );

          let responseData:
            | TelegramResponse
            | null = null;

          try {
            responseData =
              JSON.parse(
                responseText,
              ) as TelegramResponse;
          } catch {
            responseData =
              null;
          }

          if (
            !response.ok ||
            responseData?.ok !==
              true
          ) {
            const errorMessage =
              responseData
                ?.description ??
              responseText ??
              `Telegram retornou HTTP ${response.status}.`;

            console.error(
              "[Telegram Server] Mensagem recusada:",
              errorMessage,
            );

            return {
              ok: false,
              status:
                response.status,
              messageId:
                null,
              error:
                errorMessage,
            };
          }

          const messageId =
            responseData
              .result
              ?.message_id ??
            null;

          console.log(
            "[Telegram Server] Notificação enviada:",
            {
              messageId,
            },
          );

          return {
            ok: true,
            status:
              response.status,
            messageId,
            error:
              null,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao chamar o Telegram.";

          console.error(
            "[Telegram Server] Erro na requisição:",
            error,
          );

          return {
            ok: false,
            status: 500,
            messageId: null,
            error:
              errorMessage,
          };
        }
      },
    );