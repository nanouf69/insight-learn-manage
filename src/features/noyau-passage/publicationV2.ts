/**
 * PUBLICATION DES SUJETS DANS LE NOYAU V2 — OUTILLAGE ADMIN
 * =========================================================
 *
 * Règles non négociables :
 *  - on ne publie QUE le contenu actif réellement servi à l'apprenant
 *    (module_editor_state, via useLiveExamens) : aucune reconstruction ;
 *  - avant publication on compare, question par question, ce contenu actif
 *    avec la DERNIÈRE VARIANTE RÉELLEMENT SERVIE (snapshot figé de la
 *    tentative la plus récente) : au moindre écart, arrêt et rapport ;
 *  - publier n'active rien : un passage ne bascule en V2 que si l'apprenant
 *    est raccordé côté serveur (core_bridge_actif_pour) ;
 *  - retour arrière possible : retrait de la version active, sans toucher
 *    aux tentatives, réponses, corrections ni notes déjà enregistrées.
 *
 * Aucune écriture de donnée pédagogique n'est faite ici.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExamenBlanc } from "@/components/cours-en-ligne/examens-blancs-data";
import { contenuVersionDepuisExamen, operationId, type ContenuVersion } from "./pontV2";

export type VersionPubliee = {
  id: string;
  exam_id: string;
  version_number: number;
  statut: string;
  fingerprint: string;
  published_at: string | null;
  retired_at: string | null;
  content: unknown;
};

/** Versions du noyau pour un ou plusieurs examens (lecture seule). */
export async function lireVersions(examIds: string[]): Promise<VersionPubliee[]> {
  if (examIds.length === 0) return [];
  const { data, error } = await supabase
    .from("exam_content_versions")
    .select("id, exam_id, version_number, statut, fingerprint, published_at, retired_at, content")
    .in("exam_id", examIds)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VersionPubliee[];
}

export const versionActive = (versions: VersionPubliee[], examId: string) =>
  versions.find((v) => v.exam_id === examId && v.statut === "publiee" && !v.retired_at) ?? null;

// ---------------------------------------------------------------------------
// COMPARAISON AVEC LA DERNIÈRE VARIANTE RÉELLEMENT SERVIE
// ---------------------------------------------------------------------------

type QuestionSnapshot = { id?: string; matiere?: string; ordre?: number; type?: string; enonce?: string; points?: number };

