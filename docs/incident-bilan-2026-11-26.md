# Corrections du bilan du 26 novembre 2026 — revue avant activation

## État de livraison

**Corrections écrites et testées en aperçu ; aucune activation de production durant ce travail.** Aucun email/SMS, restauration réelle, compte réel usurpé, remise ou signature réelle créée. Aucun contenu pédagogique, corrigé, ID, réponse ou document historique modifié dans la base.

HEAD de départ : `7880b5850`. Un changement concurrent `08545222d` (« Added Slack webhook endpoint ») est apparu ; conservé, non réécrit. Ce rapport décrit seulement les incidents ci-dessous, pas une autorisation de publier les autres modifications en attente.

## 1. Sauvegarde quotidienne — corrigée dans le code, fin réelle non prouvée

**Constats SELECT** : les passages cron atteignent encore 05:58 le 26/11 ; dernier `_etat.json` à 05:58:31, environ 595 875 octets ; 1 418 fragments du journal. Aucun marqueur final pour le 26/11. Fenêtre de relance 01–05 UTC et un paquet par invocation ralentissent fortement le journal. Les logs du service ne permettent pas d'attribuer chaque interruption réelle à une erreur précise : la cause exhaustive n'est pas démontrée.

**Défauts de code prouvés** : erreurs de lecture du checkpoint prises pour une absence ; réponse HTTP de l'enchaînement ignorée ; curseur incomplet pour les clés composites ; omission des nouvelles banques/preuves. Correction : plusieurs paquets par invocation avec budget borné, checkpoint durable, curseur composé, refus sur erreur de lecture et alerte explicite sur chaîne refusée. Pas de faux succès sur kickoff.

**Fichiers** : `supabase/functions/sauvegarde-quotidienne-eleves/{index,manifest}.ts`. Manifest version 3, ajout des `bilan_future_*`, `exam_content_versions`, `exam_content_shares`, `module_editor_state`, `core_operations`, sans retirer d'ancienne table. Candidat de cron : `docs/sql-revue/2026-11-26-sauvegarde-reprise.sql` (relance toutes les deux minutes hors fenêtre limitée).

**Tests exécutés** : 16 PASS dans `sauvegarde-restauration-26nov.test.ts`, dont export des tables fictives enregistrées, 4 501 lignes journal, 2 501 révisions à clé composite ; restauration dans une autre base PostgreSQL jetable, comparaison lignes/empreintes. Les transports sont fictifs : cela ne prouve ni une sauvegarde réelle finie ni un snapshot transactionnel cohérent sous modifications concurrentes.

**Activation restante** : déployer seulement cette fonction après revue, contrôler le coût des 720 relances/jour avant modification du cron, observer un export jusqu'au marqueur final et vérifier sa couverture. Ne jamais restaurer production. Une restauration d'un vrai export devra se faire sur une base séparée avec arrêt en cas d'écart.

## 2. File des réponses — pertes d'acquittement corrigées, deux onglets Chromium testés

**Cause de code prouvée** : un ACK `frozen:true` était traité comme sauvegardé et supprimait l'opération locale alors que la réponse n'était pas appliquée ; fusion d'opérations oubliant le refus/backoff ; changement de compte possible pendant `json()`/`text()` sans deuxième contrôle ; verrou uniquement par onglet. Les délais observés de 15 s ne suffisent pas à identifier une cause serveur unique.

**Fichier** : `src/lib/answerPersistence.ts`. ACK figé devient refus conservé ; les anciennes opérations refusées restent identiques ; saisie pendant backoff ne déclenche pas de nouvel essai immédiat ; contrôle de propriétaire après lecture de réponse ; enregistrements durables par opération et marqueurs ACK ; Web Lock lorsqu'il existe. Aucune purge de la file réelle module 4/exercice 105, aucune réinitialisation.

