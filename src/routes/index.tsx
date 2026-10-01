import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, History, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediScan AI — Understand your medicines in English & Tamil" },
      { name: "description", content: "Look up medicines, track your history and generate bilingual AI summaries." },
      { property: "og:title", content: "MediScan AI — Understand your medicines" },
      { property: "og:description", content: "Look up medicines, track your history and generate bilingual AI summaries." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const features = [
    { icon: Search, title: t("f1Title"), body: t("f1Body") },
    { icon: History, title: t("f2Title"), body: t("f2Body") },
    { icon: FileText, title: t("f3Title"), body: t("f3Body") },
  ];
  return (
    <div className="py-10">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">EN · தமிழ்</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">{t("appName")}</h1>
        <p className="mt-4 text-xl text-foreground/90 md:text-2xl">{t("tagline")}</p>
        <p className="mt-4 max-w-2xl text-muted-foreground">{t("heroSub")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className="btn-primary">{t("getStarted")}</Link>
          <Link to="/login" className="glass px-5 py-2.5 text-sm hover:border-primary/50">{t("login")}</Link>
        </div>
      </section>
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass p-6">
            <f.icon className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
