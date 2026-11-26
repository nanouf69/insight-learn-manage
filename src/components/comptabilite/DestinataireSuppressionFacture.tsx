import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lireDestinataireFacture } from '@/lib/comptabilite/destinataireFacture';
import { destinataireAvisSuppression } from '../../../supabase/functions/_shared/factureSuppressionAvis';

interface Props {
  facture: { id: string; client_email?: string | null; apprenant_id?: string | null; type_financement: string };
  onEdit: () => void;
}

/** Read-only discovery: a dossier email is not yet a frozen invoice recipient. */
export function DestinataireSuppressionFacture({ facture, onEdit }: Props) {
  const enregistre = destinataireAvisSuppression(facture);
  const [lecture, setLecture] = useState<{ loading: boolean; email: string | null; erreur: boolean }>({ loading: true, email: null, erreur: false });
  useEffect(() => {
    if (enregistre) return;
    const id = facture.apprenant_id;
    if (!id) { setLecture({ loading: false, email: null, erreur: false }); return; }
    let actif = true;
    const controller = new AbortController();
    setLecture({ loading: true, email: null, erreur: false });
    const timer = window.setTimeout(() => {
      controller.abort();
      if (actif) setLecture({ loading: false, email: null, erreur: true });
    }, 10000);
    void lireDestinataireFacture(
      async () => {
        const { data, error } = await supabase.from('financeurs_fc').select('type_financeur,email_facturation,contact_email').eq('apprenant_id', id).abortSignal(controller.signal).maybeSingle();
        if (error) throw error;
        return data;
      },
      async () => {
        const { data, error } = await supabase.from('apprenants').select('email,facture_contact_email,societe_nom,organisme_financeur').eq('id', id).abortSignal(controller.signal).single();
        if (error) throw error;
        return data;
      },
      facture.type_financement,
    ).then(email => {
      if (actif && !controller.signal.aborted) setLecture({ loading: false, email: destinataireAvisSuppression({ client_email: email }), erreur: false });
    }).catch(() => {
      if (actif && !controller.signal.aborted) setLecture({ loading: false, email: null, erreur: true });
    }).finally(() => window.clearTimeout(timer));
    return () => { actif = false; controller.abort(); window.clearTimeout(timer); };
  }, [facture.id, facture.apprenant_id, facture.type_financement, enregistre]);

  if (enregistre) return <p className="text-sm break-all">Destinataire : <strong>{enregistre}</strong></p>;
  if (lecture.loading) return <p role="status" className="text-sm text-muted-foreground">Vérification du mail du financeur ou de l’apprenant…</p>;
  return <div className="space-y-2">
    {lecture.email ? <>
      <p className="text-sm break-all">Mail du dossier : <strong>{lecture.email}</strong></p>
      <p className="text-sm text-muted-foreground">Ce mail existe, mais n’a pas encore été enregistré comme destinataire sur cette facture.</p>
    </> : <p role="alert" className="text-sm text-destructive">{lecture.erreur ? 'Le mail du dossier n’a pas pu être vérifié. Aucun changement effectué.' : 'Aucun mail de facturation valide n’a été trouvé pour ce dossier.'}</p>}
    <Button type="button" variant="outline" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Vérifier le destinataire de la facture</Button>
  </div>;
}