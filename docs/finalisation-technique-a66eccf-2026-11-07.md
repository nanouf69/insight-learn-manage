# Finalisation technique ciblée — 07/11/2026

Référence initiale : `a66eccfd95ddb46c7e34465a22cd73198f0d7c6c`.
Travail en aperçu uniquement ; aucune connexion de test à la base réelle.

## Sauvegarde

La pagination par clé et les comptes sont des observations, pas une preuve de snapshot.
Un export sans erreur écrit `_export_termine.json` avec `integrite: non_verifiee`,
`restauration: non_prouvee` et `instantane_coherent: false` ; jamais `_termine.json`.
Les anciennes journées terminées restent inchangées et leur intégrité n'est pas certifiée.
Une reprise OFFSET conserve son curseur et reste non vérifiée.
Une réparation produit un manifeste indépendant dans `_reparation-1/`, sans fusion
des tables de plusieurs dates ni remplacement du manifeste historique.
Une divergence de comptes signale une erreur ; l'égalité ne certifie rien.
Les tests démontrent une insertion derrière le curseur non exportée et des versions
mélangées malgré des comptes égaux. Les reprises sur source stable conservent les clés.
Une garantie cohérente exige un snapshot transactionnel durable couvrant toutes les
pages/tables (absent des appels HTTP séparés) ou une sauvegarde gérée ; la restaurabilité
exige une restauration isolée puis un contrôle complet, non réalisé ici.

## 22P05

U+0000 reproduit 22P05 sur PostgreSQL jetable avec le RPC figé ; le champ rejeté
d'Ahmed reste NON PROUVÉ. Aucun accès à sa file locale n'a eu lieu.
Le codec préparé est désormais INACTIF dans file/edge/V2 : les textes littéraux
restent inchangés ; aucun ancien refus n'est débloqué automatiquement.
L'edge refuse un marqueur non supporté avant persistance, sans ACK de succès.
Le helper préparé ne décode que la version explicite ; une ancienne valeur sans
marqueur reste identique, une version inconnue est refusée.
Le test SQL prouve que le RPC existant perd le marqueur, puis teste un prototype
de stockage marqué, relecture, renvoi après perte de réponse et export lossless.
Ce prototype n'est PAS le chemin actif complet UI/IA/historique.
Le brouillon `2026-11-07-transport-marque-non-actif.sql` prépare seulement des colonnes ;
RPC atomiques, ACK exact par relecture et TOUS les lecteurs restent des dépendances
d'activation. Aucune réponse réelle n'est codée, modifiée ou récupérée par cette tâche.

## Sécurité

L'absence de JWT n'autorise plus aucun appel interne. `current_user` n'est pas utilisé
comme identité dans les SECURITY DEFINER. Le brouillon vérifie `session_user` et
le rôle sélectionné par la connexion API authenticator ; identité élève/admin exige
claims valides, rôle authenticated et UUID sub concordant. Identité service autorisée
uniquement via connexion/SET ROLE de confiance ; claims service forgés sous authenticated refusés.
Le cron nécessite une connexion dédiée `ftransport_qrc_cron` (NOLOGIN, aucune membership
API), autorisée au recalcul uniquement. Le cron actuel sans cette identité échoue fermé.
Helpers non exécutables par les rôles API ; chemins fixés `pg_catalog, public, pg_temp`.
Déploiement BLOQUÉ jusqu'à vérification réelle des identités API/IA et reconfiguration
du scheduler. Les corps métier et notes ne sont pas modifiés par ces gardes.

## Tests exécutés

- Dernier passage Vitest combiné : 53/53 PASS dans 7 fichiers ciblés ; suite globale non relancée (hors périmètre).
- PostgreSQL jetable : contrat sécurité 1/1 PASS après correction d'une assertion
  de comptage des fonctions (8 définitions durcies, pas 9).
- PostgreSQL jetable : contrat 22P05/stockage prototype marqué 1/1 PASS.
- Compilation automatique aperçu : `build OK` constaté dans le journal.
- Aucun parcours autonome réel, IA, mail, export réel, migration réelle ou restauration.

## État

Préparé/testé seulement. Rien publié ni déployé. Incidents réels non déclarés corrigés.
Activation : NO-GO (snapshot cohérent absent, codec complet non implémenté,
identités/scheduler réels non vérifiés). Aucun chantier hors de ces trois réserves.
## Fichiers modifiés depuis la référence

- `supabase/functions/sauvegarde-quotidienne-eleves/{index.ts,AGENTS.md}`
- `src/lib/{answerPersistence.ts,transportSansNul.ts,AGENTS.md}`
- `src/features/noyau-passage/pontV2.ts`
- `supabase/functions/upsert-reponse-apprenant/{index.ts,transportSansNul.ts}`
- `docs/sql-revue/2026-11-07-securiser-fonctions-correction-notes.sql`
- `docs/sql-revue/2026-11-07-transport-marque-non-actif.sql` (nouveau brouillon)
- `src/test/{sauvegarde-cle-reprise-07nov.test.ts,nightly-export-handler-mock.test.ts,transport-nul-22p05.test.ts,answer-edge-handler-24oct.test.ts,core_correction_securite_contract.py,transport_nul_22p05_contract.py}`
- `roadmap.md`, ce rapport.
