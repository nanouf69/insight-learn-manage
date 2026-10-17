import { supabase } from '@/integrations/supabase/client';
// complet = compte EXACT atteint (jamais « >= ») : la mention EDOF ne s'affiche qu'au nombre précis.

// ================== Signatures d'émargement manquantes ==================
// Calcul purement indicatif, lecture seule : à partir des sessions réellement
// attribuées à l'apprenant (théorique + pratique) et de ses réservations de
// pratique, on liste les créneaux passés sans signature enregistrée.
// Aucun jour n'est inventé : seuls les jours couverts par une session ou une
// réservation existante sont attendus. Aucune écriture, aucune mutation.

export interface SignatureManquante {
  date: string;
  creneau: string;
  source: string;
  etat: 'manquante' | 'absence_enregistree';
}

const DEMI_LABELS: Record<string, string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
  soir: 'Soir',
  soir_1: 'Soir 1 (17h-18h30)',
  soir_2: 'Soir 2 (18h30-21h)',
};

export function dateDuJourParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
}

const normDate = (value: unknown) => String(value ?? '').slice(0, 10);
const estDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const annulee = (s: any) => /annul/i.test(String(s?.statut ?? ''));
/** Inscription confirmée par l'admin comme hors périmètre d'émargement (anciennes sessions conservées, jamais supprimées). */
const inscriptionExclue = (row: any) => row?.emargements_exclus === true;

/** Créneaux attendus pour une journée selon les horaires de session (jamais de pratique déduite du soir). */
export function creneauxAttendus(heureDebut?: string | null, heureFin?: string | null): string[] {
  const start = String(heureDebut ?? '').slice(0, 5);
  const end = String(heureFin ?? '').slice(0, 5);
  const valide = (v: string) => /^\d{2}:\d{2}$/.test(v);
  if (valide(start) && start >= '17:00') return ['soir_1', 'soir_2'];
  if (valide(start) && start >= '13:00') return ['apres_midi'];
  if (valide(start) && valide(end) && end <= '12:00') return ['matin'];
  // Horaires standards : journée 9h-12h / 13h-16h (mémoire horaires-standards)
  return ['matin', 'apres_midi'];
}

