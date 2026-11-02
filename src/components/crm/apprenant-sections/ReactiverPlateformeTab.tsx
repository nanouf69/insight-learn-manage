import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateFROrRaw } from '@/lib/safeDateParse';
import { toast } from 'sonner';
interface Proposition { debut: string; fin: string; fin_precedente: string }
interface EnvoiMail { extension_id: string; statut: string; erreur: string | null; created_at: string }

/** Envoie l'e-mail « Prolongation » d'une prolongation déjà enregistrée ; n'ajoute jamais de mois. */
export async function envoyerMailProlongation(extensionId: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('send-prolongation-acces', { body: { extension_id: extensionId } });
  if (error) {
    let message = error.message;
    try { const ctx = (error as { context?: Response }).context; if (ctx) { const b = await ctx.json(); message = b?.error ?? message; } } catch { /* garde le message */ }
    return { ok: false, message };
  }
  return data?.statut === 'envoye' ? { ok: true, message: 'E-mail de prolongation envoyé' } : { ok: false, message: data?.error ?? 'Envoi non confirmé' };
}

export function dernierEnvoi(envois: EnvoiMail[], extensionId: string): EnvoiMail | undefined {
  const liste = envois.filter(e => e.extension_id === extensionId);
  return liste.find(e => e.statut === 'envoye') ?? liste.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function ReactiverPlateformeTab({ apprenantId }: { apprenantId: string }) {
  const [open,setOpen] = useState(false); const [saving,setSaving] = useState(false);
  const [sending,setSending] = useState<string | null>(null);
  const busy = useRef(false);const operation = useRef<string | null>(null);const client = useQueryClient();
  const submitted = useRef<Proposition | null>(null);
  const q = useQuery({ queryKey: ['reactivation-plateforme', apprenantId], retry: false, queryFn: async () => {
    const [{data,error},history,envois] = await Promise.all([
      supabase.rpc('crm_preparer_reactivation', { p_apprenant: apprenantId }),
      supabase.from('crm_acces_extensions').select('*').eq('apprenant_id',apprenantId).order('created_at',{ascending:false}),
      supabase.from('crm_prolongation_emails').select('extension_id,statut,erreur,created_at').eq('apprenant_id',apprenantId).order('created_at',{ascending:false}),
    ]);
    if (error) throw error;if (history.error) throw history.error;
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.fin !== 'string' || typeof data.debut !== 'string' || typeof data.fin_precedente !== 'string') throw new Error('Dates indisponibles');
    return { proposition: data as unknown as Proposition, history: history.data ?? [], envois: (envois.data ?? []) as EnvoiMail[] };
  }});
  const p = q.data?.proposition;
  const envoyer = async (extensionId: string) => {
    if (sending) return; setSending(extensionId);
    try {
      const r = await envoyerMailProlongation(extensionId);
      if (r.ok) toast.success(r.message); else toast.error(`Accès prolongé, mais e-mail non envoyé : ${r.message}`);
    } finally { setSending(null); await q.refetch(); }
  };
  const save = async () => {
    if (busy.current || !p || q.isError) return;busy.current = true;setSaving(true);operation.current ??= crypto.randomUUID();
    submitted.current ??= p;
    const confirmed = submitted.current;
    let extensionId: string | null = null;
    try {
      const {data,error} = await supabase.rpc('crm_reactiver_un_mois',{p_operation:operation.current,p_apprenant:apprenantId,p_fin_precedente:confirmed.fin_precedente,p_fin_confirmee:confirmed.fin});
      if (error) { if (error.code === '40001') { operation.current=null;submitted.current=null;setOpen(false);await q.refetch(); } throw error; }
      const read = await supabase.from('crm_acces_extensions').select('*').eq('operation_id',operation.current).eq('apprenant_id',apprenantId).single();
      if (read.error) throw read.error;if (!data || read.data.fin !== confirmed.fin) throw new Error('Réactivation non confirmée');
      extensionId = read.data.id;
      toast.success(`Accès prolongé jusqu’au ${formatDateFROrRaw(confirmed.fin)}`);setOpen(false);operation.current=null;submitted.current=null;
      await Promise.all([client.invalidateQueries({queryKey:['extension-acces',apprenantId]}),client.invalidateQueries({queryKey:['apprenant-detail',apprenantId]})]);
    } catch(e) { toast.error((e as Error).message || 'Réactivation impossible'); } finally {busy.current=false;setSaving(false);}
    if (extensionId) await envoyer(extensionId); else await q.refetch();
  };
  return <section className="space-y-5"><h2 className="text-xl font-semibold">Réactiver la plateforme</h2>
    <p className="text-sm text-muted-foreground">Même compte et mêmes identifiants : aucun nouveau mot de passe. L’apprenant reçoit l’e-mail « Prolongation de votre accès à la formation ».</p>
    {q.isLoading && <p>Vérification de l’accès…</p>}
    {q.isError && <div className="space-y-3"><p className="text-destructive">{(q.error as Error).message}</p><Button variant="outline" onClick={() => q.refetch()}>Relire l’accès</Button></div>}
    {p && !q.isError && <><dl className="space-y-3"><div><dt className="text-muted-foreground">Fin d’accès actuelle</dt><dd className="font-semibold">{formatDateFROrRaw(p.fin_precedente)}</dd></div><div><dt className="text-muted-foreground">Nouvelle période</dt><dd className="font-semibold">{formatDateFROrRaw(p.debut)} → {formatDateFROrRaw(p.fin)}</dd></div></dl><Button onClick={() => setOpen(true)}><RotateCcw className="h-4 w-4 mr-2" />Réactiver pour un mois</Button></>}
    {!!q.data?.history.length && <div className="space-y-2"><h3 className="font-semibold">Historique des réactivations</h3>{q.data.history.map(r => {
      const e = dernierEnvoi(q.data!.envois, r.id);
      return <div key={r.id} className="text-sm flex flex-wrap items-center gap-2"><span>{formatDateFROrRaw(r.debut)} → {formatDateFROrRaw(r.fin)} · {new Date(r.created_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} · administration ·</span>
        {e?.statut === 'envoye' ? <span className="text-primary font-medium">Prolongation : e-mail envoyé</span>
          : e?.statut === 'en_cours' ? <span>Prolongation : envoi en cours…</span>
          : <><span className="text-destructive font-medium">Prolongation : {e ? `échec (${e.erreur ?? 'erreur inconnue'})` : 'e-mail non envoyé'}</span>
            <Button size="sm" variant="outline" disabled={!!sending} onClick={() => envoyer(r.id)}>{sending === r.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}Renvoyer l’e-mail</Button></>}
      </div>;
    })}</div>}
    <Dialog open={open} onOpenChange={v=>{if(!saving)setOpen(v);}}><DialogContent><DialogHeader><DialogTitle>Confirmer le mois supplémentaire</DialogTitle></DialogHeader><p>Nouvelle fin d’accès : {formatDateFROrRaw(submitted.current?.fin ?? p?.fin)}</p><div className="flex gap-3"><Button variant="outline" disabled={saving} onClick={()=>setOpen(false)}>Annuler</Button><Button disabled={saving || !p || q.isError} onClick={save}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmer la réactivation</Button></div></DialogContent></Dialog>
  </section>;
}
