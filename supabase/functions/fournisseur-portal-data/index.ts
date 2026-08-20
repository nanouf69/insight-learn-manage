import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Consolidated portal data access via validated token.
// Actions: init, apprenants, documents, factures, shared_docs, emargements
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "init";

    if (!token || token.length < 10) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: f, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, actif, factures_only, formateur_id, comptable_only")
      .eq("token", token)
      .maybeSingle();

    if (fErr || !f) {
      return new Response(JSON.stringify({ error: "Lien invalide" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!f.actif) {
      return new Response(JSON.stringify({ error: "Compte fournisseur désactivé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fid = f.id;

    // 'fournisseur-documents' is a PRIVATE bucket: rewrite stored URLs into
    // short-lived signed URLs so files stay unreachable without a valid token.
    const signRows = async <T extends { url?: string | null }>(rows: T[]): Promise<T[]> => {
      const marker = "/fournisseur-documents/";
      return await Promise.all(
        (rows || []).map(async (row) => {
          const url = row?.url || "";
          const idx = url.indexOf(marker);
          if (idx === -1) return row;
          try {
            const path = decodeURIComponent(url.slice(idx + marker.length));
            const { data: signed } = await supabase.storage
              .from("fournisseur-documents")
              .createSignedUrl(path, 3600);
            return signed?.signedUrl ? { ...row, url: signed.signedUrl } : row;
          } catch (_) {
            return row;
          }
        }),
      );
    };

    if (action === "apprenants") {
      const { data } = await supabase
        .from("fournisseur_apprenants")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "documents") {
      const { data } = await supabase
        .from("fournisseur_documents")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: await signRows(data || []) });
    }

    if (action === "factures") {
      const { data } = await supabase
        .from("fournisseur_factures")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: await signRows(data || []) });

    }
    if (action === "shared_docs") {
      const { data } = await supabase
        .from("fournisseur_shared_docs")
        .select("*")
        .eq("fournisseur_id", fid)
        .order("created_at", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "emargements") {
      if (!f.formateur_id) return json({ data: [] });
      const { data } = await supabase
        .from("formateur_emargements")
        .select("*")
        .eq("formateur_id", f.formateur_id)
        .order("date_signature", { ascending: false });
      return json({ data: data || [] });
    }
    if (action === "delete_facture") {
      const factureId = typeof body?.facture_id === "string" ? body.facture_id : "";
      if (!factureId) return json({ error: "facture_id requis" }, 400);
      const { data: fac } = await supabase
        .from("fournisseur_factures")
        .select("id, url, fournisseur_id")
        .eq("id", factureId)
        .maybeSingle();
      if (!fac || fac.fournisseur_id !== fid) return json({ error: "Facture introuvable" }, 404);
      const url = fac.url || "";
      const marker = "/fournisseur-documents/";
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        try {
          const path = decodeURIComponent(url.slice(idx + marker.length));
          await supabase.storage.from("fournisseur-documents").remove([path]);
        } catch (_) { /* ignore storage errors */ }
      }
      const { error: delErr } = await supabase.from("fournisseur_factures").delete().eq("id", factureId);
      if (delErr) return json({ error: delErr.message }, 500);
      return json({ success: true });
    }
    if (action === "apprenant_notes") {
      const apprenantId = typeof body?.fournisseur_apprenant_id === "string" ? body.fournisseur_apprenant_id : "";
      if (!apprenantId) return json({ error: "fournisseur_apprenant_id requis" }, 400);
      const { data } = await supabase
        .from("fournisseur_apprenants")
        .select("id, notes, fournisseur_id")
        .eq("id", apprenantId)
        .maybeSingle();
      if (!data || data.fournisseur_id !== fid) return json({ error: "Apprenant introuvable" }, 404);
      return json({ notes: data.notes || null });
    }

    // init: return fournisseur + all base collections
    const [appRes, docRes, facRes, sharedRes, relevesRes] = await Promise.all([
      supabase.from("fournisseur_apprenants").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_documents").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_factures").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      supabase.from("fournisseur_shared_docs").select("*").eq("fournisseur_id", fid).order("created_at", { ascending: false }),
      f.comptable_only
        ? supabase.from("releves_bancaires").select("*").order("mois_annee", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    return json({
      fournisseur: f,
      apprenants: appRes.data || [],
      documents: docRes.data || [],
      factures: facRes.data || [],
      shared_docs: sharedRes.data || [],
      releves: relevesRes.data || [],
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
