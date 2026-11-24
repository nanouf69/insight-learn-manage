import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SATISFACTION_NOTES, SATISFACTION_TEXTES, texteSatisfactionFige, validerReponsesSatisfaction } from "@/lib/parcoursIntervenant";
import { appelIntervenantSignature } from "@/lib/parcoursIntervenantClient";

export function SatisfactionIntervenantForm({ token, documentId, reponses: initiales, remise, onChange }: {
  token: string;
  documentId: string;
  reponses?: Record<string, unknown>;
  remise: boolean;
  onChange: () => Promise<void>;
}) {
  const [reponses, setReponses] = useState<Record<string, unknown>>(initiales ?? {});
  const [declaration, setDeclaration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const texte = texteSatisfactionFige();
  return <div className="space-y-5 rounded-md border bg-muted/30 p-4">
    <p className="text-sm leading-6">{texte.introduction}</p>
    <p className="text-sm font-medium">{texte.echelle}</p>
    {remise ? <div className="space-y-3">
      <p className="font-medium text-success">Enquête enregistrée. Vous pouvez maintenant relire vos réponses et la signer séparément.</p>
      {SATISFACTION_NOTES.map(question => <p key={question.id} className="text-sm">{question.label} : <strong>{String(initiales?.[question.id] ?? "Non renseigné")}/5</strong></p>)}
      {SATISFACTION_TEXTES.map(champ => <div key={champ.id}><p className="text-sm font-medium">{champ.label}</p><p className="whitespace-pre-wrap text-sm">{String(initiales?.[champ.id] ?? "") || "—"}</p></div>)}
    </div> : <>
      {SATISFACTION_NOTES.map(question => <fieldset key={question.id} className="space-y-2">
        <legend className="text-sm font-medium">{question.label}</legend>
        <div className="grid grid-cols-5 gap-2" aria-label={question.label}>
          {[1, 2, 3, 4, 5].map(note => <Button key={note} type="button" size="sm" variant={reponses[question.id] === note ? "default" : "outline"} disabled={busy} aria-pressed={reponses[question.id] === note} onClick={() => setReponses(previous => ({ ...previous, [question.id]: note }))}>{note}</Button>)}
        </div>
      </fieldset>)}
      {SATISFACTION_TEXTES.map(champ => <div key={champ.id} className="space-y-2">
        <Label htmlFor={`satisfaction-${champ.id}`}>{champ.label}</Label>
        <Textarea id={`satisfaction-${champ.id}`} maxLength={4_000} disabled={busy} value={String(reponses[champ.id] ?? "")} onChange={event => setReponses(previous => ({ ...previous, [champ.id]: event.target.value }))} />
      </div>)}
      <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-1 flex-none" checked={declaration} disabled={busy} onCheckedChange={value => setDeclaration(value === true)} /><span>{texte.declaration}</span></label>
      <Button disabled={busy} onClick={async () => {
        const refused = validerReponsesSatisfaction(reponses, declaration);
        if (refused) { setError(refused); return; }
        setBusy(true); setError("");
        try {
          const result = await appelIntervenantSignature(token, { action: "submit_satisfaction", document_id: documentId, reponses, declaration });
          if (!result.ok || !result.json.ok) throw new Error(result.json.error ?? "Enregistrement non confirmé");
          await onChange();
        } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible"); }
        finally { setBusy(false); }
      }}>{busy ? "Enregistrement…" : "Enregistrer mes réponses"}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
