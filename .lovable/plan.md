# Comparaison TAXI / VTC des matières communes (lecture seule)

## Ce qui sera fait
Je compare le contenu actuel du serveur avec ce qu'affichent vraiment les écrans élève, pour les matières communes uniquement : T3P, gestion, sécurité routière, français et anglais. J'ajouterai d'autres matières seulement si elles sont prouvées communes. Les matières propres à chaque filière sont exclues et ne seront jamais rapprochées : réglementation TAXI, connaissance du territoire et réglementation VTC.

Je traite trois familles séparément : Bilans, Examens blancs et Exercices des modules.

## Étapes
1. **Repérage** : je relève dans le code (modules, sélection des bilans et des examens blancs, projection nationale) et dans les tables de contenu les éléments qui servent vraiment à l'élève. J'établis pour chaque filière la liste exacte module → exercice → matière. Les identifiants ne sont jamais rapprochés par leur seul numéro : je m'appuie sur l'identité permanente, la matière et l'exercice. Les cas ambigus sont listés avant toute comparaison.
2. **Extraction** : des lectures SELECT seulement, sur le contenu courant (versions actives, registre de synchronisation). Les copies figées des examens commencés et les relevés figés sont exclus, et je le dirai.
3. **Comparaison paire par paire** : pour chaque paire, je compare :
   - le nombre de questions, et les questions manquantes ou en trop ;
   - les énoncés ;
   - les choix, avec leur ordre et leur lettre ;
   - les bonnes réponses et les réponses multiples ;
   - le type (QCM ou QRC), le corrigé QRC et le barème ;
   - les images et l'ordre des questions.

   Seuls les espaces et l'Unicode d'affichage sont normalisés. Une question renumérotée est rapprochée par son contenu, et les correspondances ambiguës restent visibles. Chaque écart est classé **cosmétique** ou **pédagogique**.
4. **Contrôles ciblés** :
   - registre : 193 anglais, 97 français, 210 sécurité routière en attente sans références, ainsi que les 119 positions et les métadonnées ou images déjà signalées ;
   - exercice 62 (VTC module 2 et TAXI module 10) : présence et contenu des anciennes Q40, Q41 et Q49.

## Résultat livré dans le chat
- Un tableau avec : matière, type, modules et exercices, nombre de questions par filière, et le verdict (identique / écart / non comparable).
- La liste des seuls écarts réels : identifiants, courts extraits TAXI et VTC, bonne réponse, ordre et impact.
- Le périmètre exact contrôlé, les exclusions et les lectures impossibles. Je ne conclurai pas « tout est identique » sans preuve que la comparaison est complète.

## Garanties
Aucune modification de code, de données, de questions ni de notes. Aucun fichier modifié, y compris ce plan au-delà de cette version et la feuille de route. Pas de publication, pas d'IA, pas d'email ni de SMS, pas de sous-agents.

## Détails techniques
- Sources : `module_editor_state`, `bilan_sync_liens`, `bilan_question_identites`, `exam_content_versions` (versions actives), `canonical_questions`, ainsi que les définitions de modules et de sélection dans `src/`.
- Comparaison faite par des requêtes SQL d'empreintes (md5 sur un JSON normalisé) par question, puis le détail des seules différences.
