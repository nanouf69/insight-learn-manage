/**
 * Fenêtre d'accès aux cours — source unique (écran élève + convocation).
 * Reprend STRICTEMENT la règle existante de l'espace élève :
 *  - présentiel / formation continue / inscrit à une session présentielle :
 *    fenêtre session (inscription) OU fiche élève date_debut_formation → date_fin_formation ;
 *  - toujours : fenêtre e-learning date_debut_cours_en_ligne (repli date_debut_formation) → date_fin_cours_en_ligne ;
 *  - formation continue : fin prolongée de 6 mois ;
 *  - jamais de J-1 ; comparaison à midi (fuseau neutralisé).
 * Date manquante => aucune ouverture automatique (statut « manquant »).
 * Aucune écriture : ne modifie ni dates ni droits.
 */
export interface FenetreSessionAcces { date_debut?: string | null; date_fin?: string | null }
export interface ApprenantAcces {
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
  date_debut_cours_en_ligne?: string | null;
  date_fin_cours_en_ligne?: string | null;
}
export type StatutAcces = "avant" | "pendant" | "apres" | "manquant";
export interface ResultatAcces { statut: StatutAcces; debut: Date | null; fin: Date | null; autorise: boolean }

const jour = (v: unknown): Date | null => {
  if (typeof v !== "string" || v.length < 10) return null;
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
};

export function calculerAccesCours(p: {
  apprenant: ApprenantAcces;
  isFC: boolean;
  isPresentiel: boolean;
  fenetreSession?: FenetreSessionAcces | null;
  maintenant?: Date;
}): ResultatAcces {
  const a = p.apprenant;
  const now = new Date(p.maintenant ?? new Date());
  now.setHours(12, 0, 0, 0);
  const presOuFC = p.isPresentiel || p.isFC || !!p.fenetreSession;
  const brutes = [
    ...(presOuFC ? [{
      start: p.fenetreSession?.date_debut || a.date_debut_formation || a.date_debut_cours_en_ligne,
      end: p.fenetreSession?.date_fin || a.date_fin_formation || a.date_debut_formation || a.date_debut_cours_en_ligne,
    }] : []),
    { start: a.date_debut_cours_en_ligne || a.date_debut_formation, end: a.date_fin_cours_en_ligne },
  ];
  const fenetres = brutes
    .map((w) => {
      const s = jour(w.start); const e = jour(w.end);
      if (!s || !e) return null;
      const fin = p.isFC ? new Date(new Date(e).setMonth(e.getMonth() + 6)) : e;
      return { start: s, end: fin };
    })
    .filter((w): w is { start: Date; end: Date } => !!w);
  if (fenetres.length === 0) return { statut: "manquant", debut: null, fin: null, autorise: false };
  const autorise = fenetres.some((w) => now >= w.start && now <= w.end);
  const debut = fenetres.reduce((m, w) => (w.start < m ? w.start : m), fenetres[0].start);
  const fin = fenetres.reduce((m, w) => (w.end > m ? w.end : m), fenetres[0].end);
  const statut: StatutAcces = autorise ? "pendant" : now < debut ? "avant" : "apres";
  return { statut, debut, fin, autorise };
}
