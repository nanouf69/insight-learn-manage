import { useState } from "react";
import { CheckCircle2, Download, FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { genererPdfAttestation, telechargerBlob } from "@/lib/attestationFinValidee/pdf";

export interface AttestationDocData {
  modele_code: string; statut: string; lignes: string[]; modules: { id: number; statut: string | null; preuve_complete: boolean | null; completed_at?: string | null }[];
  reference: string | null; representant: string | null; signature_centre_le: string | null; signature_centre_image: string | null;
  texte_empreinte: string | null; nom_eleve: string; prenom_eleve: string; signature: string | null; signe_le_paris: string | null; consentement: string;
}

/** Signature de l'attestation par l'apprenant : texte figé affiché tel quel, tracé + confirmation obligatoires. */
export function AttestationSignatureForm({ doc, soumettre, recharger }: {
  doc: AttestationDocData;
  soumettre: (p: { signature: string; consentement: boolean; empreinte_vue: string | null }) => Promise<{ error?: string }>;
  recharger: () => Promise<void>;
}) {
  const [signature, setSignature] = useState("");
  const [ok, setOk] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const signe = doc.statut === "signe";

  const telecharger = () => telechargerBlob(genererPdfAttestation({
    mode: "officiel", lignes: doc.lignes, modules: doc.modules, reference: doc.reference, empreinte: doc.texte_empreinte,
    signatureCentre: doc.representant ? { representant: doc.representant, le: doc.signature_centre_le, image: doc.signature_centre_image } : null,
    signatureApprenant: { nom: `${doc.prenom_eleve} ${doc.nom_eleve}`.trim(), image: doc.signature, le: doc.signe_le_paris },
  }), `Attestation_fin_formation_${doc.reference ?? ""}.pdf`);

  const valider = async () => {
    setErreur(null);
    if (!ok) { setErreur("Merci de cocher la case de confirmation."); return; }
    if (!signature) { setErreur("Merci de signer dans le cadre prévu."); return; }
    setEnvoi(true);
    const r = await soumettre({ signature, consentement: true, empreinte_vue: doc.texte_empreinte });
    setEnvoi(false);
    if (r.error) { setErreur(r.error); return; }
    await recharger();
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <FileSignature className="h-8 w-8 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Attestation de fin de formation</h1>
          {doc.reference && <p className="text-sm text-muted-foreground">Référence {doc.reference}</p>}
        </header>
        <article className="rounded-lg border bg-card p-6 space-y-3 text-base leading-relaxed">
          {doc.lignes.map((l, i) => <p key={i} className={i === 0 ? "text-center font-bold text-lg" : ""}>{l}</p>)}
          {doc.representant && <p className="text-sm text-muted-foreground">Signée pour le centre par {doc.representant}.</p>}
        </article>
        {signe ? (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-success/10 p-4 text-success">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Attestation signée {doc.signe_le_paris ? `le ${doc.signe_le_paris}` : ""}</div>
            <Button variant="outline" className="min-h-11 gap-2" onClick={telecharger}><Download className="h-4 w-4" />Télécharger mon attestation signée</Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border bg-card p-6">
            <label className="flex items-start gap-3 min-h-11 cursor-pointer rounded-md border p-3">
              <Checkbox checked={ok} onCheckedChange={v => setOk(v === true)} className="mt-1 h-6 w-6" />
              <span>{doc.consentement}</span>
            </label>
            <div className="space-y-2"><p className="font-medium">Votre signature</p><SignaturePad value={signature} onChange={setSignature} /></div>
            {erreur && <p className="text-destructive" role="alert">{erreur}</p>}
            <Button className="w-full min-h-11" disabled={envoi} onClick={valider}>{envoi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Signer l'attestation</Button>
          </div>
        )}
      </div>
    </div>
  );
}
