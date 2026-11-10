# Incident EB2 — ADYAHYA Kamal et SARKISIAN Pogos (10/11/2026, lecture seule)

Aucune note, réponse, copie, tentative ni historique modifié.

## Kamal ADYAHYA — EB2 VTC (ancien circuit, tentative 1, 09/11)
- Aucun passage V2 ; 7 lignes de résultats, drapeaux de copie résolus (rejeu réel : `legacyPending=false` sur les 7 matières).
- Blocage élève : anciennes lignes pilote `qrc_instances` en attente non clôturées par `qrc_historique_noter`.
- Correctif (aperçu, non publié) : `engineMatierePending` ne bloque plus si toutes les QRC du même passage sont validées par l'admin sur la copie.

## Pogos SARKISIAN — EB2 TAXI (V2 natif, 7 passages)
| Matière | Passage | Résultat V2 | QRC restantes |
|---|---|---|---|
| T3P | 09/11 | 13/20 définitif | 0 |
| Gestion | 09/11 | 10/20 définitif | 0 |
| Sécurité | 09/11 | 11/20 définitif | 0 |
| Français | 09/11 | 4/20 définitif | 0 |
| Anglais | 09/11 | 4/20 définitif | 0 |
| Réglementation TAXI 1 | 30/10 | provisoire | 4 non corrigées |
| Réglementation TAXI 2 | 30/10 | provisoire | 2 non corrigées |

- Cause différente de Kamal : aucune fiche pilote ; 6 QRC V2 réellement sans note ni événement de correction.
- Corrections du 30/10 et 06/11 trouvées : elles concernent EB1-TAXI, pas EB2-TAXI.
- L'attente F/G est donc légitime ; aucun correctif de code justifié.

## Tests
`src/test/qrc-pilot-pending-resolved-by-copy.test.ts` : 7/7 (cas Kamal + 2 cas Pogos).

## 10/11 08:35 UTC — Vérification publication et audit exhaustif (lecture seule)
- Public `gestion.ftransport.fr` : `assets/index-ryoThghQ.js` contient déjà le correctif (`pendingQuestionsByAttempt`, lecture `question_id`, contrôle des corrections validées de la copie). Seuls des tests/rapports ont changé dans l'aperçu depuis ; « Refaire les questions fausses » et l'écran EB3 étaient déjà publics avant ce correctif. Aucune nouvelle publication nécessaire.
- Fiches pilote : moteur activé seulement pour `EB2` (VTC). 742 fiches en attente → 236 matières bloquées avant ; 111 débloquées (29 élèves), 125 restent (37 élèves, 379 QRC). Aucune régression (0 matière bloquée en plus).
- Les 379 QRC restantes n'ont qu'une pré-correction automatique « Correction déterministe » non validée, aucune entrée `qrc_historique_corrections` : attente légitime, à corriger par l'admin.
- Kamal : 5 matières (francais, gestion, reglementation_vtc, reglementation_vtc2, t3p) débloquées ; anglais/securite jamais bloquées.
- V2 EB1–EB6 VTC/TAXI/TA/VA : 0 QRC en attente avec événement de correction, 0 compteur `qrc_restantes` divergent, 0 résultat définitif avec QRC restantes.
- Pogos EB2-TAXI : passage du 30/10, 6 QRC sur 6 toujours en attente, aucune correction ; rien attribué.
- Suite complète : 449 fichiers / 3 997 tests PASS, 13 ignorés.
- Non fait : ouverture de l'écran élève sous le compte de Kamal (connexion unique : cela le déconnecterait) ; vérifié par rejeu du code publié sur ses données réelles.
