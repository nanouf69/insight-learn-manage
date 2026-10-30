import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateFROrRaw } from '@/lib/safeDateParse';
import { toast } from 'sonner';
interface Proposition { debut: string; fin: string; fin_precedente: string }
export function ReactiverPlateformeTab({ apprenantId }: { apprenantId: string }) {
  const [open,setOpen] = useState(false); const [saving,setSaving] = useState(false);
  const busy = useRef(false);const operation = useRef<string | null>(null);const client = useQueryClient();
  const q = useQuery({ queryKey: ['reactivation-plateforme', apprenantId], retry: false, queryFn: async () => {
    const [{data,error},history] = await Promise.all([supabase.rpc('crm_preparer_reactivation', { p_apprenant: apprenantId }),supabase.from('crm_acces_extensions').select('*').eq('apprenant_id',apprenantId).order('created_at',{ascending:false})]);
    if (error) throw error;if (history.error) throw history.error;
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.fin !== 'string' || typeof data.debut !== 'string' || typeof data.fin_precedente !== 'string') throw new Error('Dates indisponibles');
    return { proposition: data as unknown as Proposition, history: history.data ?? [] };
  }});
  const p = q.data?.proposition;
  const save = async () => {
    if (busy.current || !p || q.isError) return;busy.current = true;setSaving(true);operation.current ??= crypto.randomUUID();
    try {
      const {data,error} = await supabase.rpc('crm_reactiver_un_mois',{p_operation:operation.current,p_apprenant:apprenantId,p_fin_precedente:p.fin_precedente,p_fin_confirmee:p.fin});
      if (error) throw error;
      const read = await supabase.from('crm_acces_extensions').select('*').eq('operation_id',operation.current).eq('apprenant_id',apprenantId).single();
      if (read.error) throw read.error;if (!data || read.data.fin !== p.fin) throw new Error('Réactivation non confirmée');
      toast.success(`Accès prolongé jusqu’au ${formatDateFROrRaw(p.fin)}`);setOpen(false);operation.current=null;
      await Promise.all([q.refetch(),client.invalidateQueries({queryKey:['extension-acces',apprenantId]}),client.invalidateQueries({queryKey:['apprenant-detail',apprenantId]})]);
    } catch(e) { toast.error((e as Error).message || 'Réactivation impossible'); } finally {busy.current=false;setSaving(false);}
  };
  return <section className="space-y-5"><h2 className="text-xl font-semibold">Réactiver la plateforme</h2>
    {q.isLoading && <p>Vérification de l’accès…</p>}
    {q.isError && <div className="space-y-3"><p className="text-destructive">{(q.error as Error).message}</p><Button variant="outline" onClick={() => q.refetch()}>Relire l’accès</Button></div>}
    {p && !q.isError && <><dl className="space-y-3"><div><dt className="text-muted-foreground">Fin d’accès actuelle</dt><dd className="font-semibold">{formatDateFROrRaw(p.fin_precedente)}</dd></div><div><dt className="text-muted-foreground">Nouvelle période</dt><dd className="font-semibold">{formatDateFROrRaw(p.debut)} → {formatDateFROrRaw(p.fin)}</dd></div></dl><Button onClick={() => setOpen(true)}><RotateCcw className="h-4 w-4 mr-2" />Réactiver pour un mois</Button></>}
    {!!q.data?.history.length && <div className="space-y-2"><h3 className="font-semibold">Historique des réactivations</h3>{q.data.history.map(r => <p key={r.id} className="text-sm">{formatDateFROrRaw(r.debut)} → {formatDateFROrRaw(r.fin)} · {new Date(r.created_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} · administration</p>)}</div>}
    <Dialog open={open} onOpenChange={v=>{if(!saving)setOpen(v);}}><DialogContent><DialogHeader><DialogTitle>Confirmer le mois supplémentaire</DialogTitle></DialogHeader><p>Nouvelle fin d’accès : {formatDateFROrRaw(p?.fin)}</p><div className="flex gap-3"><Button variant="outline" disabled={saving} onClick={()=>setOpen(false)}>Annuler</Button><Button disabled={saving || !p || q.isError} onClick={save}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmer la réactivation</Button></div></DialogContent></Dialog>
  </section>;
}