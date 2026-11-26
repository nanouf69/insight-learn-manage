# Pratique VTC — PDF Lyon et QCM 2, 26/11/2026

## Livraison préparée, non publiée
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
