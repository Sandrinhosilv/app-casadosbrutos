export async function sendAdminTelegramNotification(
  message: string,
): Promise<boolean> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN?.trim();

  const adminChatId =
    process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !adminChatId) {
    console.warn(
      "[Telegram Admin] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.",
    );

    return false;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      10000,
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
              "application/json",
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

    if (!response.ok) {
      const responseBody =
        await response.text();

      console.error(
        "[Telegram Admin] Falha ao enviar notificação:",
        responseBody,
      );

      return false;
    }

    console.log(
      "[Telegram Admin] Notificação enviada com sucesso.",
    );

    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      console.error(
        "[Telegram Admin] Tempo limite excedido.",
      );
    } else {
      console.error(
        "[Telegram Admin] Erro ao enviar notificação:",
        error,
      );
    }

    return false;
  } finally {
    clearTimeout(
      timeout,
    );
  }
}