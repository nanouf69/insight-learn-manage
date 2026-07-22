import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse optional query params (from body or URL) ---
    let body: Record<string, string> = {};
    try { body = await req.json(); } catch { /* no body */ }
    const url = new URL(req.url);
    const from = body.from || url.searchParams.get("from") || "";
    const toParam = body.to || url.searchParams.get("to") || "";

    // --- Get latest Revolut token ---
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("revolut_tokens")
      .select("access_token, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "No Revolut token found. Please reconnect." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Revolut token expired. Please reconnect." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Pagination: walk backward until no more results or hit `from` bound ---
    const all: any[] = [];
    const seen = new Set<string>();
    let cursor = toParam || ""; // ISO timestamp, exclusive upper bound for next page
    const MAX_PAGES = 40; // safety cap → up to 40 * 1000 = 40k tx
    let pages = 0;

    while (pages < MAX_PAGES) {
      const params = new URLSearchParams({ count: "1000" });
      if (from) params.set("from", from);
      if (cursor) params.set("to", cursor);

      const revolutResponse = await fetch(
        `https://b2b.revolut.com/api/1.0/transactions?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenRow.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const revolutData = await revolutResponse.json();
      if (!revolutResponse.ok) {
        console.error("Revolut fetch failed:", revolutData);
        return new Response(
          JSON.stringify({ error: "Failed to fetch transactions", details: revolutData }),
          { status: revolutResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const batch: any[] = Array.isArray(revolutData) ? revolutData : [];
      if (batch.length === 0) break;

      let addedThisPage = 0;
      let oldest: string | null = null;
      for (const tx of batch) {
        if (!seen.has(tx.id)) {
          seen.add(tx.id);
          all.push(tx);
          addedThisPage++;
        }
        const ts = tx.created_at || tx.completed_at;
        if (ts && (!oldest || ts < oldest)) oldest = ts;
      }

      pages++;
      if (addedThisPage === 0 || !oldest) break;
      // Next page: fetch older than the oldest we've seen
      cursor = oldest;
      if (batch.length < 1000) break; // no more pages
    }

    console.log(`[revolut-transactions] Fetched ${all.length} transactions across ${pages} pages`);

    return new Response(JSON.stringify({ transactions: all, pages }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("revolut-transactions error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
