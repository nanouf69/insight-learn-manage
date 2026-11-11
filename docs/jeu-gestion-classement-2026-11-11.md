# Jeu GESTION — classement comptable

## Livraison
- Aperçu seulement, aucune publication, migration ou écriture Cloud effectuée.
- Affichage additive dans GESTION VTC/TAXI (14/20), et dans la page de cours Gestion des anciens conteneurs 2/10. Aucun ajout aux banques, pages enregistrées ou examens.
- 19 cartes, quatre zones ; glisser-déposer sur ordinateur, sélection et bouton de zone sur téléphone/clavier ; correction immédiate, détail des catégories, score des premiers essais et recommencer.
- Rémunération et cotisations séparées ; hypothèses société, banque positive, entretien courant, stock de clôture, capital restant dû, bénéfice avant affectation explicites. Téléphone en charge et téléphone immobilisé sont deux hypothèses alternatives.
- Calcul : 20 000 / 5 = 4 000 €/an ; 3 années pleines = 12 000 € cumulés ; VNC = 8 000 €. Amortissements soustraits du brut à l’actif, pas placés au passif.
- Exemples indépendants : résultat 12 461 € du compte de résultat, résultat 20 000 € du bilan. Bilan repris du support Gestion Partie 1, page 20 : 6 000 + 200 + 15 000 + 0 + 18 800 = 40 000 € nets, face à 20 000 + 20 000 = 40 000 €. Les bruts/amortissements non fournis ne sont pas inventés. Le véhicule du mini-calcul est indépendant.

## Sauvegarde
Identité dédiée `jeu_gestion_classement_comptable_v1`, file et lecture serveur existantes `useSuiviJeu` ; `module_id: null`, `score: null`, sans registre d’activités ni callback de validation : aucun impact sur les jalons, notes ou exercices précédents. La lecture doit réussir avant tout envoi. La partie est restaurée à la réouverture. Recommencer lance un entraînement local sans écraser les acquis enregistrés. Aucun compte élève réel testé en écriture.

## Vérifications
- 41 tests exécutés PASS : 27 classement/calcul/fixtures, 2 tests du vrai suivi (score/module null, confirmation et réouverture) et 12 régressions jeux Lyon/jours fériés.
- Navigateur Chromium 1280×1800 et 390×844 : erreur puis correction, score 18/19, glisser-déposer ordinateur, choix tactile, clavier, calcul erroné puis exact, recommencer, aucun débordement horizontal, aucune erreur JS, écritures Cloud interceptées et aucune déclenchée.
- Captures `/tmp/browser/gestion-comptable/` inspectées ; pas de copie user-facing demandée.
- Compilation observée : build OK ; contrôle ESLint des nouveaux fichiers de jeu sans erreur.
- Limite : persistance démontrée avec le vrai hook et transport fictif, pas d’envoi réseau réel ni test d’un compte réel. Captures originales non relues depuis le montage d’uploads indisponible ; bilan vérifié sur le texte du support existant, sans modifier celui-ci.
- Aucun correctif des rafraîchissements périodiques préexistants dans le cours : conflit avec règle zéro polling signalé, hors périmètre de ce jeu.

## Décision technique
Suivi facultatif versionné indépendant, sans inscription au registre obligatoire ; pourquoi : enregistrer la réalisation sans changer les obligations ou les notes existantes. La racine AGENTS.md est à sa limite de taille et n’a pas été modifiée.