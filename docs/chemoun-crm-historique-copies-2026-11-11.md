# Chemoun — accès aux deux copies T3P EB3 TAXI

## Cause et correctif ciblé
Le panneau CRM Examens blancs utilise `selectLatestAttemptRows(mergePassageSiblingRows(...))` ; il ne propose aucun accès explicite aux anciennes copies. La Vue apprenant conserve sa sélection actuelle : elle n’est pas modifiée. Ajout indépendant « Historique des copies » à chaque ligne matière du panneau CRM, consultation en lecture seule de chaque résultat source, sans filtrage par dernière tentative ni fusion.

Chemin en aperçu : **CRM → fiche Chemoun → onglet Examen blanc → développer Examen Blanc 3 — TAXI → ligne A T3P → Historique des copies → choisir explicitement date/tentative/ID**. Aucun choix automatique à l’ouverture.

Le bouton « Retrouver cette copie dans Correction QRC V2 » relit le lien exact, puis propose « Ouvrir cette copie exacte dans le correcteur » avec les paramètres existants `qrc_groupe`, `qrc_eb`, `qrc`. Aucun correcteur, route d’examen, contenu, note ou réponse n’est modifié.

## SELECT réels, lecture seule
| Copie | Date de fin affichée à Paris | Tentative | Réponses | Source | Passage V2 |
|---|---|---:|---:|---|---|
| Complète | 01/11/2026 18:15:42 | 1 | 15 | 485503df-2091-43fb-91ed-743af3e339aa | 91bce116-6f48-48bc-ad2a-1abe93311b81 |
| Partielle | 09/11/2026 21:21:19 | 2 | 1 | e0cb84a0-e170-40b2-aef2-6b55174b1bd6 | 7f3f3ead-78a3-42c5-80fb-719a5be8351f |

Q1 partielle : « 3.5 t », Q2/Q3 absentes. Complète : Q2/Q3 enregistrées. Correspondances relues : même propriétaire, même EB, même ID source, tentative concordante, `source_historique.details = ligne.details` vrai pour les deux. Empreintes inchangées : `9dfc46bb7aa30ef89d836c92598b1b12` / `9c8bd7622a1f5a5b54c1e6cee607c982`.

**La date et la tentative sont des libellés, pas une identité suffisante** : sélection technique par ID de résultat, lien par passage/QRC exacts. Une ambiguïté, un autre propriétaire/EB, des détails divergents ou un menu ne contenant pas le passage refuse le lien plutôt que de choisir une autre copie.

Attention : le dernier SELECT à 12:54 UTC constate la QRC Q1 du passage partiel désormais `corrigee` ; les cinq QRC du passage complet restent `en_attente`. Ceci est une évolution extérieure au chantier, pas une correction exécutée ici. Le diagnostic de sauvegarde précédent n’est ni annulé ni réécrit.

## Vérifié / limites
- 44 tests PASS : 3 nouveaux historique/identité, 10 bouton reset, 31 navigation du vrai correcteur avec imports V2 et relecture avant succès. Trois tests historique rejoués après typage.
- Aperçu Chromium fixture sur PC 1280×1800 et mobile 390×844 : choix partiel puis complet puis partiel, Q2/Q3 visibles uniquement dans la complète, pas de sélection automatique, pas de débordement, aucune erreur JS ni écriture Cloud ; captures inspectées.
- Lien exact du correcteur testé avec ses paramètres existants et fixtures ; aucun changement du correcteur ni note réelle saisie. Vue CRM réelle authentifiée Chemoun et ouverture réelle de son lien dans le correcteur NON PROUVÉES ; correspondances Cloud prouvées par SELECT, comportement UI prouvé sur fixtures.
- Compilation observée build OK. ESLint : aucune erreur après typage, avertissements Fast Refresh pour exports utilitaires dans le fichier de composant.
- Aucun SQL mutateur, migration, publication ou commit manuel. Référence de checkout observée avant livraison : `7e911e341` ; les commits sont gérés par la plateforme.