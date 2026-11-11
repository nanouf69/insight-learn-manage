# Chemoun EB3-TAXI — moyenne, 11/11/2026

## Conclusion
La sélection existante est intentionnellement la dernière tentative enregistrée. T3P t2 du 09/11 est retenue à 2/20, pas t1 du 01/11 corrigée plus tard à 13/20. La date de correction ne choisit pas la copie. Aucune commande existante trouvée pour désigner une copie historique comme contribution à la moyenne ; le sélecteur HistoriqueCopiesMatiere ouvre uniquement une copie à consulter/corriger.

## Preuves serveur SELECT
- Apprenant 2be4ac7b-32a6-4a0f-9a12-267381c6779b, examen EB3-TAXI.
- T3P t1 : 91bce116-6f48-48bc-ad2a-1abe93311b81, résultat source 485503df-2091-43fb-91ed-743af3e339aa. 5/5 QRC corrigées, révision 5, définitif 13, updated_at 11/11 13:04:52.475635 UTC.
- T3P t2 : 7f3f3ead-78a3-42c5-80fb-719a5be8351f, résultat source e0cb84a0-e170-40b2-aef2-6b55174b1bd6. 1/1 QRC enregistrée corrigée, révision 1, définitif 2, updated_at 11/11 12:50:50.648053 UTC.
- Les deux snapshots historiques ont le bon result_id, tentative 1/2 et details strictement égaux à leurs sources. Leurs anciens scores 8,5 et 0 restent pending en base : ils ne doivent pas remplacer 13 et 2 V2.
- Gestion V2 13, Français 9,5, Anglais 9, F 14, G 18, définitifs ; Sécurité 14 historique, sans passage V2 retrouvé.
- Aucun reset EB3-TAXI retrouvé. Dernier SELECT : mêmes notes, révisions et instants que le premier contrôle.

## Calcul exact
| Matière | Note retenue | Coefficient |
|---|---:|---:|
| A T3P t2 | 2 | 3 |
| B Gestion | 13 | 2 |
| C Sécurité | 14 | 3 |
| D Français | 9,5 | 2 |
| E Anglais | 9 | 1 |
| F TAXI | 14 | 3 |
| G TAXI | 18 | 3 |

Total pondéré = 198 ; coefficients = 17 ; moyenne exacte 198/17 = 11,6470588235, arrondie à **11,6/20**. Verdict échoué malgré moyenne >10 car A=2 < seuil 6.
Simulation première copie A=13 : total 231, 231/17 = 13,5882352941, affichage **13,6/20**. Écart exact 33/17 = 1,9411764706 point ; écart affiché 2,0 points. Toutes les notes atteignent alors leur seuil (anglais 4, autres 6).

## Chemins exacts et défaut corrigé en aperçu
- Carte élève : ExamenBlancsListe → lignesExamenAffichees → selectLatestAttemptRows (max tentative, compléments anciens uniquement pour matières absentes) → coreFiablePourLigne → computeMatiereScoreForAttempt → computeMoyenneExamen.
- CRM Résultats : mêmes lignesExamenAffichees, attacherSourceUnique et computeMoyenneExamen. useCoreChangeTick déclenche la relecture après correction.
- CRM Examen blanc / ExamensBlancsResetTab : sélection déjà dernière tentative, MAIS projection __core absente et pas de relecture lors d'une correction V2. Ses anciens totaux/snapshots pouvaient alimenter sa moyenne au lieu des notes définitives.
- Correctif limité au dernier écran : attacherSourceUnique (identité et réponses inchangées), __core transmis au calcul, useCoreChangeTick dans clé de lecture, moyenne masquée si publication/lecture incertaine. Aucun changement de règle de sélection, de formule ou de notes.
- Moyenne exacte de l'ancien écran authentifié avant correctif NON PROUVÉE : ne pas prétendre avoir observé sa valeur ni attribuer une valeur inventée à un recalcul de snapshot.

## Tests exécutés
- 26 tests Vitest PASS : deux copies/dates, correction rétroactive, maintien t2, recalcul de la copie sélectionnée, source/identité, ancien/V2, attente et relecture du vrai panneau CRM (fixture).
- Chromium 1280×1800 et 390×844 : vrai panneau sur fixture, 11,6 visible, zéro erreur JS, toute requête externe interceptée ; aucun bouton de reset utilisé. Captures inspectées. Sur mobile, le bouton global préexistant est partiellement coupé ; hors périmètre, laissé inchangé.
- Build observé OK. Session réelle élève/CRM non ouverte : valeur effectivement affichée sur gestion.ftransport.fr NON PROUVÉE, la valeur attendue est prouvée par SELECT+calcul+fixtures.

## Solution proposée, non implémentée et sans écriture
Si l'admin veut retenir 13 au lieu de 2 : action dédiée « Retenir cette copie pour la moyenne », scoped apprenant/examen/matière/attempt_id, confirmation nominative avec avant/après 11,6→13,6 et verdict, événement append-only réversible et contrôlé admin. Les écrans partagent une projection de cette décision ; sans décision ils gardent dernière tentative. Elle ne renote pas, ne neutralise pas, ne masque pas et ne modifie pas les copies, notes ou jalons. Accord spécifique et preuve serveur nécessaires avant préparation/activation.

Aucune mutation réelle, migration, reset, IA, email ou déploiement. Chantiers accès/session et menu QRC laissés intacts.