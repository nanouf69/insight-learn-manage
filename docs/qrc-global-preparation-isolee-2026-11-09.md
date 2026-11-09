# QRC EB1–EB6 : préparation isolée du correcteur unique

## Décision
**Préparation et tests réalisés ; NO-GO pour mise en service.** Aucune migration réelle, écriture Cloud, import de copies, publication ou déploiement. Aucun changement dans les écrans actifs, l’authentification, les notes, les protections EB3 ou les verdicts « échoué ».

Le prototype ouvre les identités historiques dans **le véritable écran AdminCorrectionQrcV2Reel**, par substitution de son transport uniquement dans Playwright. Aucun ancien correcteur n’est ouvert. Le candidat reste hors migrations actives et hors imports de l’application.

## Isolement vérifié
- Chaque contrat crée un cluster PostgreSQL neuf sous `/tmp/pg-http-22p05-*`, avec port dynamique distinct de 5432, écoute 127.0.0.1 uniquement.
- Toutes les commandes SQL du harnais indiquent explicitement hôte, port, utilisateur et base locale ; variables PG héritées retirées du processus psql.
- Fixtures synthétiques exclusivement : aucune ligne, réponse, identité ou note d’élève réel copiée.
- Les droits admin du harnais viennent d’une table de rôles locale ; aucune session ou clé réelle utilisée. Ce contrôle ne constitue pas un test de l’authentification hébergée.
- Seules lectures Cloud de cette intervention : colonnes des quatre tables sources et inventaire agrégé des clés JSON, via l’outil SELECT.
- Dans le navigateur, les modules Cloud et IA sont remplacés avant exécution ; connexions au domaine de données interdites. L’API HTTP est locale et appelle le PostgreSQL jetable.

## Candidat préparé
1. Projection native + historique sans import. Identité historique `history:<result_id>:<question_id>`, matière/examen/tentative conservés. Pas de dédoublonnage par texte, date ou proximité temporelle.
2. Exclusion d’une ligne historique seulement lorsqu’un lien natif porte result_id, apprenant, examen, matière et tentative concordants. Deux lignes historiques ambiguës sont conservées et refusées à la notation.
3. Remise historique exigée sur même exercice/tentative, completed + submitted + submitted_at et réponses exactement identiques. Sans preuve : ligne conservée avec motif de refus.
4. Questions et barème issus des JSON enregistrés uniquement, jamais du cours courant. Sources divergentes, IDs répétés, absence de barème/corrigé : refus explicite.
5. Lecture admin par curseur d’identité et pages de 1 à 1 000, filtre exact examen/session, rattachement aux inscriptions et dates effectives Paris. Une inscription croisée expose la même identité dans deux sessions, sans création de copie.
6. Notation historique admin : événement séparé, note bornée par barème, empreinte + révision attendues, verrou par commande et par QRC, unicité commande et identité/révision, relecture. UPDATE/DELETE des événements interdits, même avec le rôle propriétaire du harnais.
7. Les notes originales, réponses et résultats natifs ne sont jamais modifiés par cette fonction. Pas de recalcul de matière/global : seules les corrections séparées sont projetées.

## Résultats réellement exécutés

| Scénario | Résultat et niveau de preuve |
|---|---|
| PostgreSQL : 24 examens × 7 matières historiques + 24 lignes natives | PASS, 192 lignes lues, 168 corrections séparées, empreintes des sources inchangées |
| EB1–EB6 VTC/TAXI/TA/VA | PASS pour chacune des 24 identités synthétiques |
| EB2 VTC novembre journée et soirée | PASS filtres SQL ; affichage V2 + reprise tablette journée/téléphone soirée |
| Pagination 1 205 QRC historiques | PASS, toutes lues par pages de 500, aucune identité répétée ; preuves non suffisantes gardées en refus |
| Lien V2 exact et lien mauvais examen | PASS : exclusion exacte uniquement |
| Deux tentatives même texte/même date | PASS : deux identités conservées |
| Plusieurs résultats d’une même tentative / IDs question répétés | PASS : copies conservées, notation refusée |
| Snapshot divergent, barème/corrigé absents, remise non prouvée | PASS : refus sans événement |
| Double commande concurrente, confirmation perdue, 12 retries | PASS : un seul événement, même retour |
| Deux commandes concurrentes différentes | PASS : une acceptée, une périmée refusée ; révision suivante append-only |
| Échec après INSERT d’événement | PASS : rollback, zéro événement, sources inchangées |
| Admin/élève/session absente/anon/direct INSERT/UPDATE/DELETE | PASS sur rôles PostgreSQL locaux |
| Native en cours + notes hors barème | PASS : aucun changement source |
| Vrai écran V2 → HTTP local → PostgreSQL jetable | PASS : 168 corrections, sept matières pour chacune des 24 identités |
| Révision V2 : réponse HTTP 503 après commit puis même retry | PASS : un seul événement supplémentaire, note relue, aucune duplication |
| Rechargement et changement ordinateur→tablette→téléphone | PASS Chromium, 1280×1800 / 820×1180 tactile / 390×844 tactile |
| Tests existants V2 | PASS 76/76 dans cinq fichiers |
| Compilation automatique | PASS, dernier signal lu : build OK |

