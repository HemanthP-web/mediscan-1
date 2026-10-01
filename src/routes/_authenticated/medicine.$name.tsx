import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Disclaimer } from "@/components/Header";

export const Route = createFileRoute("/_authenticated/medicine/$name")({
  head: ({ params }) => ({ meta: [{ title: `${params.name} — MediScan AI` }, { name: "description", content: `Uses, dosage, side effects and precautions for ${params.name}.` }] }),
  component: MedicinePage,
});

const sections = [
  ["uses", "uses"],
  ["dosage", "dosage"],
  ["side_effects", "sideEffects"],
  ["precautions", "precautions"],
] as const;

function MedicinePage() {
  const { name } = Route.useParams();
  const { t, lang } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["medicine", name.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase.from("medicines").select("*").ilike("name", name.replace(/[%_]/g, "")).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (error) return <p className="text-warning">{t("genericError")}</p>;

  return (
    <div className="space-y-4">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">← {t("back")}</Link>
      {!data ? (
        <p className="glass p-6">{t("notFound")}</p>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">{lang === "ta" && data.name_ta ? data.name_ta : data.name}</h1>
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map(([field, label]) => {
              const rec = data as unknown as Record<string, string | null>;
              const text = (lang === "ta" && rec[`${field}_ta`]) || rec[`${field}_en`];
              return (
                <section key={field} className="glass p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">{t(label as TKey)}</h2>
                  <p className="mt-3 leading-relaxed">{text}</p>
                </section>
              );
            })}
          </div>
        </>
      )}
      <Disclaimer />
    </div>
  );
}
