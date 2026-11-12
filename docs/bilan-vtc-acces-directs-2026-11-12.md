# Accès directs F/G — aperçu seulement, 12/11 10:14 UTC

- Base publiée vérifiée : d7e00d6505bf13cbc75f2da24b5bc1821b926d87.
- Deux fichiers fonctionnels : BilanVtcComplements.tsx (accès F/G avant A–E, retour en haut, H/QRC maintenus), ModuleDetailView.tsx (sélection explicite 505/506 après hydratation, priorité sur restauration page/résultat ; composant legacy conservé monté).
- Aucun changement de contenu, module_data, droits, routage, SQL, TAXI ou serveur. A–E reste monté. Aucune nouvelle persistance ; réponses et indices historiques conservés.
- 34 tests Vitest exécutés : compléments, présentation admin, écran futur, snapshots figés, versions/isolation. Avertissements préexistants du mock auth de barème : le barème réel n'est pas prouvé par ces tests.
- Playwright : 1280×1800 et 390×844, admin et élève fictifs ; F/G dans le premier écran, F→G→A–E, reload après G puis clic F ; ancienne page G et résultat G injectés avant premier montage legacy, cible F retenue. Réponses B F/G restaurées, H et lien QRC présents ; ancien parcours VTC conserve F/G dans son menu (replié sur mobile).
- Aucun compte réel, session injectée ou lecture BDD. Harness autonome remplace auth/from/rpc avant montage ; Playwright interdit toute requête extérieure. Admin : RPC aperçu seule, zéro ouverture/sauvegarde/soumission. Élève : ouvertures habituelles A–E et legacy simulées, pas de réponse envoyée ni validation ; ces ouvertures ne sont pas des effets des raccourcis au simple affichage.
- Captures et patch fonctionnel : /tmp/browser/fg-direct ; tests/harness conservés dans src/test.
- Comparaison HEAD avec d7e00d6 : uniquement deux fichiers fonctionnels, tests/harness et journal de ce correctif. Aucun autre chantier à publier dans ce diff. Aucun déploiement demandé.
- NON PROUVÉ : cas réels, toutes variantes historiques, soumission intégrale avec serveur réel, navigation TAXI en navigateur (isolation testée par filtre et diff).