**Totaux : 12 contrats PostgreSQL PASS ; 76 tests existants PASS ; 24 parcours V2 complets de sept matières, une révision avec retry et deux reprises tactiles PASS.** Ne pas additionner les assertions/scénarios aux tests unitaires comme s’ils étaient des tests distincts.

Le premier parcours navigateur a échoué sur une attente erronée du bouton Suivant sur la dernière copie. L’attente du harnais a été corrigée, aucun code actif changé ; deux exécutions suivantes réussies, dont celle avec panne HTTP.

Preuves locales : `/tmp/qrc-global-sql.log`, `/tmp/qrc-global-regression.log`, `/tmp/qrc-global-browser.log`, captures `/tmp/browser/qrc-global/screenshots/`. Ces fichiers temporaires ne sont pas des livrables persistants.

## Limites bloquantes avant une intégration réelle
1. **Exhaustivité non acquise sans inventaire de questions.** Un résultat sans tableau de questions figées ne produit aucune cellule QRC. Le test confirme cette limite ; il faut une liste de copies « preuves manquantes » dans le même écran, et un adaptateur documenté de leurs preuves éventuelles. Interdit de reconstituer une question depuis la banque courante.
2. **Corrections historiques déjà présentes non projetées.** Le candidat initialise les QRC historiques en attente et ne sait pas encore lire fidèlement les corrections humaines/IA préexistantes et leur priorité. Il est donc interdit de l’activer : il pourrait proposer une nouvelle correction d’une QRC déjà corrigée.
3. **Liens V2 insuffisamment certifiés pour toutes les générations.** L’exclusion exact-ID est testée sur un format synthétique ; les formats réellement importés, leurs preuves de questions/réponses et d’autres chemins de liaison restent à qualifier. Un champ result_id seul, même avec identité concordante, ne prouve pas toute l’équivalence pédagogique.
4. **Snapshots natifs ambigus incomplets.** Le candidat natif prend une question concordante avec LIMIT 1 ; il ne certifie pas encore doublons, empreinte recalculée, corrigé manquant et tous les formats natifs. Les sources sont intactes mais ce lecteur n’est pas un lecteur publiable.
5. **Catalogue et déclencheurs complets non rejoués.** Tables sources locales simplifiées à partir des colonnes lues ; contraintes, politiques, triggers et chemins UPDATE/import/service réels non reproduits intégralement. Une modification source concurrente n’est pas encore verrouillée par le candidat ; CAS seul ne certifie pas la course avec un autre chemin serveur.
6. **Sessions et lectures réseau partielles.** SQL teste deux inscriptions réellement présentes dans le harnais, dates effectives et filtrage. Transport navigateur synthétique crée les deux choix ; e-learning, conflits, inscriptions >1 000, filtre date et toutes limites PostgREST restent à couvrir.
7. **API de production non intégrée.** Chaîne HTTP locale réelle, mais pas PostgREST/handler de production ni Realtime hébergé. La panne 503 injectée après commit simule une confirmation perdue ; ce n’est pas une coupure radio physique.
8. **Navigation mobile existante étroite.** Capture téléphone : panneau et matrice se partagent la largeur, libellés de menu tronqués. Rechargement et réponse visibles, mais ergonomie globale mobile non certifiée ; aucune retouche active hors scope.
9. **Notes matière/global hors prototype.** Aucune nouvelle note officielle ou progression calculée. Une éventuelle publication d’un résultat révisé séparé, sa priorité à l’affichage et l’interopérabilité avec le moteur natif exigent un contrat supplémentaire.

Conclusion : preuve utile du **même workflow V2 sur sources synthétiques**, pas preuve de remontée exhaustive et correction sûre de toutes les copies réelles. Nouvelle autorisation nécessaire avant tout acte réel ; ces candidats ne doivent pas être appliqués tels quels.

## Fichiers de cette préparation
- `src/test/qrc-global-isolated/AGENTS.md`
- `src/test/qrc-global-isolated/candidate.sql`
- `src/test/qrc-global-isolated/fixture.py`
- `src/test/qrc-global-isolated/sql_contract.py`
- `src/test/qrc-global-isolated/browserTransport.js`
- `src/test/qrc-global-isolated/harness.html`
- `src/test/qrc-global-isolated/harness.tsx`
- `src/test/qrc-global-isolated/browser_contract.py`
- `docs/qrc-global-preparation-isolee-2026-11-09.md`
- `roadmap.md` : seulement section de suivi de ce travail.
- Mémoire : rappel de l’autorisation jetable et de l’interdiction de l’ancien correcteur.

`AGENTS.md` racine : ajout essayé mais refusé par limite de taille, fichier inchangé ; frontière enregistrée dans le dossier de tests.

Diff fonctionnel actif de cette intervention : **aucun**. Les prototypes ne sont référencés ni dans les routes actives ni dans l’historique de migration. Les commandes Git en lecture sont vides au contrôle, le suivi du projet pouvant enregistrer automatiquement les fichiers ; cela ne constitue pas une preuve de diff de publication ciblée et aucune publication n’est demandée.

Site public lu en fin de tests : `/assets/index-BbNPGt9M.js`. Ce contrôle ne valide ni l’écran admin public ni l’état exhaustif de ses menus ; aucun déploiement déclenché par cette préparation.