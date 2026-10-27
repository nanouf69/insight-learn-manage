import type { CreneauKey } from "@/lib/agendaSlots";

export interface CreneauAttendu { date: string; creneau: CreneauKey }
export interface LigneEmargement { date_emargement: string; demi_journee: string; signature_data_url?: string | null; absent?: boolean | null }

/** Créneau traité = signature réelle enregistrée OU absence déclarée (jamais une ligne vide). */
export function clesTraitees(rows: LigneEmargement[]): Set<string> {
  return new Set(rows
    .filter((r) => Boolean(String(r.signature_data_url || "").trim()) || r.absent === true)
    .map((r) => `${r.date_emargement}|${r.demi_journee}`));
}

/**
 * Feuille due à présenter : celle du jour (heure de Paris) d'abord, puis la plus ancienne
 * restée non signée. Les créneaux passés ne sont jamais retirés ; ils sont comptés à part.
 */
export function choisirFeuilleDue(expected: CreneauAttendu[], traitees: Set<string>, todayISO: string) {
  const ordre = [...new Map(expected.map((e) => [`${e.date}|${e.creneau}`, e])).values()]
    .sort((a, b) => (a.date === b.date ? (a.creneau === "matin" ? -1 : b.creneau === "matin" ? 1 : a.creneau.localeCompare(b.creneau)) : a.date.localeCompare(b.date)));
  const dues = ordre.filter((e) => !traitees.has(`${e.date}|${e.creneau}`));
  const next = dues.find((e) => e.date === todayISO) || dues[0] || null;
  return { next, dues, enRetard: dues.filter((e) => e.date < todayISO).length };
}

/** Identité d'une authentification : une nouvelle connexion du même compte change last_sign_in_at. */
export function cleAuthentification(user: { id: string; last_sign_in_at?: string | null } | null | undefined): string | null {
  return user ? `${user.id}|${user.last_sign_in_at ?? ""}` : null;
}

/**
 * Ouverture automatique : une fois par authentification et par feuille. Jamais pendant un
 * module, un quiz ou un examen (la feuille reste due et s'ouvre en sortant).
 */
export class SuiviOuvertureEmargement {
  private auth: string | null = null;
  private cles = new Set<string>();
  doitOuvrir(auth: string | null, cleFeuille: string | null, occupe: boolean): boolean {
    if (auth !== this.auth) { this.auth = auth; this.cles = new Set(); }
    if (!auth || !cleFeuille || occupe || this.cles.has(cleFeuille)) return false;
    this.cles.add(cleFeuille);
    return true;
  }
}
