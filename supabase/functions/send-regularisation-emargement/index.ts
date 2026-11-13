import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Retired sender: no personal retroactive link, provider call or database write.
Deno.serve(req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: 'Les liens de signature rétroactive sont interdits. Utilisez la gestion administrative justifiée de présence ou d’absence.',
    code: 'P0541',
  }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
