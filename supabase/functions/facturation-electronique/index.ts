import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PDP_BASE_URL = (Deno.env.get("PDP_BASE_URL") || "").replace(/\/+$/, "");
const PDP_TOKEN_URL = Deno.env.get("PDP_TOKEN_URL") || "";
const PDP_CLIENT_ID = Deno.env.get("PDP_CLIENT_ID") || "";
const PDP_CLIENT_SECRET = Deno.env.get("PDP_CLIENT_SECRET") || "";
const ENVIRONNEMENT = Deno.env.get("PDP_ENVIRONNEMENT") || "sandbox";

const configured = () => Boolean(PDP_BASE_URL && PDP_TOKEN_URL && PDP_CLIENT_ID && PDP_CLIENT_SECRET);

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: PDP_CLIENT_ID,
    client_secret: PDP_CLIENT_SECRET,
  });
  const res = await fetch(PDP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Authentification PDP échouée [${res.status}]: ${text}`);
  const data = JSON.parse(text);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
  };
  return cachedToken.value;
}

async function pdpFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${PDP_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const dt = (d?: string | null) => (d ? String(d).slice(0, 10).replace(/-/g, "") : "");
const num = (n: unknown) => Number(n || 0).toFixed(2);

/** Facture-X / EN16931 CII (UN/CEFACT CrossIndustryInvoice) minimal profile. */
function buildFacturXXml(f: Record<string, any>): string {
  const ht = Number(f.montant_ht || 0);
  const tva = Number(f.montant_tva || 0);
  const ttc = Number(f.montant_ttc || ht + tva);
  const taux = Number(f.tva_taux ?? (ht > 0 ? (tva / ht) * 100 : 0));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(f.numero)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${dt(f.date_emission)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(f.vendeur_nom || "FTRANSPORT")}</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(f.vendeur_siren || "")}</ram:ID></ram:SpecifiedLegalOrganization>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(f.client_nom)}</ram:Name>
        ${f.client_siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(f.client_siren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${num(tva)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${num(ht)}</ram:BasisAmount>
        <ram:CategoryCode>${tva > 0 ? "S" : "E"}</ram:CategoryCode>
        <ram:RateApplicablePercent>${num(taux)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      ${f.date_echeance ? `<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${dt(f.date_echeance)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>` : ""}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${num(ht)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${num(ht)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${num(tva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${num(ttc)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${num(ttc)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "status";

    // --- Auth: réservé aux utilisateurs connectés du CRM ---
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData?.user) return json({ error: "Non autorisé" }, 401);

    if (action === "status") {
      return json({ configured: configured(), environnement: ENVIRONNEMENT });
    }

    if (!configured()) {
      return json(
        { error: "Plateforme de dématérialisation non configurée (identifiants manquants)." },
        400,
      );
    }

    // --- Émettre une facture de vente au format Factur-X ---
    if (action === "emettre") {
      const factureId = String(body?.facture_id || "");
      if (!factureId) return json({ error: "facture_id requis" }, 400);

      const { data: facture, error: fErr } = await supabase
        .from("factures")
        .select("*")
        .eq("id", factureId)
        .maybeSingle();
      if (fErr || !facture) return json({ error: "Facture introuvable" }, 404);

      const xml = buildFacturXXml(facture);

      let sent: any;
      try {
        sent = await pdpFetch("/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: "Factur-X",
            docType: "Converted",
            fileName: `${facture.numero || factureId}.xml`,
            content: btoa(unescape(encodeURIComponent(xml))),
          }),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await supabase.from("factures_electroniques").upsert(
          {
            sens: "emise",
            facture_id: factureId,
            numero: facture.numero,
            partenaire_nom: facture.client_nom,
            montant_ht: facture.montant_ht,
            montant_tva: facture.montant_tva,
            montant_ttc: facture.montant_ttc,
            date_emission: facture.date_emission,
            date_echeance: facture.date_echeance,
            statut: "erreur",
            derniere_erreur: message,
            environnement: ENVIRONNEMENT,
          },
          { onConflict: "id" },
        );
        return json({ error: "Dépôt refusé par la plateforme", details: message }, 502);
      }

      const documentId = sent?.id || sent?.documentId || sent?.invoiceId || null;
      const { data: row, error: insErr } = await supabase
        .from("factures_electroniques")
        .insert({
          sens: "emise",
          facture_id: factureId,
          pdp_document_id: documentId,
          numero: facture.numero,
          partenaire_nom: facture.client_nom,
          montant_ht: facture.montant_ht,
          montant_tva: facture.montant_tva,
          montant_ttc: facture.montant_ttc,
          date_emission: facture.date_emission,
          date_echeance: facture.date_echeance,
          statut: sent?.status || "deposee",
          environnement: ENVIRONNEMENT,
          raw: sent,
        })
        .select()
        .single();
      if (insErr) return json({ error: insErr.message }, 500);

      await supabase.from("facture_electronique_evenements").insert({
        facture_electronique_id: row.id,
        statut: row.statut,
        libelle: "Facture déposée sur la plateforme",
        raw: sent,
      });

      return json({ success: true, facture_electronique: row });
    }

    // --- Synchroniser statuts (émises) + factures reçues ---
    if (action === "synchroniser") {
      let statuts = 0;
      let recues = 0;
      const erreurs: string[] = [];

      const { data: emises } = await supabase
        .from("factures_electroniques")
        .select("id, pdp_document_id, statut")
        .eq("sens", "emise")
        .eq("environnement", ENVIRONNEMENT)
        .not("pdp_document_id", "is", null)
        .not("statut", "in", "(payee,rejetee)");

      for (const e of emises || []) {
        try {
          const res = await pdpFetch(`/invoices/${encodeURIComponent(e.pdp_document_id!)}/status`);
          const statut = res?.status || res?.statut;
          if (statut && statut !== e.statut) {
            await supabase
              .from("factures_electroniques")
              .update({ statut, raw: res, derniere_erreur: null })
              .eq("id", e.id);
            await supabase.from("facture_electronique_evenements").insert({
              facture_electronique_id: e.id,
              statut,
              libelle: res?.label || res?.message || null,
              raw: res,
            });
            statuts++;
          }
        } catch (err) {
          erreurs.push(err instanceof Error ? err.message : String(err));
        }
      }

      try {
        const inbox = await pdpFetch("/invoices?direction=inbound");
        const items: any[] = inbox?.items || inbox?.data || inbox?.invoices || [];
        for (const it of items) {
          const documentId = it?.id || it?.documentId;
          if (!documentId) continue;
          const { data: existing } = await supabase
            .from("factures_electroniques")
            .select("id")
            .eq("environnement", ENVIRONNEMENT)
            .eq("pdp_document_id", documentId)
            .maybeSingle();
          if (existing) continue;
          await supabase.from("factures_electroniques").insert({
            sens: "recue",
            pdp_document_id: documentId,
            numero: it?.number || it?.numero || null,
            partenaire_nom: it?.supplierName || it?.sellerName || null,
            partenaire_siren: it?.supplierSiren || it?.sellerSiren || null,
            montant_ht: it?.totalExcludingTax ?? null,
            montant_tva: it?.taxAmount ?? null,
            montant_ttc: it?.totalIncludingTax ?? it?.amount ?? null,
            date_emission: it?.issueDate ?? null,
            date_echeance: it?.dueDate ?? null,
            statut: it?.status || "recue",
            environnement: ENVIRONNEMENT,
            raw: it,
          });
          recues++;
        }
      } catch (err) {
        erreurs.push(err instanceof Error ? err.message : String(err));
      }

      return json({ success: true, statuts_mis_a_jour: statuts, factures_recues: recues, erreurs });
    }

    return json({ error: `Action inconnue: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
