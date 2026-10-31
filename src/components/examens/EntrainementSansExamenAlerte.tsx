import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { anomaliesEntrainementExamen, type ReservationLite } from "@/lib/entrainementSansExamen";

/** Affichage seul : élèves inscrits à un entraînement pratique sans examen pratique au planning CRM (ou examen avant l'entraînement). */
export function EntrainementSansExamenAlerte({ reservations, debut = "planning", fin = "planning" }: { reservations?: ReservationLite[]; debut?: string; fin?: string }) {
  // Entraînements récents (60 j) et à venir, quelle que soit la période affichée.
  const depuis = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const { data: reservationsPlanning, isError: erreurReservations } = useQuery({
    queryKey: ['entrainement-reservations-alerte', depuis],
    enabled: reservations === undefined,
    queryFn: async () => {
      const rows: ReservationLite[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await supabase.from('reservations_pratique')
          .select('apprenant_id,date_choisie').gte('date_choisie', depuis)
          .order('id').range(offset, offset + 499);
        if (result.error) throw result.error;
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 500) return rows;
      }
    },
  });
  const visibles = (reservations ?? reservationsPlanning ?? []).filter((r) => r.date_choisie && r.date_choisie >= depuis && !!debut && !!fin);
  const ids = [...new Set(visibles.map((r) => r.apprenant_id))];
  const { data, isError: erreurExamen } = useQuery({
    queryKey: ["entrainement-sans-examen", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [apps, cma] = await Promise.all([
        supabase.from("apprenants").select("id, prenom, nom, date_examen_pratique").in("id", ids),
        supabase.from("cma_planning_lignes").select("apprenant_id, date_examen").in("apprenant_id", ids),
      ]);
      if (apps.error) throw apps.error;
      if (cma.error) throw cma.error;
      return anomaliesEntrainementExamen(visibles, apps.data ?? [], cma.data ?? []);
    },
  });
  if (erreurReservations || erreurExamen) return <p role="alert" className="text-destructive font-semibold">Impossible de vérifier les inscrits à l’entraînement sans examen pratique.</p>;
  if (!data?.length) return null;
  return (
    <div className="rounded-md border border-destructive bg-destructive/5 p-3 mb-3">
      <p className="text-sm font-bold text-destructive mb-1">
        Inscrits à l'entraînement pratique sans examen pratique au planning ({data.length})
      </p>
      <ul className="text-sm text-destructive font-semibold space-y-0.5">
        {data.map((a) => (
          <li key={a.id}>
            {a.prenom} {a.nom.toUpperCase()} — entraînement le {a.dateEntrainement.split("-").reverse().join("/")}
            {a.dateExamen ? ` · examen le ${a.dateExamen.split("-").reverse().join("/")} (avant l'entraînement)` : " · aucun examen pratique"}
          </li>
        ))}
      </ul>
    </div>
  );
}
