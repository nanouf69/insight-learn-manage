# Sauvegardes ciblées — 04/11/2026

## État livré
Correctifs client dans l’aperçu seulement. **Aucune publication, migration, fonction Cloud déployée, écriture de données Cloud, mail/SMS ou appel IA payant.** Les fonctions serveur, droits, questions, supports, notes, signatures et validations restent inchangés.

## Cause module 64
- Les deux refus Belarbi sont enregistrés à 20:07:06 et 20:09:28 UTC le 03/11, HTTP 400 / SQLSTATE 23514, request IDs `fe5052bb-1856-4abb-90ec-4c5a66af64fe`, `5a8c2fd8-0d8d-4763-9e3f-c0ffa9f24089`.
- Le composant sanctions possède `notee: true` pour son bilan visuel. Le transport utilisait ce même indicateur pour envoyer une note de 0–100 lors de Terminer. Le déclencheur actuel impose **score NULL**, y compris pour une note 0. Brouillons = NULL, donc leur enregistrement pouvait réussir et la fin échouer.
- La fonction SQL actuelle, copiée depuis une lecture du catalogue, a été rejouée sur PostgreSQL jetable avec le vrai `persist_answer_batch_v2` et une table minimale compatible. Un payload fictif `{version:"2026-10-27-m64-sanctions-v1",revision:"r1",valeurs:{q01..q20:strings 0..2}}` échoue avec score 0, 60 ou 100 : **23514 « Questions complémentaires non notées »**. Le même payload avec NULL réussit. Les lignes restent identiques après chaque refus.
- **Limite de preuve :** les réponses HTTP détaillées et corps exacts des deux opérations historiques ne sont pas disponibles dans les logs consultés. La reproduction utilise le serializer actuel et des réponses fictives, pas le payload historique exact. Ne pas confondre cause déterministe du composant avec récupération de ces opérations.
- Correction : le bilan visuel reste dérivé, transport toujours NULL. Verrou synchrone contre double clic. Confirmation exclusivement après relecture strictement identique version/révision/valeurs/completed, même si un ancien refus en file rend l’accusé global négatif. Aucun ancien refus supprimé ni automatiquement rejoué.

## Lecture de progression 42501
- ACL actuelle : authenticated et service_role ont EXECUTE sur `etat_completion_modules` et `reponse_enregistree`. Les deux fonctions restent sans SECURITY DEFINER.
- Vérification HTTP réelle en lecture seule le 04/11 : appel anonyme **401 / 42501 « permission denied for function etat_completion_modules »** ; même appel sous session injectée **200, 11 lignes**. Aucun droit ajouté.
- Le client appelait directement la lecture sans `freshSessionRead`. Le correctif utilise le helper existant : identité auth (jamais UUID du dossier comme propriétaire), renouvellement, contrôle du même compte avant/après, reprise bornée et erreur propagée. Pas de repli vers zéro ou faux terminé.
- **Limite :** l’événement CHALA à 05:18:52 possède le message de permission, pas le rôle JWT réellement reçu. Le scénario anonyme explique exactement ce message ; l’expiration de cette session historique reste NON PROUVÉE. Une erreur authentifiée persistante reste une erreur, jamais contournée par un GRANT.

## Files et réseaux : audit lecture seule
- Kais SELMI : timeout 15 s / enFile 5 à 22:32:11 le 03/11.
- Ahmed MALKI : timeout / enFile 6 à 20:23:04 ; encore enFile 4 à 08:05:42 le 04/11.
- Kamal ADYAHYA : timeout / enFile 4 à 19:51:36 le 03/11.
- Mohammed ABDELHAK : résultats et révisions du module 2 présents ; dernières révisions enregistrées vers 19:51:37–39 le 03/11. Ces lignes ne prouvent pas la réception de l’opération Failed to fetch précise.
- À 08:18–08:20 le 04/11, des révisions SELMI/MALKI/ADYAHYA ont de nouvelles dates serveur. Cela prouve des écritures serveur, **pas une file locale vidée** ni une récupération complète. Plusieurs logs timeout ne possèdent ni operation ID ni request ID : attribution exacte non possible.
- Aucun changement de timeout, aucun nouveau cycle de rafales ou retry automatique des refus définitifs. La file durable et ses contrôles d’identité restent en place.

