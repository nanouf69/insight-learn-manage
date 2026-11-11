# EB4–6 : contrôle et candidat — NON ACTIF

## Verdict

Aucune migration, projection réelle, correction, autorisation IA, remise à zéro ou publication effectuée.
Le candidat n'est **pas déployable** dans son état actuel. Les tests limités ne valent pas validation du parcours complet demandé.

## Lectures réelles du 11 novembre 2026

Les douze versions V2 EB4/5/6 VTC/TAXI/TA/VA sont `publiee`.
Le filtre reproduisant l'inventaire indicatif exclut resets et comptes tests, imports explicites et toute matière possédant un résultat V2 définitif. Ce dernier filtre n'est PAS une preuve d'identité et ne permet pas de déclarer les lignes exclues résolues.

| Examen | Lignes indicatives non liées | Réponses sans remise | Remise avec instant divergent | Nouveau rattachement exécuté |
|---|---:|---:|---:|---:|
| EB4 | 40 | 40 | 0 | 0 |
| EB5 | 31 | 31 | 0 | 0 |
| EB6 | 28 | 27 | 1 | 0 |

Ces 99 lignes ne sont ni 99 copies importables ni 99 corrections humaines manquantes prouvées.
Les clés exactes élève/examen/matière/suffixe retrouvent leurs lignes de réponses ; 98 ont `completed=false`, `status=in_progress`, sans `submitted_at`.
Une EB6 a une remise dont l'instant diffère du résultat. Aucune liaison immutable explicite de remise n'a été retrouvée sur les candidates aux clés canoniques.
Une seule remise archivée EB4–6 existe dans `reponses_apprenants_historique` : EB5-TAXI Français tentative 1, zéro réponse, aucun résultat correspondant. Elle ne prouve aucune des 99.

### Compteurs V2 réels distincts

| Examen | Copies terminées V2 contenant des QRC | Dont au moins une QRC en attente | Avec source historique (tous états du filtre) |
|---|---:|---:|---:|
| EB4 | 310 | 43 | 194 |
| EB5 | 219 | 32 | 92 |
| EB6 | 180 | 29 | 79 |

Filtre : hors tests, neutralisations et archives de reset. Ces compteurs sont des présences en base, **pas une preuve de visibilité en production**, ni une correspondance avec les 99 lignes.
Toutes les anciennes lignes pending hors archives/tests totalisent 410 (154/132/124). Les liens explicites source_result_id en couvrent 19 (7/5/7). Les autres lignes peuvent être des miroirs natifs ou d'autres tentatives ; elles n'ont pas été importées ni déclarées résolues.

## Cause durable identifiée

1. `core_import_passage_finalise` exige seulement l'existence d'une remise à la clé de tentative, sans comparer ses réponses ni son instant. Il ne verrouille pas la source avant la recherche d'import et peut fabriquer un doublon concurrent. Ne pas l'utiliser en lot.
2. Les déclencheurs `trg_qrc_ia_enfiler_passage` et `trg_qrc_ia_enfiler_qrc` appellent la file IA ; l'éligibilité actuelle n'exclut pas inconditionnellement les imports manuels. Une remise récente e-learning peut devenir admissible. Aucun appel effectué.
3. Les droits élève autorisent l'insertion et la mise à jour de `apprenant_quiz_results.details`, contenant le snapshot, corrigé et barème. Une concordance entre ces données et les réponses ne constitue pas une preuve autoritaire du sujet original.
4. `PassageMatiere` restaure les réponses anciennes, mais conserve la matière courante sauf passage V2. Son parent crée un snapshot client lors de la remise ; une version serveur ancienne figée n'est pas restaurée pour ce parcours.
5. `routerPassage` ne conserve l'ancien circuit après réponses locales que s'il n'existe aucun passage V2 de cet examen. Un import d'une autre matière peut donc modifier cette décision ; correction requise, non réalisée ici.
6. La finalisation ancienne utilise la sauvegarde `completed` ; les lectures constatent néanmoins `in_progress`. Le vrai parcours doit être reproduit avant de modifier les contrôles.

## Préparation livrée et tests exécutés

- SQL candidat : `docs/sql-revue/2026-11-11-eb456-manual-bridge.sql`, hors historique de migration, explicitement NON APPROUVÉ POUR DÉPLOIEMENT.
- Contrat : `python3 src/test/eb456_manual_bridge_sql_contract.py` : **9/9 PASS**, sur cluster jetable seulement, avec catalogue/déclencheurs du harnais existant.
- Douze variantes EB4–6, champs des questions conservés (images/taille incluses), aucune note créée avant correction fictive.
- Refus réponses divergentes, suffixe/compteur divergents, instant différent sans liaison, anonyme/autre compte ; rejouements concurrents idempotents.
- Correction fictive EB4 VTC, EB5 TAXI et EB6 TA par voie manuelle existante : nouveau résultat définitif 20/20, anciennes lignes et autres résultats inchangés.
- Le test ajoute **localement seulement** une exclusion IA par copie ; cette dépendance n'est pas installée et n'est pas contenue dans le candidat déployable.
- Catalogue de test issu du harnais réinitialisation, sans modifier aucun fichier ni donnée de ce chantier.

### NON PROUVÉ

- Source figée côté serveur pour les copies historiques et contournement de barème par client hostile.
- Vrai parcours navigateur reprise ancienne avant bascule → remise → correcteur → lecture note élève.
- Chronomètre inchangé dans ce parcours complet, toutes variantes.
- Reprise après perte d'ACK sans nouvelle écriture ; insertion ordre inverse/concurrence avec finalisation source.
- Affichage de chaque motif de revue dans le correcteur de production.
- Diff isolé publiable, scan de sécurité d'une migration finale et mise en service.

## Suite indispensable

Avant toute activation : ajouter la preuve serveur de copie/version à la reprise ancienne sans changer les questions ni le chrono ; finaliser la remise exacte de manière atomique ; rejouer sur identité immutable ; isoler définitivement ces projections de l'IA ; afficher les cas non prouvés ; exécuter les E2E complets. Une approbation propriétaire n'est pas manquante : **la preuve technique et l'intégration sécurisée restent à fournir**.

Les neuf contrats montrent que le transport candidat est réalisable ; ils ne justifient pas de promouvoir le snapshot client en source serveur, ni de transformer les 98 brouillons en remises.