import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";

const DEST = "contact@ftransport.fr";
const LIBELLES: Record<string, string> = {
  ajout: "Ajout", suppression: "Suppression", retrait: "Retrait (exercice masqué)",
  remise_en_ligne: "Remise en ligne", deplacement: "Déplacement",
  modification_texte: "Modification du texte", modification_reponses: "Modification des réponses / bonne réponse",
};
const AUTEURS: Record<string, string> = { humain: "Compte humain", agent_ou_fonction: "Agent / fonction serveur", automatique: "Traitement automatique" };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const resume = (q: any) => {
  if (!q) return "—";
  const x = q.question ?? q;
  const choix = Array.isArray(x.choix) ? x.choix.map((c: any) => `${c.lettre ?? ""}${c.correct ? "✔" : ""} ${c.texte ?? ""}`).join(" | ") : "";
  const txt = `${x.enonce ?? ""}${choix ? " — " + choix : ""}${x.reponseQRC ? " — QRC : " + x.reponseQRC : ""}${q.exercice ? ` (exercice ${q.exercice})` : ""}`;
  return esc(txt.slice(0, 600));
};
const paris = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

function tableau(rows: any[]) {
  return `<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:12px;font-family:Arial">
<tr style="background:#f0f0f0"><th>Date</th><th>Qui</th><th>Module</th><th>Exercice</th><th>Question</th><th>Type</th><th>Avant</th><th>Après</th></tr>
${rows.map((r) => `<tr><td>${paris(r.created_at)}</td><td>${esc(AUTEURS[r.auteur_type] ?? r.auteur_type)}${r.auteur_email ? "<br>" + esc(r.auteur_email) : ""}<br><small>${esc(r.origine)}</small></td>
<td>${r.module_id} ${esc(r.module_nom)}</td><td>${esc(r.exercice_id)} ${esc(r.exercice_titre)}</td><td>${esc(r.question_id)}</td>
<td>${esc(LIBELLES[r.type_changement] ?? r.type_changement)}</td><td>${resume(r.avant)}</td><td>${resume(r.apres)}</td></tr>`).join("")}
</table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    // Rapports à 8h et 20h heure de Paris toute l'année (tâche lancée à 6,7,18,19 h UTC)
    const heureParis = Number(new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }));
    if (!force && heureParis !== 8 && heureParis !== 20) {
      return new Response(JSON.stringify({ ok: true, ignore: true, heureParis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const depuis = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    // Changements faits par l'agent (y compris en base directe) et les traitements
    // automatiques — tous deux étiquetés « Agent » ; jamais les admins de l'éditeur
    const { data, error } = await sb.from("question_change_log").select("*")
      .in("auteur_type", ["agent_ou_fonction", "automatique"]).gte("created_at", depuis).order("created_at").limit(1000);
    if (error) throw error;
    const n = data?.length ?? 0;
    await sendBrandedEmail({
      to: DEST,
      subject: `Rapport ${heureParis === 8 ? "de 8h" : "de 20h"} — changements de questions par l'agent : ${n === 0 ? "0 changement" : n + " changement(s)"}`,
      html: `<p>Changements de questions faits par l'agent sur les 12 dernières heures (jusqu'au ${paris(new Date().toISOString())}).</p>
${n === 0 ? "<p><b>0 changement</b> — le rapport fonctionne.</p>" : tableau(data!)}${n >= 1000 ? "<p>Liste limitée à 1000 lignes, voir la page Historique des questions.</p>" : ""}`,
    });
    return new Response(JSON.stringify({ ok: true, heureParis, n }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[rapport-changements-questions]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
