import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lireChoixAdmin } from '@/lib/crmActionsEleve';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ModifierReinscription({ apprenantId, examen }: { apprenantId: string; examen: string | null }) {
  const [open, setOpen] = useState(false);
  const [choix, setChoix] = useState<'oui' | 'non' | null>(null);
  const [saving, setSaving] = useState(false);
  const operation = useRef<string | null>(null);
  const submitted = useRef<{ choix: 'oui' | 'non'; precedent?: string } | null>(null);
  const busy = useRef(false);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['choix-reinscription-admin', apprenantId, examen], queryFn: () => lireChoixAdmin(apprenantId, examen) });
  const latest = query.data?.[0];
  const save = async () => {
    if (busy.current || !choix || !examen || query.isError || query.isLoading) return;
    busy.current = true; setSaving(true);
    operation.current ??= crypto.randomUUID();
    submitted.current ??= { choix, precedent: latest?.id };
    try {
      const { data, error } = await supabase.rpc('crm_enregistrer_reinscription', { p_operation: operation.current, p_apprenant: apprenantId, p_examen: examen, p_choix: submitted.current.choix, p_precedent: submitted.current.precedent });
      if (error) { if (error.code === '40001') { operation.current = null;submitted.current = null;await query.refetch(); } throw error; }
      const rows = await lireChoixAdmin(apprenantId, examen);
      if (!data || !rows.some(r => r.operation_id === operation.current && r.choix === choix)) throw new Error('Enregistrement non confirmé : réessayez sans changer le choix');
      await Promise.all([client.invalidateQueries({ queryKey: ['choix-reinscription-admin', apprenantId] }), client.invalidateQueries({ queryKey: ['reinscription-examen-declaree', apprenantId] })]);
      toast.success('Choix de réinscription enregistré');setOpen(false);operation.current = null;submitted.current = null;
    } catch (e) { toast.error((e as Error).message || 'Enregistrement impossible'); }
    finally { busy.current = false;setSaving(false); }
  };
  return <>
    <Button variant="outline" size="sm" onClick={() => { setOpen(true);setChoix(submitted.current?.choix ?? (latest?.choix === 'oui' ? 'oui' : latest?.choix === 'non' ? 'non' : null)); }}>
      <Pencil className="h-3 w-3 mr-1" />Réinscription examen : {latest ? `${latest.choix === 'oui' ? 'Oui' : 'Non'} (administration)` : 'Modifier'}
    </Button>
    <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}><DialogContent><DialogHeader><DialogTitle>Réinscription à l’examen</DialogTitle></DialogHeader>
      <p className="text-sm">Examen : {examen ?? 'Date non renseignée'}</p>
      {query.isError && <p className="text-destructive">Lecture impossible. <Button variant="outline" onClick={() => query.refetch()}>Relire</Button></p>}
      {(['oui', 'non'] as const).map(v => <label key={v} className="flex items-center gap-3 border border-border p-3 rounded-md"><Checkbox disabled={saving || !!operation.current} checked={choix === v} onCheckedChange={() => setChoix(v)} />{v === 'oui' ? 'Oui' : 'Non'}</label>)}
      <Button disabled={!examen || !choix || saving || query.isError || query.isLoading} onClick={save}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmer le choix</Button>
      <div className="space-y-2"><h3 className="font-semibold">Historique administratif</h3>{query.data?.map(r => <p key={r.id} className="text-sm">{new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} — {r.choix === 'oui' ? 'Oui' : 'Non'} · administration</p>)}</div>
    </DialogContent></Dialog>
  </>;
}