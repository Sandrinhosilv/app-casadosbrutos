import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export { requireSupabaseAuth };

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type UserRole =
  | "user"
  | "admin";

export type ManualType =
  | "servico"
  | "proprietario"
  | "pecas"
  | "diagrama_eletrico"
  | "esquema_eletrico"
  | "injecao"
  | "torque"
  | "manutencao"
  | "hidraulico"
  | "boletim"
  | "atualizacao"
  | "outro";

export function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return String(error);
}

export function normalizeSearchTerm(
  value?: string,
): string | undefined {
  const normalized = value
    ?.trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ");

  return normalized || undefined;
}

export function throwQueryError(
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null,
  operation: string,
): void {
  if (!error) {
    return;
  }

  console.error(
    `[Admin] ${operation}:`,
    error,
  );

  const details = [
    error.message,
    error.details,
    error.hint,
    error.code,
  ]
    .filter(Boolean)
    .join(" | ");

  throw new Error(
    `${operation}: ${
      details || "erro desconhecido"
    }`,
  );
}

export async function assertAdmin(
  context: {
    supabase: any;
    userId: string;
  },
): Promise<void> {
  const { data, error } =
    await context.supabase.rpc(
      "has_role",
      {
        _user_id:
          context.userId,
        _role:
          "admin",
      },
    );

  if (error) {
    console.error(
      "[assertAdmin] Erro ao verificar administrador:",
      error,
    );

    throw new Error(
      `Erro ao verificar administrador: ${
        error.message ||
        "erro desconhecido"
      }`,
    );
  }

  if (data !== true) {
    throw new Error(
      "Acesso negado: administrador obrigatório",
    );
  }
}