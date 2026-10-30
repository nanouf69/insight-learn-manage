import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { planningSignaturesReel } from '@/lib/signaturesPlanningReel';
import { aPreuveSignatureEmargement } from '@/lib/preuveSignatureEmargement';

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

export function calculerRatioSignatures(emargements: any[], inscriptions: any[], reservations: any[], blocs: any[], configs: any[], filiere: string): RatioSignatures {
  const plan = planningSignaturesReel(inscriptions, reservations, blocs, configs, filiere);
  const signes = new Set(emargements.filter(aPreuveSignatureEmargement).map(e => `${String(e.date_emargement ?? '').slice(0,10)}|${String(e.demi_journee ?? '').trim().toLowerCase()}`).filter(k => plan.creneaux.has(k)));
  const raison = plan.incomplet ? 'Planning incomplet : créneaux attendus non déterminés' : !plan.creneaux.size ? 'Aucun créneau attendu défini pour cette session' : null;
  return { signees: signes.size, attendues: plan.creneaux.size, taux: raison ? null : signes.size / plan.creneaux.size * 100, raison };
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