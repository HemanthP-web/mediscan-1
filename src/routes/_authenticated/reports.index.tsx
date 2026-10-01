import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { generateReport } from "@/lib/medi.functions";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — MediScan AI" }, { name: "description", content: "Your bilingual AI medicine summaries." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const gen = useServerFn(generateReport);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("id, created_at, content_en, content_ta").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function onGenerate() {
    setBusy(true);
    setErr(null);
    try {
      const rep = await gen();
      navigate({ to: "/reports/$id", params: { id: rep.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("reports")}</h1>
        <button onClick={onGenerate} className="btn-primary" disabled={busy}>{busy ? t("generating") : t("generate")}</button>
      </div>
      {err && <p className="rounded-[14px] border border-warning/40 bg-warning/10 p-3 text-sm text-warning">{err}</p>}
      <h2 className="text-lg font-semibold text-muted-foreground">{t("pastReports")}</h2>
      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : !data?.length ? (
        <p className="glass p-6 text-muted-foreground">{t("noReports")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((r) => (
            <li key={r.id} className="glass p-5">
              <time className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</time>
              <p className="mt-2 line-clamp-3 text-sm">{lang === "ta" && r.content_ta ? r.content_ta : r.content_en}</p>
              <Link to="/reports/$id" params={{ id: r.id }} className="mt-3 inline-block text-sm text-primary hover:underline">{t("view")} →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
