# Audit lecture seule — Questions TAXI vs cours (Nationale P1/P2, Locale Rhône P1/P2/P3)

## Garanties
- Lecture seule stricte : aucune écriture en base, aucun fichier du projet modifié (hors rapport dans /mnt/documents), aucune publication, aucun appel IA, aucun mail/SMS.
- Aucune question, réponse, progression, structure ou autre matière touchée.

## Étapes
1. Inventaire : repérer dans le code et dans `module_editor_state` (version serveur active) les modules TAXI « Cours et exercices » de la Réglementation nationale parties 1 et 2 et de la Réglementation locale Rhône parties 1, 2 et 3, avec leurs exercices et identifiants stables (module, exercice, question).
2. Source du cours : extraire le texte réellement affiché pour chaque partie (diapositives/pages du cours, version active serveur, repli code signalé si utilisé).
3. Comparaison question par question :
   - la question est-elle dans la bonne partie (thème du cours de cette partie) ;
   - la bonne réponse est-elle enseignée dans le cours associé (recherche des notions-clés, normalisation accents/casse), sinon dans une autre partie ;
   - question hors sujet ou cours manquant.
   Classement : CONFORME / MAUVAISE PARTIE / RÉPONSE NON ENSEIGNÉE / HORS SUJET / À VÉRIFIER (non prouvé automatiquement). Aucun verdict « conforme » sans correspondance trouvée.
4. Contrôle manuel des cas signalés (lecture du passage du cours concerné) pour limiter les faux positifs.

## Rapport livré
- Nombre de questions contrôlées par partie et par verdict.
- Tableau des anomalies : identifiants exacts, intitulé, partie actuelle, partie attendue, justification (extrait du cours ou absence).
- Limites explicites : tout accès insuffisant ou contenu illisible (PDF/PowerPoint non textuels) signalé comme « NON PROUVÉ ».
- Fichier : `/mnt/documents/audit-questions-taxi-cours-2026-10-27.md` (rapport seul, hors application).

## Hors périmètre
Toute correction : elle fera l'objet d'une demande séparée après lecture du rapport.
