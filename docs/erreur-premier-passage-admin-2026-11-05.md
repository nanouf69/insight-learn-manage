# Erreur premier passage admin — 05/11/2026

## Livré en aperçu, non publié
La liste des questions de ModuleDetailView, normale et plein écran, affiche le taux global JOUR/SOIR, n/N, « Aucune réponse » si aucune preuve exploitable et un avertissement de taux partiel pour les réponses non prouvées. Lecture sur ouverture du quiz, actualisation manuelle ; aucun polling ajouté, aucune migration ou écriture pédagogique.

## Preuve retenue
Inscription hors liste d'attente, session et dates individuelles couvrant le jour Paris ; sessions passées/futures/annulées/terminées et comptes techniques exclus. Soir détecté via créneaux, heure enregistrée ou nom explicite, sans dépendre du statut « planifiee » pour les sessions en cours. Élève dédupliqué au global ; double inscription JOUR/SOIR signalée séparément.

Question identifiée par module/exercice/id et énoncé exact. Partage uniquement par quiz_question_bindings quiz/section explicite, jamais par texte seul. Première tentative explicite = 1 et remise datée ; premier choix journalisé identique à la réponse remise, corrigé enregistré dans la preuve module terminée compatible, aucune seconde tentative antérieure à cette preuve. Si premier choix changé, corrigé historique absent, QRC sans correction individuelle ou identité divergente : exclu + limite, aucun calcul depuis la clé actuelle. Les passages non remis sont signalés comme non prouvés, pas transformés en mauvaises réponses.

Limite importante : cette méthode ne couvre pas toutes les banques anciennes ou les corrections des premiers choix modifiés ; le taux est explicitement partiel. L'heure de remise sert à comparer les sources partagées : un ordre de premières réponses différent non démontré ne doit pas être interprété comme prouvé. Pas de calcul des examens blancs depuis leur liste séparée.

## Vérifications réellement effectuées
- 28/28 Vitest PASS : 14 calcul premier passage + 9 intent sauvegarde admin + 3 recherche focus + 2 recherche projection.
- Navigateur avec session administrateur réelle : cours > modules > VTC > quiz Développement Commercial > question marketing ; première lecture et actualisation manuelle. Q1 : **0 % (0/2), 26 apprenants exclus non prouvés, JOUR 0/2, SOIR 0/0**. L'absence de réponses soirée prouvées ne signifie pas absence d'inscrits soirée.
- États refus/lecture non confirmée visibles au lieu de faux zéro ; aucune erreur JavaScript observée. Dernier journal build OK.
- Petit écran : liste partiellement masquée par la navigation latérale existante ; validation complète mobile NON PROUVÉE, rien modifié hors périmètre.
- Pas de publication, de migration, de mail/SMS/IA, de modification question/réponse/note/progression/émargement/session. Ancienne suite générale déjà connue avec cinq échecs hors périmètre non rejouée ici.

## Fichiers
ModuleDetailView.tsx : intégration d'affichage uniquement. Nouveaux premierPassageStats.ts, premierPassageStatsRead.ts, QuestionFirstPassageRate.tsx et premier-passage-stats.test.ts. Règle archi dans AGENTS, décision métier en mémoire et tâches dans roadmap.