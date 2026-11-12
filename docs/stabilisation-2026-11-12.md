# Stabilisation 12/11/2026 — Phase 0 (lecture seule) + Phase 1 (code aperçu)
Mesures lues le 12/11 ~20:15 UTC. Panne 19:27–19:38 UTC (20:27–20:38 Paris).
- Mémoire base 88 %, connexions 44/90, disque 35 %, base 2,02 Go, 0 redémarrage depuis boot.
- answer_events EB5 19:20–19:45 UTC : 3 900 écritures, 33 passages. 19:38–19:42 : 1 638 écritures pour 148 questions (≈11/question), 1 écriture par lettre (ex. 30 révisions en 10 s).
- error_logs : 12 délais d'envoi (15 s/60 s) « réponse conservée en file ».
- Requêtes lentes : reservations_pratique moyenne 1,18 s (table 80 kB, index unique) ; module_editor_state module_data 1,12 s moy / 7,3 s max ; apprenant_module_activites 2,7 s moy / 6,2 s max (87 k lignes, index existant).
- Sauvegardes/PITR : non vérifiables par l'agent (aucun outil de lecture de l'inventaire). Aucune modification de base effectuée.
Correctif code (aperçu) : src/features/noyau-passage/pontV2.ts ; tests src/test/pont-v2-stabilisation-panne.test.ts.

## Reprise 21:02–21:07 UTC — vérification directe, sans écriture réelle

### Résultats sauvegardes
- Aucun outil exposé ne lit l'inventaire des snapshots Cloud, ne déclenche l'export complet, ni ne restaure un snapshot dans une cible isolée. La date et l'existence des snapshots gérés restent NON PROUVÉES. La documentation annonce un snapshot quotidien conservé environ 14 jours, sans PITR ; ce n'est pas un inventaire constaté.
- Lecture SQL de storage.objects puis diagnostic existant, avec session admin injectée (HTTP 200). Le premier appel via outil a reçu 401 ; aucun contournement des permissions, aucune réparation lancée.
- Export applicatif 11/11 : fin du manifeste 02:38:25.778 UTC ; 26 tables annoncées, journal absent et trois échecs de lecture. Export 12/11 : fin 02:42:06.462 UTC ; journal absent et divergences sur trois tables. Les deux manifestes disent intégrité non vérifiée, restauration non prouvée, instantané cohérent false.
- Deux réparations anciennes restent à 10 000 lignes du journal chacune, sans manifeste terminal. Relecture de chaque lot : 10 000 clés uniques, ordre croissant. Empreintes identiques aux preuves du matin : 11/11 `7db35a8656caff275668f3234a6ee488a6b1ffb0b4fd7ddc042a3b59beab9d87` ; 12/11 `f942fd8748523b53f8f7a307171e800f6615f42a105f4fa8e76e859abd86c864`.
- Couverture applicative : registre source de 26 tables contre 209 tables public observées ; ni schéma complet, ni auth/password hashes, ni fichiers des buckets ne sont exportés par ce code. Certaines signatures embarquées dans emargements_fc font partie des lignes, pas les objets externes. Impossible d'appeler cet export une sauvegarde complète.
- Stockage : 16 buckets configurés, tous privés ; 34 313 objets d'export et 4 471 autres objets. Deux fichiers privés lus intégralement en mémoire, sans copie ni mutation : image cours 24 360 octets HTTP 200 SHA-256 `28a4c9bdd3de77ce760863a24b06f687457f94bba4fbb854e8e1b797560d618d` ; PDF inscription 11 652 octets HTTP 200 SHA-256 `21cbc9904f8c018a813b41a250fafcd9d99c4dce7ea4a9e243d94321b70c5ce5`. Cela prouve seulement ces deux lectures, pas la restauration ni tous les fichiers.
- Aucun export complet disponible n'a été fourni ; aucune restauration complète isolée exécutée. Le script local existant ne transforme pas ces exports incomplets en preuve de recoverabilité.

### Santé et lectures
- 21:02 UTC : Cloud répond, mémoire 75 %, connexions 30/90, disque 35 %, base 2,03 Go. 21:06 UTC : mémoire 71 %, connexions 29/90. Aucune alerte d'épuisement récente retournée. Transactions annulées depuis boot : 443 puis 451 ; évolution observée, origine non attribuée.
- Statistiques cumulées : contenu module 643 ms moyen / 7 335 ms maximum (238 appels) ; historique activité 2 699 / 6 232 ms (55 appels). Pas de comparaison avant/après comparable, aucune amélioration de latence réelle revendiquée.
- Aperçu seulement : suppression d'une seconde lecture inutile du profil dans useApprenantTauxRealisation ; même première lecture serveur vérifiée utilisée pour le parcours. Deux lectures du profil → une, aucun calcul de taux/heures changé. Test de comptage réel des appels simulés ajouté.
- Optimisation lourde cours/historique non terminée : le lecteur d'historique double certaines lectures, ignore des erreurs et n'annule pas tous les retours périmés ; ne pas réécrire les calculs dans cette passe. Rafraîchissement périodique de contenu constaté, contraire à la préférence zéro polling : arbitrage explicite demandé avant changement du mécanisme.

### Tests exécutés ici
- 36/36 Vitest : panne 10/20/30 candidats, six minutes simulées par horloge accélérée, 90 réponses finales conservées après rechargement simulé, 90 écritures effectives au retour ; cohérence taux/heures, revisions et ouverture après reset. Aucun serveur réel interrompu, pas d'E2E navigateur 30 candidats.
- 38/38 Vitest : exports/reprises par clé, conservation des lots divergents, fin de matière après panne, notes QCM/QRC, snapshots figés. Total 74/74 tests dans 9 fichiers.
- Nouveau test six minutes initialement FAIL car le faux rechargement intervenait avant que l'appel en vol soit terminé ; synchronisation de simulation corrigée, suite rejouée PASS. Ne constitue pas un test de destruction du processus navigateur pendant un envoi.
- Dernier signal aperçu observé : build OK 21:05:34 UTC.
- Zéro écriture de données applicatives, migration, déploiement, publication, restauration réelle, redémarrage, mail ou upgrade exécuté dans cette passe.

### Blocages et suite courte
1. Inventaire snapshots : seule la page produit Backups donne les dates ; aucun accès agent exposé. Une capture de la liste suffirait à établir l'inventaire, pas la restauration.
2. Pour preuve complète isolée : rendre disponible l'export Cloud complet et une cible indépendante, puis reconfigurer les providers et tester restauration/sign-in/empreintes. L'export exclut les fichiers ; ils nécessitent leur propre copie et contrôle. Aucun remix n'est un clone des données.
3. Ne pas restaurer production pour tester : perte des écritures post-snapshot, schéma également rétabli, indisponibilité ; export préalable nécessaire. Aucune telle action autorisée ici.
4. En attendant ces accès : tests isolés et optimisation frontend seulement ; aucune publication avant qualification complète et accord distinct.
