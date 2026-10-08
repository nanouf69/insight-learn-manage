// Date d'inscription affichée : acceptation CPF (import Excel) prioritaire, sinon création CRM.
const MOIS: Record<string, number> = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12 };

export function dateInscriptionAffichee(a: { date_acceptation_cpf?: string | null; created_at?: string | null }) {
  if (a?.date_acceptation_cpf) return { date: a.date_acceptation_cpf.slice(0, 10), source: "cpf" as const };
  if (a?.created_at) return { date: a.created_at.slice(0, 10), source: "crm" as const };
  return null;
}

/** "2026-09-29", "29/09/2026" ou "29 septembre 2026" → Date (UTC midi). */
export function parseDateExamen(v: string | null | undefined): Date | null {
  if (!v) return null;
  const t = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  m = t.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (m && MOIS[m[2]]) return new Date(Date.UTC(+m[3], MOIS[m[2]] - 1, +m[1], 12));
  return null;
}

/** Jours ouvrés (lundi–vendredi) strictement après `debut` jusqu'à `fin` inclus. */
export function joursOuvresEntre(debut: Date, fin: Date): number {
  let n = 0;
  const d = new Date(debut);
  while (d < fin) {
    d.setUTCDate(d.getUTCDate() + 1);
    const j = d.getUTCDay();
    if (j !== 0 && j !== 6 && d <= fin) n++;
  }
  return n;
}

/** Rouge : moins de 15 jours ouvrés entre l'inscription et l'examen théorique. */
export function inscriptionTropTardive(dateIso: string, dateExamen: string | null | undefined, seuil = 15): boolean {
  const ex = parseDateExamen(dateExamen);
  const ins = parseDateExamen(dateIso);
  if (!ex || !ins) return false;
  return joursOuvresEntre(ins, ex) < seuil;
}

/** Rouge : inscription datant de moins de 15 jours ouvrés (par rapport à aujourd'hui). */
export function inscriptionRecente(dateIso: string, seuil = 15, aujourdhui = new Date()): boolean {
  const ins = parseDateExamen(dateIso);
  if (!ins) return false;
  const auj = new Date(Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate(), 12));
  return joursOuvresEntre(ins, auj) < seuil;
}
