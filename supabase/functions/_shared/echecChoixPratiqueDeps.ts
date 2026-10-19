import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Deps, DocDb, ResultatEnvoiFournisseur } from "./echecChoixPratiqueCore.ts";
import { MODELE_CODE, MODELE_VERSION } from "./modeleEchecChoixPratique.ts";

const COLS = "id, token, statut, apprenant_id, modele_code, modele_version, cle_envoi, texte_fige, texte_empreinte, identite_figee, mail_objet_fige, mail_html_fige, envoi_etat, envoi_tente_le, envoye_le, envoi_erreur, destinataire_email, destinataire_nom, choix, signe_le_paris, signed_at, reponses";

export const sha256 = async (t: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export function depsSupabase(db: SupabaseClient, opts: { authHeader?: string; supabaseUrl?: string } = {}): Deps {
  return {
    now: () => new Date(),
    sha256,
    nouveauToken: () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join(""),
    lienPublic: (t) => `https://gestion.ftransport.fr/document-a-signer/${t}`,
    async getApprenant(id) {
      const { data, error } = await db.from("apprenants").select("id, nom, prenom, email, type_apprenant, resultat_examen, date_examen_theorique").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    async findDoc(apprenantId, cle) {
      // Toutes versions : un mail déjà parti/en cours (quelle que soit la version) bloque tout nouvel envoi ;
      // un brouillon jamais envoyé d'une ancienne version est conservé intact mais n'est plus réutilisé.
      const { data, error } = await db.from("documents_a_signer").select(`${COLS}, modele_version`)
        .eq("modele_code", MODELE_CODE).eq("apprenant_id", apprenantId).eq("cle_envoi", cle)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const dejaEngage = rows.find((r) => r.envoi_etat && r.envoi_etat !== "prepare");
      if (dejaEngage) return dejaEngage as DocDb;
      return (rows.find((r) => r.modele_version === MODELE_VERSION) ?? null) as DocDb | null;
    },
    async getDocById(id) {
      const { data, error } = await db.from("documents_a_signer").select(COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as DocDb | null;
    },
    async getDocByToken(token) {
      const { data, error } = await db.from("documents_a_signer").select(COLS).eq("token", token).maybeSingle();
      if (error) throw error;
      return data as DocDb | null;
    },
    async insertDoc(row) {
      const { data, error } = await db.from("documents_a_signer")
        .upsert(row, { onConflict: "modele_code,apprenant_id,cle_envoi,modele_version", ignoreDuplicates: true })
        .select(COLS);
      if (error) throw error;
      return (data && data[0]) ? (data[0] as DocDb) : null;
    },
    async updateIf(id, patch, cond) {
      let q = db.from("documents_a_signer").update(patch).eq("id", id);
      if (cond.envoi_etat) q = q.eq("envoi_etat", cond.envoi_etat);
      if (cond.statutNot) q = q.neq("statut", cond.statutNot);
      const { data, error } = await q.select(COLS);
      return { rows: (data as DocDb[]) || [], error: error ? { code: (error as any).code, message: error.message } : undefined };
    },
    async envoyerMail({ to, subject, html, apprenantId }): Promise<ResultatEnvoiFournisseur> {
      // Circuit d'envoi existant (sync-outlook-emails : contrôle admin, archivage du contenu envoyé).
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 45_000);
      try {
        const res = await fetch(`${opts.supabaseUrl}/functions/v1/sync-outlook-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: opts.authHeader || "", apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
          body: JSON.stringify({ action: "send", userEmail: "contact@ftransport.fr", to, subject, body: html, apprenantId }),
          signal: ctrl.signal,
        });
        let j: any = null;
        try { j = await res.json(); } catch { /* illisible */ }
        if (res.ok && j?.success === true && !j?.skipped) return { issue: "accepte" };
        if (res.ok && j?.success === false && j?.error) return { issue: "refuse", erreur: String(j.error) };
        if (res.status === 401 || res.status === 403 || res.status === 400) return { issue: "refuse", erreur: `HTTP ${res.status} ${j?.error ?? ""}`.trim() };
        return { issue: "inconnue", erreur: j?.skipped ? "Envoi signalé comme doublon récent par le circuit mail" : `Réponse ${res.status} non concluante` };
      } catch (e) {
        return { issue: "inconnue", erreur: e instanceof Error ? e.message : String(e) };
      } finally { clearTimeout(t); }
    },
    log: (m, x) => console.error(m, x ?? ""),
  };
}
