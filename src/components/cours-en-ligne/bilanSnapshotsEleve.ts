import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Modules Bilan Examen concernés par les passages figés (VTC = 5, TAXI = 11).
export const MODULES_BILAN_SNAPSHOT = new Set([5, 11]);

export type SnapshotRow = {
  id: string;
  exercice_id: number;
  tentative: number;
  nb_questions: number;
  empreinte: string;
  questions: Array<{ position?: number; question_source?: any }>;
};

export type EtatSnapshotsEleve =
  | { statut: "inactif" }
  | { statut: "chargement" }
  | { statut: "pret"; parExo: Record<number, { snapshotId: string; empreinte: string; questions: any[] }>; rouges?: number[] }
  | { statut: "bloque"; raison: string };

/** Convertit un snapshot en questions affichables ; null si le snapshot est incomplet. */
export function questionsDepuisSnapshot(s: SnapshotRow): any[] | null {
  if (!s || !Array.isArray(s.questions)) return null;
  if (s.questions.length !== s.nb_questions || s.nb_questions <= 0) return null;
  const tri = [...s.questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const out = tri.map((q) => q?.question_source);
  if (out.some((q) => !q || q.id == null)) return null;
  return out;
}

/**
 * Règle : snapshot présent → lecture exclusive du snapshot ;
 * aucun snapshot et aucun passage migré → comportement inchangé ;
 * snapshot attendu (passage VERT/ORANGE) mais illisible → blocage (fail-closed),
 * jamais de retour silencieux au contenu actuel.
 */
export function calculerEtatSnapshots(
  snaps: SnapshotRow[] | null,
  categories: Array<{ exercice_id: number; tentative: number; categorie: string }> | null,
  erreur: boolean,
): EtatSnapshotsEleve {
  if (erreur || !snaps || !categories) return { statut: "bloque", raison: "lecture" };
  const parExo: Record<number, { snapshotId: string; empreinte: string; questions: any[] }> = {};
  // Dernière tentative figée par exercice.
  const dernier: Record<number, SnapshotRow> = {};
  snaps.forEach((s) => {
    const cur = dernier[s.exercice_id];
    if (!cur || s.tentative > cur.tentative) dernier[s.exercice_id] = s;
  });
  for (const s of Object.values(dernier)) {
    const qs = questionsDepuisSnapshot(s);
    if (!qs) return { statut: "bloque", raison: "snapshot_invalide" };
    parExo[s.exercice_id] = { snapshotId: s.id, empreinte: s.empreinte, questions: qs };
  }
  for (const c of categories) {
    if ((c.categorie === "VERT" || c.categorie === "ORANGE") && !parExo[c.exercice_id]) {
      return { statut: "bloque", raison: "snapshot_manquant" };
    }
  }
  // Ancien passage ROUGE conservé : matière fermée tant qu'aucune tentative autorisée n'est figée.
  const derniereCat: Record<number, { tentative: number; categorie: string }> = {};
  for (const c of categories) {
    const cur = derniereCat[c.exercice_id];
    if (!cur || c.tentative > cur.tentative) derniereCat[c.exercice_id] = c;
  }
  const rouges = Object.entries(derniereCat)
    .filter(([exo, c]) => c.categorie === "ROUGE" && !(dernier[Number(exo)] && dernier[Number(exo)].tentative > c.tentative))
    .map(([exo]) => Number(exo));
  return { statut: "pret", parExo, rouges };
}

/** Ouverture d'une matière Bilan : le serveur fige un nouveau passage ou ouvre une tentative autorisée. */
export async function ouvrirPassageEleve(moduleId: number, exoId: number): Promise<"fige" | "ancien" | "rouge_bloque" | "erreur"> {
  const { data, error } = await (supabase as any).rpc("bilan_ouvrir_passage_eleve", { p_module_id: moduleId, p_exercice_id: exoId });
  if (error) { console.error("[BilanSnapshot] ouverture passage", error); return "erreur"; }
  return (data?.statut as any) ?? "erreur";
}

export function useBilanSnapshotsEleve(apprenantId: string | undefined, moduleId: number, actif: boolean, rev = 0): EtatSnapshotsEleve {
  const concerne = actif && !!apprenantId && MODULES_BILAN_SNAPSHOT.has(moduleId);
  const [etat, setEtat] = useState<EtatSnapshotsEleve>(concerne ? { statut: "chargement" } : { statut: "inactif" });
  useEffect(() => {
    if (!concerne) { setEtat({ statut: "inactif" }); return; }
    let annule = false;
    // Rechargement après ouverture d'un passage : silencieux (pas de démontage de l'écran).
    if (rev === 0) setEtat({ statut: "chargement" });
    (async () => {
      const [s, c] = await Promise.all([
        (supabase as any).from("bilan_passage_snapshots")
          .select("id, exercice_id, tentative, nb_questions, empreinte, questions")
          .eq("apprenant_id", apprenantId).eq("module_id", moduleId),
        (supabase as any).from("bilan_passage_categories")
          .select("exercice_id, tentative, categorie")
          .eq("apprenant_id", apprenantId).eq("module_id", moduleId),
      ]);
      if (annule) return;
      const e = calculerEtatSnapshots(s.data ?? null, c.data ?? null, !!(s.error || c.error));
      if (e.statut === "bloque") console.error("[BilanSnapshot] passage figé illisible", e.raison, s.error ?? c.error ?? null);
      setEtat(e);
    })();
    return () => { annule = true; };
  }, [concerne, apprenantId, moduleId, rev]);
  return etat;
}

/**
 * Ancienne QRC conservée dans un passage figé (ex. les 48 QRC de H) : visible
 * pour respecter le contenu historique, mais jamais exigée, jamais comptée
 * comme non répondue, jamais dans la progression ni dans la note.
 * Même critère que l'écran : ce n'est pas une QRC saisissable et elle n'a aucune proposition.
 */
export function estAncienneQrcInformative(q: any): boolean {
  if (!q) return false;
  const choix = Array.isArray(q.choix) ? q.choix : [];
  if (choix.length > 0) return false;
  if (q.type === "qrc" || (Array.isArray(q.reponsesAttendues) && q.reponsesAttendues.length > 0)) return false;
  return String(q.type ?? "").toUpperCase() === "QRC";
}

/** Retire les anciennes QRC informatives des questions comptées, uniquement pour un exercice figé. */
export function questionsComptees<T>(etat: EtatSnapshotsEleve, exoId: number, questions: T[]): T[] {
  if (etat.statut !== "pret" || !etat.parExo[Number(exoId)]) return questions;
  return questions.filter((q) => !estAncienneQrcInformative(q));
}
