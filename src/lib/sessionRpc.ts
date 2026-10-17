import { supabase } from '@/integrations/supabase/client';
import { assurerSessionFraiche, SESSION_EXPIREE_MESSAGE } from '@/lib/sessionExpiree';

export const authFailure = (error: { code?: string; status?: number; message?: string } | null) =>
  !!error && (['42501', 'PGRST301', 'PGRST302'].includes(error.code ?? '') || error.status === 401 || /jwt|session expir/i.test(error.message ?? ''));

/** A retry only after verified refresh, never anonymous and never under another account. */
export async function freshSessionCall<T>(call: () => PromiseLike<T>, owner?: string): Promise<T> {
  const { data: initial } = await supabase.auth.getSession();
  const expected = owner ?? initial.session?.user?.id;
  if (!expected || !await assurerSessionFraiche()) throw new Error(SESSION_EXPIREE_MESSAGE);
  const sameAccount = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id !== expected) throw new Error(SESSION_EXPIREE_MESSAGE);
  };
  await sameAccount();
  let result = await call();
  const error = (result as { error?: { code?: string; status?: number; message?: string } }).error;
  if (authFailure(error ?? null) && await assurerSessionFraiche(Number.MAX_SAFE_INTEGER)) {
    await sameAccount();
    result = await call();
  }
  await sameAccount();
  return result;
}