# Étapes 2 à 7 — plan unique

Un seul accord pour l'ensemble. Ensuite, les étapes s'enchaînent sans arrêt, sauf si un contrôle échoue. Dans ce cas : arrêt de l'étape concernée, noté dans le rapport, puis on continue avec les autres étapes. Un seul rapport final.

Règles valables pour toutes les étapes : aucune réponse, note, tentative, correction ni question modifiée. Synchronisation intacte : answerPersistence, useAutoSaveReponses, quizResultPersistence, examFinalizationGuard, upsert-reponse-apprenant, persist_answer_batch_v2. Aucun bouton élève retiré (« Refaire les fausses » compris). EB3/EB3-TAXI restent sur l'ancien circuit. Aucun appel Gemini. Aucune écriture dans module_editor_state ni dans quiz_questions_overrides.

## Étape 2 — Passages du nouveau moteur « non fiables » (depuis le 23/09)
- Lecture seule : liste des passages du nouveau moteur incomplets par rapport aux réponses complètes en base, avec le compte exact (environ 105, à recompter).
- Pour ces passages, les écrans admin et élève affichent la note de l'ancien système, avec la mention « note recalculée depuis les réponses complètes ».
- L'écran Correction QRC affiche le texte complet de la réponse (réponses en base), sans coupure.
- Aucune donnée n'est écrite : le repérage se fait uniquement à l'affichage.

## Étape 3 — Même note et même statut dans « Mes notes » et l'écran admin
- Une seule fonction commune donne la note et le statut « En attente de correction ».
- S'il existe un passage fiable dans le nouveau moteur, la note vient de lui. Sinon, l'ancien affichage reste identique.
- Si la lecture échoue, l'écran affiche « Note en attente » au lieu d'une note qui pourrait être fausse.
- À la fin : recomptage en lecture seule des 220 écarts, résultat attendu 0.

## Étape 4 — Statut des modules décidé par le serveur
- Règle 6/6 pour les modules 35 à 38, appliquée par le serveur : il peut seulement écrire « Terminé », jamais faire reculer un statut. Aucun module ne passe « Terminé » sans réponse prouvée ; les 100 % ne sont jamais imposés.
- Côté élève, tout vient du serveur : Terminé, verrou, compteur X/10, badges, coches, liste des examens blancs.
- Réponses présentes mais module pas encore « Terminé » : l'écran affiche « Validation en cours ».
- Nombre de quiz attendus = liste réelle des quiz du module.
- Un examen blanc n'est « réalisé » que si toutes ses matières sont remises.
- Aucune réparation au chargement, aucune donnée historique touchée.

## Étape 5 — Même cours pour l'élève et pour l'admin
- L'élève voit le même contenu que l'admin : la version enregistrée sur le serveur.
- Si le contenu ne peut pas être chargé : message « Contenu indisponible » et bouton Réessayer, jamais un cours vide ou ancien.
- Côté admin : bandeau « brouillon local non enregistré » quand l'écran montre une copie locale différente de celle du serveur.

## Étape 6 — Les 8 questions en double des Bilans (lecture seule)
- Liste des 8 questions, avec les Bilans concernés, le numéro, le texte et les différences. Aucune écriture.

## Étape 7 — Essais et publication
- Tests automatiques, dont les nouveaux tests des étapes 2 à 5.
- Essais à l'écran avec le compte TEST élève (sans modifier ses données) et avec le compte admin.
- Publication seulement après 30 minutes sans activité d'élève, puis vérification sur le site en ligne. L'ouverture provisoire 0106 reste en place.

## Fichiers touchés

Nouveaux fichiers :
- `src/lib/noteExamenAffichee.ts` — fonction commune note/statut (étapes 2 et 3)
- `src/lib/passagesV2NonFiables.ts` — repérage à l'affichage des passages non fiables (étape 2)
- `src/lib/moduleStatutServeur.ts` — lecture des statuts serveur pour l'élève (étape 4)
- `src/test/notes-view-source-unique.test.ts`, `src/test/passages-v2-non-fiables.test.ts`, `src/test/statut-modules-serveur.test.ts`, `src/test/cours-identique-eleve-admin.test.ts`
- Une modification de la base (étape 4) : règle serveur 6/6 des modules 35 à 38, qui peut seulement écrire « Terminé » (ajout d'une fonction et d'un déclencheur, sans toucher aux données existantes)

Fichiers modifiés :
- `src/components/cours-en-ligne/NotesView.tsx` (étapes 2 et 3)
- `src/components/crm/apprenant-sections/ResultatsApprenantTab.tsx` (étapes 2 et 3)
- `src/components/cours-en-ligne/ExamenBlancsResultats.tsx` (étape 2)
- `src/components/cours-en-ligne/ExamenBlancsListe.tsx` (étape 4 : « réalisé » seulement si toutes les matières sont remises)
- `src/pages/AdminCorrectionQrcV2Reel.tsx`, `src/features/correction-qrc-v2/noyauReel.ts` (étape 2 : texte complet)
- `src/lib/moduleUnlockLogic.ts`, `src/lib/moduleCompletion.ts` (étape 4)
- `src/components/cours-en-ligne/CoursEnLignePage.tsx` (étape 4 : compteur, badges, verrous)
- `src/components/cours-en-ligne/ModuleDetailView.tsx` (étapes 4 et 5)
- `src/components/cours-en-ligne/modules-config.ts` : lecture seule, pour la liste réelle des quiz (non modifié sauf si nécessaire, et signalé dans ce cas)
- `roadmap.md`

Si un autre fichier se révèle nécessaire, il sera signalé dans le rapport final. Aucun fichier de synchronisation n'en fera partie.
