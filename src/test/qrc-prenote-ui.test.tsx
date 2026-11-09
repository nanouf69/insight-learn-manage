import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PrenoteQrc } from '@/features/correction-qrc-v2/PrenoteQrc';

describe('Validation humaine de pré-note', () => {
  it('ne sauvegarde rien au rendu ni au choix ; transmet seulement après validation', () => {
    const save = vi.fn();
    render(<PrenoteQrc reponse="C'est avoir un casier judiciaire b2 vierge" officiel="Casier judiciaire vierge (B2)" bareme={2} disabled={false} onValider={save} />);
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '1,5', exact: true }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Valider la pré-note comme note définitive' }));
    expect(save).toHaveBeenCalledWith(1.5, expect.stringContaining('Proposition 2/2 ; validation humaine 1.5/2'));
  });
  it('bloque aussi la validation si la remise ou une sauvegarde bloque la copie', () => {
    const save = vi.fn();
    render(<PrenoteQrc reponse="oui" officiel="oui" bareme={2} disabled onValider={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Valider la pré-note comme note définitive' }));
    expect(save).not.toHaveBeenCalled();
  });
  it('exige un choix humain si la proposition est incertaine', () => {
    const save = vi.fn();
    render(<PrenoteQrc reponse="B3" officiel="B2" bareme={2} disabled={false} onValider={save} />);
    expect(screen.getByRole('button', { name: 'Valider la pré-note comme note définitive' })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
});