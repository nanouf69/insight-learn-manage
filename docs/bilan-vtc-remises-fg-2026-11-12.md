# Remises F/G — affichage uniquement

## Correctif séparé du candidat SQL
- Base de comparaison : `7d8484fd909dd61a91b2a2b9f3b870df0bed1e8e`.
- Cinq fichiers fonctionnels : BilanVtcComplements (lecture), BilanFuturePresentation (étapes/récapitulatif partagé), BilanFutureExam et BilanFutureApercuAdmin (récapitulatif), ModuleDetailView (identité du dossier).
- Aucun fichier SQL, migration, droit, barème, contenu ou sauvegarde modifié. TAXI ne monte pas le contexte F/G.

## Source et limites
- Lecture existante `reponses_apprenants`, autorisations inchangées, filtre dossier + identifiants exacts `module_5_exo_505` / `module_5_exo_506`.
- Remise originale uniquement, statut submitted avec date ; aucune révision, fusion, score recalculé ou écriture. Bonnes/total enregistrés affichés comme « bonnes réponses », jamais comme note /20.
- Erreur/refus/absence d'identité : lecture indisponible, pas de total 7 inventé. Remise sans compteurs valides : remis, résultat indisponible.
- Le récapitulatif affiche 5/7 pour la fixture : A–E 3/5, F/G 2/2 ; la barre historique 3/5 et la moyenne pondérée restent A–E. H/QRC et ciblage original F/G inchangés.

## Preuves exécutées
- 13 tests Vitest PASS : cinq nouveaux tests (29/49, 30/46, révision ignorée, zéro réel, résultats invalides/doublons, refus, clics), huit tests existants. Les tests anciens élève produisent leur avertissement de mock auth incomplet ; assertions PASS, aucune preuve de barème supplémentaire tirée de ce mock.
- Quatre parcours Playwright PC/mobile × élève/admin : récapitulatif identique, F→retour→G→retour, lectures simulées, zéro RPC d'ouverture/remise/sauvegarde admin. Connexions externes bloquées. Screenshots examinés PC élève/mobile admin.
- Compilation preview : build OK.
- Asset public vérifié en lecture anonyme : `index-B2Ct4Pxg.js` contient les deux intitulés F/G et le retour A–E. Ceci ne démontre pas le rendu du dossier réel ni que ce nouveau correctif est publié.
- Aucun compte réel, nouvelle requête nominative, écriture production, publication ou envoi. Sans capture de l'écran concerné : onglet/cache, droits effectifs et rendu authentifié du dossier restent non vérifiés.