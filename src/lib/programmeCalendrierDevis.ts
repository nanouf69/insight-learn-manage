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
  pratique: Array<JourCalendrier & { heures: number }>;
  heuresPratique: number;
  valide: boolean;
  anomalies: string[];
}

/** Jours fériés légaux en France (métropole) : fixes + Pâques, Ascension, Pentecôte. */
export function joursFeriesFrance(annee: number): Map<string, string> {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = Date.UTC(annee, mois - 1, jour);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  const plus = (n: number) => iso(paques + n * 86400000);
  const y = String(annee);
  return new Map([
    [`${y}-01-01`, "Jour de l'an"], [plus(1), "Lundi de Pâques"], [`${y}-05-01`, "Fête du Travail"],
    [`${y}-05-08`, "Victoire 1945"], [plus(39), "Ascension"], [plus(50), "Lundi de Pentecôte"],
    [`${y}-07-14`, "Fête nationale"], [`${y}-08-15`, "Assomption"], [`${y}-11-01`, "Toussaint"],
    [`${y}-11-11`, "Armistice"], [`${y}-12-25`, "Noël"],
  ]);
}
export const jourFerie = (iso: string) => joursFeriesFrance(Number(iso.slice(0, 4))).get(iso) ?? null;

const jourSemaine = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/**
 * Règle pratique (présentiel) : 6 h le samedi de fin si la session finit un samedi,
 * sinon le dernier samedi qui précède la date de fin, 9h–12h / 13h–16h.
 * Refus (null + motif) si le samedi sort de la session, est férié ou est déjà un jour de cours.
 */
