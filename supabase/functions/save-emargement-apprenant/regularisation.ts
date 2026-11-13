import { SIGNATURE_PASSEE_REFUSEE } from './dateSignature.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Retired route, including old links and action=liste. No database access or write.
export async function traiterRegularisation(_client: unknown, _userId: string, _body: Record<string, unknown>) {
  return new Response(JSON.stringify({ error: SIGNATURE_PASSEE_REFUSEE, code: 'P0541' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
