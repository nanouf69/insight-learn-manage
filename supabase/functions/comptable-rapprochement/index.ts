import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action =
  | "list"
  | "update"
  | "bulk_update_categorie"
  | "delete"
  | "link_justificatif"
  | "upload_justificatif_meta";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { token, action } = body as { token?: string; action?: Action };

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "token et action requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier le token comptable
    const { data: fournisseur, error: fErr } = await supabase
      .from("fournisseurs")
      .select("id, nom, comptable_only, actif")
      .eq("token", token)
      .eq("comptable_only", true)
      .eq("actif", true)
      .maybeSingle();

    if (fErr || !fournisseur) {
      return new Response(JSON.stringify({ error: "Accès non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    if (action === "list") {
      // Pagine pour récupérer toutes les transactions
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("transactions_bancaires")
          .select("*")
          .order("date_operation", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const [justRes, apprenantsRes, saRes, fourRes] = await Promise.all([
        supabase
          .from("justificatifs")
          .select(
            "id, nom_fichier, url, montant_ttc, date_operation, categorie, fournisseur, statut"
          ),
        supabase
          .from("apprenants")
          .select(
            "id, nom, prenom, civilite, email, adresse, code_postal, ville, formation_choisie, type_apprenant, montant_ttc, montant_paye, date_paiement, date_debut_formation, date_fin_formation"
          )
          .is("deleted_at", null),
        supabase
          .from("session_apprenants")
          .select("apprenant_id, date_debut, date_fin, sessions(date_debut, date_fin)"),
        supabase
          .from("fournisseurs")
          .select("id, nom")
          .eq("actif", true)
          .order("nom"),
      ]);

      return new Response(
        JSON.stringify({
          transactions: all,
          justificatifs: justRes.data || [],
          apprenants: apprenantsRes.data || [],
          session_apprenants: saRes.data || [],
          fournisseurs: fourRes.data || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ------------------------------------------------------------------
    if (action === "update") {
      const { id, updates } = body as { id: string; updates: Record<string, unknown> };
      if (!id || !updates) {
        return new Response(JSON.stringify({ error: "id et updates requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Whitelist des champs modifiables par le comptable
      const allowed = [
        "categorie",
        "fournisseur_client",
        "notes",
        "statut",
        "justificatif_id",
      ];
      const safe: Record<string, unknown> = {};
      for (const k of allowed) {
        if (k in updates) safe[k] = (updates as any)[k];
      }
      const { error } = await supabase
        .from("transactions_bancaires")
        .update(safe)
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    if (action === "bulk_update_categorie") {
      const { ids, categorie } = body as { ids: string[]; categorie: string };
      if (!Array.isArray(ids) || ids.length === 0 || !categorie) {
        return new Response(JSON.stringify({ error: "ids et categorie requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("transactions_bancaires")
        .update({ categorie })
        .in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, count: ids.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) {
        return new Response(JSON.stringify({ error: "id requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("transactions_bancaires")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    if (action === "link_justificatif") {
      const { transaction_id, justificatif_id } = body as {
        transaction_id: string;
        justificatif_id: string;
      };
      if (!transaction_id || !justificatif_id) {
        return new Response(
          JSON.stringify({ error: "transaction_id et justificatif_id requis" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { error: e1 } = await supabase
        .from("transactions_bancaires")
        .update({ justificatif_id, statut: "justifie" })
        .eq("id", transaction_id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("justificatifs")
        .update({ statut: "traite" })
        .eq("id", justificatif_id);
      if (e2) throw e2;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------
    if (action === "upload_justificatif_meta") {
      // Insert d'une ligne justificatif (le fichier doit avoir été uploadé côté client dans le bucket)
      const { meta } = body as { meta: Record<string, unknown> };
      if (!meta) {
        return new Response(JSON.stringify({ error: "meta requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("justificatifs")
        .insert(meta)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, justificatif: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("comptable-rapprochement error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
