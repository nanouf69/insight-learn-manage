# Rattrapage IA des copies EB héritées — Kevin FERNANDES — 27/10/2026 (non publié côté site)

## Cause
- Les copies de l'ancien circuit n'entraient jamais dans la file IA (passages antérieurs au 20/10 = « hors période »).
- `core_import_passage_finalise` vérifiait la remise de la tentative 1 (`EB2__francais`) même pour une copie de tentative 2 (`__t2`) : copies EB2 ignorées, risque de confusion entre tentatives.

## Correctifs (migrations 0200, 0201 + fonction qrc-ia-correction)
- Preuve de remise exigée pour LA MÊME tentative (suffixe `__tN`).
- `qrc_ia_rattrapage_historique(result_id, motif)` : admin seulement, seule la copie affichée (dernière tentative), import idempotent des réponses réelles, journal append-only `qrc_ia_rattrapages_historiques` + `audit_journal`, mise en file durable. Refus si un formateur a déjà corrigé une QRC de la copie (P0540).
- Les passages importés ne comptent plus comme EB « terminé » dans `examens_blancs_controle` (EB2 partiel ne valide pas le module 35).

## Résultat réel Kevin
- 26/26 QRC EB2/EB3 corrigées par l'IA, 0 erreur, 8 notes de matière définitives : EB2 Français 11, Gestion 12, T3P 13 ; EB3 Français 14,5, Gestion 16, Régl. VTC 13, Régl. VTC t2 11,5, T3P 12.
- Module 35 : toujours non validé (EB2 F(V)/G(V) jamais remises).
- EB1 : 16 QRC non traitées — aucune preuve de remise pour les tentatives affichées (t3/t4 « en cours » dans le journal) ; arbitrage admin.

## Autres élèves (non exécuté, en attente d'accord)
- 91 copies / 14 élèves / 286 QRC admissibles (preuve de remise, aucune correction formateur).
- 244 copies sans preuve de la même tentative : exclues.
