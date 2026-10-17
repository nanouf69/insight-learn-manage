import { supabase } from '@/integrations/supabase/client';
import { assurerSessionFraiche } from '@/lib/sessionExpiree';
import { documentValidation } from '../../supabase/functions/_shared/documentUploadRules';
export { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, DOCUMENT_MAX_MB, documentValidation } from '../../supabase/functions/_shared/documentUploadRules';

/** Same operation for bounded retries; no content, identity or token in diagnostics. */
export async function uploadInscriptionDocument(form: FormData, operationId = crypto.randomUUID()) {
  const file = form.get('file');
  if (!(file instanceof File)) throw new Error('Fichier requis');
  const type = String(form.get('type_document') ?? '');
  if (!type.startsWith('libre')) {
    const invalid = documentValidation(file, type === 'photo_identite');
    if (invalid) throw new Error(invalid);
  }
  form.set('operation_id', operationId);
  const dossier = String(form.get('apprenant_id') ?? '');
  if (localStorage.getItem('onboarding_apprenant_id') === dossier) {
    const token = localStorage.getItem('onboarding_session_token');
    if (token) form.set('session_token', token);
  }
  let lastError = 'Envoi interrompu. Votre fichier est conservé ; réessayez après reconnexion.';
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await assurerSessionFraiche();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-document-inscription`, {
        method: 'POST', body: form, signal: controller.signal,
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success === true && data.confirmed === true && data.operationId === operationId) return data;
      lastError = data.error || `Envoi refusé (${response.status}). Votre fichier et les anciennes versions sont conservés.`;
      if ([400, 401, 403, 413].includes(response.status)) throw Object.assign(new Error(lastError), { permanent: true });
    } catch (error) {
      if (error instanceof Error && 'permanent' in error) throw error;
    } finally { clearTimeout(timer); }
  }
  throw new Error(lastError);
}