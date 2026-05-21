import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanText = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
};

const cleanNumber = (value: unknown) => {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(raw) ? raw : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return json({ error: "Données invalides" }, 400);
    }

    const body = payload as Record<string, unknown>;
    const token = cleanText(body.token);
    const fournisseurId = cleanText(body.fournisseur_id);
    const nom = cleanText(body.nom);
    const prenom = cleanText(body.prenom);

    if (!token || !fournisseurId || !nom || !prenom) {
      return json({ error: "Token, fournisseur, nom et prénom sont requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: fournisseur, error: fournisseurError } = await supabase
      .from("fournisseurs")
      .select("id, nom, actif")
      .eq("id", fournisseurId)
      .eq("token", token)
      .single();

    if (fournisseurError || !fournisseur || !fournisseur.actif) {
      return json({ error: "Lien fournisseur invalide ou désactivé" }, 403);
    }

    const civilite = cleanText(body.civilite);
    const email = cleanText(body.email);
    const telephone = cleanText(body.telephone);
    const adresse = cleanText(body.adresse);
    const codePostal = cleanText(body.code_postal);
    const ville = cleanText(body.ville);
    const formationChoisie = cleanText(body.formation_choisie);
    const typeApprenant = cleanText(body.type_apprenant);
    const montantTtc = cleanNumber(body.montant_ttc);
    const dateDebutFormation = cleanText(body.date_debut_formation);
    const dateFinFormation = cleanText(body.date_fin_formation);
    const modeFinancement = cleanText(body.mode_financement) ?? "personnel";
    const organismeFinanceur = cleanText(body.organisme_financeur);
    const inscritFranceTravail = body.inscrit_france_travail === true;

    const { data: apprenant, error: apprenantError } = await supabase
      .from("apprenants")
      .insert({
        civilite,
        nom,
        prenom,
        email,
        telephone,
        adresse,
        code_postal: codePostal,
        ville,
        formation_choisie: formationChoisie,
        type_apprenant: typeApprenant,
        montant_ttc: montantTtc,
        date_debut_formation: dateDebutFormation,
        date_fin_formation: dateFinFormation,
        inscrit_france_travail: inscritFranceTravail,
        mode_financement: modeFinancement,
        organisme_financeur: organismeFinanceur,
        statut: "fournisseur",
        notes: `Via fournisseur: ${fournisseur.nom}`,
      })
      .select("id")
      .single();

    if (apprenantError || !apprenant) {
      console.error("apprenant insert error", apprenantError);
      return json({ error: "Erreur CRM: impossible d'ajouter l'apprenant" }, 500);
    }

    const { data: fournisseurApprenant, error: linkError } = await supabase
      .from("fournisseur_apprenants")
      .insert({
        fournisseur_id: fournisseurId,
        civilite,
        nom,
        prenom,
        email,
        telephone,
        adresse,
        code_postal: codePostal,
        ville,
        formation_choisie: formationChoisie,
        type_apprenant: typeApprenant,
        montant_ttc: montantTtc,
        date_formation_catalogue: dateDebutFormation,
        date_examen_pratique: dateFinFormation,
        inscrit_france_travail: inscritFranceTravail,
        mode_financement: modeFinancement,
        organisme_financeur: organismeFinanceur,
        notes: `apprenant_id:${apprenant.id}`,
      })
      .select("id, nom, prenom, formation_choisie, created_at, notes")
      .single();

    if (linkError || !fournisseurApprenant) {
      console.error("fournisseur_apprenants insert error", linkError);
      await supabase.from("apprenants").delete().eq("id", apprenant.id);
      return json({ error: "Erreur portail: impossible de lier l'apprenant au fournisseur" }, 500);
    }

    return json({ success: true, apprenant_id: apprenant.id, fournisseur_apprenant: fournisseurApprenant });
  } catch (err) {
    console.error("create-fournisseur-apprenant error", err);
    return json({ error: "Erreur serveur: " + (err as Error).message }, 500);
  }
});
