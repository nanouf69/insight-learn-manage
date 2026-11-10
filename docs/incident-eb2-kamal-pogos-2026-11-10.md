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
