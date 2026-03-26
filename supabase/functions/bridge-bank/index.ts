import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// GoCardless Bank Account Data API (ex-Nordigen) - FREE tier
const GC_BASE_URL = "https://bankaccountdata.gocardless.com/api/v2";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const secretId = Deno.env.get("GOCARDLESS_SECRET_ID");
  const secretKey = Deno.env.get("GOCARDLESS_SECRET_KEY");

  if (!secretId || !secretKey) {
    return new Response(JSON.stringify({ error: "GoCardless non configuré. Cette fonctionnalité nécessite un compte GoCardless Bank Account Data.", available: false }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Helper: get access token
  async function getToken(): Promise<string> {
    const res = await fetch(`${GC_BASE_URL}/token/new/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`GoCardless auth failed [${res.status}]: ${JSON.stringify(data)}`);
    return data.access;
  }

  try {
    const { action, requisition_id, account_id, redirect_url, institution_id } = await req.json();

    // ============ list_institutions: list French banks ============
    if (action === "list_institutions") {
      const token = await getToken();
      const res = await fetch(`${GC_BASE_URL}/institutions/?country=fr`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`GoCardless list_institutions failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ create_requisition: create a bank link session ============
    if (action === "create_requisition") {
      const token = await getToken();
      const redirect = redirect_url || "https://gestion.ftransport.fr/";
      const instId = institution_id || "BNP_PARIBAS_BNPAFRPP"; // BNP Paribas France default

      const res = await fetch(`${GC_BASE_URL}/requisitions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          redirect: redirect,
          institution_id: instId,
          reference: `ftransport_${Date.now()}`,
          agreement: "",
          user_language: "FR",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`GoCardless create_requisition failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ get_requisition: check status & get account ids ============
    if (action === "get_requisition") {
      if (!requisition_id) throw new Error("requisition_id required");
      const token = await getToken();
      const res = await fetch(`${GC_BASE_URL}/requisitions/${requisition_id}/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`GoCardless get_requisition failed [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ list_accounts: list accounts from a requisition ============
    if (action === "list_accounts") {
      if (!requisition_id) throw new Error("requisition_id required");
      const token = await getToken();
      // First get the account IDs from the requisition
      const reqRes = await fetch(`${GC_BASE_URL}/requisitions/${requisition_id}/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(`GoCardless get_requisition failed [${reqRes.status}]: ${JSON.stringify(reqData)}`);

      const accountIds: string[] = reqData.accounts || [];

      // Fetch details for each account
      const accounts = await Promise.all(
        accountIds.map(async (id: string) => {
          const [detailsRes, balancesRes] = await Promise.all([
            fetch(`${GC_BASE_URL}/accounts/${id}/details/`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            }),
            fetch(`${GC_BASE_URL}/accounts/${id}/balances/`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            }),
          ]);
          const details = await detailsRes.json();
          const balances = await balancesRes.json();
          return {
            id,
            name: details.account?.name || details.account?.ownerName || "Compte",
            iban: details.account?.iban || "",
            currency: details.account?.currency || "EUR",
            balance: balances.balances?.[0]?.balanceAmount?.amount || 0,
            balanceType: balances.balances?.[0]?.balanceType || "",
          };
        })
      );

      return new Response(JSON.stringify({ accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ list_transactions: get transactions for an account ============
    if (action === "list_transactions") {
      if (!account_id) throw new Error("account_id required");
      const token = await getToken();
      const res = await fetch(`${GC_BASE_URL}/accounts/${account_id}/transactions/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`GoCardless list_transactions failed [${res.status}]: ${JSON.stringify(data)}`);

      const booked = (data.transactions?.booked || []).map((t: any) => ({
        id: t.transactionId || t.internalTransactionId,
        description: t.remittanceInformationUnstructured || t.remittanceInformationStructured || t.creditorName || t.debtorName || "Transaction",
        amount: parseFloat(t.transactionAmount?.amount || "0"),
        currency: t.transactionAmount?.currency || "EUR",
        date: t.bookingDate || t.valueDate,
        creditor: t.creditorName || "",
        debtor: t.debtorName || "",
      }));

      return new Response(JSON.stringify({ transactions: booked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("GoCardless API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
