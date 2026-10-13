import { supabase } from "@/integrations/supabase/client";

/**
 * Gel du relevé à la FIN EFFECTIVE DES ACCÈS e-learning (tâche serveur horaire
 * `geler_releves_fin_acces`, sans visite). Le relevé figé est recalculé
 * uniquement depuis le contenu et les sources figés côté serveur.
 * Seule exception : un ajout ADMIN d'heures de pratique crée une nouvelle version
 * (trigger serveur), l'ancienne reste intacte.
 */
export const GEL_QUERY_KEY = "releve-jalons-gel-fin-acces";

export interface GelFinAcces {
  id: string;
  apprenant_id: string;
  version: number;
  fin_acces: string;
  nature: "fin_acces" | "protection_apres_fin" | "ajout_pratique_admin";
  historique_prouve: boolean;
  contenu: Record<string, string>;
  sources: { completions: any[]; emargements: any[]; heures_validees: any[] };
  heures_validee_id: string | null;
  remplace_id: string | null;
  created_at: string;
}

export type EtatGel =
  | { etat: "fige"; gel: GelFinAcces }
  | { etat: "en_attente"; finAcces: string }
  | { etat: "actif" };

/** Erreur de lecture = exception : jamais de repli silencieux sur le calcul actuel. */
export async function chargerEtatGel(apprenantId: string): Promise<EtatGel> {
  const { data, error } = await supabase.from("releve_jalons_fin_acces" as any)
    .select("*").eq("apprenant_id", apprenantId).order("version", { ascending: false }).limit(1);
  if (error) throw error;
  const gel = ((data as any[]) ?? [])[0] as GelFinAcces | undefined;
  if (gel) {
    if (!gel.contenu || !gel.sources) throw new Error("Relevé figé illisible");
    return { etat: "fige", gel };
  }
  const { data: fin, error: finError } = await supabase.rpc("fin_acces_elearning" as any, { _id: apprenantId });
  if (finError) throw finError;
  return fin ? { etat: "en_attente", finAcces: String(fin) } : { etat: "actif" };
}

export type LigneFigee = { module_id: number; module_data: any; deleted_exercices: any; deleted_cours: any; updated_at: string | null };

/** Lit le contenu FIGÉ des modules demandés. Un module absent du gel n'avait pas de version enregistrée. */
export async function lireContenuFige(gel: GelFinAcces, moduleIds: number[]): Promise<LigneFigee[]> {
  const empreintes = [...new Set(moduleIds.map((id) => gel.contenu[String(id)]).filter(Boolean))];
  if (!empreintes.length) return [];
  const { data, error } = await supabase.from("contenu_module_fige" as any)
    .select("empreinte, module_id, module_data, deleted_exercices, deleted_cours, source_updated_at").in("empreinte", empreintes);
  if (error) throw error;
  const rows = (data as any[]) ?? [];
  if (rows.length !== empreintes.length) throw new Error("Contenu figé incomplet : relevé indisponible");
  return rows.map((r) => ({ module_id: r.module_id, module_data: r.module_data, deleted_exercices: r.deleted_exercices, deleted_cours: r.deleted_cours, updated_at: r.source_updated_at }));
}

const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
const jour = (d: string) => String(d).slice(0, 10).split("-").reverse().join("/");

export function mentionGel(etat: EtatGel | null): string {
  if (!etat) return "État du gel non lu.";
  if (etat.etat === "actif") return "Accès en cours : calcul sur le contenu actuel (non figé).";
  if (etat.etat === "en_attente") return `Accès terminés le ${jour(etat.finAcces)} : gel serveur en attente (prochaine exécution horaire) — aucun pourcentage affiché d'ici là.`;
  const g = etat.gel;
  const base = g.historique_prouve
    ? `Relevé FIGÉ à la fin des accès (${jour(g.fin_acces)}), gel du ${fmt(g.created_at)}.`
    : `Gel réalisé le ${fmt(g.created_at)} après la fin des accès (${jour(g.fin_acces)}) ; état historique à la fin des accès non disponible.`;
  const v = g.version > 1 ? ` Version ${g.version} : heures de pratique ajoutées par l'administration après le gel (version précédente conservée).` : "";
  return `${base}${v} Les modifications ultérieures de questions ou de contenus ne s'appliquent pas à ce relevé.`;
}
