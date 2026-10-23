# 23/10/2026 — Traçabilité des appels IA QRC + reprise unique de 6 QRC (Aba-Bakre)

## Cause prouvée (journal passerelle)
- 22/10, 17:25–17:54 Paris : 6 appels gemini-3.8-flash annulés (499) par notre propre minuterie de 60 s, 0 jeton produit, aucune note publiée.
- `dernier_run_id`/`run_id` était NULL parce que l'identifiant n'était lu qu'à l'arrivée des en-têtes, et l'ancien code n'écrivait rien pour l'appel initial.
- Pourquoi le fournisseur n'a rien envoyé pendant 60 s : NON PROUVÉ (le journal ne contient pas le détail côté fournisseur).

## Corrections (backend)
- Migration 0199 (0198 = marqueur vide appliqué par erreur, sans effet) : colonnes `trace` (+ `run_id` pour l'appel initial), table de constat figée et non modifiable pour les 6 QRC, RPC service uniquement `qrc_ia_reserver_reprise_exceptionnelle`, qui revérifie tout et ne réserve qu'une seule fois.
- Fonction `qrc-ia-correction` : trace des étapes (requête, en-têtes, premier jeton, fin, abandon). Le code de la passerelle est enregistré séparément du code d'abandon local. Budget de 140 s, sous la limite de 150 s. Aucune reprise automatique par le SDK. Une issue inconnue part en revue.

## Tests
- Base jetable construite depuis le catalogue réel (`src/test/fixtures/qrc_ia_catalogue_live.sql`) : 10/10. Seul l'enregistrement de la note est simulé (stub).
- Vitest : 5 fichiers, 53 tests. Deno : 4/4 dans une copie isolée (`nodeModulesDir: auto`), avec fournisseur lent, coupure, 503 et flux partiel ; `deno check` OK.

## Reprise des 6 (09:15 UTC)
- Les 6 sont passées en « corrigée » en 3 à 5 s chacune. Chaque appel a son identifiant d'exécution (01a1680a-e69e…, 01a1680b-28e0…, -3b4b…, -47e4…, -568f…, -6441…).
- Les traces 504 d'origine sont conservées. Les réponses sont inchangées (même empreinte). Les 55 QRC déjà corrigées sont inchangées (empreinte f9f2eecf…).
- Une nouvelle demande ne relance aucun appel IA.
- Empreintes de contrôle : 62 / 57 / 22 identiques (6dcdf347…, 614b47fc…, 4fcc0d04…).
