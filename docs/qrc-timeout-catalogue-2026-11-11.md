# Timeout Correction QRC V2 — 11/11/2026

## Cause reproduite, non extrapolée
Compte admin réel restauré, appels SELECT seulement. `listerGroupesCrm` échoue avant `chargerSessionTest`.
Requête exacte : `apprenant_quiz_results?select=id,apprenant_id,quiz_id,matiere_id,tentative,details,completed_at,rep:details->reponses&quiz_type=eq.examen_blanc&quiz_id=ilike.eb%&completed_at=not.is.null&order=completed_at.desc,id.asc&offset=0&limit=1000`.
HTTP 500 / SQLSTATE 57014 `canceling statement due to statement timeout`, 8170 ms ; premier essai 8263 ms au total, second 8177 ms.
Les traces DB interrogées n'ont pas retourné l'incident ; la trace réseau admin réelle l'identifie. Aucun EXPLAIN ANALYZE répété ni index/migration prod. Catalogue faisait aussi un scan global QRC inutile (216 appels cumulés, moyenne 1270 ms/max 6389 ms dans pg_stat_statements) et plusieurs grandes pages snapshots en parallèle. Index existant `idx_aqr_eb_termines_id` et PK vérifiés en SELECT : ordre id compatible, au lieu de tri global completed_at + OFFSET.

## Aperçu
Copies lourdes séquentielles de 100 par curseur id/attempt_id, filtre natif `etat=terminee` et is_test ; pagination jusqu'à épuisement, aucune limite de volume. Historique garde filtre EB + remise. Le scan global qrc_instances_v2 est supprimé ; les answer_state pour preuve miroir sont bornés aux identités possédant effectivement une projection candidate. Preuve stricte et catalogue inchangés, archives uniques préservées. Les snapshots complets restent nécessaires à la preuve de miroir et sont encore lus au démarrage ; le catalogue n'est donc pas instantané.
Recherche approfondie archives différée jusqu'aux vues Archives/À vérifier ; inventaire déjà monté uniquement sur action Contrôle des copies. Aucun timeout rallongé. Filtre vide explicite du chargeur retourne vide sans scan global.
État distinct du catalogue/copies : aucun « Aucune question » avant lecture complète réussie. Échec : « Chargement des notes interrompu — Réessayer », bouton fonctionnel même sans catalogue. Dernière grille confirmée conservée si filtre inchangé, clairement marquée ; changement session/examen/date efface l'ancienne grille et génération refuse réponses tardives. À corriger/Toutes les notes et menu tous passages/grille en premier conservés.

## Mesures réelles (SELECT)
Après : 7316 identités distinctes dans le catalogue (toutes sessions, déduplication stricte, inscriptions croisées non additionnées).
- Premier contrôle après : catalogue 38,98 s ; session VTC/TAXI novembre EB1 68 passages / 157 QRC, chargeur 5,25 s, zéro HTTP refusé.
- Tous les passages EB1 : catalogue 35,72 s ; 664 passages / 1548 QRC, chargeur 10,05 s, zéro refus.
- Autre contrôle sous charge ambiante : catalogue 99,86 s ; chargeur 9,18 s, catalogue complet sans 57014. Requête indépendante de compteur à 664 UUID a reçu HTTP 400 (URL trop longue) ; ce contrôle est refusé, pas compté comme PASS.
- Contrôle compteur corrigé par lots de 100 : catalogue 53,23 s ; chargeur 5,67 s ; 1572 QRC serveur sur les mêmes 664 IDs contre 1548 QRC correcteur. Écart 24 = copies neutralisées en consultation seule, volontairement hors notation ; SELECT indépendant confirme 24 QRC EB1 neutralisées. Un SELECT global plus tard compte 1598 QRC EB1 dont 24 neutralisées : périmètre différent des 664 IDs catalogue (nouvelles remises/comptes exclus possibles), jamais déclaré égal.
Avant : pas de couverture affichable car requête arrêtée. Après : 7316 copies distinctes retrouvées sans résultat tronqué ; pas de promesse de temps maximal sous charge.
La navigation réelle complète vers les cellules n'a pas été capturée sous session admin ; les lecteurs réels ont été exécutés avec la page admin ouverte. Grille, clics, filtre et reprise visuels : données fictives seulement.

## Vérifications
63 tests Vitest PASS : menu réel >1000 lignes, copies QRC >1000, curseur, doublon/mirror, timeout initial, retry, permissions refusées, vide confirmé, dernière grille après coupure, génération tardive et navigation/sauvegarde fictive. Chromium 1280×1800 / 390×844 : grille, Tous les passages, copies distinctes, Toutes les notes, À corriger, archives secondaires ; timeout fictif initial puis Réessayer retrouve la grille sans faux vide. Aucun POST de donnée réelle.
Build harness OK après correction de deux options tests TypeScript.
Aucune note/copie/réponse/donnée réelle/migration prod/publication modifiée. Le correctif est en aperçu, pas déclaré réglé en production. Charge ambiante variable et coût du catalogue complet restent une limite explicitement mesurée.
