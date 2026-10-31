# Kevin FERNANDES — réparation ciblée du 31 octobre 2026

## Résultat et portée
Accord propriétaire à 16:51 UTC. Aucun nouveau déploiement. Réparation effective de l’introduction dans les données hébergées ; droits individuels enregistrés, interface d’accès préparée et testée dans l’aperçu. Les nouveaux droits ne seront consommés sur le site publié qu’après publication autorisée.

## Avant / après par module attribué
| Module | Avant | Après |
|---|---|---|
| 26 Introduction e-learning | Ligne validée le 15/09 à 07:44:12 UTC, score 9/10, mais réponse Q1 absente du détail et du quiz soumis ; écran À reprendre, 1/2 quiz | Réponse initiale **A** retrouvée dans journal du 15/09 à 07:09:17.566494 UTC et restaurée ; mêmes date et score 9/10 ; écran Terminé, 2/2 quiz. Réponse récente **B** reste dans la révision, non remplacée |
| 2 Cours et exercices VTC | Terminé, 819/819 réponses renseignées, score 819/819 | Inchangé, accessible |
| 3 Formules | Terminé, 26/26 réponses renseignées, score 26/26 | Inchangé, accessible |
| 4 Bilan exercices VTC | Terminé, 716/716 réponses renseignées, score 716/716 | Inchangé, accessible |
| 35 Examens blancs VTC | Pas de validation du module ; EB2 6 matières faites, G(V) sans copie ; compteur 5/6 EB | Toujours non terminé ; droit d’accès individuel. Reprise préparée ouvrant **G(V) seule**, 20 minutes, sans rejouer les six matières soumises |
| 5 Bilan examen VTC | Non terminé ; bloqué par module 35 | Toujours non terminé ; droit d’accès individuel. Ouverture réelle du bilan et affichage des questions vérifiés en aperçu |
| 8 Pratique VTC | Terminé, 99/99 réponses renseignées, score 75/99 | Inchangé, accessible |

Compte : liste attribuée **[26,2,3,4,35,5,8]** inchangée, accès jusqu’au 31/01/2027. Historique des modules 50 et 70 conservé mais aucune nouvelle attribution ajoutée.

Écran : **4/7 → 5/7** modules réellement prouvés ; modules 35 et 5 restent à compléter. Ce compteur n’est pas une validation générale ni une modification des heures ou des jalons figés.

## EB2 : corrections déjà terminées avant cette intervention
- Lecture à 16:52–16:53 : **14 QRC enregistrées, zéro en attente**. Aucun appel IA relancé, aucune nouvelle note attribuée.
- Notes serveur définitives : A/T3P **13/20**, B/Gestion **12/20**, D/Français **11/20**, F(V) **14,5/20** ; C **12/20**, E **9/20** dans leurs copies enregistrées.
- F(V) remis le 31/10 à 13:54 UTC ; corrections IA achevées à 14:22 UTC. Barème quatre QRC de 2 points : 0,5 + 2 + 2 + 1, justifications enregistrées.
- **G(V) aucune réponse, aucun résultat, aucun chronomètre enregistré** : aucune tentative fabriquée.
- Défaut de navigation reproduit : reprise complète choisissait T3 et proposait six matières à faire malgré cinq matières soumises en T2. Correction limitée aux dossiers ayant un droit serveur individuel : ne proposer que les matières jamais remises, sans transférer de notes entre tentatives.

## EB1 : blocage restant, pas de fausse réconciliation
L’ancienne copie affichée et le moteur natif ne contiennent **pas les mêmes réponses**. Les snapshots de questions correspondent, mais les valeurs des réponses divergent. La comparaison a été exécutée sur les copies réelles dans le navigateur admin : chaque matière affichée T3/T4 est `non_fiable` par rapport au moteur.

| Matière | Note ancienne affichée/enregistrée | Note moteur sur réponses différentes |
|---|---:|---:|
| A T3P T4 | 13,5, encore en attente QRC | 7 |
| B Gestion T3 | 12, encore en attente QRC | 10 |
| C Sécurité T3 | 8 | 8 |
| D Français T3 | 15, encore en attente QRC | 10 |
| E Anglais T3 | 10 | 9 |
| F(V) T3 | 18, encore en attente QRC | 7 |
| G(V) T3 | 16, encore en attente QRC | 8 |

Les cinq anciennes matières QRC conservent des corrections déterministes non validées par un formateur. Leurs copies T3/T4 n’ont pas de preuve de soumission de même tentative permettant le rattrapage IA historique normal. Copier les notes moteur ou retirer les marqueurs d’attente déclarerait correctes des preuves différentes. Aucune copie, note, réponse ni tentative EB1 modifiée. La correction doit porter sur les copies historiques exactes ; ce chantier reste ouvert, sans bloquer les accès accordés.

## Données et sécurité
- Migration additive 0234 : `module_acces_derogations`, lecture propriétaire/admin, ajout administratif uniquement ; aucun accès anonyme. Sept droits pour Kevin, **zéro droit pour un autre élève**.
- Première restauration SQL refusée silencieusement par protections des quiz validés ; pas de contournement ni de modification des triggers. Restauration ensuite exécutée avec la session admin propriétaire existante, comparaison de version et relecture réussie.
- Journal `audit_journal` : anciennes lignes complètes et origine de la réparation conservées ; sept événements de droits.
- Aucun accès au compte Kevin, aucun mot de passe lu, aucune session élève invalidée ; aperçu administrateur du dossier réel uniquement.

Empreintes avant/après strictement identiques :
- 47 résultats quiz : `89d58ce74f8a3f9123c2cefb19630db3`.
- Tentatives/snapshots : `cbddd1ea0ecd7366ba8118875f0030ad`.
- Signatures : `d41d8cd98f00b204e9800998ecf8427e`.

Les empreintes introduction/réponses diffèrent uniquement suite à la restauration annoncée ; score et date de validation relus identiques. Révisions récentes conservées.

## Fichiers modifiés
- `drizzle/migrations/0234_individual_module_access_derogations.sql`.
- `src/lib/moduleAccessDerogation.ts`.
- `src/pages/CoursPublic.tsx`.
- `src/components/cours-en-ligne/ExamensBlancsPage.tsx`.
- `src/test/module-access-derogation.test.ts`.
- Règles `AGENTS.md`, `src/lib/AGENTS.md`, feuille de route et ce rapport.

## Contrôles exécutés / limites
- **56 tests PASS**, sept fichiers : accès individuel, autre élève inchangé, non-attribués exclus, G(V) seule, preuves serveur, affichage, sélection par tentative, snapshots figés.
- Contrôles automatiques : dernier `build OK` à 17:07:49 UTC.
- Navigateur Chromium, session propriétaire admin : introduction 5/7 ; ouverture du bilan réel ; reprise EB2 affiche G(V) seule avec bouton démarrer actif. Aucun clic démarrer, aucune soumission.
- Capture de G(V) réellement affichée inspectée visuellement.
- **NON PROUVÉ** : connexion autonome Kevin, soumission complète de G(V), corrections historiques EB1, appareils physiques, nouvelle version en production (aucune publication).

## Reste
1. Publication des accès préparés : attend confirmation explicite.
2. EB1 : correction des copies historiques exactes, sans emprunter les notes du moteur ni inventer une preuve de soumission.