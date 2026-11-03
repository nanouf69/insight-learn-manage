import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendBrandedEmail } from "../_shared/send-branded-email.ts";
import { generateSetPasswordLink, generateUnsharedPassword, setPasswordBlock, redactForHistory } from "../_shared/credential-secrets.ts";
import { trouverCompteParEmail, deciderReutilisation } from "../_shared/compte-existant.ts";
import { classer, regrouperDoublons, peutEnvoyerAuto, MONTANT_MIN_FC, type DossierFc, type TxLite } from "../_shared/fcPaiementsRegles.ts";

// Actions admin : classer | associer | ignorer | envoyer.
// L'envoi (manuel ou auto) est refusé tant que fc_acces_config.actif = false.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function paginer<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Non autorisé" }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await caller.auth.getClaims(auth.replace("Bearer ", ""));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: "Non autorisé" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const { data: cfg, error: cfgErr } = await admin.from("fc_acces_config").select("actif, actif_depuis").eq("id", true).single();
    if (cfgErr) throw cfgErr;
    const actif = cfg.actif === true;

    const envoyer = async (paiementId: string, declencheur: string) => {
      if (!actif) return { ok: false, error: "Envoi désactivé : activation non autorisée" };
      const { data: p, error: pErr } = await admin.from("fc_paiements").select("*").eq("id", paiementId).single();
      if (pErr) throw pErr;
      if (!p.apprenant_id) return { ok: false, error: "Aucun stagiaire associé" };
      if (["rembourse", "ignore"].includes(p.statut)) return { ok: false, error: "Paiement remboursé ou ignoré" };
      const { data: deja } = await admin.from("fc_acces_envois").select("id").eq("apprenant_id", p.apprenant_id).in("statut", ["en_cours", "envoye"]).maybeSingle();
      if (deja) {
        if (p.statut !== "acces_envoye") await admin.from("fc_paiements").update({ statut: "deja_servi", updated_at: new Date().toISOString() }).eq("id", p.id);
        return { ok: true, deja: true };
      }
      const { data: claim, error: clErr } = await admin.from("fc_acces_envois").insert({ apprenant_id: p.apprenant_id, paiement_id: p.id, declencheur }).select("id").single();
      if (clErr) return { ok: true, deja: true }; // index unique : envoi concurrent déjà en cours
      const finir = async (statut: "envoye" | "echec", extra: Record<string, unknown> = {}) => {
        await admin.from("fc_acces_envois").update({ statut, termine_at: new Date().toISOString(), ...extra }).eq("id", claim.id);
        await admin.from("fc_paiements").update({ statut: statut === "envoye" ? "acces_envoye" : "echec_envoi", updated_at: new Date().toISOString() }).eq("id", p.id);
      };
      try {
        const { data: a, error: aErr } = await admin.from("apprenants").select("id, prenom, nom, email, auth_user_id, type_apprenant").eq("id", p.apprenant_id).single();
        if (aErr) throw aErr;
        const email = String(a.email ?? "").trim().toLowerCase();
        let compte: "cree" | "existant" = "existant";
        if (!a.auth_user_id) {
          const existant = await trouverCompteParEmail(email, async (page, perPage) => {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
            if (error) throw error;
            return data.users;
          });
          if (existant) {
            const { data: lies } = await admin.from("apprenants").select("id, created_at").eq("auth_user_id", existant.id);
            const d = deciderReutilisation(existant, a.id, lies ?? []);
            if (d.action === "bloquer") throw new Error(d.raison);
            await admin.from("apprenants").update({ auth_user_id: d.authUserId }).eq("id", a.id).is("auth_user_id", null);
          } else {
            const { data: cu, error: cuErr } = await admin.auth.admin.createUser({ email, password: generateUnsharedPassword(), email_confirm: true });
            if (cuErr || !cu.user) throw new Error(cuErr?.message ?? "Création du compte impossible");
            await admin.from("apprenants").update({ auth_user_id: cu.user.id }).eq("id", a.id).is("auth_user_id", null);
            compte = "cree";
          }
        }
        const lien = await generateSetPasswordLink(admin, email);
        const formation = (a.type_apprenant ?? "").toLowerCase().includes("taxi") ? "FC TAXI" : "FC VTC";
        const intro = compte === "cree"
          ? "Nous avons bien reçu votre paiement. Votre accès à la plateforme de formation est prêt."
          : "Nous avons bien reçu votre paiement. Vous avez déjà un compte : il est conservé, utilisez le lien ci-dessous pour choisir un nouveau mot de passe.";
        const html = `<p>Bonjour ${esc(a.prenom ?? "")},</p><p>${intro}</p><p>Formation : <strong>${formation}</strong></p>${setPasswordBlock(email, lien)}
<p><strong>Pour vous connecter ensuite :</strong> rendez-vous sur <a href="https://gestion.ftransport.fr/cours-public">gestion.ftransport.fr/cours-public</a>, saisissez votre e-mail ${esc(email)} et le mot de passe que vous aurez choisi. En cas d'oubli, cliquez sur « Mot de passe oublié ».</p>`;
        const subject = "Vos accès à la plateforme de formation FTRANSPORT";
        await sendBrandedEmail({ to: email, subject, html });
        await admin.from("emails").insert({ apprenant_id: a.id, type: "acces_fc_paiement", subject, body_html: redactForHistory(html, [lien]), recipients: [email], statut: "envoye", direction: "sortant" } as never).then(() => {}, () => {});
        await finir("envoye", { compte });
        return { ok: true, compte };
      } catch (e) {
        await finir("echec", { erreur: String((e as Error)?.message ?? e).slice(0, 300) });
        return { ok: false, error: String((e as Error)?.message ?? e) };
      }
    };

    if (action === "classer") {
      const txs = await paginer<TxLite>((f, t) => admin.from("transactions_bancaires").select("id, date_operation, montant, libelle, reference").or(`montant.gte.${MONTANT_MIN_FC},montant.lt.0`).order("date_operation").range(f, t));
      const dossiers = await paginer<DossierFc & { compte_cours_archive_at?: string | null }>((f, t) => admin.from("apprenants").select("id, nom, prenom, email, type_apprenant, compte_cours_archive_at").ilike("type_apprenant", "continue%").range(f, t));
      const fc = dossiers.map((d) => ({ ...d, archive: !!d.compte_cours_archive_at }));
      const depuis = cfg.actif_depuis ? new Date(cfg.actif_depuis).toISOString().slice(0, 10) : null;
      let nouveaux = 0, envoyes = 0;
      for (const [k, groupe] of regrouperDoublons(txs)) {
        const tx = groupe[0];
        const d = classer(tx, fc);
        if (d.statut === "hors_perimetre") continue;
        const historique = !(actif && depuis && tx.date_operation >= depuis);
        const { data: ins, error } = await admin.from("fc_paiements").upsert({
          empreinte: k, transaction_ids: groupe.map((g) => g.id), date_operation: tx.date_operation, montant: tx.montant, libelle: tx.libelle ?? "",
          statut: d.statut, historique, apprenant_id: d.statut === "rapproche" ? d.apprenantId : null, candidats: d.candidats, motif: d.motif,
        }, { onConflict: "empreinte", ignoreDuplicates: true }).select("id, statut, historique, apprenant_id");
        if (error) throw error;
        const row = ins?.[0];
        if (!row) continue; // déjà connu : jamais réécrit
        nouveaux++;
        if (d.statut === "rembourse" && d.candidats.length === 1) {
          await admin.from("fc_paiements").update({ statut: "rembourse", updated_at: new Date().toISOString() }).eq("apprenant_id", d.candidats[0]).eq("statut", "rapproche");
        }
        if (row.apprenant_id) {
          const { data: deja } = await admin.from("fc_acces_envois").select("id").eq("apprenant_id", row.apprenant_id).in("statut", ["en_cours", "envoye"]).maybeSingle();
          if (peutEnvoyerAuto(row, actif, !!deja)) { const r = await envoyer(row.id, "auto"); if (r.ok) envoyes++; }
          else if (deja) await admin.from("fc_paiements").update({ statut: "deja_servi" }).eq("id", row.id);
        }
      }
      return json({ ok: true, nouveaux, envoyes, actif });
    }

    const pid = typeof body?.paiement_id === "string" && UUID.test(body.paiement_id) ? body.paiement_id : null;
    if (!pid) return json({ error: "Paiement inconnu" }, 400);
    if (action === "associer") {
      const aid = typeof body?.apprenant_id === "string" && UUID.test(body.apprenant_id) ? body.apprenant_id : null;
      if (!aid) return json({ error: "Stagiaire inconnu" }, 400);
      const { data: a } = await admin.from("apprenants").select("id, type_apprenant").eq("id", aid).maybeSingle();
      if (!a || !(a.type_apprenant ?? "").toLowerCase().startsWith("continue")) return json({ error: "Ce dossier n'est pas une formation continue" }, 400);
      const { error } = await admin.from("fc_paiements").update({ apprenant_id: aid, statut: "rapproche", associe_par: uid, motif: "Associé manuellement par un admin", updated_at: new Date().toISOString() }).eq("id", pid).in("statut", ["a_revoir", "rapproche"]);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === "ignorer") {
      const { error } = await admin.from("fc_paiements").update({ statut: "ignore", associe_par: uid, updated_at: new Date().toISOString() }).eq("id", pid).in("statut", ["a_revoir", "rapproche"]);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === "envoyer") return json(await envoyer(pid, "admin"));
    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    console.error("[fc-paiements]", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
