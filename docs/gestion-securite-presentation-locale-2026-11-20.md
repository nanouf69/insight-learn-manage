# Gestion et Sécurité routière — aperçu local du 20 novembre 2026

## Résultat
14 transferts visuels par parcours, 28 occurrences TAXI/VTC; aucune écriture Cloud, aucun déploiement, publication ou envoi. Seulement Cours et exercices modules 2/10. Les six PPT actifs ont été téléchargés et intégralement extraits : Gestion 36+22+27 = 85 diapositives; Sécurité 32+26+25 = 83, soit 168. Questions effectivement hydratées via mergeSourceExercices : 146 Gestion et 240 Sécurité par parcours (386), identiques champ pour champ TAXI/VTC. Les listes brutes contenaient des tombstones : jamais réintroduites.

## Tableau des déplacements appliqués dans les deux parcours
Les numéros Q sont les IDs originaux, jamais les nouveaux rangs affichés. Diapositives = position physique dans le fichier. G1=GESTION_1SUR3_v16.pptx, G2=GESTION_2SUR3_v12.pptx; S1=C_Securite_Routiere_FINAL_1.pptx, S2=C_Securite_Routiere_FINAL_2.pptx, S3=SECURITE_ROUTIERE_3SUR3_v2.pptx.

| Matière | Origine | Destination | Question / motif | Preuve PPT |
|---|---|---|---|---|
| Gestion | P3 exo62 Q8 | P2 | Calcul micro-BIC, abattement absent de P3 (versement libératoire différent) | G2 d12–13 |
| Gestion | P3 exo62 Q32 | P1 | Obligation facture/note absente de P3 | G1 d22 |
| Gestion | P3 exo62 Q46 | P2 | CET explicitée ici, absente de P3 | G2 d16,19 |
| Gestion | P3 exo62 Q53 | P1 | Régime agricole MSA et général explicités ici | G1 d6 |
| Gestion | P3 exo62 Q54 | P2 | Développement exact URSSAF absent de P3 | G2 d19 |
| Sécurité | P2 exo81 Q43 | P3 | Comportements éco-conduite absents de P2 | S3 d7 |
| Sécurité | P2 exo81 Q44 | P1 | Vérifications niveaux/pneus absentes de P2 | S1 d6 |
| Sécurité | P2 exo81 Q45 | P3 | Définition éco-conduite absente de P2 | S3 d7 |
| Sécurité | P2 exo81 Q46 | P3 | Frein moteur, huile qualité absents de P2 | S3 d7 |
| Sécurité | P2 exo81 Q47 | P3 | Calcul prochaine échéance CT annuel | S3 d9 |
| Sécurité | P2 exo81 Q48 | P3 | Fréquence CT annuel absente de P2 | S3 d9 |
| Sécurité | P2 exo81 Q49 | P3 | Contre-visite défaillance majeure absente de P2 | S3 d11 |
| Sécurité | P3 exo82 Q17 | P2 | Stationnement réservé TAXI, catégorie/sanction absentes de P3 | S2 d20,22 |
| Sécurité | P3 exo82 Q55 | P2 | Effet alcool/téléphone sur réaction non explicité en P3 | S2 d4 |

## Cas conservés et réserves
- Gestion Q61-28/30 **restent P2** : sa diapositive 19 enseigne réellement le recouvrement URSSAF. Deux propositions initiales d’audit rejetées après contre-vérification XML complète.
- Gestion comptabilité P1 et marge/BIC P3 maintenues lorsqu’elles sont déjà enseignées dans la source. Aucun reclassement par simple titre.
- Sécurité P1 contient réellement plusieurs parties : distances, alcool, CT, écoconduite, permis y sont enseignés. Aucune sortie de P1 justifiée; P2 alcool/sanctions restent également.
- Q82-69 ligne jaune : destinations P1/P2 toutes deux possibles, maintien conservateur. Q80-71,79,108,113 images lues, aucun transfert supplémentaire étayé.
- Q62-32 formulation inconditionnelle vs facture sur demande/25 € TTC/client pro; Q62-46 obligations avec exonérations; Q81-43 compte-tours non explicité et Q82-55 cannabis pas nommé dans d4 : réserves de contenu, aucune réécriture ni correction de clé autorisée.
- Doublons et divergences sont documentés dans les annexes, **aucun supprimé**. Exclusions historiques inchangées.
- Audit exhaustif des listes/textes et 168 diapositives, images candidates et médias bitmap PPT inspectés; pas de rendu de toutes animations/couches cachées, ni vérification visuelle individuelle de toutes les images externes. Aucun transfert image-seule incertain.

