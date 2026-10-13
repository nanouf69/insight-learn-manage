import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";
// Avertissement d'origine conservé tel quel (indépendant des heures).
const AVERTISSEMENT_SANCTIONS = `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #dc2626; margin-top: 0;">⚠️ Rappel important – sanctions en cas d'abandon ou de manquement à vos engagements</h3>
                <p style="font-size: 14px; line-height: 1.6; color: #991b1b; font-weight: bold;">
                  En cas d'abandon de la formation ou de manquement à vos engagements, les sanctions suivantes peuvent s'appliquer :
                </p>
                <ul style="font-size: 14px; line-height: 1.8; color: #991b1b; font-weight: bold;">
                  <li>Abandonne la formation / manque à ses engagements : <strong>remboursement des frais engagés</strong> – R.6333-7 du code du travail</li>
                  <li>Absent sans motif légitime à l'examen final : <strong>CPF bloqué temporairement pour toute nouvelle formation</strong> – Art. 59, loi du 25/06/2026</li>
                  <li>Pour <strong>France Travail</strong>, l'abandon (même sans fraude, un simple arrêt en cours de route) déclenche potentiellement : <strong>arrêt immédiat de la rémunération/cotisations</strong> (L.6342-1 + instruction DG 2024-6), <strong>remboursement du trop-perçu</strong>, et <strong>suspension de l'ARE de 1 à 4 mois</strong> (R.5412-4).</li>
                </ul>
              </div>
`;
import { etatModules, exclusionRelance, mailModulesATerminer, TAGS_RELANCE_PEDAGOGIQUE } from "../_shared/relance-modules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    console.log(`[relance-inactifs] Running for date: ${today.toISOString()}`);

    // Sélection : accès e-learning actif (règles communes) + inactivité > 2 jours (indice seulement)
    // + au moins un module EN LIGNE attribué non « completed » côté serveur.
    const apprenants: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin.from("apprenants")
        .select("id, prenom, email, auth_user_id, formation_choisie, type_apprenant, modules_autorises, statut, deleted_at, compte_cours_archive_at, resultat_examen, resultat_examen_pratique, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation")
        .not("auth_user_id", "is", null).not("email", "is", null).order("id").range(from, from + 999);
      if (error) throw error;
      apprenants.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const [{ data: tests, error: tErr }, { data: gels, error: gErr }, { data: noms, error: nErr }] = await Promise.all([
      supabaseAdmin.from("comptes_test_techniques").select("apprenant_id"),
      supabaseAdmin.from("releve_jalons_fin_acces").select("apprenant_id"),
      supabaseAdmin.from("module_editor_state").select("module_id, nom:module_data->>nom"),
    ]);
    if (tErr || gErr || nErr) throw tErr || gErr || nErr; // jamais d'envoi si une exclusion est illisible
    const ctx = { testIds: new Set((tests || []).map((t: any) => t.apprenant_id)), gelIds: new Set((gels || []).map((g: any) => g.apprenant_id)) };
    const nomsModules = new Map((noms || []).map((n: any) => [Number(n.module_id), String(n.nom || "").trim()]));
    const nomModule = (id: number) => nomsModules.get(id) || `Module ${id}`;
    const eligible = apprenants.filter((a) => !exclusionRelance(a, today, ctx));

    const toSend: Array<{ a: any; etat: ReturnType<typeof etatModules> }> = [];
    for (const a of eligible) {
      const { data: rows, error } = await supabaseAdmin.from("apprenant_connexions")
        .select("last_seen_at, started_at").eq("apprenant_id", a.id).order("started_at", { ascending: false }).limit(1);
      if (error) continue;
      if (!rows || rows.length === 0) continue; // jamais connecté = relance-non-connectes
      if (new Date(rows[0].last_seen_at || rows[0].started_at) >= twoDaysAgo) continue;
      const { data: comp, error: cErr } = await supabaseAdmin.from("apprenant_module_completion").select("module_id, status").eq("apprenant_id", a.id);
      if (cErr) continue;
      const etat = etatModules(a.modules_autorises, comp || []);
      if (!etat.relancePertinente) continue; // tout fait (ou seule la pratique physique reste) : pas de relance
      const { data: recent, error: rErr } = await supabaseAdmin.from("emails").select("id").eq("apprenant_id", a.id)
        .or(TAGS_RELANCE_PEDAGOGIQUE.map((t) => `subject.ilike.%${t}%`).join(",")).gte("sent_at", twoDaysAgo.toISOString()).limit(1);
      if (rErr || (recent && recent.length)) continue; // anti-doublon commun aux relances pédagogiques
      toSend.push({ a, etat });
    }
    console.log(`[relance-inactifs] ${toSend.length} relance(s) pédagogique(s) à envoyer`);

    const senderEmail = "contact@ftransport.fr";
    const results: { id: string; success: boolean; error?: string }[] = [];
    for (const { a: apprenant, etat } of toSend) {
      const { subject, html: emailBody, preview } = mailModulesATerminer({ prenom: apprenant.prenom, etat, nomModule, avertissementHtml: AVERTISSEMENT_SANCTIONS });
      try {
        await sendBrandedEmail({ to: apprenant.email, subject, html: emailBody, replyTo: senderEmail });
        await supabaseAdmin.from("emails").insert({
          apprenant_id: apprenant.id, subject, body_preview: preview, body_html: emailBody,
          sender_email: senderEmail, sender_name: "FTRANSPORT", recipients: [apprenant.email],
          type: "sent", is_read: true, has_attachments: false, sent_at: new Date().toISOString(),
        });
        results.push({ id: apprenant.id, success: true });
      } catch (sendError) {
        results.push({ id: apprenant.id, success: false, error: sendError instanceof Error ? sendError.message : String(sendError) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (results.length > 0) {
      await supabaseAdmin.from("alertes_systeme").insert({
        type: "relance_inactifs",
        titre: `Relance pédagogique : modules à terminer`,
        message: `${successCount} relance(s) modules envoyée(s), ${failCount} échec(s)`,
        details: JSON.stringify(results),
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[relance-inactifs] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
