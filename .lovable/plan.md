# Quiz de module : résultat affiché seulement après confirmation serveur + révision séparée

Aucun fichier de synchronisation touché (answerPersistence.ts, useAutoSaveReponses.ts, pontV2.ts, quizResultPersistence.ts, examFinalizationGuard.ts, upsert-reponse-apprenant, persist_answer_batch_v2). Aucune réponse, validation, note ou progression existante modifiée. « Refaire les fausses » reste cliquable partout.

## 1. « OK » seulement après confirmation serveur (bouton « Valider les QCM »)
Ordre actuel : résultat affiché → enregistrement → relecture → validation serveur.
Nouvel ordre :
1. bouton désactivé + texte « Enregistrement en cours… » ;
2. envoi des réponses (enqueueAnswerSave existant) → flushAnswerSavesAndWait → relecture (answersAreEqual) → submitQuizAttempt ;
3. seulement si les 3 étapes réussissent : affichage du résultat (setShowResultsFor), page marquée faite, message vert actuel ;
4. en cas d'échec : réponses laissées à l'écran, pas de résultat, encadré « Vos réponses sont conservées sur cet écran mais n'ont pas encore été confirmées par le serveur. » + bouton « Réessayer la validation » (relance la même séquence).
L'enregistrement partiel de progression (saveModuleCompletion completed:false) reste appelé comme aujourd'hui.

## 2. « Refaire les fausses » sur un quiz déjà validé
Format proposé pour l'identifiant de révision (à valider) :

```text
module_{moduleId}_revision_exo_{exoId}      ex. module_2_revision_exo_61
```

Pourquoi ce format plutôt que `module_2_exo_61_revision` :
- le serveur compte les réponses d'un module avec `module_2_exo_%` (validation automatique à 100 %) ; `…_exo_61_revision` y serait compté, `module_2_revision_exo_61` non ;
- les rapports admin et le rapport d'activité lisent `^module_(\d+)_exo_(\d+)$` : la révision n'y apparaît pas, aucune fausse activité ni double comptage.
Limite : la preuve « au moins une réponse » de save_module_completion lit `module_2_%` ; une révision n'existe qu'après une validation, donc sans effet réel.

Fonctionnement :
- si la ligne du quiz est `submitted`, les réponses de révision partent via le même enqueueAnswerSave, avec l'identifiant de révision ; la ligne validée n'est jamais réécrite ;
- au rechargement, les réponses de révision sont relues et réaffichées par-dessus pour les seules questions en révision ;
- la validation d'origine, sa note, le statut du module et le déblocage ne changent pas ; la révision ne crée aucune note ni validation ;
- quiz pas encore validé : comportement actuel inchangé.

## 3. Journal des échecs de validation
Chaque échec (étape : envoi, relecture, validation serveur) est enregistré dans le journal d'erreurs existant avec élève, module, exercice, étape. Aucun message supplémentaire pour l'élève.

## 4. Liste des 104 quiz complets restés « en cours »
Livrée après l'intervention, en lecture seule (élève, module, exercice), sans aucune validation.

## Tests
- Tests automatiques : ordre (aucun résultat avant confirmation), échec → pas de résultat + bouton Réessayer, révision sur quiz validé → identifiant de révision et ligne validée intacte, journal d'échec.
- Compte TEST uniquement (00000000-…a001), avant production : validation normale, échec simulé, révision + F5.
- Mise en ligne seulement après 30 min sans activité élève.

## Fichiers touchés
- src/components/cours-en-ligne/ModuleDetailView.tsx (bouton Valider, startWrongQuestionRevision, rechargement)
- src/lib/quizAttempts.ts (ajout buildRevisionExerciceId)
- nouveau src/test/quiz-module-validation-serveur.test.ts
- AGENTS.md (une règle)
