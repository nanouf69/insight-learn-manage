import { createClient } from "npm:@supabase/supabase-js@2";
import { preparer, envoyer, renvoyer } from "../_shared/attestationFinCore.ts";
import { depsAttestation } from "../_shared/attestationFinDeps.ts";
import { fermerCompteApresAttestation } from "../_shared/attestationCompteFermeture.ts";
import { depsFermeture } from "../_shared/attestationCompteFermetureDeps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Non autorisé" }, 401);
    const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await authClient.auth.getClaims(authHeader.slice(7));
    if (cErr || !claims?.claims?.sub) return json({ error: "Non autorisé" }, 401);
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const adminId = claims.claims.sub as string;
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: adminId, _role: "admin" });
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => null);
    const deps = depsAttestation(db, { authHeader, supabaseUrl: url });
    if (body?.action === "preparer" && typeof body.apprenantId === "string" && UUID.test(body.apprenantId)) {
      return json(await preparer(deps, {
        apprenantId: body.apprenantId, adminId, representant: body.representant, autoriseSignatureCentre: body.autoriseSignatureCentre,
        heures: body.heures && typeof body.heures === "object" ? body.heures : null,
        signaturesPresentiel: body.signaturesPresentiel && typeof body.signaturesPresentiel === "object" ? body.signaturesPresentiel : null,
      }));
    }
    if (body?.action === "envoyer" && typeof body.docId === "string" && UUID.test(body.docId)) {
      const r = await envoyer(deps, body.docId, adminId);
      // Après envoi confirmé seulement : accès au compte cours fermé et plus aucun mail (données conservées).
      if (r.etat === "envoye" || r.etat === "deja_envoye") {
        let fermeture: unknown;
        try { fermeture = await fermerCompteApresAttestation(depsFermeture(db, adminId), body.docId); }
        catch (e) { fermeture = { etat: "a_verifier", raison: e instanceof Error ? e.message : "Erreur" }; }
        return json({ ...r, fermeture });
      }
      return json(r);
    }
    if (body?.action === "renvoyer" && typeof body.docId === "string" && UUID.test(body.docId)) {
      return json(await renvoyer(deps, body.docId, adminId));
    }
    if (body?.action === "fermer_compte" && typeof body.docId === "string" && UUID.test(body.docId)) {
      return json(await fermerCompteApresAttestation(depsFermeture(db, adminId), body.docId));
    }
    return json({ error: "Requête invalide" }, 400);
  } catch (e) {
    console.error("[attestation-fin-formation]", e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
