import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/lib/formulairePedagogiqueTransport', () => ({ lireInscriptionsPedagogiques: async () => [] }));
import { ContexteFormulaire } from '@/components/crm/apprenant-sections/ContexteFormulaire';
it('applique une confirmation uniquement au document choisi sans sauvegarde', async () => {
 const preview = vi.fn();
 render(<QueryClientProvider client={new QueryClient()}><ContexteFormulaire apprenantId="synthetic" donnees={{ formation: 'TAXI' }} onPreview={preview} /></QueryClientProvider>);
 fireEvent.click(screen.getByRole('button', { name: 'Formation, session et décision' }));
 await screen.findByRole('checkbox');
 fireEvent.change(screen.getByLabelText('Formation réellement concernée'), { target: { value: 'FC TAXI' } });
 const inputs=screen.getAllByRole('textbox'); fireEvent.change(inputs[1], { target: { value: 'Document synthétique vérifié' } });
 fireEvent.click(screen.getByRole('checkbox'));
 const button=screen.getByRole('button', { name: 'Appliquer à l’aperçu uniquement' });
 await vi.waitFor(() => expect(button).not.toBeDisabled()); fireEvent.click(button);
 expect(preview).toHaveBeenCalledWith(expect.objectContaining({ formation: 'FC TAXI', decision: null, session_id: null, valide_le: null }));
});