**Tests exécutés** : `answer-persistence-26nov.test.ts` 7 PASS (perte réseau, refus, backoff, changement de compte pendant les deux types de corps, rechargement malgré un écrasement de l'ancien tableau, expiration puis reconnexion même propriétaire), suites historiques de file incluses dans les 144 PASS.

**Concurrence réelle exécutée** : `src/test/incident26-browser/two-tabs.py`, deux vrais onglets Chromium et la file applicative importée par Vite ; deux opérations exactes et deux ACK fictifs, maximum d'une requête en parallèle, rechargement sans perdre l'ACK. Toutes les sorties hors serveur local/endpoint fictif bloquées. PASS.

**Limites** : le fallback sans Web Locks n'apporte pas une exclusion mutuelle globale. Retention des marqueurs/quotas de stockage et Safari privé non éprouvés. Ne pas prétendre l'incident du poste réel réparé avant ce contrôle. Ne pas vider son stockage pour tester.

## 3. Crash après examens et version active

**Cause prouvée** : les slots `null` sont intentionnels pour les matières absentes ; `ExamenBlancsResultats` déréférençait `.nonPassee`. Le test navigateur a aussi reproduit une déréférence dans `ebCanonicalStatus`. Un résultat vide pouvait préparer un bilan avec zéro inventé.

**Fichiers** : `ExamenBlancsResultats.tsx`, `ExamensBlancsPage.tsx`, `ExamensBlancsEditor.tsx`, `src/lib/refreshSavedExamResults.ts`, `src/lib/ebCanonicalStatus.ts`. Slots conservés à leur position, lecture nulle sécurisée, aucun bilan vide auto-enregistré. Une identité expirée/changée affiche une erreur de connexion distincte ; une vraie absence de version avec session valide reste une vraie erreur, sans banque de secours inventée.

**Tests exécutés** : régression slots nuls 3 PASS, projection 5 PASS, expiration/absence 2 PASS, changement de compte 6 PASS, jeton renouvelé 1 PASS, matrice verdicts 27 PASS. Playwright final : PC 1280×1800 et mobile 390×844, EB1/3/5 × remis/non passé/QRC = 18 vues, zéro crash et zéro débordement ; écran non passé affiche `— /20`, pas une note nulle. Données/transport fictifs, trafic extérieur bloqué. Pas de finalisation sur compte réel.

## 4. Quatre copies 505 — intactes, aucune remise administrative

SELECT final identique au SELECT initial, toutes `in_progress`, `submitted_at` et `score` NULL :

| Copie | write_seq | MD5 réponses | Écarts avec derniers clics certains |
|---|---:|---|---:|
| 4d66a7f6-cc9e-4b0f-acce-006a8562bdb3 | 70 | 98fe17b69f3d33067b0bb5bef48036c6 | 7 |
| cee4183a-4b52-4311-846c-a70442b3fbf1 | 73 | b4afd9cb872443ae4eb5df6f0c2209a0 | 3 |
| a527fb4e-1596-403d-9ecf-229981139804 | 59 | ff55799475cfeb47b1f7b363487aef89 | 1 |
| d5c2b4eb-c1df-48d6-8c90-80d257b6cf07 | 100 | 204ef09e63b62828109138ff0c536798 | 0 |

49 clés par copie/snapshot. Q7 sans corrigé figé pour les deux copies intermédiaires : interdit d'en choisir un rétroactivement. Une concordance complète ne prouve pas une remise volontaire.

**Préparation** : circuit existant `docs/livraison-505/bilan_505_lot_4_copies.sql` et `docs/bilan-505-remise-2026-11-14.md`. Nouveau candidat `docs/sql-revue/2026-11-26-lot-505.sql` : uniquement inscription append-only des quatre autorisations, contrôle du compte/tentative/statut/seq/empreinte, rejouable sans doublon, interrupteur inchangé. Les deux Q7 restent récupération seule. Il n'écrit aucune réponse et ne soumet rien.

**Tests exécutés** : `bilan_505_catalogue_prod_contract.py` 9 PASS, `bilan_505_activation_contract.py` 8 PASS, `bilan-505-remise-browser/parcours_reel.py` A–F 6 PASS sur fictifs. Nouveau candidat lot exécuté sur PostgreSQL jetable, seules les empreintes attendues remplacées par celles des réponses fictives : deux exécutions, exactement quatre autorisations dont deux récupération, aucune ligne réponse modifiée ; dérive de séquence sur la dernière copie = annulation entière, zéro autorisation partielle (PASS). Cela ne remplace pas une validation du lot exact sur catalogue complet jetable avec les contraintes/triggers actuels. Reprise réelle seulement après activation nominative et revue/clic de l'élève propriétaire.

## 5. Synchronisation corrections/notes — pas de liens en masse

**Constats SELECT** : 290 liés : tous présents et payloads égaux ; 2 ont une référence périmée. 210 en attente : 167 payloads égaux, 43 différents. L'égalité seule n'autorise pas un lien d'identité ni une fusion TAXI/VTC. L'absence de journal récent ne prouve pas à elle seule une panne.

Les deux références désalignées sont Français 503/603, Q5 (`75e88f32…`) et Q85 (`8fb2495b…`) : les gardes de version refusent légitimement une prochaine propagation tant que la référence n'est pas réconciliée. Candidat `docs/sql-revue/2026-11-26-references-bilan.sql` : les deux références seules, égalité des payloads + empreintes exactes + unicité + journal append-only, refus si divergence, aucune question/bonne réponse/note/historique modifiée. Contraintes de journal lues : direction NULL, pas une direction fictive. Candidat exécuté sur fixtures PostgreSQL jetables avec empreintes attendues des questions fictives : deux exécutions, deux journaux seulement, JSON des modules/dates strictement inchangés ; divergence ultérieure refusée (PASS). Validation sur catalogue complet jetable toujours nécessaire avant activation.

**Tests exécutés** : `bilan-sync-26nov-contract.py` **10 PASS**, dont 6 de sécurité hérités et **4 spécifiques** : paire fictive, refus de lien/version, candidat références, candidat lot 505. Fonctions capturées par SELECT, PostgreSQL jetable. Affichages/corrections actuelles : 18 + 5 tests ; trois surfaces 16 ; propagation des notes officielles 6, tous PASS. Aucun nouveau circuit de notation ni recalcul de note historique ajouté.

## 6. Six fonctions SECURITY DEFINER — protection préparée, risque réel encore présent

**Constat SELECT** : les six fonctions sont détenues par postgres et restent exécutables par anon/authenticated/service_role en production. Cette livraison n'a changé aucune ACL.

**Candidat** : `docs/sql-revue/2026-11-26-six-fonctions.sql`, définitions réelles capturées et gardes/ACL ciblées. Publication et purge : service seulement ; import : admin/service ; finalisation : propriétaire de la tentative, admin ou service, jamais un autre élève ; replay interne non exposé directement, contrôle de l'acteur/tentative. Les usages service imbriqués restent possibles par le propriétaire SECURITY DEFINER. Revoir les appels légitimes avant installation.

**Tests exécutés** : `core-six-functions-contract.py` 6 PASS, rôles anon/autre élève/propriétaire/admin/service, rejeu privé et tentative exacte, import/pub/purge uniquement sur fictifs PostgreSQL jetables et transactions annulées pour opérations destructrices. Aucun appel de purge/import/publication réel.

**Activation restante** : comparaison du catalogue réel à la capture, inventaire des appelants service/admin, application de ce seul delta SQL après accord, relecture ACL/ownership et vérifications non destructrices. Pas de migration globale. Tant que cela n'est pas activé, la faille signalée n'est pas considérée corrigée en production.

## 7. I21 Albert — état signé confirmé, pas de nouvelle signature

**État SELECT** : les deux évaluations du 25/11 à 19:05:55 et 19:22:12 Paris ont leurs PDF/empreintes et preuves I21. Contrat et contresignature existants conservés ; aucune suppression/re-signature.

**Fichier** : `src/components/formateurs/EvaluationCompetencesI21.tsx`. Le succès exige maintenant preuve I21 renvoyée et relecture signée/PDF/empreinte/preuve ; readback gardé en mémoire après réponse ; verrou local contre clic concurrent ; état signé conservé, nouveau formulaire uniquement sur geste volontaire. Serveur anti-double-signature préexistant non redéployé.

**Tests exécutés** : 3 PASS React ; essais PC/mobile fictifs de trace souris/tactile, relecture PDF et téléchargement fictif, état confirmé sans formulaire automatique ; contrôle final d'état déjà signé PC/mobile. Aucun accès admin réel ni capture physique iPhone ne sont revendiqués. Ancien panneau d'envoi reste l'état des documents du commit existant, aucun renvoi.

## Validation finale, fichiers et activation

- **144/144 tests ciblés, 17 fichiers Vitest** lors du dernier passage ; 6 tests SQL six-fonctions ; 10 tests SQL sync (6 hérités, ne pas les compter deux fois) ; contrats/parcours 505 indiqués ci-dessus ; deux vrais onglets Chromium PASS. Les premiers échecs de fixtures/session/encodage/colonnes héritées ont été corrigés et les suites concernées rejouées.
- Compilation de l'aperçu : **build OK**. PC/mobile validés sur les écrans fictifs ciblés, pas une régression exhaustive de toute la plateforme.
- Tests ajoutés/conservés : `src/test/answer-persistence-26nov.test.ts`, `eb-empty-slots-26nov.test.ts`, `sauvegarde-restauration-26nov.test.ts`, `core-six-functions-contract.py`, `bilan-sync-26nov-contract.py`, fixtures SQL capturées, harness `src/test/incident26-browser/`. Tests existants adaptés aux sessions réelles et curseurs composés. Aucun fichier de preuve réelle remplacé.
- **Production** : SELECT seulement ; ni fonction déployée, ni cron/ACL/migration appliqué, ni écran publié. Les correctifs de code ne sont donc pas encore présents sur le site public.
- **Revue avant activation** : (1) compléter Safari/stockage et validation catalogue complète des deux candidats SQL ; (2) approuver séparément sauvegarde+cron, six fonctions, écrans ciblés ; (3) ne pas publier tout HEAD car d'autres travaux sont présents ; l'action standard publier emporte les autres changements, donc aucune publication ciblée n'est prétendue disponible automatiquement ; (4) contrôler un export réellement terminé et les accès authentifiés après l'activation autorisée ; (5) lot 505/reférences séparé, jamais soumission administrative. Aucun « tout réglé » sans ces preuves.