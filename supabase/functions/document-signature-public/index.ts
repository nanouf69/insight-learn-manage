import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Codes des 3 choix du modèle « choix entraînement pratique VTC » (v1).
const CHOIX_CODES = ["maintenant", "plus_tard", "renonce"];
const MAX_SIGNATURE = 600_000;

const sha256 = async (t: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const parisNow = (d: Date) =>
  d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "medium" }) + " (heure de Paris)";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, token, reponses, choix, signature } = await req.json();
    if (!token || typeof token !== "string" || token.length < 10 || token.length > 200) {
      return json({ error: "Lien invalide" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error } = await supabase
      .from("documents_a_signer")
      .select("id, nom, champs, statut, file_path, destinataire_nom, reponses, signed_at, modele_code, modele_version, texte_fige, texte_empreinte, apprenant_id, choix, signe_le_paris, envoye_le")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!doc) return json({ error: "Document introuvable ou lien expiré" }, 404);

    // ---------- Modèle à choix unique (aucun PDF source) ----------
    if (doc.modele_code) {
      // Un lien préparé mais jamais réellement envoyé n'est pas exploitable.
      if (!doc.envoye_le && doc.statut !== "signe") return json({ error: "Document introuvable ou lien expiré" }, 404);

      let nom = "", prenom = "";
      if (doc.apprenant_id) {
        const { data: a } = await supabase.from("apprenants").select("nom, prenom").eq("id", doc.apprenant_id).maybeSingle();
        nom = a?.nom || ""; prenom = a?.prenom || "";
      }

      if (action === "get") {
        let texte: unknown = null;
        try { texte = JSON.parse(doc.texte_fige || "null"); } catch { texte = null; }
        return json({
          document: {
            modele_code: doc.modele_code,
            modele_version: doc.modele_version,
            nom: doc.nom,
            texte,
            statut: doc.statut,
            nom_eleve: nom,
            prenom_eleve: prenom,
            choix: doc.statut === "signe" ? doc.choix : null,
            signature: doc.statut === "signe" ? (doc.reponses as any)?.signature ?? null : null,
            signe_le_paris: doc.signe_le_paris,
            signed_at: doc.signed_at,
            envoye_le: doc.envoye_le,
            texte_empreinte: doc.texte_empreinte,
          },
        });
      }

      if (action === "submit") {
        if (doc.statut === "signe") return json({ success: true, deja_signe: true, signe_le_paris: doc.signe_le_paris });
        if (typeof choix !== "string" || !CHOIX_CODES.includes(choix)) return json({ error: "Merci de cocher une seule case." }, 400);
        if (typeof signature !== "string" || !signature.startsWith("data:image/png;base64,") || signature.length < 200 || signature.length > MAX_SIGNATURE) {
          return json({ error: "Merci de signer dans le cadre prévu." }, 400);
        }
        if (!doc.texte_fige || (await sha256(doc.texte_fige)) !== doc.texte_empreinte) {
          return json({ error: "Document non conforme, contactez FTRANSPORT." }, 409);
        }
        const now = new Date();
        const { data: upd, error: upErr } = await supabase
          .from("documents_a_signer")
          .update({
            choix,
            reponses: { choix, signature, nom, prenom, user_agent: (req.headers.get("user-agent") || "").slice(0, 300) },
            statut: "signe",
            signed_at: now.toISOString(),
            signe_le_paris: parisNow(now),
          })
          .eq("id", doc.id)
          .neq("statut", "signe")
          .select("id, signe_le_paris");
        if (upErr) {
          // Le trigger d'immuabilité refuse une 2e écriture concurrente.
          if ((upErr as any).code === "42501") return json({ success: true, deja_signe: true });
          throw upErr;
        }
        if (!upd || upd.length === 0) return json({ success: true, deja_signe: true });
        return json({ success: true, signe_le_paris: upd[0].signe_le_paris });
      }

      return json({ error: "Action inconnue" }, 400);
    }

    // ---------- Documents PDF à zones (circuit existant inchangé) ----------
    if (action === "get") {
      const { data: signed } = await supabase.storage
        .from("documents-a-signer")
        .createSignedUrl(doc.file_path, 3600);

      return json({
        document: {
          nom: doc.nom,
          champs: doc.champs,
          statut: doc.statut,
          destinataire_nom: doc.destinataire_nom,
          reponses: doc.reponses,
          signed_at: doc.signed_at,
          fileUrl: signed?.signedUrl || null,
        },
      });
    }

    if (action === "submit") {
      if (doc.statut === "signe") return json({ error: "Ce document a déjà été signé" }, 409);
      if (!reponses || typeof reponses !== "object") return json({ error: "Réponses manquantes" }, 400);

      const { error: upErr } = await supabase
        .from("documents_a_signer")
        .update({ reponses, statut: "signe", signed_at: new Date().toISOString() })
        .eq("id", doc.id)
        .neq("statut", "signe");
      if (upErr) throw upErr;

      return json({ success: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("[document-signature-public]", e);
    return json({ error: "Erreur serveur" }, 500);
  }
});
