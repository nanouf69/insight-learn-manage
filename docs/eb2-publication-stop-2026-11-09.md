# EB2 — STOP publication, contrôle du 09/11/2026 à 13:00 UTC

## Décision
Autorisation reçue pour les trois correctifs EB2 seulement. Aucune migration, intégration active, écriture élève, recalcul ou publication n'a été effectuée. Seuls ce rapport et la feuille de route sont ajoutés/mis à jour. L'activation serveur reste false.

## Preuves réelles en lecture seule

Le schéma des réponses/résultats et tous leurs triggers ont été lus via l'outil de lecture Cloud. La table de reçus candidate n'existe pas dans les colonnes renvoyées. Aucun test d'écriture réel.

| Périmètre | Total | Preuve requise par le candidat |
|---|---:|---:|
| Résultats examen_blanc EB2 | 1034 | 161 avec details.snapshot.questions tableau ; 873 sans |
| Résultats examen_blanc EB2-TAXI | 173 | 29 avec ce snapshot ; 144 sans |
| Révisions ouvertes repérées par clé EB2 | 16 | 0 avec revisionState objet ; 16 au format ancien |
| Révisions ouvertes repérées par clé EB2-TAXI | 2 | 1 avec revisionState objet ; 1 au format ancien |

Ces comptes couvrent les lignes présentes, pas uniquement les dernières tentatives ni les élèves de la session actuelle. Ils ne prouvent pas que les 17 révisions anciennes sont actuellement affichées/bloquées : leur compatibilité avec le nouveau circuit n'est pas établie. La seule révision ouverte portant explicitement examenId=EB2-TAXI dans revisionState dispose d'au moins une source snapshot ; cela ne prouve pas que chacune de ses questions a une source univoque utilisable.

### Incompatibilités sérieuses

1. Le SQL candidat `revision_fausses_verified_score` ne lit que `details.snapshot.questions`. Il refuse sans cette preuve, sans corrigé QRC utilisable ou si plusieurs sources ne sont pas distinguées. Activation globale : risque de refus d'une révision auparavant praticable ; contourner avec des questions actuelles réécrirait la source historique et est interdit.
2. Le trigger candidat s'applique à tout `quiz_type='revision_fausses'`, sans restriction EB2. Le commutateur et la fonction d'écran sont partagés avec EB1–EB6 et autres filières. L'autorisation est EB2, pas un changement global de finalisation.
3. Le trigger réel `trg_protect_reponses_apprenants_terminal` transforme completed=true en status=submitted et renseigne submitted_at. Le contrat jetable utilise une table réduite sans ce trigger ; la promesse antérieure « seuls completed/résultat/reçu changent » n'est donc pas complète pour la base réelle. Ce comportement terminal peut être normal mais il doit être testé avec tout le catalogue avant intégration.
4. La preuve navigateur→handler/PostgREST→SQL candidat réunis reste absente ; les tests écran/SQL précédents sont séparés. Les copies physiques iPad/Safari/Android ne sont pas testées. Ne pas traiter les deux parcours synthétiques comme une validation réelle EB2.

## Diff et sécurité

Le diff de d23a89f49 à l'état lu au début de cette intervention contient les seuls fichiers de test/rapport de la préparation précédente ; aucun fichier actif du composant ou de la persistance changé. La modification antérieure previewAuthStorage reste inchangée et ne fait pas partie de l'autorisation EB2. Aucun retrait automatique.

Lecture sécurité réalisée : app_mcp récent complet sans findings ; analyses base/connecteurs/autres pas toutes à jour. Aucune certification globale de sécurité ; aucun scan ignoré ni finding supprimé. La décision STOP repose sur les incompatibilités prouvées du candidat, pas sur une supposition de blocage du bouton Publier.

Les 18 contrats SQL et 96 tests ciblés annoncés appartiennent à l'intervention précédente ; aucun nouveau test d'écriture n'est exécuté ici après STOP. Pas de nouvelle vérification du site public dans ce contrôle ; dernier HTML vérifié à l'intervention précédente : assets/index-BbNPGt9M.js. Aucune publication appelée, donc aucun correctif EB2 mis en service par cette intervention.

## Prérequis restant avant mise en service

- Isoler activation/RPC/gardes au seul EB2 autorisé et assurer la cohabitation avec anciens navigateurs.
- Définir puis tester une lecture fidèle des preuves historiques, sans inventer source, noter rétroactivement ou migrer les réponses ; ambiguïtés gardées en revue explicite.
- Rejouer les tests sur le catalogue complet réel copié uniquement comme définitions dans un PostgreSQL jetable, notamment statut terminal, droits, triggers, unicité et chemins privilégiés.
- Relier navigateur et vraie chaîne serveur jetable, puis nouvelle revue de sécurité/diff avant migration réelle/publication.

Le candidat reste conservé, non appliqué. Ne pas forcer la migration test-only.