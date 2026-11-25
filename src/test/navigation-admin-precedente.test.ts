import { describe, expect, it } from 'vitest';
import { empilerDestinationPrecedente, retirerDestinationPrecedente, type DestinationAdmin } from '@/lib/navigationAdmin';

const liste: DestinationAdmin = { page: 'crm', apprenantId: null };
const ficheA: DestinationAdmin = { page: 'crm', apprenantId: 'apprenant-a' };
const ficheB: DestinationAdmin = { page: 'crm', apprenantId: 'apprenant-b' };

 describe('Flèche Précédent du CRM', () => {
  it('revient à la dernière fiche consultée plutôt qu’à la liste', () => {
    const historique = empilerDestinationPrecedente([liste], ficheA, ficheB);
    expect(retirerDestinationPrecedente(historique)).toEqual({ destination: ficheA, historique: [liste] });
  });

  it('conserve les retours successifs jusqu’à la liste', () => {
    const historique = empilerDestinationPrecedente([liste], ficheA, ficheB);
    const premierRetour = retirerDestinationPrecedente(historique);
    expect(premierRetour?.destination).toEqual(ficheA);
    expect(retirerDestinationPrecedente(premierRetour!.historique)).toEqual({ destination: liste, historique: [] });
  });

  it('ne duplique pas une fiche déjà affichée', () => {
    expect(empilerDestinationPrecedente([], ficheA, ficheA)).toEqual([]);
  });
});
