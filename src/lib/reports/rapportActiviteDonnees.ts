import { supabase } from "@/integrations/supabase/client";

export type Row = {
  id: string; nom: string | null; prenom: string | null; type_apprenant: string | null;
  resultat_examen: string | null; date_examen_theorique: string | null;
  date_debut_formation: string | null; date_fin_formation: string | null; created_at: string;
};

export const annee = (s?: string | null) => s?.match(/(20\d\d)/)?.[1] ?? null;

export const categorie = (t?: string | null): string | null => {
  const v = (t || "").toLowerCase().trim();
  if (v === "continue-vtc") return "FC VTC";
  if (v === "continue-taxi") return "FC TAXI";
  if (v.startsWith("vtc")) return "VTC";
  if (v.startsWith("taxi")) return "TAXI";
  if (v.startsWith("ta")) return "TA";
  if (v.startsWith("va")) return "VA";
  return null;
};

export async function chargerTous(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("apprenants")
      .select("id, nom, prenom, type_apprenant, resultat_examen, date_examen_theorique, date_debut_formation, date_fin_formation, created_at")
      .is("deleted_at", null).not("type_apprenant", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data || []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type FcRow = { key: string; apprenantId: string; nom: string | null; prenom: string | null; debut: string | null; fin: string | null; factures: string[]; annee: string | null; cat: "FC VTC" | "FC TAXI" };

// Formation continue = stagiaires ayant au moins une facture rattachée à une session FC (ou dossier continue-*).
export async function chargerFc(): Promise<FcRow[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("factures")
      .select("numero, date_emission, apprenant_id, session_id, apprenants(id, nom, prenom, type_apprenant, date_debut_formation, date_fin_formation, deleted_at), sessions(id, nom, date_debut, date_fin)")
      .not("apprenant_id", "is", null).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const map = new Map<string, FcRow>();
  for (const f of rows) {
    const a = f.apprenants; const s = f.sessions;
    if (!a || a.deleted_at) continue;
    const t = (a.type_apprenant || "").toLowerCase();
    const sn = (s?.nom || "").toLowerCase();
    const isFc = t.startsWith("continue") || sn.includes("formation continue");
    if (!isFc) continue;
    const taxi = sn ? sn.includes("taxi") : t.includes("taxi");
    const cat = taxi ? "FC TAXI" : "FC VTC";
    const debut = s?.date_debut ?? a.date_debut_formation ?? null;
    const fin = s?.date_fin ?? a.date_fin_formation ?? null;
    const key = `${a.id}|${s?.id ?? "-"}`;
    const ex = map.get(key);
    if (ex) { if (f.numero && !ex.factures.includes(f.numero)) ex.factures.push(f.numero); continue; }
    map.set(key, { key, apprenantId: a.id, nom: a.nom, prenom: a.prenom, debut, fin, factures: f.numero ? [f.numero] : [], annee: annee(debut) ?? annee(f.date_emission), cat });
  }
  return [...map.values()];
}


/** Comptage partagé BPF / Rapport d'activité : même source, même règle. */
export function compterAnnee(rows: Row[], fcRows: FcRow[], an: string) {
  const stats: Record<string, { oui: number; non: number }> = {};
  const fc: Record<string, FcRow[]> = { "FC VTC": [], "FC TAXI": [] };
  const annees = new Set<string>([an]);
  for (const r of fcRows) { if (r.annee) annees.add(r.annee); if (r.annee === an) fc[r.cat].push(r); }
  for (const r of rows) {
    const c = categorie(r.type_apprenant);
    if (!c || c.startsWith("FC")) continue;
    const y = annee(r.date_examen_theorique);
    if (!y) continue;
    annees.add(y);
    if (y !== an) continue;
    const res = (r.resultat_examen || "").toLowerCase();
    if (res !== "oui" && res !== "non") continue;
    stats[c] ??= { oui: 0, non: 0 };
    stats[c][res as "oui" | "non"]++;
  }
  const initiale = Object.values(stats).reduce((t, s) => t + s.oui + s.non, 0);
  const continue_ = fc["FC VTC"].length + fc["FC TAXI"].length;
  return { stats, fc, annees: [...annees].sort().reverse(), initiale, continue_, total: initiale + continue_ };
}
