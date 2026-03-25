import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_PLACES = 16;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Validation des champs obligatoires
    const { prenom, nom, email, telephone, adresse, type, date_debut, date_fin, date_label } = body;

    if (!prenom?.trim() || !nom?.trim() || !email?.trim() || !telephone?.trim() || !adresse?.trim()) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants: prenom, nom, email, telephone, adresse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || !["vtc", "taxi"].includes(type.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Type de formation invalide. Valeurs acceptées: vtc, taxi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!date_debut || !date_fin) {
      return new Response(
        JSON.stringify({ error: "Dates de formation obligatoires (date_debut, date_fin)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formationType = type.toLowerCase() as "vtc" | "taxi";
    const prix = formationType === "vtc" ? 200 : 299;
    const formationChoisie = `formation-continue-${formationType}`;
    const typeApprenant = formationType === "vtc" ? "PA VTC" : "PA TAXI";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Trouver ou créer la session AVANT de créer l'apprenant
    const sessionNom = `Formation Continue ${formationType.toUpperCase()} - ${date_label || date_debut}`;

    const { data: existingSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("date_debut", date_debut)
      .eq("date_fin", date_fin)
      .eq("type_session", "theorique");

    let sessionId: string;
    const matchingSession = existingSessions?.find(
      (s: any) =>
        s.nom?.toLowerCase().includes("formation continue") &&
        s.nom?.toLowerCase().includes(formationType)
    );

    if (matchingSession) {
      // Count REAL enrollments instead of trusting the counter
      const { count: realCount } = await supabase
        .from("session_apprenants")
        .select("id", { count: "exact", head: true })
        .eq("session_id", matchingSession.id);

      const actualEnrolled = realCount ?? 0;
      if (actualEnrolled >= MAX_PLACES) {
        return new Response(
          JSON.stringify({ error: "Cette session est complète. Veuillez choisir une autre date.", complet: true }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      sessionId = matchingSession.id;
    } else {
      const { data: newSession, error: sessionErr } = await supabase
        .from("sessions")
        .insert({
          nom: sessionNom,
          date_debut,
          date_fin,
          types_apprenant: [typeApprenant],
          places_disponibles: MAX_PLACES,
          statut: "planifiee",
          type_session: "theorique",
          lieu: "86 route de genas 69003 Lyon",
          heure_debut: "09:00",
          heure_fin: "17:00",
        })
        .select()
        .single();

      if (sessionErr) {
        console.error("Erreur création session:", sessionErr);
        throw new Error(`Erreur création session: ${sessionErr.message}`);
      }
      sessionId = newSession.id;
    }

    // 2. Créer l'apprenant (seulement après vérification de la session)
    const { data: apprenant, error: apprenantErr } = await supabase
      .from("apprenants")
      .insert({
        prenom: prenom.trim(),
        nom: nom.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        telephone: telephone.trim(),
        adresse: adresse.trim(),
        code_postal: body.code_postal?.trim() || null,
        ville: body.ville?.trim() || null,
        date_naissance: body.date_naissance || null,
        formation_choisie: formationChoisie,
        type_apprenant: typeApprenant,
        montant_ttc: prix,
        montant_paye: 0,
        mode_financement: "personnel",
        statut: "particulier",
        date_debut_formation: date_debut,
        date_fin_formation: date_fin,
        date_formation_catalogue: date_label || `${date_debut} - ${date_fin}`,
      })
      .select()
      .single();

    if (apprenantErr) {
      console.error("Erreur création apprenant:", apprenantErr);
      throw new Error(`Erreur création apprenant: ${apprenantErr.message}`);
    }

    // 3. Lier l'apprenant à la session
    const { error: linkErr } = await supabase.from("session_apprenants").insert({
      session_id: sessionId,
      apprenant_id: apprenant.id,
      montant_total: prix,
      montant_paye: 0,
      mode_financement: "personnel",
      date_debut,
      date_fin,
    });

    if (linkErr) {
      console.error("Erreur liaison session:", linkErr);
      throw new Error(`Erreur liaison session: ${linkErr.message}`);
    }

    // 4. Mettre à jour places_disponibles avec le vrai count
    const { count: updatedCount } = await supabase
      .from("session_apprenants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    await supabase
      .from("sessions")
      .update({ places_disponibles: Math.max(0, MAX_PLACES - (updatedCount ?? 0)) })
      .eq("id", sessionId);

    console.log(`✅ Inscription réussie: ${apprenant.prenom} ${apprenant.nom} -> session ${sessionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        apprenant_id: apprenant.id,
        session_id: sessionId,
        message: "Inscription enregistrée avec succès",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Erreur inscription:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