## Architecture et périmètre
Projection indépendante de T3P : chemins exacts des trois supports + IDs cours et exercices + signature exacte énoncé/propositions/corrigé/image/réponse QRC conditionnent l’application. Support personnalisé/remplacé, identité interne dupliquée : rendu original. Question modifiée ou copie figée différente : question reste dans sa partie source. Aucun tableau source remplacé. Chaque carte reçoit son exercice original, clé module/exercice/question, index original, image, verrous, correction et état enregistré. Libellés « Gestion P3 · Q8 » etc. évitent collisions avec Q8 native.

Sauvegarde/remise : tableaux complets originaux; 45/58/43 Gestion et 111/50/79 Sécurité restent les dénominateurs, pas les effectifs visuels 47/61/38 et 112/45/83. Boutons de validation indiquent l’exercice d’origine. Questions manquantes/relecture rejoignent la partie affichée. Pages, historique, progression, scores et jalons suivent leurs fonctions originales inchangées.

## Vérifications exécutées
- **69 Vitest PASS** : 39 nouveaux tests (14 transferts × TAXI/VTC, conservation 386 clés, signatures modifiées, collision, supports personnalisés, exclusions, modules hors périmètre) + 30 tests T3P/ordre cours/protection Bilans.
- **12 parcours Playwright PASS** : 4 parcours complets TAXI/VTC × PC1280×1800/mobile390×844; chacun inspecte les six parties et 386 clés uniques, sauvegarde déplacée, remise Gestion P3 43 questions et Sécurité P2 50 questions, relecture après rechargement. 8 parcours négatifs : absence Q62-8 → bonne partie sans remise; refus42501 → réessayer, copies in_progress.
- Faux transports uniquement, sorties navigateur externes bloquées. Pas de vrai élève usurpé. Ces tests ne prouvent pas une connexion Auth ou RLS de production; aucune modification serveur nécessaire/revendiquée.
- 8 empreintes modules2/10/4/9/13/25/32/39 identiques avant/après. **1 319 copies** originales/révisions ciblées, empreinte globale identique `639597734cade800c991cac262b111d9`.
- Construction automatique aperçu OK. Images Cloud échouent dans le harnais confiné intentionnellement; les images candidates ont été lues séparément avec les droits existants.
- Premiers essais : fixture partagée mutée entre tests corrigée, selectors mobiles/espacement corrigés; derniers rejouages seuls déclarés PASS. Aucune règle métier adaptée pour faire passer un test.

## Fichiers
- src/lib/courseSubjectLocalPresentation.ts : projection pure avec garde supports/contenu.
- src/lib/courseSubjectLocalRules.ts : 14 règles d’affichage sourcées.
- src/components/cours-en-ligne/CourseSubjectQuestionParts.tsx : présentation sans effet.
- src/components/cours-en-ligne/ModuleDetailView.tsx : branche locale, rendu original, navigation et commandes; T3P conservé.
- src/test/course-subject-local-presentation.test.ts et src/test/course-subject-local-browser/{module-harness.html,module-harness.tsx,audited-course-fixture.json,check_flow.py,check_refusals.py}.
- AGENTS.md, roadmap.md, ce rapport et annexes audit-gestion-securite-20261120 (contenus pédagogiques seuls, aucune identité/réponse élève).
