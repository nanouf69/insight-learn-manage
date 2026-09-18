import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCS = [
  { type: "projet-professionnel", label: "Projet professionnel" },
  { type: "analyse-besoin", label: "Analyse des besoins" },
  { type: "test-competences", label: "Test de compétences" },
];

const COURS_URL = "https://insight-learn-manage.lovable.app/cours-public";

const isoToday = () => new Date().toISOString().slice(0, 10);

// Une formation continue ne reçoit jamais ce type de relance
const isFormationContinue = (a: any) => {
  const v = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
  return v.includes("continue") || v.includes("fc-") || v.includes("mobilite") || v.includes("mobilité");
};

// Un document est "réellement rempli" quand toutes les réponses obligatoires sont présentes
function estRempli(type: string, d: any): boolean {
  if (!d || typeof d !== "object") return false;
  if (type === "test-competences") {
    const answers = d.answers && typeof d.answers === "object" ? d.answers : {};
    const total = Array.isArray(d.sectionItems)
      ? d.sectionItems.reduce((acc: number, s: any) => acc + (Array.isArray(s) ? s.length : 0), 0)
      : 0;
    const nb = Object.keys(answers).length;
    return nb > 0 && total > 0 && nb >= total;
  }
  if (type === "analyse-besoin") {
    const elig = d.eligibility && typeof d.eligibility === "object" ? Object.keys(d.eligibility).length : 0;
    const comp = d.complementary && typeof d.complementary === "object" ? Object.keys(d.complementary).length : 0;
    const sign = typeof d.signature === "string" && d.signature.length > 100;
    return elig > 0 && comp > 0 && d.engagementAccepted === true && sign;
  }
  // projet professionnel — mêmes champs obligatoires que le formulaire
  const req = [
    "statutActuel",
    "motivations",
    "dejaTransport",
    "permis3ans",
    "demarchesEntreprise",
    "besoinsAdaptation",
    "accesOrdinateur",
  ];
  const isTaxi = String(d.formType || "").toUpperCase() === "TAXI";
  const extra = isTaxi
    ? [
        "diffTaxiVtc",
        "modeExerciceTaxi",
        "demandeADS",
        "zoneExercice",
        "activitesCompl",
        "connaitZone",
        "conduiteUrbaine",
        "connaitSites",
      ]
    : ["modeExercice", "commentConnu", "consulteProgram", "saitExamen"];
  return [...req, ...extra].every((k) => String(d[k] ?? "").trim() !== "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: { preview?: boolean; apprenant_ids?: string[] } = {};
    try {
      if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
        body = await req.json();
      }
    } catch { /* no body */ }
    const previewOnly = body.preview === true;
    const selectedIds = Array.isArray(body.apprenant_ids) ? body.apprenant_ids : null;

    const today = isoToday();

    // 1. Apprenants actuellement en formation présentielle
    const { data: apprenants, error: errA } = await supabase
      .from("apprenants")
      .select("id, nom, prenom, email, type_apprenant, formation_choisie")
      .is("deleted_at", null)
      .lte("date_debut_cours_en_ligne", today)
      .gte("date_fin_cours_en_ligne", today);
    if (errA) throw errA;

    const enFormation = (apprenants || []).filter((a: any) => {
      const t = (a.type_apprenant || "").toLowerCase().trim();
      if (!t || /-e$/.test(t)) return false;
      if (isFormationContinue(a)) return false;
      return true;
    });
    if (enFormation.length === 0) {
      return new Response(JSON.stringify({ success: true, apprenants: [], valides: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = enFormation.map((a: any) => a.id);

    // 2. Documents existants (validés ou brouillons)
    const docs: any[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("apprenant_documents_completes")
        .select("id, apprenant_id, type_document, donnees")
        .in("apprenant_id", ids.slice(i, i + 100))
        .in("type_document", DOCS.map((d) => d.type));
      if (error) throw error;
      docs.push(...(data || []));
    }

    // 3. Valider les documents réellement remplis mais restés non validés
    const aValider = docs.filter(
      (d) => !d.donnees?._status && estRempli(d.type_document, d.donnees),
    );
    let valides = 0;
    if (!previewOnly) {
      for (const d of aValider) {
        const { error } = await supabase
          .from("apprenant_documents_completes")
          .update({
            donnees: {
              ...d.donnees,
              _status: "completed",
              _validated_at: new Date().toISOString(),
              _validated_by: "controle-dossier",
            },
          })
          .eq("id", d.id);
        if (!error) {
          valides++;
          d.donnees = { ...d.donnees, _status: "completed" };
        }
      }
    } else {
      for (const d of aValider) d.donnees = { ...d.donnees, _status: "completed" };
    }

    // 4. Déterminer ce qui manque réellement
    const okSet = new Set(
      docs
        .filter((d) => d.donnees?._status === "completed")
        .map((d) => `${d.apprenant_id}|${d.type_document}`),
    );

    let cibles = enFormation
      .map((a: any) => ({
        ...a,
        manquants: DOCS.filter((d) => !okSet.has(`${a.id}|${d.type}`)).map((d) => d.label),
      }))
      .filter((a: any) => a.manquants.length > 0);

    if (selectedIds) {
      const allowed = new Set(selectedIds);
      cibles = cibles.filter((a: any) => allowed.has(a.id));
    }

    if (previewOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          a_valider: aValider.length,
          apprenants: cibles.map((a: any) => ({
            id: a.id,
            nom: a.nom,
            prenom: a.prenom,
            email: a.email,
            manquants: a.manquants,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Envoi des relances
    const results: { name: string; email: string; status: string }[] = [];
    for (const a of cibles) {
      const nomComplet = `${a.prenom || ""} ${a.nom || ""}`.trim();
      if (!a.email) {
        results.push({ name: nomComplet, email: "N/A", status: "skipped - pas d'email" });
        continue;
      }

      const subject = "Documents obligatoires à compléter — FTRANSPORT";
      const liste = a.manquants.map((m: string) => `<li><strong>${m}</strong></li>`).join("");
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.6">
          <p>Bonjour ${a.prenom || ""},</p>
          <p>Dans le cadre de votre formation, votre dossier doit être complet. À ce jour, il manque :</p>
          <ul>${liste}</ul>
          <p>Merci de vous connecter à votre espace de formation et de <strong>remplir puis valider</strong> ces documents
          (un document rempli mais non validé n'est pas pris en compte).</p>
          <p><a href="${COURS_URL}" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">Accéder à mon espace formation</a></p>
          <p>Cordialement,<br/>L'équipe FTRANSPORT</p>
        </div>`;

      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/sync-outlook-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            action: "send",
            userEmail: "contact@ftransport.fr",
            to: a.email,
            subject,
            body: html,
          }),
        });
        const sendData = await sendRes.json();
        if (sendData.success) {
          results.push({ name: nomComplet, email: a.email, status: "sent" });
          await supabase.from("emails").insert({
            apprenant_id: a.id,
            type: "sent",
            subject,
            body_html: html,
            sender_email: "contact@ftransport.fr",
            recipients: [a.email],
            sent_at: new Date().toISOString(),
          });
        } else {
          results.push({ name: nomComplet, email: a.email, status: `error: ${sendData.error || "unknown"}` });
        }
      } catch (e: unknown) {
        results.push({
          name: nomComplet,
          email: a.email,
          status: `error: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        en_formation: enFormation.length,
        documents_valides: valides,
        relances: cibles.length,
        sent: results.filter((r) => r.status === "sent").length,
        errors: results.filter((r) => r.status.startsWith("error")).length,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("relance-documents-obligatoires error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
