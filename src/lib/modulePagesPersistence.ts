import { supabase } from '@/integrations/supabase/client';
import { freshSessionCall } from '@/lib/sessionRpc';
import { blockLearnerWrite } from '@/lib/learnerPreviewGuard';

const PREFIX = 'module_pages_pending_v1:';
type Entry = { owner: string; apprenant: string; module: number; pages: number[]; progress: number; operation: string; confirmed?: boolean };
let running = false;
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
export async function queueModulePages(apprenant: string, module: number, pages: number[], progress: number) {
  if (blockLearnerWrite('save_module_pages_progress')) return false;
  const { data } = await supabase.auth.getSession();
  const owner = data.session?.user?.id;
  if (!owner) return false;
  const key = keyFor(owner, apprenant, module);
  const previous = read(key);
  write(key, { owner, apprenant, module, pages: [...new Set([...(previous?.pages ?? []), ...pages])], progress: Math.max(previous?.progress ?? 0, progress), operation: crypto.randomUUID() });
  await resumeModulePages();
  return read(key)?.confirmed === true;
}
export async function resumeModulePages() {
  if (running || blockLearnerWrite('save_module_pages_progress')) return;
  running = true;
  try {
    const { data } = await supabase.auth.getSession();
    const owner = data.session?.user?.id;
    if (!owner) return;
    const keys = new Set(memory.keys());
    try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith(PREFIX)) keys.add(key); } } catch { /* retain memory */ }
    for (const key of keys) {
      const item = read(key);
      if (!item || item.owner !== owner || item.confirmed) continue;
      try {
        const result = await freshSessionCall(() => supabase.rpc('save_module_pages_progress', {
          _apprenant_id: item.apprenant, _module_id: item.module, _pages: item.pages, _progress: item.progress,
        }), owner);
        if (result.error) throw result.error;
        const proof = await freshSessionCall(() => supabase.from('apprenant_module_completion').select('pages_completees').eq('apprenant_id', item.apprenant).eq('module_id', item.module).maybeSingle(), owner);
        const saved = proof.data?.pages_completees;
        if (proof.error || !Array.isArray(saved) || !item.pages.every(page => saved.includes(page))) throw new Error('Confirmation progression indisponible');
        if (read(key)?.operation === item.operation) write(key, { ...item, confirmed: true });
        console.info('[pages] accusé serveur', { operation: item.operation });
      } catch { console.warn('[pages] progression conservée en attente', { operation: item.operation }); }
    }
  } finally { running = false; }
}
export function installModulePagesPersistence() {
  window.addEventListener('beforeunload', event => {
    if ([...memory.values()].some(entry => !entry.confirmed)) { event.preventDefault(); event.returnValue = ''; }
  });
  for (const event of ['online', 'focus', 'pageshow']) window.addEventListener(event, () => { void resumeModulePages(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void resumeModulePages(); });
  supabase.auth.onAuthStateChange(() => { setTimeout(() => { void resumeModulePages(); }, 0); });
}