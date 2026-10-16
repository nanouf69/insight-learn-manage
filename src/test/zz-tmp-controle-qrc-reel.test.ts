// @vitest-environment node
// TEMPORAIRE — contrôle lecture seule des vraies fonctions d'affichage (supprimé après exécution).
import { it, vi } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = (import.meta as any).env;
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
vi.mock("@/integrations/supabase/client", () => ({ supabase: client }));

it("controle", async () => {
  const out: string[] = [];
  const s = JSON.parse(readFileSync("/root/.cache/lovable-auth/session.json", "utf8"));
  const sess = s.session ?? s;
  const { error: e0 } = await client.auth.setSession({ access_token: sess.access_token, refresh_token: sess.refresh_token });
  out.push("session " + (e0 ? e0.message : "ok"));
  const { fetchCoreMatiereStatesBulk } = await import("@/lib/coreExamPublication");
  const { fetchPassagesV2NonFiables } = await import("@/lib/passagesV2NonFiables");
  const { attacherSourceUnique, coreFiablePourLigne, noteExamenAffichee } = await import("@/lib/noteExamenAffichee");
  const { isExamAttemptPublicationPending } = await import("@/components/cours-en-ligne/exam-helpers");
  const cibles: Record<string, string[]> = {
    "8313311b-3d05-4057-a8f8-3b4f7d64db46": ["EB4"],
    "3dee8826-7bd9-4fbf-9481-4d3e5d201a0c": ["EB4", "EB5"],
    "d253d063-d93f-430e-85fb-fc1b07ce3a53": ["EB5-TAXI", "EB6-TAXI"],
  };
  const ids = Object.keys(cibles);
  const states = await fetchCoreMatiereStatesBulk(ids);
  const nonFiables = states ? await fetchPassagesV2NonFiables(states) : null;
  out.push(`states=${states ? "ok" : "null"} nonFiables=${nonFiables ? nonFiables.size : "null"}`);
  for (const id of ids) {
    const { data, error } = await client.from("apprenant_quiz_results").select("*").eq("apprenant_id", id).in("quiz_id", cibles[id]);
    out.push(`rows ${id.slice(0, 8)} ${data?.length} ${error?.message ?? ""}`);
    const st = states?.get(id) ?? [];
    const rows = (data || []).map((r: any) => attacherSourceUnique(r, states ? st : null, nonFiables))
      .filter((r: any) => /vtc2|t3p|francais|taxi2/.test(r.matiere_id) && !/__t\d/.test(r.matiere_id))
      .sort((a: any, b: any) => (a.quiz_id + a.matiere_id + a.tentative).localeCompare(b.quiz_id + b.matiere_id + b.tentative));
    for (const r of rows as any[]) {
      const n = noteExamenAffichee(r);
      const cf = coreFiablePourLigne(states ? st : null, r) as any;
      out.push(`RES ${id.slice(0, 8)} ${r.quiz_id} ${r.matiere_id} t${r.tentative} row=${r.id.slice(0, 8)} etat=${n.etat} note=${n.note20} source=${n.source} coreFiable=${cf?.attemptId ? cf.attemptId.slice(0, 8) : "non"} pending=${isExamAttemptPublicationPending([r])}`);
    }
  }
  writeFileSync("/tmp/qrc/affichage.txt", out.join("\n"));
}, 60000);
