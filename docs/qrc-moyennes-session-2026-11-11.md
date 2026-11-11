# Filtre Examen blanc et moyennes — 11/11/2026

## Fonctionnement
Tous les examens présente une colonne par EB et filière de la session (VTC/TAXI/TA/VA séparés). Un clic sur la moyenne ou le filtre ouvre le général et les matières. Tous les inscrits restent visibles ; les autres filières portent Non concerné.

La ligne Moyenne de la session calcule la moyenne arithmétique des seules notes officielles définitives déjà lues, sans recalcul individuel. Zéro définitif inclus ; provisoire, absence, preuve impossible exclus. Effectif n/N selon les inscrits de la filière. Aucune note définitive si n=0. Les matières utilisent noteExamenAffichee indépendamment des autres matières et du général.

Sélection tentative/reset/archive et publications inchangées ; aucune lecture supplémentaire au filtre. Les données de matières sont projetées depuis les mêmes lignes bornées déjà chargées.

## Preuves
- Tests fictifs exécutés : zéros, attente, EB1 VTC/TAXI séparés, EB2 distinct, matière définitive malgré général en attente, absence et session vide, note officielle matière.
- Navigateur fixture : cinq inscrits conservés au filtre ; général 0/20 (1/2), Gestion 7/20 (2/2), Français 10/20 (1/2) ; TAXI 20/20 séparé ; session vide 0/0 sans zéro inventé.
- Admin réel lecture seule, session VTC/TAXI 02–13 novembre : 16 apprenants et synthèse ; EB1 VTC général 11,3/20 (9/10), T3P 13,8 (9/10), Gestion 12,3 (9/10), Sécurité 11,7 (10/10), Français 12,2 (9/10), Anglais 9,9 (10/10), F(V) 10 (10/10), G(V) 9,3 (10/10).
- Changement de filtre réel : zéro requête supplémentaire ; zéro mutation ; zéro lecture globale de copies. Captures PC/mobile sous `/tmp/browser/moyennes-session/`.
- Aucun changement de données, migration ou publication.