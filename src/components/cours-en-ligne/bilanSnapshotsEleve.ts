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
  | { statut: "pret"; parExo: Record<number, { snapshotId: string; empreinte: string; questions: any[] }> }
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
  return { statut: "pret", parExo };
}

export function useBilanSnapshotsEleve(apprenantId: string | undefined, moduleId: number, actif: boolean): EtatSnapshotsEleve {
  const concerne = actif && !!apprenantId && MODULES_BILAN_SNAPSHOT.has(moduleId);
  const [etat, setEtat] = useState<EtatSnapshotsEleve>(concerne ? { statut: "chargement" } : { statut: "inactif" });
  useEffect(() => {
    if (!concerne) { setEtat({ statut: "inactif" }); return; }
    let annule = false;
    setEtat({ statut: "chargement" });
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
  }, [concerne, apprenantId, moduleId]);
  return etat;
}
