// Edge function: export toutes les tables + liste des fichiers Storage (admin only)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables publiques à exporter (whitelist explicite pour sécurité)
const TABLES = [
  "agenda_blocs","alertes_systeme","app_version","apprenant_connexions",
  "apprenant_documents_completes","apprenant_module_activites","apprenant_module_completion",
  "apprenant_paiements","apprenant_questions","apprenant_quiz_results","apprenants",
  "audit_logs","bpf","contacts","contrats_fournisseurs","creneaux_rdv","devis_envois",
  "documents","documents_inscription","email_templates","emails","emargements_fc",
  "facture_paiements","factures","financeurs_fc","formateur_emargements","formateurs",
  "formations","fournisseur_apprenants","fournisseur_documents","fournisseur_factures",
  "fournisseur_paiements","fournisseur_shared_docs","fournisseurs","justificatifs",
  "module_change_notifications","module_editor_state","module_notification_dismissals",
  "notes_frais","organismes","planning_pratique_config","profiles","quiz_questions_overrides",
  "rdv_carte_vtc_slots","rdv_carte_vtc_slots_audit","releves_bancaires","reponses_apprenants",
  "reservations_pratique","session_apprenants","session_formateurs","sessions",
  "transactions_bancaires","user_roles",
];

const BUCKETS = [
  "exam-results","fournisseur-shared-docs","releves-bancaires","justificatifs",
  "notes-frais","documents-inscription","cours-fichiers","fournisseur-documents","devis",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Vérif user + rôle admin
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
    const mode = url.searchParams.get("mode") ?? "tables"; // tables | bucket
    const bucket = url.searchParams.get("bucket");

    // Mode 1 : dump des tables + liste des fichiers Storage
    if (mode === "tables") {
      const tables: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        const rows: unknown[] = [];
        const PAGE = 1000;
        let from = 0;
        // Pagination pour éviter la limite 1000
        while (true) {
          const { data, error } = await admin.from(t).select("*").range(from, from + PAGE - 1);
          if (error) { console.warn(`skip ${t}: ${error.message}`); break; }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        tables[t] = rows;
      }

      const storage: Record<string, { path: string; size: number | null }[]> = {};
      for (const b of BUCKETS) {
        storage[b] = await listAllFiles(admin, b);
      }

      return json({
        version: "1.0.0",
        exported_at: new Date().toISOString(),
        exported_by: user.email,
        tables,
        storage,
        buckets: BUCKETS,
      });
    }

    // Mode 2 : signer une liste de fichiers d'un bucket (par batch pour éviter timeouts)
    if (mode === "bucket" && bucket) {
      const body = await req.json().catch(() => ({}));
      const paths: string[] = body.paths ?? [];
      const signed = await admin.storage.from(bucket).createSignedUrls(paths, 60 * 30);
      return json({ bucket, files: signed.data ?? [], error: signed.error?.message });
    }

    return json({ error: "invalid_mode" }, 400);
  } catch (e) {
    console.error("backup-export error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

async function listAllFiles(admin: any, bucket: string, prefix = ""): Promise<{ path: string; size: number | null }[]> {
  const out: { path: string; size: number | null }[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const p = stack.pop()!;
    let offset = 0;
    const LIMIT = 1000;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(p, { limit: LIMIT, offset });
      if (error || !data) break;
      for (const item of data) {
        const full = p ? `${p}/${item.name}` : item.name;
        if (item.id === null || item.metadata === null) {
          // dossier
          stack.push(full);
        } else {
          out.push({ path: full, size: item.metadata?.size ?? null });
        }
      }
      if (data.length < LIMIT) break;
      offset += LIMIT;
    }
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
