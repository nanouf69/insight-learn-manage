// Edge function: restore d'une sauvegarde (admin only)
// Restaure les tables (upsert par lots) et re-uploade les fichiers Storage.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Ordre de restauration : parents avant enfants (best-effort)
const RESTORE_ORDER = [
  "profiles","user_roles","organismes","formateurs","formations","apprenants","sessions",
  "session_apprenants","session_formateurs","agenda_blocs","planning_pratique_config",
  "creneaux_rdv","rdv_carte_vtc_slots","rdv_carte_vtc_slots_audit","reservations_pratique",
  "apprenant_paiements","apprenant_connexions","apprenant_documents_completes",
  "apprenant_module_activites","apprenant_module_completion","apprenant_questions",
  "apprenant_quiz_results","quiz_questions_overrides","reponses_apprenants",
  "documents","documents_inscription","emails","email_templates","emargements_fc",
  "formateur_emargements","contacts","contrats_fournisseurs","fournisseurs",
  "fournisseur_apprenants","fournisseur_documents","fournisseur_factures",
  "fournisseur_paiements","fournisseur_shared_docs","factures","facture_paiements",
  "financeurs_fc","bpf","justificatifs","notes_frais","releves_bancaires",
  "transactions_bancaires","module_change_notifications","module_editor_state",
  "module_notification_dismissals","devis_envois","alertes_systeme","audit_logs",
  "app_version","apprenant_questions",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "not_authenticated" }, 401);

    const admin = createClient(supaUrl, svcKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "table"; // table | file

    // Mode 1 : restaurer un batch d'une table
    if (mode === "table") {
      const body = await req.json();
      const { table, rows } = body as { table: string; rows: any[] };
      if (!table || !Array.isArray(rows)) return json({ error: "bad_request" }, 400);
      if (rows.length === 0) return json({ ok: true, count: 0 });

      const { error } = await admin.from(table).upsert(rows, { onConflict: "id" });
      if (error) return json({ ok: false, table, error: error.message }, 200);
      return json({ ok: true, table, count: rows.length });
    }

    // Mode 2 : restaurer un fichier storage (base64)
    if (mode === "file") {
      const body = await req.json();
      const { bucket, path, base64, contentType } = body as {
        bucket: string; path: string; base64: string; contentType?: string;
      };
      if (!bucket || !path || !base64) return json({ error: "bad_request" }, 400);

      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error } = await admin.storage.from(bucket).upload(path, bytes, {
        upsert: true,
        contentType: contentType || "application/octet-stream",
      });
      if (error) return json({ ok: false, bucket, path, error: error.message }, 200);
      return json({ ok: true, bucket, path });
    }

    // Mode 3 : renvoyer l'ordre recommandé
    if (mode === "order") {
      return json({ order: RESTORE_ORDER });
    }

    return json({ error: "invalid_mode" }, 400);
  } catch (e) {
    console.error("backup-restore error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
