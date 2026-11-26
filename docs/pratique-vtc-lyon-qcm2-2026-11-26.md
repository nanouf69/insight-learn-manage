# Pratique VTC — PDF Lyon et QCM 2, 26/11/2026

## Correction prioritaire 09:46 UTC — banque préparée, non intégrée
- Tout rattachement du QCM au module 8 est retiré, y compris le bouton facultatif, les imports de banque, le prédicat module/exercice et les exceptions du moteur de quiz/progression.
- Le module importe seulement pratiqueVtcLyonRessource.ts : PDF sur cours existant, sans ajout/modification des identités de cours ou exercices. La projection de lecture ne dépend plus, même indirectement, de QCM2_LYON.
- Les 39 questions restent inchangées dans src/components/cours-en-ligne/exercices/pratique-vtc-lyon-qcm2.json ; export autonome src/lib/pratiqueVtcLyonQcm2.ts. Le composant de revue PratiqueVtcLyonQcm2.tsx est conservé mais n’est importé/monté par aucun écran ni route. **La banque ne peut donc pas actuellement être ouverte dans l’application ; elle est préparée, non intégrée.** Aucun lien associé à un élève n’est ajouté.
- Contrôle rg : aucune occurrence QCM2_LYON/estQcm2Lyon/PratiqueVtcLyonQcm2/826110201 dans ModuleDetailView, le support, le registre ou la progression. Occurrences restantes : banque, export autonome, composant non monté et tests.
- 58/58 tests ciblés exécutés ; build OK 09:47:56 UTC ; diff --check OK. Chromium PC/mobile avec transports fictifs : bouton QCM absent, aucune ligne pour ce quiz, 7 cours/1 quiz historique conservés, PDF rendu et téléchargement identique, pas de débordement. Aucun test sur compte réel ni aucune mutation de production.
- Aucune publication, migration, sauvegarde apprenant, tentative ou communication. Les sections précédentes ci-dessous sont historiques et remplacées par cette correction.

## Rectification du périmètre confirmé à 09:41 UTC — aperçu uniquement
Cette section remplace le raccordement et la persistance décrits dans la livraison précédente ci-dessous (conservée comme historique).
- Le PDF reste une pièce du cours existant : cours Lyon 1785334184827 dans la projection serveur, cours 2 dans PRATIQUE_VTC_DATA. La page supplémentaire de support et l’exercice QCM 2 ont été retirés du modèle requis préparé. Aucun cours/jalon existant n’est réordonné ; les exercices d’origine restent la même référence dans la projection.
- Le QCM 2 apparaît séparément dans Pratique VTC, avec 39 questions retenues après comparaison aux 99 questions existantes ; quatre choix, sélection unique, explication courte. Banque et quiz existant inchangés.
- Entraînement facultatif en mémoire uniquement : fermeture/réouverture dans le même écran conserve les choix, rechargement les remet à vide. Aucun appel de sauvegarde, aucune tentative, aucun score officiel, aucune validation de module. Le contenu et le PDF restent disponibles au rechargement. Cette limitation est volontaire pour respecter « ne crée pas de questions ou de tentatives d’apprenants ».
- Fichiers du delta : ModuleDetailView.tsx, PratiqueVtcLyonQcm2.tsx (nouveau), pratiqueVtcLyonQcm2.ts, pratique-vtc-lyon-qcm2.test.ts, documentation/roadmap/AGENTS. Les autres travaux en attente sont conservés.
- 59/59 tests Vitest exécutés : 46 QCM/projection/résultat local, 3 ancien support VTC, 10 supports pratiques. Build OK, git diff --check OK.
- Chromium PC 1280×1800 et mobile 390×844, vrai ModuleDetailView sur transports fictifs confinés : 39 QCM, absence de champ libre, remplacement de sélection A/B, corrigé 39/39, anciennes lignes inchangées, aucun appel portant l’ID QCM 2, liste des 7 cours et du quiz historique inchangée, rechargement sans écriture. Aucun débordement ni pageerror.
- PDF : HTTP 200 et SHA-256 identique à l’original sur domaine public, aperçu et localhost ; téléchargement exact PC/mobile. Rendu visuellement inspecté PC/mobile. Première capture mobile prise avant le rendu : nouvelle capture après chargement confirme la couverture lisible, aucune correction du lecteur requise. Une lecture urllib a reçu 403 ; nouvelle vérification curl réussie sur les trois origines, sans modification de sécurité.
- Aucun compte réel utilisé, aucune écriture Cloud, aucune migration, publication ou communication. Parcours authentifié officiel non prouvé (limite d’accès précédente maintenue). Les réponses d’entraînement ne sont pas présentées comme persistantes.
- Aperçu dans le module Pratique VTC : bouton « QCM 2 – Examen pratique Connaissance de Lyon », mention « Facultatif · Hors jalons » ; PDF consultable/téléchargeable dans Connaissances Ville de Lyon.

## Livraison précédente, remplacée par la rectification ci-dessus, non publiée
- PDF joint exact (20 pages, 76 questions), ressource CDN : HTTP 200 sur gestion.ftransport.fr, SHA-256 `e5a151ffc9a07b0845986f53980be42dbb06a292e722934b13287c5026560673`, identique à l’original.
- Module 8 : rattachement additif au cours Lyon existant 1785334184827, fichier et titre « Examen pratique – Connaissance de Lyon » ; lecture intégrée et téléchargement explicitement autorisé pour ce fichier seulement.
- QCM distinct 826110201, 39 questions, quatre choix, une seule bonne réponse et explication courte ; aucun QRC. Le quiz serveur actuel 1785332774763 contient **99 questions**, pas 67 ; toutes conservées.
- Source PRATIQUE_VTC_DATA et projection de lecture du module serveur raccordées. La projection conserve les indices des cours et place le nouveau quiz après le quiz historique. Aucun enregistrement de contenu ou réponse en production.

