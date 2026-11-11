# Sécurité routière Bilan examen — 11/11/2026 09:18 UTC

## Actualisation ciblée 09:49:39 UTC — ACTIF pour les nouveaux reçus TAXI 11/602
- Après modification externe de la source à 09:40:53, les seules divergences canoniques étaient les choix des positions 71 et 78 (IDs VTC 71/78, IDs TAXI 262/269).
- Migration additive 0267 : journal `bilan_sr_taxi_release_revisions` immuable ; contraintes et publication 0266 intactes ; `bilan_future_open` sélectionne le dernier release TAXI seulement après avoir rendu tout reçu déjà existant.
- Nouvelle version : `cd3413ee-12d4-4beb-9117-5dddea70d63c`, publication `576b8f4e-4331-4867-a647-09069622435d`, activée 09:49:39.550785 UTC. Source MD5 `c5c4b4b3313ab958c92275923e0c5eea`, verrouillée et contrôlée dans la même transaction que les deux INSERT.
- SELECT après activation : 255 positions, 255 IDs du release précédent conservés, 65 images source/65 cible, zéro divergence canonique et zéro différence de référence/absence/taille normalisée. Seules les positions 71/78 diffèrent de la version précédente ; zéro différence hors choix.
- Avant/après : 88/88 reçus identiques par empreinte, 9/9 versions préexistantes identiques ; une version et une publication ajoutées. Empreinte globale module_editor_state `40e2e02bd1d78e7de5dcc55736421132` inchangée ; source VTC et historique TAXI 252 intacts, release 0266 `cbf12902a40faad2a78b167ad215bb69` intact. Aucun autre INSERT/UPDATE/DELETE métier demandé ou exécuté par ce chantier.
- Test PostgreSQL jetable rejoué PASS : première et deuxième publication, ancien brouillon/reçu inchangé, VTC et autre matière inchangés, ID/order/images, droits, refus source périmée et journal immuable. Aucun compte réel utilisé en écriture pour tester le passage.
- Scan sécurité complet : aucune finding sur le nouveau journal ; huit findings préexistantes hors périmètre non modifiées. Build automatique observé OK ; aucun frontend modifié/publié ni effet sur le chantier reset, aucun mail ou appel IA.
- Les limites historiques ci-dessous restent applicables : anciens passages et futur VTC non basculés. Ce chantier ne rend pas toutes les anciennes copies VTC/TAXI identiques.

## Verdict : ACTIF pour les nouveaux reçus du circuit futur TAXI 11/602 ; pas un alignement global des anciennes banques
Migration 0266 installée ; publication ajoutée le 11/11/2026 à 09:24:08.799388 UTC.
Version : `c0c912d9-9937-48ed-84fa-7dbe159b606c`.
Source immuable : module 5 exercice 502, MD5 `2f53ef6b9c6e26aa5dbc05e22b8b18d6`.
Ancienne cible conservée : 11/602, MD5 `be23527a4d3695ef9a84cc1a2eb52136`.

## Preuves SELECT
- 255 positions source et 255 positions version TAXI, ordre VTC strict, zéro divergence canonique.
- Canonique réel du catalogue : énoncé, type, choix ordonnés (texte/lettre/correct/explication), image, imageSize, explication, barème, réponse QRC, réponses possibles.
- 65 références images de chaque côté, 0 différence de référence/absence et 0 différence de taille/absence.
- 210 IDs TAXI conservés uniquement sur correspondance canonique unique dans les deux banques et UID/registre cohérent non litigieux.
- 45 identités propres à la nouvelle version : 256–300, au-dessus de tous les numéros historiques numériques réservés (max 255). Pas de rapprochement approximatif, union ou correction de la source.
- État complet ancien 11/602 et correspondances archivés dans `bilan_sr_taxi_releases`, immuable (UPDATE/DELETE refusés). Version également immuable.

## Périmètre et préservation
- 62 modules et 161 exercices : toutes empreintes strictement identiques avant/après, y compris 5/502 et 11/602 historique, T3P/Gestion et EB.
- Les 241 snapshots, 17 passages figés, 88 reçus et 8 versions préexistantes sont identiques par ID.
- Les 6 675 notes préexistantes sont identiques ; 2 nouvelles notes sont apparues pendant l'activité simultanée de la plateforme, sans écriture de note par ce chantier.
- 53 soumissions préexistantes identiques ; une nouvelle soumission simultanée, aucune par ce chantier.
- 428 lignes de réponse présentes avant/après, aucune disparue ; 19 changées durant l'activité simultanée. 116 progressions présentes, aucune disparue, 2 changées. Empreinte globale des drafts modifiée. Ne pas annoncer ces tables globalement immobiles : la plateforme est en usage.
- La seule mutation métier de ce chantier est INSERT version + INSERT publication ; aucun UPDATE/DELETE, email, appel IA, cron, reset ou rattachement QRC. Aucun trigger d'écriture sur module_editor_state n'a été déclenché.

## Limites exactes / blocage restant
- La banque historique TAXI conserve volontairement 252 questions et ses 190 écarts avec la source VTC.
- 9 anciennes réponses TAXI à 602, dont 5 sans snapshot prouvé : le lecteur ancien peut utiliser la banque actuelle en absence de snapshot. Remplacer cette banque n'est donc pas sûr et n'a pas été fait.
- L'ancien circuit futur partagé conserve sa version de 249 questions ; les 12 reçus VTC et le reçu TAXI déjà ouverts conservent leur version. Aucun reçu VTC futur ne change, conformément à la cible seule.
- Ainsi 255/255 est prouvé pour source 5/502 → nouvelle version TAXI 11/602. Il n'est PAS prouvé entre tous les écrans VTC et TAXI existants : les anciens passages doivent rester différents. Les futurs reçus VTC demeurent sur 249, hors cible autorisée.
- Activation limitée aux nouveaux reçus TAXI déjà éligibles au circuit futur ; pas de migration d'un compte ayant une trace ancienne.
- Aucun frontend fonctionnel modifié ni publication groupée. L'éditeur historique continuera donc à afficher 252 : pas de faux 255 dans le JSON historique.

## Tests exécutés
- PostgreSQL jetable réel : 255 positions, images/tailles, projection sans clés, autorisation, refus source périmée, identité historique réservée, ancien brouillon/reçu intact, isolation VTC/autres matières, publication immuable, rejeu PASS.
- 13 tests Vitest écran/transport/correction PASS. Le mock du catalogue des examens émet une erreur getSession attendue (barème indisponible fictif) ; pas une preuve du barème réel.
- Chromium : vrai BilanFutureExam, fixtures fictives, réseau externe bloqué ; ordinateur 1280×1800 et téléphone 390×844 : 255 questions présentes, image STOP chargée, sélection conservée après reload PASS.
- Navigateur et SQL jetable sont des contrôles séparés, pas un E2E HTTP→PostgreSQL complet. Pas de soumission d'élève réel.
- Limite visuelle existante : sur téléphone la colonne droite des questions dépasse la largeur et se coupe ; non modifiée hors périmètre banque.
- Build observé OK 09:25:34 UTC. Aucun build manuel ni publication.
