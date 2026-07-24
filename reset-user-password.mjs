import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const userId = process.argv[2];
const newPassword = process.argv[3];

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

if (!userId || !newPassword) {
  console.error(
    'Uso: node reset-user-password.mjs "USER_ID" "NOVA_SENHA"',
  );
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error(
    "A nova senha precisa ter pelo menos 8 caracteres.",
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const { data, error } =
  await supabase.auth.admin.updateUserById(
    userId,
    {
      password: newPassword,
      email_confirm: true,
    },
  );

if (error) {
  console.error(
    "Erro ao atualizar senha:",
    error.message,
  );
  process.exit(1);
}

console.log(
  `Senha atualizada para ${data.user.email ?? userId}`,
);