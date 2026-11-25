import { ouvrirOngletPdf, afficherPdfDansOnglet } from "@/lib/ouvrirPdfPrive";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { libelleStatutDocument, statutDocumentIntervenant, texteContratFige, texteSatisfactionFige } from "@/lib/parcoursIntervenant";
import { appelIntervenantSignature } from "@/lib/parcoursIntervenantClient";
import { ContresignatureCentre } from "./ContresignatureCentre";
import { OrdreMissionCpfApercu } from "./OrdreMissionCpfApercu";

export function ParcoursFormateurAdmin({ documentId, token, declarationStatut, declarationSignedAt, destinataireEmail, formateurId }: { formateurId?: string; documentId: string; token: string; declarationStatut: string; declarationSignedAt: string | null; destinataireEmail: string }) {
  const [confirme, setConfirme] = useState(false);
  const [confirmeEnvoi, setConfirmeEnvoi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useQuery({ queryKey: ["parcours-signature-intervenant", documentId], retry: false, queryFn: async () => {
    const result = await supabase.functions.invoke("intervenant-signature", { body: { action: "admin_get", document_id: documentId } });
    if (result.error || !result.data?.documents) return { actif: false, documents: [
      { type: "competences", document_id: documentId, titre: "Bilan et justification des compétences", statut_source: declarationStatut, signed_at_source: declarationSignedAt, signature: null },
      { type: "contrat", document_id: null, titre: texteContratFige().titre, statut_source: "apercu", signed_at_source: null, signature: null, preparation_requise: true },
      { type: "satisfaction", document_id: null, titre: texteSatisfactionFige().titre, reponses: {}, statut_source: "apercu", signed_at_source: null, signature: null, preparation_requise: true },
    ] };
    return { actif: true, ...result.data };
  } });
  const executer = async (body: Record<string, unknown>) => {
    setBusy(true); setMessage("");
    try {
      const result = await supabase.functions.invoke("intervenant-signature", { body });
      if (result.error || !result.data?.ok) throw new Error(result.data?.error ?? "Opération non confirmée");
      setMessage(body.action === "prepare" ? "Contrat et enquête préparés sans aucun envoi." : `Preuve rattachée à l’indicateur ${result.data.indicateur}, sans changement de statut.`);
      setConfirme(false); await query.refetch();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Opération impossible"); }
    finally { setBusy(false); }
  };
  const envoyer = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await appelIntervenantSignature(token, { action: "send_link", confirmation_envoi: true, confirmation_destinataire: destinataireEmail });
      if (!result.ok || !result.json.ok || (!result.json.envoye && !result.json.deja_envoye)) throw new Error(result.json.error ?? "Envoi non confirmé ; ne pas renvoyer automatiquement");
      setMessage(result.json.deja_envoye ? "Envoi déjà confirmé précédemment ; aucun doublon créé." : `Email accepté par le fournisseur. Suivi : ${result.json.accuse_id}.`);
      setConfirmeEnvoi(false); await query.refetch();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Envoi impossible"); }
    finally { setBusy(false); }
  };
  const docs = query.data?.documents ?? [];
  const contrat = docs.find((d: any) => d.type === "contrat");
  const satisfaction = docs.find((d: any) => d.type === "satisfaction");
  const prepares = !!contrat?.document_id && !!satisfaction?.document_id;
  const centre = useQuery({ queryKey: ["contresignature-centre-statut", contrat?.document_id], enabled: !!contrat?.document_id, queryFn: async () => {
    const { data, error } = await supabase.from("intervenant_contresignatures_centre").select("id, signe_le_paris").eq("document_id", contrat!.document_id).maybeSingle();
    if (error) throw error; return data;
  } });
  return <Card className="border-primary/30">
    <CardHeader><CardTitle className="text-base">Parcours unique des trois documents formateur</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {!query.data?.actif && <p className="text-sm text-warning">Aperçu local : le service de signature n’est pas activé. Aucune préparation, signature ou preuve n’est possible.</p>}
      {docs.map((doc: any) => {
        const statut = statutDocumentIntervenant({ statut: doc.statut_source, signed_at: doc.signed_at_source, signature: doc.signature });
        const indicateur = doc.type === "contrat" ? 27 : doc.type === "satisfaction" ? 30 : 21;
        return <div key={doc.type} className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong>{doc.titre}</strong><Badge variant="outline">{doc.type === "contrat" && doc.signature ? (centre.isError ? "Signé par le prestataire — signature du centre illisible" : centre.data ? "Signé par les deux parties" : "Signé par le prestataire — en attente de signature SERVICES PRO") : libelleStatutDocument(statut)}</Badge></div>
          {doc.type === "satisfaction" && doc.statut_source === "signe" && <div className="space-y-2 text-sm">
            {(doc.texte_fige?.notes ?? []).map((q: any) => <p key={q.id}>{q.label} : <strong>{doc.reponses?.[q.id]}/5</strong></p>)}
            {(doc.texte_fige?.textes ?? []).map((q: any) => <p key={q.id} className="whitespace-pre-wrap"><strong>{q.label}</strong><br />{doc.reponses?.[q.id] || "—"}</p>)}
          </div>}
          {doc.signature && <><p className="text-sm">Signé {doc.signature.signe_le_paris}</p><p className="break-all text-xs text-muted-foreground">SHA-256 : {doc.signature.pdf_empreinte}</p>
            <Button size="sm" variant="outline" onClick={async () => {
              const w = ouvrirOngletPdf();
              try {
                const result = await appelIntervenantSignature(token, { action: "pdf", document_id: doc.document_id });
                if (!(result.ok && result.json.url)) throw new Error(result.json.error ?? "PDF indisponible");
                await afficherPdfDansOnglet(w, result.json.url);
              } catch (e) { w?.close(); setMessage(e instanceof Error ? e.message : "PDF indisponible"); }
            }}>Ouvrir le PDF privé</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => executer({ action: "attach_qualiopi", document_competences_id: documentId, document_id: doc.document_id, confirmation_relecture: true })}>J’ai relu — rattacher à I{indicateur}</Button>
          </>}
        </div>;
      })}
      {query.data?.actif && contrat?.signature && <ContresignatureCentre documentCompetencesId={documentId} />}
      {formateurId && <OrdreMissionCpfApercu formateurId={formateurId} contratPrestataireSigne={!!contrat?.signature} contratCentreSigne={!!centre.data} />}
      <div className="space-y-2 rounded-md bg-muted/40 p-3">
        <h3 className="font-semibold">Aperçu du contrat-cadre</h3>
        <p className="text-sm">50 € TTC/heure · missions d’anglais ponctuelles · durée indéterminée · préavis de 30 jours · aucune exclusivité ni heure historique attestée.</p>
        {(texteContratFige().sections ?? []).map(section => <details key={section.titre}><summary className="cursor-pointer text-sm font-medium">{section.titre}</summary>{section.lignes.map((ligne, i) => <p key={i} className="mt-2 text-sm">{ligne}</p>)}</details>)}
      </div>
      <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
        <h3 className="font-semibold">Enquête de satisfaction formateur — I30</h3>
        <p>Cinq appréciations de 1 à 5, points positifs, améliorations et commentaire libre. Réponses obligatoires avant signature ; aucune conformité automatique.</p>
      </div>
      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-1 flex-none" checked={confirme} disabled={!query.data?.actif || prepares || busy} onCheckedChange={v => setConfirme(v === true)} /><span>Je confirme avoir relu et validé le contrat et l’enquête avant leur préparation. Cette action n’envoie aucun email.</span></label>
      <Button variant="outline" disabled={!query.data?.actif || !confirme || prepares || busy} onClick={() => executer({ action: "prepare", document_id: documentId, confirmation_contenu: confirme })}>Préparer les trois documents sans envoi</Button>
      <div className="space-y-3 border-t pt-4">
        <p className="text-sm"><strong>Destinataire unique :</strong> {destinataireEmail}</p>
        <p className="text-sm text-muted-foreground">Le service vérifie le lien de production et la présence des trois documents avant l’envoi. Un résultat inconnu n’est jamais rejoué automatiquement.</p>
        {query.data?.envoye_le && <p className="text-sm text-success">Envoi confirmé le {new Date(query.data.envoye_le).toLocaleString("fr-FR")}.</p>}
        <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-1 flex-none" checked={confirmeEnvoi} disabled={!query.data?.actif || !prepares || !!query.data?.envoye_le || busy} onCheckedChange={v => setConfirmeEnvoi(v === true)} /><span>Je confirme l’envoi du lien unique des trois documents à ce seul destinataire.</span></label>
        <Button disabled={!query.data?.actif || !prepares || !confirmeEnvoi || !!query.data?.envoye_le || busy} onClick={envoyer}>Envoyer le lien unique</Button>
      </div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent>
  </Card>;
}
