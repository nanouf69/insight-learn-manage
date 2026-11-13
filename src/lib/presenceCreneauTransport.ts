import { supabase } from '@/integrations/supabase/client';
import { lirePresencesAdministratives } from './heuresValideesAdmin';

export const BUCKET_JUSTIFICATIFS_PRESENCE = 'presentiel-justificatifs';
/** Exact codes emitted by calculerSignaturesManquantes (no fuzzy label matching). */
export const CODES_CRENEAUX: Record<string, string> = { 'Matin': 'matin', 'Après-midi': 'apres_midi', 'Soir 1 (17h-18h30)': 'soir_1', 'Soir 2 (18h30-21h)': 'soir_2' };

export const dureeLisible = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes < 0) return 'durée inconnue';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

/** "18h30-21h" -> {debut:'18:30', fin:'21:00'}; null when not an exact range. */
export function bornesHoraire(horaire?: string): { debut: string; fin: string } | null {
  const m = /^(\d{1,2})[h:](\d{2})?\s*[-–]\s*(\d{1,2})[h:](\d{2})?$/.exec(horaire?.trim() ?? '');
  if (!m) return null;
  const f = (h: string, mn?: string) => `${h.padStart(2, '0')}:${mn ?? '00'}`;
  const debut = f(m[1], m[2]), fin = f(m[3], m[4]);
  return fin > debut ? { debut, fin } : null;
}
export const libelleHoraire = (b: { debut: string; fin: string }) => `${b.debut.replace(':', 'h').replace(/h00$/, 'h')} à ${b.fin.replace(':', 'h').replace(/h00$/, 'h')}`;

export function messageServeur(e: unknown): string {
  const msg = (e as { message?: unknown })?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : 'Relisez la fiche avant de réessayer.';
}

export interface LienCreneau { id: string; validation_id: string; apprenant_id: string; date_presence: string; creneau: string; debut: string; fin: string; minutes: number; pdf_chemin: string; operation_id: string }

/** Active slot validations only (a revoked validation frees its slot again). */
export async function lireCreneauxValides(apprenantId: string): Promise<LienCreneau[]> {
  const liens: LienCreneau[] = [];
  for (let from = 0; ; from += 1000) {
    if (from >= 50000) throw new Error('Lecture des créneaux validés incomplète');
    const { data, error } = await supabase.from('presentiel_presence_creneaux' as any).select('*').eq('apprenant_id', apprenantId).order('id').range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as unknown as LienCreneau[];
    liens.push(...page);
    if (page.length < 1000) break;
  }
  if (!liens.length) return [];
  const actives = new Set((await lirePresencesAdministratives(apprenantId)).map(v => v.id));
  return liens.filter(l => actives.has(l.validation_id));
}

export interface CommandeCreneau {
  operationId: string; apprenantId: string; inscriptionId: string; sessionId: string; date: string; creneau: string;
  debut: string; fin: string; formateurId: string | null; formateurNom: string | null; justificatif: 'feuille' | 'attestation' | 'autre';
  libelle: string | null; pdf: File; remplace: string[];
}

/** Upload private PDF, run the transactional RPC, then read the result back from the server. */
export async function validerPresenceCreneau(c: CommandeCreneau) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Session expirée : reconnectez-vous.');
  const chemin = `${c.apprenantId}/${c.operationId}.pdf`;
  const up = await supabase.storage.from(BUCKET_JUSTIFICATIFS_PRESENCE).upload(chemin, c.pdf, { contentType: 'application/pdf', upsert: false });
  // Same operation retried after a lost response: the file is already there, the server re-checks owner/type/size.
  if (up.error && !/exist|duplicate/i.test(up.error.message)) throw new Error(`Dépôt du PDF impossible : ${up.error.message}`);
  const { data, error } = await (supabase.rpc as any)('presentiel_valider_creneau', {
    p_operation: c.operationId, p_apprenant: c.apprenantId, p_inscription: c.inscriptionId, p_session: c.sessionId,
    p_date: c.date, p_creneau: c.creneau, p_debut: c.debut, p_fin: c.fin, p_formateur: c.formateurId, p_formateur_nom: c.formateurNom,
    p_justificatif: c.justificatif, p_justificatif_libelle: c.libelle, p_pdf_chemin: chemin, p_remplace: c.remplace, p_confirme: true,
  });
  if (error) throw error;
  const recu = data as { validation_id?: string; minutes?: number } | null;
  if (!recu?.validation_id) throw new Error('Réponse serveur incomplète : relisez la fiche.');
  const liens = await lireCreneauxValides(c.apprenantId);
  const lien = liens.find(l => l.operation_id === c.operationId && l.validation_id === recu.validation_id);
  if (!lien || lien.date_presence !== c.date || lien.creneau !== c.creneau) throw new Error('Validation non relue : actualisez la fiche.');
  return lien;
}
