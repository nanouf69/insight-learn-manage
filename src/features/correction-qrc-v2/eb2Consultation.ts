// EB2 VTC — consultation dans le correcteur V2 (lecture seule).
// Les copies EB2 VTC enregistrées sans fiche V2 sont projetées dans la même grille
// V2. Aucune écriture, aucune copie créée, aucune notation : la notation exige une
// vraie fiche QRC V2 côté serveur (core_correct_qrc), qui n'existe pas pour ces copies.
import { supabase } from "@/integrations/supabase/client";
import { EXAMENS_BLANCS_VTC } from "@/components/cours-en-ligne/examens-blancs-data";
import type { QrcReelle, SessionReelle, TentativeReelle } from "@/features/correction-qrc-v2/noyauReel";

export const PREFIXE_CONSULTATION = "consultation:";
export const MARQUEUR_CORRECTION_HISTORIQUE = "correction historique importée";
export const estConsultation = (id: string | null | undefined) => String(id ?? "").startsWith(PREFIXE_CONSULTATION);

export type ResultatEb2 = {
  id: string;
  apprenant_id: string;
  quiz_id: string;
  matiere_id: string;
  matiere_nom?: string | null;
  tentative: number | null;
  completed_at: string | null;
  details: any;
};

export type PreuveRemise = {
  apprenant_id: string;
  exercice_id: string;
  tentative: number | null;
  completed: boolean | null;
  status: string | null;
  submitted_at: string | null;
  reponses: unknown;
};

function memeJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => memeJson(v, b[i]));
  }
  const g = a as Record<string, unknown>, d = b as Record<string, unknown>;
  const k = Object.keys(g);
  return k.length === Object.keys(d).length && k.every((x) => Object.prototype.hasOwnProperty.call(d, x) && memeJson(g[x], d[x]));
}

export const exerciceIdEb2 = (r: Pick<ResultatEb2, "matiere_id" | "tentative">) =>
  `EB2__${r.matiere_id}${(r.tentative ?? 1) <= 1 ? "" : `__t${r.tentative}`}`;

/** Remise prouvée uniquement par la fiche exacte : même élève, exercice, tentative, statut remis et mêmes réponses. */
export function remiseProuvee(r: ResultatEb2, preuves: PreuveRemise[]): boolean {
  const exo = exerciceIdEb2(r);
  return preuves.some((p) => p.apprenant_id === r.apprenant_id && p.exercice_id === exo
    && (p.tentative ?? 1) === (r.tentative ?? 1) && p.completed === true && p.status === "submitted"
    && p.submitted_at != null && memeJson(p.reponses, r.details?.reponses ?? {}));
}

const matieresEb2 = () => {
  const eb = EXAMENS_BLANCS_VTC.find((e) => e.id === "EB2");
  return (eb?.matieres ?? []).map((m, i) => ({ subject_id: m.id, lettre: String.fromCharCode(65 + i), titre: m.nom, ordre: i }));
};

/** Projection pure d'un résultat EB2 vers la forme V2 (tentative + QRC). Jamais de note inventée. */
export function projeterResultatEb2(r: ResultatEb2, candidat: string, remise: boolean): { tentative: TentativeReelle; qrc: QrcReelle[] } {
  const attemptId = `${PREFIXE_CONSULTATION}${r.id}`;
  const det = r.details ?? {};
  const questionsSrc: any[] = det.snapshot?.questions ?? det.questions ?? [];
  const ref = matieresEb2();
  const mat = ref.find((m) => m.subject_id === r.matiere_id)
    ?? { subject_id: r.matiere_id, lettre: "?", titre: r.matiere_nom ?? r.matiere_id, ordre: 99 };
  const qrcSrc = questionsSrc.filter((q) => String(q?.type ?? "").toUpperCase() === "QRC");
  const enAttente = det.qrc_pending_correction === true;
  const corrections = (det.correctionsIA ?? {}) as Record<string, { pointsObtenus?: number }>;
  const tentative: TentativeReelle = {
    attempt_id: attemptId,
    apprenant_id: r.apprenant_id,
    exam_id: "EB2",
    exam_version_id: "consultation",
    etat: remise ? "terminee" : "remise_non_certifiee",
    snapshot: {
      exam_id: "EB2",
      matieres: [mat],
      questions: qrcSrc.map((q) => ({
        id: String(q.id), matiere: mat.subject_id, type: "QRC",
        enonce: String(q.enonce ?? ""), reponseQRC: q.reponseQRC ?? undefined,
        points: typeof q.points === "number" ? q.points : (null as unknown as number),
      })),
    },
    snapshot_fingerprint: "consultation",
    candidat,
    started_at: r.completed_at,
    finished_at: r.completed_at,
  };
  const qrc: QrcReelle[] = qrcSrc.map((q) => {
    const note = corrections[String(q.id)]?.pointsObtenus;
    // Correction considérée enregistrée seulement si la copie n'est pas marquée « en attente » et
    // qu'une note historique existe ; sinon la QRC reste à corriger. Origine = automatique historique.
    const corrigee = !enAttente && typeof note === "number";
    return {
      qrc_instance_id: `${attemptId}:${q.id}`,
      attempt_id: attemptId,
      question_id: String(q.id),
      apprenant_id: r.apprenant_id,
      reponse: det.reponses?.[String(q.id)] ?? null,
      etat: corrigee ? "corrigee" : "en_attente",
      note: corrigee ? note! : null,
      corrige_email: corrigee ? MARQUEUR_CORRECTION_HISTORIQUE : null,
      corrige_at: null,
    };
  });
  return { tentative, qrc };
}

