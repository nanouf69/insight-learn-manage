import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { CONSENTEMENTS_INTERVENANT, MESSAGE_TROISIEME_DOCUMENT, libelleStatutDocument, statutDocumentIntervenant, texteContratFige, type TypeDocumentIntervenant } from "@/lib/parcoursIntervenant";
import { appelIntervenantSignature } from "@/lib/parcoursIntervenantClient";
import type { CompetencesDocument } from "./CompetencesIntervenantForm";

interface SignatureVue { signed_at: string; signe_le_paris: string; pdf_empreinte: string }
interface DocumentVue {
  type: TypeDocumentIntervenant;
  document_id: string | null;
  titre: string;
  texte_fige: any;
  statut_source: string;
  signed_at_source: string | null;
  empreinte: string | null;
  signature: SignatureVue | null;
  preparation_requise?: boolean;
}
interface ParcoursVue { documents: DocumentVue[]; troisieme_document: { message: string }; aucun_envoi: boolean }

function apercuLocal(declaration: CompetencesDocument): ParcoursVue {
  return {
    documents: [
      { type: "competences", document_id: null, titre: "Bilan et justification des compétences", texte_fige: {}, statut_source: declaration.statut, signed_at_source: null, empreinte: null, signature: null, preparation_requise: true },
      { type: "contrat", document_id: null, titre: texteContratFige().titre, texte_fige: texteContratFige(), statut_source: "apercu", signed_at_source: null, empreinte: null, signature: null, preparation_requise: true },
    ],
    troisieme_document: { message: MESSAGE_TROISIEME_DOCUMENT }, aucun_envoi: true,
  };
}

