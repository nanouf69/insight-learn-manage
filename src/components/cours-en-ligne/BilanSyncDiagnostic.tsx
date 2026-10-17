import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { freshSessionCall } from '@/lib/sessionRpc';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

export function BilanSyncDiagnostic() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inspect = async () => {
    setBusy(true);
    try {
      let total = 0, waiting = 0, linked = 0, fingerprints = 0;
      for (let from = 0; ; from += 250) {
        const { data, error } = await freshSessionCall(() => supabase.from('bilan_sync_liens').select('id, statut, empreinte_vtc_ref, empreinte_taxi_ref').order('id').range(from, from + 249));
        if (error || !data) throw new Error('Lecture indisponible ; aucune synchronisation effectuée.');
        for (const row of data) { total++; if (row.statut === 'en_attente') waiting++; if (row.statut === 'liee') linked++; if (row.empreinte_vtc_ref && row.empreinte_taxi_ref) fingerprints++; }
        if (data.length < 250) break;
      }
      setMessage(`${total} correspondances : ${waiting} en attente, ${linked} liées, ${fingerprints} avec deux empreintes. Ce contrôle ne modifie aucune question et n’active aucun lien.`);
    } catch { setMessage('Diagnostic indisponible. Réessayez après reconnexion ; aucun lien ni question modifié.'); }
    finally { setBusy(false); }
  };
  return <div className="text-sm"><Button variant="outline" size="sm" onClick={inspect} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Diagnostic des correspondances</Button>{message && <p role="status" className="mt-2 text-muted-foreground">{message}</p>}</div>;
}