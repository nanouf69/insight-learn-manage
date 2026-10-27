/**
 * Programme détaillé + calendrier joints au devis public.
 * Sources uniquement vérifiées : tableau CPF des jalons (jalonsPonderes),
 * heures de session (sessionHeures), sessions réelles et jours saisis par l'admin.
 * Rien n'est déduit : un élément absent est signalé « à confirmer ».
 */
import {
  BUDGET_CPF, EXAMENS_BLANCS_FILIERE, GRILLE_DUREES, INTRO, LABEL_PRESENTIEL, PRATIQUE_PHYSIQUE, type Filiere,
} from "@/lib/jalonsPonderes";
import { objectifsJalons } from "@/lib/objectifsJalons";
import { heuresSessionPourApprenant } from "@/lib/sessionHeures";
import { isPratiqueType } from "@/lib/sessionTypes";

export interface PlageHoraire { debut: string; fin: string }
export interface JourCalendrier { jour: string; plages: PlageHoraire[]; nature: "cours" | "pratique" | "examen"; libelle?: string | null }
export interface SessionPublique {
  id: string; nom: string; type_session: string | null; date_debut: string; date_fin: string;
  heure_debut: string | null; heure_fin: string | null; heures_total: number | null; lieu: string | null;
  types_apprenant: string[] | null; jours: JourCalendrier[];
}

export const PLAGES_JOURNEE: PlageHoraire[] = [{ debut: "09:00", fin: "12:00" }, { debut: "13:00", fin: "16:00" }];
export const PLAGES_SOIREE: PlageHoraire[] = [{ debut: "17:00", fin: "21:00" }];
export const HEURES_PRATIQUE = 6;

export type ModeFormation = "elearning" | "presentiel" | "pratique";
export interface FormationProgramme { filiere: Filiere; mode: ModeFormation; soir: boolean }

export function formationProgramme(formationId: string): FormationProgramme | null {
  const id = (formationId || "").toLowerCase();
  if (id.startsWith("fc_")) return null; // formation continue : programme dédié existant, hors périmètre
  const filiere: Filiere | null = id.startsWith("ta_") ? "ta" : id.startsWith("va_") ? "va" : id.startsWith("taxi") ? "taxi" : id.startsWith("vtc") ? "vtc" : null;
  if (!filiere) return null;
  const mode: ModeFormation = id.includes("elearning") ? "elearning" : id.includes("pratique") ? "pratique" : "presentiel";
  return { filiere, mode, soir: id.includes("soir") };
}

const CLE_PARCOURS: Record<Filiere, string> = { vtc: "vtc-e", taxi: "taxi-e", ta: "ta-e", va: "va-e" };

export interface LigneModule { moduleId: number; intitule: string; minutes: number }

/** Modules e-learning et durées prévisionnelles du tableau CPF approuvé (somme = total exact). */
export function modulesElearning(filiere: Filiere): { lignes: LigneModule[]; totalMinutes: number; coherent: boolean } {
  const intitules = new Map(objectifsJalons(CLE_PARCOURS[filiere]).map((o) => [o.moduleId, o.intitule]));
  const titre = (id: number) => (id === INTRO ? "Introduction" : intitules.get(id) ?? `Module ${id}`);
  const lignes: LigneModule[] = GRILLE_DUREES[filiere].map(([id, minutes]) => ({ moduleId: id, intitule: titre(id), minutes }));
  const eb = EXAMENS_BLANCS_FILIERE[filiere].moduleId;
  lignes.push({ moduleId: eb, intitule: "Examens blancs (6 épreuves)", minutes: BUDGET_CPF[filiere].examensBlancs });
  lignes.push({ moduleId: PRATIQUE_PHYSIQUE, intitule: LABEL_PRESENTIEL, minutes: BUDGET_CPF[filiere].presentiel });
  const totalMinutes = lignes.reduce((a, l) => a + l.minutes, 0);
  return { lignes, totalMinutes, coherent: totalMinutes === BUDGET_CPF[filiere].total };
}

