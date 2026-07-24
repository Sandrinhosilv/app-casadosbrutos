import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import {
  ArrowLeft,
  ImageOff,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import logoManualStock from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode =
  | "login"
  | "signup"
  | "magic"
  | "forgot";

const searchSchema = z.object({
  mode: z
    .enum([
      "login",
      "signup",
      "magic",
      "forgot",
    ])
    .optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,

  head: () => ({
    meta: [
      {
        title: "Casa dos brutos",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),

  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } =
    Route.useSearch();

  const navigate =
    useNavigate();

  const [mode, setMode] =
    useState<Mode>(
      initialMode ?? "login",
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [name, setName] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [
    logoFailed,
    setLogoFailed,
  ] = useState(false);

  async function redirectByRole(
    userId: string,
  ) {
    const {
      data: roleData,
      error: roleError,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleError) {
      console.error(
        "[Auth] Erro ao buscar função:",
        roleError,
      );

      throw new Error(
        `Não foi possível identificar seu nível de acesso: ${roleError.message}`,
      );
    }

    if (
      roleData?.role === "admin"
    ) {
      await navigate({
        to: "/admin",
        replace: true,
      });

      return;
    }

    await navigate({
      to: "/dashboard",
      replace: true,
    });
  }

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const {
          data: {
            session,
          },
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        if (session?.user) {
          await redirectByRole(
            session.user.id,
          );
        }
      } catch (error) {
        console.error(
          "[Auth] Erro ao verificar sessão:",
          error,
        );
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error(
        "Informe seu e-mail.",
      );

      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const {
          data: loginData,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                normalizedEmail,

              password,
            });

        if (error) {
          throw error;
        }

        if (!loginData.user) {
          throw new Error(
            "Não foi possível identificar o usuário autenticado.",
          );
        }

        toast.success(
          "Bem-vindo de volta!",
        );

        await redirectByRole(
          loginData.user.id,
        );

        return;
      }

      if (mode === "signup") {
        if (!name.trim()) {
          throw new Error(
            "Informe seu nome.",
          );
        }

        const {
          data: signupData,
          error,
        } =
          await supabase.auth.signUp({
            email:
              normalizedEmail,

            password,

            options: {
              emailRedirectTo:
                `${window.location.origin}/auth`,

              data: {
                full_name:
                  name.trim(),
              },
            },
          });

        if (error) {
          throw error;
        }

        if (
          signupData.session?.user
        ) {
          toast.success(
            "Conta criada com sucesso!",
          );

          await redirectByRole(
            signupData.session.user.id,
          );

          return;
        }

        toast.success(
          "Conta criada! Verifique seu e-mail para confirmar.",
        );

        setPassword("");
        changeMode("login");

        return;
      }

      if (mode === "magic") {
        const { error } =
          await supabase.auth
            .signInWithOtp({
              email:
                normalizedEmail,

              options: {
                emailRedirectTo:
                  `${window.location.origin}/auth`,
              },
            });

        if (error) {
          throw error;
        }

        toast.success(
          "Link mágico enviado para seu e-mail.",
        );

        return;
      }

      if (mode === "forgot") {
        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              normalizedEmail,
              {
                redirectTo:
                  `${window.location.origin}/reset-password`,
              },
            );

        if (error) {
          throw error;
        }

        toast.success(
          "Enviamos um link para redefinir sua senha.",
        );

        changeMode("login");
      }
    } catch (error) {
      console.error(
        "[Auth] Erro de autenticação:",
        error,
      );

      toast.error(
        getAuthErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const result =
        await lovable.auth
          .signInWithOAuth(
            "google",
            {
              redirect_uri:
                `${window.location.origin}/auth`,
            },
          );

      if (result.error) {
        throw result.error;
      }

      if (result.redirected) {
        return;
      }

      const {
        data: {
          session,
        },
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!session?.user) {
        throw new Error(
          "A sessão do Google ainda não está disponível.",
        );
      }

      await redirectByRole(
        session.user.id,
      );
    } catch (error) {
      console.error(
        "[Auth] Falha no login com Google:",
        error,
      );

      toast.error(
        getAuthErrorMessage(
          error,
          "Não foi possível entrar com o Google.",
        ),
      );

      setLoading(false);
    }
  }

  function changeMode(
    nextMode: Mode,
  ) {
    if (loading) {
      return;
    }

    setMode(nextMode);

    void navigate({
      to: "/auth",
      search: {
        mode:
          nextMode === "login"
            ? undefined
            : nextMode,
      },
      replace: true,
    });
  }

  const titles: Record<
    Mode,
    {
      title: string;
      subtitle: string;
    }
  > = {
    login: {
      title: "Entrar",
      subtitle:
        "Acesse a biblioteca completa.",
    },

    signup: {
      title: "Criar conta",
      subtitle:
        "Comece a usar o Casa dos brutos em segundos.",
    },

    magic: {
      title: "Link mágico",
      subtitle:
        "Enviaremos um link de acesso para seu e-mail.",
    },

    forgot: {
      title: "Recuperar senha",
      subtitle:
        "Enviaremos instruções para seu e-mail.",
    },
  };

  if (checkingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />

          <p className="text-sm text-muted-foreground">
            Verificando sua sessão...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-hero opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10 sm:px-6 sm:py-16">
        

        <section className="rounded-[32px] border border-border/80 bg-card/80 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
          <BrandLogo
            failed={logoFailed}
            onError={() =>
              setLogoFailed(true)
            }
          />

          <AnimatePresence
            mode="wait"
          >
            <motion.div
              key={mode}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              transition={{
                duration: 0.22,
              }}
            >
              

              <form
                onSubmit={onSubmit}
                className="mt-7 space-y-4"
              >
                {mode ===
                  "signup" && (
                  <Field
                    label="Nome"
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Seu nome"
                    autoComplete="name"
                    disabled={loading}
                    required
                  />
                )}

                <Field
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />

                {(mode === "login" ||
                  mode ===
                    "signup") && (
                  <Field
                    label="Senha"
                    type="password"
                    value={password}
                    onChange={
                      setPassword
                    }
                    placeholder="••••••••"
                    autoComplete={
                      mode ===
                      "login"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={6}
                    disabled={loading}
                    required
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="glow-soft mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {mode ===
                    "login" &&
                    "Entrar"}

                  {mode ===
                    "signup" &&
                    "Criar conta"}

                  {mode ===
                    "magic" &&
                    "Enviar link mágico"}

                  {mode ===
                    "forgot" &&
                    "Enviar instruções"}
                </button>
              </form>

              

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                {mode ===
                  "login" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        changeMode(
                          "forgot",
                        )
                      }
                      disabled={
                        loading
                      }
                      className="transition hover:text-primary disabled:opacity-50"
                    >
                      Esqueci minha senha
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeMode(
                          "signup",
                        )
                      }
                      disabled={
                        loading
                      }
                      className="font-medium text-primary transition hover:opacity-80 disabled:opacity-50"
                    >
                      Registrar-se
                    </button>
                  </>
                )}

                {mode ===
                  "signup" && (
                  <button
                    type="button"
                    onClick={() =>
                      changeMode(
                        "login",
                      )
                    }
                    disabled={
                      loading
                    }
                    className="font-medium text-primary transition hover:opacity-80 disabled:opacity-50"
                  >
                    Já tem conta? Entrar
                  </button>
                )}

                {(mode ===
                  "magic" ||
                  mode ===
                    "forgot") && (
                  <button
                    type="button"
                    onClick={() =>
                      changeMode(
                        "login",
                      )
                    }
                    disabled={
                      loading
                    }
                    className="font-medium text-primary transition hover:opacity-80 disabled:opacity-50"
                  >
                    Voltar para o login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Ao continuar, você concorda
          com os termos de uso e a
          política de privacidade do
          Casa dos brutos.
        </p>
      </div>
    </main>
  );
}

function BrandLogo({
  failed,
  onError,
}: {
  failed: boolean;
  onError: () => void;
}) {
  return (
    <div className="mb-8 flex justify-center">
      {!failed ? (
        <img
          src={logoManualStock}
          alt="Casa dos brutos"
          className="h-24 w-auto object-contain"
          onError={onError}
        />
      ) : (
        <ImageOff className="h-10 w-10 text-primary" />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        {...rest}
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.72-.06-1.25-.2-1.8H12v3.48h5.52a4.71 4.71 0 0 1-2.05 3.04v2.5h3.32c1.94-1.78 2.81-4.4 2.81-7.22Z"
      />

      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.32-2.5c-.9.6-2.05.96-3.29.96-2.6 0-4.8-1.75-5.6-4.12H2.98v2.58A10 10 0 0 0 12 22Z"
      />

      <path
        fill="#FBBC05"
        d="M6.4 13.9A6.07 6.07 0 0 1 6.08 12c0-.66.11-1.3.32-1.9V7.52H2.98A10 10 0 0 0 2 12c0 1.61.38 3.14.98 4.48L6.4 13.9Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2a10 10 0 0 0-9.02 5.52L6.4 10.1C7.2 7.73 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

function getAuthErrorMessage(
  error: unknown,
  fallback =
    "Não foi possível concluir a autenticação.",
): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message =
    error.message.toLowerCase();

  if (
    message.includes(
      "invalid login credentials",
    )
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (
    message.includes(
      "email not confirmed",
    )
  ) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (
    message.includes(
      "user already registered",
    )
  ) {
    return "Já existe uma conta com este e-mail.";
  }

  if (
    message.includes(
      "password should be at least",
    )
  ) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }

  if (
    message.includes(
      "email rate limit exceeded",
    )
  ) {
    return "Muitos e-mails foram enviados. Aguarde alguns minutos e tente novamente.";
  }

  return error.message || fallback;
}