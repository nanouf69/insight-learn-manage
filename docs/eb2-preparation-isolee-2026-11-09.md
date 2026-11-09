# EB2 — préparation et tests isolés du 09/11/2026

## État : candidat, PAS de mise en service

Aucun appel de migration Cloud, déploiement, publication, écriture réelle, mail, SMS, IA ou connexion à un compte élève. Aucun fichier actif de cours, persistance, notes, auth, migrations ou configuration n’a été modifié. Le commutateur `REVISION_FINALISATION_SERVEUR_ACTIVE` reste faux.

## Isolement prouvé

Les contrats utilisent `PgJetable` : `initdb` dans un répertoire unique `/tmp/pg-http-22p05-*`, port libre, écoute 127.0.0.1 ; chaque commande `psql` donne explicitement host/port/user/database et retire toutes les variables `PG*` héritées. Fixtures entièrement synthétiques. Le processus PostgreSQL est arrêté en fin de suite. Aucun catalogue ni aucune donnée réelle n’est importé.

Le navigateur reçoit uniquement un document et un paquet fictif via interception Playwright ; toutes les autres requêtes sont bloquées. La vraie application n'est pas ouverte. Le stockage simule le service partagé ; aucun compte Cloud ni secret n'est utilisé.

## Diagnostic et candidat minimal

- L’écran actif ne charge pas `write_seq`. La copie test le charge, amorce la séquence pour le même apprenant/identifiant uniquement après une lecture réussie non annulée, puis autorise la sauvegarde. Les protections de concurrence de la file restent inchangées.
- Le candidat du 08/11 exigeait un brouillon déjà `completed=true` : il ne réunissait donc pas réellement clôture et résultat. Le nouveau RPC compare `write_seq` ET l’enveloppe relue, verrouille la ligne/identité et écrit `completed`, résultat et reçu dans une seule transaction. Il ne réécrit pas réponses, score ni séquence. Un reçu déjà présent est retourné identiquement après contrôle propriétaire. Une identité nouvelle reste distincte ; conflit historique refusé, sans fusion.
- Reprise : une clôture sans résultat réutilise son identité ; une révision déjà finalisée n’est pas reprise comme brouillon. Le navigateur envoie une sauvegarde NON terminée avant le RPC atomique.
- QRC : zéro mot-clé, mot-clé vide, espaces ou ponctuation seuls ne produisent plus de réussite automatique ; la copie écran garde la réponse et demande une vérification, sans attribuer de faux zéro ni créer de résultat. Les notes officielles et historiques ne sont pas recalculées.

## Résultats réellement exécutés

| Contrôle | Résultat | Preuve / limite |
|---|---|---|
| Contrat PostgreSQL existant du 08/11 | 9/9 PASS | Base jetable ; référence seulement |
| Nouveau contrat PostgreSQL | 18/18 PASS | `src/test/eb2-isolated/finalisation_sql_contract.py` |
| Atomicité clôture puis échec avant résultat | PASS | Exception injectée : ligne identique avant/après ; retry crée un résultat |
| Échec après insertion résultat, avant reçu | PASS | Rollback des trois : completed=false, zéro résultat, zéro reçu |
| Deux connexions concurrentes | PASS | Même reçu, aucune réécriture réponses/score/write_seq |
| Unicité par identité / deux révisions séparées | PASS | Un reçu par identité ; deux identités, deux résultats distincts |
| Accusé perdu et 12 retries | PASS | Commit réel puis retour ignoré volontairement, reçus identiques ; pas une panne réseau physique |
| Séquence périmée et même séquence/payload différent | PASS | Refus 40001, aucune écriture/écrasement |
| Permissions, identité ambiguë, score falsifié, anciens doublons | PASS | Refus sécurisé / historique conservé |
| QRC mots-clés absents/vides/espaces | PASS | Refus serveur sans résultat |
| Suite ciblée de non-régression | 96/96 PASS, 12 fichiers | Inclut 14 tests du candidat ; pas une suite globale |
| Recontrôle final écran + séquences | 21/21 PASS | Recoupe les 96, ne pas additionner |
| Navigateur Chromium tactile | 2/2 PASS | VTC 390×844, TAXI 820×1180 ; sept matières fictives chacun |
| Matière suivante, QCM/QRC, Terminer/retry/reload | PASS fictif | Sept réponses conservées, score de révision 7/7, un résultat ; zéro erreur JS |
| Changement d'appareil | PASS simulé | File/séquence locale effacées, fixture serveur conservée ; aucune tablette physique |
| Compilation automatique | PASS | Dernier journal : build OK ; import superflu corrigé dans copie test |

