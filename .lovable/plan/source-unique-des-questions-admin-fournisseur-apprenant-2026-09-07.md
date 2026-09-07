# Source unique des questions Admin / Fournisseur / Apprenant

## Constat confirmé

- Les questions sont actuellement dupliquées dans le JSON de `module_editor_state` et dans `quiz_questions_overrides`.
- La base contient 8 361 occurrences de questions pour 4 691 clés numériques, dont 388 clés avec plusieurs contenus différents.
- 991 occurrences n'ont pas de date propre à la question : la date globale du module peut alors choisir une mauvaise ancienne version.
- Les identifiants numériques actuels ne sont uniques qu'à l'intérieur d'un exercice et certaines correspondances Admin/Fournisseur reposent encore sur des tableaux codés dans l'application.
- Les événements en direct fonctionnent, mais ils rafraîchissent deux sources concurrentes ; ils ne peuvent donc pas garantir le même résultat partout.

## Mise en œuvre

1. **Créer la source canonique**
   - Ajouter des tables dédiées aux ensembles de questions, aux questions et aux rattachements des écrans Admin/Fournisseur.
   - Attribuer à chaque question un UUID stable commun (`question_id`) distinct de son ancien numéro d'affichage.
   - Stocker une seule fois l'ordre, l'énoncé, les choix, la bonne réponse, les images/explications, l'état actif et la date de dernière modification.
   - Ajouter les contraintes d'unicité, index, droits et politiques d'accès nécessaires.

2. **Migrer et réconcilier l'existant**
   - Construire les rattachements explicites module/exercice ↔ quiz/section ; aucune correspondance ne sera faite par le texte.
   - Importer toutes les questions existantes depuis les modules et les anciennes modifications fournisseur.
   - Pour chaque identité stable, conserver la version ayant la date de modification de question la plus récente ; utiliser la date de ligne uniquement comme repli historique déterministe.
   - Conserver les anciennes clés numériques comme alias de compatibilité afin que les réponses et résultats apprenants restent rattachés.
   - Produire un audit des conflits, doublons, versions retenues et rattachements impossibles à résoudre automatiquement, sans suppression silencieuse.

3. **Faire écrire Admin et Fournisseur au même endroit**
   - Ajouter des fonctions atomiques pour créer, modifier, déplacer et désactiver une question canonique.
   - Faire passer les sauvegardes Admin et Fournisseur par ces mêmes fonctions avec contrôle de concurrence côté base.
   - Neutraliser les écritures de questions dans `quiz_questions_overrides` et dans les copies JSON ; ces données restent archivées pour traçabilité mais ne sont plus une source active.

4. **Faire lire les trois vues depuis la même source**
   - Charger les mêmes ensembles canoniques dans Admin, Fournisseur et Apprenant.
   - Retirer les fusions par texte, les priorités conditionnelles, les réinjections de réponses statiques et les sélections par date globale de module.
   - Conserver dans `module_editor_state` uniquement la structure de cours/exercice nécessaire, avec le rattachement à l'ensemble canonique.

5. **Synchronisation immédiate**
   - Activer les mises à jour en direct sur les tables canoniques.
   - Après chaque événement, relire l'ensemble canonique complet et invalider les données affichées sur les trois interfaces.
   - Utiliser la date attribuée par la base comme ordre officiel ; la dernière écriture validée gagne, quelle que soit son origine.

6. **Sécurité des données apprenants**
   - Ne modifier aucune ligne de progression, score, tentative, validation, jalon ou résultat.
   - Préserver les anciens identifiants utilisés dans les réponses enregistrées et ajouter uniquement la correspondance vers le nouvel UUID.
   - Ne jamais recalculer rétroactivement un résultat déjà soumis à partir d'une nouvelle bonne réponse.

7. **Vérifications**
   - Ajouter des tests de migration : doublons, conflit Admin/Fournisseur, ajout, modification, bonne réponse, ordre et désactivation.
   - Tester réellement les deux sens Admin → Fournisseur → Apprenant et Fournisseur → Admin → Apprenant sur une question existante.
   - Vérifier qu'une ancienne réponse ne réapparaît après rechargement, reconnexion, changement d'onglet ou événement en direct.
   - Vérifier que les tables de résultats et de progression sont strictement inchangées avant/après migration.

## Règle finale

Une question possède un seul `question_id` UUID et une seule ligne active canonique. Admin, Fournisseur et Apprenant lisent cette même ligne. Toute modification validée met à jour cette ligne avec l'heure de la base ; la dernière écriture enregistrée devient immédiatement la version officielle partout.
