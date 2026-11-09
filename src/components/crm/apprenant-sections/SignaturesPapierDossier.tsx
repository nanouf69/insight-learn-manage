import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import { SignaturesPapierFC } from '@/components/sessions/SignaturesPapierFC';

export function SignaturesPapierDossier({ apprenant }: { apprenant: any }) {
  const [open, setOpen] = useState(false);
  const inscriptions = useQuery({
    queryKey: ['fc-papier-inscriptions-dossier', apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('session_apprenants')
        .select('id, session_id, liste_attente, emargements_exclus, sessions:session_id(nom)')
        .eq('apprenant_id', apprenant.id);
      if (error) throw error;
      return (data ?? []).filter(row => !row.liste_attente && !row.emargements_exclus && /continue|\bfc\b|fco/i.test(row.sessions?.nom ?? ''));
    },
    retry: false,
  });
  if (!inscriptions.isError && !inscriptions.data?.length) return null;
  return <section className="space-y-4 border-y py-4">
    <Button variant="outline" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <PenLine className="mr-2 h-4 w-4" />Saisir les heures de présence — signatures papier
    </Button>
    {inscriptions.isError && <p role="alert" className="text-destructive">Sessions indisponibles : saisie désactivée.</p>}
    {open && inscriptions.data?.map(row => <div key={row.id} className="space-y-3">
      <h3 className="font-semibold">{row.sessions?.nom}</h3>
      <SignaturesPapierFC sessionId={row.session_id} inscriptions={[{ ...row, apprenant }]} initialInscriptionId={row.id} />
    </div>)}
  </section>;
}