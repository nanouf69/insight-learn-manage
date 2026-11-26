import { useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Loader2, MessageSquare, Scissors, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { mobileSmsFrancais, reduireEmailSms, SMS_MAX_CARACTERES, texteEmailPourSms } from '@/lib/emailVersSms';

interface Props {
  email: { subject: string; body_html: string | null; body_preview: string | null; has_attachments: boolean };
  telephone: string;
  nom: string;
}

export function EmailVersSmsDialog({ email, telephone, nom }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [shortened, setShortened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [attempted, setAttempted] = useState(false);
  const sending = useRef(false);
  const valid = mobileSmsFrancais(phone) && message.trim().length > 0 && message.trim().length <= SMS_MAX_CARACTERES;

  async function send() {
    const receiver = mobileSmsFrancais(phone);
    if (!receiver || !valid || !confirmed || sending.current || attempted) return;
    sending.current = true;
    setBusy(true);
    setAttempted(true);
    setStatus('');
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-ovh', {
        body: { receivers: [receiver], message: message.trim(), type: 'email_vers_sms' },
      });
      if (error) {
        const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(detail?.error ?? 'Envoi non confirmé : vérifiez le journal SMS avant toute nouvelle tentative.');
      }
      if (!data?.success || data.invalidReceivers?.length || !data.ids?.length) throw new Error(data?.error ?? 'Envoi non confirmé : vérifiez le journal SMS avant toute nouvelle tentative.');
      setStatus('SMS transmis au service SMS. Réception non confirmée.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Envoi non confirmé.');
    } finally {
      setBusy(false);
      sending.current = false;
    }
  }

  return <>
    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
      setPhone(telephone ?? '');
      setMessage(texteEmailPourSms(email.body_html || email.body_preview || '', email.subject));
      setConfirmed(false); setShortened(false); setStatus(''); setAttempted(false); setOpen(true);
    }}><MessageSquare className="h-3 w-3" />Envoyer par SMS</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Envoyer par SMS à {nom}</DialogTitle></DialogHeader>
        <div className="space-y-4 min-w-0">
          <div className="space-y-2"><Label htmlFor="email-sms-phone">Téléphone du destinataire</Label><Input id="email-sms-phone" type="tel" value={phone} disabled={busy || attempted} onChange={e => { setPhone(e.target.value); setConfirmed(false); }} />
            {phone && !mobileSmsFrancais(phone) && <p className="text-sm text-destructive">Numéro mobile français requis (06 ou 07).</p>}</div>
          <div className="space-y-2"><Label htmlFor="email-sms-message">Texte du SMS</Label><Textarea id="email-sms-message" className="min-h-48" value={message} disabled={busy || attempted} onChange={e => { setMessage(e.target.value); setConfirmed(false); }} />
            <div className="flex flex-wrap items-center justify-between gap-2"><span className={message.trim().length > SMS_MAX_CARACTERES ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{message.trim().length} / {SMS_MAX_CARACTERES} caractères</span>
              <Button variant="outline" size="sm" disabled={busy || attempted || message.length <= SMS_MAX_CARACTERES} onClick={() => { setMessage(reduireEmailSms(message)); setShortened(true); setConfirmed(false); }}><Scissors className="h-4 w-4 mr-2" />Raccourcir</Button></div></div>
          {shortened && <p className="text-sm text-destructive">Texte abrégé : vérifiez les dates, horaires et consignes avant l’envoi. Les liens sont conservés.</p>}
          {email.has_attachments && <p className="text-sm text-muted-foreground">Les pièces jointes du mail ne seront pas envoyées par SMS.</p>}
          <p className="text-sm text-muted-foreground">Expéditeur : FTRANSPORT. Plusieurs SMS peuvent être facturés selon la longueur et les caractères.</p>
          <label className="flex items-start gap-3 text-sm"><Checkbox checked={confirmed} disabled={busy || attempted} onCheckedChange={v => setConfirmed(v === true)} /><span>J’ai vérifié le numéro et le texte, et je confirme cet envoi payant.</span></label>
          {status && <p role="status" className="text-sm break-words">{status}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Fermer</Button><Button disabled={!valid || !confirmed || busy || attempted} onClick={() => void send()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Envoyer le SMS</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}