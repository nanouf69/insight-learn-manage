import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionsList } from '@/components/sessions/SessionsList';

const mocks = vi.hoisted(() => ({
  sessionsFetched: false,
  options: new Map<string, any>(),
  handlers: [] as Array<{ table: string; event: string; callback: () => void }>,
  refetchSessions: vi.fn(),
  refetchApprenants: vi.fn(),
  removeChannel: vi.fn(),
  channel: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => {
    mocks.options.set(options.queryKey[0], options);
    return options.queryKey[0] === 'sessions'
      ? { data: [], isLoading: false, isFetched: mocks.sessionsFetched, refetch: mocks.refetchSessions }
      : { data: [], refetch: mocks.refetchApprenants };
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/sessions/SessionForm', () => ({ SessionForm: () => null }));
vi.mock('@/components/sessions/SessionDetail', () => ({ SessionDetail: () => null }));
vi.mock('@/components/sessions/SessionEditor', () => ({ SessionEditor: () => null }));

describe('Sessions pratiques : synchronisation et compteurs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.sessionsFetched = false;
    mocks.options.clear();
    mocks.handlers = [];
    mocks.refetchSessions.mockResolvedValue({});
    mocks.refetchApprenants.mockResolvedValue({});
    mocks.channel.mockImplementation(() => {
      const channel: any = {
        on: (_type: string, filter: any, callback: () => void) => {
          mocks.handlers.push({ table: filter.table, event: filter.event, callback });
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('attend la réconciliation avant les compteurs puis rafraîchit les deux lectures', async () => {
    const view = render(<SessionsList />);
    expect(mocks.options.get('session-apprenants-search').enabled).toBe(false);
    expect(mocks.handlers.map(h => h.table)).toEqual([
      'reservations_pratique', 'session_apprenants', 'sessions', 'planning_pratique_config',
    ]);

    mocks.sessionsFetched = true;
    view.rerender(<SessionsList />);
    expect(mocks.options.get('session-apprenants-search').enabled).toBe(true);

    for (const handler of mocks.handlers) handler.callback();
    await act(async () => { await vi.advanceTimersByTimeAsync(599); });
    expect(mocks.refetchSessions).not.toHaveBeenCalled();
    expect(mocks.refetchApprenants).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mocks.refetchSessions).toHaveBeenCalledTimes(1);
    expect(mocks.refetchApprenants).toHaveBeenCalledTimes(1);
    expect(mocks.refetchSessions.mock.invocationCallOrder[0]).toBeLessThan(mocks.refetchApprenants.mock.invocationCallOrder[0]);

    view.unmount();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });
});
