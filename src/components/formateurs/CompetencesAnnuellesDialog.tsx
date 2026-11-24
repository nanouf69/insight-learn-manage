import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COMPETENCES_MODELE } from '@/lib/competencesIntervenant';
import { echeanceCompetences } from '../../../supabase/functions/_shared/competencesAnnuel';

type Doc = { id: string; identite_figee: unknown; modele_code: string | null; cle_envoi: string | null; reponses: unknown; signed_at: string | null; sent_at: string | null; statut: string | null; texte_fige: string | null };
function objet(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const date = (value: string | null) => value ? new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : '—';

export function CompetencesAnnuellesDialog({ onClose }: { onClose: () => void }) {
  const query = useQuery({ queryKey: ['competences-annuelles-apercu'], queryFn: async () => {
    const formateurs = [];
    const documents: Doc[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('formateurs').select('id,nom,prenom,email,type').order('id').range(offset, offset + 499);
      if (error) throw error;
      formateurs.push(...data);
      if (data.length < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('documents_a_signer')
        .select('id,identite_figee,modele_code,cle_envoi,reponses,signed_at,sent_at,statut,texte_fige')
        .in('modele_code', [COMPETENCES_MODELE, 'validation_competences_responsable']).order('id').range(offset, offset + 499);
      if (error) throw error;
      documents.push(...data);
      if (data.length < 500) break;
    }
    return { formateurs, documents };
  } });
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader className="pr-6"><DialogTitle>Actualisation annuelle des compétences</DialogTitle></DialogHeader>
      <Badge variant="secondary" className="w-fit">Automatisation désactivée — préparation</Badge>
      {query.isLoading && <p>Chargement…</p>}
      {query.isError && <p role="alert" className="text-destructive">Lecture impossible — aucune échéance ni validation présumée.</p>}
      {query.data?.formateurs.map(f => {
        const docs = query.data.documents.filter(d => d.modele_code === COMPETENCES_MODELE && objet(d.identite_figee).formateur_id === f.id);
        const reviews = query.data.documents.filter(d => d.modele_code === 'validation_competences_responsable' && docs.some(source => source.id === d.cle_envoi && source.signed_at && objet(source.reponses).declaration_acceptee === true));
        // Only a separate actual responsible decision counts; submission is never validation.
        const valide = reviews.filter(d => d.signed_at && objet(d.reponses).decision === 'valide' && objet(d.reponses).confirme === true && objet(d.reponses).responsable_id && objet(d.reponses).methode && objet(d.reponses).motif)
          .sort((a, b) => Date.parse(b.signed_at ?? '') - Date.parse(a.signed_at ?? ''))[0];
        const echeance = valide?.signed_at ? echeanceCompetences(valide.signed_at) : null;
        return <section key={f.id} className="border-b border-border py-3 space-y-2">
          <h3 className="font-semibold">{f.prenom} {f.nom}</h3>
          <p className="text-sm break-all">{f.email ?? 'Adresse manquante'} · {f.type ?? 'Statut contractuel non renseigné'}</p>
          <p className="text-sm">Dernière validation responsable : {date(valide?.signed_at ?? null)}<br />
            Échéance annuelle : {echeance ? date(echeance) : 'Première demande si actif et jamais validé'}</p>
          <Badge variant="outline">Activité à confirmer avant activation</Badge>
          {docs.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>}
          {docs.map(d => <div key={d.id} className="text-sm">
            <p>Demande : {d.statut === 'signe' ? 'Déclaration remise — examen responsable distinct' : 'Préparée'} · Envoi : {d.sent_at ? date(d.sent_at) : 'Non enregistré'} · Réponse : {date(d.signed_at)}</p>
            <p className="text-muted-foreground">Décisions du responsable : {reviews.filter(r => r.cle_envoi === d.id).length}</p>
          </div>)}
        </section>;
      })}
      <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Actualiser le suivi</Button>
    </DialogContent>
  </Dialog>;
}