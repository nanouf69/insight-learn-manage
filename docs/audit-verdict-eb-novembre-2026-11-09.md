# Audit lecture seule — verdicts examens blancs de novembre

## Décision
Aucun correctif, test d'écriture, recalcul enregistré, migration ou publication. Préparations EB3 inchangées. **Aucun faux verdict définitif « échoué » avec moyenne finale >10 n'est prouvé par les lectures actuelles.** Le signalement terrain reste à rattacher à un écran/copie précis ; absence de preuve n'est pas preuve d'absence du bug.

## Périmètre vérifié
- Journée : Session VTC et TAXI, du 2 au 13 novembre 2026, 16 inscriptions.
- Soirée : Session VTC cours du soir, du 2 au 13 novembre 2026, 18 inscriptions.
- TAXI/TA lié : du 26 octobre au 16 novembre 2026, 12 inscriptions.
- 46 inscriptions, 40 personnes uniques : 28 VTC, 6 TAXI, 6 TA. Six inscriptions croisées ne sont pas additionnées au total unique. Les résultats VTC/TAXI de ces membres sont lus ; les examens TA autonomes ne font pas partie du signalement.
- FC et session d'examen administratif du 17 novembre exclues : ce ne sont pas les sessions de préparation jour/soir concernées.
- 368 lignes de résultat matière historiques lues ; 286 enregistrées depuis le 1er novembre. 268 passages V2 terminés depuis novembre, états QRC et révisions de résultats lus séparément. Archives et neutralisations écartées de la projection.
- Dernières sélections comportant une matière remise en novembre : 47 ensembles élève/examen, 34 personnes (VTC/TAXI). Un ensemble peut reprendre des matières antérieures selon le comportement existant. Ce ne sont pas 47 tentatives globales immuables distinctes.

## Règle métier retrouvée — ne pas remplacer par >=10 seul
Moyenne pondérée >=10/20, toutes les matières comptabilisées et aucune matière sous son minimum : **6/20, sauf anglais 4/20**. Une matière à 8/20 peut être non éliminatoire ; son champ `reussi` n'est pas le verdict global. Une révision des mauvaises réponses a un autre statut, exclu de ces lectures.

La moyenne globale est arrondie à une décimale **avant** comparaison à 10. L'élimination matière compare la note normalisée non arrondie. La note du nouveau moteur est déjà /20 ; aucune nouvelle division par le barème.

## Résultats des projections en lecture seule
Les fonctions réellement présentes dans le projet ont été appelées localement sur les lectures : sélection tentative, preuves réponses/QRC, attachement du passage, scoring et publication. Aucun client Cloud n'a exécuté de requête depuis ces scripts ; seuls les outils SELECT ont interrogé la base.

| Session | Ensembles avec activité novembre | Réussite calculée sans attente | Échec calculé sans attente | Attente/non-final |
|---|---:|---:|---:|---:|
| Journée VTC/TAXI | 29 | 10 | 2 | 17 |
| Soirée VTC | 18 | 9 | 5 | 4 |
| TAXI/TA lié | 12 | 3 | 1 | 8 |
| Unique, sans doublons intersessions | 47 | 19 | 7 | 21 |

- **0/286 lignes matière de novembre** avec `reussi=false` et `note_sur_20>10`.
- **0/47 ensembles** avec moyenne projetée >10, toutes matières présentes, aucune éliminatoire, mais verdict calculé échoué.
- Les **7 échecs sans attente** ont des moyennes entre **5,6 et 8,2/20**, pas >10.
- **16 ensembles, 7 personnes** ont une moyenne de travail >10 mais une attente/non-finalité ; huit ensembles sont aussi incomplets. Aucun ne doit être certifié échoué ni réussi définitivement sur cette moyenne de travail.
- Les quatre ensembles en attente de soirée ont des moyennes projetées 8,3–9,5. Deux possèdent des notes anciennes >10 globalement avant substitution de notes serveur du même passage : c'est une divergence de source de note, pas une preuve que le site montre une note finale >10 avec échec.

Lectures effectuées pendant une activité élève réelle : la base n'a pas été figée et les différents SELECT ne constituent pas un instantané transactionnel. Les projections sont un contrôle des lectures, **pas un constat DOM authentifié de chaque élève**. Le compteur réel peut évoluer pendant l'audit.

