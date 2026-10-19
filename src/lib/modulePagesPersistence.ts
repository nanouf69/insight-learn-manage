import { supabase } from '@/integrations/supabase/client';
import { freshSessionCall, authFailure } from '@/lib/sessionRpc';
import { blockLearnerWrite } from '@/lib/learnerPreviewGuard';

const PREFIX = 'module_pages_pending_v1:';
type ErrorKind = 'auth' | 'serveur';
type Entry = {
  owner: string; apprenant: string; module: number; pages: number[]; progress: number; operation: string;
  confirmed?: boolean; lastError?: ErrorKind | null; attempts?: number;
};
export type ModulePagesStatus = 'confirmed' | 'pending' | 'auth' | 'error';

/** Nombre maximal de relances automatiques par opération (puis seulement focus/réseau/connexion). */
export const MAX_AUTO_RETRIES = 4;
const RETRY_DELAYS_MS = [3000, 10000, 30000, 60000];
const MAX_PASSES = 5;

let current: Promise<void> | null = null;
let rerun = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const memory = new Map<string, Entry>();
const keyFor = (owner: string, apprenant: string, module: number) => `${PREFIX}${owner}:${apprenant}:${module}`;
const read = (key: string): Entry | null => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; }
};
const write = (key: string, value: Entry) => {
  memory.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { console.warn('[pages] stockage local indisponible : ne fermez pas cette page avant confirmation serveur'); return false; }
};
export function pendingModulePages(owner: string, apprenant: string, module: number): number[] {
  return read(keyFor(owner, apprenant, module))?.pages ?? [];
}
const statusOf = (entry: Entry | null): ModulePagesStatus =>
  entry?.confirmed ? 'confirmed' : entry?.lastError === 'auth' ? 'auth' : entry?.lastError === 'serveur' ? 'error' : 'pending';

/** Ajoute des pages (union durable) puis attend la fin de la passe d'envoi qui les inclut. */
export async function queueModulePagesStatus(apprenant: string, module: number, pages: number[], progress: number): Promise<ModulePagesStatus> {
  if (blockLearnerWrite('save_module_pages_progress')) return 'error';
  const { data } = await supabase.auth.getSession();
  const owner = data.session?.user?.id;
  if (!owner) return 'auth';
  const key = keyFor(owner, apprenant, module);
  const previous = read(key);
  const union = [...new Set([...(previous?.pages ?? []), ...pages])].sort((a, b) => a - b);
  write(key, { owner, apprenant, module, pages: union, progress: Math.max(previous?.progress ?? 0, progress), operation: crypto.randomUUID(), attempts: 0, lastError: null });
  await resumeModulePages();
  return statusOf(read(key));
}
/** Compatibilité : true uniquement après relecture serveur de toutes les pages. */
export async function queueModulePages(apprenant: string, module: number, pages: number[], progress: number) {
  return (await queueModulePagesStatus(apprenant, module, pages, progress)) === 'confirmed';
}

/** Une seule passe à la fois ; un appel pendant une passe en relance une autre (bornée) et attend sa fin. */
export function resumeModulePages(): Promise<void> {
  if (blockLearnerWrite('save_module_pages_progress')) return Promise.resolve();
  if (current) { rerun = true; return current; }
  current = (async () => {
    try {
      let passes = 0;
      do { rerun = false; await onePass(); passes++; } while (rerun && passes < MAX_PASSES);
    } finally { current = null; rerun = false; }
  })();
  return current;
}

async function onePass() {
  const { data } = await supabase.auth.getSession();
  const owner = data.session?.user?.id;
  if (!owner) return;
  const keys = new Set(memory.keys());
  try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith(PREFIX)) keys.add(key); } } catch { /* retain memory */ }
  let retryNeeded = -1;
  for (const key of keys) {
    const item = read(key);
    if (!item || item.owner !== owner || item.confirmed) continue;
    let lastError: ErrorKind | null = null;
    try {
      const result = await freshSessionCall(() => supabase.rpc('save_module_pages_progress', {
        _apprenant_id: item.apprenant, _module_id: item.module, _pages: item.pages, _progress: item.progress,
      }), owner);
      if (result.error) { lastError = authFailure(result.error) ? 'auth' : 'serveur'; throw result.error; }
      const proof = await freshSessionCall(() => supabase.from('apprenant_module_completion').select('pages_completees').eq('apprenant_id', item.apprenant).eq('module_id', item.module).maybeSingle(), owner);
      const saved = proof.data?.pages_completees;
      if (proof.error) { lastError = authFailure(proof.error) ? 'auth' : 'serveur'; throw proof.error; }
      if (!Array.isArray(saved) || !item.pages.every(page => saved.includes(page))) { lastError = 'serveur'; throw new Error('Confirmation progression indisponible'); }
      const now = read(key);
      if (now?.operation === item.operation) write(key, { ...item, confirmed: true, lastError: null });
      else rerun = true; // pages ajoutées pendant l'envoi : nouvelle passe pour la nouvelle opération
      console.info('[pages] accusé serveur', { operation: item.operation });
    } catch (e) {
      if ((e as { sessionAbsente?: boolean })?.sessionAbsente) lastError = 'auth';
      const now = read(key);
      if (now && now.operation === item.operation) {
        const attempts = (now.attempts ?? 0) + 1;
        write(key, { ...now, attempts, lastError: lastError ?? 'serveur' });
        if (attempts <= MAX_AUTO_RETRIES && lastError !== 'auth') retryNeeded = Math.max(retryNeeded, attempts - 1);
      } else rerun = true;
      console.warn('[pages] progression conservée en attente', { operation: item.operation });
    }
  }
  if (retryNeeded >= 0 && !retryTimer && typeof window !== 'undefined') {
    retryTimer = setTimeout(() => { retryTimer = null; void resumeModulePages(); }, RETRY_DELAYS_MS[Math.min(retryNeeded, RETRY_DELAYS_MS.length - 1)]);
  }
}

export function installModulePagesPersistence() {
  window.addEventListener('beforeunload', event => {
    if ([...memory.values()].some(entry => !entry.confirmed)) { event.preventDefault(); event.returnValue = ''; }
  });
  for (const event of ['online', 'focus', 'pageshow']) window.addEventListener(event, () => { void resumeModulePages(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void resumeModulePages(); });
  supabase.auth.onAuthStateChange(() => { setTimeout(() => { void resumeModulePages(); }, 0); });
}
