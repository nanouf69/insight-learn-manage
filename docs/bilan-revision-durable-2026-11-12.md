# Sauvegarde des reprises — 12/11/2026

## Causes prouvées
- `BilanFutureExam` créait les réponses de reprise dans `useState`, sans envoi ni relecture ; son ancien test exigeait explicitement zéro écriture. Rechargement = perte de cette saisie locale.
- `ModuleDetailView` réappliquait les réponses de `bilan_passages_figes` à chaque changement de réponse ; une reprise ne pouvait pas garder sa priorité d’affichage. Le lecteur ignorait aussi les révisions sans ligne originale `submitted`.
- Les modules ordinaires utilisent déjà `answerPersistence` → `upsert-reponse-apprenant` → CAS `persist_answer_batch_v2/v3`. Les EB utilisent ce même transport avec un état et un reçu de finalisation distincts. Les identifiants des EB ne sont pas réutilisables pour les Bilans.

## Correctif aperçu
- Reprise future raccordée à la file partagée : propriétaire, reçu et version exacts, questions figées, séquence serveur, événements de réponses ; aucun `module_id`, score, mise à jour de remise Bilan ou validation de module.
- Accusé visible seulement après envoi **et relecture exacte** ; réseau indisponible = saisie dans la file du propriétaire, erreur/réessai. La première réponse hors ligne est retrouvée même sans ligne serveur.
- Clics multi-choix appliqués sur la dernière saisie synchrone ; réponses périmées ignorées ; navigation ne mélange pas les copies.
- Archives historiques : originales conservées, sans recouvrir une révision active ; révisions explicites relues même sans ancienne ligne soumise.
- Admin : réponses futures persistées dans « Questions à refaire — réponses enregistrées » ; réponse initiale non attribuée sans preuve, jamais inventée.
- Finalisation future : candidat SQL propriétaire/source/seq/réponses préparé et testé sur PostgreSQL jetable ; **non installé**, activation `false`. L’écran signale le blocage, jamais « Déjà effectué » à tort.
- Pilotes 502/505/506 et corrigés actuels restent OFF ; aucune nouvelle IA.

## Tests exécutés
- 33 tests de règles/écrans/queue/modules, puis 29 tests reprise Bilan/EB/concurrence/séquences (ensembles se recoupant, ne pas additionner).
- 4 contrats PostgreSQL jetables : concurrence/rejeu même date de clôture, version périmée refusée, autre propriétaire refusé, réponse manquante refusée ; empreinte remise initiale inchangée.
- Chromium PC 1280×1800 et mobile 390×844 : multi-choix, serveur lent 250 ms, rechargement avec réponses relues, finalisation OFF explicitement bloquée.

## NO-GO publication
- Finalisation source/CAS non installée ; schéma et triggers complets de production pas encore rejoués dans le contrat jetable.
- Historique/TA/VA : priorité et transport partagé corrigés, mais rounds immuables et finalisation dédiée non intégrés dans leurs écrans ; pas de prétention à une couverture complète.
- EB1–EB6 : suites existantes ciblées réussies, pas six parcours réels par filière/jour/soir vérifiés.
- Aucun compte réel utilisé en écriture, aucune note/copie/signature/réponse originale modifiée ; aucun SQL installé, aucun déploiement ni publication.

Les tests fictifs ne constituent pas une validation authentifiée d’une soumission réelle. Publication suspendue jusqu’aux contrôles critiques manquants.