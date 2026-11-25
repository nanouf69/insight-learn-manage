import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { PdfPriveActions } from "./PdfPriveActions";

export function ContresignatureCentre({ documentCompetencesId }: { documentCompetencesId: string }) {
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [operationId] = useState(() => crypto.randomUUID());
  const appel = (body: Record<string, unknown>) => supabase.functions.invoke("intervenant-signature", { body: { document_competences_id: documentCompetencesId, ...body } });
  const q = useQuery({ queryKey: ["contresignature-centre", documentCompetencesId], retry: false, queryFn: async () => {
    const r = await appel({ action: "admin_contresigne_get" });
    if (r.error || !r.data?.ok) throw new Error(r.data?.error ?? "Lecture impossible");
    return r.data;
  } });
  const urlPdf = async (version: string) => {
    const r = await appel({ action: "admin_contresigne_pdf", version });
    if (r.error || !r.data?.url) throw new Error(r.data?.error ?? "PDF indisponible");
    return r.data.url as string;
  };
  const signer = async () => {
    setBusy(true); setMessage("");
    try {
      const r = await appel({ action: "admin_contresigner", operation_id: operationId, consentement: true, signature, empreinte_pdf_vue: q.data?.prestataire?.pdf_empreinte });
      if (r.error || !r.data?.ok) throw new Error(r.data?.error ?? "Signature non confirmée");
      setMessage("Signature de SERVICES PRO enregistrée."); await q.refetch();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Signature impossible"); } finally { setBusy(false); }
  };
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Lecture du contrat…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  const d = q.data;
  return <div className="space-y-3 rounded-md border border-primary/40 p-3">
    <h3 className="font-semibold">Signature SERVICES PRO du contrat-cadre</h3>
    {d.prestataire ? <p className="text-sm">Signé par le prestataire {d.prestataire.signe_le_paris}.</p> : <p className="text-sm text-warning">Le prestataire n’a pas encore signé.</p>}
    {d.prestataire && <PdfPriveActions titre="Contrat-cadre signé par le prestataire" nomFichier="contrat-cadre-prestataire.pdf" chargerUrl={() => urlPdf("prestataire")} ouvrirLabel="Relire le PDF signé par le prestataire" />}
    {d.centre ? <>
      <p className="text-sm text-success">Signé par {d.centre.signataire_nom} ({d.centre.signataire_qualite}) {d.centre.signe_le_paris}.</p>
      <PdfPriveActions titre="Contrat-cadre signé par les deux parties" nomFichier="contrat-cadre-deux-signatures.pdf" chargerUrl={() => urlPdf("contresigne")} ouvrirLabel="Ouvrir le PDF signé par les deux parties" variant="default" />
    </> : d.prestataire && <>
      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-1 flex-none" checked={consent} onCheckedChange={(v) => setConsent(v === true)} /><span>{d.consentement}</span></label>
      <SignaturePad value={signature} onChange={setSignature} disabled={busy} />
      <Button disabled={!consent || !signature || busy} onClick={signer}>Signer personnellement pour SERVICES PRO</Button>
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
