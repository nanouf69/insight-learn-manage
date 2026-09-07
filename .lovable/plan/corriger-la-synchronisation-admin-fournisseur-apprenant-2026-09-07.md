# Corriger la synchronisation Admin / Fournisseur / Apprenant

## Cause confirmée
Le fournisseur recharge bien les données en temps réel, mais les quiz partagés sont reconstruits depuis plusieurs occurrences de `module_editor_state`. Lorsqu’un même exercice existe dans plusieurs modules, le code choisit actuellement tout l’exercice selon le `updated_at` global du module. Une sauvegarde plus récente portant sur un autre contenu peut donc sélectionner une copie ancienne de la question et de sa bonne réponse.

La base confirme que les mêmes questions existent dans plusieurs modules (notamment 10, 24, 40 et 42) avec des dates de module différentes, tandis que la vraie date de référence est `_editedAt` sur chaque question.

## Correction
- Fusionner les occurrences question par question, avec la clé stable `exercise_id + question_id`.
- Choisir la question ayant le `_editedAt` le plus récent; utiliser le `updated_at` du module uniquement en repli pour les anciennes questions sans date.
- Conserver ensemble l’énoncé, tous les choix et la bonne réponse de la version gagnante, sans mélange de versions.
- Comparer ensuite cette version canonique avec l’override fournisseur par `updated_at` selon l’unique règle « dernière modification enregistrée = version officielle ».
- Recharger aussi les overrides fournisseur par Realtime, avec relecture complète après chaque événement afin d’éviter les événements manqués ou incomplets.
- Ne toucher à aucune donnée de score, tentative, progression, validation, jalon ou statut.

## Tests
- Ajouter un test de régression reproduisant deux modules contenant la même question : une sauvegarde globale plus récente mais une question plus ancienne ne doit jamais gagner.
- Tester les deux sens : Admin plus récent → Fournisseur/Admin/Apprenant voient l’Admin; Fournisseur plus récent → les trois voient le Fournisseur.
- Tester explicitement le changement de bonne réponse et la conservation de toutes les questions/réponses existantes.
- Effectuer le contrôle réel demandé sur une question existante : noter sa valeur initiale, modifier la bonne réponse côté Admin, enregistrer, ouvrir la même question côté Fournisseur sans rechargement manuel, vérifier la nouvelle réponse, puis restaurer exactement la valeur initiale et vérifier à nouveau la synchronisation.
