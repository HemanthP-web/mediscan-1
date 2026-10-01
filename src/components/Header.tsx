import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

export function useIsAdmin(userId: string | null) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!userId) return setAdmin(false);
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      .then(({ data }) => setAdmin(!!data));
  }, [userId]);
  return admin;
}

export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang")} className="glass flex rounded-full p-1 text-xs">
      {(["en", "ta"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1 transition ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l === "en" ? "EN" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t, setLang } = useI18n();
  const { userId } = useSession();
  const admin = useIsAdmin(userId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("preferred_lang").eq("id", userId).maybeSingle().then(({ data }) => {
      const stored = localStorage.getItem("mediscan-lang");
      if (!stored && (data?.preferred_lang === "ta" || data?.preferred_lang === "en")) setLang(data.preferred_lang);
    });
  }, [userId, setLang]);

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const link = "rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition";
  const active = { className: "!text-primary" };

  return (
    <header className="no-print sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to={userId ? "/dashboard" : "/"} className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-block h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          {t("appName")}
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {userId ? (
            <>
              <Link to="/dashboard" className={link} activeProps={active}>{t("dashboard")}</Link>
              <Link to="/history" className={link} activeProps={active}>{t("history")}</Link>
              <Link to="/reports" className={link} activeProps={active}>{t("reports")}</Link>
              {admin && <Link to="/admin" className={link} activeProps={active}>{t("admin")}</Link>}
              <button onClick={logout} className={link}>{t("logout")}</button>
            </>
          ) : (
            <>
              <Link to="/login" className={link}>{t("login")}</Link>
              <Link to="/register" className="btn-primary text-sm">{t("register")}</Link>
            </>
          )}
          <span className="ml-2"><LangToggle /></span>
        </nav>
      </div>
    </header>
  );
}

export function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="mt-6 rounded-[14px] border border-warning/40 bg-warning/10 p-4 text-sm text-warning print-disclaimer">
      {t("disclaimer")}
    </p>
  );
}
