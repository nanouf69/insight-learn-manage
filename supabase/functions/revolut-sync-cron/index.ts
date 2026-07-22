import { createClient } from "npm:@supabase/supabase-js@2";

// Scheduled/unauthenticated Revolut sync. Runs via pg_cron.
// Fetches ALL recent completed transactions from Revolut and upserts
// them into transactions_bancaires (dedup by reference = Revolut tx id).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- Latest Revolut token ---
    const { data: tokenRow, error: tokenError } = await admin
      .from("revolut_tokens")
      .select("access_token, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenRow) {
      console.warn("[revolut-sync-cron] No token in DB — skipping.");
      return new Response(JSON.stringify({ ok: false, reason: "no_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      console.warn("[revolut-sync-cron] Token expired — skipping.");
      return new Response(JSON.stringify({ ok: false, reason: "token_expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Paginate through Revolut transactions (last 90 days by default) ---
    const url = new URL(req.url);
    let body: Record<string, string> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const daysBack = parseInt(body.days || url.searchParams.get("days") || "90", 10);
    const from = new Date(Date.now() - daysBack * 86400 * 1000).toISOString();

    const all: any[] = [];
    const seen = new Set<string>();
    let cursor = "";
    const MAX_PAGES = 40;
    let pages = 0;

    while (pages < MAX_PAGES) {
      const params = new URLSearchParams({ count: "1000", from });
      if (cursor) params.set("to", cursor);

      const res = await fetch(
        `https://b2b.revolut.com/api/1.0/transactions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${tokenRow.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("[revolut-sync-cron] Revolut fetch failed:", data);
        return new Response(JSON.stringify({ ok: false, error: data }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batch: any[] = Array.isArray(data) ? data : [];
      if (batch.length === 0) break;

      let added = 0;
      let oldest: string | null = null;
      for (const tx of batch) {
        if (!seen.has(tx.id)) { seen.add(tx.id); all.push(tx); added++; }
        const ts = tx.created_at || tx.completed_at;
        if (ts && (!oldest || ts < oldest)) oldest = ts;
      }
      pages++;
      if (added === 0 || !oldest) break;
      cursor = oldest;
      if (batch.length < 1000) break;
    }

    // --- Filter existing references ---
    const { data: existing } = await admin
      .from("transactions_bancaires")
      .select("reference")
      .eq("banque", "Revolut Pro")
      .not("reference", "is", null);
    const existingRefs = new Set((existing || []).map((e: any) => e.reference));

    const completed = all.filter((tx: any) => tx.state === "completed" && Array.isArray(tx.legs) && tx.legs.length > 0);
    const inserts = completed
      .filter((tx: any) => !existingRefs.has(tx.id))
      .map((tx: any) => {
        const leg = tx.legs[0];
        const desc = tx.description || tx.reference || leg.description || "—";
        const dateStr = (tx.completed_at || tx.created_at || "").slice(0, 10);
        return {
          date_operation: dateStr,
          libelle: String(desc).slice(0, 100),
          montant: leg.amount,
          solde: null,
          banque: "Revolut Pro",
          reference: tx.id,
          statut: "non_justifie",
          source: "revolut_api",
        };
      });

    let inserted = 0;
    if (inserts.length > 0) {
      const { error: insertErr } = await admin.from("transactions_bancaires").insert(inserts);
      if (insertErr) {
        console.error("[revolut-sync-cron] Insert error:", insertErr);
        return new Response(JSON.stringify({ ok: false, error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = inserts.length;
    }

    console.log(`[revolut-sync-cron] Pages=${pages} fetched=${all.length} completed=${completed.length} inserted=${inserted}`);

    return new Response(JSON.stringify({
      ok: true, pages, fetched: all.length, completed: completed.length, inserted,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[revolut-sync-cron] error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
