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


## Rectification admin et correction finale — 17/10/2026 13:04 UTC
Les paragraphes antérieurs 9–12 ci-dessus sont historiques et **supplantés** par la confirmation admin : le 17 octobre est une journée 9–12 / 13–16. Aucune signature après-midi de ce jour n’est une anomalie.
- Configuration réelle 17/10 : `{type: taxi}`, sans horaires explicites ; application de la journée validée. Session et trois inscriptions déjà corrigées 09–16 avant ce travail : aucune réécriture ici.
- `pratiqueSlots`, `signaturesManquantes`, `suiviFormationIndicateurs`, `TauxPresenceSessionsCard`, `DocumentsCompletes` : planning exact par date prioritaire, réservations demi-journée préservées, attente/exclusion jamais contournée ; relevés figés conservent leur comportement archivé.
- Migrations 0172/0173 appliquées : prochaines inscriptions pratiques prennent les horaires planning ; futures feuilles théoriques uniquement blocs pédagogiques datés, inscriptions/bornes/créneaux retenus ; pas de génération rétroactive ni invocation de ces générateurs.
- `agendaSlots` / `CoursPublic` : nouvelles feuilles proposées depuis vraies inscriptions + agenda, sans priorité dates globales de fiche ; erreur lecture interrompt le contrôle sans fausse absence.
- Listes d’attente : 20 signatures CATANIA journée, 20 KEBBAB soir, 20 TENGUE soir, affichées dans catégorie « inscription en attente — à vérifier », jamais sans session ni comptées automatiquement. Cause code identifiée : trigger capacité >=18 ; raison historique exacte du placement individuel non prouvée, statuts inchangés.
- Fiacre : deux signatures 17/10 retenues, 14 historiques masqués conservés et signalés avec vraie date signed_at ; zéro signature de date septembre. Les 32 attentes de la seule session septembre restent non résolues, aucune absence écrite. Quatre feuilles juillet signées septembre ne sont pas déplacées.
- Cérine et Rafik MESBAHI : 2 signatures chacun le 17/10, aucune manquante affichée dans vérification lecture seule.
- Aba-Bakre BENJELLOUN : inscription pratique 20/10 non attente ; 32 signatures septembre, aucun rattachement théorique trouvé dans les inscriptions lues : reste à examiner, aucune création d’inscription.
- 104 tests isolés PASS (11 fichiers) ; compilation harness OK 13:01:42 UTC ; contrôle UI admin réel lecture seule sur six fiches, toutes écritures et envois bloqués. Vérification élève de signature réelle NON exécutée. Fonction SQL pure non invoquée (outil lecture rôle sans permission) ; générateurs jamais testés sur données réelles.
- Empreintes avant/après : 2921 émargements `02fdea7f79842df7e3fddfde790bffc2` ; modules 62 `4659cfa59c6088414ca62e635d6047de` ; versions 57 `614b47fc7749ae2f0130745ce042e8c8` ; liens 500 `78817ad66a1e960c97d7a3ed3cfa9c89` ; 22 gels `4fcc0d041f89b4770fef79f95129e01a`, tous identiques. Fiacre `59ec5cad620791be109bac074c0a3c02`, identique. Questions, signatures, dates et gels intacts ; Ismail aucun traitement ; aucun mail/SMS/IA.
- Travaux devis/contrat conservés, aucune modification de ces fichiers.

### Mise en service demandée — 13:05 UTC
Version validée `cc583e47cc58983b4529d4adb3f9c96f00b48efd` ; publication frontend demandée via outil, pas encore confirmée par asset public. Fonctions SQL 0172/0173 déjà appliquées, aucune Edge Function à déployer. Dernier test 104/104 PASS, compilation 13:04:35 OK, cinq empreintes identiques après contrôle UI. Taux principal admin/élève filtre aussi les signatures non retenues (`useApprenantTauxRealisation`) ; aucune modification du noyau jalons ni du calcul historique figé.

## 18/10/2026 21:18 UTC — TA 10+2 et file de réponses
- TA : objectif 10 théorie + 2 pratique = 12 ; théorie attendue limitée aux 5 premiers jours ouvrés de l'inscription (Fiacre : 7–11/09) dans manquantes, bilan EDOF, classification et taux session. Fin personnalisée explicite = ancien parcours conservé (12 ou 14 selon planning), rien inventé. Aucune signature déplacée ni modifiée.
- File de réponses : cause observée = serveur lent (240 réponses > 15 s, max 3 min) ; abandon à 15 s puis renvoi en chaîne (file 8 → 13). Correctif : réessais avec 60 s, arrêt du tour après un délai dépassé. Rien n'est retiré de la file sans accusé serveur. Récupération complète des appareils de D. FERREIRA / A.-B. BENJELLOUN NON PROUVÉE (pas d'accès appareil).
- Riyad : refus 48 h attendu (EB1 terminé 16/10 15:46 UTC) ; P0471 déjà classé refus définitif (pas de réessai infini). Aucun contournement.
- Tests : 67 signatures + 42 file de réponses PASS. Non publié.
