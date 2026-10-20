import { supabase } from '@/integrations/supabase/client';
import { calculerPratiqueSlotDetails, daySlotsDepuisConfigs, type PratiqueSlotDetail } from '@/lib/pratiqueSlots';
import { pratiqueDocumentHours } from '@/lib/pratiqueDocumentHours';
import { datesDuPlanning } from '@/lib/signaturesManquantes';
import { aPreuveSignatureEmargement } from '@/lib/preuveSignatureEmargement';

export interface SignatureRassemblee { id: string; date: string; creneau: string; horaires: string; sourceHoraires: string; activite: string; signedAt: string | null; signature: string; absent: boolean }
const labels: Record<string, string> = { matin: 'Matin', apres_midi: 'Après-midi', soir: 'Soir', soir_1: 'Soir 1', soir_2: 'Soir 2' };
const evening: Record<string, string> = { soir: '17h00 - 21h00', soir_1: '17h00 - 18h30', soir_2: '18h30 - 21h00' };
const order: Record<string, number> = { Matin: 0, 'Après-midi': 1, Soir: 2, 'Soir 1': 3, 'Soir 2': 4 };

/** Preserve every stored signature ID, including multiple versions on the same date. */
export function rassemblerSignatures(rows: any[], pratique: PratiqueSlotDetail[], sessions: any[]): SignatureRassemblee[] {
  const seen = new Set<string>();
  return rows.filter(r => aPreuveSignatureEmargement(r) && !seen.has(r.id) && !!seen.add(r.id)).map(r => {
    const date = String(r.date_emargement ?? '').slice(0, 10);
    const demi = String(r.demi_journee ?? '');
    const planning = pratique.filter(p => p.date === date && p.parts.some(x => x.creneau === demi));
    const practicalLabels = [...new Set(planning.map(p => pratiqueDocumentHours(date, demi, [p])).filter(Boolean))];
    const theory = sessions.filter(row => {
      const s = row.sessions;
      return s && !/pratique/i.test(s.type_session ?? '') && date >= String(row.date_debut || s.date_debut).slice(0, 10) && date <= String(row.date_fin_personnalisee || row.date_fin || s.date_fin || s.date_debut).slice(0, 10);
    });
    const candidates = [...new Set(theory.map(row => {
      const start = String(row.heure_debut_personnalisee || row.sessions.heure_debut || '').slice(0, 5);
      const end = String(row.heure_fin_personnalisee || row.sessions.heure_fin || '').slice(0, 5);
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) return null;
      if (demi.startsWith('soir')) return start >= '17:00' ? evening[demi] ?? null : null;
      if (start >= '17:00') return null;
      if (demi === 'matin') return start < '12:00' ? `${start} - ${end > '12:00' ? '12:00' : end}` : null;
      if (demi === 'apres_midi') return end > '13:00' ? `${start < '13:00' ? '13:00' : start} - ${end}` : null;
      return null;
    }).filter(Boolean))];
    const horaires = practicalLabels.length === 1 ? String(practicalLabels[0]) : planning.length ? 'Horaires non déterminés' : candidates.length === 1 ? String(candidates[0]) : 'Horaires non déterminés';
    return { id: String(r.id), date, creneau: labels[demi] ?? demi, horaires,
      sourceHoraires: planning.length ? 'Planning pratique consulté à l’export' : candidates.length === 1 ? 'Session attribuée / créneau enregistré' : 'Source absente ou ambiguë',
      activite: planning.length ? `Pratique ${planning[0].typeFormation.toUpperCase()}` : theory.length ? 'Formation présentielle' : 'Présence (type non déterminé)',
      signedAt: r.signed_at ?? null, signature: r.signature_data_url, absent: r.absent === true };
  }).sort((a, b) => a.date.localeCompare(b.date) || (order[a.creneau] ?? 5) - (order[b.creneau] ?? 5) || String(a.signedAt ?? '').localeCompare(String(b.signedAt ?? '')) || a.id.localeCompare(b.id));
}

async function paginer(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let p = 0; p < 50; p++) {
    const { data, error } = await build(p * 1000, p * 1000 + 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Signatures indisponibles');
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
  throw new Error('Volume trop important : export incomplet refusé');
}

/** Compte des signatures réellement incluses dans un PDF, rapporté au total attendu. */
export function formaterCompteSignaturesPdf(signees: number, total: number | null | undefined, totalIndisponible = false): { texte: string; ton: 'ok' | 'partiel' | 'excedent' | 'neutre' } {
  const pluriel = (n: number) => (n > 1 ? 's' : '');
  const base = `${signees} signature${pluriel(signees)} signée${pluriel(signees)}`;
  if (typeof total === 'number' && Number.isFinite(total)) {
    return { texte: `${base} sur ${total}`, ton: signees === total ? 'ok' : signees > total ? 'excedent' : 'partiel' };
  }
  return { texte: totalIndisponible ? `${base} — total attendu indisponible` : base, ton: 'neutre' };
}

export async function chargerSignaturesRassemblees(apprenantId: string, seulementPlanning = false) {
  // seulementPlanning : uniquement les signatures aux dates de la session et de la pratique
  // (les signatures hors planning restent conservées en base).
  const [rows, reservations, sessions] = await Promise.all([
    paginer((from, to) => supabase.from('emargements_fc').select('id, date_emargement, demi_journee, signature_data_url, signed_at, absent, masque').eq('apprenant_id', apprenantId).eq('masque', false).order('id').range(from, to)),
    paginer((from, to) => supabase.from('reservations_pratique').select('id, date_choisie, type_formation, creneau').eq('apprenant_id', apprenantId).order('id').range(from, to)),
    paginer((from, to) => supabase.from('session_apprenants').select('id, date_debut, date_fin, date_fin_personnalisee, heure_debut_personnalisee, heure_fin_personnalisee, sessions:session_id(type_session, nom, statut, date_debut, date_fin, heure_debut, heure_fin)').eq('apprenant_id', apprenantId).order('id').range(from, to)),
  ]);
  const dates = [...reservations.map(r => r.date_choisie), ...sessions.filter(r => /pratique/i.test(r.sessions?.type_session ?? '')).map(r => r.sessions.date_debut)].filter(Boolean).map(d => String(d).slice(0, 10)).sort();
  const configs = dates.length ? await paginer((from, to) => supabase.from('planning_pratique_config').select('id, planning_start_date, planning_end_date, day_time_slots, updated_at').lte('planning_start_date', dates[dates.length - 1]).gte('planning_end_date', dates[0]).order('id').range(from, to)) : [];
  const slots = daySlotsDepuisConfigs(dates, configs);
  const pratique = calculerPratiqueSlotDetails(reservations, sessions, slots).map(p => {
    // Do not label historical signatures with a default or generic practical-session timetable.
    const explicit = slots.get(p.date);
    return { ...p, parts: p.parts.map(part => {
      const raw = typeof explicit === 'string' ? (part.creneau === 'matin' ? explicit : '') : explicit?.[part.creneau === 'matin' ? 'matin' : 'apresmidi'];
      return raw ? part : { ...part, label: '', minutes: 0 };
    }) };
  });
  const { datesTheorie, datesPratique } = datesDuPlanning(sessions, reservations);
  const toutes = rassemblerSignatures(rows, pratique, sessions);
  return seulementPlanning ? toutes.filter(s => datesTheorie.has(s.date) || datesPratique.has(s.date)) : toutes;
}