/** Les sessions théoriques ne tiennent jamais le week-end (constaté sur les émargements réels : lundi-vendredi uniquement). */
function joursOuvres(debut: string, fin: string): string[] {
  const out: string[] = [];
  const d = new Date(`${debut}T00:00:00Z`);
  const end = new Date(`${fin}T00:00:00Z`);
  for (let i = 0; d <= end && i < 400; i++) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Fonction pure : attendus (sessions + réservations) vs signatures réelles ; les dates futures ne sont jamais « manquantes ». */
export function calculerSignaturesManquantes(
  emargements: any[],
  sessionRows: any[],
  reservations: any[],
  dateReference: string = dateDuJourParis(),
): SignatureManquante[] {
  const signes = new Set<string>();
  const absents = new Set<string>();
  for (const e of emargements ?? []) {
    if (e?.masque === true) continue;
    const date = normDate(e?.date_emargement);
    const demi = String(e?.demi_journee ?? '').trim().toLowerCase();
    if (!estDate(date) || !demi) continue;
    const key = `${date}|${demi}`;
    const signe =
      (typeof e?.signature_data_url === 'string' && /^data:image\/(png|jpeg|jpg);base64,/i.test(e.signature_data_url)) ||
      !!e?.signed_at;
    if (signe) signes.add(key);
    else if (e?.absent === true) absents.add(key);
  }

  const attendus = new Map<string, { creneau: string; source: string }>();
  const attendre = (date: string, creneau: string, source: string) => {
    const key = `${date}|${creneau}`;
    if (!attendus.has(key)) attendus.set(key, { creneau, source });
  };

  // Sessions pratiques par date : leurs horaires explicites priment sur une
  // réservation « journée » du même jour (9h-12h ne devient jamais matin + après-midi).
  const pratiqueSessionParDate = new Map<string, { creneaux: string[]; nom: string }>();
  // Dates pratiques exclues du périmètre : une réservation du même jour ne doit
  // jamais contourner l'exclusion confirmée par l'admin.
  const pratiqueExclues = new Set<string>();
  for (const row of sessionRows ?? []) {
    const s = row?.sessions;
    if (!s) continue;
    const type = String(s.type_session ?? '').toLowerCase();
    if (!type.includes('pratique')) continue;
    const date = normDate(s.date_debut);
    if (!estDate(date)) continue;
    if (inscriptionExclue(row)) {
      pratiqueExclues.add(date);
      continue;
    }
    if (row?.liste_attente === true || annulee(s)) continue;
    const creneaux = creneauxAttendus(row.heure_debut_personnalisee ?? s.heure_debut, row.heure_fin_personnalisee ?? s.heure_fin);
    if (!pratiqueSessionParDate.has(date)) pratiqueSessionParDate.set(date, { creneaux, nom: String(s.nom ?? 'Pratique') });
  }

  for (const row of sessionRows ?? []) {
    const s = row?.sessions;
    if (!s || row?.liste_attente === true || annulee(s) || inscriptionExclue(row)) continue;
    const type = String(s.type_session ?? '').toLowerCase();
    const debutH = row.heure_debut_personnalisee ?? s.heure_debut;
    const finH = row.heure_fin_personnalisee ?? s.heure_fin;
    if (type.includes('pratique')) {
      const date = normDate(s.date_debut);
      if (!estDate(date)) continue;
      const source = `Pratique — session « ${s.nom ?? 'Pratique'} »`;
      for (const c of creneauxAttendus(debutH, finH)) attendre(date, c, source);
    } else if (type.includes('theorique')) {
      // Bornes réelles du cours : la ligne d'inscription peut porter une date
      // de fin d'accès e-learning au-delà de la session (ex. 31/10) — on ne
      // peut pas exiger d'émargement hors des dates de la session, ni avant
      // son début. Intersection des deux bornes, jamais d'extension.
      const debutBrut = normDate(row.date_debut || s.date_debut);
      const finBrute = normDate(row.date_fin_personnalisee || row.date_fin || s.date_fin || s.date_debut);
      const debutSession = normDate(s.date_debut);
      const finSession = normDate(s.date_fin || s.date_debut);
      const debut = debutSession && estDate(debutSession) ? (debutBrut > debutSession ? debutBrut : debutSession) : debutBrut;
      const fin = finSession && estDate(finSession) ? (finBrute < finSession ? finBrute : finSession) : finBrute;
      if (!estDate(debut) || !estDate(fin) || fin < debut) continue;
      const source = `Théorie — session « ${s.nom ?? 'Session'} »`;
      for (const date of joursOuvres(debut, fin)) {
        for (const c of creneauxAttendus(debutH, finH)) attendre(date, c, source);
      }
    }
    // type_session « examen » : présence suivie par convocation, jamais exigée en émargement ici.
  }

  for (const r of reservations ?? []) {
    const date = normDate(r?.date_choisie);
    if (!estDate(date)) continue;
    const v = String(r?.creneau ?? '').toLowerCase();
    const creneaux = v.includes('apres') || v.includes('aprem') ? ['apres_midi'] : v.includes('matin') ? ['matin'] : ['matin', 'apres_midi'];
    const type = String(r?.type_formation ?? '').toUpperCase() || 'PRATIQUE';
    // Une session pratique du même jour avec horaires explicites prime : on n'attend
    // que ses créneaux (une réservation « journée » ne crée pas d'après-midi fictif).
    // Une inscription pratique exclue du périmètre n'est jamais contournée par sa réservation.
    if (pratiqueExclues.has(date)) continue;
    const sessionDuJour = pratiqueSessionParDate.get(date);
    if (sessionDuJour) continue;
    for (const c of creneaux) attendre(date, c, `Pratique ${type} — réservation`);
  }

  const manquantes: SignatureManquante[] = [];
  for (const [key, { creneau, source }] of attendus) {
    const date = key.slice(0, 10);
    if (date > dateReference) continue; // créneau à venir : rien à reprocher
    if (signes.has(key)) continue;
    manquantes.push({ date, creneau: DEMI_LABELS[creneau] ?? creneau, source, etat: absents.has(key) ? 'absence_enregistree' : 'manquante' });
  }
  manquantes.sort((a, b) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau));
  return manquantes;
}

