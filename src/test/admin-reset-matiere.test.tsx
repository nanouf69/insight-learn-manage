import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const transport = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: transport }));
import { ResetMatiereAdminButton, type ResetMatiereAdminTarget } from '@/components/crm/apprenant-sections/ResetMatiereAdminButton';

const target: ResetMatiereAdminTarget = {
  apprenantId: 'fictif-a', prenom: 'Élève', nom: 'FICTIF A', examId: 'EB3', examLabel: 'Examen Blanc 3 — VTC',
  filiere: 'vtc', matiereId: 'gestion', matiereNom: 'B Gestion', resultId: 'result-fictif-a',
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Remettre cette matière à zéro : B Gestion' }));
describe('Admin subject-only reset blocked preview', () => {
  it('confirmation cannot call a global, owner or subject mutation, even on double click', () => {
    render(<ResetMatiereAdminButton target={target} />);
    open(); open();
    const confirm = screen.getByRole('button', { name: 'Confirmer cette matière' });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(transport.rpc).not.toHaveBeenCalled(); expect(transport.from).not.toHaveBeenCalled();
  });
  it('cancel and reopen never request a retake or modify the source identity', () => {
    const before = structuredClone(target);
    render(<ResetMatiereAdminButton target={target} />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).toBeNull(); open();
    expect(target).toEqual(before); expect(transport.rpc).not.toHaveBeenCalled();
  });
  it.each(['apprenantId', 'examId', 'filiere', 'matiereId', 'resultId', 'prenom', 'nom'] as const)(
    'a changed %s cannot reuse another confirmation', (field) => {
      const { rerender } = render(<ResetMatiereAdminButton target={target} />); open();
      rerender(<ResetMatiereAdminButton target={{ ...target, [field]: 'different' }} />);
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(transport.rpc).not.toHaveBeenCalled();
    },
  );
  it('missing identity cannot open a confirmation', () => {
    render(<ResetMatiereAdminButton target={{ ...target, resultId: '' }} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  it('another subject and learner retain their target and result without any write', () => {
    const other = { ...target, apprenantId: 'fictif-b', nom: 'FICTIF B', matiereId: 'anglais', matiereNom: 'E Anglais', resultId: 'result-fictif-b' };
    const before = structuredClone(other);
    render(<><ResetMatiereAdminButton target={target} /><ResetMatiereAdminButton target={other} /></>); open();
    expect(other).toEqual(before); expect(transport.rpc).not.toHaveBeenCalled();
  });
});