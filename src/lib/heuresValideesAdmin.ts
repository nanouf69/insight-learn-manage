import { supabase } from "@/integrations/supabase/client";

/**
 * Source UNIQUE des heures de présence validées par l'administration
 * (table append-only presentiel_heures_validees). Lecture seule.
 * - Une erreur de lecture est PROPAGÉE (jamais repliée sur 0 h).
 * - La date de saisie (created_at) n'est jamais présentée comme date de présence.
 * - Une catégorie absente reste « non renseignée » (jamais déduite « pratique »).
 */
export const CATEGORIES_PRESENCE: Record<string, string> = {
  theorie: "théorie",
  pratique: "pratique",
  generique: "présence générique",
};

export interface HeureValideeAdmin {
  id: string;
  heures: number;
  motif: string | null;
  createdAt: string;
  /** Jour de saisie, fuseau Europe/Paris (YYYY-MM-DD). */
  dateSaisie: string;
  /** Jour de présence réellement saisi, ou null si non renseigné (ancienne ligne). */
  datePresence: string | null;
  categorie: string | null;
  /** Saisie postérieure à la fin de formation (signalement, jamais un retrait). */
  saisieApresFin: boolean;
}

export const parisDay = (iso: string) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : "";

const frDay = (d: string) => { const [y, m, j] = d.split("-"); return `${j}/${m}/${y}`; };

export function libelleHeureValidee(r: HeureValideeAdmin, ascii = false): string {
  const cat = r.categorie ? CATEGORIES_PRESENCE[r.categorie] ?? r.categorie : "catégorie non renseignée";
  const date = r.datePresence ? `présence du ${frDay(r.datePresence)}` : "date de présence non renseignée";
  const parts = [`Présence validée par l'administration — ${cat}, ${date}, saisie le ${frDay(r.dateSaisie)}`];
  if (r.saisieApresFin) parts.push("saisie après la fin de formation");
  const s = parts.join(" — ");
  return ascii ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/—/g, "-") : s;
}

export function normaliserHeuresValidees(rows: any[], dateFinFormation?: string | null): HeureValideeAdmin[] {
  const fin = dateFinFormation ? String(dateFinFormation).slice(0, 10) : null;
  const seen = new Set<string>();
  const out: HeureValideeAdmin[] = [];
  for (const r of rows ?? []) {
    const heures = Number(r?.heures) || 0;
    if (!r?.created_at || heures <= 0) continue;
    const id = String(r.id ?? `${r.created_at}|${heures}`);
    if (seen.has(id)) continue; // une ligne = un seul comptage
    seen.add(id);
    const dateSaisie = parisDay(r.created_at);
    out.push({
      id, heures, motif: r.motif ?? null, createdAt: r.created_at, dateSaisie,
      datePresence: r.date_presence ? String(r.date_presence).slice(0, 10) : null,
      categorie: r.categorie ?? null,
      saisieApresFin: !!fin && dateSaisie > fin,
    });
  }
  return out;
}

export async function fetchHeuresValideesAdmin(apprenantId: string, dateFinFormation?: string | null) {
  const { data, error } = await supabase
    .from("presentiel_heures_validees" as any)
    .select("id, heures, motif, created_at, date_presence, categorie")
    .eq("apprenant_id", apprenantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Heures validées par l'administration indisponibles (lecture refusée ou en erreur)");
  const items = normaliserHeuresValidees((data as any[]) ?? [], dateFinFormation);
  const minutes = Math.round(items.reduce((s, r) => s + r.heures, 0) * 60);
  // journees : pour le relevé PDF. La date affichée est celle de présence si connue,
  // sinon la date de saisie, explicitement libellée comme telle.
  const journees = items.map((r) => ({ date: r.datePresence ?? r.dateSaisie, label: libelleHeureValidee(r, true) }));
  const lignes = items.map((r) => ({ date: r.datePresence ?? r.dateSaisie, heures: r.heures, label: libelleHeureValidee(r) }));
  return { minutes, journees, lignes, items };
}

/** Clés de cache à invalider après une écriture CONFIRMÉE par le serveur. */
export const HEURES_VALIDEES_EVENT = "heures-validees-changed";
