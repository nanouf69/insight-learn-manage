# Incident auto-validation QRC — 09/11/2026 22:25 UTC

## Défauts
1. `proposerPrenote` supprimait tout caractère non alphanumérique : « −10 euros » = « 10 euros », « 10 % » = « 10 € » → 2/2 automatique.
2. Un clic sur une note enregistrait immédiatement, sans action explicite.

## Correctif publié (bundle `index-Cv4rxQEI.js`, gestion.ftransport.fr)
- Normalisation conservatrice : casse, espaces, apostrophes/tirets typographiques, point final seulement ; signes, chiffres, unités, %, €, accents, négations conservés.
- Auto-validation uniquement si texte littéralement identique (`identique-conservateur-v2`).
- Équivalence B2 : présélection seulement (`equivalence-b2-vierge-v2`), jamais enregistrée sans clic.
- Clic sur une note = choix local ; seul « Enregistrer la note X/Y » écrit.
- Publication isolée : correctif « Refaire les questions fausses » et écran Publication EB3 exclus (absents du bundle public), restaurés ensuite en aperçu.

## Audit lecture seule (aucune note modifiée)
- `qrc_correction_events`, `qrc_historique_corrections`, `qrc_instances` : **0** trace « VALIDATION AUTO ».
- Corrections V2 du 09/11 : 146, dernière à 16:38 UTC (avant l'auto-validation).
- Corrections historiques EB2 du 09/11 : 338 (18:47 → 20:09 UTC), toutes par clic manuel immédiat.
  - 20 portent la trace « PRÉ-NOTE revue-humaine-v1 / Proposition incertaine » (19:58 → 20:09) : aucune proposition automatique, note choisie au clic.
  - Aucune correction historique après 20:09 UTC.
- Liste à auditer (risque de clic involontaire, pas d'auto-validation) : les 338 lignes de `qrc_historique_corrections` du 09/11, en priorité les 20 lignes « PRÉ-NOTE » (IDs dans la requête : `commentaire ilike '%PRÉ-NOTE%'`).

## Tests
- `qrc-prenote.test.ts` (24), `correction-qrc-navigation-auto.test.tsx` (15) : signes, %, €, unités, négations, B2, clic sans écriture, bouton Enregistrer.
- Deux tests réparés : `presentiel-heures-validees` (simulation sans `rpc`), `answer-ordre-serveur` (délai fixe 3 s sensible à la charge).
- Suite complète sur la version publiée : 3 976 réussis, 13 ignorés, 0 échec.
