import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MED_PROMPT =
  "You are a medical-information assistant for a patient education app. Given a medicine name, respond ONLY with a JSON object (no markdown, no extra text) with exactly these keys: uses_en, uses_ta, dosage_en, dosage_ta, side_effects_en, side_effects_ta, precautions_en, precautions_ta. 'en' fields are plain, simple English; 'ta' fields are the same content in Tamil. Keep each field to 2–3 short sentences. Never give an exact dosage number for a specific patient — describe typical/common adult dosing only, and say it varies by patient. Do not diagnose, do not recommend starting/stopping a medicine. If the name is not a recognizable medicine, still return the JSON object with fields explaining that it could not be identified.";

async function callAI(system: string, user: string): Promise<unknown> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Please try again later.");
  if (!res.ok) throw new Error("The AI service is unavailable. Please try again.");
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (json.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The AI returned an unexpected answer. Please try again.");
  }
}

const medSchema = z.object({
  uses_en: z.string(), uses_ta: z.string(),
  dosage_en: z.string(), dosage_ta: z.string(),
  side_effects_en: z.string(), side_effects_ta: z.string(),
  precautions_en: z.string(), precautions_ta: z.string(),
});

export const lookupMedicine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("medicines")
      .select("id, name")
      .ilike("name", data.name.replace(/[%_]/g, ""))
      .maybeSingle();
    let med = existing;
    if (!med) {
      const parsed = medSchema.safeParse(await callAI(MED_PROMPT, data.name));
      if (!parsed.success) throw new Error("The AI returned an incomplete answer. Please try again.");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inserted, error } = await supabaseAdmin
        .from("medicines")
        .upsert({ name: data.name, source: "ai", ...parsed.data }, { onConflict: "name" })
        .select("id, name")
        .single();
      if (error) throw new Error("Could not save the medicine.");
      med = inserted;
    }
    await supabase.from("medicine_lookups").insert({ user_id: userId, medicine_id: med.id });
    return med;
  });

const reportSchema = z.object({ content_en: z.string().min(1), content_ta: z.string().min(1) });

export const generateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("medicine_lookups")
      .select("created_at, note, medicines(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rows || rows.length === 0) throw new Error("Look up at least one medicine before generating a report.");
    const list = rows
      .map((r) => `- ${(r.medicines as { name: string } | null)?.name ?? "?"} (${r.created_at.slice(0, 10)})${r.note ? ` — note: ${r.note}` : ""}`)
      .join("\n");
    const system =
      "You write neutral, plain-language summaries for a patient education app. Summarise the medicines the user has tracked, describe any patterns in their notes without diagnosing, and end with a reminder to consult a doctor or pharmacist. Never recommend starting or stopping medicines. Respond ONLY with a JSON object with exactly the keys content_en and content_ta (the same summary in Tamil), each 150–250 words.";
    const parsed = reportSchema.safeParse(await callAI(system, list));
    if (!parsed.success) throw new Error("The AI returned an incomplete report. Please try again.");
    const { data: rep, error } = await supabase
      .from("reports")
      .insert({ user_id: userId, ...parsed.data })
      .select("id")
      .single();
    if (error) throw new Error("Could not save the report.");
    return rep;
  });