export function samediPratique(s: Pick<SessionPublique, "date_debut" | "date_fin" | "jours">): { jour: string | null; anomalie: string | null } {
  if (!s.date_debut || !s.date_fin || !/^\d{4}-\d{2}-\d{2}$/.test(s.date_fin)) return { jour: null, anomalie: "Date de fin de session inconnue : date de pratique à confirmer" };
  const d = new Date(`${s.date_fin}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));
  const jour = d.toISOString().slice(0, 10);
  if (jour < s.date_debut) return { jour: null, anomalie: "Session trop courte : aucun samedi entre le début et la fin, date de pratique à confirmer" };
  const ferie = jourFerie(jour);
  if (ferie) return { jour: null, anomalie: `Le samedi ${jour} prévu pour la pratique est férié (${ferie}) : date de pratique à confirmer` };
  if ((s.jours || []).some((j) => j.jour === jour && j.nature !== "pratique")) return { jour: null, anomalie: `Le samedi ${jour} est déjà occupé dans le calendrier : date de pratique à confirmer` };
  return { jour, anomalie: null };
}

/**
 * Calendrier journalier : cours du lundi au vendredi, pratique le samedi (6 h).
 * Publié seulement si les heures de cours saisies égalent exactement les heures de la session
 * et si la pratique saisie fait 6 h. Aucune divergence n'est corrigée automatiquement.
 */
export function calendrierSession(s: SessionPublique, filiere: Filiere): Calendrier {
  const heuresAttendues = heuresSessionPourApprenant(s, filiere);
  const anomalies: string[] = [];
  const jours: Calendrier["jours"] = [];
  const pratique: Calendrier["pratique"] = [];
  let heuresSaisies = 0, heuresPratique = 0;
  for (const j of (s.jours || []).filter((x) => x.nature === "cours")) {
    const h = heuresPlages(j.plages);
    if (h === null || h === 0) { anomalies.push(`Horaire invalide le ${j.jour}`); continue; }
    if (j.jour < s.date_debut || j.jour > s.date_fin) anomalies.push(`Le ${j.jour} est hors des dates de la session`);
    const w = jourSemaine(j.jour);
    if (w === 0 || w === 6) anomalies.push(`Le ${j.jour} n'est pas un jour de semaine (cours du lundi au vendredi)`);
    const ferie = jourFerie(j.jour);
    if (ferie) anomalies.push(`Le ${j.jour} est un jour férié (${ferie}) : à confirmer`);
    jours.push({ ...j, heures: h });
    heuresSaisies += h;
  }
  for (const j of (s.jours || []).filter((x) => x.nature === "pratique")) {
    const h = heuresPlages(j.plages);
    if (h === null || h === 0) { anomalies.push(`Horaire de pratique invalide le ${j.jour}`); continue; }
    if (jourSemaine(j.jour) !== 6) anomalies.push(`La pratique du ${j.jour} n'est pas un samedi`);
    const ferieP = jourFerie(j.jour);
    if (ferieP) anomalies.push(`La pratique du ${j.jour} tombe un jour férié (${ferieP}) : à confirmer`);
    if (j.jour < s.date_debut) anomalies.push(`La pratique du ${j.jour} est avant le début de la session`);
    pratique.push({ ...j, heures: h });
    heuresPratique += h;
  }
  const regle = samediPratique(s);
  if (!pratique.length) {
    if (regle.jour) { pratique.push({ jour: regle.jour, plages: PLAGES_JOURNEE, nature: "pratique", libelle: "Pratique (dernier samedi de la session)", heures: HEURES_PRATIQUE }); heuresPratique = HEURES_PRATIQUE; }
    else if (regle.anomalie) anomalies.push(regle.anomalie);
  } else if (regle.jour && !pratique.some((j) => j.jour === regle.jour)) {
    anomalies.push(`La pratique saisie (${pratique.map((j) => j.jour).join(", ")}) ne tombe pas le dernier samedi de la session (${regle.jour}) : à confirmer`);
  }
  if (heuresAttendues === null) anomalies.push("Durée totale de la session non déterminée");
  if (jours.length === 0) anomalies.push("Aucun jour de cours saisi par l'administration");
  else if (heuresAttendues !== null && Math.abs(heuresSaisies - heuresAttendues) > 1e-6) {
    const prevu = heuresAttendues + HEURES_PRATIQUE, saisi = heuresSaisies + (pratique.length ? heuresPratique : HEURES_PRATIQUE);
    anomalies.push(`Divergence à arbitrer : ${jours.length} jour(s) de cours = ${heuresSaisies} h au lieu de ${heuresAttendues} h, soit ${saisi} h avec la pratique au lieu des ${prevu} h prévues`);
  }
  if (pratique.length && Math.abs(heuresPratique - HEURES_PRATIQUE) > 1e-6) anomalies.push(`La pratique saisie totalise ${heuresPratique} h au lieu de ${HEURES_PRATIQUE} h`);
  return { heuresAttendues, heuresSaisies, jours, pratique, heuresPratique, valide: anomalies.length === 0, anomalies };
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

export interface LigneAgenda { jour: string | null; nature: "Théorie" | "Pratique"; plages: PlageHoraire[]; heures: number; cumul: number }
export interface AgendaAutomatique { lignes: LigneAgenda[]; total: number; attendu: number | null; valide: boolean; anomalies: string[] }

/**
 * Agenda jour par jour déduit des dates réelles de la session (affichage du devis uniquement) :
 * théorie du lundi au vendredi hors jours fériés, 6 h (journée) ou 4 h (soirée VTC),
 * puis pratique 6 h le dernier samedi (ou « date à confirmer par le centre »).
 * Si le nombre de jours ne donne pas exactement la durée de la session, l'agenda est refusé (aucun jour inventé ni retiré).
 */
export function agendaAutomatique(s: SessionPublique, filiere: Filiere, soir: boolean): AgendaAutomatique {
  const anomalies: string[] = [];
  const attendu = heuresSessionPourApprenant(s, filiere);
  const plages = soir ? PLAGES_SOIREE : PLAGES_JOURNEE;
  const parJour = heuresPlages(plages) ?? 0;
  const lignes: LigneAgenda[] = [];
  let cumul = 0;
  if (!s.date_debut || !s.date_fin) anomalies.push("Dates de session inconnues");
  else for (const j of joursOuvres(s.date_debut, s.date_fin)) {
    if (jourFerie(j)) continue;
    cumul += parJour;
    lignes.push({ jour: j, nature: "Théorie", plages, heures: parJour, cumul });
  }
  if (attendu === null) anomalies.push("Durée de théorie de la session non déterminée");
  else if (Math.abs(cumul - attendu) > 1e-6) anomalies.push(`Les ${lignes.length} jour(s) de cours de la session donnent ${cumul} h au lieu des ${attendu} h annoncées : agenda à confirmer par le centre`);
  const p = samediPratique(s);
  cumul += HEURES_PRATIQUE;
  lignes.push({ jour: p.jour, nature: "Pratique", plages: PLAGES_JOURNEE, heures: HEURES_PRATIQUE, cumul });
  return { lignes, total: cumul, attendu: attendu === null ? null : attendu + HEURES_PRATIQUE, valide: anomalies.length === 0, anomalies };
}
