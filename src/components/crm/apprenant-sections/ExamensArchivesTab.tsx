import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArchivedExamReset, exactCancellationContext, readArchivedExamResets, readResetCancellationContext } from '@/lib/examResetCancellation';

function ResetArchive({ row, nom }: { row: ArchivedExamReset; nom: string }) {
  const [open, setOpen] = useState(false);
  const context = useQuery({ queryKey: ['exam-reset-cancel-context', row.apprenant_id, row.reset_id],
    queryFn: () => readResetCancellationContext(row), retry: false });
  const safe = context.data && exactCancellationContext(row, context.data) && context.data.eligible;
  const date = new Date(row.cutoff_at).toLocaleString('fr-FR', { timeZone: 'UTC' });
  return <section className="border-b py-4 space-y-3" aria-label={`${row.exam_id} archivé`}>
    <h3 className="font-semibold">{row.exam_id} · {date} UTC</h3>
    <p className="text-sm">{row.archived_attempt_ids.length} copies archivées · {row.archived_core_result_ids.length} résultats conservés</p>
    <p className="text-xs text-muted-foreground break-all">Remise à zéro : {row.reset_id}</p>
    {context.isLoading ? <p role="status">Vérification…</p> : context.isError
      ? <p role="alert" className="text-sm text-muted-foreground">Annulation préparée, non installée : contrôle serveur indisponible. Aucun résultat restauré.</p>
      : <p role="status" className="text-sm">{context.data?.reason}</p>}
    <Button variant="outline" className="h-auto whitespace-normal" disabled={!safe} onClick={() => setOpen(true)}>Annuler la remise à zéro</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Annuler la remise à zéro — {nom}</DialogTitle>
        <DialogDescription>{row.exam_id} · {date} UTC · {row.reset_id}</DialogDescription></DialogHeader>
      <p>Les copies et notes existantes avant cette remise à zéro seraient réaffichées. Aucun sujet, réponse ou résultat ne serait réécrit. Les autres examens restent inchangés.</p>
      <p role="alert" className="text-sm text-muted-foreground">Préparation uniquement : enregistrement désactivé tant que tous les contrôles de démarrage et les affichages ne sont pas validés ensemble.</p>
      <Button disabled className="h-auto whitespace-normal">Confirmer l’annulation — non activé</Button>
      <Button variant="outline" onClick={() => setOpen(false)}>Fermer sans enregistrer</Button>
    </DialogContent></Dialog>
  </section>;
}
export default function ExamensArchivesTab({ account, nom }: { account: string; nom: string }) {
  const role = useQuery({ queryKey: ['exam-reset-cancel-admin'], retry: false, staleTime: 0, queryFn: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return false;
    const result = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
    return !result.error && result.data === true;
  }});
  const archives = useQuery({ queryKey: ['exam-reset-archives', account], enabled: role.data === true,
    queryFn: () => readArchivedExamResets(account), retry: false });
  if (role.isLoading) return <p role="status" className="py-4 text-sm text-muted-foreground">Vérification du profil administrateur…</p>;
  if (role.data !== true) return <p className="py-4 text-sm text-muted-foreground">Consultation réservée à un administrateur authentifié.</p>;
  return <div className="min-w-0" aria-label="Examens archivés">
    {archives.isLoading && <p role="status">Lecture des examens archivés…</p>}
    {archives.isError && <p role="alert">Lecture indisponible : aucune annulation possible.</p>}
    {archives.data?.length === 0 && <p className="py-4 text-sm">Aucun examen archivé.</p>}
    {archives.data?.map(row => <ResetArchive key={row.reset_id} row={row} nom={nom} />)}
  </div>;
}