## Exemples anonymisés
- **SOIR-A, EB1** : moyenne projetée 12,2, sept matières, aucune éliminatoire : réussite calculée.
- **SOIR-B, EB1** : moyenne 6,9 avec Gestion sous 6 : échec cohérent.
- **SOIR-C, EB1** : ancienne moyenne 11,0 ; projection même copie 9,5, T3P nouveau passage encore provisoire (5 QRC) : attente, pas de verdict définitif.
- **JOUR-A, EB2** : moyenne de travail 11,5 sur une seule matière : incomplet/QRC en attente, pas un examen terminé.
- **TAXI-A, EB1** : moyenne de travail 13,2 sur cinq matières ; Français/Anglais manquants, QRC T3P/Gestion en attente : pas de verdict définitif.
- Un membre TA a deux examens VTC historiques de mars >10 avec matière éliminatoire : hors incident novembre récent, échec permis par la règle ; ne pas les renoter.

## Emplacements et causes vérifiables
1. `src/components/cours-en-ligne/examens-blancs-scoring.ts:429–455` : `admisGlobal` combine moyenne, éliminatoires et nombre de matières. L'incomplet retourne false, sans état distinct.
2. `src/components/cours-en-ligne/ExamenBlancsResultats.tsx:556–565,610–657` : si pas d'attente QRC, tout `admisGlobal=false` affiche « Examen blanc échoué ». Le bandeau ne distingue pas un examen incomplet et n'explique que moyenne insuffisante/éliminatoires. **Défaut de classement d'affichage certain dans le code** ; incident réel novembre exact non reproduit dans un navigateur.
3. `examens-blancs-utils.ts:471–479` : conversion /20 puis comparaison au minimum. Pas de seuil global `>10` au lieu de `>=10` sur ce chemin.
4. `coreExamPublication.ts:106–128,146–171` et `noteExamenAffichee.ts:32–67` : dernière révision serveur et identité exacte ; provisoire/QRC restantes bloquent. Les marqueurs historiques/notes enregistrées ne sont pas interchangeables avec le résultat serveur.
5. `ExamenBlancsResultats.tsx:112–127,145–150` : corrections React initialisées au montage puis préférées par index. Risque de cache périmé lors d'une mise à jour de résultats legacy ; **pas de preuve que cela cause le signalement**.
6. `examens-blancs-utils.ts:188–220` : complément des anciennes tentatives peut aussi remplacer une matière existante via `pickBestScoreRow`, selon horodatage. Écart par rapport à la règle « anciennes seulement pour manquantes » ; pas identifié comme cause des copies concernées.

## Site public et logs
HTML et JavaScript publics lus : `/assets/index-BbNPGt9M.js`. La formule `moyenne >= 10 && éliminatoires.length === 0 && matièresPassées === matièresTotal` et le bandeau réussi/échoué existent bien dans ce fichier servi. Aucun changement du site appelé. Logs PostgreSQL filtrés du 6 au 9 novembre : aucune entrée trouvée pour la requête ciblée ; cela ne prouve pas l'absence d'un cache ou d'une erreur navigateur. Aucun écran élève authentifié consulté, pour éviter les effets de connexion/suivi ; reproduction exacte non prétendue.

## Plan de correctif minimal proposé — NON appliqué
1. Partager une décision d'affichage à états distincts : lecture impossible, QRC en attente, examen incomplet, terminé réussi, terminé échoué. Ne pas convertir un `false` de complétude en échec.
2. Pour un incomplet, afficher « Examen blanc non terminé » et n/N ; réserver le verdict définitif aux examens complets sans attente. Aucune note ni progression enregistrée modifiée.
3. Garder la règle actuelle 10 + minima matière ; expliquer précisément toute éliminatoire avec note/seuil. Note et verdict doivent utiliser la même source de copie.
4. Avant toute correction de cache/source, rattacher le signalement exact (copie/screen) et prouver un écart. Ne pas corriger globalement le regroupement, la notation ou les préparations EB3 sur simple soupçon.
5. Après accord, tests isolés : global >10 avec matière éliminatoire ; >10 incomplet ; >10 complet ; 10 exact ; anglais 4 exact ; QRC provisoire/définitive ; mise à jour source/rechargement ; jour/soir VTC/TAXI, lecture seule réelle puis nouvelle autorisation de publication.

**Blocage pour conclure à la cause terrain précise :** aucun écran/copie nommé du signalement n'a été fourni, et aucun couple final >10/échec n'est retrouvé dans les projections actuelles. Demander une capture avec intitulé EB, note et matières (sans réponses personnelles) permet de distinguer incomplet, moyenne ancienne et véritable régression de statut. Ne pas annoncer le bug corrigé.