Traces d’exécution de cette session : `/tmp/eb2-candidate-sql.log`, `/tmp/eb2-regression.log`, `/tmp/eb2-final-ui.log`, `/tmp/eb2-browser.log`. Les captures `/tmp/browser/eb2-isolated/*-finished.png` montrent TERMINE. Le harnais navigateur ne charge pas les styles complets de l’application : ces captures prouvent l'état/interaction, PAS la conformité visuelle finale.

## Fichiers ajoutés/modifiés par cette intervention

- `src/test/eb2-isolated/candidate.sql` : SQL candidat hors migrations actives.
- `src/test/eb2-isolated/RevisionFaussesCandidate.tsx` : copie de révision, aucun import par l'application.
- `src/test/eb2-isolated/component.patch` : diff précis de la fonction copiée contre l'actif.
- `src/test/eb2-isolated/finalisation_sql_contract.py` : 18 contrats jetables.
- `src/test/eb2-isolated/candidate-flow.test.tsx` : 14 tests d'écran simulés.
- `src/test/eb2-isolated/browserHarness.tsx`, `browserTransport.ts` : sept matières synthétiques, transport local.
- `src/test/eb2-isolated/AGENTS.md` : frontière test/production.
- `.lovable/plan-eb2-jetable.md`, `roadmap.md`, ce rapport : périmètre/résultats.

Les métadonnées mémoire enregistrent l'interdiction de mise en service. Le cache Python généré par le test a été restauré byte-for-byte, hors diff final. Le fichier racine AGENTS n'a pas été modifié (budget de taille).

## Diff antérieur / site public

Le diff de la référence `c2a08ce7f` à `d23a89f49` contient uniquement la modification non liée `src/integrations/supabase/previewAuthStorage.ts` (deux ajouts, un retrait). Elle n'est pas modifiée ici. Ce contrôle n'établit pas que tous les changements plus anciens ont été autorisés.

Le HTML public `https://insight-learn-manage.lovable.app` renvoie 200 avant/après et référence toujours `assets/index-BbNPGt9M.js`. Le domaine personnalisé renvoie 403 depuis cette session ; le téléchargement du paquet n'a pas fourni de corps exploitable, donc pas de preuve SHA de son contenu. Aucun outil de publication appelé. Empreinte de l'écran actif avant/après : `e0d6500848169d78322a1d5b9a1ec2caaf9f03e63832e2d8234fb2febff0c17d`.

## Reste à valider avant toute mise en service

1. Compatibilité avec le catalogue complet et tous les déclencheurs serveur réels, sur une copie isolée autorisée (aucune création de copie/dump réel ici). Le contrat emploie des tables réduites et un déclencheur de tentative reconstitué, pas tous les triggers hébergés.
2. Source figée et identité exacte pour chaque ancienne copie ; absence de snapshot/ambiguïté = revue manuelle, jamais corrigé inventé.
3. Unicité face à tous les anciens chemins UPDATE/import/service : le candidat teste RPC et garde INSERT, pas tous les chemins privilégiés possibles. Les résultats historiques ne sont pas modifiés.
4. Intégration de bout en bout navigateur → vrai handler/PostgREST → PostgreSQL jetable. Ici navigateur et SQL sont testés séparément, pas reliés.
5. iPad Safari/tablette Android/iPhone physiques, sessions/token réels, perte réseau réelle ; non prouvés. Aucun test Barry/Ahmed réel.
6. Parcours officiel EB2 complet des quatorze matières avec leurs banques réelles, notation humaine QRC/remontée en temps réel : non exercé ; sept matières synthétiques de révision par filière seulement.
7. Revue du diff de publication et NOUVEL accord explicite pour migration réelle puis activation/publication. NO-GO jusque-là.