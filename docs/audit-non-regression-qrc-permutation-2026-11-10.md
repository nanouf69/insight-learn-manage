# Audit de non-régression — correctif QRC « choix QCM permutés » (10/11/2026)

Production : lecture seule uniquement. Aucune migration appliquée, rien publié, aucune donnée modifiée.

## Décision : NO-GO en l'état — GO conditionnel après un arbitrage
Le correctif fait ce qu'il doit (A+B = B+A pour les QCM seulement) et tous les contrôles d'identité tiennent. Mais il durcit aussi la **modification** des notes : 5 copies EB2 déjà notées par confirmation manuelle ne pourraient plus être modifiées (leur note actuelle reste intacte). Il faut votre choix avant activation.

## Preuves production (lecture seule)
- Fonctions en ligne : `qrc_historique_noter` et `qrc_historique_reviser` (SECURITY DEFINER, aucun droit public). `qrc_historique_preuve_remise` et `qrc_historique_reponses_identiques` **n'existent pas encore**.
- Différence exacte en ligne → candidat (diff ligne à ligne) :
  - comparaison `a.reponses = r.details->'reponses'` remplacée par `qrc_historique_reponses_identiques(...)` dans les deux fonctions ;
  - `noter` : avant, « horodatage divergent » ou « aucune fiche » passaient avec une confirmation texte ; après, « horodatage divergent » passe sans confirmation, « aucune fiche » est **toujours refusé** ;
  - `reviser` : avant, « aucune fiche » passait avec confirmation ; après, toujours refusé.
- Types de questions dans les 5 176 copies EB1–EB6 VTC terminées : uniquement QCM (tableaux) et QRC (texte). Aucune question à ordre significatif.
- Simulation de la règle sur ces 5 176 copies : 1 257 déjà prouvées à l'identique (inchangées), **113 nouvellement prouvées** par permutation (EB1 4, EB2 65, EB3 42, EB4 2), le reste reste refusé (fiche absente, choix réellement différents, clés différentes, ou 370 réponses de copies sans questions figées — refus prudent).
- Journal de corrections historiques : 373 lignes ; 262 « horodatage divergent » (86 copies) et 111 « aucune fiche + confirmation » (35 copies). Sur ces 35 : 30 deviennent prouvées par permutation, **5 n'ont aucune fiche remise** → non modifiables après activation.

## Tests
- Applicatifs : 33/33 PASS (`qrc-liaison-ordre-choix`, `eb2-consultation-v2`, `eb2-historical-note-display`).
- PostgreSQL jetable, nouveau fichier `src/test/qrc-historique/contrat_audit_permutation.py`, base = définitions exactes relues en production puis correctif : 17 nouveaux cas PASS + suites existantes rejouées par-dessus.
  - Périmètre : permutation QCM acceptée ; refus de [A]/[A,A]/[B,A,A], minuscules, F, tableau vide, chaîne « BA », nombres, QRC modifiée d'une majuscule ou d'un espace, clé manquante/ajoutée, QRC sous forme de tableau, types inconnus/ordonnés, snapshot absent/vide/ID ambigu ; fonction sans effet sur les données.
  - Identité : autre élève, autre matière, autre tentative, brouillon, non terminée, sans date → refus et copie identique ; copie en cours, copie liée V2, EB TAXI → refus ; contrôle réservé à l'admin (non-admin, sans session, anonyme refusés).
  - Notes : éliminatoire conservée (3,3/20 → échec), note déjà posée jamais réécrite, QRC restante reste en attente, 4 clics simultanés = 1 seule écriture.
  - Rollback : correctif → retour → catalogue identique à la production, données et journal identiques (empreintes md5).
  - Constat prouvé : `test_regression_revision_ancienne_reconnaissance_manuelle` — copie notée hier par confirmation manuelle, révision refusée après correctif.
- L'ancien test `test_remise_ambigue_exige_confirmation_tracee` (règle avant correctif) échoue logiquement sur le correctif ; remplacé dans le nouveau fichier par la règle du correctif. À mettre à jour dans `contrat_notation.py` lors de l'activation.
- Les 57+27 précédents ne couvraient pas : refus stricts détaillés, snapshot absent/ambigu, copie en cours/V2/TAXI pour le contrôle préalable, anonymes, éliminatoire, concurrence sur copie permutée, rollback, ni la régression de révision. Ajoutés ici.

## Hors périmètre vérifié
Le correctif ne touche ni questions, ni modules, ni réponses élèves, ni moteur V2, ni signatures : seules 2 fonctions remplacées + 2 ajoutées (test rollback). Les 7 matières, la note finale et l'alerte restent calculées comme avant à partir des notes enregistrées.

## Sauvegarde et rollback (préparés, non exécutés)
- `docs/sql-revue/2026-11-10-qrc-liaison-choix-ordre-ROLLBACK.sql` : définitions exactes en ligne + suppression des 2 nouvelles fonctions.
- `docs/sql-revue/2026-11-10-qrc-liaison-empreintes-avant.txt` : md5 des fonctions, empreintes notes/journal (373 corrections, 5 177 résultats EB VTC) et comptes copies V2, événements QRC, modules, émargements.
- Après activation : refaire les mêmes empreintes (identiques attendues hors nouvelles corrections), relire les 3 copies connues (ABDELHAK, DIANE, AIT BALLAGH) en contrôle préalable seulement.

## Risques résiduels
1. 5 copies EB2 non modifiables (choix requis).
2. « Horodatage divergent » notable sans trace de confirmation (voulu par la suppression de la case ; identité prouvée par élève/matière/tentative/réponses).
3. Copies sans questions figées restent bloquées (prudent, à traiter séparément).
4. Publier l'écran sans la migration : copies permutées toujours refusées avec message clair, aucune note faussée.
5. Le clic exact de 09:45 reste non identifié.
