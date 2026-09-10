# Aligner définitivement les quiz Admin et Apprenant

## Cause confirmée

Dans `ModuleDetailView`, le contenu apprenant est rendu depuis une référence mise à jour seulement après l’affichage. Lorsqu’une version Admin ou canonique arrive de la base, l’écran apprenant effectue donc son rendu avec la version précédente. La référence est ensuite actualisée sans provoquer de nouvel affichage : les anciennes questions et réponses restent visibles jusqu’à une autre mise à jour.

Ce défaut est général et concerne tous les quiz affichés par ce lecteur, pas uniquement Komi. Les anciennes tentatives et leurs réponses ne sont pas la source des questions d’une nouvelle tentative; elles ne font que restaurer les réponses cochées.

## Correction ciblée

- Mettre la référence du contenu à jour pendant le rendu, avant que l’aperçu apprenant ne lise les questions.
- Conserver le type d’écran stable afin de ne pas décocher les réponses pendant une synchronisation.
- Ne modifier aucune réponse, note, tentative, progression, jalon ou donnée historique.
- Conserver les anciennes tentatives comme historique; une nouvelle tentative utilise le contenu Admin/canonique courant.

## Vérifications

- Ajouter un test de régression reproduisant exactement le décalage d’une version.
- Comparer un quiz de Komi question par question entre la source Admin/canonique, la base et le DOM apprenant.
- Vérifier qu’après actualisation et reconnexion, le contenu reste identique et les réponses cochées persistent.
- Contrôler plusieurs autres apprenants et plusieurs quiz du module 7.
- Vérifier que les anciennes tentatives restent inchangées et que le build reste valide.
