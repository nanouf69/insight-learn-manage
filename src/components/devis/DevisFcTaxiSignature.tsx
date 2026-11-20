import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CONSENTEMENT_FC_ANNULATION, CONSENTEMENT_FC_VERSION } from "@/lib/contratFormation/consentements";
import {
  buildDevisFcTaxiPdf, chargerFontesUnicode, delaiRetractationFcTaxi, eur, MENTION_NON_CONTRAT,
  prixDepuisMontant, type DevisFcTaxiInput, type ModeSignatureFcTaxi,
} from "@/lib/pdf/devis-fc-taxi";

/** Données du devis telles qu'enregistrées à l'envoi (jamais recalculées côté client). */
export function entreeDepuisDevis(devis: any, mode: ModeSignatureFcTaxi): DevisFcTaxiInput {
  const a = devis?.apprenants ?? {};
  const nomComplet = (devis?.client_nom || `${a.prenom ?? ""} ${a.nom ?? ""}`).trim();
  const fr = (iso?: string | null) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : "");
  return {
    client: {
      nomComplet,
      adresse: devis?.client_adresse || a.adresse || "",
      codePostal: devis?.client_code_postal || a.code_postal || "",
      ville: devis?.client_ville || a.ville || "",
      telephone: devis?.client_telephone || a.telephone || "",
      email: devis?.client_email || a.email || "",
    },
    dates: devis?.dates_formation || "",
    dateDevis: fr(devis?.date_devis),
    dateValidite: fr(devis?.date_validite) || undefined,
    prix: prixDepuisMontant(devis?.montant),
    mode,
  };
}

export function DevisFcTaxiSignature({ devis, token, mode, fcServeurVersion }: { devis: any; token: string; mode: ModeSignatureFcTaxi; fcServeurVersion: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [accept, setAccept] = useState(false);
  const [consentFc, setConsentFc] = useState(false);
  const [mention, setMention] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(!!devis?.signed_at || !!devis?.devis_signe_url);
  const entree = entreeDepuisDevis(devis, mode);
  const serveurPret = fcServeurVersion === CONSENTEMENT_FC_VERSION;

  useEffect(() => {
    const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2; ctx.lineCap = "round";
  }, [done]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { const ctx = e.currentTarget.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing) return; const ctx = e.currentTarget.getContext("2d")!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSigned(true); };
  const effacer = () => { const c = canvasRef.current; const ctx = c?.getContext("2d"); if (!c || !ctx) return; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); setHasSigned(false); };

  const telecharger = async () => {
    try { buildDevisFcTaxiPdf(entree, await chargerFontesUnicode()).save("Devis_formation_continue_TAXI.pdf"); }
    catch (e: any) { toast.error(e?.message || "Téléchargement impossible"); }
  };

  const signer = async () => {
    if (!accept) return toast.error("Veuillez accepter le devis et les conditions générales de vente annexées");
    if (!consentFc) return toast.error("Veuillez confirmer avoir pris connaissance de la procédure d’annulation et de remboursement");
    if (!serveurPret) return toast.error("La preuve serveur n’est pas encore active : aucun document n’a été envoyé");
    if (!hasSigned) return toast.error("Veuillez signer dans le cadre");
    if (!mention.toLowerCase().includes("lu et approuvé")) return toast.error("Veuillez écrire « Lu et approuvé, bon pour accord »");
    setSending(true);
    try {
      const png = canvasRef.current!.toDataURL("image/png");
      const horodatage = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
      const doc = buildDevisFcTaxiPdf(entree, await chargerFontesUnicode(), undefined, { imagePng: png, horodatage, mention: mention.trim() });
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", doc.output("blob"), `${devis.id}_devis_fc_taxi_signe.pdf`);
      fd.append("consentement_annulation_remboursement_fc", String(consentFc));
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-devis-signe`, {
        method: "POST", headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: fd,
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Erreur lors de l'envoi");
      setDone(true);
      toast.success("Devis signé enregistré");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi");
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-card rounded-lg border p-6 space-y-5">
        <h1 className="text-2xl font-bold">DEVIS – Formation continue TAXI</h1>
        <div className="text-sm space-y-1">
          <p><strong>Stagiaire :</strong> {entree.client.nomComplet}</p>
          <p><strong>Dates :</strong> {entree.dates}</p>
          <p><strong>Prix :</strong> {eur(entree.prix)}</p>
          <p><strong>Délai de rétractation :</strong> {delaiRetractationFcTaxi(mode)} jours — aucun paiement avant la fin de ce délai.</p>
        </div>
        <p className="text-sm rounded-md border p-3 bg-muted/40">{MENTION_NON_CONTRAT}</p>
        <Button variant="outline" onClick={telecharger}>Télécharger le devis PDF (avec les CGV)</Button>

        {done ? (
          <p className="text-sm font-medium" data-testid="fc-taxi-signe">Votre devis signé a bien été enregistré. Le contrat de formation individuel vous sera remis séparément.</p>
        ) : (<>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="w-5 h-5 mt-0.5" aria-label="Accepter le devis et les CGV" />
            <span className="text-sm">J’ai lu le devis et les conditions générales de vente annexées, et je les accepte.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentFc} onChange={(e) => setConsentFc(e.target.checked)} className="w-5 h-5 mt-0.5" aria-label="Confirmer la procédure écrite d’annulation et de remboursement" />
            <span className="text-sm">{CONSENTEMENT_FC_ANNULATION}</span>
          </label>
          {!serveurPret && <p className="text-xs text-destructive">La preuve serveur n’est pas encore active : la signature est temporairement indisponible.</p>}
          <div className="space-y-1">
            <label className="text-sm font-semibold" htmlFor="mention-fc">Mention manuscrite</label>
            <input id="mention-fc" value={mention} onChange={(e) => setMention(e.target.value)} placeholder="Lu et approuvé, bon pour accord" className="w-full border rounded-md px-3 py-2 text-sm bg-background" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Votre signature</p>
            <canvas ref={canvasRef} width={600} height={180} aria-label="Zone de signature"
              className="w-full border rounded-md touch-none bg-background"
              onPointerDown={down} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerLeave={() => setDrawing(false)} />
            <Button variant="ghost" size="sm" onClick={effacer}>Effacer</Button>
          </div>
          <Button onClick={signer} disabled={sending}>{sending ? "Envoi…" : "Signer le devis"}</Button>
        </>)}
        <p className="text-xs text-muted-foreground">FTRANSPORT · 86 route de Genas, 69003 Lyon · contact@ftransport.fr · 04 28 29 60 91</p>
      </div>
    </div>
  );
}
