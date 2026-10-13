import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PratiqueApprenantLink } from '@/components/examens/PratiqueApprenantLink';

afterEach(cleanup);
describe('Planning pratique — accès CRM', () => {
  it('opens the immutable learner ID, not a name or reservation', () => {
    const ouvrir = vi.fn();
    render(<PratiqueApprenantLink apprenant={{ id: 'fixture-learner', nom: 'Martin', prenom: 'Camille' }} onOuvrir={ouvrir} />);
    const link = screen.getByRole('button', { name: 'Ouvrir la fiche CRM de MARTIN Camille' });
    expect(link).toHaveAttribute('type', 'button');
    fireEvent.click(link);
    expect(ouvrir).toHaveBeenCalledExactlyOnceWith('fixture-learner');
  });
  it('stays non-interactive without CRM navigation', () => {
    render(<PratiqueApprenantLink apprenant={{ id: 'fixture', nom: 'Martin' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('MARTIN')).toBeInTheDocument();
  });
  it('both VTC and TAXI use the existing admin callback', () => {
    const source = readFileSync('src/components/examens/ExamenReussitePage.tsx', 'utf8');
    expect(source.match(/<PratiqueApprenantLink apprenant=\{a\} onOuvrir=\{onNavigateToApprenant\}/g)).toHaveLength(2);
    expect(readFileSync('src/pages/Index.tsx', 'utf8')).toContain('onNavigateToApprenant={handleNavigateToApprenant}');
  });
});