const normaliser = (t: unknown) => String(t ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export type EcartQuestion = {
  position: number;
  servi: string | null;
  actif: string | null;
  nature: "enonce" | "type" | "points" | "ajoutee" | "supprimee";
  detail?: string;
};

export type ComparaisonMatiere = {
  matiere: string;
  reference: "snapshot" | "aucune";
  dateReference: string | null;
  nbServi: number;
  nbActif: number;
  ecarts: EcartQuestion[];
};

export type Comparaison = {
  examId: string;
  matieres: ComparaisonMatiere[];
  nbEcarts: number;
  nbSansReference: number;
  publiable: boolean;
};

/**
 * Compare le contenu actif d'un examen avec la dernière variante servie.
 * Lecture seule. `publiable` est vrai uniquement si AUCUN écart n'est détecté.
 */
export async function comparerAvantPublication(examen: ExamenBlanc): Promise<Comparaison> {
  const contenu = contenuVersionDepuisExamen(examen);

  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id, snapshot, started_at")
    .eq("exam_id", contenu.exam_id)
    .order("started_at", { ascending: false })
    .limit(300);
  if (error) throw error;

  // Dernière tentative contenant chaque matière = variante réellement servie.
  const derniere = new Map<string, { questions: QuestionSnapshot[]; date: string }>();
  for (const ligne of (data ?? []) as { snapshot: unknown; started_at: string }[]) {
    const snap = ligne.snapshot as { questions?: QuestionSnapshot[] } | null;
    const questions = Array.isArray(snap?.questions) ? (snap!.questions as QuestionSnapshot[]) : [];
    for (const q of questions) {
      const m = String(q.matiere ?? "");
      if (!m || derniere.has(m)) continue;
      derniere.set(m, {
        date: ligne.started_at,
        questions: questions
          .filter((x) => String(x.matiere ?? "") === m)
          .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
      });
    }
  }

  const matieres: ComparaisonMatiere[] = contenu.matieres.map((m) => {
    const actives = contenu.questions.filter((q) => q.matiere === m.subject_id);
    const ref = derniere.get(m.subject_id) ?? null;
    if (!ref) {
      return {
        matiere: m.subject_id,
        reference: "aucune",
        dateReference: null,
        nbServi: 0,
        nbActif: actives.length,
        ecarts: [],
      };
    }
    const ecarts: EcartQuestion[] = [];
    const taille = Math.max(ref.questions.length, actives.length);
    for (let i = 0; i < taille; i++) {
      const s = ref.questions[i];
      const a = actives[i];
      if (s && !a) {
        ecarts.push({ position: i + 1, servi: s.enonce ?? "", actif: null, nature: "supprimee" });
        continue;
      }
      if (a && !s) {
        ecarts.push({ position: i + 1, servi: null, actif: a.enonce, nature: "ajoutee" });
        continue;
      }
      if (!a || !s) continue;
      if (normaliser(s.enonce) !== normaliser(a.enonce)) {
        ecarts.push({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "enonce" });
      } else if (normaliser(s.type) !== normaliser(a.type)) {
        ecarts.push({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "type", detail: `${s.type} → ${a.type}` });
      } else if (Number(s.points ?? 0) !== Number(a.points ?? 0)) {
        ecarts.push({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "points", detail: `${s.points} → ${a.points}` });
      }
    }
    return {
      matiere: m.subject_id,
      reference: "snapshot",
      dateReference: ref.date,
      nbServi: ref.questions.length,
      nbActif: actives.length,
      ecarts,
    };
  });

  const nbEcarts = matieres.reduce((n, m) => n + m.ecarts.length, 0);
  return {
    examId: contenu.exam_id,
    matieres,
    nbEcarts,
    nbSansReference: matieres.filter((m) => m.reference === "aucune").length,
    publiable: nbEcarts === 0,
  };
}

// ---------------------------------------------------------------------------
// CONTRÔLE APRÈS PUBLICATION
// ---------------------------------------------------------------------------

export type ControlePublication = { conforme: boolean; nbQuestions: number; ecarts: string[] };

/** Vérifie que la version enregistrée correspond exactement au contenu actif. */
export function controlerVersionPubliee(examen: ExamenBlanc, version: VersionPubliee): ControlePublication {
  const attendu = contenuVersionDepuisExamen(examen);
  const publie = (version.content ?? {}) as Partial<ContenuVersion>;
  const qp = Array.isArray(publie.questions) ? publie.questions : [];
  const ecarts: string[] = [];
  if (qp.length !== attendu.questions.length) {
    ecarts.push(`nombre de questions : ${qp.length} publiées vs ${attendu.questions.length} actives`);
  }
  attendu.questions.forEach((q, i) => {
    const p = qp[i];
    if (!p) return;
    if (p.id !== q.id) ecarts.push(`question ${i + 1} : identifiant différent`);
    else if (normaliser(p.enonce) !== normaliser(q.enonce)) ecarts.push(`question ${i + 1} : énoncé différent`);
    else if (Number(p.points ?? 0) !== Number(q.points ?? 0)) ecarts.push(`question ${i + 1} : barème différent`);
  });
  return { conforme: ecarts.length === 0, nbQuestions: qp.length, ecarts };
}

// ---------------------------------------------------------------------------
// RETOUR ARRIÈRE
// ---------------------------------------------------------------------------

/** Retire la version active : les nouveaux passages repartent sur l'ancien circuit. */
export async function retirerVersionExamen(examId: string, motif?: string) {
  const op = await operationId(`retire:${examId}:${Date.now()}`);
  const { data, error } = await supabase.rpc("core_retirer_version_examen", {
    p_operation_id: op,
    p_exam_id: examId,
    p_motif: motif ?? null,
  });
  if (error) throw error;
  return data;
}
