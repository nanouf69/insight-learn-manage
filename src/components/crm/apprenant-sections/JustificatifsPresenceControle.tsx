import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { dureeLisible } from '@/lib/presenceCreneauTransport';
import { lireJustificatifsPresence, libelleJustificatif, urlJustificatif } from '@/lib/justificatifsPresence';

export function JustificatifsPresenceControle({ apprenantId }: { apprenantId: string }) {
  const qc = useQueryClient();
  const key = ['controle-justificatifs-presence', apprenantId];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => lireJustificatifsPresence(apprenantId) });
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const relire = () => { clearTimeout(t); t = setTimeout(() => qc.invalidateQueries({ queryKey: key }), 400); };
    const ch = supabase.channel(`controle-justif-${apprenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentiel_presence_creneaux', filter: `apprenant_id=eq.${apprenantId}` }, relire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentiel_validation_decisions', filter: `apprenant_id=eq.${apprenantId}` }, relire)
      .subscribe();
    return () => { clearTimeout(t); void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apprenantId]);
  const ouvrir = async (chemin: string, dl: boolean) => {
    const tab = dl ? null : window.open('', '_blank');
    try {
      const url = await urlJustificatif(chemin, dl);
      if (dl) window.location.assign(url); else if (tab) { tab.opener = null; tab.location.href = url; }
    } catch { tab?.close(); toast.error('Lecture du justificatif refusée ou indisponible.'); }
  };
  const actifs = data?.filter((j) => j.statut === 'active') ?? [];
  const historiques = data?.filter((j) => j.statut === 'annulee') ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Justificatifs de présence
          {data && <Badge variant="secondary">{actifs.length} actif{actifs.length > 1 ? 's' : ''}</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">PDF déposés lors des validations manuelles de présence. Distincts des documents ajoutés au dossier ; aucun fichier copié.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {isError && <p role="alert" className="text-sm text-destructive">Justificatifs de présence illisibles : le nombre n’est pas connu.</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun justificatif de présence enregistré.</p>}
        {[...actifs, ...historiques].map((j) => (
          <div key={j.id} className="border-t border-border pt-2 text-sm space-y-1">
            <p className="font-medium">{j.datePresence.split('-').reverse().join('/')} · {j.debut}–{j.fin} · {dureeLisible(j.minutes)}</p>
            <p>{libelleJustificatif(j)} · Auteur : {j.auteurNom} · Déposé le {new Date(j.creeLe).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
            <div className="flex flex-wrap items-center gap-2">
              {j.statut === 'active' ? <Badge>Validée — preuve active</Badge> : <Badge variant="outline">Annulée — historique, non comptée</Badge>}
              {j.fichier === 'absent'
                ? <Badge variant="destructive">PDF introuvable dans le stockage</Badge>
                : <>
                    <Button size="sm" variant="outline" onClick={() => void ouvrir(j.chemin, false)}>Voir</Button>
                    <Button size="sm" variant="outline" onClick={() => void ouvrir(j.chemin, true)}>Télécharger</Button>
                  </>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
