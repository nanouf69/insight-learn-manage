import { useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { useToast } from "@/hooks/use-toast";
import type { TexteFige } from "@/lib/modeles/entrainementPratiqueVtc";
import { genererPreuveChoixPdf } from "@/lib/modeles/preuveChoixPdf";
import { telechargerPdf } from "@/lib/documentSigneDownload";

export interface ChoixDocData {
  modele_code: string;
  modele_version: string | null;
  nom: string;
  texte: TexteFige | null;
  statut: string;
  nom_eleve: string;
  prenom_eleve: string;
  choix: string | null;
  signature: string | null;
  signe_le_paris: string | null;
  signed_at: string | null;
  envoye_le: string | null;
  texte_empreinte: string | null;
}

interface Props {
  doc: ChoixDocData;
  /** Envoie le choix + la signature ; renvoie la réponse serveur. */
  soumettre: (choix: string, signature: string) => Promise<{ success?: boolean; deja_signe?: boolean; error?: string }>;
  /** Recharge depuis le serveur après envoi (preuve réelle). */
  recharger: () => Promise<void>;
}

export function ChoixPratiqueForm({ doc, soumettre, recharger }: Props) {
  const { toast } = useToast();
  const [choix, setChoix] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const verrou = useRef(false);
  const signe = doc.statut === "signe";
  const texte = doc.texte;

  if (!texte) return <p className="text-center text-muted-foreground">Document indisponible.</p>;

  const valider = async () => {
    if (verrou.current) return;
    if (!choix) { toast({ title: "Merci de cocher une seule case.", variant: "destructive" }); return; }
    if (!signature) { toast({ title: "Merci de signer dans le cadre prévu.", variant: "destructive" }); return; }
    verrou.current = true;
    setEnvoi(true);
    try {
      const r = await soumettre(choix, signature);
      if (!r.success) throw new Error(r.error || "Envoi impossible");
      await recharger();
      toast({ title: "Merci !", description: "Votre choix signé a bien été transmis." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      verrou.current = false;
    } finally {
      setEnvoi(false);
    }
  };

  const telecharger = async () => {
    const bytes = await genererPreuveChoixPdf({
      texte, version: doc.modele_version, empreinte: doc.texte_empreinte,
      nom: doc.nom_eleve, prenom: doc.prenom_eleve, choix: doc.choix, signature: doc.signature,
      signeLeParis: doc.signe_le_paris, signedAt: doc.signed_at, envoyeLe: doc.envoye_le,
    });
    telechargerPdf(bytes, `choix_entrainement_pratique_${doc.nom_eleve}_${doc.prenom_eleve}.pdf`);
  };

  const choixAffiche = signe ? doc.choix : choix;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="text-center space-y-2">
          <FileSignature className="h-8 w-8 mx-auto text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">{texte.titre ?? "Votre entraînement pratique"}</h1>
        </header>

        {signe && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-success/10 text-success" data-testid="deja-signe">
            <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5" /> Choix signé et transmis</div>
            <p className="text-sm">{doc.signe_le_paris}</p>
            <Button variant="outline" className="gap-2" onClick={telecharger}><Download className="h-4 w-4" /> Télécharger mon document signé</Button>
          </div>
        )}

        <div className="bg-card border rounded-xl p-4 sm:p-6 space-y-4 text-sm sm:text-base leading-relaxed">
          {texte.intro.map((t, i) => <p key={i}>{t}</p>)}
          <p className="font-semibold">{texte.consigne}</p>
          <div role="radiogroup" aria-label="Votre choix" className="space-y-3">
            {texte.choix.map((c) => {
              const actif = choixAffiche === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={signe || envoi}
                  onClick={() => setChoix(c.code)}
                  className={`w-full text-left flex gap-3 items-start p-3 rounded-lg border-2 transition-colors ${actif ? "border-primary bg-primary/10" : "border-border bg-background"} disabled:cursor-default`}
                >
                  <span className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center ${actif ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
                    {actif ? "✓" : ""}
                  </span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
          {texte.suite.map((t, i) => <p key={i}>{t}</p>)}

          <div className="border-t pt-4 space-y-3">
            <p><span className="font-semibold">Nom, prénom :</span> {doc.nom_eleve} {doc.prenom_eleve}</p>
            <p><span className="font-semibold">Date :</span> {signe ? doc.signe_le_paris : "enregistrée automatiquement au moment de la signature (heure de Paris)"}</p>
            <div>
              <p className="font-semibold mb-2">Signature : {!signe && <span className="text-destructive">*</span>}</p>
              {signe ? (
                doc.signature ? <img src={doc.signature} alt="Signature" className="h-24 bg-background border rounded" /> : null
              ) : (
                <SignaturePad value={signature} onChange={setSignature} />
              )}
            </div>
          </div>

          {!signe && (
            <Button className="w-full" size="lg" onClick={valider} disabled={envoi || !choix || !signature}>
              {envoi && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Valider et signer
            </Button>
          )}

          <div className="border-t pt-4 text-xs text-muted-foreground space-y-0.5">
            {texte.signataire.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
