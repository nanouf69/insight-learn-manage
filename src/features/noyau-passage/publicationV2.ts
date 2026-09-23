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

type ChoixSnapshot = { lettre?: string; texte?: string; correct?: boolean; correcte?: boolean };
type QuestionSnapshot = {
  id?: string;
  matiere?: string;
  ordre?: number;
  type?: string;
  enonce?: string;
  points?: number;
  choix?: ChoixSnapshot[] | null;
  reponseQRC?: string | null;
};

const normaliser = (t: unknown) => String(t ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const signatureChoix = (choix: unknown) =>
  Array.isArray(choix)
    ? JSON.stringify(
        (choix as ChoixSnapshot[]).map((c, i) => ({
          l: String(c?.lettre ?? String.fromCharCode(65 + i)).trim().toUpperCase(),
          t: normaliser(c?.texte),
        })),
      )
    : "[]";

const signatureBonnes = (choix: unknown) =>
  Array.isArray(choix)
    ? (choix as ChoixSnapshot[])
        .map((c, i) => (c?.correct ?? c?.correcte ? String(c?.lettre ?? String.fromCharCode(65 + i)).trim().toUpperCase() : null))
        .filter(Boolean)
        .join(",")
    : "";

/** Empreinte complète d'une question : sert au comptage de variantes. */
const signatureQuestion = (q: QuestionSnapshot) =>
  [
    normaliser(q.type),
    normaliser(q.enonce),
    signatureChoix(q.choix),
    signatureBonnes(q.choix),
    normaliser(q.reponseQRC),
    String(Number(q.points ?? 0)),
  ].join("::");

export type NatureEcart =
  | "enonce"
  | "type"
  | "points"
  | "propositions"
  | "bonnes_reponses"
  | "reponse_qrc"
  | "ajoutee"
  | "supprimee";

export type EcartQuestion = {
  position: number;
  servi: string | null;
  actif: string | null;
  nature: NatureEcart;
  detail?: string;
};

export type ComparaisonMatiere = {
  matiere: string;
  titre: string;
  reference: "snapshot" | "aucune";
  dateReference: string | null;
  nbServi: number;
  nbActif: number;
  nbQCM: number;
  nbQRC: number;
  baremeTotal: number;
  noteSur: number;
  nbVariantes: number;
  varianteServie: string | null;
  nbIdentiques: number;
  ecarts: EcartQuestion[];
  parNature: Record<NatureEcart, number>;
  idsManquants: number;
  idsDoublons: string[];
  resultat: "IDENTIQUE" | "ECART" | "SANS_REFERENCE";
};

export type ControleSnapshot = {
  suffisant: boolean;
  manques: string[];
};

export type QuestionAVerifier = { matiere: string; questionId: string; motif: string };

export type Comparaison = {
  examId: string;
  matieres: ComparaisonMatiere[];
  nbMatieres: number;
  nbQuestions: number;
  nbQCM: number;
  nbQRC: number;
  nbEcarts: number;
  nbSansReference: number;
  publiable: boolean;
  resultat: "IDENTIQUE" | "ECART";
  snapshot: ControleSnapshot;
  aVerifier: QuestionAVerifier[];
};

/**
 * Questions explicitement marquées « à vérifier » dans le contenu actif
 * (arbitrage pédagogique non tranché) : tant qu'il en reste une, le sujet
 * n'est pas publiable dans le noyau V2.
 */
export function questionsAVerifier(examen: ExamenBlanc): QuestionAVerifier[] {
  const matieres = (examen as unknown as { matieres?: unknown[] }).matieres ?? [];
  const sortie: QuestionAVerifier[] = [];
  for (const m of matieres as { id?: string; questions?: unknown[] }[]) {
    for (const q of (m?.questions ?? []) as { id?: unknown; verificationV2?: { aVerifier?: boolean; motif?: string } }[]) {
      if (q?.verificationV2?.aVerifier) {
        sortie.push({
          matiere: String(m?.id ?? ""),
          questionId: String(q?.id ?? ""),
          motif: String(q.verificationV2.motif ?? "arbitrage pédagogique requis"),
        });
      }
    }
  }
  return sortie;
}

const natureVide = (): Record<NatureEcart, number> => ({
  enonce: 0, type: 0, points: 0, propositions: 0, bonnes_reponses: 0, reponse_qrc: 0, ajoutee: 0, supprimee: 0,
});

/**
 * Contrôle d'autosuffisance : le contenu qui sera figé dans le snapshot V2
 * permet-il de recalculer la note plus tard SANS relire le sujet courant ?
 */
export function controlerAutosuffisanceSnapshot(contenu: ContenuVersion): ControleSnapshot {
  const manques: string[] = [];
  if (!contenu.matieres.length) manques.push("aucune matière");
  contenu.matieres.forEach((m) => {
    if (!m.subject_id) manques.push("matière sans identifiant");
    if (!Number(m.coefficient)) manques.push(`${m.subject_id} : coefficient absent`);
    if (!Number(m.note_sur)) manques.push(`${m.subject_id} : note sur absente`);
  });
  contenu.questions.forEach((q, i) => {
    const ref = `${q.matiere} n°${q.ordre ?? i + 1}`;
    if (!q.id) manques.push(`${ref} : identifiant absent`);
    if (!q.type) manques.push(`${ref} : type absent`);
    if (!Number(q.points)) manques.push(`${ref} : barème absent`);
    if (String(q.type).toUpperCase() === "QCM") {
      const choix = Array.isArray(q.choix) ? q.choix : [];
      if (choix.length === 0) manques.push(`${ref} : propositions absentes`);
      else if (!choix.some((c) => (c as ChoixSnapshot)?.correct ?? (c as ChoixSnapshot)?.correcte)) {
        manques.push(`${ref} : aucune bonne réponse marquée`);
      }
    } else if (!q.reponseQRC) {
      manques.push(`${ref} : réponse officielle QRC absente`);
    }
  });
  return { suffisant: manques.length === 0, manques: manques.slice(0, 30) };
}

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
    .limit(500);
  if (error) throw error;

  // Dernière tentative contenant chaque matière = variante réellement servie,
  // et recensement de TOUTES les variantes distinctes déjà servies.
  const derniere = new Map<string, { questions: QuestionSnapshot[]; date: string; empreinte: string }>();
  const variantes = new Map<string, Set<string>>();
  for (const ligne of (data ?? []) as { snapshot: unknown; started_at: string }[]) {
    const snap = ligne.snapshot as { questions?: QuestionSnapshot[] } | null;
    const questions = Array.isArray(snap?.questions) ? (snap!.questions as QuestionSnapshot[]) : [];
    const parMatiere = new Map<string, QuestionSnapshot[]>();
    for (const q of questions) {
      const m = String(q.matiere ?? "");
      if (!m) continue;
      parMatiere.set(m, [...(parMatiere.get(m) ?? []), q]);
    }
    for (const [m, qs] of parMatiere) {
      const triees = [...qs].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      const empreinte = triees.map(signatureQuestion).join("|").slice(0, 100000);
      const court = empreinte.length.toString(36) + ":" + hachageCourt(empreinte);
      if (!variantes.has(m)) variantes.set(m, new Set());
      variantes.get(m)!.add(court);
      if (!derniere.has(m)) derniere.set(m, { date: ligne.started_at, questions: triees, empreinte: court });
    }
  }

  const matieres: ComparaisonMatiere[] = contenu.matieres.map((m) => {
    const actives = contenu.questions.filter((q) => q.matiere === m.subject_id);
    const nbQCM = actives.filter((q) => String(q.type).toUpperCase() === "QCM").length;
    const bareme = actives.reduce((n, q) => n + Number(q.points ?? 0), 0);
    const compteIds = new Map<string, number>();
    let idsManquants = 0;
    actives.forEach((q) => {
      if (!q.id) idsManquants += 1;
      else compteIds.set(q.id, (compteIds.get(q.id) ?? 0) + 1);
    });
    const idsDoublons = [...compteIds.entries()].filter(([, n]) => n > 1).map(([id]) => id);

    const base = {
      matiere: m.subject_id,
      titre: m.titre,
      nbActif: actives.length,
      nbQCM,
      nbQRC: actives.length - nbQCM,
      baremeTotal: Math.round(bareme * 100) / 100,
      noteSur: Number(m.note_sur ?? 0),
      nbVariantes: variantes.get(m.subject_id)?.size ?? 0,
      idsManquants,
      idsDoublons,
    };

    const ref = derniere.get(m.subject_id) ?? null;
    if (!ref) {
      return {
        ...base,
        reference: "aucune" as const,
        dateReference: null,
        nbServi: 0,
        varianteServie: null,
        nbIdentiques: 0,
        ecarts: [],
        parNature: natureVide(),
        resultat: "SANS_REFERENCE" as const,
      };
    }

    const ecarts: EcartQuestion[] = [];
    const parNature = natureVide();
    let nbIdentiques = 0;
    const ajouter = (e: EcartQuestion) => {
      ecarts.push(e);
      parNature[e.nature] += 1;
    };
    const taille = Math.max(ref.questions.length, actives.length);
    for (let i = 0; i < taille; i++) {
      const s = ref.questions[i];
      const a = actives[i];
      if (s && !a) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: null, nature: "supprimee" });
        continue;
      }
      if (a && !s) {
        ajouter({ position: i + 1, servi: null, actif: a.enonce, nature: "ajoutee" });
        continue;
      }
      if (!a || !s) continue;
      const avant = ecarts.length;
      if (normaliser(s.enonce) !== normaliser(a.enonce)) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "enonce" });
      }
      if (normaliser(s.type) !== normaliser(a.type)) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "type", detail: `${s.type} → ${a.type}` });
      }
      if (signatureChoix(s.choix) !== signatureChoix(a.choix)) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "propositions" });
      }
      if (signatureBonnes(s.choix) !== signatureBonnes(a.choix)) {
        ajouter({
          position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "bonnes_reponses",
          detail: `${signatureBonnes(s.choix) || "—"} → ${signatureBonnes(a.choix) || "—"}`,
        });
      }
      if (normaliser(s.reponseQRC) !== normaliser(a.reponseQRC)) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "reponse_qrc" });
      }
      if (Number(s.points ?? 0) !== Number(a.points ?? 0)) {
        ajouter({ position: i + 1, servi: s.enonce ?? "", actif: a.enonce, nature: "points", detail: `${s.points} → ${a.points}` });
      }
      if (ecarts.length === avant) nbIdentiques += 1;
    }

    return {
      ...base,
      reference: "snapshot" as const,
      dateReference: ref.date,
      nbServi: ref.questions.length,
      varianteServie: ref.empreinte,
      nbIdentiques,
      ecarts,
      parNature,
      resultat: ecarts.length === 0 ? ("IDENTIQUE" as const) : ("ECART" as const),
    };
  });

  const nbEcarts = matieres.reduce((n, m) => n + m.ecarts.length, 0);
  const nbQCM = contenu.questions.filter((q) => String(q.type).toUpperCase() === "QCM").length;
  return {
    examId: contenu.exam_id,
    matieres,
    nbMatieres: contenu.matieres.length,
    nbQuestions: contenu.questions.length,
    nbQCM,
    nbQRC: contenu.questions.length - nbQCM,
    nbEcarts,
    nbSansReference: matieres.filter((m) => m.reference === "aucune").length,
    publiable: nbEcarts === 0,
    resultat: nbEcarts === 0 ? "IDENTIQUE" : "ECART",
    snapshot: controlerAutosuffisanceSnapshot(contenu),
  };
}

/** Hachage court non cryptographique : sert uniquement à nommer une variante. */
function hachageCourt(texte: string): string {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
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