async function paginer(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let p = 0; p < 50; p++) {
    const { data, error } = await build(p * 1000, p * 1000 + 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Données indisponibles');
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
  throw new Error('Volume trop important : calcul refusé');
}

export async function chargerSignaturesManquantes(apprenantId: string): Promise<SignatureManquante[]> {
  if (!apprenantId) throw new Error('Apprenant requis');
  const [emargRes, sessionsRes, reservationsRes] = await Promise.all([
    paginer((f, t) => supabase.from('emargements_fc').select('id, date_emargement, demi_journee, signature_data_url, signed_at, absent, masque').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('session_apprenants').select('id, liste_attente, emargements_exclus, date_debut, date_fin, date_fin_personnalisee, heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, nom, statut, date_debut, date_fin, heure_debut, heure_fin)').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('reservations_pratique').select('id, date_choisie, type_formation, creneau').eq('apprenant_id', apprenantId).order('id').range(f, t)),
  ]);
  return calculerSignaturesManquantes(emargRes, sessionsRes, reservationsRes);
}

// ── Objectif EDOF : nombre de signatures attendues selon la formation ──
// VTC journée et soir : 20 théorie + 2 pratique = 22 ;
// TAXI : 30 + 2 = 32. Signature comptée une seule fois par date + créneau.

/** Dates réellement prévues au planning (théorie = jours ouvrés des sessions, pratique = sessions/réservations). */
export function datesDuPlanning(sessionRows: any[], reservations: any[]): { datesTheorie: Set<string>; datesPratique: Set<string>; soir: boolean } {
  const datesPratique = new Set<string>();
  const datesTheorie = new Set<string>();
  let soir = false;
  for (const row of sessionRows ?? []) {
    const s = row?.sessions;
    if (!s || row?.liste_attente === true || annulee(s) || inscriptionExclue(row)) continue;
    const type = String(s.type_session ?? '').toLowerCase();
    if (type.includes('pratique')) {
      const d = normDate(s.date_debut);
      if (estDate(d)) datesPratique.add(d);
    } else if (type.includes('theorique')) {
      const h = String(row.heure_debut_personnalisee ?? s.heure_debut ?? '').slice(0, 5);
      if (h >= '17:00') soir = true;
      // Mêmes bornes que les signatures manquantes : intersection inscription ∩ session.
      const debutBrut = normDate(row.date_debut || s.date_debut);
      const finBrute = normDate(row.date_fin_personnalisee || row.date_fin || s.date_fin || s.date_debut);
      const debutSession = normDate(s.date_debut);
      const finSession = normDate(s.date_fin || s.date_debut);
      const debut = estDate(debutSession) ? (debutBrut > debutSession ? debutBrut : debutSession) : debutBrut;
      const fin = estDate(finSession) ? (finBrute < finSession ? finBrute : finSession) : finBrute;
      if (estDate(debut) && estDate(fin) && fin >= debut) for (const d of joursOuvres(debut, fin)) datesTheorie.add(d);
    }
  }
  for (const r of reservations ?? []) {
    const d = normDate(r?.date_choisie);
    if (estDate(d)) datesPratique.add(d);
  }
  return { datesTheorie, datesPratique, soir };
}
export interface BilanSignaturesEdof {
  filiere: 'VTC' | 'TAXI' | 'TA';
  excedent: boolean;
  soir: boolean;
  theorie: number;
  pratique: number;
  total: number;
  /** Signatures conservées mais hors des dates du planning (non comptées). */
  horsPlanning: { date: string; creneau: string }[];
  objectifTheorie: number;
  objectifPratique: number;
  objectifTotal: number;
  complet: boolean;
}

export function calculerBilanSignaturesEdof(
  emargements: any[],
  sessionRows: any[],
  reservations: any[],
  formation: string,
): BilanSignaturesEdof {
  const f = String(formation ?? '').toLowerCase();
  const filiere: 'VTC' | 'TAXI' | 'TA' = /(^|[^a-z])ta([^a-z]|$)/.test(f) ? 'TA' : /taxi/.test(f) && !/vtc/.test(f) ? 'TAXI' : 'VTC';
  const { datesTheorie, datesPratique, soir } = datesDuPlanning(sessionRows, reservations);
  const vus = new Set<string>();
  let theorie = 0;
  let pratique = 0;
  const horsPlanning: { date: string; creneau: string }[] = [];
  for (const e of emargements ?? []) {
    if (e?.masque === true) continue;
    const date = normDate(e?.date_emargement);
    const demi = String(e?.demi_journee ?? '').trim().toLowerCase();
    if (!estDate(date) || !demi) continue;
    const signe =
      (typeof e?.signature_data_url === 'string' && /^data:image\/(png|jpeg|jpg);base64,/i.test(e.signature_data_url)) ||
      !!e?.signed_at;
    const key = `${date}|${demi}`;
    if (!signe || vus.has(key)) continue;
    vus.add(key);
    if (datesPratique.has(date)) pratique++;
    else if (datesTheorie.has(date)) theorie++;
    else horsPlanning.push({ date, creneau: DEMI_LABELS[demi] ?? demi });
  }
  horsPlanning.sort((a, b) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau));
  const objectifTheorie = filiere === 'TAXI' ? 30 : 20;
  const objectifPratique = 2;
  return {
    filiere, soir, theorie, pratique, total: theorie + pratique, horsPlanning,
    objectifTheorie, objectifPratique, objectifTotal: objectifTheorie + objectifPratique,
    complet: theorie === objectifTheorie && pratique === objectifPratique,
    excedent: theorie > objectifTheorie || pratique > objectifPratique,
  };
}

