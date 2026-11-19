# T3P — présentation locale préparée, non activée (19/11/2026)

## Résultat exact

Une projection et un rendu sans effet de bord ont été implémentés. **Ils ne sont pas importés ni montés dans ModuleDetailView : l’écran réel reste inchangé.** Cette suspension applique la consigne de ne pas activer sans garantie du fonctionnement complet ; ce n’est pas un déplacement des copies existantes.

La projection réserve aux modules 2/VTC et 10/TAXI, contexte Cours et exercices, les quatre répartitions : P2 Q73/Q74/Q76 → affichage P1 et P1 Q59 → affichage P2. Q72/Q75 et les autres questions restent dans leur partie originale. Aucune déduplication. Elle garde les objets et tableaux d’exercices originaux par référence, les indices d’origine, les clés `1-59`, `2-59`, `2-73`, etc. Les deux Q59 portent les libellés distincts « T3P P1 · Q59 » et « T3P P2 · Q59 », ainsi qu’une identité complète module/exercice/question. Source incomplète ou collision interne : projection refusée, jamais réparée par suppression.

## Dépendance qui empêche l’activation sûre aujourd’hui

Le rendu actuel `ModuleDetailView.tsx:9028–9915` capture un unique `exo` pour les états verrouillés, snapshots, réponses, correction, révision, scroll, compteurs et remise. En particulier :

- 9455–9477 : contrôle de toutes les questions de l’exercice d’origine avant validation, avec navigation vers la première manquante ; une question répartie dans l’autre partie serait absente de cette page.
- 9563–9666 : lot de réponses filtré par exercice d’origine, puis confirmation de sauvegarde/relecture et remise de cet exercice.
- 9485 et suivantes : succès et page terminée associés à la page courante, non à une présentation répartie.

L’activation nécessite donc une intégration du rendu de chaque question sous son contexte original, et des commandes de remise conservant chacun des deux exercices originaux, y compris la navigation vers leurs questions manquantes réparties et la reprise/révision historique. **Ces chemins ne sont pas raccordés dans ce lot : aucun succès de remise intégré n’est revendiqué.** Les remplacer par un nouveau lot « P1/P2 affiché » serait interdit. L’approbation de la présentation ne justifie pas une validation ou un changement de score à la place de l’élève.

## Tests effectivement exécutés

| Contrôle | Résultat |
|---|---|
| Projection fictive TAXI/VTC : quatre transferts, Q59 distinctes, Q72/Q75 intactes, références/identités complètes, aucun oubli/doublon, sources partielles/collisions refusées | PASS — 16 Vitest |
| Ordre cours/exercices et protections existantes de remise/révision | PASS — 19 Vitest (11 + 6 + 2) |
| Rendu isolé, identité des choix préexistants et d’un nouveau clic, PC 1280×1800 et mobile 390×844, TAXI et VTC | PASS — 4 parcours Playwright, 8 captures dans `/tmp/browser/t3p-local/` |
| Sauvegarde/reprise dans le test de projection | PASS sur objets fictifs sérialisés ; pas une sauvegarde Cloud |
| Remise des lots d’origine dans le test de projection | PASS pour construction des lots fictifs ; pas un appel serveur intégré |
| Reprise, sauvegarde et remise dans ModuleDetailView avec présentation répartie | NON PROUVÉ — non raccordé, fonction non activée |

Le harnais autonome utilise le rendu de question partagé, sans client Cloud ni authentification. Toutes les requêtes externes sont bloquées (une demande de police externe a été bloquée). Aucun élève réel usurpé. Aucun compte créé. Captures fictives, aucun nom ni réponse réelle.

## Contrôle réel avant/après, lecture seule

Six empreintes `module_editor_state.module_data` lues avant modification de code, identiques à l’audit précédent :

| Module | Empreinte |
|---|---|
| 2 | `0e2a131d7cccd0dab4a601058b873627` |
| 10 | `537c2a7ec9498ac310088cfee0b6bc81` |
| 13 | `f33470402654a649b24019a6e55886d8` |
| 25 | `c1c6e194c517d0d889f2fd33474dd725` |
| 32 | `671798ac966dbede2c996d2575644869` |
| 39 | `9bb09e8c8bedb0c34943d504d12c2451` |

Ces empreintes sont relues après préparation. Aucune écriture Cloud exécutée ; listes de questions, comptes, historiques et supports ne sont pas changés par cette intervention. Les comptes 53/69 proviennent de l’audit précédent, pas d’un nouveau comptage individuel ici. La cible théorique de présentation reste 55/67 (53 − 1 + 3 ; 69 − 3 + 1), contrairement au 56/67 indiqué par erreur dans le rapport précédent ; aucune liste réelle n’a été modifiée.

## Fichiers du lot

- `src/lib/t3pLocalPresentation.ts` : projection pure avec identité originale.
- `src/components/cours-en-ligne/T3pLocalQuestionParts.tsx` : rendu sans persistance, non monté dans l’application.
- `src/test/t3p-local-presentation.test.ts` : 16 tests ciblés.
- `src/test/t3p-local-browser/harness.html` et `harness.tsx` : présentation fictive autonome.
- `src/lib/AGENTS.md` : frontière technique de non-activation.
- `roadmap.md` : activation bloquée par intégration de remise/reprise non prouvée.
- Ce rapport.

**Intacts :** ModuleDetailView, banques partagées, données élèves, clés de réponse, soumissions, scores, historiques, jalons, bilans, examens, quiz indépendants, autres matières/modules, PowerPoint, accès, signatures, réglages. Aucun envoi, migration, déploiement ou publication.