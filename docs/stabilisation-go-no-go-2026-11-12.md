# Stabilisation — qualification conditionnelle, 12 novembre 2026, 23:19–23:27 UTC

## Décision : NO-GO, aucune publication exécutée

L'autorisation est conditionnelle à une restauration complète prouvée et à la qualification du lot. Ces conditions ne sont pas satisfaites. Aucune migration, écriture applicative réelle, modification de note/copie/signature, restauration de production, dépense ou envoi n'a été exécuté. Les écritures SQL des tests ont utilisé exclusivement un cluster jetable sur socket local.

## Sauvegardes et couverture

- Inventaire SQL actuel : 209 tables `public`, 27 tables `auth`, 10 tables `storage`. Les comptes de tables ne prouvent pas la couverture d'une sauvegarde.
- 16 espaces de stockage, tous privés : 34 313 objets dans l'espace d'exports applicatifs et 4 471 objets dans les autres espaces. Le comptage des métadonnées ne prouve ni une copie des octets ni leur restauration.
- Aucun outil exposé ne lit l'inventaire des snapshots Cloud, ne lance l'export complet produit ou ne restaure un snapshot vers une cible isolée. Aucune date de snapshot géré n'est donc constatée. Les exports applicatifs 26/209 des 11/12 novembre restent explicitement exclus comme preuve.
- Documentation Cloud : snapshot quotidien, conservation d'environ 14 jours, base/schema/données seulement, pas de PITR. Export complet : base et comptes avec hashes de mots de passe, mais pas fichiers de stockage, fonctions, secrets ou paramètres des fournisseurs de connexion.
- Aucune restauration complète isolée, aucun test de connexion restaurée, aucune comparaison d'empreintes de l'ensemble base/auth/fichiers : NON PROUVÉ.

## Lot réellement non publié

Le site public répond HTTP 200 et expose `data-commit-sha=d6cbba417c1a5ad00bccacf47959874ed304cbd8`, asset `/assets/index-C9KEmiyR.js`. HEAD initial de cette qualification : `40d41f71a`. Arbre de travail initial propre ; cela ne veut pas dire que HEAD est publié.

Comparaison exacte public → HEAD : 12 fichiers, 808 ajouts/30 retraits.

Trois fichiers applicatifs modifiés :
1. `src/features/noyau-passage/pontV2.ts` : coalescence par question, single-flight et délais de réessai.
2. `src/components/cours-en-ligne/ExamenBlancsPassage.tsx` : envoi forcé aux actions de fin/retour réseau.
3. `src/hooks/useApprenantTauxRealisation.ts` : une lecture de profil au lieu de deux.

Les neuf autres fichiers sont documentation, règles, tests ou SQL de revue : SQL auto-exact QRC, fixture et contrat Python, tests de panne/taux, règles et rapports. Aucun changement sous `supabase/` dans cette comparaison. Aucun fichier de location véhicule ou d'attestation dans le delta actuel : ces changements figurent déjà dans l'ascendance du commit public. Cela ne certifie pas individuellement leurs autorisations antérieures.

Auto-correction QRC : le commit porte le titre « Activé auto-correction QRC », mais la lecture du catalogue actuel ne retrouve pas `qrc_auto_exact_match` ; `core_finalize_attempt` ne contient pas le marqueur `auto_exact_match`. Ne pas déduire une installation du titre du commit. Le SQL est dans `docs/sql-revue`, pas dans une migration de déploiement. Aucune installation réalisée ici.

Un patch des deux fichiers centraux de stabilisation a été extrait sous `/tmp/stabilisation-audit/stabilisation.patch` pour inspection, sans application. Publier déploie l'état courant du projet, pas un sous-ensemble sélectionné de fichiers : aucun lot isolé n'a été mis en service.

## Tests effectivement exécutés

- Suite globale : 550 fichiers, 4 680 tests réussis, 3 échoués, 13 ignorés ; durée 285,45 s.
- Échec fixture `/tmp/exam-reset-cancel-reader-fixture.json` absente : fixture recréée uniquement via les 5 scénarios SQL du cluster jetable, tous réussis ; les 2 tests de lecteurs concernés repassent ensuite.
- Deux autres échecs restent : `quiz-module-validation-serveur.test.ts` attend un fragment textuel absent ; `verrouillage-moteur-examen.test.ts` attend « ANCIEN CIRCUIT », libellé retiré. Ils ne sont pas déclarés résolus et aucune assertion n'a été affaiblie.
- Suite ciblée : 77/77 réussis dans 9 fichiers (file V2, panne, reprise/reset, bilan révision durable, signatures/taux, notes QCM/QRC, snapshots, exports).
- Panne : 10/20/30 candidats fictifs, 3 QRC chacun, derniers textes relus dans le faux serveur ; six minutes accélérées, 90 réponses finales et 90 écritures effectives. Ce sont des simulations Vitest, pas 30 navigateurs autonomes ni un vrai serveur arrêté six minutes.
- Rafraîchissement du simulateur après fin de l'appel en vol : réussi. Destruction du navigateur pendant un appel, stockage navigateur refusé/saturé, deux onglets indépendants et arrêt/redémarrage réel d'une cible intégrée : NON PROUVÉS dans cette passe.
- Compilation : aucun build manuel lancé (exécuté par le système). Le journal était absent au premier contrôle, puis le contrôle final a constaté `build OK` à 23:26:50 et 23:27:38 UTC. Compilation automatique actuelle réussie ; cela ne prouve pas les parcours E2E.
- Scan de sécurité consulté : scans marqués périmés ; huit constats base (six avertissements, deux informations). Aucun scan frais effectué puisque publication déjà bloquée ; aucune certification de sécurité complète.

## Contrôle réel avant/après, SELECT uniquement

