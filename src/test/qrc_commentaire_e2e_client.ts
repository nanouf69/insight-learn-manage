// Client E2E du commentaire seul : vrai supabase-js -> proxy local -> PostgREST -> PostgreSQL JETABLE.
// Jamais le projet réel : l'URL et les jetons viennent exclusivement du harnais Python local.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { cleOperationCommentaire, commentaireConfirme, versionCommentaire } from "../features/correction-qrc-v2/commentaireSeul";
import { commentaireQrcPersistant } from "../lib/commentaireQrcPersistant";
import { COMMENTAIRES_QRC, ajouterCommentaireQrc } from "../features/correction-qrc-v2/commentairesPredefinis";

const [url, token, action, arg] = [process.env.E2E_URL!, process.env.E2E_TOKEN!, process.argv[2], JSON.parse(process.argv[3] ?? "{}")];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw new Error("URL non locale refusée");
const sb = createClient(url, token, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
const uuid = (cle: string) => { const h = createHash("sha256").update(cle).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };

async function lireJournal(qi: string) {
  const { data, error } = await sb.from("qrc_correction_events")
    .select("correction_event_id, etat_precedent, etat_nouveau, note_precedente, note_nouvelle, corrige_email, created_at, commentaire")
    .eq("qrc_instance_id", qi).order("created_at", { ascending: true }).order("correction_event_id", { ascending: true });
  if (error) throw error;
  return data as any[];
}

async function main() {
  if (action === "commenter") {
    // Écran admin : relire, ajouter les boutons, envoyer, double clic, relire.
    const journal = await lireJournal(arg.qi);
    let texte = journal.at(-1)?.commentaire ?? "";
    for (const i of arg.boutons as number[]) texte = ajouterCommentaireQrc(texte, COMMENTAIRES_QRC[i]);
    if (arg.libre) texte += arg.libre;
    const version = versionCommentaire(journal);
    const op = uuid(cleOperationCommentaire(arg.qi, version, texte, "jeton-e2e"));
    const params = { p_operation_id: op, p_qrc_instance_id: arg.qi, p_note_attendue: arg.note, p_dernier_evenement_attendu: version.dernierEvenement, p_commentaire: texte, p_corrige_email: "admin@local.invalid" };
    const appels = await Promise.all([sb.rpc("core_commenter_qrc", params), sb.rpc("core_commenter_qrc", params)]);
    const relu = await lireJournal(arg.qi);
    console.log(JSON.stringify({ texte, erreurs: appels.map((a) => a.error?.message ?? null), rejeux: appels.map((a) => (a.data as any)?.rejeu ?? null), confirme: commentaireConfirme(relu, texte, arg.note), nb: relu.length }));
  } else if (action === "perime") {
    const { error } = await sb.rpc("core_commenter_qrc", { p_operation_id: uuid(`perime:${Math.random()}`), p_qrc_instance_id: arg.qi, p_note_attendue: arg.note, p_dernier_evenement_attendu: arg.ev, p_commentaire: "Mal dit !!!", p_corrige_email: null });
    console.log(JSON.stringify({ erreur: error?.message ?? null }));
  } else if (action === "candidat") {
    // Écran candidat après rechargement : nouvelle connexion, lecture sous RLS, projection réelle.
    const { data: qrcs, error: e1 } = await sb.from("qrc_instances_v2").select("qrc_instance_id, attempt_id, question_id, apprenant_id, note, etat").eq("attempt_id", arg.att);
    const { data: events, error: e2 } = await sb.from("qrc_correction_events").select("correction_event_id, qrc_instance_id, attempt_id, question_id, apprenant_id, note_nouvelle, commentaire, created_at").eq("attempt_id", arg.att);
    if (e1 || e2) throw e1 ?? e2;
    console.log(JSON.stringify({ nbQrc: qrcs!.length, nbEvents: events!.length, commentaires: Object.fromEntries(qrcs!.map((q: any) => [q.qrc_instance_id, commentaireQrcPersistant(events as any, q)])) }));
  } else if (action === "corriger") {
    const { error } = await sb.rpc("core_correct_qrc_publish", { p_operation_id: uuid(`c:${arg.qi}:${arg.note}`), p_qrc_instance_id: arg.qi, p_note: arg.note, p_commentaire: null, p_corrige_email: "admin@local.invalid" });
    console.log(JSON.stringify({ erreur: error?.message ?? null }));
  }
}
main().catch((e) => { console.log(JSON.stringify({ exception: String(e?.message ?? e) })); });