const minutesDe = (h: string) => {
  const m = /^(\d{1,2})[:h](\d{2})$/.exec((h || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
export function heuresPlages(plages: PlageHoraire[]): number | null {
  let total = 0;
  for (const p of plages || []) {
    const d = minutesDe(p.debut), f = minutesDe(p.fin);
    if (!Number.isFinite(d) || !Number.isFinite(f) || f <= d) return null;
    total += f - d;
  }
  return total / 60;
}

export function estSessionSoir(s: Pick<SessionPublique, "nom" | "heure_debut">): boolean {
  return /soir/i.test(s.nom || "") || /^(1[7-9]|2[0-3])[:h]/.test((s.heure_debut || "").trim());
}

const types = (s: SessionPublique) => (s.types_apprenant || []).map((t) => String(t).toUpperCase());

/** Sessions théoriques réelles correspondant à la formation choisie. */
export function sessionsPourFormation(sessions: SessionPublique[], f: FormationProgramme): SessionPublique[] {
  if (f.mode !== "presentiel") return [];
  const code = f.filiere.toUpperCase();
  return sessions.filter((s) => {
    if (isPratiqueType(s.type_session) || /examen|continue|mobilit/i.test(`${s.type_session} ${s.nom}`)) return false;
    const t = types(s);
    const vise = t.includes(code) || new RegExp(`\\b${code}\\b`, "i").test(s.nom || "");
    if (!vise) return false;
    if (f.filiere === "vtc") return f.soir === estSessionSoir(s);
    return true;
  });
}

export const sessionsExamen = (sessions: SessionPublique[]) => sessions.filter((s) => /examen/i.test(`${s.type_session} ${s.nom}`));
export const sessionsPratique = (sessions: SessionPublique[], filiere: Filiere) => sessions.filter((s) => {
  if (!isPratiqueType(s.type_session)) return false;
  const t = types(s); const code = filiere === "ta" ? "TAXI" : filiere === "va" ? "VTC" : filiere.toUpperCase();
  return t.length === 0 || t.includes(code) || t.includes(filiere.toUpperCase());
});

export interface Calendrier {
  heuresAttendues: number | null;
  heuresSaisies: number;
  jours: Array<JourCalendrier & { heures: number }>;
  valide: boolean;
  anomalies: string[];
}

/** Calendrier journalier : publié seulement si les jours saisis totalisent exactement les heures de la session. */
export function calendrierSession(s: SessionPublique, filiere: Filiere): Calendrier {
  const heuresAttendues = heuresSessionPourApprenant(s, filiere);
  const anomalies: string[] = [];
  const jours: Calendrier["jours"] = [];
  let heuresSaisies = 0;
  for (const j of (s.jours || []).filter((x) => x.nature === "cours")) {
    const h = heuresPlages(j.plages);
    if (h === null || h === 0) { anomalies.push(`Horaire invalide le ${j.jour}`); continue; }
    if (j.jour < s.date_debut || j.jour > s.date_fin) anomalies.push(`Le ${j.jour} est hors des dates de la session`);
    jours.push({ ...j, heures: h });
    heuresSaisies += h;
  }
  if (heuresAttendues === null) anomalies.push("Durée totale de la session non déterminée");
  if (jours.length === 0) anomalies.push("Aucun jour de cours saisi par l'administration");
  else if (heuresAttendues !== null && Math.abs(heuresSaisies - heuresAttendues) > 1e-6)
    anomalies.push(`Les jours saisis totalisent ${heuresSaisies} h au lieu de ${heuresAttendues} h`);
  return { heuresAttendues, heuresSaisies, jours, valide: anomalies.length === 0, anomalies };
}

/** Jours ouvrés (lun–ven) de la période : simple proposition, jamais enregistrée sans action de l'admin. */
export function joursOuvres(debut: string, fin: string): string[] {
  const out: string[] = [];
  const d = new Date(`${debut}T12:00:00Z`), f = new Date(`${fin}T12:00:00Z`);
  for (; d <= f; d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Session réelle correspondant au libellé de dates choisi dans le devis. */
export function sessionPourDates(candidates: SessionPublique[], debut?: string | null): SessionPublique | null {
  if (!debut) return null;
  return candidates.find((s) => s.date_debut === debut) ?? null;
}
