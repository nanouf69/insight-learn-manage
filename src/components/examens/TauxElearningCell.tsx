import { useState } from 'react';
import { Mail } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useApprenantTauxRealisation } from '@/hooks/useApprenantTauxRealisation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { estCandidatElearning, mailRelanceElearning, texteMailVersHtml, type CandidatElearning } from '@/lib/examenElearningRelance';

export function TauxElearningCell({ candidat }: { candidat: CandidatElearning }) {
  const elearning = estCandidatElearning(candidat);
  const { data: taux, isLoading, isError } = useApprenantTauxRealisation(elearning ? candidat.id : undefined, candidat);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [mail, setMail] = useState(() => mailRelanceElearning(candidat.prenom));
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidat.email ?? '');

  if (!elearning) return <span className="text-muted-foreground">—</span>;

  const send = async () => {
    if (sending || !emailValide || !mail.subject.trim() || !mail.body.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: { action: 'send', userEmail: 'contact@ftransport.fr', to: candidat.email, apprenantId: candidat.id,
          subject: mail.subject.trim(), body: texteMailVersHtml(mail.body), attachments: [] },
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

  return <div className="min-w-0 space-y-1">
    {isLoading ? <span className="text-muted-foreground">Chargement…</span> : isError || !taux ?
      <span className="text-muted-foreground">Indisponible</span> : taux.reqElearning <= 0 ?
      <span className="text-muted-foreground">Heures non renseignées</span> : <>
        <strong>{taux.pctElearning}%</strong>
        <Progress value={taux.pctElearning} aria-label="Taux e-learning" className="h-1.5" />
        <div className="text-muted-foreground">{taux.doneElearning.toFixed(1)}h / {taux.reqElearning}h</div>
      </>}
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!emailValide}
      aria-label="Préparer le mail de relance e-learning"
      title={emailValide ? 'Préparer le mail de relance e-learning' : 'Adresse e-mail absente ou invalide'}
      onClick={() => { setMail(mailRelanceElearning(candidat.prenom)); setOpen(true); }}><Mail className="h-3.5 w-3.5" /></Button>
    <Dialog open={open} onOpenChange={value => { if (!sending) setOpen(value); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Relance e-learning</DialogTitle><DialogDescription>Vérifiez et adaptez le message avant de confirmer l’envoi individuel.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Destinataire</Label><p className="break-all text-sm">{candidat.email}</p></div>
          <div><Label htmlFor={`relance-subject-${candidat.id}`}>Objet</Label><Input id={`relance-subject-${candidat.id}`} value={mail.subject} disabled={sending} onChange={e => setMail({ ...mail, subject: e.target.value })} /></div>
          <div><Label htmlFor={`relance-body-${candidat.id}`}>Message</Label><Textarea id={`relance-body-${candidat.id}`} className="min-h-64" value={mail.body} disabled={sending} onChange={e => setMail({ ...mail, body: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={sending || !mail.subject.trim() || !mail.body.trim()} onClick={() => void send()}><Mail className="mr-2 h-4 w-4" />{sending ? 'Envoi en cours…' : 'Confirmer et envoyer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}