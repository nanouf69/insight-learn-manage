# Régression module 7 — 28 octobre 2026

## Cause et correction

Cause prouvée dans `ModuleDetailView.tsx` : le panneau `CoursQuizCommunes` était placé dans l'en-tête partagé sous la seule condition `module.id === 7`. Tous les cours/quiz commençaient donc par les mêmes deux activités ; leurs propres questions étaient toujours rendues plus bas. Aucun retour global vers ce panneau ni corruption des questions n'a été identifié pour cette régression.

Correction ciblée :
- Retrait du panneau communes de cet en-tête.
- Sélection du panneau par identité d'exercice existante : **7020 → Métropole**, **7021 → ZUPC**, aucun panneau ailleurs.
- Retrait du bandeau global des activités du module 7, sans retirer les protections serveur ni changer les exigences de validation.
- Clé du panneau par compte + exercice : la fenêtre et son état ne sont pas réutilisés entre les deux communes.
- Liste admin Édition conservée, quiz historiques et leurs propres questions toujours présents dans les étapes communes.

Fichiers : `ModuleDetailView.tsx`, `equipements-taxi-locale/CoursQuizCommunes.tsx`, nouveau lecteur d'affichage `src/lib/module7ActivitiesDisplay.ts`, test `quiz-communes-m7.test.ts`, règle `AGENTS.md`.

## Vérification réelle de l'affichage

Navigateur connecté **administrateur**, onglet Aperçu apprenant du module 7, source serveur effective lue par l'écran. Aucune réponse soumise, aucune écriture pédagogique ni modification de permissions. Ce n'est **pas** un parcours de compte élève technique.

Sur 1280×1800 et 375×1800, clics dans la progression :

| Étape | Questions propres affichées | Panneau additionnel |
|---|---:|---|
| Consulats 7002 | 29 | Aucun |
| Hôpitaux 7003 | 30 | Aucun |
| Musées 7004 | **41** | Aucun |
| Métropole 7020 | 10 historiques | Métropole seule, fenêtre ouverte : **58 questions** |
| ZUPC 7021 | 6 historiques | ZUPC seule, fenêtre ouverte : **24 questions** |
| Jeu Légende 17 | lien propre au jeu | Aucun |

Le menu mobile a été ouvert réellement. Les fenêtres communes ont été ouvertes puis fermées par leur bouton, sans réponse ni résultat transmis. Chaque sélection a été contrôlée par comptage des questions et absence/présence exacte des deux panneaux.

Captures avant/après et script : `/tmp/browser/m7-regression/` (`before.png`, `musees-1280.png`, `musees-375.png`, fenêtres `communes-58-*` et `communes-24-*`, `check.py`, `result.txt`).

## Tests et limites

- **PASS** : 17 tests exécutés, 3 fichiers (`quiz-communes-m7`, `merge-source-exercices-vide`, `activites-module-eleve`). Routage IDs exacts, restauration 41 questions Musées, exclusion des nouvelles exigences/volumes pour modules déjà terminés.
- **PASS** : compilation automatique, dernier signal `build OK` après changements.
- **NON PROUVÉ** : compte technique élève authentifié module 7 ; les comptes techniques existants retrouvés ont uniquement des parcours VTC sans autorisation module 7. Aucun droit ni compte n'a été modifié pour simuler cet accès.
- **NON PROUVÉ** : validation serveur d'un quiz réel, Précédent/Suivant sur quiz validés, liens directs/rechargement côté élève, changement de joueur et courses asynchrones. Les tests ici ne fabriquent aucune validation pour débloquer ces parcours.
- Les textes à trous et l'identité 24 h du **projet externe Lyon Explorer Map** restent bloqués par son accès lecture seule depuis ce projet. Rapport distinct conservé ; ils ne sont pas annoncés corrigés.

## Production

Correctif présent uniquement dans l'aperçu FTRANSPORT. **Aucune publication globale**, aucun déploiement de fonction, aucun changement de base, réponses, notes, statuts, jalons ou snapshots. La production conserve le comportement antérieur tant qu'une livraison isolée n'est pas autorisée et vérifiée.