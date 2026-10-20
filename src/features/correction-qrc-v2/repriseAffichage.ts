export type RepriseAffichage = {
  qrc_instance_id: string;
  statut: string;
  created_at: string;
  termine_at: string | null;
  base: { bareme?: number; modele?: string };
  resultat: { qrc_instance_id?: string; etat?: string; note?: number } | null;
  message: string | null;
};

/** Only a server publication proof supersedes a stale trace, never a reservation. */
export function reprisesProuvees(rows: RepriseAffichage[]) {
  return rows.filter((r) => r.statut === 'appliquee' && r.termine_at != null
    && r.resultat?.etat === 'corrigee'
    && r.resultat.qrc_instance_id === r.qrc_instance_id
    && typeof r.resultat.note === 'number' && Number.isFinite(r.resultat.note));
}