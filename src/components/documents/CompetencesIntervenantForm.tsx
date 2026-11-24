import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { COMPETENCES_CHAMPS, DECLARATION_COMPETENCES, validerCompetences, validerJustificatif } from "@/lib/competencesIntervenant";

export interface CompetencesDocument {
  nom: string;
  destinataire_nom: string;
  statut: string;
  modele_version: string;
  reponses: Record<string, string>;
  expires_at: string;
}
export function CompetencesIntervenantForm({ doc, appel, recharger }: {
  doc: CompetencesDocument;
  appel: (body: Record<string, unknown>) => Promise<{ ok: boolean; json: any }>;
  recharger: () => Promise<void>;
}) {
  const [reponses, setReponses] = useState<Record<string, string>>(doc.reponses ?? {});
  const [declaration, setDeclaration] = useState(false);
  const [files, setFiles] = useState<Array<{ nom: string; path: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitted = doc.statut === "signe";
  return <main className="mx-auto max-w-3xl p-6 space-y-6">
    <header><h1 className="text-2xl font-bold">Justification des compétences</h1>
      <p className="font-medium">{doc.destinataire_nom} — SERVICES PRO</p>
      <p className="text-sm text-muted-foreground">Version du 24 novembre 2026 · Lien individuel valable jusqu’au {new Date(doc.expires_at).toLocaleDateString("fr-FR")}</p>
    </header>
    {submitted ? <p className="text-success font-semibold">Déclaration enregistrée — examen du responsable en attente, compétences non encore validées.</p> : <>
      {COMPETENCES_CHAMPS.map(champ => <div key={champ.id} className="space-y-2">
        <Label htmlFor={champ.id}>{champ.label}</Label>
        <Textarea id={champ.id} value={reponses[champ.id] ?? ""} maxLength={12_000} disabled={busy}
          onChange={event => setReponses(previous => ({ ...previous, [champ.id]: event.target.value }))} />
      </div>)}
      <div className="space-y-2"><Label htmlFor="pieces">CV et justificatifs (PDF, JPG ou PNG ; 4 Mo maximum par fichier)</Label>
        <Input id="pieces" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!validerJustificatif(file)) { setError("Fichier refusé : PDF/JPG/PNG de 4 Mo maximum."); return; }
          setBusy(true); setError("");
          try {
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",")[1]) : reject(new Error("Lecture impossible"));
              reader.onerror = () => reject(new Error("Lecture impossible")); reader.readAsDataURL(file);
            });
            const result = await appel({ action: "upload", nom: file.name, mime: file.type, data });
            if (!result.ok || !result.json.path) throw new Error(result.json.error ?? "Dépôt non confirmé");
            setFiles(previous => [...previous, { nom: file.name, path: result.json.path }]);
          } catch (e) { setError(e instanceof Error ? e.message : "Dépôt impossible"); }
          finally { setBusy(false); }
        }} />
        {files.map(file => <p key={file.path} className="text-sm">{file.nom} — déposé</p>)}
      </div>
      <label className="flex items-start gap-3"><Checkbox className="mt-1 flex-none" checked={declaration} disabled={busy} onCheckedChange={value => setDeclaration(value === true)} aria-label="Déclaration d’exactitude" />
        <span className="text-sm">{DECLARATION_COMPETENCES}</span></label>
      <Button disabled={busy} onClick={async () => {
        const refused = validerCompetences(reponses, declaration);
        if (refused) { setError(refused); return; }
        if (!files.length) { setError("Joignez votre CV ou un justificatif avant validation."); return; }
        setBusy(true); setError("");
        try {
          const result = await appel({ action: "submit", reponses, declaration, fichiers: files });
          if (!result.ok || !result.json.success) throw new Error(result.json.error ?? "Enregistrement non confirmé");
          await recharger();
        } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible"); }
        finally { setBusy(false); }
      }}>{busy ? "Enregistrement…" : "Valider ma déclaration"}</Button>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </main>;
}