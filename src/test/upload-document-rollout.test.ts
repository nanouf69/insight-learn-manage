// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/sessionExpiree', () => ({ assurerSessionFraiche: vi.fn(async () => null) }));
import { uploadInscriptionDocument } from '@/lib/documentUpload';
const op = '22222222-2222-4222-8222-222222222222';
const values = new Map<string,string>();
const form = () => { const f = new FormData(); f.set('file', new File(['synthetic'], 'proof.pdf', { type:'application/pdf' })); f.set('apprenant_id','synthetic-A'); f.set('type_document','permis'); return f; };
describe('Coordinated upload rollout without real requests', () => {
  beforeEach(() => { values.clear(); vi.stubGlobal('localStorage', { getItem: (k:string) => values.get(k) ?? null }); });
  afterEach(() => vi.unstubAllGlobals());
  it('old backend without receipt never confirms or automatically reuploads', async () => {
    const fetcher = vi.fn(async () => Response.json({ success:true, storagePath:'legacy' })); vi.stubGlobal('fetch',fetcher);
    const f = form(); await expect(uploadInscriptionDocument(f,op)).rejects.toThrow('Accusé de dépôt non confirmé');
    expect(fetcher).toHaveBeenCalledTimes(1); expect(f.get('file')).toBeInstanceOf(File);
  });
  it('same onboarding dossier sends existing token and accepts exact receipt', async () => {
    values.set('onboarding_apprenant_id','synthetic-A'); values.set('onboarding_session_token','synthetic-hmac');
    const fetcher = vi.fn(async () => Response.json({ success:true, confirmed:true, operationId:op })); vi.stubGlobal('fetch',fetcher);
    const f = form(); expect((await uploadInscriptionDocument(f,op)).confirmed).toBe(true);
    expect(f.get('session_token')).toBe('synthetic-hmac'); expect(f.get('operation_id')).toBe(op);
  });
  it('foreign onboarding storage never leaks token into another dossier', async () => {
    values.set('onboarding_apprenant_id','synthetic-B'); values.set('onboarding_session_token','synthetic-hmac');
    vi.stubGlobal('fetch',vi.fn(async () => Response.json({ error:'Session expirée ; rouvrez votre lien' },{status:401})));
    const f = form(); await expect(uploadInscriptionDocument(f,op)).rejects.toThrow('Session expirée'); expect(f.has('session_token')).toBe(false);
  });
});