# Annulation ciblée de présence — 13/11/2026 16:00 UTC

## Statut exact
**NON PUBLIÉ. Bouton production inactif.** Le journal candidat n'est pas installé, le verrou d'activation reste `false`. Aucune commande de révocation n'a été envoyée au dossier réel.

## Dossier confirmé par lecture seule
Tarek CHERNI : `8fc60874-fa5d-4fed-aced-da946fbf1cca`.
- Cible : `a1a3de55-21da-4123-a2e6-22cbd7ab32bb`, 4 h théorie, 18/09/2026.
- Autre validation conservée : `69de7ba5-6d4a-422f-86a2-fb9a3faa6e34`, 1,5 h théorie, 17/09/2026.
- Aucun enregistrement dans les trois sources de protection EDOF/fin d'accès/gels pour ce dossier.
- Relecture finale : deux validations présentes et inchangées ; journal absent ; aucun SQL de modification exécuté sur la base réelle.

## Implémentation terminée côté candidat
- Commande RPC admin avec identité dossier/validation, version CAS, opération idempotente, auteur Auth et horodatage serveur.
- Journal append-only : photographie complète de la validation originale, refus UPDATE/DELETE, lecture admin uniquement ; aucun DELETE/UPDATE de la validation d'origine.
- Annulation sans motif à saisir : libellé technique d'audit généré au serveur. Restauration explicite séparée.
- Relecture du reçu dans le journal avant succès, puis relecture des lignes et invalidation ciblée des compteurs ; aucune confirmation optimiste.
- Tous les lecteurs client live identifiés utilisent `lirePresencesAdministratives` : heures/PDF, compteurs session/total, jalons actuels, preuves, avertissements de chevauchement et absence par session. Archives figées séparées et inchangées.
- Le candidat SQL adapte uniquement la sous-requête des heures dans `releve_sources_apprenant`, après vérification exacte de sa définition attendue ; les futurs snapshots excluent les décisions annulées. Aucun gel n'est déclenché manuellement.
- Notifications du journal par Realtime, sans nouveau polling. Les droits propriétaires n'ont pas été élargis.

## Tests réellement exécutés
- **105 PASS / 11 fichiers Vitest**, zéro échec final. Les anciens mocks ont été adaptés à la pagination réelle.
- **2 PASS PostgreSQL jetable** : deux commandes concurrentes → un seul événement, refus non-admin/dossier étranger/version périmée, motif vide accepté, original 4 h et 1,5 h intact, signatures/notes/copies fictives intactes, refus dossier protégé, projection serveur, pg_dump/restauration des originaux et du journal.
- **Parcours PC et mobile PASS**, vrai composant et vrai transport client, session admin authentifiée, API de données interceptée vers un PostgreSQL local jetable : confirmation sans motif → 330 à 90 minutes → rechargement conservant l'annulation → restauration à 330 minutes. Quatre commandes explicites au cluster local, aucune écriture de présence en production ; aucun débordement ni erreur navigateur. Captures inspectées.
- **Lecture réelle authentifiée PASS** des deux validations et des trois créneaux restant à signer ; aucune confirmation de suppression réelle cliquée.
- Compilation automatique : **build OK**.

Le pont navigateur/PostgreSQL est un test isolé effectif, **pas** un déploiement PostgREST/Auth/Realtime hébergé indépendant. La session Auth est réelle ; les commandes et tables de présence sont locales. La restauration testée est celle de ce périmètre jetable, pas une restauration complète de production.

## Isolation publication et obstacles restants
La page publique sert désormais `d2c478257e7b578a911775bb9baeddabc244ce62`. Le delta applicatif courant ne contient que ce correctif : **les anciens changements concurrents ne sont plus un obstacle démontré**. Ne pas reprendre le chiffre historique de 49 fichiers.

**NO-GO installation/publication pour les raisons de sûreté restantes :**
1. Pas de sauvegarde/restauration du périmètre réel vérifiée dans une cible Cloud indépendante ; le test local ne prouve pas la restauration des données hébergées.
2. Le parcours hébergé Auth/API/Realtime n'a pas de cible indépendante qualifiée ; aucune mutation de test autorisée sur production.
3. La concurrence avec les producteurs réels de gels/EDOF et l'exécution de leur catalogue complet restent à qualifier ; les verrous locaux ne prouvent pas que tous ces producteurs prennent le même verrou. Anciennes pages ouvertes restent également à contrôler avant activation des nouvelles décisions.

## Chemin le plus court
1. Fournir une cible Cloud réellement indépendante et un export vérifiable du périmètre présence/journal/producteurs de gels, puis y restaurer et exécuter la même confirmation/relecture/Realtime.
2. Qualifier les producteurs réels de gels/EDOF avec le verrou partagé et vérifier qu'aucun ancien lecteur ne compte une validation annulée.
3. Installer uniquement le candidat SQL via l'outil de migration, activer le transport, publier le delta ciblé et vérifier le bouton réel sans le cliquer sur les 4 h.
4. L'administrateur confirme lui-même la révocation nominative des 4 h ; l'agent n'exécute pas cette décision à sa place.

Il ne manque ni l'identité du candidat, ni un motif de suppression, ni une autorisation pour fabriquer des signatures. La limite restante est la qualification hébergée/restauration et concurrence réelle, pas la confirmation visuelle.