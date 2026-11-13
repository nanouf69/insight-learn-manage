import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimTimeWarning, remainingFromAnchor } from '@/components/cours-en-ligne/examUxPolicy';
import { ExamExitGuard, requestExamExit } from '@/components/cours-en-ligne/ExamExitGuard';
import { TimerBadge } from '@/components/cours-en-ligne/ExamenBlancsTimer';

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('UX examens blancs, sans mutation pédagogique', () => {
  it('5 minutes à 300 secondes, une seule apparition par épreuve', () => {
    expect(claimTimeWarning('policy-five', 301)).toBeNull();
    expect(claimTimeWarning('policy-five', 300)).toBe(5);
    expect(claimTimeWarning('policy-five', 299)).toBeNull();
  });
  it('2 minutes à 120 secondes, une seule apparition et nouvelle épreuve indépendante', () => {
    expect(claimTimeWarning('policy-two', 121)).toBe(5);
    expect(claimTimeWarning('policy-two', 120)).toBe(2);
    expect(claimTimeWarning('policy-two', 119)).toBeNull();
    expect(claimTimeWarning('policy-two-t2', 120)).toBe(2);
  });
  it('reprise sous 2 minutes ne montre jamais une fausse alerte 5 minutes', () => {
    expect(claimTimeWarning('policy-resume', 90)).toBe(2);
    expect(claimTimeWarning('policy-resume', 200)).toBeNull();
    expect(claimTimeWarning('policy-expired', 0)).toBeNull();
  });
  it('temps écoulé réel depuis ancre serveur, indépendant des ticks manqués', () => {
    expect(remainingFromAnchor(301, 1000, 2000)).toBe(300);
    expect(remainingFromAnchor(301, 1000, 182000)).toBe(120);
    expect(remainingFromAnchor(301, 1000, 400000)).toBe(0);
  });
  it('relecture après démontage garde le seuil déjà montré', () => {
    const key = 'policy-reload';
    expect(claimTimeWarning(key, 300)).toBe(5);
    expect(sessionStorage.getItem(`exam-ux-warning:${key}:5`)).toBe('shown');
    expect(claimTimeWarning(key, 298)).toBeNull();
  });
  it('rester ne quitte pas ; quitter rejoue une seule commande sans finalisation', () => {
    const exit = vi.fn();
    render(<ExamExitGuard active />);
    act(() => requestExamExit(exit));
    fireEvent.click(screen.getByRole('button', { name: 'Rester et terminer' }));
    expect(exit).not.toHaveBeenCalled();
    act(() => requestExamExit(exit));
    fireEvent.click(screen.getByRole('button', { name: 'Quitter quand même' }));
    expect(exit).toHaveBeenCalledTimes(1);
  });
  it('matière terminée ne demande pas confirmation', () => {
    const exit = vi.fn(); render(<ExamExitGuard active={false} />);
    act(() => requestExamExit(exit)); expect(exit).toHaveBeenCalledTimes(1);
  });
  it('expiration déclenchée une fois malgré ticks et resynchronisation', () => {
    vi.useFakeTimers();
    const expire = vi.fn();
    const view = render(<TimerBadge seconds={2} onExpire={expire} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(expire).toHaveBeenCalledTimes(1);
    view.rerender(<TimerBadge seconds={0} onExpire={expire} />);
    expect(expire).toHaveBeenCalledTimes(1);
  });
});