Cohorte explicite : EB5/EB5-TAXI non-test, début le 12 novembre UTC, remise avant 20:00 UTC. Première requête utilisant des IDs minuscules a retourné zéro : résultat rejeté comme preuve, IDs réels identifiés avant les mesures suivantes.

Deux lectures successives sur la cohorte correcte donnent les mêmes comptes et empreintes MD5 déterministes :

| Objet | Lignes | Empreinte avant = après |
|---|---:|---|
| Copies/snapshots | 216 | `1af68ea033051c525cb4caacec4f7b59` |
| Notes | 216 | `0919f9ac18cabbd843034531cc4af355` |
| QRC | 488 | `a5891cb521e1b86e679d51a8b03d2107` |
| Réponses | 3 328 | `bbb6d72ebd0e6db42909727281b15f4e` |

Cela prouve la stabilité de cette cohorte entre les lectures, pas la restauration ni l'absence de perte globale passée. Aucune donnée individuelle en clair n'est exportée dans ce rapport.

## Santé constatée

Mémoire 63 puis 65 %, disque 36 %, connexions 37 puis 36/90, base 2,03 Go, aucun épuisement récent retourné. Transactions annulées cumulées 607 puis 613 ; origine non attribuée. Aucune amélioration de vitesse imputée au correctif non publié.

## Risques résiduels du code, inspection seulement

`ecrireFile` ignore les erreurs de stockage et garde alors uniquement la mémoire : fermeture/rechargement peut perdre une réponse si le stockage échoue. Le stockage commun `noyau_v2_answer_queue_v1` et le verrou en mémoire ne prouvent pas l'exclusion entre deux onglets. Le délai annoncé 30 s atteint 39 s avec la gigue. Le redémarrage remet à zéro les délais en mémoire. Ces points interdisent une promesse absolue « aucune perte » à partir des seuls tests actuels ; aucun correctif supplémentaire non qualifié n'est appliqué ici.

## Procédure restante réalisable

1. Accès nécessaire à l'inventaire réel et à un export complet produit. Aucun nouvel audit SQL ne peut remplacer cet accès absent. Le chemin produit est More → Database → Manage → Settings → Export data ; seule la page Backups fournit les timestamps. Pas de demande à l'utilisateur de refaire les vérifications déjà faites.
2. Export complet + copie séparée des fichiers privés, cible indépendante possédée par le projet, restauration hors production, paramètres de connexion restaurés séparément, connexion et empreintes vérifiées. Un remix seul ne copie pas les données.
3. Qualification du stockage refusé, deux onglets, destruction en vol et E2E 10/20/30 sur cible indépendante ; traitement des deux tests restants et scan actuel. Compilation automatique déjà vérifiée.
4. Confirmer le lot exact à publier. Jusqu'à satisfaction de toutes ces conditions : NO-GO, pas de publication ni migration réelle.
## Mise à jour 13/11/2026 ~01:15 UTC — obstacles techniques corrigés (aperçu seulement)

Statut : **NO-GO maintenu** (restauration complète non prouvée). Aucune écriture réelle, migration, restauration, publication ni dépense.

Corrigé dans le code :
- File V2 (`pontV2.ts`) : repli localStorage → sessionStorage → mémoire, état sondé dès l'ouverture ; une réponse ne sort de la file qu'après confirmation serveur ; chaque modification relit la file partagée (identifiant unique par élément, valeur la plus récente gagne) ; un seul envoi pour tout le navigateur (Web Locks) ; appel figé coupé à 20 s ; délai de nouvel essai plafonné à 30 s gigue comprise.
- Écran d'examen : indicateur « pas encore confirmée par le serveur » au lieu de « Sauvegardé », alerte rouge + bouton « Réessayer l'envoi maintenant » si stockage refusé/plein, confirmation du navigateur avant fermeture dans ce cas.
- Les deux anciens échecs : assertions périmées remplacées par les règles actuelles ; la donnée d'essai fictive du test de remise à zéro est rangée dans `src/test/fixtures/` (régénérée par 5 scénarios SQL sur base jetable locale, PASS).

Preuves :
- Suite complète : 550 fichiers, 4 704 tests réussis, 0 échec, 13 ignorés. Construction : OK.
- 16 tests dédiés (stockage refusé/plein/inaccessible, ouverture, deux onglets, envoi en vol puis fermeture, appel figé, panne 6 min) + 5 tests d'indicateur.
- Vrai Chromium (faux serveur, toute autre requête vers la base bloquée : 0) : Web Locks présents ; deux onglets → 3 valeurs exactes, 3 écritures ; fermeture d'onglet pendant l'envoi → valeur conservée, 1 seule écriture ; localStorage plein → état « session », réponse retrouvée après F5 puis enregistrée ; tout stockage refusé → état « mémoire », réponse gardée jusqu'à confirmation.
- Scan de sécurité frais (13/11 00:51 UTC) : 6 avertissements + 2 informations, tous préexistants (règles d'accès de tables/fichiers) ; le lot ne change aucune règle d'accès.
- Lot public→aperçu : 5 fichiers applicatifs (`pontV2.ts`, `ExamenBlancsPassage.tsx`, `AnswerSaveIndicator.tsx`, `answerSaveIndicatorModel.ts`, `useApprenantTauxRealisation.ts`), aucune fonctionnalité concurrente ; SQL auto-QRC uniquement document de revue non installé.

Toujours bloqué : aucun outil ne liste les sauvegardes quotidiennes, ne lance un export complet (base + comptes + fichiers) ni une restauration vers une cible isolée. Sans cela, la restauration reste NON PROUVÉE. Non testé : vrai serveur arrêté 6 minutes et 10/20/30 vrais navigateurs connectés (impossible sans écrire en production).
