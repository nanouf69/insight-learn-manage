import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Livres de formation : consultation par pages rendues (élève de la formation exacte ou admin),
// PDF original réservé aux admins. Le bucket est privé ; aucun lien vers le PDF n'est donné aux élèves.
const BUCKET = "livres-formation";
const FORMATIONS = ["vtc", "taxi", "ta", "va"] as const;
type Formation = typeof FORMATIONS[number];
const TTL = 120;
const MAX_LOT = 10;

export function normaliserFormation(type: string | null | undefined): Formation | null {
  const t = (type ?? "").trim().toLowerCase().replace(/(-e)?(-presentiel)?$/, "").replace(/-e$/, "");
  return (FORMATIONS as readonly string[]).includes(t) ? (t as Formation) : null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json(401, { error: "non_connecte" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
    const uid = claims?.claims?.sub;
    if (cErr || !uid) return json(401, { error: "non_connecte" });

    const body = await req.json().catch(() => ({}));
    const formation = body?.formation as Formation;
    const action = body?.action as string;
    if (!FORMATIONS.includes(formation)) return json(400, { error: "formation_invalide" });
    if (!["manifest", "pages", "original"].includes(action)) return json(400, { error: "action_invalide" });

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: estAdmin, error: rErr } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (rErr) return json(500, { error: "lecture_role_impossible" });

    if (!estAdmin) {
      if (action === "original") return json(403, { error: "telechargement_reserve_admin" });
      const { data: apps, error: aErr } = await admin
        .from("apprenants").select("type_apprenant, compte_cours_archive_at").eq("auth_user_id", uid);
      if (aErr) return json(500, { error: "lecture_apprenant_impossible" });
      const ok = (apps ?? []).some((a) => !a.compte_cours_archive_at && normaliserFormation(a.type_apprenant) === formation);
      if (!ok) return json(403, { error: "formation_non_autorisee" });
    }

    const { data: mf, error: mErr } = await admin.storage.from(BUCKET).download(`${formation}/actuel.json`);
    if (mErr || !mf) return json(500, { error: "livre_indisponible" });
    const manifest = JSON.parse(await mf.text()) as { version: string; pages: number; fichier: string };
    const base = `${formation}/${manifest.version}`;

    if (action === "manifest") return json(200, { version: manifest.version, pages: manifest.pages, admin: !!estAdmin });

    if (action === "original") {
      const { data, error } = await admin.storage.from(BUCKET)
        .createSignedUrl(`${base}/original.pdf`, TTL, { download: manifest.fichier });
      if (error) return json(500, { error: "lien_impossible" });
      return json(200, { url: data.signedUrl });
    }

    const debut = Math.max(1, Math.floor(Number(body?.debut) || 1));
    const fin = Math.min(manifest.pages, debut + MAX_LOT - 1);
    const chemins = [];
    for (let p = debut; p <= fin; p++) chemins.push(`${base}/page-${String(p).padStart(3, "0")}.jpg`);
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(chemins, TTL);
    if (error) return json(500, { error: "lien_impossible" });
    return json(200, { pages: data.map((d, i) => ({ numero: debut + i, url: d.signedUrl })) });
  } catch (_e) {
    return json(500, { error: "erreur_serveur" });
  }
});
