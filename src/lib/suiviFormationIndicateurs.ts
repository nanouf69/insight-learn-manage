import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { daySlotsDepuisConfigs, normalizePratiqueCreneau, parseClockMinutes, resolvePratiqueSlotParts, normalizePratiqueType } from '@/lib/pratiqueSlots';

/** Display policy only: the stored contract and historical evidence are never rewritten. */
export function regleSuiviFormation(row: any) {
  const date = String(row?.date_debut_formation ?? '').slice(0, 10);
  const actuelle = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '2026-07-01';
  const aliases: Record<string, string> = {
    'vtc-cours-du-soir': 'vtc', 'taxi-pour-vtc': 'ta', 'passerelle-taxi': 'ta',
    'vtc-elearning': 'vtc-e', 'taxi-elearning': 'taxi-e',
    'taxi-pour-vtc-elearning': 'ta-e', 'passerelle-taxi-elearning': 'ta-e',
  };
  const type = String(row?.type_apprenant || row?.formation_choisie || '').trim().toLowerCase();
  const key = aliases[type] ?? type;
  const filiere = /^(vtc|taxi|ta|va)(?:-e(?:-presentiel)?)?$/.exec(key)?.[1] ?? null;
  const presentiel = actuelle && ['vtc', 'taxi', 'ta', 'vtc-e-presentiel', 'taxi-e-presentiel', 'ta-e-presentiel'].includes(key);
  const elearning = actuelle && ['vtc-e', 'taxi-e', 'ta-e', 'va-e'].includes(key);
  const heures = presentiel ? ({ vtc: 66, taxi: 96, ta: 36 } as Record<string, number>)[filiere ?? ''] ?? null : null;
  return { actuelle, presentiel, elearning, filiere, heures };
}

export interface RatioSignatures { signees: number; attendues: number; taux: number | null; raison: string | null }

const dateISO = (v: unknown) => String(v ?? '').slice(0, 10);
const valideDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const annule = (s: any) => /annul/i.test(String(s?.statut ?? ''));

/** Split actual time ranges into existing learner signature keys, never into hours earned. */
function slots(start: unknown, end: unknown): string[] {
  const a = parseClockMinutes(String(start ?? '')), b = parseClockMinutes(String(end ?? ''));
  if (a == null || b == null || b <= a) return [];
  if (a >= 17 * 60) return [ ...(a < 18 * 60 + 30 ? ['soir_1'] : []), ...(b > 18 * 60 + 30 ? ['soir_2'] : []) ];
  return [ ...(a < 12 * 60 ? ['matin'] : []), ...(a < 17 * 60 && b > 13 * 60 ? ['apres_midi'] : []) ];
}

