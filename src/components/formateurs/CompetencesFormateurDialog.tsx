import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { COMPETENCES_CHAMPS, COMPETENCES_MODELE } from "@/lib/competencesIntervenant";
import { ParcoursFormateurAdmin } from "./ParcoursFormateurAdmin";

export function CompetencesFormateurDialog({ formateurId, onClose }: { formateurId: string; onClose: () => void }) {
  const [decision, setDecision] = useState("a_completer");
  const [motif, setMotif] = useState("");
  const [methode, setMethode] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useQuery({ queryKey: ["competences-formateur", formateurId], queryFn: async () => {
    const { data, error: readError } = await supabase.from("documents_a_signer").select("id,token,statut,destinataire_nom,destinataire_email")
      .eq("modele_code", COMPETENCES_MODELE).contains("identite_figee", { formateur_id: formateurId }).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (readError) throw readError;
    if (!data) return null;
    const result = await supabase.functions.invoke("competences-intervenant", { body: { action: "admin_get", document_id: data.id } });
    if (result.error || !result.data?.document) throw new Error("Lecture des justificatifs indisponible");
    return { ...result.data, token: data.token, link: `${window.location.origin}/competences-intervenant/${data.token}` };
  } });
  const doc = query.data?.document;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Compétences de l’intervenant — examen responsable</DialogTitle></DialogHeader>
    {query.isLoading && <p>Chargement…</p>}
    {query.isError && <p role="alert" className="text-destructive">Lecture impossible ; aucune compétence n’est réputée validée.</p>}
    {!query.isLoading && !query.isError && !doc && <p>Aucun formulaire individuel préparé.</p>}
    {doc && <div className="space-y-4">
      <p>{doc.destinataire_nom} · {doc.destinataire_email}</p>
      <Button variant="outline" onClick={() => navigator.clipboard.writeText(query.data.link)}>Copier le lien individuel</Button>
      <p className="text-sm text-muted-foreground">Lien individuel unique pour les compétences, le contrat-cadre et l’enquête de satisfaction.</p>
      <ParcoursFormateurAdmin documentId={doc.id} token={query.data.token} declarationStatut={doc.statut} declarationSignedAt={doc.signed_at ?? null} destinataireEmail={doc.destinataire_email} formateurId={formateurId} />
      {doc.statut !== "signe" ? <p>Déclaration de l’intervenant non remise.</p> : <>
        {COMPETENCES_CHAMPS.map(champ => <div key={champ.id}><h3 className="font-semibold">{champ.label}</h3><p className="whitespace-pre-wrap">{doc.reponses[champ.id]}</p></div>)}
        {query.data.fichiers.map((file: { nom: string; url: string }) => <p key={file.url}><a href={file.url} target="_blank" rel="noreferrer" className="text-primary underline">{file.nom}</a></p>)}
        <h3 className="font-semibold">Historique des examens du responsable</h3>
        {query.data.reviews.map((review: any) => <p key={review.id}>{review.signed_at} — {review.reponses.decision} : {review.reponses.motif}</p>)}
        <Label>Décision</Label><Select value={decision} onValueChange={setDecision}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="a_completer">À compléter</SelectItem><SelectItem value="valide">Compétences validées pour les missions examinées</SelectItem><SelectItem value="refuse">Non validé</SelectItem>
        </SelectContent></Select>
        <Label htmlFor="verification">Méthode de vérification réelle et missions examinées</Label><Textarea id="verification" value={methode} onChange={e => setMethode(e.target.value)} />
        <Label htmlFor="decision-motif">Justification et limites</Label><Textarea id="decision-motif" value={motif} onChange={e => setMotif(e.target.value)} />
        <label className="flex gap-2"><Checkbox checked={confirme} onCheckedChange={v => setConfirme(v === true)} />Je confirme avoir réellement examiné ces éléments.</label>
        <Button disabled={saving || !confirme || !motif.trim() || !methode.trim()} onClick={async () => {
          setSaving(true); setError("");
          try {
            const result = await supabase.functions.invoke("competences-intervenant", { body: { action: "review", document_id: doc.id, decision, motif, methode, confirme } });
            if (result.error || !result.data?.success) throw new Error("Décision non confirmée");
            await query.refetch(); setConfirme(false);
          } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible"); }
          finally { setSaving(false); }
        }}>Enregistrer l’examen du responsable</Button>
      </>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>}
  </DialogContent></Dialog>;
}