# Paquet de revue — fermeture unitaire EB

## Verdict exact

**GO pour revue du correctif local des deux défauts ; NO-GO pour une installation production immédiate.**

Les deux échecs du prévol ont été corrigés et les tests ne contiennent plus `expectedFailure`. Aucun fichier frontend, migration automatique, roadmap ou fonction déployée n’a été modifié. Le canal canonique reste non raccordé : le candidat refuse tout nouveau départ EB sur ce canal inactif, qu’une règle de fermeture existe ou non ; les identités déjà présentes restent rejouables. C’est une restriction volontaire du canal pilote, pas une attribution de parcours.

## Fichiers à examiner ensemble

1. `2026-11-11-session-exam-access.sql` : journal d’accès, deux RPC admin, gardes V2/repassage/timer + première réponse legacy + canal canonique ; registre privé de capacités d’import.
2. `2026-11-12-session-exam-import.sql` : adaptation de la véritable `core_import_passage_finalise(uuid)`, mêmes transformations du contenu, de nouvelles vérifications avant l’insertion historique.
3. Tests `src/test/session_exam_access_contract.py`, `src/test/session_exam_access_preflight_contract.py` et fixture SELECT des deux persist RPC `src/test/fixtures/session-exam-persistence-20261112.json`.

**Les deux SQL forment un seul paquet transactionnel.** Installer uniquement les RPC ou uniquement une moitié n’est pas suffisant. Rien n’a été ajouté à l’historique de migrations.

## Première réponse legacy

- Garde **BEFORE INSERT seulement** sur `reponses_apprenants`, couvrant les INSERT directs et les véritables `persist_answer_batch_v2/v3` utilisés par Edge.
- Identité : apprenant + clé exacte EB/matière + tentative. Suffixe exact `__tN` pour les anciens appels Edge omettant la tentative ; contradiction explicite refusée. Pas de rapprochement avec une autre matière ou une tentative voisine.
- Reprise autorisée par ligne existante exacte, timer exact, reçu exact ou tentative V2 persistée concordante. INSERT ON CONFLICT pour la même identité conservé ; sauvegardes UPDATE non gardées.
- Premier envoi sans timer ni preuve : même verrou partagé et même restriction de session que les nouveaux V2. Fermeture concurrente attend la transaction de démarrage.
- Timer tardif : réponse déjà persistée de la même identité permet la récupération, sans permettre une autre tentative. Le repli V2 sans champ tentative ne prend plus systématiquement la valeur 1.

## Import historique contrôlé

- Les champs JSON `source_historique` seuls ne donnent aucune exemption, y compris s’ils contiennent un vrai identifiant de résultat.
- La fonction d’import autorisée verrouille le résultat original puis la remise correspondante. Exige même apprenant, EB, matière, clé/suffixe/tentative, statut remis, instant de remise **exactement égal** à celui du résultat, réponses exactement égales.
- Elle génère un nouvel attempt_id et une capacité privée liée au résultat, apprenant, EB, processus serveur et transaction courants ; seule cette capacité autorise l’INSERT historique `en_cours` puis sa finalisation dans la transaction.
- Registre privé sans accès anon/authenticated/service_role direct, RLS active, immuable. La fonction SECURITY DEFINER y écrit pour l’import autorisé ; pas de secret en GUC ni métadonnée utilisateur. Un autre processus/transaction ou attempt_id ne peut réutiliser la capacité.
- Exécution de la fonction : admin vérifié ou contexte service_role ; PUBLIC/anon révoqués. Rejeu d’un import existant conserve son ID, sans nouveau permis ni nouvelle copie.
- Réponses, résultats source, choix, barèmes et anciennes copies ne sont pas réécrits. La transformation historique du corps de la fonction demeure celle capturée par SELECT.

## Tests réellement exécutés

