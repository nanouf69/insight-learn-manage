import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface SessionFcRow { id: string; nom: string | null; date_debut: string | null; date_fin: string | null }
export interface JourSessionFc { jour: string; iso: string; session: string; passe: boolean }

/**
 * Jours proposés dans un devis de formation continue, lus tels quels dans les sessions CRM de la filière.
 * Sessions passées incluses (devis historique), placées après les sessions à venir ; aucune date ajoutée.
 */
export function joursSessionsFc(rows: SessionFcRow[], filiere: 'taxi' | 'vtc', todayIso: string): JourSessionFc[] {
  const out = new Map<string, JourSessionFc>();
  for (const r of rows) {
    const nom = r.nom ?? '';
    if (!/continu/i.test(nom) || !new RegExp(`\\b${filiere}\\b`, 'i').test(nom) || !r.date_debut) continue;
    const debut = parseISO(r.date_debut); const fin = parseISO(r.date_fin || r.date_debut);
    if (!isValid(debut) || !isValid(fin)) continue;
    for (let d = debut; d <= fin; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = format(d, 'yyyy-MM-dd');
      if (!out.has(iso)) out.set(iso, { jour: format(d, 'd MMMM yyyy', { locale: fr }), iso, session: nom, passe: iso < todayIso });
    }
  }
  const all = [...out.values()];
  return [...all.filter(j => !j.passe).sort((a, b) => a.iso.localeCompare(b.iso)), ...all.filter(j => j.passe).sort((a, b) => b.iso.localeCompare(a.iso))];
}
