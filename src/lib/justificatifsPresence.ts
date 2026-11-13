import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import { lirePresencesAdministratives } from '@/lib/heuresValideesAdmin';
import { BUCKET_JUSTIFICATIFS_PRESENCE } from '@/lib/presenceCreneauTransport';

/**
 * Justificatifs PDF des validations manuelles de présence, vus depuis le Contrôle qualité.
 * Lecture seule : référence les fichiers privés existants (aucune copie, aucun ajout
 * dans « Documents ajoutés au dossier »). Une validation annulée reste dans l'historique
 * mais n'est jamais une preuve active.
 */
export interface JustificatifPresence {
  id: string; validationId: string; datePresence: string; debut: string; fin: string; minutes: number;
  justificatif: string; libelle: string | null; chemin: string; auteurNom: string; creeLe: string;
  statut: 'active' | 'annulee'; fichier: 'present' | 'absent';
}

export function projeterJustificatifs(apprenantId: string, liens: any[], validations: any[], profils: any[], fichiers: Set<string>): JustificatifPresence[] {
  const vus = new Set<string>();
  const out: JustificatifPresence[] = [];
  for (const l of liens) {
    if (l.apprenant_id !== apprenantId) continue; // jamais de justificatif d'un autre candidat
    if (!l.pdf_chemin || !String(l.pdf_chemin).startsWith(`${apprenantId}/`)) continue;
    if (vus.has(l.id)) continue; vus.add(l.id);
    const v = validations.find((r) => r.id === l.validation_id);
    out.push({
      id: l.id, validationId: l.validation_id, datePresence: l.date_presence, debut: String(l.debut).slice(0, 5), fin: String(l.fin).slice(0, 5),
      minutes: l.minutes, justificatif: l.justificatif, libelle: l.justificatif_libelle ?? null, chemin: l.pdf_chemin, creeLe: l.created_at,
      auteurNom: profils.find((p) => p.user_id === l.auteur)?.full_name || 'Administrateur — nom indisponible',
      statut: !v || v.annulee === true ? 'annulee' : 'active',
      fichier: fichiers.has(l.pdf_chemin) ? 'present' : 'absent',
    });
  }
  return out.sort((a, b) => (a.datePresence + a.debut).localeCompare(b.datePresence + b.debut));
}

export const libelleJustificatif = (j: Pick<JustificatifPresence, 'justificatif' | 'libelle'>) =>
  j.justificatif === 'feuille' ? 'Feuille d’émargement' : j.justificatif === 'attestation' ? 'Attestation' : j.libelle || 'Autre justificatif';

export async function lireJustificatifsPresence(apprenantId: string): Promise<JustificatifPresence[]> {
  const [liens, validations, profils, liste] = await Promise.all([
    fetchAllRows<any>((a, z) => supabase.from('presentiel_presence_creneaux' as any).select('*').eq('apprenant_id', apprenantId).order('id').range(a, z)),
    lirePresencesAdministratives(apprenantId, true),
    fetchAllRows<any>((a, z) => supabase.from('profiles').select('user_id,full_name').order('user_id').range(a, z)),
    supabase.storage.from(BUCKET_JUSTIFICATIFS_PRESENCE).list(apprenantId, { limit: 1000 }),
  ]);
  if (liste.error) throw liste.error; // erreur de lecture = erreur, jamais « 0 justificatif »
  const fichiers = new Set((liste.data ?? []).map((f) => `${apprenantId}/${f.name}`));
  return projeterJustificatifs(apprenantId, liens, validations, profils, fichiers);
}

export async function urlJustificatif(chemin: string, telecharger = false): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_JUSTIFICATIFS_PRESENCE)
    .createSignedUrl(chemin, 300, telecharger ? { download: chemin.split('/').pop() } : undefined);
  if (error || !data?.signedUrl) throw error ?? new Error('Lien indisponible');
  return data.signedUrl;
}

export const nomFichierZip = (j: JustificatifPresence) =>
  `${j.datePresence}_${j.debut.replace(':', 'h')}-${j.fin.replace(':', 'h')}_${j.justificatif}_${j.id.slice(0, 8)}.pdf`;
