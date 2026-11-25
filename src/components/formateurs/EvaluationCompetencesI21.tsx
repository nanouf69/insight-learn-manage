import { useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMPETENCES_CHAMPS } from "@/lib/competencesIntervenant";
import { APPRECIATIONS_I21, CRITERES_I21, brouillonCriteresI21, libelleAppreciationI21, type AppreciationI21, type CriteresI21 } from "@/lib/evaluationCompetencesI21";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { PdfPriveActions } from "./PdfPriveActions";

type Props = {
  documentId: string;
  doc: any;
  fichiers: Array<{ nom: string; url: string }>;
  reviews: any[];
  onSaved: () => Promise<unknown>;
};

export function EvaluationCompetencesI21({ documentId, doc, fichiers, reviews, onSaved }: Props) {
  const [criteres, setCriteres] = useState<CriteresI21>(brouillonCriteresI21);
  const [commentaire, setCommentaire] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [signature, setSignature] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const evaluations = reviews.filter(review => review.reponses?.evaluation_i21_version);

  const urlEvaluation = async (reviewId: string) => {
    const result = await supabase.functions.invoke("competences-intervenant", { body: { action: "admin_evaluation_pdf", document_id: documentId, review_id: reviewId } });
    if (result.error || !result.data?.url) throw new Error(result.data?.error ?? "PDF de l’évaluation indisponible");
    return result.data.url as string;
  };

  const signer = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await supabase.functions.invoke("competences-intervenant", { body: {
        action: "review_i21", document_id: documentId, operation_id: operationId,
        criteres, commentaire, confirme, signature,
      } });
      if (result.error || !result.data?.success) throw new Error(result.data?.error ?? "Validation non confirmée");
      setMessage("Évaluation signée, PDF enregistré et preuve rattachée à I21. Le statut de l’indicateur n’a pas été modifié.");
      setConfirme(false); setSignature(""); setOperationId(crypto.randomUUID());
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enregistrement impossible ; votre saisie est conservée.");
    } finally { setBusy(false); }
  };

  return <Card className="min-w-0 border-primary/40" data-testid="evaluation-i21">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Évaluer les compétences — I21</CardTitle>
      <CardDescription>Bilan réellement rempli, pièces reçues et appréciation du responsable. Le brouillon prérempli ne vaut pas validation.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <section className="space-y-3 rounded-md border p-3" aria-label="Bilan et pièces de l’intervenant">
        <h3 className="font-semibold">Bilan rempli par l’intervenant</h3>
        {doc.statut !== "signe" ? <p className="text-sm text-warning">Déclaration non remise : les éléments ci-dessous ne sont pas validables.</p> : <>
          {COMPETENCES_CHAMPS.map(champ => <div key={champ.id} className="text-sm">
            <h4 className="font-medium">{champ.label}</h4>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{doc.reponses?.[champ.id] || "Non renseigné"}</p>
          </div>)}
          <div className="space-y-2">
            <h4 className="font-medium">Pièces jointes</h4>
            {fichiers.length === 0 && <p className="text-sm text-warning">Aucune pièce jointe lisible.</p>}
            {fichiers.map(file => <div key={file.url} className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2">
              <span className="min-w-0 flex-1 break-words text-sm">{file.nom}</span>
              <PdfPriveActions titre={file.nom} nomFichier={file.nom} chargerUrl={async () => file.url} ouvrirLabel="Relire la pièce" />
            </div>)}
          </div>
        </>}
      </section>

      {evaluations.length > 0 && <section className="space-y-3" aria-label="Évaluations I21 enregistrées">
        <h3 className="font-semibold">Évaluations signées conservées</h3>
        {evaluations.map(review => <div key={review.id} className="space-y-3 rounded-md border border-success/40 p-3">
          <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />Signée par le responsable le {review.preuve?.signe_le_paris ?? review.signed_at}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CRITERES_I21.map(critere => <p key={critere.id} className="text-sm">{critere.label} : <strong>{libelleAppreciationI21(review.reponses.criteres?.[critere.id])}</strong></p>)}
          </div>
          <p className="whitespace-pre-wrap text-sm"><strong>Commentaire :</strong> {review.reponses.commentaire || "Aucun commentaire libre."}</p>
          {review.preuve?.pdf_empreinte && <PdfPriveActions titre={`Évaluation I21 — ${doc.destinataire_nom}`} nomFichier={`evaluation-i21-${review.id}.pdf`} chargerUrl={() => urlEvaluation(review.id)} ouvrirLabel="Relire le compte rendu signé" />}
        </div>)}
      </section>}

      <section className="space-y-3 rounded-md border border-warning/50 bg-warning/5 p-3" aria-label="Brouillon de l’évaluation">
        <div>
          <h3 className="font-semibold">Brouillon déclaré par le responsable — non signé</h3>
          <p className="text-sm text-muted-foreground">Les sept critères sont préremplis « Acquis ». Vérifiez et modifiez chaque appréciation avant toute signature.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {CRITERES_I21.map(critere => <div key={critere.id} className="space-y-1">
            <Label htmlFor={`i21-${critere.id}`}>{critere.label}</Label>
            <Select value={criteres[critere.id]} onValueChange={value => setCriteres(current => ({ ...current, [critere.id]: value as AppreciationI21 }))}>
              <SelectTrigger id={`i21-${critere.id}`}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(APPRECIATIONS_I21).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>)}
        </div>
        <div className="space-y-1">
          <Label htmlFor="i21-commentaire">Commentaire libre</Label>
          <Textarea id="i21-commentaire" value={commentaire} onChange={event => setCommentaire(event.target.value)} maxLength={12000} placeholder="" />
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-dashed p-3" aria-label="Aperçu du compte rendu">
        <h3 className="font-semibold">Aperçu du compte rendu — brouillon non signé</h3>
        <p className="text-sm">{doc.destinataire_nom} · Évaluation des compétences I21</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRITERES_I21.map(critere => <p key={critere.id} className="text-sm">{critere.label} : <strong>{libelleAppreciationI21(criteres[critere.id])}</strong></p>)}
        </div>
        <p className="whitespace-pre-wrap text-sm"><strong>Commentaire :</strong> {commentaire || "Aucun commentaire libre."}</p>
        <p className="text-xs text-muted-foreground">La date et l’heure réelles seront ajoutées par le serveur au moment de la signature.</p>
      </section>

      <section className="space-y-3">
        <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-1 flex-none" checked={confirme} onCheckedChange={value => setConfirme(value === true)} />
          <span>Je déclare avoir réellement examiné le bilan et les pièces affichés et évalué les sept critères. Je comprends que seule ma signature manuscrite enregistrera ce compte rendu.</span>
        </label>
        <SignaturePad value={signature} onChange={setSignature} disabled={busy} />
        <Button className="h-auto w-full whitespace-normal text-center" disabled={busy || !confirme || !signature || doc.statut !== "signe"} onClick={signer}>Signer manuscritement et enregistrer l’évaluation I21</Button>
        {message && <p role="status" className="text-sm">{message}</p>}
      </section>
    </CardContent>
  </Card>;
}
