# Doublons stricts Cours et exercices — contrôle prudent

Demande du 20/11/2026, 10:22 UTC. TAXI/module 10 et VTC/module 2 uniquement.

## Décision : aucune occurrence retirée

**Suppression d’affichage permanente non sûre dans le circuit actuel.** Chaque occurrence dispose de sa propre clé de réponse obligatoire. Masquer Q50 de Gestion, par exemple, laisse sa réponse requise et empêche la remise pour un élève qui ne l’a pas renseignée. Répondre à Q31 n’est pas répondre à Q50. Copier une réponse automatiquement fabriquerait une deuxième réponse ; retirer la question des obligations modifierait dénominateurs/progression/notes. Ces deux solutions sont exclues par la demande.

Aucun code fonctionnel, donnée source, ID, réponse, copie, PPT, autre matière, bilan, examen ou quiz autonome modifié. Seuls tests et rapport enrichis ; aucune publication/déploiement.

## Audit exhaustif des parties affichées

Sources live relues dans `module_editor_state`, ordre module_id ; fusion existante `mergeSourceExercices` puis projections réelles `projectT3pLocalPresentation` et `projectCourseSubjectLocalPresentation` avec leurs règles actuelles. Les suppressions explicites source restent respectées. **508 questions par parcours, 16 parties examinées, 35 838 comparaisons intra-partie.** Aucun doublon entre parties éliminé ou utilisé comme candidat.

Critère de recherche : énoncé (espaces normalisés uniquement), type, choix dans leur ordre/lettres/textes, bonnes réponses et réponse QRC identiques ; vérification des autres champs pédagogiques sur tous les candidats. Date d’édition et identifiant distincts ne sont pas une différence pédagogique. Images et taille comparées séparément. Les trois couples restent identiques même sans normaliser le texte/choix. Parité des objets de questions et de leur ordre prouvée par comparaison automatisée TAXI/VTC ; les JSON globaux diffèrent notamment par les identifiants de cours, pas les contenus ciblés.

| Matière / partie affichée | Identités originales | Énoncé/sujet | Différence d’image/choix/corrigé | Décision |
|---|---|---|---|---|
| T3P P1 | E1-Q26 / E1-Q51 | Missions des chambres des métiers et de l’artisanat | Texte/choix/corrigé A+C identiques ; image utile sur Q26 uniquement | **Conserver les deux** : image Q26 et deux réponses obligatoires indépendantes. |
| T3P P2 | E2-Q70 / E2-Q83 | Accident responsable avec véhicule non assuré | Texte/choix/corrigé B+C identiques ; image utile sur Q83 uniquement | **Conserver les deux** : image Q83 et deux réponses obligatoires indépendantes. |
| Gestion P3 | E62-Q31 / E62-Q50 | Organisme d’immatriculation VTC/TAXI exploitant individuel | Texte/choix/corrigé B identiques ; aucune image sur les deux | **Conserver les deux** : suppression de Q50 bloque la validation si sa réponse est absente. Blocage constaté dans l’écran réel sous transport fictif. |

Les images T3P ont été ouvertes et inspectées : Q26 = tableau des organismes/rôles, Q83 = tableau des conséquences d’un défaut d’assurance. Elles apportent des informations au-delà des choix. Aucun avis sur l’actualité juridique des corrigés ni nouvelle correction appliqué.

**Aucun autre couple strict texte/choix/corrigé intra-partie retrouvé.** Quasi-doublons, variantes de panneaux avec images différentes et divergences de correction conservés. Notamment T3P E1-Q11/Q47 (A+C contre A+C+D), Gestion E62-Q6/Q48 (B+D contre B+D+E+F), et Gestion E61-Q22/E62-Q8 (bénéfice contre abattement) ne sont pas éligibles. Une ressemblance ne suffit pas.

## Effectifs avant → après, identiques TAXI et VTC

| Matière | P1 | P2 | P3 | Total |
|---|---:|---:|---:|---:|
| T3P | 55 → 55 | 67 → 67 | Inexistante | 122 → 122 |
| Gestion | 47 → 47 | 61 → 61 | 38 → 38 | 146 → 146 |
| Sécurité routière | 112 → 112 | 45 → 45 | 83 → 83 | 240 → 240 |

