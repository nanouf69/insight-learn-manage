# Catalogue QRC — miroirs QCM/QRC, 11 novembre 2026

## Périmètre et provenance
Correctif d'affichage seulement ; aucune migration, écriture de copie, réponse, note, examen ou publication.

La fin de matière native écrit dans `exam_attempts_v2` via `core_finalize_attempt` (lecture de la définition serveur), avec journal `core_operations` et réponses `answer_state`.
`ExamensBlancsPage` confirme ensuite ce noyau (lignes 1372–1394) puis appelle `saveMatiereResult` (1450), qui enregistre aussi `apprenant_quiz_results` avec snapshot et réponses (1170–1241).
Le champ `details.attempt_id` n'est porté que pour un repassage ciblé dans ce chemin : il est absent des sept projections EB4 de Mamadou. Aucun lien moteur explicite retrouvé dans leurs détails. Cette seconde écriture est une projection ; l'extension tous passages a exposé les projections QCM sans que l'ancien rapprochement QRC puisse les identifier.

Ancien rapprochement : multiensemble de chaînes non vides, sans identifiants de question, snapshot complet ni tentative. QCM tableaux non reconnus ; une chaîne QCM pouvait être comptée comme texte QRC. Il est remplacé, jamais étendu par fenêtre horaire.

## Preuve appliquée
- Même identifiant apprenant, examen/filière et matière, tentative terminée native, jamais une importation.
- Lien explicite `details.attempt_id` utilisé en priorité, toujours avec les vérifications suivantes.
- Numéro persistant concordant ; les snapshots natifs originaux sans tentative ne peuvent être reconnus comme première tentative que si l'inventaire de **toutes** les tentatives de cette matière ne contient qu'une native, avec projection tentative 1. Toute collision/en-cours concurrent reste séparée.
- Ensemble complet de clés, correspondance `matiere:id` ↔ `id`, ordre relatif et énoncé/type/points/images/choix/corrigé figés concordants.
- QRC caractère pour caractère (espaces inclus) ; QCM ensembles de lettres A–E, permutation admise, doubles/inconnues refusées, formats tableau/chaîne JSON interprétés uniquement selon le type figé QCM.
- Appariement un à un : deux projections compatibles avec la même native restent distinctes, à vérifier.
- Catalogue et compteur utilisent la même fonction pure ; pagination stable, identifiants en lots de 150. Aucun brouillon affiché ; les tentatives non terminées servent uniquement à détecter une ambiguïté.
- Copies historiques uniques conservées, EB2 consultation conservée sauf miroir prouvé ; divergences indiquées dans le choix de passage ancien.

## Mamadou Sene — EB4 VTC, lecture réelle
7 natives terminées, 7 projections persistées ; aucune donnée modifiée.

| Matière | Projection | Avant ancien rapprochement | Après projection corrigée |
|---|---|---|---|
| Anglais | cd1a6a76-5c18-4c77-8a80-e1a5dd6fd716 | V2 + Ancien | V2 seule, 20/20 réponses concordantes |
| Sécurité routière | 4013c9e7-7cc0-4f12-8225-aeb881b597ac | V2 + Ancien | V2 seule, 20/20 concordantes |
| T3P | f84122d1-742b-4e98-8b4a-ebd12ae9a566 | miroir texte | V2 seule, preuve complète |
| Gestion | bcc4b629-1473-4db6-b9f6-d4205a813755 | miroir texte | V2 seule, preuve complète |
| Réglementation VTC | ecc1d498-f09d-4bb6-bde6-a6e5c4317098 | miroir texte | V2 seule, preuve complète |
| Réglementation VTC 2 | 1bd7a776-3ffb-47e8-bd92-4e2e35fbdbc7 | miroir texte | V2 seule, preuve complète |
| Français | e216f80c-7dba-4143-a8df-515e7baf00f6 | masqué par seul texte QRC | **Deux copies conservées, À vérifier** |

Anglais native `907b38db-b41d-4e97-986a-db96e47836b5`, fin 13:57:44.957567 UTC = 14:57:44 Paris, tentative unique du périmètre.
Sécurité native `b0d300d2-167e-4afd-8d5b-4b3bd52ccd07`, fin **13:37:00.160082 UTC = 14:37 Paris**, projection 13:37:01.778446 UTC : aucune seconde Sécurité à 14:57 trouvée dans cet inventaire. La proximité de l'Anglais n'est pas une preuve de rattachement.
Français Q5 : A+C corrects dans la projection, C seule dans le snapshot V2. Aucune correction/requalification de ce contenu réalisée.

## Autres copies récentes
Lot borné à 30 projections remises entre 13:50 et 14:17 UTC, toutes lectures réelles ; 23 miroirs complets prouvés, 7 non prouvés conservés.
Non prouvés : Français IDs `14ae196b`, `cb6aa3c0`, `1a4b026c`, `5af108eb`, `14d849ee`, `d425943d` ; Réglementation VTC 2 `91cdc827`. Les dates délimitent uniquement le lot lu ; elles ne participent jamais au rapprochement.
Ce lot chevauche trois matières de Mamadou ; ne pas additionner ses nombres aux sept copies.

## Validation
- PASS : comparaison locale de la preuve réelle complète récupérée par SELECT, sept matières Mamadou + lot récent de 30.
- PASS : 20 tests initiaux (preuve/inventaire/menu) ; 32 tests correction-navigation réels sur fixtures, aucune correction réelle.
- Tests ajoutés ensuite : 1002 copies QCM catalogue/compteur, collision tentative 1, corrigé divergent ; fixture corrigée pour ne pas partager le même tableau de choix entre ses deux snapshots (première exécution 1 échec).
- Compilation automatique : `build OK` le 11/11 à 14:20:23 UTC ; contrôle final dans les journaux après derniers edits.
- **NON PROUVÉ : affichage navigateur sous compte administrateur réel.** La session injectée redirige vers `/cours-public` ; aucune action de notation tentée. Les preuves réelles ci-dessus passent par SELECT + lecteur pur, pas par une session admin UI.

Commit exact : fourni dans le retour après enregistrement automatique ; aucun commit manuel, aucune publication.