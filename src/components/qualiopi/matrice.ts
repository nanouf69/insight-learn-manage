export interface LigneMatrice {
  id?: string;
  ref_key: string;
  matiere: string;
  competence_officielle: string;
  contenu_cours: string;
  reference_diapos: string;
  evaluation_quiz: string;
  couverture: string;
  observations: string;
  referentiel_url: string;
}
export const COUVERTURES: Record<string, string> = { verifiee: 'Vérifiée', a_verifier: 'À vérifier', manquante: 'Manquante' };
export function filtrerMatrice(rows: LigneMatrice[], matiere: string, couverture: string, recherche: string) {
  const q = recherche.trim().toLocaleLowerCase('fr');
  return rows.filter(r => (matiere === 'all' || r.matiere === matiere) && (couverture === 'all' || r.couverture === couverture) && (!q || [r.matiere, r.competence_officielle, r.contenu_cours, r.reference_diapos, r.evaluation_quiz, r.observations].join(' ').toLocaleLowerCase('fr').includes(q)));
}
export function cellulesMatrice(r: LigneMatrice) {
  return [r.matiere, r.competence_officielle, r.contenu_cours || 'À référencer', r.reference_diapos || 'À référencer', r.evaluation_quiz || 'À référencer', COUVERTURES[r.couverture] ?? r.couverture, r.observations, r.referentiel_url];
}
export const ENTETES_MATRICE = ['Matière', 'Compétence / thème du modèle', 'Contenu du cours', 'Diapositives', 'Évaluation / quiz', 'Couverture', 'Observations', 'Référentiel'];
export function matriceCsv(rows: LigneMatrice[]) {
  const quote = (s: string) => `"${(/^[=+@-]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  return '\uFEFF' + [ENTETES_MATRICE, ...rows.map(cellulesMatrice)].map(r => r.map(quote).join(';')).join('\r\n');
}