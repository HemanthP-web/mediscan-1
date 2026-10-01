import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin } from "@/components/Header";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — MediScan AI" }, { name: "description", content: "Manage profiles and cached medicines." }] }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: roleOk, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });
  useIsAdmin(null);

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: !!roleOk,
    queryFn: async () => {
      const [p, r, m] = await Promise.all([
        supabase.from("profiles").select("id, name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("medicines").select("id, name, source, created_at").order("name"),
      ]);
      return { profiles: p.data ?? [], roles: r.data ?? [], medicines: m.data ?? [] };
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from("medicines").delete().eq("id", id);
    if (error) alert(t("genericError"));
    qc.invalidateQueries({ queryKey: ["admin-data"] });
  }

  if (roleLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (!roleOk) return <p className="glass p-6 text-warning">{t("notAdmin")}</p>;

  const cell = "px-4 py-3 text-left";
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">{t("admin")}</h1>
      <section className="glass overflow-x-auto">
        <h2 className="p-4 text-lg font-semibold">{t("profiles")}</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className={cell}>{t("name")}</th><th className={cell}>{t("role")}</th><th className={cell}>{t("joined")}</th></tr></thead>
          <tbody>
            {data?.profiles.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className={cell}>{p.name}</td>
                <td className={cell}>{data.roles.filter((r) => r.user_id === p.id).map((r) => r.role).join(", ")}</td>
                <td className={`${cell} font-mono text-xs`}>{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="glass overflow-x-auto">
        <h2 className="p-4 text-lg font-semibold">{t("medicines")}</h2>
        <table className="w-full text-sm">
          <tbody>
            {data?.medicines.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className={cell}>{m.name}</td>
                <td className={`${cell} font-mono text-xs text-muted-foreground`}>{m.source}</td>
                <td className={`${cell} text-right`}>
                  <button onClick={() => del(m.id)} className="rounded-md border border-warning/50 px-3 py-1 text-xs text-warning hover:bg-warning/10">{t("del")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