## Tests réellement exécutés
- Avant correctif : `sauvegardes-04nov.test.tsx` **6 FAIL, 1 PASS** : absence de session, reprise 42501, compte différent, refus persistant, double clic et score, preuve malgré accusé perdu.
- Après : **90 PASS / 12 fichiers Vitest**, ensemble relancé : sauvegardes-04nov, equipements-taxi-sanctions-resultats, answer-persistence, answer-queue-no-freeze, tablette-partagee-file-reponses, refus-definitif-isolation-comptes, session-read-recovery-24oct, equipements-taxi-locale, equipements-taxi-sanctions, autosave-final-race, retry-classification-etape1, candidat-modules-source.
- PostgreSQL jetable : **7 PASS** via `python3 src/test/equipements_sauvegarde_sql_contract.py` : score refusé/résolu, question absente, nombre au lieu de string, version/révision/objet, immutabilité et replay après soumission, final ancien refusé sans perte, isolation RLS simulée compte A/B.
- Le test SQL utilise les fonctions réelles capturées mais des dépendances minimales et une politique owner-only fictive ; il ne prétend pas reproduire toute la politique Cloud ni tous les triggers de production.
- Aperçu : dernier signal `build OK`. Aucun test par écriture depuis une vraie fiche élève. La session réelle a servi uniquement à une lecture HTTP. Flow tablette avec vraie fin de quiz **NON PROUVÉ**, car aucune réponse fictive autorisée en production.

## Fichiers et diff fonctionnel
- `src/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements.ts` : score NULL, verrou double clic, relecture seule autorité de confirmation.
- `src/lib/etatCompletionServeur.ts` : lecture via freshSessionRead.
- `src/lib/AGENTS.md` : règle du transport non noté et confirmation.
- `src/test/sauvegardes-04nov.test.tsx` : 7 reproductions ciblées.
- `src/test/equipements-taxi-sanctions-resultats.test.tsx` : attend NULL plutôt que pourcentage stocké, bilan visuel inchangé.
- `src/test/candidat-modules-source.test.ts` : simulation de lecture mise à jour ; vrais tests du helper dans les suites dédiées.
- `src/test/equipements_sauvegarde_sql_contract.py` + `src/test/fixtures/equipements_guard_live_20261104.sql`, `answer_batch_live_20261104.sql` : reproduction SQL isolée ; aucun accès Cloud depuis ce script.
- `roadmap.md` et ce rapport.

## Conservation et risques non résolus
- Belarbi : 128 lignes réponses ; avant/après **9dc4138b5b6404397093ab5ed8f6efc3**. Sanctions toujours non terminé, score NULL, 20 champs présents. Aucun changement forcé de completed.
- Snapshots Bilan : 222 lignes ; avant/après **ed71c9c6b643b1f7f6c6803e365a0b35**.
- Module editor : 62 lignes ; empreinte initiale annoncée **fdb53d690bb7a6a68e6024095e12921c** ; contrôle final avec tri numérique module_id **a118232f0d51a79f41c2a7e5e8974df4**, tri texte **bffee19222d5f8e09505a0cc5dded116**. La méthode exacte initiale n’a pas pu être retrouvée : identité avant/après des questions **NON PROUVÉE**, aucune conclusion de perte ou de changement. Zéro écriture Cloud effectuée par ce chantier ; une activité extérieure concurrente n’est pas exclue.
- Aucune fusion de brouillons nested `valeurs` : local/pending/serveur restent des versions différentes ; une saisie plus ancienne peut masquer une plus récente. Ne pas faire de fusion automatique non autorisée.
- Course save → final avec base_seq périmé reproduit : serveur refuse la fin lorsque le brouillon conservé est incomplet ; données conservées. Aucun rebasing automatique implémenté (risque de supplanter une révision concurrente).
- Les deux opérations sanctions rejetées restent conservées. Nouvelle soumission compatible possible après mise en ligne ; pas de réécriture automatique des anciennes opérations.
- Publication, récupération complète des files sur leurs appareils et vérification réelle par ces élèves restent en attente. Les changements actifs du site sont **zéro**.