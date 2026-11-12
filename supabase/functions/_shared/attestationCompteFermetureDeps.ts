import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { FermetureDeps } from "./attestationCompteFermeture.ts";

/** Fermeture réelle (demande 12/11 20:06 Paris) : mails bloqués + connexion bannie ; aucune donnée élève supprimée. */
export function depsFermeture(db: SupabaseClient, adminId: string): FermetureDeps {
  return {
    async lireDocument(id) {
      const { data, error } = await db.from("documents_a_signer").select("id, apprenant_id, modele_code, envoi_etat, envoye_le").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    async lireCompte(apprenantId) {
      const { data: a, error } = await db.from("apprenants").select("auth_user_id").eq("id", apprenantId).maybeSingle();
      if (error || !a) throw error ?? new Error("Dossier introuvable");
      const userId = (a as any).auth_user_id as string | null;
      if (!userId) return { userId: null, estAdmin: false, nombreDossiers: 1 };
      const { count, error: e2 } = await db.from("apprenants").select("id", { count: "exact", head: true }).eq("auth_user_id", userId);
      if (e2) throw e2;
      const { data: adm } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
      return { userId, estAdmin: adm === true, nombreDossiers: count ?? 0 };
    },
    async refuserAccesServeur(apprenantId) {
      const { data, error } = await db.from("apprenants").update({ emails_bloques: true }).eq("id", apprenantId).select("emails_bloques");
      return !error && data?.length === 1 && (data[0] as any).emails_bloques === true;
    },
    async desactiverConnexion(userId) {
      const { data, error } = await db.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      return !error && !!data?.user?.banned_until;
    },
    async journaliser(apprenantId, documentId, issue) {
      await db.from("audit_journal").insert({
        operation: `attestation_fin_formation.${issue}`, cible_type: "documents_a_signer", cible_id: documentId,
        apprenant_id: apprenantId, auteur: adminId, apres: { issue, mails_bloques: true } as any, origine: "attestation-fin-formation",
      });
    },
  };
}