export function calculerRatioSignatures(emargements: any[], inscriptions: any[], reservations: any[], blocs: any[], configs: any[], filiere: string): RatioSignatures {
  const attendus = new Set<string>();
  let incomplet = false;
  const ajouter = (date: string, keys: string[]) => {
    if (!valideDate(date) || !keys.length) { incomplet = true; return; }
    for (const key of keys) attendus.add(`${date}|${key}`);
  };
  const pratiqueDates = [...reservations.map(r => dateISO(r.date_choisie)), ...inscriptions.filter(r => /pratique/i.test(r.sessions?.type_session ?? '')).map(r => dateISO(r.sessions?.date_debut))];
  const pratique = daySlotsDepuisConfigs(pratiqueDates, configs);
  const ajouterPratique = (date: string, creneau: string, row?: any) => {
    const cfg = pratique.get(date);
    const selection = normalizePratiqueCreneau(creneau);
    if (pratique.has(date)) {
      const keys = resolvePratiqueSlotParts(cfg, normalizePratiqueType(row?.sessions?.type_session ?? filiere), selection).filter(p => p.minutes > 0).map(p => p.creneau);
      ajouter(date, keys);
    } else if (row) {
      ajouter(date, slots(row.heure_debut_personnalisee ?? row.sessions.heure_debut, row.heure_fin_personnalisee ?? row.sessions.heure_fin).filter(k => k === 'matin' || k === 'apres_midi'));
    } else incomplet = true; // a reservation alone never invents its timetable
  };
  for (const row of inscriptions) {
    const s = row.sessions;
    if (!s || row.liste_attente === true || row.emargements_exclus === true || annule(s)) continue;
    if (/pratique/i.test(s.type_session ?? '')) {
      const date = dateISO(s.date_debut);
      const rs = reservations.filter(r => dateISO(r.date_choisie) === date);
      if (rs.length) for (const r of rs) ajouterPratique(date, r.creneau, row);
      else ajouterPratique(date, 'journee', row);
      continue;
    }
    if (!/theorique/i.test(s.type_session ?? '')) continue;
    const debut = [dateISO(s.date_debut), dateISO(row.date_debut)].filter(Boolean).sort().at(-1) ?? '';
    const fin = [dateISO(s.date_fin || s.date_debut), dateISO(row.date_fin_personnalisee || row.date_fin)].filter(Boolean).sort()[0] ?? '';
    if (!valideDate(debut) || !valideDate(fin) || fin < debut) { incomplet = true; continue; }
    const start = row.heure_debut_personnalisee ?? s.heure_debut;
    const end = row.heure_fin_personnalisee ?? s.heure_fin;
    const sessionKeys = slots(start, end);
    const matching = blocs.filter(b => {
      const cibles = Array.isArray(b.publics_cibles) ? b.publics_cibles : [];
      const publicOK = cibles.length ? cibles.includes(filiere.toUpperCase()) : new RegExp(`\\b${filiere}\\b`, 'i').test(b.formation ?? '');
      if (!publicOK) return false;
      const d = new Date(`${dateISO(b.semaine_debut)}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + Number(b.jour));
      const date = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      if (date < debut || date > fin) return false;
      const keys = slots(b.heure_debut, b.heure_fin);
      return !sessionKeys.length || keys.some(k => sessionKeys.includes(k));
    });
    if (matching.length) {
      for (const b of matching) {
        const d = new Date(`${dateISO(b.semaine_debut)}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + Number(b.jour));
        ajouter(d.toISOString().slice(0, 10), slots(b.heure_debut, b.heure_fin).filter(k => !sessionKeys.length || sessionKeys.includes(k)));
      }
    } else {
      // Explicit assigned theory session is a schedule; never extend it to reach an hours quota.
      if (!sessionKeys.length) { incomplet = true; continue; }
      const d = new Date(`${debut}T00:00:00Z`);
      for (let i = 0; d.toISOString().slice(0, 10) <= fin && i < 400; i++, d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) ajouter(d.toISOString().slice(0, 10), sessionKeys);
      }
    }
  }
  for (const r of reservations) {
    const date = dateISO(r.date_choisie);
    if (inscriptions.some(row => row.emargements_exclus === true && /pratique/i.test(row.sessions?.type_session ?? "") && dateISO(row.sessions?.date_debut) === date)) continue;
    if (!inscriptions.some(row => !row.liste_attente && !annule(row.sessions) && /pratique/i.test(row.sessions?.type_session ?? '') && dateISO(row.sessions?.date_debut) === date)) ajouterPratique(date, r.creneau);
  }
  const signes = new Set<string>();
  for (const e of emargements) {
    if (e.masque === true || e.absent === true || !/^data:image\/(png|jpe?g);base64,[a-z0-9+/=\s]+$/i.test(String(e.signature_data_url ?? ''))) continue;
    const key = `${dateISO(e.date_emargement)}|${String(e.demi_journee ?? '').trim().toLowerCase()}`;
    if (attendus.has(key)) signes.add(key);
  }
  const raison = incomplet ? 'Planning incomplet : créneaux attendus non déterminés' : !attendus.size ? 'Aucun créneau attendu défini pour cette session' : null;
  return { signees: signes.size, attendues: attendus.size, taux: raison ? null : signes.size / attendus.size * 100, raison };
}

/** Admin read-only, account-scoped, paginated. No generated-sheet count is used as denominator. */
export async function chargerRatioSignatures(apprenantId: string, filiere: string): Promise<RatioSignatures> {
  const [emargements, sessions, reservations, blocs, configs] = await Promise.all([
    fetchAllRows<any>((f,t) => supabase.from('emargements_fc').select('id,date_emargement,demi_journee,signature_data_url,absent,masque').eq('apprenant_id',apprenantId).order('id').range(f,t)),
    fetchAllRows<any>((f,t) => supabase.from('session_apprenants').select('id,liste_attente,emargements_exclus,date_debut,date_fin,date_fin_personnalisee,heure_debut_personnalisee,heure_fin_personnalisee,sessions:session_id(type_session,statut,date_debut,date_fin,heure_debut,heure_fin)').eq('apprenant_id',apprenantId).order('id').range(f,t)),
    fetchAllRows<any>((f,t) => supabase.from('reservations_pratique').select('id,date_choisie,creneau').eq('apprenant_id',apprenantId).order('id').range(f,t)),
    fetchAllRows<any>((f,t) => supabase.from('agenda_blocs').select('id,semaine_debut,jour,heure_debut,heure_fin,formation,publics_cibles').order('id').range(f,t)),
    fetchAllRows<any>((f,t) => supabase.from('planning_pratique_config').select('id,day_time_slots,updated_at').order('id').range(f,t)),
  ]);
  return calculerRatioSignatures(emargements, sessions, reservations, blocs, configs, filiere);
}