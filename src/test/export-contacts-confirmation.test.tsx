import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExportContactsEleves } from '@/components/crm/ExportContactsEleves';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'admin' } }) }));
describe('Confirmation avant génération des contacts personnels', () => {
  it('ne lit ni ne génère avant la confirmation explicite', async () => {
    const charger = vi.fn().mockResolvedValue([{id:'fictif',prenom:'Prénom',nom:'Nom',telephone:'0612345678'}]);
    render(<ExportContactsEleves charger={charger} />);
    fireEvent.click(screen.getByRole('button', {name:'Exporter les contacts élèves'}));
    const generer = screen.getByRole('button', {name:'Générer le fichier .vcf'});
    expect(generer).toBeDisabled();
    fireEvent.click(generer);
    expect(charger).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', {name:'Confirmer l’export des données personnelles'}));
    expect(charger).not.toHaveBeenCalled();
    fireEvent.click(generer);
    await waitFor(() => expect(charger).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', {name:'Télécharger le fichier .vcf'})).toBeEnabled();
  });
});