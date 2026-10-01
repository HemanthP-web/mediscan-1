import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { lookupMedicine } from "@/lib/medi.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MediScan AI" }, { name: "description", content: "Search medicines and see your recent lookups." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lookup = useServerFn(lookupMedicine);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: async () => {
      const [{ data: profile }, { data: rows }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
        supabase.from("medicine_lookups").select("id, created_at, medicine_id, medicines(name)").order("created_at", { ascending: false }),
      ]);
      return { name: profile?.name ?? "", rows: rows ?? [] };
    },
  });

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().min(2).max(100).safeParse(q);
    if (!parsed.success) return setErr("2–100");
    setErr(null);
    setBusy(true);
    try {
      const med = await lookup({ data: { name: parsed.data } });
      qc.invalidateQueries();
      navigate({ to: "/medicine/$name", params: { name: med.name } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  const rows = data?.rows ?? [];
  const unique = new Set(rows.map((r) => r.medicine_id)).size;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{t("hello")}{data?.name ? `, ${data.name}` : ""}</h1>
      <form onSubmit={onSearch} className="glass p-6">
        <label htmlFor="q" className="mb-2 block text-sm text-muted-foreground">{t("searchLabel")}</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="q" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} />
          <button className="btn-primary sm:w-40" disabled={busy}>{busy ? t("searching") : t("search")}</button>
        </div>
        {err && <p className="mt-2 text-sm text-warning">{err}</p>}
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label={t("totalLookups")} value={rows.length} />
        <Stat label={t("uniqueMeds")} value={unique} />
      </div>
      <section className="glass p-6">
        <h2 className="text-lg font-semibold">{t("recent")}</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noLookups")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {rows.slice(0, 3).map((r) => {
              const name = (r.medicines as { name: string } | null)?.name ?? "";
              return (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <Link to="/medicine/$name" params={{ name }} className="text-primary hover:underline">{name}</Link>
                  <time className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold text-primary">{value}</p>
    </div>
  );
}