/** Résultats EB2 VTC exacts (jamais EB2-TAXI) sans fiche V2 liée. Lecture paginée complète, erreur = échec. */
export async function lirePassagesEb2Consultation(): Promise<Array<{ id: string; apprenant_id: string; quiz_id: string; completed_at: string }>> {
  const lies = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("exam_attempts_v2")
      .select("rid:snapshot->source_historique->>result_id")
      .eq("exam_id", "EB2")
      .range(de, de + 999);
    if (error) throw error;
    (data ?? []).forEach((r: any) => { if (r.rid) lies.add(String(r.rid)); });
    if ((data ?? []).length < 1000) break;
  }
  const out: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("apprenant_quiz_results")
      .select("id, apprenant_id, quiz_id, completed_at")
      .eq("quiz_type", "examen_blanc")
      .eq("quiz_id", "EB2")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .range(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []).filter((r: any) => !lies.has(String(r.id))));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

/** Charge les copies EB2 en consultation (ids `consultation:<result_id>`) au format de la grille V2. */
export async function chargerConsultationEb2(attemptIds: string[]): Promise<SessionReelle> {
  const ids = attemptIds.filter(estConsultation).map((a) => a.slice(PREFIXE_CONSULTATION.length));
  const vide: SessionReelle = { tentatives: [], qrc: [], resultats: [], baremesRestaures: [] };
  if (!ids.length) return vide;
  const lignes: ResultatEb2[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("apprenant_quiz_results")
      .select("id, apprenant_id, quiz_id, matiere_id, matiere_nom, tentative, completed_at, details")
      .in("id", ids.slice(i, i + 100))
      .eq("quiz_id", "EB2");
    if (error) throw error;
    lignes.push(...((data ?? []) as any[]));
  }
  const eleves = Array.from(new Set(lignes.map((l) => l.apprenant_id)));
  const noms = new Map<string, string>();
  const preuves: PreuveRemise[] = [];
  for (let i = 0; i < eleves.length; i += 100) {
    const lot = eleves.slice(i, i + 100);
    const { data: a, error: ea } = await supabase.from("apprenants").select("id, nom, prenom").in("id", lot);
    if (ea) throw ea;
    (a ?? []).forEach((x: any) => noms.set(x.id, `${x.nom} ${x.prenom}`));
    const exos = Array.from(new Set(lignes.filter((l) => lot.includes(l.apprenant_id)).map(exerciceIdEb2)));
    const { data: p, error: ep } = await supabase
      .from("reponses_apprenants")
      .select("apprenant_id, exercice_id, tentative, completed, status, submitted_at, reponses")
      .in("apprenant_id", lot)
      .in("exercice_id", exos);
    if (ep) throw ep;
    preuves.push(...((p ?? []) as any[]));
  }
  for (const l of lignes) {
    const { tentative, qrc } = projeterResultatEb2(l, noms.get(l.apprenant_id) ?? "(apprenant)", remiseProuvee(l, preuves));
    if (!qrc.length) continue;
    vide.tentatives.push(tentative);
    vide.qrc.push(...qrc);
  }
  vide.tentatives.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
  return vide;
}
