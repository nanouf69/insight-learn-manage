# Journal — Émargements rattachés aux inscriptions de session (17/10/2026)

## Règle appliquée
Les signatures attendues et retenues sont calculées uniquement à partir des inscriptions
`session_apprenants` + `sessions` (dates et horaires personnalisés de l'inscription prioritaires)
et des réservations pratiques. Les dates globales de la fiche élève ne sont jamais une source.

## Changements
- Migration 0171 : colonne `session_apprenants.emargements_exclus` (défaut false) — exclusion
  admin du périmètre d'émargements sans supprimer l'inscription.
- `src/lib/signaturesManquantes.ts` : filtre `emargements_exclus` dans les attentes, le planning
  et le bilan EDOF ; une session pratique du jour prime sur une réservation « journée »
  (9h–12h ne devient jamais matin + après-midi) ; nouvelle fonction `classifierSignatures`
  (attendus / valides / horsSession / anomalies) et `chargerClassificationSignatures`.
- `TauxPresenceSessionsCard.tsx` : inscriptions exclues ignorées dans le taux de présence.
- `SessionDetail.tsx` : case « Hors périmètre d'émargements » par inscription (conservée).
- `DocumentsCompletes.tsx` : affichage des anomalies (créneau signé hors horaires de la session,
  réservation plus large que la session) et des signatures hors périmètre (conservées, non comptées).

## Garanties
- Aucune signature supprimée, masquée, réattribuée ou antidatée ; `signed_at` jamais réécrit.
- Aucune feuille créée rétroactivement ; aucun historique signé ni relevé figé recalculé.
- Sessions annulées / liste d'attente / examens ignorées ; doublons de jours chevauchants dédupliqués.
- Zéro modification de questions ; Ismail AMAR non concerné ; aucun email/SMS/IA.

## Données — Fiacre LALEYE (1c0a1e21-429a-4913-a08d-8d75b230a4cb)
Confirmé par l'admin : présent uniquement septembre et octobre 2026.
- Exclues (emargements_exclus = true) : inscriptions 2aaea7a3 (Session TA 04–25/05),
  6554309d (Session TAXI et TA 04–25/05), f2f74dd3 (Session VTC et TAXI 06–19/07).
- Retenues : 9467f8be (théorie 07–28/09), e928ef91 (pratique 17/10 9h–12h), 05835df3 (examen 29/09, ignorée).
- Les 14 émargements juin/juillet déjà masqués restent masqués ; les 4 signatures de septembre
  sur feuilles de juillet restent hors périmètre (non réattribuées) ; la signature après-midi du
  17/10 (hors horaires 9h–12h) est conservée et signalée en anomalie « à vérifier ».

## Preuves
- 25 tests PASS (dont 8 nouveaux : exclusion, chevauchement, pratique 9h–12h vs réservation,
  fiche obsolète, signature masquée, timestamp ≠ date de cours, historique hors périmètre, examen).
- Compilation OK 12:07 UTC. Non publié.

## Correctif 12:15 UTC (revue indépendante bf5145f5)
Défaut bloquant corrigé : une signature ne compte plus sur la seule date — seules les paires
date + créneau réellement prévues par les inscriptions retenues comptent.
- Nouvelle source unique `planningCreneaux` (créneaux prévus par date, horaires personnalisés
  prioritaires) utilisée par `datesDuPlanning`, `calculerBilanSignaturesEdof` et
  `classifierSignatures` ; `TauxPresenceSessionsCard` filtre aussi par créneau prévu.
- Après-midi du 17/10 (Fiacre, hors horaires 9h–12h) : conservé, classé horsSession/horsPlanning
  + anomalie, non compté dans les valides, le bilan EDOF ni la carte de taux.
- `chargerBilanSignaturesEdof` sélectionne désormais heure_fin, heure_fin_personnalisee et
  creneau/type_formation des réservations.
- Une réservation ne contourne plus une inscription pratique exclue du périmètre.
- Objectifs réglementaires (20+2 / 30+2) inchangés ; total fixe existant distinct des attentes.
- Vérifications base : 16 émargements Fiacre (14 masqués, 16 signés), empreinte
  124221b37b2dc85df660a610680613ae — aucune écriture sur emargements_fc ; 3 exclusions
  (mai ×2, juillet) confirmées en base ; questions intactes ; Ismail non concerné.
- 70 tests PASS (6 fichiers), compilation OK 12:15 UTC. Non publié.

## Reste à régulariser (humain)
- La signature après-midi du 17/10 de Fiacre ne correspond à aucun créneau prévu : à confirmer
  avec le formateur (conservée en l'état, signalée en anomalie).
