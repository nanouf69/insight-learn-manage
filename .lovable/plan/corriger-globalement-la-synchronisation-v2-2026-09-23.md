# Corriger globalement la synchronisation V2

## Objectif
Récupérer les réponses locales de Kevin et Thierno sans les modifier, puis empêcher toute nouvelle file bloquée sur une ancienne tentative.

## Mise en œuvre
- Séparer clairement les confirmations du moteur V2 des anciennes sauvegardes, afin qu’un refus ancien ne bloque pas une tentative V2 saine.
- Pour chaque matière ouverte, comparer l’union des réponses déjà confirmées et des réponses locales avec les identifiants exacts du snapshot.
- Remapper uniquement les réponses locales provenant d’une tentative fermée vers l’unique tentative ouverte autorisée, sans supprimer la copie locale avant confirmation.
- Relancer automatiquement les envois temporaires et créer une alerte de diagnostic si l’identité n’est pas certaine.
- Afficher par question : vert confirmé serveur, orange local/en cours, rouge refusé, avec le compteur saisi/sauvegardé.
- Remplacer le message « Contactez le centre » par le message de conservation et d’alerte technique demandé.
- Garder la finalisation bloquée jusqu’aux confirmations serveur, sans résultat manuel ni note technique.

## Vérifications
- Contrôler les tentatives réelles de Kevin et Thierno avant et après publication.
- Tester le parcours complet sur un compte TEST avec coupure, reconnexion, reprise, confirmation et résultat unique.
- Ne toucher à aucune réponse, note ou tentative en dehors du chemin normal V2.
