# Bilan examen VTC — D - Français (module 5, exercice 503) — 05/11/2026, lecture seule

Élève : Kevin FERNANDES (vtc-e). Aucune écriture, aucune publication.

## Constats
- Base (module_editor_state 5/503) et source code (`bilan-questions-francais.ts`) sont identiques : 97 questions, champs `id, uid, type, enonce, choix` uniquement — **aucun texte support** (champ absent, pas masqué).
- Même défaut dans module 11 exercice 603 (TAXI) : 33/97 questions touchées dans chacun.
- 33 questions ont des propositions qui sont des fragments de lignes : une réponse rédigée a été coupée ligne par ligne en A/B/C… (ex. Q9 : A « …moins d'accidents et sont » / B « plus prudentes, les clichés… » / C « habiles ou douées… »). Bonnes réponses posées sur les fragments.
- Preuve d'origine : dans les examens blancs (`examens-blancs-data.ts` l.3337), la même question est une **QRC** avec une seule réponse attendue complète et un `texteSupport` (l.3316). L'import du Bilan a transformé la réponse en QCM à fragments.
- Le rendu élève/admin affiche fidèlement les données : le défaut est le même sur tous les écrans (ordinateur, tablette, mobile) car chaque fragment est une proposition distincte. Capture navigateur non faite.
- Kevin : aucune réponse ni validation enregistrée sur module 5 ; ses passages de français sont des examens blancs (textes supports présents dans ces sujets).

## Conclusion
Anomalie de **contenu**, pas d'affichage. Aucun correctif du rendu ne peut la résoudre sans modifier propositions et bonnes réponses → rien corrigé.

## Correction possible (accord requis)
Nouvelle version du Bilan Français depuis le document Word officiel : textes supports ajoutés, 33 questions remises dans leur forme d'origine (QRC ou QCM complet), identités conservées, anciennes réponses et passages intacts.
