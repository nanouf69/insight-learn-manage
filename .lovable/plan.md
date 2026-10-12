# Afficher les points de pondération par module

## Modification
- Ajouter au détail « Jalons pondérés » une colonne « Points du module », calculée avec les volumes déjà chargés : `4 × pages + questions actives`.
- Afficher `0 (obligatoire)` pour les jalons de fin et administratifs sans poids.
- Ajouter un pied de tableau avec le total exact des points utilisés comme dénominateur des poids.
- Clarifier sous le tableau que ces points servent uniquement à la pondération, qu’ils ne sont ni une note ni un score, et rappeler la formule du poids et de la contribution à la progression globale.

## Vérification et livraison
- Contrôler les calculs sur les quatre filières avec les tests Jalons existants et ajouter seulement l’assertion ciblée nécessaire sur le total des points.
- Vérifier la construction du site et l’absence d’autres changements non autorisés.
- Publier uniquement ce changement d’affichage, puis confirmer l’URL et la version effectivement servie.

## Limites conservées
- Les questions actives restent actualisées automatiquement avec les règles existantes.
- Les pages restent issues de l’audit et les limites de supports restent affichées.
- Aucune donnée, note, progression, question, contenu, règle de validation, heure, email ou SMS n’est modifié.
