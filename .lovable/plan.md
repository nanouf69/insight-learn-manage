# Heures de M. Majsak depuis le 6 octobre

## Périmètre
- Compter les heures e-learning de M. Majsak à partir du **6 octobre 2026 inclus, minuit heure de Paris**.
- Afficher le même total et le même taux sur son compte élève, sa fiche administrateur et les rapports concernés.
- Une connexion traversant minuit ne compte que pour sa partie depuis cette date, selon les preuves d'activité existantes.
- L'historique reste consultable depuis le 5 octobre comme demandé précédemment ; les activités antérieures sont conservées mais ne comptent plus dans ce total.
- Ne changer ni les autres élèves, ni les heures requises, ni le présentiel, ni les validations, réponses ou dates d'accès.

## Fichiers concernés
- Calcul partagé : `src/hooks/useApprenantTauxRealisation.ts` et une règle dédiée de début de calcul.
- Rapport : `src/components/cours-en-ligne/ApprenantActivityReport.tsx` et calculs d'export concernés après vérification.
- Tests fictifs, `AGENTS.md`, feuille de route et journal daté.

## Contrôles
- Contrôles en lecture seule avant/après : les connexions et preuves anciennes restent intactes.
- Tests fictifs : avant/après minuit Paris, connexion chevauchante, cohérence des compteurs et autres parcours inchangés.
- Aucun test sur un vrai élève, aucune écriture de données élève, aucun envoi, aucune publication.