Retraits d’affichage : **0 par parcours**. Denominateurs de remise attachés aux exercices sources : notamment Gestion E62 = 43 questions, même si 38 sont affichées en P3 après répartition locale. Il ne faut pas confondre ces deux nombres.

## Dépendance bloquante exacte

- `ModuleDetailView.tsx:9498–9525` : parcours des QCM obligatoires de l’exercice original, clé `${exo.id}-${q.id}`, refus si une réponse manque.
- `:9570–9595` : détails et totaux originaux pour la sauvegarde de progression ; `:9609–9713` : regroupement des réponses, confirmation puis remise originale.
- `:9045–9061` : navigation vers la question originale, partie affichée puis ancre. Une carte supprimée n’est pas réouverte par ce mécanisme.
- `:10320–10344` : rendu local appelle chaque question sous son exercice original. Les regroupements ne fusionnent pas les obligations ; `:10350–10357` conserve le compteur original.

**Option technique future sûre à étudier :** réduire seulement la répétition visuelle en repliant une occurrence, mais garder sa saisie indépendante accessible ; réouvrir automatiquement sa carte exacte lors d’un manque ou d’une révision, afficher les réponses divergentes, conserver toutes les images et les identités. Cela ne constituerait pas une suppression d’obligation. Non implémenté ici : ne pas présenter une simple carte masquée comme une déduplication sûre.

## Tests réellement exécutés

- **59 tests Vitest PASS** : 39 présentation Gestion/Sécurité, 16 T3P, quatre protections des obligations distinctes E62-Q31/Q50. Tests concrets : 38 affichées/43 originales, deux clés distinctes, aucune réponse à Q50 fabriquée par Q31.
- **12 parcours fictifs Playwright PASS**, TAXI/VTC × PC 1280×1800/mobile 390×844, trois familles :
  1. Gestion/Sécurité : toutes les six parties, 386 identités uniques, saisie déplacée sous clé originale, remise 43/50, rechargement et relecture.
  2. T3P : réponses déplacées, remises originales séparées, scores 50/100 sur fixture réduite, reprise et deux Q59 distinctes. Fixture réduite, pas parcours intégral de 122 vraies questions.
  3. Doublon obligatoire Gestion : Q31 déjà répondue, Q50 vide → refus de remise et navigation vers Q50 ; réponse explicite à Q50 → remise complète 43 réponses, puis relecture après rechargement des deux réponses indépendantes.
- Première préparation du cas manquant par modification après ouverture a échoué (autosave de l’ancien état) ; remplacée par fixture manquante **dès l’ouverture**. Première assertion de la réponse exigeait une chaîne au lieu de l’ensemble restauré ; corrigée. Les quatre exécutions finales du scénario ont réussi, seuls résultats finaux comptés PASS.
- Captures PC/mobile observées : Q50 non répondue en rouge, T3P Q59 distinctes, Gestion/Sécurité après sauvegarde/remise. Certains médias sont bloqués par le confinement du navigateur fictif (« Image non disponible ») : rendu réseau de toutes les images dans ce parcours **NON PROUVÉ**, deux images candidates inspectées séparément depuis l’audit existant. Aucun retrait d’image effectué.
- Tous appels distants bloqués par Playwright et transports fictifs ; aucune session ou écriture élève réelle. Tests fictifs ≠ vérification de droits ou du serveur réel de production.
- Empreintes des JSON sources avant/après inchangées : VTC `0e2a131d7cccd0dab4a601058b873627`, TAXI `537c2a7ec9498ac310088cfee0b6bc81`. Identiques au corpus du contrôle précédent. Aucune perte de contenu ou écriture réelle causée par cette intervention ; pas d’empreinte intégrale de tous les historiques vivants revendiquée.
- Journal de compilation : `build OK` après l’ajout du paramètre de fixture. Aucun changement de règle serveur, migration ni déploiement.

## Fichiers de cette intervention

- `src/test/course-duplicate-obligations.test.ts` : quatre tests de protection.
- `src/test/course-subject-local-browser/module-harness.tsx` : paramètre test-only `missingDuplicate`, aucune modification du fonctionnement applicatif.
- `src/test/course-subject-local-browser/check_required_duplicate.py` : scénario reproductible sans transport réel.
- Ce rapport, annexe de comparaison intra-partie et suivi dans `roadmap.md`.