export async function chargerBilanSignaturesEdof(apprenantId: string, formation: string): Promise<BilanSignaturesEdof> {
  if (!apprenantId) throw new Error('Apprenant requis');
  const [emargRes, sessionsRes, reservationsRes] = await Promise.all([
    paginer((f, t) => supabase.from('emargements_fc').select('id, date_emargement, demi_journee, signature_data_url, signed_at, absent, masque').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('session_apprenants').select('id, liste_attente, emargements_exclus, date_debut, date_fin, date_fin_personnalisee, heure_debut_personnalisee, sessions:session_id(type_session, statut, date_debut, date_fin, heure_debut)').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('reservations_pratique').select('id, date_choisie').eq('apprenant_id', apprenantId).order('id').range(f, t)),
  ]);
  return calculerBilanSignaturesEdof(emargRes, sessionsRes, reservationsRes, formation);
}

// ── Classification attendu / valide / hors session ──
// Lecture seule : chaque signature réelle est classée par rapport aux inscriptions
// de sessions (théorique + pratique) et réservations. Les signatures hors périmètre
// sont conservées et signalées, jamais effacées ni réattribuées ; les créneaux
// signés qui ne correspondent pas aux horaires de la session du jour remontent en
// anomalie explicite (aucune heure inventée, aucun antidatage).

export interface SignatureClassee {
  date: string;
  creneau: string;
  source?: string;
}

export interface AnomalieSignature {
  date: string;
  creneau: string;
  detail: string;
}

export interface ClassificationSignatures {
  /** Créneaux passés attendus sans signature (périmètre confirmé uniquement). */
  attendus: SignatureManquante[];
  /** Signatures réelles dans le périmètre des inscriptions retenues. */
  valides: SignatureClassee[];
  /** Signatures réelles hors du périmètre retenu (sessions exclues, anciennes dates) : conservées, non comptées. */
  horsSession: SignatureClassee[];
  /** Divergences explicites : créneau signé non prévu par les horaires de la session, ou réservation contredite par une session pratique. */
  anomalies: AnomalieSignature[];
}

const estSignee = (e: any) =>
  (typeof e?.signature_data_url === 'string' && /^data:image\/(png|jpeg|jpg);base64,/i.test(e.signature_data_url)) || !!e?.signed_at;

