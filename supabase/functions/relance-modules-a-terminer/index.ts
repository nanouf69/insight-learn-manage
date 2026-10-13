// Relance automatique "heures atteintes mais modules non terminés".
// Tous les 3 jours max par élève, tant que tous les modules attribués ne sont pas terminés.
// Lecture seule sur les données élèves : n'écrit que l'e-mail envoyé (table emails) et une alerte récap.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";
import { etatModules, exclusionRelance, mailModulesATerminer, TAGS_RELANCE_PEDAGOGIQUE } from "../_shared/relance-modules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_SESSION_MS = 7 * 60 * 60 * 1000;
const SUBJECT_TAG = "Terminez vos modules";
const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60, "taxi-e": 90, "ta-e": 35, "va-e": 7,
};

async function fetchAllPages<T>(query: any): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

const passed = (v: any) => ["oui", "admis", "reussi", "réussi"].includes(String(v ?? "").toLowerCase());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000 + 3600000); // marge 1h pour le cron quotidien

    const apprenants = await fetchAllPages<any>(
      sb.from("apprenants")
        .select("id, nom, prenom, email, type_apprenant, formation_choisie, modules_autorises, statut, deleted_at, compte_cours_archive_at, resultat_examen, resultat_examen_pratique, date_debut_cours_en_ligne, date_fin_cours_en_ligne, date_debut_formation, date_fin_formation")
        .not("email", "is", null).is("deleted_at", null).order("id"),
    );
    const [{ data: tests, error: tErr }, { data: gels, error: gErr }, { data: noms, error: nErr }] = await Promise.all([
      sb.from("comptes_test_techniques").select("apprenant_id"),
      sb.from("releve_jalons_fin_acces").select("apprenant_id"),
      sb.from("module_editor_state").select("module_id, nom:module_data->>nom"),
    ]);
    if (tErr || gErr || nErr) throw tErr || gErr || nErr; // exclusion illisible => aucun envoi
    const testIds = new Set((tests || []).map((t: any) => t.apprenant_id));
    const ctx = { testIds, gelIds: new Set((gels || []).map((g: any) => g.apprenant_id)) };
    const nomsModules = new Map((noms || []).map((n: any) => [Number(n.module_id), String(n.nom || "").trim()]));
    const nomModule = (id: number) => nomsModules.get(id) || `Module ${id}`;

    const candidats = apprenants.filter((a) => {
      const t = String(a.type_apprenant || a.formation_choisie || "").toLowerCase();
      if (!HEURES_REQUISES[t] || exclusionRelance(a, now, ctx)) return false;
      if (String(a.statut || "").toLowerCase() === "archive" || passed(a.resultat_examen)) return false;
      if (!Array.isArray(a.modules_autorises) || a.modules_autorises.length === 0) return false;
      const debut = a.date_debut_cours_en_ligne || a.date_debut_formation;
      const fin = a.date_fin_cours_en_ligne || a.date_fin_formation;
      if (!debut || new Date(debut) > now) return false;
      if (fin && new Date(fin + "T23:59:59") < now) return false;
      return true;
    });

    const results: any[] = [];
    for (const a of candidats) {
      const t = String(a.type_apprenant || a.formation_choisie).toLowerCase();
      const requis = HEURES_REQUISES[t];
      const { data: comp, error: cErr } = await sb.from("apprenant_module_completion").select("module_id, status").eq("apprenant_id", a.id);
      if (cErr) { results.push({ id: a.id, skipped: "lecture modules impossible" }); continue; }
      const etat = etatModules(a.modules_autorises, comp || []);
      if (!etat.relancePertinente) continue; // tout fait, ou seule la pratique physique reste

      const debut = Date.parse(a.date_debut_cours_en_ligne || a.date_debut_formation);
      const connexions = await fetchAllPages<any>(
        sb.from("apprenant_connexions").select("started_at, ended_at, last_seen_at")
          .eq("apprenant_id", a.id).order("started_at"),
      );
      let ms = 0;
      for (const c of connexions) {
        const s = Date.parse(c.started_at);
        if (Number.isNaN(s) || s < debut) continue;
        const eRaw = Date.parse(c.ended_at || c.last_seen_at);
        const e = Number.isNaN(eRaw) ? s : Math.min(eRaw, s + MAX_SESSION_MS);
        if (e > s) ms += e - s;
      }
      const heures = ms / 3600000;
      if (heures < requis) continue;

      // Anti-doublon commun : aucune autre relance pédagogique (inactifs inclus) dans la fenêtre existante de 3 jours.
      const { data: recent, error: rErr } = await sb.from("emails").select("id").eq("apprenant_id", a.id)
        .or(TAGS_RELANCE_PEDAGOGIQUE.map((tag) => `subject.ilike.%${tag}%`).join(",")).gte("sent_at", threeDaysAgo.toISOString()).limit(1);
      if (rErr || (recent && recent.length)) { results.push({ id: a.id, skipped: "recent" }); continue; }

      const { subject, html, preview } = mailModulesATerminer({ prenom: a.prenom, etat, nomModule });
      try {
        await sendBrandedEmail({ to: a.email, subject, html, replyTo: "contact@ftransport.fr" });
        await sb.from("emails").insert({
          apprenant_id: a.id, subject, body_html: html,
          body_preview: preview,
          sender_email: "contact@ftransport.fr", sender_name: "FTRANSPORT", recipients: [a.email],
          type: "sent", is_read: true, has_attachments: false, sent_at: new Date().toISOString(),
        });
        results.push({ id: a.id, success: true, modules: `${etat.termines.length}/${etat.requis.length}` });
      } catch (e) {
        results.push({ id: a.id, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => r.success === false).length;
    if (sent + failed > 0) {
      await sb.from("alertes_systeme").insert({
        type: "relance_modules_a_terminer",
        titre: "📚 Relance « Terminez vos modules »",
        message: `${sent} e-mail(s) envoyé(s), ${failed} échec(s)`,
        details: JSON.stringify(results),
      });
    }
    return new Response(JSON.stringify({ success: true, sent, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
