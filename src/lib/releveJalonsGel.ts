import { supabase } from "@/integrations/supabase/client";

/**
 * Gel historique du relevé des jalons à la clôture admin explicite d'une formation terminée.
 * L'archive (table append-only `releve_jalons_gels`) remplace le calcul actuel pour toute
 * lecture/export ultérieurs : les questions ajoutées/supprimées ensuite ne la changent jamais.
 */
export const METHODE_GEL = "releve-jalons-v1 (durées CPF 12/10/2026)";
export const GEL_QUERY_KEY = "releve-jalons-gel";

export interface PayloadGel {
  calcul: any;
  preuvesJalons: any;
  session: any;
  elementsACompleter: string[];
  formationLabel: string;
  calculeLe: string;
}

export interface GelReleve {
  id: string;
  apprenant_id: string;
  version: number;
  payload: PayloadGel;
  empreinte: string;
  methode: string;
  motif: string;
  date_fin_formation: string;
  remplace_gel_id: string | null;
  cree_par: string;
  created_at: string;
}

/** JSON à clés triées : même contenu => même empreinte. */
export function jsonCanonique(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(jsonCanonique).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonique(obj[k])}`).join(",")}}`;
}

export async function empreinteGel(payload: PayloadGel): Promise<string> {
  const bytes = new TextEncoder().encode(jsonCanonique(payload));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Copie détachée (JSON) : l'archive ne partage aucune référence avec le calcul vivant. */
export function construirePayloadGel(p: Omit<PayloadGel, "calculeLe"> & { calculeLe?: string }): PayloadGel {
  return JSON.parse(JSON.stringify({ ...p, calculeLe: p.calculeLe ?? new Date().toISOString() }));
}

/** Dernière version du gel ; null = aucun gel ; erreur de lecture = exception (jamais « non figé » silencieux). */
export async function chargerGelReleve(apprenantId: string): Promise<GelReleve | null> {
  const { data, error } = await supabase.from("releve_jalons_gels" as any)
    .select("*").eq("apprenant_id", apprenantId).order("version", { ascending: false }).limit(1);
  if (error) throw error;
  const row = ((data as any[]) ?? [])[0] ?? null;
  if (!row) return null;
  // Contrôle d'intégrité : une archive dont l'empreinte ne correspond plus n'est jamais présentée comme figée.
  const recalc = await empreinteGel(row.payload);
  if (recalc !== row.empreinte) throw new Error("Archive du relevé illisible (empreinte non conforme)");
  return row as GelReleve;
}

/** Formation terminée (date de fin passée, jour Paris). Ne vaut PAS clôture : seule l'action admin fige. */
export function formationTerminee(apprenant: any, now = new Date()): boolean {
  const fin = apprenant?.date_fin_cours_en_ligne || apprenant?.date_fin_formation;
  if (!fin) return false;
  const jourParis = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  return String(fin).slice(0, 10) < jourParis;
}

export type ResultatGel = { statut: "cree" | "existant_identique" | "existant_conserve"; gel: GelReleve };

export async function figerReleve(params: { apprenantId: string; payload: PayloadGel; motif: string; adminId: string }): Promise<ResultatGel> {
  const motif = params.motif.trim();
  if (motif.length < 5) throw new Error("Motif de clôture obligatoire");
  const empreinte = await empreinteGel(params.payload);
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id !== params.adminId) throw new Error("Session administrateur modifiée : clôture annulée");
  const avant = await chargerGelReleve(params.apprenantId);
  const { data, error } = await supabase.rpc("figer_releve_jalons" as any, {
    _apprenant_id: params.apprenantId, _payload: params.payload as any, _empreinte: empreinte,
    _methode: METHODE_GEL, _motif: motif, _nouvelle_version: false,
  });
  if (error) throw error;
  const gel = (Array.isArray(data) ? data[0] : data) as GelReleve | null;
  if (!gel?.id || gel.apprenant_id !== params.apprenantId) throw new Error("Clôture non confirmée par le serveur");
  // Relecture serveur obligatoire avant d'annoncer « figé ».
  const relu = await chargerGelReleve(params.apprenantId);
  if (!relu || relu.id !== gel.id) throw new Error("Clôture non confirmée par relecture serveur");
  const statut = !avant ? "cree" : gel.empreinte === empreinte ? "existant_identique" : "existant_conserve";
  return { statut, gel: relu };
}

export function mentionGel(gel: GelReleve | null, apprenant: any): string {
  if (gel) {
    const d = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(gel.created_at));
    return `Relevé FIGÉ à la clôture le ${d} (version ${gel.version}, empreinte ${gel.empreinte.slice(0, 12)}…, ${gel.methode}). Les modifications ultérieures de questions ou de contenus ne s'appliquent pas à ce relevé.`;
  }
  if (formationTerminee(apprenant)) return "Formation terminée mais relevé NON figé : version historique non disponible — calcul sur le contenu ACTUEL, susceptible d'évoluer.";
  return "Formation en cours : calcul sur le contenu actuel (non figé).";
}
