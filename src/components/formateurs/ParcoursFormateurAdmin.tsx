import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MESSAGE_TROISIEME_DOCUMENT, libelleStatutDocument, statutDocumentIntervenant, texteContratFige } from "@/lib/parcoursIntervenant";
import { appelIntervenantSignature } from "@/lib/parcoursIntervenantClient";

export function ParcoursFormateurAdmin({ documentId, token, declarationStatut, declarationSignedAt }: { documentId: string; token: string; declarationStatut: string; declarationSignedAt: string | null }) {
  const [confirme, setConfirme] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({ queryKey: ["parcours-signature-intervenant", documentId], retry: false, queryFn: async () => {
    const result = await supabase.functions.invoke("intervenant-signature", { body: { action: "admin_get", document_id: documentId } });
    if (result.error || !result.data?.documents) return { actif: false, documents: [
      { type: "competences", document_id: documentId, titre: "Bilan et justification des compétences", statut_source: declarationStatut, signed_at_source: declarationSignedAt, signature: null },
      { type: "contrat", document_id: null, titre: texteContratFige().titre, statut_source: "apercu", signed_at_source: null, signature: null, preparation_requise: true },
    ] };
    return { actif: true, ...result.data };
  } });
  const executer = async (body: Record<string, unknown>) => {
    setBusy(true); setMessage("");
    try {
      const result = await supabase.functions.invoke("intervenant-signature", { body });
      if (result.error || !result.data?.ok) throw new Error(result.data?.error ?? "Opération non confirmée");
      setMessage(body.action === "prepare" ? "Contrat préparé sans aucun envoi." : `Preuve rattachée à l’indicateur ${result.data.indicateur}, sans changement de statut.`);
      setConfirme(false); await query.refetch();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Opération impossible"); }
    finally { setBusy(false); }
  };
  const docs = query.data?.documents ?? [];
  const contrat = docs.find((d: any) => d.type === "contrat");
  return <Card className="border-primary/30">
    <CardHeader><CardTitle className="text-base">Parcours de signature des documents</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {!query.data?.actif && <p className="text-sm text-warning">Aperçu local : le service de signature n’est pas activé. Aucune préparation, signature ou preuve n’est possible.</p>}
      {docs.map((doc: any) => {
        const statut = statutDocumentIntervenant({ statut: doc.statut_source, signed_at: doc.signed_at_source, signature: doc.signature });
        return <div key={doc.type} className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{doc.titre}</strong><Badge variant="outline">{libelleStatutDocument(statut)}</Badge></div>
          {doc.signature && <><p className="text-sm">Signé {doc.signature.signe_le_paris}</p><p className="break-all text-xs text-muted-foreground">SHA-256 : {doc.signature.pdf_empreinte}</p>
            <Button size="sm" variant="outline" onClick={async () => {
              const result = await appelIntervenantSignature(token, { action: "pdf", document_id: doc.document_id });
              if (result.ok && result.json.url) window.open(result.json.url, "_blank", "noopener,noreferrer"); else setMessage(result.json.error ?? "PDF indisponible");
            }}>Ouvrir le PDF privé</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => executer({ action: "attach_qualiopi", document_competences_id: documentId, document_id: doc.document_id, confirmation_relecture: true })}>J’ai relu — rattacher à I{doc.type === "contrat" ? 27 : 21}</Button>
          </>}
        </div>;
      })}
      <div className="space-y-2 rounded-md bg-muted/40 p-3">
        <h3 className="font-semibold">Aperçu du contrat-cadre</h3>
        <p className="text-sm">50 € TTC/heure · missions d’anglais ponctuelles · durée indéterminée · préavis de 30 jours · aucune exclusivité ni heure historique attestée.</p>
        {(texteContratFige().sections ?? []).map(section => <details key={section.titre}><summary className="cursor-pointer text-sm font-medium">{section.titre}</summary>{section.lignes.map((ligne, i) => <p key={i} className="mt-2 text-sm">{ligne}</p>)}</details>)}
      </div>
      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-1 flex-none" checked={confirme} disabled={!query.data?.actif || !!contrat?.document_id || busy} onCheckedChange={v => setConfirme(v === true)} /><span>Je confirme avoir relu et validé le contenu du contrat avant sa préparation. Cette action n’envoie aucun email.</span></label>
      <Button variant="outline" disabled={!query.data?.actif || !confirme || !!contrat?.document_id || busy} onClick={() => executer({ action: "prepare", document_id: documentId, confirmation_contenu: confirme })}>Préparer le contrat sans envoi</Button>
      <p className="text-sm text-muted-foreground">{MESSAGE_TROISIEME_DOCUMENT}</p>
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent>
  </Card>;
}