function CarteSignature({ token, doc, serviceActif, onChange }: { token: string; doc: DocumentVue; serviceActif: boolean; onChange: () => Promise<void> }) {
  const [signature, setSignature] = useState("");
  const [consentement, setConsentement] = useState(false);
  const [collaboration, setCollaboration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<string | null>(null);
  const statut = statutDocumentIntervenant({ statut: doc.statut_source, signed_at: doc.signed_at_source, signature: doc.signature });
  const declarationPrete = doc.type !== "competences" || (doc.statut_source === "signe" && !!doc.signed_at_source);
  const peutSigner = serviceActif && !!doc.document_id && !!doc.empreinte && declarationPrete && !doc.signature;
  const telecharger = async () => {
    if (!doc.document_id) return;
    setBusy(true); setError("");
    try {
      const result = await appelIntervenantSignature(token, { action: "pdf", document_id: doc.document_id });
      if (!result.ok || !result.json.url) throw new Error(result.json.error ?? "PDF indisponible");
      const a = document.createElement("a"); a.href = result.json.url; a.download = `${doc.type}-albert-akono-signe.pdf`; a.rel = "noreferrer"; a.click();
    } catch (e) { setError(e instanceof Error ? e.message : "Téléchargement impossible"); }
    finally { setBusy(false); }
  };
  return <Card>
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3"><CardTitle className="text-lg">{doc.titre}</CardTitle><Badge variant={doc.signature ? "default" : "outline"}>{libelleStatutDocument(statut)}</Badge></div>
      <p className="text-sm text-muted-foreground">Signature et consentement indépendants de tout autre document.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {doc.type === "contrat" && <div className="space-y-4 rounded-md border bg-muted/30 p-4">
        <div className="text-sm space-y-2">
          <p><strong>SERVICES PRO SAS</strong> — SIRET 82346156100016 — 86 route de Genas, 69003 Lyon — Naoufal GUENICHI, Président.</p>
          <p><strong>Albert AKONO (DJIOFACK)</strong>, entrepreneur individuel — SIRET 83881665000017 — 27 rue Joseph Brenier, 38200 Vienne.</p>
        </div>
        {(doc.texte_fige.sections ?? []).map((section: { titre: string; lignes: string[] }) => <section key={section.titre} className="space-y-2"><h3 className="font-semibold">{section.titre}</h3>{section.lignes.map((ligne, i) => <p key={i} className="text-sm leading-6">{ligne}</p>)}</section>)}
      </div>}
      {doc.type === "competences" && <p className="text-sm leading-6">Cette signature porte sur la déclaration et les justificatifs déjà remis. Elle ne vaut ni validation des compétences ni décision Qualiopi. Les réponses d’origine restent inchangées.</p>}
      {doc.signature ? <div className="space-y-3 rounded-md border p-4">
        <p className="font-medium text-success">Signature enregistrée {doc.signature.signe_le_paris}</p>
        <p className="break-all text-xs text-muted-foreground">Empreinte du PDF : {doc.signature.pdf_empreinte}</p>
        <Button variant="outline" disabled={busy} onClick={telecharger}>Télécharger le PDF signé</Button>
      </div> : <>
        {doc.preparation_requise && <p className="text-sm text-warning">Aperçu seulement : enregistrement activé après validation du contenu par SERVICES PRO.</p>}
        {!declarationPrete && <p className="text-sm text-muted-foreground">Remettez d’abord la déclaration de compétences ; sa signature manuscrite sera ensuite proposée.</p>}
        <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-1 flex-none" checked={consentement} disabled={!peutSigner || busy} onCheckedChange={v => setConsentement(v === true)} /><span>{CONSENTEMENTS_INTERVENANT[doc.type]}</span></label>
        {doc.type === "contrat" && <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-1 flex-none" checked={collaboration} disabled={!peutSigner || busy} onCheckedChange={v => setCollaboration(v === true)} /><span>Je confirme expressément que la collaboration a débuté courant 2021. Si ce n’est pas exact, je ne signe pas et je demande une correction.</span></label>}
        <SignaturePad value={signature} onChange={setSignature} disabled={!peutSigner || busy} />
        <Button disabled={!peutSigner || busy || !consentement || !signature || (doc.type === "contrat" && !collaboration)} onClick={async () => {
          if (!doc.document_id || !doc.empreinte || !signature) return;
          setBusy(true); setError(""); operation.current ??= crypto.randomUUID();
          try {
            const result = await appelIntervenantSignature(token, { action: "sign", document_id: doc.document_id, operation_id: operation.current, empreinte_vue: doc.empreinte, signature, consentement, collaboration_2021: doc.type === "contrat" ? collaboration : undefined });
            if (!result.ok || !result.json.ok) throw new Error(result.json.error ?? "Signature non confirmée");
            await onChange(); operation.current = null;
          } catch (e) { setError(e instanceof Error ? `${e.message} Réessayez sans changer de page ni de contenu.` : "Signature non confirmée"); }
          finally { setBusy(false); }
        }}>{busy ? "Enregistrement sécurisé…" : `Signer ce ${doc.type === "contrat" ? "contrat" : "document"}`}</Button>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}

export function ParcoursSignatureIntervenant({ token, declaration }: { token: string; declaration: CompetencesDocument }) {
  const [parcours, setParcours] = useState<ParcoursVue>(() => apercuLocal(declaration));
  const [serviceActif, setServiceActif] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [error, setError] = useState("");
  const charger = async () => {
    setError("");
    try {
      const result = await appelIntervenantSignature(token, { action: "get" });
      if (!result.ok || !result.json.documents) {
        setParcours(apercuLocal(declaration)); setServiceActif(false);
        return;
      }
      setParcours(result.json as ParcoursVue); setServiceActif(true);
    } catch {
      setParcours(apercuLocal(declaration)); setServiceActif(false);
    } finally { setChargement(false); }
  };
  useEffect(() => { setChargement(true); void charger(); }, [token, declaration.statut]);
  return <section className="mx-auto max-w-3xl space-y-5 px-6 pb-10" aria-label="Signatures des documents intervenant">
    <div><h2 className="text-xl font-bold">Documents à relire et signer séparément</h2><p className="text-sm text-muted-foreground">Aucun email n’est envoyé depuis cette page. Aucun document ne modifie vos réponses enregistrées.</p></div>
    {!serviceActif && !chargement && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Aperçu de préparation : le service sécurisé n’est pas encore activé, donc les signatures sont désactivées.</p>}
    {error && <p role="alert" className="text-sm text-muted-foreground">{error}</p>}
    {parcours.documents.map(doc => <CarteSignature key={`${doc.type}-${doc.document_id ?? "apercu"}`} token={token} doc={doc} serviceActif={serviceActif} onChange={charger} />)}
    <Card><CardContent className="p-4 text-sm text-muted-foreground">{parcours.troisieme_document.message}</CardContent></Card>
  </section>;
}
