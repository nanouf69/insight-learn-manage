import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_PDF_OCTETS = 30 * 1024 * 1024;
const J = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function versBase64(octets: Uint8Array): string {
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return J({ error: "Méthode non autorisée" }, 405);
  try {
    const body = await req.json();
    const cible = new URL(String(body?.signed_url ?? ""));
    const backend = new URL(Deno.env.get("SUPABASE_URL")!);
    if (cible.protocol !== "https:" || cible.origin !== backend.origin || !cible.pathname.startsWith("/storage/v1/object/sign/") || !cible.searchParams.has("token")) {
      return J({ error: "Lien privé refusé" }, 400);
    }
    const source = await fetch(cible);
    if (!source.ok) return J({ error: "PDF privé indisponible" }, 502);
    const annonce = Number(source.headers.get("content-length") ?? 0);
    if (annonce > MAX_PDF_OCTETS) return J({ error: "PDF trop volumineux" }, 413);
    const octets = new Uint8Array(await source.arrayBuffer());
    if (octets.length > MAX_PDF_OCTETS) return J({ error: "PDF trop volumineux" }, 413);
    if (octets.length < 5 || new TextDecoder().decode(octets.subarray(0, 5)) !== "%PDF-") return J({ error: "Le fichier privé n’est pas un PDF" }, 415);
    return J({ ok: true, pdf_base64: versBase64(octets), taille: octets.length });
  } catch {
    return J({ error: "Lecture du PDF privé impossible" }, 400);
  }
});