export function classifierSignatures(
  emargements: any[],
  sessionRows: any[],
  reservations: any[],
  dateReference: string = dateDuJourParis(),
): ClassificationSignatures {
  const attendus = calculerSignaturesManquantes(emargements, sessionRows, reservations, dateReference);
  const { datesTheorie, datesPratique } = datesDuPlanning(sessionRows, reservations);

  // Créneaux prévus par date selon les horaires réels des sessions/réservations retenues.
  const creneauxPrevusParDate = new Map<string, Set<string>>();
  const prevu = (date: string, creneau: string) => {
    if (!creneauxPrevusParDate.has(date)) creneauxPrevusParDate.set(date, new Set());
    creneauxPrevusParDate.get(date)!.add(creneau);
  };
  const pratiqueSessionDates = new Set<string>();
  for (const row of sessionRows ?? []) {
    const s = row?.sessions;
    if (!s || row?.liste_attente === true || annulee(s) || inscriptionExclue(row)) continue;
    const type = String(s.type_session ?? '').toLowerCase();
    const debutH = row.heure_debut_personnalisee ?? s.heure_debut;
    const finH = row.heure_fin_personnalisee ?? s.heure_fin;
    if (type.includes('pratique')) {
      const date = normDate(s.date_debut);
      if (!estDate(date)) continue;
      pratiqueSessionDates.add(date);
      for (const c of creneauxAttendus(debutH, finH)) prevu(date, c);
    } else if (type.includes('theorique')) {
      const debutBrut = normDate(row.date_debut || s.date_debut);
      const finBrute = normDate(row.date_fin_personnalisee || row.date_fin || s.date_fin || s.date_debut);
      const debutSession = normDate(s.date_debut);
      const finSession = normDate(s.date_fin || s.date_debut);
      const debut = estDate(debutSession) ? (debutBrut > debutSession ? debutBrut : debutSession) : debutBrut;
      const fin = estDate(finSession) ? (finBrute < finSession ? finBrute : finSession) : finBrute;
      if (!estDate(debut) || !estDate(fin) || fin < debut) continue;
      for (const date of joursOuvres(debut, fin)) for (const c of creneauxAttendus(debutH, finH)) prevu(date, c);
    }
  }
  const anomalies: AnomalieSignature[] = [];
  for (const r of reservations ?? []) {
    const date = normDate(r?.date_choisie);
    if (!estDate(date)) continue;
    const v = String(r?.creneau ?? '').toLowerCase();
    const creneaux = v.includes('apres') || v.includes('aprem') ? ['apres_midi'] : v.includes('matin') ? ['matin'] : ['matin', 'apres_midi'];
    if (pratiqueSessionDates.has(date)) {
      const prevus = creneauxPrevusParDate.get(date) ?? new Set<string>();
      const enTrop = creneaux.filter((c) => !prevus.has(c));
      if (enTrop.length > 0) {
        anomalies.push({
          date,
          creneau: enTrop.map((c) => DEMI_LABELS[c] ?? c).join(' + '),
          detail: `Réservation « ${r?.creneau ?? 'journee'} » plus large que les horaires de la session pratique du jour : seuls les créneaux de la session sont attendus.`,
        });
      }
      continue;
    }
    for (const c of creneaux) prevu(date, c);
  }

  const valides: SignatureClassee[] = [];
  const horsSession: SignatureClassee[] = [];
  const vus = new Set<string>();
  for (const e of emargements ?? []) {
    if (e?.masque === true) continue;
    const date = normDate(e?.date_emargement);
    const demi = String(e?.demi_journee ?? '').trim().toLowerCase();
    if (!estDate(date) || !demi || !estSignee(e)) continue;
    const key = `${date}|${demi}`;
    if (vus.has(key)) continue;
    vus.add(key);
    const label = DEMI_LABELS[demi] ?? demi;
    const dansPerimetre = datesTheorie.has(date) || datesPratique.has(date);
    if (dansPerimetre) {
      valides.push({ date, creneau: label });
      const prevus = creneauxPrevusParDate.get(date);
      if (prevus && !prevus.has(demi)) {
        anomalies.push({
          date,
          creneau: label,
          detail: 'Signature sur un créneau non prévu par les horaires de la session du jour — conservée, à vérifier (jamais effacée ni antidatée).',
        });
      }
    } else {
      horsSession.push({ date, creneau: label });
    }
  }
  const tri = (a: SignatureClassee, b: SignatureClassee) => a.date.localeCompare(b.date) || a.creneau.localeCompare(b.creneau);
  valides.sort(tri);
  horsSession.sort(tri);
  anomalies.sort((a, b) => a.date.localeCompare(b.date));
  return { attendus, valides, horsSession, anomalies };
}

export async function chargerClassificationSignatures(apprenantId: string): Promise<ClassificationSignatures> {
  if (!apprenantId) throw new Error('Apprenant requis');
  const [emargRes, sessionsRes, reservationsRes] = await Promise.all([
    paginer((f, t) => supabase.from('emargements_fc').select('id, date_emargement, demi_journee, signature_data_url, signed_at, absent, masque').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('session_apprenants').select('id, liste_attente, emargements_exclus, date_debut, date_fin, date_fin_personnalisee, heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, nom, statut, date_debut, date_fin, heure_debut, heure_fin)').eq('apprenant_id', apprenantId).order('id').range(f, t)),
    paginer((f, t) => supabase.from('reservations_pratique').select('id, date_choisie, type_formation, creneau').eq('apprenant_id', apprenantId).order('id').range(f, t)),
  ]);
  return classifierSignatures(emargRes, sessionsRes, reservationsRes);
}
