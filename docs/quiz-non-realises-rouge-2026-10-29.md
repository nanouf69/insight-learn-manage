# Quiz non réalisés — 29 octobre 2026

## Correction d’affichage
Les cartes des communes (58/24), des équipements TAXI et de pratique TAXI, ainsi que les lignes du bandeau des activités, signalent en rouge une activité connue non réalisée, même facultative. Une activité facultative ne devient jamais obligatoire à cause de cette couleur. Le statut reste à vérifier si la lecture est indisponible ou l’identité absente.

Aucun changement serveur, de réponse, de score, de snapshot, de module validé ou de jalon. Aucune publication.

## Vérifications exécutées
- PASS : 74 tests dans quiz-communes-m7, activites-module-eleve, pratique-taxi-2026 et equipements-taxi-sanctions-resultats.
- PASS : aperçu Admin avec dossier fictif et lectures interceptées, module 7 validé avant ajout, aucune activité réalisée ; parties 32/33 ouvrent respectivement 58/24 questions et les deux cartes ont un contour rouge et un badge « Non réalisé — facultatif ».
- PASS : ouverture téléphone 375 px, aucun débordement du questionnaire ; aucune erreur JavaScript.
- PASS : compilation automatique 09:05:50 UTC.
- NON PROUVÉ : connexion élève autonome et revue de chaque quiz historique masqué. Les limites précédentes du chantier Réalisés restent ouvertes.

La capture initiale montrait « Terminé ». Les règles de source relues ne prouvent pas pourquoi cet état a été présenté sur ce dossier précis : sa réalisation réelle n’a pas été auditée individuellement. Les tests démontrent la séparation dispense/réalisation sur les données fictives, pas un changement de statut de cet élève.