## Comparaison exhaustive
37 objectifs du PDF déjà couverts exclus, avec correspondances vers les questions du quiz sauvegardé. Une question d’adresse ou un distracteur ne suffisent pas à prouver un doublon ; les objectifs nouveaux sont reformulés en QCM.

| Question PDF exclue | Questions actuelles équivalentes |
|---|---|
| 10 | 74 |
| 12 | 75, 94 |
| 13 | 76 |
| 15 | 21, 77 |
| 17 | 78 |
| 18 | 7, 61, 95 |
| 20 | 10, 96 |
| 21 | 53, 67 |
| 22 | 31, 79 |
| 23 | 80, 97 |
| 24 | 81, 98 |
| 25 | 25, 26, 82 |
| 26 | 19, 83 |
| 28 | 29, 88 |
| 29 | 89 |
| 30 | 91 |
| 32 | 99 |
| 34 | 9, 84 |
| 37 | 85 |
| 38 | 35, 86 |
| 39 | 30, 87 |
| 41 | 1 |
| 42 | 4, 48 |
| 44 | 2, 41, 57 |
| 45 | 3 |
| 46 | 18 |
| 48 | 13, 90 |
| 49 | 16, 17, 49, 60 |
| 50 | 24 |
| 51 | 92 |
| 52 | 23 |
| 54 | 22 |
| 56 | 93 |
| 59 | 5, 80, 81, 98 |
| 60 | 70 |
| 65 | 58 |
| 66 | 69 |

Questions retenues du PDF : 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 16, 19, 27, 31, 33, 35, 36, 40, 43, 47, 53, 55, 57, 58, 61, 62, 63, 64, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76.

La Q35 (nommer les musées cités) est retenue : le quiz actuel Q20 demande seulement quel musée n’est pas à Lyon, ce qui n’est pas le même objectif. Les questions 43/47/53/55 utilisent les descriptions du PDF plutôt qu’un « ce monument » sans image. Les conseils de transport sont explicitement attribués au support, sans prétendre constituer une nouvelle vérification juridique. Le maire et les autres objectifs déjà couverts restent dans le quiz historique inchangé.

## Contrôles réellement exécutés
- 57/57 tests Vitest (44 banque/ajout ciblé, 3 ancien support, 10 support pratique), build OK 09:38:44 UTC, diff sans erreurs.
- Vrai ModuleDetailView avec transports fictifs isolés PC 1280×1800 / mobile 390×844 : ouverture QCM, 39 réponses explicites, envoi, confirmation, validation, reload et relecture 39/39, corrigé 100 %, ancien quiz 0 réponse et in_progress intact. Aucun appel de sauvegarde réel.
- PDF dans le cours : rendu réel du fichier téléchargé PC/mobile, téléchargement via bouton et comparaison octet pour octet ; zéro débordement final, zéro pageerror pour les deux parcours.
- Défauts trouvés et corrigés : ancien moteur affichait « plusieurs réponses possibles » et permettait la multisélection ; exception limitée au QCM 2. Colonne de questions et bouton final débordaient sur mobile ; ajustements limités au QCM 2. Fusion des sources plaçait le nouveau quiz avant l’ancien ; ordre corrigé uniquement pour module 8/QCM 2.
- Les images d’anciens supports ont été bloquées par le confinement du test, ce n’est pas un diagnostic de panne en production. Le nouveau PDF était servi intégralement au test et vérifié indépendamment en HTTP réel.
- Session propre du demandeur consultée sans modification : /cours indique accès expiré au 30/04/2026. Parcours apprenant authentifié officiel NON PROUVÉ ; aucun autre compte usurpé/créé.

## Blocage de publication ciblée
La publication actuelle date du 25/11 18:28:55 UTC. HEAD comprend les commits 7880b5850, 40e185670 et 9fe24705c et d’autres travaux non publiés. L’outil disponible publie le projet entier, sans sélection de fichier/commit. Le publier activerait notamment les correctifs I21/file/examens sans revue finale, contrairement à l’instruction du chantier précédent et au « sans changement collatéral » actuel.
**Aucune publication, migration ni écriture de module en production effectuée.** Le PDF CDN est disponible mais le cours public reste inchangé.
Pour livraison : construire une version de publication fondée sur la dernière version publiée, n’y appliquer que le delta de ce commit (ModuleDetailView, pratiqueVtcLyonQcm2, banque JSON et pointeur PDF), vérifier le parcours authentifié puis publier cette version. Ne pas cliquer Publier sur HEAD actuel et ne pas remplacer les travaux préparés. Les garanties de progression des modules déjà terminés restent à confirmer sur cette version avant activation.

## Fusion 26/11 10:00 UTC (remplace la séparation)
- Quiz initial « Quizz Ville De Lyon » (module 8, exercice 1785332774763) : 99 questions en base (inchangées depuis le 20/10). Recomparaison : 37 questions du livre exclues comme doublons d'objectif, 0 formulation identique parmi les 39 retenues.
- Affichage : 99 initiales intactes et dans le même ordre, puis 39 ajouts IDs 100–138 = 138. Ajout d'affichage seulement (fusionnerQuizLyon) ; retirerAjoutsQuizLyon empêche tout enregistrement admin des ajouts en base. Fenêtre autonome supprimée. Aucun jalon, exercice, tentative ou donnée élève créé ; non publié.
