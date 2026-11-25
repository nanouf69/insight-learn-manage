import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useCandidatModules } from '@/hooks/useCandidatModules';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { estCandidatElearning, formationPratiqueCandidat, mailRelanceElearning, mailRelancePratique, mailRelancePratiqueHtml, texteMailVersHtml, type CandidatElearning } from '@/lib/examenElearningRelance';

export function TauxElearningCell({ candidat, contexte = 'examen' }: { candidat: CandidatElearning; contexte?: 'examen' | 'pratique' }) {
  const pratique = contexte === 'pratique';
  const formation = formationPratiqueCandidat(candidat);
  const elearning = estCandidatElearning(candidat);
  const suivreProgression = pratique || elearning;
  const { data: progression, isLoading, isError, isFetching } = useCandidatModules(suivreProgression ? candidat.id : undefined);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const nouveauMail = () => pratique ? mailRelancePratique(candidat.prenom, formation) : mailRelanceElearning(candidat.prenom);
  const [mail, setMail] = useState(nouveauMail);
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidat.email ?? '');
  const disponible = !isLoading && !isFetching && !isError && progression?.etat === 'ok';
  const restantsARelancer = progression?.etat === 'ok' ? progression.restants.filter(module => !pratique || !module.pratique) : [];
  const relancePertinente = disponible && progression.total > 0 && restantsARelancer.length > 0;
  const pourcentage = progression?.etat === 'ok' && progression.total > 0 ? Math.round(progression.termines / progression.total * 100) : null;
  useEffect(() => { setOpen(false); setMail(nouveauMail()); }, [candidat.id, candidat.prenom, user?.id, contexte, formation]);

  if (!suivreProgression) return <span className="text-muted-foreground">—</span>;

  const htmlPratique = pratique && progression?.etat === 'ok' ? mailRelancePratiqueHtml({
    texte: mail.body,
    formation,
    termines: progression.termines,
    total: progression.total,
    restants: restantsARelancer.length,
  }) : '';

  const send = async () => {
    if (sending || !relancePertinente || !emailValide || !mail.subject.trim() || !mail.body.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: { action: 'send', userEmail: 'contact@ftransport.fr', to: candidat.email, apprenantId: candidat.id,
          subject: mail.subject.trim(), body: pratique ? htmlPratique : texteMailVersHtml(mail.body), attachments: [] },
      });
      if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
      if (data?.error || data?.success !== true) throw new Error(data?.error || "L'envoi n'a pas été confirmé");
      if (data.skipped) {
        toast.info('Aucun nouvel envoi : une relance identique a déjà été envoyée dans les dernières 24 heures');
        setOpen(false);
        return;
      }
      toast.success('Mail envoyé');
      void queryClient.invalidateQueries({ queryKey: ['emails', candidat.id] });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi");
    } finally { setSending(false); }
  };

  const boutonRelance = pratique ? `Préparer la relance modules avant pratique ${formation}` : 'Préparer le mail de relance e-learning';
  return <div className="min-w-[150px] space-y-1.5">
    {isLoading || isFetching ? <span className="text-muted-foreground">Chargement…</span> : !disponible ?
      <span className="text-muted-foreground">Modules indisponibles</span> : <>
        <div className="flex items-baseline justify-between gap-2">
          <strong className="block whitespace-normal">{progression.termines} / {progression.total} modules terminés</strong>
          {pourcentage !== null && <span className="shrink-0 text-sm font-extrabold text-primary">{pourcentage} %</span>}
        </div>
        {progression.total > 0 && <Progress value={progression.termines / progression.total * 100} aria-label="Progression des modules" className="h-2" />}
        <div className="whitespace-normal text-xs text-muted-foreground">{progression.total === 0 ? 'Aucun module attribué' : restantsARelancer.length === 0 ? pratique ? 'Tous les modules en ligne sont terminés' : 'Tous les modules sont terminés' : `${restantsARelancer.length} ${pratique ? 'à réaliser' : 'à terminer'}`}</div>
      </>}
    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5 p-0 text-primary hover:bg-primary/10" disabled={!emailValide || !relancePertinente}
      aria-label={boutonRelance}
      title={!emailValide ? 'Adresse e-mail absente ou invalide' : !disponible ? 'Modules indisponibles' : !relancePertinente ? 'Aucun module à relancer' : boutonRelance}
      onClick={() => { setMail(nouveauMail()); setOpen(true); }}><Mail className="h-4 w-4" /></Button>
    <Dialog open={open} onOpenChange={value => { if (!sending) setOpen(value); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{pratique ? `Relance avant l’entraînement pratique ${formation}` : 'Modules à terminer'}</DialogTitle><DialogDescription>Vérifiez et adaptez le message avant de confirmer l’envoi individuel.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {pratique && progression?.etat === 'ok' && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-primary">FTRANSPORT · Formation pratique {formation}</div>
            <div className="mt-2 text-lg font-bold">{progression.termines} / {progression.total} modules terminés</div>
            <div className="mt-1 text-sm font-medium text-muted-foreground">{restantsARelancer.length} module{restantsARelancer.length > 1 ? 's' : ''} en ligne à réaliser</div>
            <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm font-semibold text-destructive">Sans modules terminés, l’apprenant ne pourra pas participer à l’entraînement pratique.</div>
          </div>}
          <div><Label>Destinataire</Label><p className="break-all text-sm">{candidat.email}</p></div>
          <div><Label htmlFor={`relance-subject-${contexte}-${candidat.id}`}>Objet</Label><Input id={`relance-subject-${contexte}-${candidat.id}`} value={mail.subject} disabled={sending} onChange={e => setMail({ ...mail, subject: e.target.value })} /></div>
          <div><Label htmlFor={`relance-body-${contexte}-${candidat.id}`}>Message</Label><Textarea id={`relance-body-${contexte}-${candidat.id}`} className="min-h-52" value={mail.body} disabled={sending} onChange={e => setMail({ ...mail, body: e.target.value })} /></div>
          {pratique && <div className="space-y-2"><Label>Aperçu mis en forme du mail</Label><div className="max-h-96 overflow-y-auto rounded-xl border bg-muted/20 p-2" dangerouslySetInnerHTML={{ __html: htmlPratique }} /></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={sending || !relancePertinente || !mail.subject.trim() || !mail.body.trim()} onClick={() => void send()}><Mail className="mr-2 h-4 w-4" />{sending ? 'Envoi en cours…' : 'Confirmer et envoyer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
