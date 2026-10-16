# Rattrapage IA ciblé — EB4, apprenant 8313311b (16/10/2026, ~11 h 16 Paris)

Autorisation utilisateur : « Ba demande a lia ». Périmètre : EB4 de cet apprenant uniquement.

- Source : réponses complètes de l'ancien circuit (`apprenant_quiz_results.details.reponses`) + questions/barèmes de la copie figée `details.snapshot` de la même ligne (id, tentative, date). Réponses du nouveau moteur tronquées (1 caractère) : non utilisées, non recorrigées.
- Modèle/consigne : `google/gemini-3.8-flash`, `CONSIGNE_IA`/`messageUtilisateur`/`validerResultatIa` de `_shared/qrcIaRegles.ts`. 17 appels, 1 par QRC, aucun rejeu (fichier d'idempotence local). Coût estimé ≈ 0,019 $.
- Appliqué : 15 QRC (T3P 5, gestion 2, français 3, réglementation VTC 4, réglementation VTC2 Q10). Ancienne correction archivée dans `correctionsIA_historique`, journal `rattrapageIA_journal`, run id IA dans chaque correction. Réponses, questions, copies figées, QRC v2 (86, empreinte inchangée) et autres examens inchangés.
- Non appliqué : réglementation VTC2 Q1 (tentatives 1 et 2) — l'IA signale un corrigé officiel incohérent avec l'énoncé ; laissé au formateur. Q10 tentative 1 déjà corrigée par IA le 25/09, conservée.
- Notes : T3P 19, gestion 19, français 18 (inchangées, désormais publiées) ; réglementation VTC 14,5 → 16,5 ; réglementation VTC2 t2 14 → 13 (encore en attente à cause de Q1).
