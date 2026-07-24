import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  "https://uboenuryqhgfmwgbhlne.supabase.co";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não configurada no .env.",
  );
}

if (!ADMIN_EMAIL) {
  throw new Error(
    "ADMIN_EMAIL não configurado no .env.",
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

async function encontrarUsuarioPorEmail(email) {
  let page = 1;

  while (true) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) {
      throw error;
    }

    const usuario =
      data.users.find(
        (item) =>
          item.email?.toLowerCase() ===
          email.toLowerCase(),
      );

    if (usuario) {
      return usuario;
    }

    if (
      data.users.length <
      1000
    ) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  const usuario =
    await encontrarUsuarioPorEmail(
      ADMIN_EMAIL,
    );

  if (!usuario) {
    throw new Error(
      `Usuário ${ADMIN_EMAIL} não encontrado.`,
    );
  }

  console.log(
    "Usuário encontrado:",
    usuario.id,
  );

  /*
   * Remove o papel padrão, como "user",
   * antes de inserir o papel admin.
   *
   * Isso funciona tanto para tabelas com uma role
   * por usuário quanto para estruturas que permitem
   * múltiplos registros.
   */
  const { error: deleteRoleError } =
    await supabase
      .from("user_roles")
      .delete()
      .eq(
        "user_id",
        usuario.id,
      );

  if (deleteRoleError) {
    throw new Error(
      `Erro ao remover papel anterior: ${deleteRoleError.message}`,
    );
  }

  const {
    data: roleData,
    error: roleError,
  } =
    await supabase
      .from("user_roles")
      .insert({
        user_id:
          usuario.id,
        role:
          "admin",
      })
      .select()
      .single();

  if (roleError) {
    throw new Error(
      `Erro ao definir administrador: ${roleError.message}`,
    );
  }

  console.log(
    "Papel gravado:",
    roleData,
  );

  const {
    data: verification,
    error: verificationError,
  } =
    await supabase
      .from("user_roles")
      .select(
        "user_id, role",
      )
      .eq(
        "user_id",
        usuario.id,
      );

  if (verificationError) {
    throw verificationError;
  }

  console.log(
    "Permissões atuais:",
    verification,
  );

  console.log(
    `\n✅ ${ADMIN_EMAIL} agora é administrador.`,
  );
}

main().catch((error) => {
  console.error(
    "\n❌ Falha:",
    error.message,
  );

  process.exit(1);
});