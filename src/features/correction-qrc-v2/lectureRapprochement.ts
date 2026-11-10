// Lecture serveur (lecture seule, paginée par identifiant) de l'inventaire attendu des copies d'EB.
// Une erreur de lecture est une erreur : jamais un « 0 manquante » rassurant.
import { supabase } from "@/integrations/supabase/client";
import { inventaireAttendu, nbQrcEcrites, rapprocher, type CopieManquante } from "@/features/correction-qrc-v2/inventaireCopies";

async function toutLire<T>(construire: (de: number) => any, ordre: string): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await construire(de).order(ordre, { ascending: true }).range(de, de + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export type Rapprochement = {
  attendues: number;
  visibles: number;
  manquantes: Array<CopieManquante & { nom: string }>;
  luLe: string;
};

export async function lireRapprochement(visibles: Set<string>): Promise<Rapprochement> {
  const db = supabase as any;
  const [tentatives, qrc, neut, tests, resultats] = await Promise.all([
    toutLire<any>(() => db.from("exam_attempts_v2").select("attempt_id, apprenant_id, exam_id, etat, rid:snapshot->source_historique->>result_id").eq("is_test", false), "attempt_id"),
    toutLire<any>(() => db.from("qrc_instances_v2").select("qrc_instance_id, attempt_id"), "qrc_instance_id"),
    toutLire<any>(() => db.from("core_tentatives_neutralisees").select("attempt_id"), "attempt_id"),
    toutLire<any>(() => db.from("comptes_test_techniques").select("apprenant_id"), "apprenant_id"),
    toutLire<any>(() => db.from("apprenant_quiz_results").select("id, apprenant_id, quiz_id, completed_at, rep:details->reponses").eq("quiz_type", "examen_blanc").ilike("quiz_id", "eb%"), "id"),
  ]);
  const qrcParTentative = new Map<string, number>();
  for (const q of qrc) qrcParTentative.set(q.attempt_id, (qrcParTentative.get(q.attempt_id) ?? 0) + 1);
  const attendues = inventaireAttendu({
    tentatives,
    qrcParTentative,
    neutralises: new Set(neut.map((n) => n.attempt_id)),
    exclus: new Set(tests.map((t) => t.apprenant_id)),
    resultats: resultats.map((r) => ({ id: r.id, apprenant_id: r.apprenant_id, quiz_id: r.quiz_id, completed_at: r.completed_at, qrc: nbQrcEcrites(r.rep) })),
  });
  const r = rapprocher(attendues, visibles);
  const ids = Array.from(new Set(r.manquantes.map((m) => m.apprenant_id)));
  const noms = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase.from("apprenants").select("id, nom, prenom").in("id", ids.slice(i, i + 150));
    if (error) throw error;
    (data ?? []).forEach((a: any) => noms.set(a.id, `${a.nom ?? ""} ${a.prenom ?? ""}`.trim()));
  }
  return { ...r, manquantes: r.manquantes.map((m) => ({ ...m, nom: noms.get(m.apprenant_id) ?? "(élève inconnu)" })), luLe: new Date().toISOString() };
}
