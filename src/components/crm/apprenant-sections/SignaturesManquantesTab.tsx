import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Send, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { chargerSignaturesManquantes, chargerClassificationSignatures, dateDuJourParis, type SignatureManquante } from '@/lib/signaturesManquantes';
import { creneauxRelancables, empreinteCreneauxRelance, preparerRelanceSignatures, resultatRelance, dateSignatureLisible } from '@/lib/relanceSignaturesManquantes';

interface Props { apprenant: { id: string; prenom?: string | null; nom?: string | null; email?: string | null } }
export function SignaturesManquantesTab({ apprenant }: Props) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<SignatureManquante[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [attempted, setAttempted] = useState(false);
  const lock = useRef(false);
  const excluded = `${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`.trim().toLowerCase() === 'ismail amar';
  const query = useQuery({
    queryKey: ['relance-signatures-manquantes', apprenant.id],
    queryFn: async () => {
      const [rows, classification] = await Promise.all([chargerSignaturesManquantes(apprenant.id), chargerClassificationSignatures(apprenant.id)]);
      return { rows, classification };
    },
    enabled: !excluded,
    retry: false,
  });
  const rows = query.data?.rows ?? [];
  const missing = creneauxRelancables(rows, dateDuJourParis());
  const absent = rows.filter(row => row.etat === 'absence_enregistree');
  const mail = preview ? preparerRelanceSignatures(`${apprenant.prenom ?? ''} ${apprenant.nom ?? ''}`, preview) : null;

  const relecture = async () => {
    if (lock.current || !preview) return;
    lock.current = true; setBusy(true); setOutcome('');
    try {
      const fresh = creneauxRelancables(await chargerSignaturesManquantes(apprenant.id), dateDuJourParis());
      if (!fresh.length) { setPreview(null); setOutcome('Aucune signature à relancer après relecture.'); return; }
      if (empreinteCreneauxRelance(fresh) !== empreinteCreneauxRelance(preview)) {
        setPreview(fresh); setConfirmed(false); setOutcome('La liste a changé : vérifiez le nouvel aperçu.'); return;
      }
      setConfirmed(true);
    } catch { setOutcome('Relecture indisponible : aucun mail envoyé.'); }
    finally { setBusy(false); lock.current = false; }
  };

  const send = async () => {
    if (lock.current || !confirmed || !preview || !mail || !apprenant.email || excluded || attempted) return;
    lock.current = true; setBusy(true);
    let invocationStarted = false;
    try {
      const fresh = creneauxRelancables(await chargerSignaturesManquantes(apprenant.id), dateDuJourParis());
      if (empreinteCreneauxRelance(fresh) !== empreinteCreneauxRelance(preview)) {
        setPreview(fresh.length ? fresh : null); setConfirmed(false); setOutcome('Les signatures ont changé : envoi annulé, vérifiez la liste.'); return;
      }
      setAttempted(true);
      invocationStarted = true;
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', { body: {
        action: 'send', apprenantId: apprenant.id, userEmail: 'contact@ftransport.fr', to: apprenant.email,
        subject: mail.subject, body: mail.html,
      } });
      if (error) throw error;
      const result = resultatRelance(data);
      setOutcome(result === 'envoye' ? 'Mail envoyé. La réception dans la boîte du destinataire reste à vérifier.' : result === 'doublon' ? 'Aucun nouvel envoi : une relance identique a déjà été envoyée dans les dernières 24 heures.' : 'Résultat d’envoi indéterminé : vérifiez l’historique Emails avant toute nouvelle relance.');
      setPreview(null); setConfirmed(false);
      void queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
    } catch { setOutcome(invocationStarted ? 'Envoi non confirmé : aucun renvoi automatique. Vérifiez l’historique Emails avant de réessayer.' : 'Lecture indisponible : aucun mail envoyé.'); }
    finally { setBusy(false); lock.current = false; }
  };

  if (excluded) return <p className="text-muted-foreground">Dossier exclu des relances.</p>;
  return <section className="space-y-4" aria-label="Relance des signatures manquantes">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Signatures manquantes</h2>
      <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching || busy}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
    </div>
    {query.isError ? <p role="alert" className="text-destructive">Signatures indisponibles : la relance est désactivée.</p> : query.isPending ? <p className="text-muted-foreground">Chargement des signatures…</p> : <>
      <p className="font-medium">{missing.length} signature(s) manquante(s)</p>
      {missing.length === 0 ? <p className="text-muted-foreground">Aucune signature à relancer.</p> : <ul className="divide-y border-y">{missing.map(row => <li className="py-3" key={`${row.date}|${row.creneau}`}><span className="font-medium">{dateSignatureLisible(row.date)} — {row.creneau}</span><p className="text-sm text-muted-foreground">{row.source}</p></li>)}</ul>}
      {absent.length > 0 && <div><h3 className="font-semibold">Absences enregistrées — hors relance ({absent.length})</h3>{absent.map(row => <p className="text-sm text-muted-foreground" key={`${row.date}|${row.creneau}`}>{dateSignatureLisible(row.date)} — {row.creneau}</p>)}</div>}
      {(query.data?.classification.anomalies.length ?? 0) > 0 && <div><h3 className="font-semibold">Anomalies à vérifier</h3>{query.data?.classification.anomalies.map((row, i) => <p className="text-sm text-muted-foreground" key={i}>{dateSignatureLisible(row.date)} — {row.creneau} — {row.detail}</p>)}</div>}
      <p className="text-sm text-muted-foreground">Destinataire : {apprenant.email || 'Adresse email manquante'} · Expéditeur : contact@ftransport.fr</p>
      <Button disabled={!missing.length || !apprenant.email || query.isFetching || attempted} onClick={() => { setPreview(missing); setConfirmed(false); setOutcome(''); }}><Eye className="mr-2 h-4 w-4" />Aperçu du mail</Button>
    </>}
    {outcome && <p role="status" className="text-sm font-medium">{outcome}</p>}
    <Dialog open={preview !== null} onOpenChange={open => { if (!open && !busy) { setPreview(null); setConfirmed(false); } }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{confirmed ? 'Confirmer la relance individuelle' : 'Aperçu du mail'}</DialogTitle></DialogHeader>
        <p className="text-sm break-words">À : {apprenant.email}<br />De : contact@ftransport.fr</p>
        <p className="font-semibold">{mail?.subject}</p>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed border-y py-4">{mail?.text}</div>
        {outcome && <p role="status" className="text-sm">{outcome}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); }}>Annuler</Button>
          <Button disabled={busy || attempted || !apprenant.email} onClick={() => void (confirmed ? send() : relecture())}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{confirmed ? 'Confirmer et envoyer ce mail' : 'Vérifier avant envoi'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}