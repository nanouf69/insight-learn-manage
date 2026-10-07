# Lettre de présentation toujours en position 1

## Résultat
- Afficher la lettre de présentation avant toutes les autres pièces des dossiers TAXI et VTC, pour les deux sociétés.
- Lui attribuer le numéro affiché 1 ; décaler uniquement les numéros affichés des autres pièces, sans changer leurs identifiants enregistrés.
- Conserver le même ordre dans le ZIP et le PDF complet.
- Ne supprimer, remplacer ou modifier aucun document ni aucune donnée enregistrée.

## Fichiers concernés
- `src/components/renouvellements/DossiersAgrement.tsx` : affichage et ordre des téléchargements.
- `src/lib/agrementOrdre.ts` : reconnaissance et classement non destructif de la lettre (préparé, pas encore utilisé par l’écran).
- `src/test/agrement-ordre.test.ts` : contrôles sur données fictives (préparés).
- `AGENTS.md` : règle de conservation des identifiants pour le classement.

## Vérification
Tester les variantes « Lettre presentation » et « Lettre de présentation », la conservation des autres pièces et leur ordre, puis vérifier l’écran sans écriture ni envoi.

## Détails techniques
Le classement sera réalisé en lecture seule dans l’affichage et les exports ; aucune mise à jour de l’ordre enregistré en base.