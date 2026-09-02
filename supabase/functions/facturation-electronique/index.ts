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

const PDP_BASE_URL = (Deno.env.get("PDP_BASE_URL") || "https://api.superpdp.tech").replace(/\/+$/, "");
const PDP_TOKEN_URL = Deno.env.get("PDP_TOKEN_URL") || `${PDP_BASE_URL}/oauth2/token`;
const PDP_CLIENT_ID = Deno.env.get("PDP_CLIENT_ID") || "";
const PDP_CLIENT_SECRET = Deno.env.get("PDP_CLIENT_SECRET") || "";
const ENVIRONNEMENT = Deno.env.get("PDP_ENVIRONNEMENT") || "sandbox";
const API = "/v1.beta";

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
    expiresAt: Date.now() + (Number(data.expires_in || 1800) * 1000),
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
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

/** Facture-X / EN16931 CII (UN/CEFACT CrossIndustryInvoice) minimal profile. */
function buildFacturXXml(f: Record<string, any>, vendeur: Record<string, any>): string {
  const ht = Number(f.montant_ht || 0);
  const tva = Number(f.montant_tva || 0);
  const ttc = Number(f.montant_ttc || ht + tva);
  const taux = Number(f.tva_taux ?? (ht > 0 ? (tva / ht) * 100 : 0));
  const emission = dt(f.date_emission) || dt(new Date().toISOString());
  const vendeurSiren = digits(vendeur?.number || f.vendeur_siren || "");
  const clientSiren = digits(f.client_siren || "");
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
    <ram:IssueDateTime><udt:DateTimeString format="102">${emission}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(f.objet || f.description || "Prestation de formation")}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${num(ht)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${tva > 0 ? "S" : "E"}</ram:CategoryCode>
          <ram:RateApplicablePercent>${num(taux)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${num(ht)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(vendeur?.formal_name || f.vendeur_nom || "FTRANSPORT")}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(vendeur?.postcode || "")}</ram:PostcodeCode>
          <ram:LineOne>${esc(vendeur?.address || "")}</ram:LineOne>
          <ram:CityName>${esc(vendeur?.city || "")}</ram:CityName>
          <ram:CountryID>${esc(vendeur?.country || "FR")}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${vendeurSiren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(vendeurSiren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(f.client_nom)}</ram:Name>
        ${clientSiren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${esc(clientSiren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}
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

const lastEvent = (inv: any) => {
  const events: any[] = Array.isArray(inv?.events) ? inv.events : [];
  if (!events.length) return null;
  return events.reduce((a, b) => (new Date(b.created_at) >= new Date(a.created_at) ? b : a));
};

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
      if (!configured()) return json({ configured: false, environnement: ENVIRONNEMENT });
      try {
        const me = await pdpFetch(`${API}/companies/me`);
        return json({
          configured: true,
          environnement: me?.env || ENVIRONNEMENT,
          entreprise: {
            nom: me?.formal_name || me?.trade_name || null,
            siren: me?.number || null,
            ville: me?.city || null,
          },
        });
      } catch (e) {
        return json({
          configured: true,
          environnement: ENVIRONNEMENT,
          erreur: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (!configured()) {
      return json(
        { error: "Plateforme de dématérialisation non configurée (identifiants manquants)." },
        400,
      );
    }

    // --- Émettre une facture de vente au format Factur-X (CII) ---
    if (action === "emettre") {
      const factureId = String(body?.facture_id || "");
      if (!factureId) return json({ error: "facture_id requis" }, 400);

      const { data: facture, error: fErr } = await supabase
        .from("factures")
        .select("*")
        .eq("id", factureId)
        .maybeSingle();
      if (fErr || !facture) return json({ error: "Facture introuvable" }, 404);

      let vendeur: Record<string, any> = {};
      try {
        vendeur = await pdpFetch(`${API}/companies/me`);
      } catch (_) {
        vendeur = {};
      }

      const xml = buildFacturXXml(facture, vendeur);
      const externalId = String(facture.numero || factureId).slice(0, 36);

      let sent: any;
      try {
        sent = await pdpFetch(`${API}/invoices?external_id=${encodeURIComponent(externalId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await supabase.from("factures_electroniques").insert({
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
        });
        return json({ error: "Dépôt refusé par la plateforme", details: message }, 502);
      }

      const documentId = sent?.id != null ? String(sent.id) : null;
      const evenement = lastEvent(sent);
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
          statut: evenement?.status_code || "deposee",
          environnement: ENVIRONNEMENT,
          raw: sent,
        })
        .select()
        .single();
      if (insErr) return json({ error: insErr.message }, 500);

      await supabase.from("facture_electronique_evenements").insert({
        facture_electronique_id: row.id,
        statut: row.statut,
        libelle: evenement?.status_text || "Facture déposée sur la plateforme",
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
        .not("pdp_document_id", "is", null);

      for (const e of emises || []) {
        try {
          const inv = await pdpFetch(
            `${API}/invoices/${encodeURIComponent(e.pdp_document_id!)}?expand[]=events`,
          );
          const evenement = lastEvent(inv);
          const statut = evenement?.status_code;
          if (statut && statut !== e.statut) {
            await supabase
              .from("factures_electroniques")
              .update({ statut, raw: inv, derniere_erreur: null })
              .eq("id", e.id);
            await supabase.from("facture_electronique_evenements").insert({
              facture_electronique_id: e.id,
              statut,
              libelle: evenement?.status_text || null,
              raw: evenement,
            });
            statuts++;
          }
        } catch (err) {
          erreurs.push(err instanceof Error ? err.message : String(err));
        }
      }

      try {
        const inbox = await pdpFetch(
          `${API}/invoices?direction=in&order=desc&limit=100&expand[]=en_invoice&expand[]=en_invoice.seller&expand[]=events`,
        );
        const items: any[] = inbox?.data || [];
        for (const it of items) {
          const documentId = it?.id != null ? String(it.id) : null;
          if (!documentId) continue;
          const { data: existing } = await supabase
            .from("factures_electroniques")
            .select("id")
            .eq("pdp_document_id", documentId)
            .maybeSingle();
          if (existing) continue;
          const en = it?.en_invoice || {};
          const totals = en?.totals || {};
          await supabase.from("factures_electroniques").insert({
            sens: "recue",
            pdp_document_id: documentId,
            numero: en?.number || null,
            partenaire_nom: en?.seller?.name || en?.seller?.trading_name || null,
            partenaire_siren: en?.seller?.legal_registration_identifier?.value || null,
            montant_ht: totals?.sum_invoice_line_net_amount ?? totals?.invoice_total_amount_without_vat ?? null,
            montant_tva: totals?.invoice_total_vat_amount ?? null,
            montant_ttc: totals?.invoice_total_amount_with_vat ?? totals?.amount_due_for_payment ?? null,
            date_emission: en?.issue_date ?? null,
            date_echeance: en?.payment_due_date ?? null,
            statut: lastEvent(it)?.status_code || "recue",
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
