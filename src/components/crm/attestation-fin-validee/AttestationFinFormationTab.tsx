import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Eye, Loader2, Lock, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LIBELLES_FILTRE, correspondFiltre, type FiltreAttestation } from "@/lib/attestationFinValidee/filtres";
import { champsManquants, texteAttestation, type TexteFigeAttestation } from "@/lib/attestationFinValidee/modele";
import { genererPdfAttestation, ouvrirBlob, telechargerBlob } from "@/lib/attestationFinValidee/pdf";
import { appelAttestation, chargerAttestations, lienSignature, statutAffiche, type AttestationEnregistree } from "@/lib/attestationFinValidee/serveur";
import { chargerElementAdmin } from "@/lib/documentAdminElements";
import { useApercuAttestation } from "./useApercuAttestation";
import { debutFormation, dureeFormation } from "../../../../supabase/functions/_shared/attestationFinCore";

const h = (n: number) => { const t = Math.round(n * 60); return `${Math.floor(t / 60)}h${String(t % 60).padStart(2, "0")}`; };
const dfr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const fige = (d: AttestationEnregistree): TexteFigeAttestation | null => { try { return JSON.parse(d.texte_fige || "null"); } catch { return null; } };

export function AttestationFinFormationTab({ apprenant }: { apprenant: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<FiltreAttestation>("a_envoyer");
  const [representant, setRepresentant] = useState("");
  const [autorise, setAutorise] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [aEnvoyer, setAEnvoyer] = useState<AttestationEnregistree | null>(null);
  const docs = useQuery({ queryKey: ["attestations-fin", apprenant.id], queryFn: () => chargerAttestations(apprenant.id), staleTime: 0 });
  const ap = useApercuAttestation(apprenant);
  const liste = useMemo(() => (docs.data ?? []).filter(d => correspondFiltre(statutAffiche(d).cle, filtre)), [docs.data, filtre]);
  const actif = (docs.data ?? []).find(d => d.statut !== "revoque");
  const compte = (f: FiltreAttestation) => (docs.data ?? []).filter(d => correspondFiltre(statutAffiche(d).cle, f)).length;
  const rafraichir = () => { qc.invalidateQueries({ queryKey: ["attestations-fin", apprenant.id] }); ap.q.refetch(); };

  const champs = {
    representant: representant || null, nom: apprenant.nom ?? null, prenom: apprenant.prenom ?? null,
    formation: apprenant.formation_choisie ?? apprenant.type_apprenant ?? null, modalite: ap.elearning ? "e-learning" : "présentiel",
    dateDebut: debutFormation(apprenant, ap.elearning), dateFin: ap.fin.etat === "ok" ? ap.fin.date : null,
    dureeHeures: dureeFormation(apprenant, ap.elearning),
    dateEmission: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }),
  };
  const manquants = champsManquants(champs).filter(m => m !== "représentant du centre");

  const apercuBrouillon = () => {
    const nom = `${apprenant.prenom ?? ""} ${String(apprenant.nom ?? "").toUpperCase()}`.trim();
    const lignes = ap.pret && !manquants.length
      ? texteAttestation({ ...champs, representant: representant.trim() || "(représentant à saisir)" })!
      : ["PROJET D'ATTESTATION DE FIN DE FORMATION",
         `Apprenant(e) : ${nom || "—"}`, `Formation : ${champs.formation ?? "—"} — modalité ${champs.modalite}`,
         `Début de formation : ${champs.dateDebut ? champs.dateDebut.slice(0, 10).split("-").reverse().join("/") : "—"}`,
         `Date de fin (dernière connexion e-learning) : ${ap.fin.etat === "ok" ? ap.fin.date.split("-").reverse().join("/") : ap.fin.raison}`,
         `Durée prévue : ${champs.dureeHeures != null ? `${champs.dureeHeures} heures` : "—"}`];
    const infos: string[] = [];
    if (ap.heures && ap.heures.faites != null && ap.heures.minimum != null) infos.push(`Heures e-learning prouvées : ${h(ap.heures.faites)} / ${h(ap.heures.minimum)}`);
    if (ap.signatures && ap.signatures.signees != null) infos.push(`Signatures de présence : ${ap.signatures.signees} / ${ap.signatures.attendues ?? "—"}`);
    if (manquants.length) infos.push(`Champs du dossier à compléter : ${manquants.join(", ")}`);
    ouvrirBlob(genererPdfAttestation({ mode: "brouillon", lignes, modules: [], motifs: ap.motifs, infos, signatureCentre: null, signatureApprenant: null }));
  };

  const pdfOfficiel = async (d: AttestationEnregistree, telecharger: boolean) => {
    const f = fige(d);
    if (!f) { toast({ title: "Attestation illisible", description: "Le contenu enregistré ne peut pas être lu.", variant: "destructive" }); return; }
    setOccupe(d.id);
    try {
      const image = await chargerElementAdmin("signature"); // échec de lecture = pas de PDF (aucune signature substituée)
      const signe = d.statut === "signe";
      const blob = genererPdfAttestation({
        mode: "officiel", lignes: f.lignes, modules: [], reference: d.identite_figee?.reference, empreinte: d.texte_empreinte,
        infos: [`Date de fin = dernière connexion e-learning du ${dfr(f.sources.date_fin.started_at)} (réf. ${f.sources.date_fin.connexion_id.slice(0, 8)})`,
          ...(f.sources.heures ? [`Heures e-learning prouvées : ${h(f.sources.heures.faites)} / ${h(f.sources.heures.minimum)}`] : []),
          ...(signe ? [] : ["En attente de la signature de l'apprenant(e)"])],
        signatureCentre: { representant: f.signature_centre.representant, le: f.signature_centre.autorise_le, image },
        signatureApprenant: signe ? { nom: `${d.identite_figee?.prenom ?? ""} ${d.identite_figee?.nom ?? ""}`.trim(), image: d.reponses?.signature ?? null, le: d.signe_le_paris } : null,
      });
      if (telecharger) telechargerBlob(blob, `Attestation_fin_formation_${d.identite_figee?.nom ?? ""}_${d.identite_figee?.reference ?? ""}.pdf`);
      else ouvrirBlob(blob);
    } catch (e: any) {
      toast({ title: "PDF impossible", description: e?.message ?? "Lecture de la signature du centre impossible", variant: "destructive" });
    } finally { setOccupe(null); }
  };

  const enregistrer = async () => {
    setOccupe("preparer");
    try {
      const r = await appelAttestation({ action: "preparer", apprenantId: apprenant.id, representant, autoriseSignatureCentre: autorise, heures: ap.heures, signaturesPresentiel: ap.signatures });
      if (r?.etat === "prepare" || r?.etat === "existant") { toast({ title: r.etat === "prepare" ? "Attestation enregistrée" : "Une attestation existe déjà", description: "Elle figure dans « À envoyer »." }); setFiltre("a_envoyer"); }
      else toast({ title: "Enregistrement refusé", description: (r?.raisons ?? ["Contrôle serveur négatif"]).join(" — "), variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Service momentanément indisponible", description: e?.message ?? "Réessayez dans un instant.", variant: "destructive" });
    } finally { setOccupe(null); rafraichir(); }
  };

  const envoyer = async (d: AttestationEnregistree) => {
    setOccupe(d.id);
    try {
      const r = await appelAttestation({ action: "envoyer", docId: d.id });
      const msg: Record<string, string> = { envoye: "Lien de signature envoyé à l'apprenant(e).", deja_envoye: "Cette attestation a déjà été envoyée." };
      if (msg[r?.etat]) toast({ title: "Envoi", description: msg[r.etat] });
      else toast({ title: r?.etat === "indetermine" ? "Envoi incertain" : "Envoi non effectué", description: r?.raison ?? "Aucun mail n'a été confirmé.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Service momentanément indisponible", description: e?.message ?? "Réessayez dans un instant.", variant: "destructive" });
    } finally { setOccupe(null); rafraichir(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Statut des attestations" className="flex flex-wrap gap-2">
          {(Object.keys(LIBELLES_FILTRE) as FiltreAttestation[]).map(f => (
            <Button key={f} role="tab" aria-selected={filtre === f} variant={filtre === f ? "default" : "outline"} className="min-h-11" onClick={() => setFiltre(f)}>
              {LIBELLES_FILTRE[f]} ({docs.data ? compte(f) : "…"})
            </Button>
          ))}
        </div>
        <Button variant="ghost" className="min-h-11" onClick={rafraichir}><RefreshCw className="h-4 w-4 mr-1" />Actualiser</Button>
      </div>

      {docs.isLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Chargement des attestations…</p>}
      {docs.isError && <p className="text-sm text-destructive">Lecture des attestations impossible. <Button variant="link" className="p-0 h-auto" onClick={() => docs.refetch()}>Réessayer</Button></p>}
      {docs.data && liste.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {filtre === "a_envoyer" ? "Aucune attestation prête à envoyer." : filtre === "en_attente" ? "Aucune attestation en attente de signature." : filtre === "signee" ? "Aucune attestation signée." : "Aucune attestation enregistrée."}
          {!actif && " Le brouillon ci-dessous montre l'état actuel du parcours."}
        </p>
      )}

      {liste.map(d => {
        const s = statutAffiche(d);
        return (
          <Card key={d.id} className="border-2">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-5 w-5" /><span className="font-semibold">Attestation {d.identite_figee?.reference ?? ""}</span>
                <Badge variant={s.cle === "signee" ? "default" : s.cle === "envoi_incertain" ? "destructive" : "secondary"}>{s.libelle}</Badge>
              </div>
              <p className="text-muted-foreground">Enregistrée le {dfr(d.created_at)} · Envoyée : {dfr(d.envoye_le)} · Signée : {d.signe_le_paris ?? "—"}</p>
              {d.envoi_erreur && <p className="text-destructive">Dernier envoi : {d.envoi_erreur}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="min-h-11" disabled={occupe === d.id} onClick={() => pdfOfficiel(d, false)}><Eye className="h-4 w-4 mr-1" />Prévisualiser</Button>
                {s.libelle === "À envoyer" && <Button className="min-h-11" disabled={occupe === d.id} onClick={() => setAEnvoyer(d)}>{occupe === d.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}Envoyer pour signature</Button>}
                {d.envoye_le && d.statut !== "signe" && <Button variant="outline" className="min-h-11" onClick={() => { navigator.clipboard.writeText(lienSignature(d.token)); toast({ title: "Lien copié" }); }}><Copy className="h-4 w-4 mr-1" />Copier le lien de signature</Button>}
                {d.statut === "signe" && <Button variant="outline" className="min-h-11" disabled={occupe === d.id} onClick={() => pdfOfficiel(d, true)}><Download className="h-4 w-4 mr-1" />Télécharger le PDF signé</Button>}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!actif && docs.data && (
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex flex-wrap items-center gap-2">
              Brouillon — non enregistré
              {ap.q.isLoading ? <Badge variant="outline">Contrôle en cours…</Badge>
                : <Badge variant={ap.pret && !manquants.length ? "default" : "destructive"}>{ap.pret && !manquants.length ? "Prêt à enregistrer" : "Brouillon / À vérifier"}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!ap.q.isLoading && ap.motifs.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-semibold text-destructive flex items-center gap-2"><Lock className="h-4 w-4" />Attestation à vérifier</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">{ap.motifs.map((m, i) => <li key={i}>{m}</li>)}</ul>
                {ap.q.isError && <Button size="sm" variant="outline" className="mt-2 min-h-11" onClick={() => ap.q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Réessayer</Button>}
              </div>
            )}
            {ap.q.data && (
              <p className={ap.fin.etat === "ok" ? "text-muted-foreground" : "text-destructive font-medium"}>
                Date de fin : {ap.fin.etat === "ok" ? `${ap.fin.date.split("-").reverse().join("/")} — ${ap.fin.source} (connexion du ${dfr(ap.fin.startedAt)})` : ap.fin.raison}
              </p>
            )}
            {ap.heures && ap.heures.faites != null && ap.heures.minimum != null && <p className="text-muted-foreground">Heures e-learning prouvées : {h(ap.heures.faites)} / {h(ap.heures.minimum)}</p>}
            {manquants.length > 0 && <p className="text-destructive">Champs du dossier à compléter : {manquants.join(", ")}</p>}
            <Button variant="outline" className="min-h-11" disabled={!ap.q.data} onClick={apercuBrouillon}><Eye className="h-4 w-4 mr-1" />Prévisualiser le brouillon (PDF)</Button>

            {ap.pret && !manquants.length && (
              <div className="space-y-3 rounded-md border p-3">
                <label className="block space-y-1"><span className="font-medium">Représentant du centre (signataire)</span>
                  <Input value={representant} onChange={e => setRepresentant(e.target.value)} placeholder="Nom et prénom du responsable" maxLength={120} /></label>
                <label className="flex items-start gap-3 min-h-11 cursor-pointer">
                  <Checkbox checked={autorise} onCheckedChange={v => setAutorise(v === true)} className="mt-1" />
                  <span>J'autorise l'apposition de la signature du centre déjà enregistrée dans Documents sur cette attestation.</span>
                </label>
                <Button className="min-h-11" disabled={representant.trim().length < 3 || !autorise || occupe === "preparer"} onClick={enregistrer}>
                  {occupe === "preparer" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Enregistrer l'attestation
                </Button>
                <p className="text-xs text-muted-foreground">Le serveur recontrôle les heures et la date de fin avant d'enregistrer (les modules ne sont pas contrôlés). Aucun mail n'est envoyé à cette étape.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!aEnvoyer} onOpenChange={o => !o && setAEnvoyer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer l'attestation pour signature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un e-mail contenant le lien de signature sera envoyé à {aEnvoyer?.identite_figee?.email}. L'apprenant(e) signera elle-même ; aucune signature n'est apposée à sa place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Annuler</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => { const d = aEnvoyer; setAEnvoyer(null); if (d) envoyer(d); }}>Envoyer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
