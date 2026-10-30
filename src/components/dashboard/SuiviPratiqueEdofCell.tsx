import { useState } from "react";
import { Mail } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCandidatModules } from "@/hooks/useCandidatModules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { texteMailVersHtml } from "@/lib/examenElearningRelance";
import { dateDuJourParis } from "@/lib/signaturesManquantes";
import { OBJET_DERNIERE_RELANCE, dateLimiteRelance, formatPourcentage, mailDerniereRelance, mailDerniereRelanceHtml, pourcentageModules } from "@/lib/suiviPratiqueEdof";
import { SignaturesManquantesTab } from "@/components/crm/apprenant-sections/SignaturesManquantesTab";

type Apprenant = { id: string; prenom?: string | null; nom?: string | null; email?: string | null };

export function SuiviPresentielCell({ bilan, apprenant }: { bilan: { attendues: number; manquantes: number } | null; apprenant: Apprenant }) {
  const [open, setOpen] = useState(false);
  if (!bilan) return <span className="text-muted-foreground">Signatures indisponibles</span>;
  if (bilan.attendues === 0) return <span className="text-muted-foreground">Aucune séance attribuée</span>;
  return <div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className={bilan.manquantes > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
    {bilan.manquantes} signature{bilan.manquantes > 1 ? "s" : ""} manquante{bilan.manquantes > 1 ? "s" : ""} / {bilan.attendues} attendue{bilan.attendues > 1 ? "s" : ""}
  </span>
    {bilan.manquantes > 0 && <Button variant="outline" size="sm" className="h-7" onClick={() => setOpen(true)} title="Préparer le mail des signatures manquantes"><Mail className="mr-1 h-3.5 w-3.5" />Relance signatures</Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Relance signatures — {[apprenant.prenom, apprenant.nom].filter(Boolean).join(' ')}</DialogTitle><DialogDescription>Vérification des séances prévues avant aperçu et confirmation d’envoi.</DialogDescription></DialogHeader>
        {open && <SignaturesManquantesTab apprenant={apprenant} />}
      </DialogContent>
    </Dialog>
  </div>;
}

export function SuiviElearningCell({ apprenant }: { apprenant: Apprenant }) {
  const { data: progression, isLoading, isFetching, isError } = useCandidatModules(apprenant.id);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [jourPreparation, setJourPreparation] = useState("");
  const [mail, setMail] = useState({ subject: "", body: "" });
  const [corpsModele, setCorpsModele] = useState("");
  const dernier = useQuery({
    queryKey: ["derniere-relance-envoyee", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("emails").select("sent_at,created_at").eq("apprenant_id", apprenant.id)
        .eq("subject", OBJET_DERNIERE_RELANCE).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] ? (data[0].sent_at ?? data[0].created_at) as string : null;
    },
  });
  const disponible = !isLoading && !isFetching && !isError && progression?.etat === "ok";
  const pct = disponible ? pourcentageModules(progression.termines, progression.total) : null;
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(apprenant.email ?? "");
  const relancePossible = disponible && pct !== null && progression.restants.length > 0 && emailValide && !dernier.isPending && !dernier.isError;

  const ouvrir = () => {
    if (!relancePossible || pct === null) return;
    setJourPreparation(dateDuJourParis());
    const modele = mailDerniereRelance(apprenant.prenom, apprenant.nom, pct, dateLimiteRelance());
    setCorpsModele(modele.body);
    setMail(modele);
    setOpen(true);
  };
  /** HTML réellement envoyé : modèle intact = version avec sanctions en rouge ; texte modifié = équivalent texte brut sans couleur. */
  const htmlEnvoi = () => (mail.body === corpsModele && pct !== null
    ? mailDerniereRelanceHtml(apprenant.prenom, apprenant.nom, pct, dateLimiteRelance())
    : texteMailVersHtml(mail.body));
  const envoyer = async () => {
    if (sending || !relancePossible || !mail.subject.trim() || !mail.body.trim()) return;
    if (dateDuJourParis() !== jourPreparation) { toast.error("La date limite a changé : rouvrez l'aperçu avant d'envoyer."); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-outlook-emails", {
        body: { action: "send", userEmail: "contact@ftransport.fr", to: apprenant.email, apprenantId: apprenant.id,
          subject: mail.subject.trim(), body: htmlEnvoi(), attachments: [] },
      });
      if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
      if (data?.error || data?.success !== true) throw new Error(data?.error || "L'envoi n'a pas été confirmé");
      if (data.skipped) toast.info("Aucun nouvel envoi : ce mail a déjà été envoyé dans les dernières 24 heures");
      else toast.success("Dernière relance envoyée");
      void qc.invalidateQueries({ queryKey: ["derniere-relance-envoyee", apprenant.id] });
      void qc.invalidateQueries({ queryKey: ["emails", apprenant.id] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally { setSending(false); }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
  return <div className="flex flex-wrap items-center gap-2 sm:justify-end">
    {isLoading || isFetching ? <span className="text-muted-foreground">Chargement…</span>
      : !disponible ? <span className="text-muted-foreground">Modules indisponibles</span>
      : pct === null ? <span className="text-muted-foreground">Aucun module attribué</span>
      : <span className={progression.restants.length ? "font-medium text-destructive" : "text-muted-foreground"}>
          {progression.termines}/{progression.total} modules terminés = {formatPourcentage(pct)}
        </span>}
    <Button variant="outline" size="sm" className="h-7" disabled={!relancePossible}
      title={!emailValide ? "Adresse e-mail absente ou invalide" : !disponible ? "Modules indisponibles" : progression?.etat === "ok" && !progression.restants.length ? "Tous les modules sont terminés" : "Préparer la dernière relance"}
      onClick={ouvrir}><Mail className="mr-1 h-3.5 w-3.5" />Dernière relance</Button>
    {dernier.data && <span className="w-full text-xs text-muted-foreground sm:text-right">Déjà envoyée le {fmt(dernier.data)}</span>}
    <Dialog open={open} onOpenChange={v => { if (!sending) setOpen(v); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dernière relance</DialogTitle><DialogDescription>Aucun envoi sans votre confirmation. Vérifiez et adaptez le message.</DialogDescription></DialogHeader>
        {dernier.data && <p role="alert" className="text-sm font-medium text-destructive">Attention : cette relance a déjà été envoyée le {fmt(dernier.data)}.</p>}
        <div className="space-y-4">
          <div><Label>Destinataire</Label><p className="break-all text-sm">{apprenant.email}</p></div>
          <div><Label htmlFor={`dr-sub-${apprenant.id}`}>Objet</Label><Input id={`dr-sub-${apprenant.id}`} value={mail.subject} disabled={sending} onChange={e => setMail({ ...mail, subject: e.target.value })} /></div>
          <div>
            <Label>Aperçu du mail reçu</Label>
            <div className="max-h-64 overflow-y-auto rounded-md border bg-background p-3 text-sm" data-testid={`dr-preview-${apprenant.id}`}
              // Aperçu fidèle : HTML généré localement depuis le modèle vérifié ou le texte édité, jamais de contenu externe.
              dangerouslySetInnerHTML={{ __html: htmlEnvoi() }} />
            {mail.body !== corpsModele && <p className="mt-1 text-xs text-muted-foreground">Texte modifié : le mail sera envoyé sans mise en couleur.</p>}
          </div>
          <div><Label htmlFor={`dr-body-${apprenant.id}`}>Message (texte brut)</Label><Textarea id={`dr-body-${apprenant.id}`} className="min-h-80" value={mail.body} disabled={sending} onChange={e => setMail({ ...mail, body: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={sending || !mail.subject.trim() || !mail.body.trim()} onClick={() => void envoyer()}><Mail className="mr-2 h-4 w-4" />{sending ? "Envoi en cours…" : "Confirmer et envoyer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
