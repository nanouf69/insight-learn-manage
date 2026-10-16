# Rattrapage IA ciblé — EB4/EB5/EB6, apprenante 3dee8826 (16/10/2026, ~14 h 27 Paris)

Autorisation : « Corrige les pb » (Ismail Amar exclu). Périmètre : 15 lignes legacy en attente de cette apprenante.

- Incident corrigé : le rattrapage du 16/10 ~14 h 11 (fonction `qrc-ia-correction`, 16 QRC v2 EB6) a noté des réponses du nouveau moteur dont 11 divergent ou sont tronquées. Ces corrections v2 sont conservées sans modification et tracées dans `rattrapageIA_journal.v2_corrections_non_validantes` ; elles ne valident pas les réponses complètes et l'affichage les ignore.
- Source : `apprenant_quiz_results.details.reponses` + `details.snapshot.questions` de la même ligne (id, examen, matière, tentative 1, date). Même circuit que `journal-rattrapage-ia-eb4-thierno-2026-10-16.md`.
- 43 appels `google/gemini-3.8-flash` (un par QRC, cache local, aucun rejeu), coût estimé ≈ 0,055 $ ; 5 notes v2 reprises seulement lorsque réponse/énoncé/corrigé/barème sont strictement identiques.
- Appliqué : 45 QRC. Anciennes corrections (déterministes, non validées) archivées dans `correctionsIA_historique`. Écriture gardée par score + empreinte des corrections.
- En attente (IA « ambigu ») : EB4 réglementation VTC2 Q1 (corrigé incohérent), EB4 T3P Q3 (corrigé tronqué), EB5 français Q4.
- Inchangés (empreintes) : réponses/snapshots/questions, autres lignes de l'apprenante, autres élèves, QRC v2, dossier Ismail Amar.
