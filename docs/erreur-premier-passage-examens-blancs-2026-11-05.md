# Premier passage — éditeur admin des examens blancs

## État
Ajout en aperçu uniquement, non publié. Aucune migration, modification de permission, de routage, de question, de corrigé, de score ou de preuve pédagogique.

## Fichiers effectivement modifiés
- `src/components/cours-en-ligne/ExamensBlancsEditor.tsx` : indicateur dans chaque question des examens VTC/TAXI n°1–6, lecture lors de l’ouverture d’une matière seulement.
- `src/components/cours-en-ligne/QuestionFirstPassageRate.tsx` : réutilisation des filtres Global/JOURNÉE/SOIRÉE, session par ID, noms/dates ; adaptateur EB optionnel, message « Données insuffisantes » spécifique aux EB. Les calculs des exercices restent inchangés.
- `src/lib/premierPassageExamStats.ts` : calcul pur EB, identités examen + matière + question, déduplication, premières révisions et corrigés figés, exclusions explicites.
- `src/lib/premierPassageExamStatsRead.ts` : lectures paginées administrateur, comptes techniques exclus, vérification du compte au retour ; aucun INSERT/UPDATE/DELETE ni appel de correction IA.
- `src/test/premier-passage-exam-stats.test.ts` : 22 tests de règles et conservation.

## Audit des preuves
Le schéma live utilise `exam_attempts_v2.attempt_id`, non `id`. Questions natives : `matiere:questionId` ; copies importées : identifiant numérique + matière + `source_historique`. Ces imports ne prouvent pas le premier choix. `answer_state` sert uniquement à détecter une réponse existante sans journal, jamais à prouver un premier passage. Les clés courantes et notes globales ne servent jamais à noter une réponse historique.

Les premières réponses natives nécessitent événement revision 0→1, auteur apprenant, identité exacte, choix/énoncé compatibles avec le snapshot et absence de reçu de reprise. Les réponses historiques nécessitent journal du premier choix + première tentative remise + résultat à date exacte et snapshot complet compatible. Sans cette chaîne : données insuffisantes. Les QRC ne sont pas notées par égalité textuelle ni relancées vers l’IA ; sans preuve exploitable elles restent insuffisantes.

## Sessions constatées en lecture seule, 05/11/2026
| Session | Dates | Modalité | Inscrits éligibles |
|---|---|---|---:|
| Session TAXI et TA | 26/10–16/11/2026 | JOURNÉE | 12 |
| Session VTC et TAXI | 02/11–13/11/2026 | JOURNÉE | 16 |
| Session VTC cours du soir | 02/11–13/11/2026 | SOIRÉE | 18 |

Les effectifs ne sont pas les dénominateurs des taux : seuls les premiers choix prouvés entrent dans N. Les doubles inscriptions sont dédupliquées au global.

## Contrôles exécutés
- **PASS : 42 tests ciblés** (22 EB + 20 exercices existants).
- **PASS : 123 tests critiques EB** (8 fichiers : sauvegardes, snapshots, délai, finalisation, notes et QRC).
- **Suite générale exécutée : 3435 PASS, 5 FAIL, 13 ignorés**. Les cinq échecs déjà documentés concernent quatre mocks sans `auth.getSession` et un ancien attendu agenda pour les signatures. Aucun de ces fichiers n’a été modifié.
- **PASS : navigateur administrateur authentifié**, VTC/TAXI EB1, matière développement commercial, sessions réelles, SOIRÉE et session nominative puis JOURNÉE. Les seize questions VTC et TAXI consultées au global affichent « Données insuffisantes » : aucun taux inventé. La session du soir sélectionnée affiche « Aucune réponse » pour cette matière.
- **PASS : indicateur PC/mobile**, 1280×1800 et 390×844 : noms/dates/filtres lisibles, aucun débordement du bloc indicateur et aucune erreur JavaScript. La mise en page préexistante des questions elles-mêmes reste étroite sur mobile ; elle n’a pas été modifiée hors périmètre.
- **PASS : aperçu sans erreur de compilation**, dernière entrée `build OK` 21:59:11 UTC.
- Empreintes avant/après les contrôles navigateur identiques : JSON éditeur EB `477d6062216ce0d98fbe41a340d8fc20`, versions `f1743103fe9c23d34606ab0845f5cf08`.

## Limites et effets préexistants
La consultation complète du CRM déclenche déjà `surveillance_compte_reponses` et `log_error` : ces appels ont été observés et ne proviennent pas de l’adaptateur de statistiques. Il serait inexact de prétendre qu’aucun journal technique existant n’a été alimenté. Aucun appel d’écriture de questions, réponses, résultats ou sessions n’a été observé.

Le taux exhaustif des copies anciennes est non prouvé ; les données manquantes ne sont pas réparées. L’affichage réel d’un taux numérique pour cette matière dans les sessions actuelles n’a pas pu être vérifié, faute de preuves suffisantes ; les valeurs n/N et multichoix ont été testées sur fixtures isolées.

## Publication
**NON PUBLIÉ.** Attente d’une autorisation explicite ; cinq échecs généraux restent hors du périmètre de cette demande. Aucun polling ajouté, aucune modification du polling existant de l’écran élève.