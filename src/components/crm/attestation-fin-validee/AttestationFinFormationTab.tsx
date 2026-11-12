import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Eye, Loader2, Lock, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LIBELLES_FILTRE, correspondFiltre, type FiltreAttestation } from "@/lib/attestationFinValidee/filtres";
import { champsManquants, type TexteFigeAttestation } from "@/lib/attestationFinValidee/modele";
import { telechargerBlob } from "@/lib/attestationFinValidee/pdf";
import { genererPdfPresentation } from "@/lib/attestationFinValidee/pdfPresentation";
import { ApercuPdfAttestation } from "./ApercuPdfAttestation";
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
  const [autorise, setAutorise] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [aEnvoyer, setAEnvoyer] = useState<AttestationEnregistree | null>(null);
  const [apercuPdf, setApercuPdf] = useState<Blob | null>(null);
  const docs = useQuery({ queryKey: ["attestations-fin", apprenant.id], queryFn: () => chargerAttestations(apprenant.id), staleTime: 0 });
  const ap = useApercuAttestation(apprenant);
  const liste = useMemo(() => (docs.data ?? []).filter(d => correspondFiltre(statutAffiche(d).cle, filtre)), [docs.data, filtre]);
  const actif = (docs.data ?? []).find(d => d.statut !== "revoque");
  const compte = (f: FiltreAttestation) => (docs.data ?? []).filter(d => correspondFiltre(statutAffiche(d).cle, f)).length;
  const rafraichir = () => { qc.invalidateQueries({ queryKey: ["attestations-fin", apprenant.id] }); ap.q.refetch(); };

  const champs = {
    representant: null, nom: apprenant.nom ?? null, prenom: apprenant.prenom ?? null,
    formation: apprenant.formation_choisie ?? apprenant.type_apprenant ?? null, modalite: ap.elearning ? "e-learning" : "présentiel",
    dateDebut: debutFormation(apprenant, ap.elearning), dateFin: ap.fin.etat === "ok" ? ap.fin.date : null,
    dureeHeures: dureeFormation(apprenant, ap.elearning),
    dateEmission: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }),
  };
  const manquants = champsManquants(champs);

  const apercuBrouillon = async () => {
    setOccupe("apercu");
    try {
      const blob = await genererPdfPresentation({
        apprenantId: apprenant.id, prenom: apprenant.prenom ?? "—", nom: apprenant.nom ?? "—",
        formation: champs.formation ?? "Non renseignée", modalite: champs.modalite,
        debut: champs.dateDebut, fin: ap.fin.etat === "ok" ? ap.fin.date : null, dateEmission: champs.dateEmission,
        sourceFin: ap.fin.etat === "ok" ? `${ap.fin.source} du ${dfr(ap.fin.startedAt)} · ${ap.fin.connexionId}${ap.fin.dateLimiteCrm ? ` · fin CRM : ${ap.fin.dateLimiteCrm}` : ""}` : undefined,
        // No server-frozen attestation-wide milestone proof exists in this model.
        // Never turn 98.9%, a module counter, or a client calculation into certification.
        preuve: null, elementsPedagogiques: ap.elementsPedagogiques, motifs: [...ap.motifs, ...manquants.filter(m => m !== "durée"), "Validation complète des jalons non certifiée"],
      });
      setApercuPdf(blob);
    } catch (e) { toast({ title: "PDF impossible", description: e instanceof Error ? e.message : "Export interrompu", variant: "destructive" }); }
    finally { setOccupe(null); }
  };

  // Même règle que le texte : date de dernière connexion (Paris), jamais après la fin de formation CRM.
  const finPlafonnee = (df: { started_at?: string; date_limite_crm?: string } | undefined): string | null => {
    if (!df?.started_at || !Number.isFinite(Date.parse(df.started_at))) return null;
    const d = new Date(df.started_at).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    const lim = df.date_limite_crm?.slice(0, 10);
    return lim && d > lim ? lim : d;
  };

  const pdfOfficiel = async (d: AttestationEnregistree, telecharger: boolean) => {
    const f = fige(d);
    if (!f) { toast({ title: "Attestation illisible", description: "Le contenu enregistré ne peut pas être lu.", variant: "destructive" }); return; }
    setOccupe(d.id);
    try {
      const signe = d.statut === "signe";
      // Signature + tampon du centre lus (échec = pas de PDF) et apposés seulement une fois l'apprenant(e) signé(e).
      const [image, tampon] = signe ? await Promise.all([chargerElementAdmin("signature"), chargerElementAdmin("tampon")]) : [null, null];
      const idf = d.identite_figee ?? {};
      const texteCentral = f.lignes.filter((l: string) => /^(Je soussign|Cette attestation)/.test(l)).join("\n\n");
      const blob = await genererPdfPresentation({
        apprenantId: apprenant.id, prenom: idf.prenom ?? apprenant.prenom ?? "—", nom: idf.nom ?? apprenant.nom ?? "—",
        formation: champs.formation ?? "Non renseignée", modalite: champs.modalite,
        debut: champs.dateDebut, fin: finPlafonnee(f.sources?.date_fin) ?? champs.dateFin, dateEmission: champs.dateEmission,
        preuve: null, motifs: [], reference: idf.reference, empreinte: d.texte_empreinte,
        officiel: {
          texteCentral, signee: signe,
          centre: signe && image && tampon ? { image, tampon, le: f.signature_centre.autorise_le } : null,
          apprenant: signe && d.reponses?.signature ? { image: d.reponses.signature, le: d.signe_le_paris } : null,
        },
      });
      if (telecharger) telechargerBlob(blob, `Attestation_fin_formation_${d.identite_figee?.nom ?? ""}_${d.identite_figee?.reference ?? ""}.pdf`);
      else setApercuPdf(blob); // visionneuse intégrée : window.open après un chargement asynchrone est bloqué
    } catch (e: any) {
      toast({ title: "PDF impossible", description: e?.message ?? "Lecture de la signature du centre impossible", variant: "destructive" });
    } finally { setOccupe(null); }
  };

  const enregistrer = async () => {
    setOccupe("preparer");
    try {
      const r = await appelAttestation({ action: "preparer", apprenantId: apprenant.id, autoriseSignatureCentre: autorise, heures: ap.heures, signaturesPresentiel: ap.signatures });
      if (r?.etat === "prepare" || r?.etat === "existant") {
        setFiltre("a_envoyer");
        // Enregistrement confirmé par le serveur : on propose directement l'envoi (confirmation explicite, aucun envoi implicite).
        if (r.doc && !r.doc.envoye_le && r.doc.statut !== "signe") setAEnvoyer(r.doc);
        else toast({ title: "Une attestation existe déjà", description: "Elle figure dans la liste ci-dessus." });
      }
      else toast({ title: "Enregistrement refusé", description: (r?.raisons ?? ["Contrôle serveur négatif"]).join(" — "), variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Service momentanément indisponible", description: e?.message ?? "Réessayez dans un instant.", variant: "destructive" });
    } finally { setOccupe(null); rafraichir(); }
  };

  const fermerCompte = async (d: AttestationEnregistree) => {
    setOccupe(d.id);
    try {
      const r = await appelAttestation({ action: "fermer_compte", docId: d.id });
      if (r?.etat === "ferme") toast({ title: "Compte fermé", description: "L'accès aux cours est fermé et plus aucun mail ne sera envoyé. Les données sont conservées." });
      else toast({ title: "Fermeture non effectuée", description: r?.raison ?? "À vérifier.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Service momentanément indisponible", description: e?.message ?? "Réessayez dans un instant.", variant: "destructive" });
    } finally { setOccupe(null); }
  };

  const envoyer = async (d: AttestationEnregistree) => {
    setOccupe(d.id);
    try {
      const r = await appelAttestation({ action: "envoyer", docId: d.id });
      const msg: Record<string, string> = { envoye: "Lien de signature envoyé à l'apprenant(e).", deja_envoye: "Cette attestation a déjà été envoyée." };
      if (msg[r?.etat]) toast({ title: "Envoi", description: `${msg[r.etat]} ${r?.fermeture?.etat === "ferme" ? "Accès au compte fermé et mails arrêtés." : `Fermeture du compte non confirmée : ${r?.fermeture?.raison ?? "à vérifier"}.`}`, variant: r?.fermeture?.etat === "ferme" ? "default" : "destructive" });
      else toast({ title: r?.etat === "indetermine" ? "Envoi incertain" : "Envoi non effectué", description: r?.raison ?? "Aucun mail n'a été confirmé.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Service momentanément indisponible", description: e?.message ?? "Réessayez dans un instant.", variant: "destructive" });
    } finally { setOccupe(null); rafraichir(); }
  };

  const renvoyerMail = async (d: AttestationEnregistree) => {
    if (!window.confirm(`Renvoyer le mail de signature à ${d.identite_figee?.email ?? "l'apprenant(e)"} ?`)) return;
    setOccupe(d.id);
    try {
      const r = await appelAttestation({ action: "renvoyer", docId: d.id });
      if (r?.etat === "renvoye") toast({ title: "Mail renvoyé", description: "Le même lien de signature a été renvoyé." });
      else toast({ title: r?.etat === "indetermine" ? "Renvoi incertain" : "Renvoi non effectué", description: r?.raison ?? "Aucun mail confirmé.", variant: "destructive" });
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
                {s.libelle === "À envoyer" && <div className="space-y-1">
                  <Button className="min-h-11" disabled={occupe === d.id} onClick={() => setAEnvoyer(d)}><Send className="h-4 w-4 mr-2" />Envoyer par mail</Button>
                </div>}
                {d.envoye_le && <Button variant="outline" className="min-h-11" disabled={occupe === d.id} onClick={() => fermerCompte(d)}><Lock className="h-4 w-4 mr-1" />Fermer l'accès et arrêter les mails</Button>}
                {d.envoye_le && d.statut !== "signe" && <Button variant="outline" className="min-h-11" onClick={() => { navigator.clipboard.writeText(lienSignature(d.token)); toast({ title: "Lien copié" }); }}><Copy className="h-4 w-4 mr-1" />Copier le lien de signature</Button>}
                {d.envoye_le && d.statut !== "signe" && <Button variant="outline" className="min-h-11" disabled={occupe !== null} onClick={() => void renvoyerMail(d)}><RefreshCw className="h-4 w-4 mr-1" />Renvoyer le mail</Button>}
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
                : <Badge variant="outline">{ap.pret && !manquants.length ? "Prêt à enregistrer" : "Dossier à vérifier"}</Badge>}
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
            <label className="flex items-start gap-3 min-h-11 cursor-pointer rounded-md border p-3">
              <Checkbox checked={autorise} onCheckedChange={v => setAutorise(v === true)} className="mt-1" aria-label="Autoriser la signature du centre" />
              <span>J'autorise l'apposition de la signature du centre déjà enregistrée dans Documents sur cette attestation.</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-11 h-auto whitespace-normal" disabled={!ap.q.data || occupe === "apercu"} onClick={() => void apercuBrouillon()}><Eye className="h-4 w-4 mr-1 shrink-0" />Prévisualiser le brouillon (PDF)</Button>
              <Button className="min-h-11" disabled={!ap.pret || manquants.length > 0 || !autorise || occupe === "preparer"} onClick={enregistrer}>
                {occupe === "preparer" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Envoyer par mail
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {!autorise ? "Cochez l'autorisation de signature du centre pour pouvoir envoyer."
                : "L'attestation est d'abord enregistrée, puis une confirmation vous est demandée avant l'envoi du lien de signature."}
            </p>
          </CardContent>
        </Card>
      )}

      <ApercuPdfAttestation blob={apercuPdf} onClose={() => setApercuPdf(null)} />
      <AlertDialog open={!!aEnvoyer} onOpenChange={o => !o && setAEnvoyer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer l'attestation pour signature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un e-mail contenant le lien de signature sera envoyé à {aEnvoyer?.identite_figee?.email}. L'apprenant(e) signera elle-même ; aucune signature n'est apposée à sa place.
              Après l'envoi, l'accès à son compte cours sera fermé et plus aucun mail ne lui sera envoyé ; ses données et le lien de signature restent disponibles.
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
