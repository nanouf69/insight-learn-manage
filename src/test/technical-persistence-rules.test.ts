// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentValidation, DOCUMENT_MAX_BYTES, verifyOnboardingDocumentToken } from '../../supabase/functions/_shared/documentUploadRules';
import { EXPORT_TABLES, exportManifest } from '../../supabase/functions/sauvegarde-quotidienne-eleves/manifest';
import { canonicalAppUrl } from '@/lib/canonicalOrigin';
const fixture = vi.hoisted(() => ({ owner: 'synthetic-A', token: 'synthetic-token', refreshed: true }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: fixture.owner ? { user: { id: fixture.owner }, access_token: fixture.token } : null } }) } } }));
vi.mock('@/lib/sessionExpiree', () => ({ SESSION_EXPIREE_MESSAGE: 'Session expirée', assurerSessionFraiche: vi.fn(async () => fixture.refreshed ? fixture.token : null) }));
import { freshSessionCall, bounded } from '@/lib/sessionRpc';

describe('Technical boundaries without learner writes', () => {
  beforeEach(() => { fixture.owner = 'synthetic-A'; fixture.refreshed = true; });
  it('accepts exactly 4 MiB, refuses one byte above', () => {
    expect(DOCUMENT_MAX_BYTES).toBe(4194304);
    expect(documentValidation({ name: 'proof.pdf', size: 4194304 })).toBeNull();
    expect(documentValidation({ name: 'proof.pdf', size: 4194305 })).not.toBeNull();
  });
  it('rejects PDF identity photos, accepts aligned image formats', () => {
    expect(documentValidation({ name: 'photo.pdf', size: 20 }, true)).not.toBeNull();
    for (const ext of ['heic', 'heif', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'gif']) expect(documentValidation({ name: `PHOTO.${ext.toUpperCase()}`, size: 20 }, true)).toBeNull();
    expect(documentValidation({ name: 'file.exe', size: 20 })).not.toBeNull();
  });
  it('validates scoped onboarding HMAC and rejects expired/foreign tokens', async () => {
    const exp = 2000000000; const secret = 'synthetic-secret'; const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`onboarding:synthetic-A:${exp}`))), b => b.toString(16).padStart(2, '0')).join('');
    const token = `${exp}.${signature}`;
    expect(await verifyOnboardingDocumentToken('synthetic-A', token, secret, 1000)).toBe(true);
    expect(await verifyOnboardingDocumentToken('synthetic-B', token, secret, 1000)).toBe(false);
    expect(await verifyOnboardingDocumentToken('synthetic-A', token, secret, exp * 1000)).toBe(false);
    expect(await verifyOnboardingDocumentToken('synthetic-A', 'broken', secret, 1000)).toBe(false);
  });
  it('preserves legacy export indices and appends 3 CMA primary keys', () => {
    expect(EXPORT_TABLES).toHaveLength(26);
    expect(EXPORT_TABLES[16]).toEqual(['exam_attempts_v2', 'attempt_id']);
    expect(EXPORT_TABLES[22]).toEqual(['donnees_eleves_suppressions', 'id']);
    expect(EXPORT_TABLES.slice(23)).toEqual([['cma_planning_lignes', 'id'], ['cma_planning_attente', 'id'], ['cma_planning_attente_rattachements', 'id']]);
  });
  it('23 old counts cannot claim completeness at 26', () => {
    const legacy = Object.fromEntries(EXPORT_TABLES.slice(0, 23).map(([name]) => [name, 0]));
    expect(exportManifest(legacy, []).erreurs).toHaveLength(3);
    expect(exportManifest(legacy, [], EXPORT_TABLES.slice(0, 23).map(([name]) => name)).tables).toBe(23);
    const all = Object.fromEntries(EXPORT_TABLES.map(([name]) => [name, 0]));
    expect(exportManifest(all, []).erreurs).toEqual([]);
    expect(exportManifest(all, []).version).toBe(2);
  });
  it('canonizes only known trailing-dot host preserving path/query/hash', () => {
    expect(canonicalAppUrl('https://gestion.ftransport.fr./cours?m=8#q3')).toBe('https://gestion.ftransport.fr/cours?m=8#q3');
    expect(canonicalAppUrl('https://gestion.ftransport.fr.evil.test./cours')).toBeNull();
    expect(canonicalAppUrl('https://gestion.ftransport.fr/cours')).toBeNull();
  });
  it('never calls anonymous or foreign-owner RPC', async () => {
    const call = vi.fn(async () => ({ error: null }));
    fixture.owner = '';
    await expect(freshSessionCall(call, 'synthetic-A')).rejects.toThrow('Session expirée');
    fixture.owner = 'synthetic-B';
    await expect(freshSessionCall(call, 'synthetic-A')).rejects.toThrow('Session expirée');
    expect(call).not.toHaveBeenCalled();
  });
  it('rejects a nonempty read completed after account switch', async () => {
    await expect(freshSessionCall(async () => { fixture.owner = 'synthetic-B'; return { data: ['existing'], error: null }; }, 'synthetic-A')).rejects.toThrow('Session expirée');
  });
  it('retries permission denial at most once after renewal, never clears it', async () => {
    const call = vi.fn(async () => ({ error: { code: '42501', message: 'permission denied' } }));
    expect((await freshSessionCall(call, 'synthetic-A')).error.code).toBe('42501');
    expect(call).toHaveBeenCalledTimes(2);
  });
  it('bounds a permanently stalled request', async () => {
    vi.useFakeTimers();
    const promise = bounded(new Promise(() => {}), 50);
    const check = expect(promise).rejects.toThrow('Délai réseau');
    await vi.advanceTimersByTimeAsync(50); await check; vi.useRealTimers();
  });
});