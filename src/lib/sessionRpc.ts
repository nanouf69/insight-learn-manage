import { supabase } from '@/integrations/supabase/client';
import { assurerSessionFraiche, SESSION_EXPIREE_MESSAGE } from '@/lib/sessionExpiree';

export const authFailure = (error: { code?: string; status?: number; message?: string } | null) =>
  !!error && (['42501', 'PGRST301', 'PGRST302', 'PGRST303'].includes(error.code ?? '') || error.status === 401 || /jwt|session expir/i.test(error.message ?? ''));

/** A retry only after verified refresh, never anonymous and never under another account. */
export async function freshSessionCall<T>(call: () => PromiseLike<T>, owner?: string): Promise<T> {
  const { data: initial } = await bounded(supabase.auth.getSession());
  const expected = owner ?? initial.session?.user?.id;
  if (!expected || !await assurerSessionFraiche()) throw sessionError();
  const sameAccount = async () => {
    const { data } = await bounded(supabase.auth.getSession());
    if (data.session?.user?.id !== expected) throw sessionError();
  };
  await sameAccount();
  let result = await bounded(call());
  const error = (result as { error?: { code?: string; status?: number; message?: string } }).error;
  if (authFailure(error ?? null) && await assurerSessionFraiche(Number.MAX_SAFE_INTEGER)) {
    await sameAccount();
    result = await bounded(call());
  }
  await sameAccount();
  return result;
}
function sessionError() { return Object.assign(new Error(SESSION_EXPIREE_MESSAGE), { sessionAbsente: true }); }
export function bounded<T>(promise: PromiseLike<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('Délai réseau dépassé ; aucune confirmation reçue. Réessayez après le rétablissement de la connexion.'), { code: 'READ_TIMEOUT' })), ms);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}