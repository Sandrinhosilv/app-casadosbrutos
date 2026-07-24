import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getDashboardOverview, updateProfile } from "@/lib/manuals.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Manual Stock" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const fetch = useServerFn(getDashboardOverview);
  const update = useServerFn(updateProfile);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard-overview"], queryFn: () => fetch() });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPass, setNewPass] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.full_name ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => update({ data: { full_name: name, phone } }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e) => toast.error(e.message),
  });

  async function changePassword() {
    if (!newPass) return;
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    setNewPass("");
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Perfil</h1>
      <p className="mt-2 text-sm text-muted-foreground">Suas informações pessoais e conta.</p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary text-lg font-semibold">
            {name ? name[0]?.toUpperCase() : "?"}
          </div>
          <div>
            <p className="font-medium">{data?.profile?.full_name ?? "Sem nome"}</p>
            <p className="text-sm text-muted-foreground">{data?.profile?.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Field label="Nome" value={name} onChange={setName} />
          <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 99999-9999" />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <p className="text-sm font-medium">Trocar senha</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field
            label="Nova senha"
            type="password"
            value={newPass}
            onChange={setNewPass}
            placeholder="Mínimo 6 caracteres"
          />
          <button
            onClick={changePassword}
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border bg-secondary px-5 text-sm font-medium transition hover:bg-secondary/80"
          >
            Atualizar senha
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <p className="text-sm font-medium">Assinatura</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Status: {data?.subscription?.status ?? "sem assinatura"}
          {data?.subscription?.expires_at &&
            ` · renovação em ${new Date(data.subscription.expires_at).toLocaleDateString("pt-BR")}`}
        </p>
      </div>
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
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block flex-1">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        {...rest}
      />
    </label>
  );
}
