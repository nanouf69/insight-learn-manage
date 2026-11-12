import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { DepsAtt, DocAtt } from "./attestationFinCore.ts";
import { MODELE_CODE_ATTESTATION, CLE_ENVOI_ATTESTATION, SIGNATURE_CENTRE_CHEMIN } from "./modeleAttestationFin.ts";
import { sha256 } from "./echecChoixPratiqueDeps.ts";

const COLS = "id, token, statut, apprenant_id, modele_code, modele_version, texte_fige, texte_empreinte, identite_figee, mail_objet_fige, mail_html_fige, envoi_etat, envoi_tente_le, envoye_le, envoi_erreur, signe_le_paris, signed_at, reponses, created_at";

export async function imageSignatureCentre(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.storage.from("documents-a-signer").download(SIGNATURE_CENTRE_CHEMIN);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:image/png;base64,${btoa(bin)}`;
}

export function depsAttestation(db: SupabaseClient, opts: { authHeader?: string; supabaseUrl?: string } = {}): DepsAtt {
  return {
    now: () => new Date(),
    sha256,
    nouveauToken: () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join(""),
    lienPublic: (t) => `https://gestion.ftransport.fr/document-a-signer/${t}`,
    async getApprenant(id) {
      const { data, error } = await db.from("apprenants").select("id, nom, prenom, email, type_apprenant, formation_choisie, modules_autorises, date_debut_formation, heures_totales, emails_bloques").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    async etatModules(id) {
      const { data, error } = await db.rpc("etat_completion_modules", { _apprenant_id: id });
      if (error) throw error;
      return (data ?? []) as any;
    },
    async connexions(id) {
      const { data, error } = await db.from("apprenant_connexions").select("id, started_at").eq("apprenant_id", id).not("started_at", "is", null).order("started_at", { ascending: false }).limit(1);
      if (error) throw error;
      return (data ?? []) as any;
    },
    async signatureCentreDisponible() { return (await imageSignatureCentre(db)) !== null; },
    async findDocs(apprenantId) {
      const { data, error } = await db.from("documents_a_signer").select(COLS).eq("modele_code", MODELE_CODE_ATTESTATION).eq("apprenant_id", apprenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocAtt[];
    },
    async getDocById(id) {
      const { data, error } = await db.from("documents_a_signer").select(COLS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as DocAtt | null;
    },
    async getDocByToken(token) {
      const { data, error } = await db.from("documents_a_signer").select(COLS).eq("token", token).maybeSingle();
      if (error) throw error;
      return data as DocAtt | null;
    },
    async insertDoc(row) {
      // Index unique (modele_code, apprenant_id, cle_envoi, modele_version) : un second onglet ne crée jamais de doublon.
      const { data, error } = await db.from("documents_a_signer").upsert({ ...row, cle_envoi: CLE_ENVOI_ATTESTATION }, { onConflict: "modele_code,apprenant_id,cle_envoi,modele_version", ignoreDuplicates: true }).select(COLS);
      if (error) throw error;
      return (data && data[0]) ? (data[0] as DocAtt) : null;
    },
    async updateIf(id, patch, cond) {
      let q = db.from("documents_a_signer").update(patch).eq("id", id);
      if (cond.envoi_etat) q = q.eq("envoi_etat", cond.envoi_etat);
      if (cond.statutNot) q = q.neq("statut", cond.statutNot);
      const { data, error } = await q.select(COLS);
      return { rows: (data as DocAtt[]) || [], error: error ? { message: error.message } : undefined };
    },
    async envoyerMail({ to, subject, html, apprenantId }) {
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
        return { issue: "inconnue", erreur: j?.skipped ? "Envoi signalé comme doublon récent" : `Réponse ${res.status} non concluante` };
      } catch (e) {
        return { issue: "inconnue", erreur: e instanceof Error ? e.message : String(e) };
      } finally { clearTimeout(t); }
    },
    async journal(ev) {
      const { error } = await db.from("audit_journal").insert({
        operation: ev.operation, cible_type: "documents_a_signer", cible_id: ev.docId, apprenant_id: ev.apprenantId,
        auteur: ev.auteur, apres: ev.apres as any, origine: "attestation-fin-formation",
      });
      if (error) console.error("[attestation-fin] journal non écrit", error.message);
      return !error;
    },
    log: (m, x) => console.error(m, x ?? ""),
  };
}
