import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(72) });
const registerSchema = loginSchema.extend({ name: z.string().trim().min(1).max(100) });

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const parsed = (mode === "register" ? registerSchema : loginSchema).safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { name: form.name }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else setMsg(t("checkEmail"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : t("genericError") });
    } finally {
      setBusy(false);
    }
  }

  const fields = mode === "register" ? (["name", "email", "password"] as const) : (["email", "password"] as const);

  return (
    <div className="mx-auto max-w-md py-10">
      <form onSubmit={submit} className="glass space-y-4 p-6" noValidate>
        <h1 className="text-2xl font-semibold">{mode === "login" ? t("login") : t("register")}</h1>
        {fields.map((f) => (
          <div key={f}>
            <label htmlFor={f} className="mb-1 block text-sm text-muted-foreground">{t(f)}</label>
            <input
              id={f}
              type={f === "password" ? "password" : f === "email" ? "email" : "text"}
              autoComplete={f === "password" ? (mode === "login" ? "current-password" : "new-password") : f}
              className="field"
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              aria-invalid={!!errors[f]}
            />
            {errors[f] && <p className="mt-1 text-xs text-warning">{errors[f]}</p>}
          </div>
        ))}
        {errors['form'] && <p className="text-sm text-warning">{errors['form']}</p>}
        {msg && <p className="text-sm text-primary">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t("loading") : mode === "login" ? t("login") : t("register")}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
          <Link to={mode === "login" ? "/register" : "/login"} className="text-primary hover:underline">
            {mode === "login" ? t("register") : t("login")}
          </Link>
        </p>
      </form>
    </div>
  );
}
