import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — MediScan AI" }, { name: "description", content: "Your medicine lookup timeline with notes." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicine_lookups")
        .select("id, created_at, note, medicines(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{t("history")}</h1>
      {isLoading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : !data?.length ? (
        <p className="glass p-6 text-muted-foreground">{t("noLookups")}</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {data.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-primary" />
              <Row id={r.id} name={(r.medicines as { name: string } | null)?.name ?? ""} date={r.created_at} note={r.note ?? ""} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Row({ id, name, date, note }: { id: string; name: string; date: string; note: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    const parsed = z.string().max(1000).safeParse(value);
    if (!parsed.success) return setState("error");
    setState("saving");
    const { error } = await supabase.from("medicine_lookups").update({ note: parsed.data || null }).eq("id", id);
    setState(error ? "error" : "saved");
  }

  return (
    <div className="glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/medicine/$name" params={{ name }} className="font-display text-lg text-primary hover:underline">{name}</Link>
        <time className="font-mono text-xs text-muted-foreground">{new Date(date).toLocaleString()}</time>
      </div>
      <label htmlFor={`n-${id}`} className="mt-3 block text-xs text-muted-foreground">{t("note")}</label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <input id={`n-${id}`} className="field" value={value} placeholder={t("addNote")} onChange={(e) => { setValue(e.target.value); setState("idle"); }} />
        <button onClick={save} className="btn-primary sm:w-28" disabled={state === "saving"}>
          {state === "saved" ? t("saved") : t("save")}
        </button>
      </div>
      {state === "error" && <p className="mt-1 text-xs text-warning">{t("genericError")}</p>}
    </div>
  );
}
