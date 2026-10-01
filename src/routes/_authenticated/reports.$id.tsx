import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Disclaimer } from "@/components/Header";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({ meta: [{ title: "Report — MediScan AI" }, { name: "description", content: "Bilingual medicine summary report." }] }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (!data) return <p className="glass p-6">{t("genericError")}</p>;

  return (
    <div className="print-page space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/reports" className="text-sm text-muted-foreground hover:text-primary">← {t("back")}</Link>
        <button onClick={() => window.print()} className="btn-primary">{t("print")}</button>
      </div>
      <h1 className="text-3xl font-semibold">MediScan AI — {t("report")}</h1>
      <time className="font-mono text-xs text-muted-foreground">{new Date(data.created_at).toLocaleString()}</time>
      <section className="glass p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">English</h2>
        <p className="mt-3 whitespace-pre-line leading-relaxed">{data.content_en}</p>
      </section>
      {data.content_ta && (
        <section className="glass p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">தமிழ்</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{data.content_ta}</p>
        </section>
      )}
      <Disclaimer />
    </div>
  );
}
