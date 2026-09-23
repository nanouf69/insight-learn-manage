# Corriger le faux message après finalisation

## Objectif
- Confirmer en lecture seule que la matière précédente possède un seul résultat valide et que la matière E, non commencée, n'en possède aucun.
- Corriger globalement le cycle des messages de finalisation pour tous les examens blancs.
- À la confirmation serveur, fermer les anciens messages d'échec, afficher brièvement un succès, puis passer à la matière suivante.
- Ne modifier aucune réponse, note, tentative ni résultat existant.

## Vérification
- Ajouter un test ciblé reproduisant « échec affiché, puis finalisation confirmée ».
- Contrôler le build et le comportement de passage à la matière suivante.

## Détail technique
- Donner un identifiant stable aux messages liés à la finalisation afin de remplacer ou fermer exactement le message obsolète.
- Après succès serveur, appeler la fermeture de ce message avant d'afficher le succès temporaire.
- Conserver les vrais échecs actifs tant qu'aucune confirmation serveur n'existe.
