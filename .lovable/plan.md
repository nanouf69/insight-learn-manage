# Empêcher définitivement la réapparition des questions supprimées

## Constat vérifié

- La suppression fournisseur est bien enregistrée dans la source canonique avec `active = false` et une nouvelle date de modification.
- Le défaut est dans l’affichage fournisseur : il filtre d’abord les lignes supprimées, puis, lorsqu’il ne reste aucune question active dans une section, il reprend la liste statique historique de cette section. La question supprimée réapparaît donc au prochain rechargement automatique.
- La synchronisation Admin conserve déjà les suppressions explicites et refuse qu’une ancienne version datée écrase une écriture canonique plus récente.

## Correction ciblée

1. Considérer qu’une section est pilotée par la base dès qu’elle possède au moins une ligne canonique, active ou supprimée.
2. Pour une section pilotée par la base, afficher uniquement les lignes actives ; si elles sont toutes supprimées, afficher une section vide sans revenir au modèle historique.
3. Conserver le repli statique uniquement pour une section qui n’a encore jamais été initialisée dans la source canonique, afin de ne pas modifier les autres modules.
4. Ajouter des tests couvrant : suppression d’une question, suppression de la dernière question, rechargements répétés, modification de réponse et changement de bonne réponse.
5. Vérifier le flux fournisseur puis le chargement Admin/Apprenant, sans aucune écriture dans les scores, progressions, tentatives, validations, statuts ou résultats.

## Limites

- Aucun réensemencement et aucune réinitialisation des questions actuelles.
- Aucun changement des règles de quiz ou des données apprenants.
- Aucune ancienne copie ne sera utilisée pour recréer une question désactivée.
