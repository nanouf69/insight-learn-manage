import { FORMATIONS } from '@/components/cours-en-ligne/formations-data';
import type { EtatCompletionServeur } from '@/lib/etatCompletionServeur';

export function intituleAttestation(formation: string, modalite: string): string {
  const cle = formation.trim().toLowerCase();
  const reference = FORMATIONS.find(f => f.id === cle)?.label ?? formation.trim();
  const distance = /e[ -]?learning|à distance/i.test(`${reference} ${modalite}`);
  const base = reference.replace(/e[ -]?learning|à distance/gi, '').replace(/[·—-]\s*$/,'').trim();
  return `${base || 'Formation non renseignée'}${distance ? ' — à distance (e-learning)' : ' — présentiel'}`;
}
export interface ElementPedagogique { nom: string; statut: string }
export function elementsRestantAValider(modules: {id:number;nom:string}[], etats: ReadonlyMap<number,EtatCompletionServeur> | null): ElementPedagogique[] | null {
  if (!etats || modules.some(m => !etats.has(m.id))) return null;
  return modules.flatMap(m => {
    const e = etats.get(m.id);
    if (!e || (e.status_effectif === 'completed' && e.preuve_complete === true)) return [];
    return [{nom:m.nom,statut:e.status_effectif == null ? 'Validation non enregistrée' : e.status_effectif === 'in_progress' ? 'En cours — validation non confirmée' : 'Validation non confirmée'}];
  });
}
export const motifSansDuree = (m: string) => !/heures?|durée|\d+\s*h\s*\d*|\d+\s*minutes?/i.test(m);