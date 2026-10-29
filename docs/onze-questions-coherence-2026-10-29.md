# Onze questions validées — contrôle préalable du 29/10/2026

## Résultat : STOP avant écriture pédagogique

Aucune modification de question, module, réponse, note, snapshot, signature, fonction serveur ou publication. Seuls ce rapport, un test diagnostic fictif, la feuille de route et la mémoire des exigences ont été ajoutés.

## Risque prouvé

- `ModuleDetailView.tsx:6673–6675` applique `questionsSnapshotCorrigees` aux snapshots des bilans5/11.
- `bilanSnapshotsEleve.ts:139–152` remplace texte, choix et clé du snapshot affiché par les valeurs actuelles, via UID ou ID. La copie en base reste inchangée, mais ce n'est pas une protection du barème affiché.
- `bilanTaxiNationaleSelection.ts:101–103` n'exempte que9/203, pas11/600–602.
- Les relectures canoniques s'appliquent à Admin ET élève et remplacent l'ensemble des questions des sections liées (`ModuleDetailView.tsx:684–730,4778–4835`).
- 15 snapshots TAXI600 existent :9 portent Q104 tronquée avec Racolage=C ;6 portent déjà la version complète Racolage=B. Mettre la clé actuelle enB pourrait changer le sens d'une réponse C déjà enregistrée sans toucher le snapshot SQL.
- Copies ordinaires non terminées : TAXI600=10,601=8,602=4 ; VTC500=37,501=28,502=18. Ces comptes ne prouvent pas une connexion actuellement active ; ils prouvent des copies enregistrées non terminées.
- `bilan_demarrer_passage` retourne un snapshot existant avant toute création, mais utilise le JSON pour600/601/602 ; seule605/606 est construite depuis la liste canonique. Une correction de la seule liste admin ne suffit donc pas à aligner tous les futurs passages.

## État des onze questions

| Question | État / décision |
|---|---|
| T3P104 | Réparation admin validée mais bloquée : relettrageC→B visible sur anciens passages. |
| Gestion48 | Un double espace en VTC, texte déjà normal TAXI ; normalisation suspendue pour ne pas remplacer un texte de passage commencé. |
| Gestion53 | C Arrêt maladie déjà cochée partout ; aucune clé modifiée, aucune explication inventée. Explication générale VTC préexistante conservée. |
| Gestion206 | Présente JSON VTC/TAXI, absente canonique TAXI ; ajout seul ne suffit pas à aligner snapshot futur et banque. Suspendu avec chantier protégé. |
| Sécurité73 | BAU canonique contre Bande d'arrêt d'urgence JSON ; remplacement rétroactif du libellé possible, suspendu. |
| T3P59 | Déjà correcte TAXI ; aucune duplication VTC. |
| T3P112–114, Gestion198–199 | Validées VTC mais aucun ajout TAXI : validation pédagogique ne vaut pas preuve d'identité de banque. |

Les bindings600/601/602 ne sont pas partagés avec le module28 TA. Celui-ci ne partage que605/606 via700/701. Le blocage démontré ici concerne d'abord TAXI/VTC ; aucune généralisation TA ni autre section effectuée.

## Tests et limites

- Diagnostic isolé `bilan-q104-retroactive-risk.test.ts` : compare une copie fictive ancienneC et actuelleB via la fonction réelle, sans écriture Cloud.
- Régressions diagnostiques existantes : `snapshot-corrections-editeur.test.ts` et `snapshot-photo-module-fictif.test.ts`.
- Résultats exécutés consignés dans la feuille de route ; PASS signifie reproduction du risque, pas correction livrée.
- Exécution18:01:25UTC :3/3 tests PASS ; compilation automatique18:01:19UTC :build OK.
- Compte technique hébergé, clic Admin/futur apprenant et soumission réelle NON EXÉCUTÉS : arrêt avant mutation, aucune correction sûre à publier.

## Suite à autoriser

Préparer une protection future-only ciblée pour les trois matières, conservant intégralement les contenus et clés historiques, y compris les copies héritées sans snapshot et les navigateurs déjà ouverts. Tester d'abord sur copie isolée et compte technique ; appliquer les modifications pédagogiques seulement après preuve de protection, jamais avant. Aucune modification de ce circuit n'a été engagée dans ce tour.