# EB3 TAXI — 09/11/2026 22:36 UTC

## État effectif
- Correctif QRC urgent existant réutilisé ; aucun correctif concurrent et aucun nouveau déploiement frontend demandé. Public `gestion.ftransport.fr` : `index-Cv4rxQEI.js`, normalisation conservatrice et bouton explicite Enregistrer présents. 39 tests ciblés PASS.
- EB3 TAXI version 2 publiée via l'écran admin à **22:40:49.009086 UTC**, identifiant `dd0a21d4-ac73-45fc-8134-6c3668ef610c`, empreinte `6b714224a3df61930acf727983fc7b81`.
- Après relecture : `core_sujet_publie('EB3-TAXI') = true` via session admin ; raccordement réel déjà actif. EB3 VTC version 2 inchangée.

## Source et contrôle
Source unique : module admin 90008, enregistré le 30/10/2026 14:28:03.787 UTC ; empreinte originale `c960df5f16fd37e0e0fd44a6a4cfd446`, inchangée après publication.
Une seule référence, sept matières, 107 questions : 91 QCM/16 QRC. Comparaison exacte entre JSON enregistré et source affichée : aucun écart d'identifiant, ordre, type, énoncé, propositions, bonnes réponses, corrigé QRC, mots-clés ou indicateur de calcul. Relecture de version complète conforme par `controlerVersionPubliee`.

| Matière | Questions QCM/QRC | Coefficient | Seuil /20 | Durée min | Points bruts |
|---|---|---|---|---|---|
| T3P | 10/5 | 3 | 6 | 45 | 20 |
| Gestion | 16/2 | 2 | 6 | 45 | 20 |
| Sécurité | 20/0 | 3 | 6 | 30 | 20 |
| Français | 7/3 | 2 | 6 | 30 | 20 |
| Anglais | 20/0 | 1 | 4 | 20 | 20 |
| Nationale TAXI | 12/4 | 3 | 6 | 30 | 20 |
| Locale TAXI | 6/2 | 3 | 6 | 20 | 20 |

Sécurité/Anglais : 120 différences informatives avec juillet (20 × propositions/clés/points pour chacune), aucun ancien snapshot réutilisé pour la nouvelle version.

## Tests exécutés
66 tests partagés PASS : routage sans publication, réouverture, révision connue, projection snapshot, copie figée, finalisation, correcteur V2 et notes QCM/QRC. 39 tests pré-note et sélection/enregistrement manuel PASS. Ces tests sont simulés et ne constituent pas un nouveau parcours élève réel complet.

## Limite importante non résolue
Le routage reprend une matière V2 ouverte avant de consulter la version actuelle. Mais il considère ensuite n'importe quel historique V2 comme une preuve de circuit V2 et protège le passage ancien seulement si cet historique est absent. Il n'existe pas de liaison serveur immuable au passage global ancien.

Lecture réelle avant activation : huit lignes canoniques anciennes en cours chez deux dossiers (mai), sans historique V2 ; 35 lignes à ancienne clé chez cinq dossiers (mars), dont 14 lignes chez deux dossiers avec historique V2. Ces marqueurs ne prouvent ni une connexion actuelle, ni une obligation encore active ; ils ne prouvent pas non plus que la reprise est sûre. La publication a été effectuée, mais cette garantie de préservation exhaustive n'est **pas démontrée** et ne doit pas être annoncée comme acquise.

Aucune réponse, note, correction, signature, tentative ni snapshot existant volontairement modifié ; aucune migration. Aucun vrai passage lancé, aucune correction réelle de test. Ne pas déclarer le parcours réel soumission→correction→note entièrement vérifié.