# Date théorique et preuve de signature pratique

## Changements visibles
- Ajouter une colonne « Examen théorique » dans les tableaux VTC et TAXI de « Candidats à former ».
- Permettre le choix de la date par candidat dans le champ existant `date_examen_theorique`, avec confirmation après enregistrement et relecture.
- Ne classer « Pratique déjà effectuée » que si la présence pratique est accompagnée d’une signature d’émargement valide à la date de la session pratique.
- Laisser les candidats sans signature dans « à former », sans supprimer leur présence, leurs réservations, leurs dates ni leurs preuves.

## Vérifications
- Tester les cas : présence sans signature, signature absente/masquée/vide, signature valide à la bonne date et signature à une autre date.
- Tester la sauvegarde confirmée d’une date théorique et le refus sans modifier l’affichage.
- Contrôler l’aperçu PC/mobile, les compteurs et l’absence d’erreur.

## Technique
- Réutiliser le contrôle partagé `aPreuveSignatureEmargement`.
- Faire une lecture paginée des émargements des seuls candidats concernés et rapprocher les dates des sessions pratiques.
- Aucun changement de schéma, aucune migration, aucun envoi et aucune publication.
