# Trois priorités du 08/11/2026 — état factuel

## 1. Persistance Meriem BENNANI / Raphaël CLERC

### Preuves de production
- Les traces navigateur de Meriem sont des délais de 15 s puis 60 s, sans preuve d'expiration de session. Les opérations exactes n'étaient pas présentes dans ces anciennes lignes de timeout.
- Meriem : 352 événements journalisés pour EB2 T3P, 137 Gestion, 147 Français, 27 Sécurité, 20 Anglais. Les cinq lignes `reponses_apprenants` EB2 sont désormais `submitted`. Cela ne prouve pas que la file locale de son appareil est vide.
- Raphaël : 114 événements pour `module_4_exo_102`, délai maximal saisie→journal de 32,268 s ; six exercices/révisions ont ensuite avancé côté serveur. Aucune récupération complète de sa file locale n'est déduite de ces lignes.

### Cause et correctif
- Les successeurs compactés renvoyaient les événements déjà confirmés, multipliant les écritures inutiles.
- Le handler limitait la journalisation à 500 événements mais confirmait le lot entier : risque de journal incomplet malgré un ACK global.
- Client : retrait des seuls événements couverts par l'ACK, refus d'un ACK incomplet, ajout de l'opération et de l'exercice dans les futurs logs de timeout.
- Serveur : suppression de la troncature silencieuse, conservation de l'idempotence par `event_id`.
- Fonction déployée `upsert-reponse-apprenant`, SHA source `b3700a9dcb7df4fc8b2cc512128957a609bed7b0934cb3b3d996cbb75fa32908`.

### Limites et voie sûre
- La file des appareils n'est pas accessible : aucune récupération complète n'est affirmée et aucune file n'a été purgée.
- Ne pas effacer les données du navigateur ni recommencer l'examen. Sur l'appareil d'origine, rouvrir le même compte et laisser la page connectée pour permettre la reprise ; en cas d'avertissement « mémoire seule », ne pas recharger.
- Le comportement est prouvé sur environnement isolé, pas encore sur leurs appareils réels.

## 2. Dix QRC restantes

### Motifs actuels, pas anciennes exclusions G(T)
- BELARBI EB6-TA et FERREIRA EB6-TAXI : calcul de prise en charge dont le corrigé figé indique « + supplément bagages » sans tarif ni total ; revue obligatoire.
- FERREIRA EB2-TAXI, SOW EB3/EB4/EB6 et RAZANADRAMANANA EB3 : cinq résultats IA `reponse_ou_corrige_ambigu`, sans publication.
- BENJELLOUN EB1 T3P : trois réponses `NULL` dans les copies figées ; absence de réponse enregistrée, pas preuve de réponse perdue. Aucun zéro automatique appliqué.

Décisions humaines nécessaires : tarif bagages manquant ; définition VTC tronquée dans deux snapshots ; incohérence énoncé/corrigé de la vignette EB4 ; règle de points pour deux consulats exacts et deux réponses hors corrigé ; validation des valeurs techniques EB6. Aucun énoncé ou corrigé n'a été réécrit.

### Correctif de file
- Migrations 0249 et 0250 : une suite terminée avec QRC pendantes devient `a_verifier`, sans reprise payante ; les passages historiques ne sont pas rendus éligibles.
- La file d'Aba-Bakre est passée par le mécanisme officiel de `terminee` à `a_verifier` / `qrc_en_attente_non_admissible`.
- Contrôle final : 0 suite `terminee` avec QRC en attente.
- Empreinte des 10 QRC avant/après : `043a91bc79734fe724fe7e6c29000cfe`, inchangée ; 10 toujours en attente.
- Empreinte des 8 résultats existants avant/après : `3897a2d11e02126cfaff43d748bff8f5`, inchangée. Aucune nouvelle note n'était admissible, donc aucune nouvelle note publiée.
- Fonction `qrc-ia-correction` déployée, SHA source `9fca4dba4bd310ab09f897e45c3676735a4dd413658cab1381294f70f74afe78`.
- Aucun appel IA nouveau : 405 réservations EB et 2,144403 € mesurés en novembre avant/après ; 64 réservations module 13 et 0,296658 €. Coût de cette intervention : 0 € de notation IA.

## 3. Sauvegarde cohérente et restauration

- 08/11 : 1 670 fichiers, 1 475 120 300 octets, `_export_termine.json` créé à 03:00:26 UTC (04:00 Paris). Parcours terminé, pas preuve d'instantané cohérent ni de restauration.
- 06/11 : 1 547 fichiers conservés. 07/11 : 1 463 fichiers avec réparation indépendante conservés. Aucune rotation ni suppression.
- La base est disponible, sans alerte d'épuisement récente ; cela ne transforme pas les exports horodatés en snapshot transactionnel.
- Aucun outil disponible ici ne fournit un export transactionnel cohérent ou une destination privée jetable distincte. Aucune restauration réelle n'a donc été exécutée.
- Prérequis exact : lancer l'export géré depuis **More → Database → Manage → Settings → Export data**, puis restaurer ce fichier dans un projet privé isolé distinct, avec fournisseurs et clés reconfigurés. Les tests fictifs précédents ne sont pas une preuve de restauration de production.

## Vérifications et publication

- Suite complète : 422 fichiers réussis, 2 ignorés ; 3 697 tests réussis, 13 ignorés, 0 échec.
- Handler réponses réel + PostgreSQL/PostgREST jetables : 1 scénario complet, dont 501 événements, concurrence, commit sans réponse, gel et rejeu.
- QRC : 17 contrats SQL + 5 scénarios handler réel, tous réussis ; compilation TypeScript et builds OK.
- Alerte du publieur sur `bilan_future_opening` non confirmée par la règle active : `future_opening_read` exige `has_role(auth.uid(), 'admin')`.
- Publication demandée sur `https://gestion.ftransport.fr`. Au dernier contrôle cité dans le fil, l'ancien paquet `assets/index-Dl3wEx4I.js` était encore servi : bascule non confirmée à ce stade.
- Aucun email/SMS, aucune nouvelle infrastructure payante, aucune modification de questions, choix, corrigés, réponses, signatures ou relevés figés.
