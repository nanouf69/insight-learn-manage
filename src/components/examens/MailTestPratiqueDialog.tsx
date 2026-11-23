import { useState } from 'react';
import { FlaskConical, Send } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { mailTestPratique, confirmerMailTest } from '@/lib/mailTestPratique';

export function MailTestPratiqueDialog({ type }: { type: 'vtc' | 'taxi' }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const example = mailTestPratique(type, 'test@example.com');
  const send = async () => {
    if (sending) return;
    setStatus('');
    setSending(true);
    try {
      const payload = mailTestPratique(type, to);
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', { body: payload });
      if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
      confirmerMailTest(data);
      setStatus('Mail test envoyé à ' + payload.to);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Envoi non confirmé.');
    } finally {
      setSending(false);
    }
  };
  return <Dialog open={open} onOpenChange={value => { if (!sending) { setOpen(value); setStatus(''); } }}>
    <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5 text-xs"><FlaskConical className="h-3 w-3" />Mail test</Button></DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Mail test — Dates pratique {type.toUpperCase()}</DialogTitle>
        <DialogDescription>Un seul destinataire, aucun envoi aux candidats. Le lien de réservation est désactivé.</DialogDescription>
      </DialogHeader>
      <Label htmlFor={`mail-test-${type}`}>Adresse destinataire du test</Label>
      <Input id={`mail-test-${type}`} type="email" value={to} disabled={sending} onChange={event => setTo(event.target.value)} placeholder="Votre adresse e-mail" />
      <p className="text-sm font-semibold">{example.subject}</p>
      <div className="border rounded-md p-4 text-sm bg-background text-foreground" dangerouslySetInnerHTML={{ __html: example.body }} />
      {status && <p role="status" className="text-sm">{status}</p>}
      <DialogFooter><Button variant="outline" disabled={sending} onClick={() => setOpen(false)}>Fermer</Button>
        <Button disabled={sending || !to.trim()} onClick={send}><Send className="h-4 w-4 mr-2" />{sending ? 'Envoi…' : 'Envoyer le test'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}