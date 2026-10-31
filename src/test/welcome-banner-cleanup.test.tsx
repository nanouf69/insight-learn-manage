import { act, render, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WelcomeBanner } from '@/components/cours-en-ligne/motivation/WelcomeBanner';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('cancels deferred work when leaving the learner screen', () => {
  vi.useFakeTimers();
  const ui = render(<WelcomeBanner prenom="TEST" formationLabel="VTC" xp={0} xpToday={0} streak={0} progression={null} />);
  expect(vi.getTimerCount()).toBe(1);
  ui.unmount(); expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(100));
});