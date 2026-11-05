# Indicateur premier passage — admin TA, 05/11/2026

## État réel
**Ajout en aperçu, NON PUBLIÉ.** Les six examens existants de la passerelle VTC→TAXI sont concernés : `eb1-ta` à `eb6-ta`, modules virtuels 90012, 90018, 90019, 90020, 90021, 90022. Les matières restent F(T) nationale et G(T) locale ; ni module ni contenu n'est créé ou modifié.

## Changements limités
- `ExamensBlancsEditor.tsx` : autoriser aussi les six IDs TA pour l'indicateur déjà intégré dans la liste admin.
- `premierPassageExamStats.ts` : un sélecteur pur d'identités, TA lit exclusivement son propre ID. Corps des calculs de preuves inchangé.
- `premierPassageExamStatsRead.ts` : employer ce sélecteur ; appels admin paginés existants inchangés, uniquement lectures.
- `premier-passage-ta-stats.test.ts` : 15 tests de portée, preuve, sessions et conservation.
- Règle d'isolation et état du chantier consignés dans AGENTS/roadmap.

Les périmètres VTC/TAXI sont strictement inchangés. Leurs observations ne sont pas ajoutées aux TA, même pour une matière partagée : aucun rapprochement supplémentaire de copies. Aucun changement du composant commun, des filtres, calculs de note, règles de sauvegarde, droits, routage ou écran élève. Aucune migration ni fonction déployée.

## Audit lecture seule
113 tentatives V2, 247 résultats et 11 versions TA enregistrés. Les schémas restent les mêmes que pour VTC/TAXI : `attempt_id`, événements première révision 0→1 ou chaîne historique journal/remise/corrigé figé. Sans preuve complète, « Données insuffisantes » ; aucun taux issu de la note actuelle. Les QRC ne sont ni comparées mot pour mot ni soumises à une IA.

Sessions en cours affichées (05/11/2026, Paris) : TAXI/TA 26/10–16/11 journée (12 inscrits éligibles), VTC/TAXI 02–13/11 journée (16), VTC cours du soir 02–13/11 soirée (18). N compte seulement les premières réponses prouvées, pas les inscrits. Une même personne peut figurer dans plusieurs sessions mais une seule fois au global.

## Vérifications exécutées
- **57 tests ciblés PASS** : 15 TA + 22 examens existants + 20 exercices.
- **123 tests critiques examens PASS** : copies/snapshots, sauvegarde, délai, finalisation, QRC, notes.
- **Suite générale : 3450 PASS, 5 FAIL, 13 ignorés.** Les cinq échecs identiques au constat antérieur : quatre mocks sans auth.getSession dans gel-par-module-raccordement, un ancien attendu agenda dans suivi-formation-indicateurs. Aucun de ces fichiers n'a été changé.
- **Navigateur admin réel en lecture seule** : ouverture de chacun des six examens TA, matière nationale, 16 indicateurs par examen ; filtres journée/soirée et session précise fonctionnels, noms/dates affichés.
- **PC 1280×1800 et mobile 390×844** : captures des filtres et du bloc de taux ; aucun débordement de ce bloc, zéro erreur JavaScript. Les dispositions préexistantes de l'éditeur ne sont pas retouchées.
- Les premières réponses et références disponibles ne permettent pas un taux numérique exhaustif ; les messages « Données insuffisantes » et « Aucune réponse » ont été observés réellement. n/N numérique validé par tests isolés, pas prétendu observé sur les données anciennes.
- Dernier contrôle aperçu : **build OK**.

## Comparaison avant/après
Empreintes de chaque ligne module, ensemble de tentatives, résultats et versions **identiques** entre les deux lectures ; nombres inchangés. Exemples :

| Élément | Empreinte avant = après |
|---|---|
| Module 90012 | 4fe9a01fd6267555b2486fffed17ff6e |
| Tentatives eb1-ta (29) | cd5efe1c9fda7afa42d21b4ac26d6ddf |
| Résultats eb1-ta (84) | 44abd9f4add8049f7e99f8d6bfe96323 |
| Versions eb1-ta (2) | 6ec075ed296de862891d5c8191784f2f |
| Module 90022 | 25e04cca983b3d49bbad1043b9c56cc3 |
| Tentatives eb6-ta (10) | f7b71bcb269665ef3bd1dc45396bbec0 |
| Résultats eb6-ta (29) | c41b8a87a6ae068580efa74f103081ce |
| Versions eb6-ta (1) | 437ffc59ff70dfba4757d09c7d01709b |

Pendant les tests navigateur, une barrière a bloqué les requêtes d'écriture CRM préexistantes (`surveillance_compte_reponses`, `log_error`) ; ces fonctions et leur comportement n'ont pas été modifiés dans l'app. Aucun enregistrement de questions, réponses, notes, examens, progression, signatures ou sessions n'a été exécuté.

Publication interdite sans nouvelle autorisation ; aucun bouton de publication appelé.