```text
PYTHONDONTWRITEBYTECODE=1 python3 src/test/session_exam_access_preflight_contract.py
30 tests, 30 PASS, 0 FAIL, 0 expectedFailure

PYTHONDONTWRITEBYTECODE=1 python3 src/test/session_exam_access_contract.py
16 tests, 16 PASS, 0 FAIL
```

Les 16 baseline sont compris dans les 30 ; ne pas additionner les mêmes scénarios. Base nouvelle, socket local uniquement, variables PG héritées retirées, UTF-8 explicite. Aucune connexion d’écriture production.

Preuves positives/négatives : fermeture sans première réponse, véritables deux RPC persist, reprise UPDATE et ON CONFLICT, timer sans réponse/récupéré après réponse, autre matière/tentative refusées, véritable core_start et retake courant, autorisation non consommée sur refus, mêmes IDs/snapshots lors des reprises, sauvegarde/finalisation après fermeture, CAS et verrou concurrent, inscriptions croisées, e-learning/attente, import QCM + QRC via la vraie fonction adaptée, réponse QRC identique et en attente sans note fabriquée, sources et anciennes copies identiques avant/après, rejeu d’import, faux JSON/capacité inaccessible, réponses/instant source divergents refusés, canonique nouveau refusé et ancien rejoué, aucun trigger UPDATE ajouté, non-EB inchangé.

Échecs intermédiaires rencontrés et corrigés : point-virgule absent dans le compagnon SQL ; fixture SQL_ASCII incapable de lire l’accent QRC, corrigée en UTF-8. Le dernier passage de chaque suite est sans échec. Pas d’échec caché derrière une annotation de test.

## Limites justifiant le NO-GO production immédiat

- Le test exécute les fonctions de persistance réelles et leur frontière INSERT, **pas une requête HTTP complète à Edge** ni l’interface élève authentifiée.
- Catalogue de contexte/immutabilité/save/finalize archivé : tous les triggers/effets secondaires actuellement installés ne sont pas rejoués. En particulier les envois, IA, statistiques et validation automatique ne sont pas certifiés globalement par cette suite ; aucun appel externe de test n’a été lancé.
- Import utilise une version historique de fixture déjà présente. La branche historique créant elle-même une version avec `filiere=NULL` reste une limite de la vraie fonction initiale face aux contraintes NOT NULL du catalogue archivé ; aucune réécriture de cette logique hors périmètre.
- Concordance instant/réponses stricte : les archives dont les preuves divergent sont désormais refusées par cet import, sans reconstitution. Aucun inventaire nominatif ni rattrapage réel réalisé.
- Variantes VTC/TAXI/TA/VA partagent la garde, mais le repassage complet des quatre filières n’a pas été exécuté ici ; le cas complet retake testé est VTC.
- Droits du propriétaire des fonctions, dépendances et empreintes doivent être revérifiés au moment de l’installation. L’ancien candidat du prévol ne doit plus être installé seul.

## Installation future et retrait

Après levée des limites nécessaires et accord explicite distinct : transaction unique, lock_timeout 2 s, statement_timeout 15 s ; exécuter les deux fichiers dans l’ordre ci-dessus, puis contrôler signatures/droits/RLS, cinq nouveaux triggers de création actifs, registre d’import et journal vides, aucune ligne d’accès initiale ; recharger le cache API puis COMMIT. Si erreur ou verrou indisponible : ROLLBACK, pas de retry automatique. Aucune fermeture de session dans ce paquet.

Retrait après activation : accord distinct car désactiver une garde peut élargir l’accès. Révoquer d’abord la commande d’accès ; conserver les deux journaux et leurs protections immuables, sans DROP/DELETE. Le registre privé et la fonction d’import contrôlé doivent rester compatibles entre eux ; ne pas supprimer le registre en laissant son lecteur dans une fonction. Le retour au corps précédent de l’import nécessite une révision explicite des droits et des garanties, jamais une restauration automatique.

Ce document est un paquet de revue, pas une autorisation d’installation. Aucune fermeture/ouverture, migration réelle, publication, compte réel ou envoi tiers.