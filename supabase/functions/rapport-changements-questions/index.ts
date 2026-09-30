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
    const { mode } = await req.json().catch(() => ({ mode: "lot" }));
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (mode === "quotidien") {
      const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await sb.from("question_change_log").select("*").gte("created_at", depuis).order("created_at").limit(1000);
      if (error) throw error;
      const n = data?.length ?? 0;
      await sendBrandedEmail({
        to: DEST,
        subject: `Récapitulatif quotidien des questions : ${n === 0 ? "0 changement" : n + " changement(s)"}`,
        html: `<p>Récapitulatif des dernières 24 h (jusqu'au ${paris(new Date().toISOString())}).</p>
${n === 0 ? "<p><b>0 changement</b> — le rapport fonctionne.</p>" : tableau(data!)}${n >= 1000 ? "<p>Liste limitée à 1000 lignes, voir la page Historique des questions.</p>" : ""}`,
      });
      return new Response(JSON.stringify({ ok: true, mode, n }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await sb.from("question_change_log").select("*").is("notifie_at", null).order("created_at").limit(500);
    if (error) throw error;
    if (!data?.length) return new Response(JSON.stringify({ ok: true, mode: "lot", n: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    await sendBrandedEmail({
      to: DEST,
      subject: `Alerte : ${data.length} changement(s) de questions`,
      html: `<p>Changements de questions détectés depuis le dernier envoi :</p>${tableau(data)}`,
    });
    const ids = data.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      await sb.from("question_change_log").update({ notifie_at: new Date().toISOString() }).in("id", ids.slice(i, i + 100));
    }
    return new Response(JSON.stringify({ ok: true, mode: "lot", n: data.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[rapport-changements-questions]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
