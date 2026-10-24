# Revue 8beeefc1 — classement des délais

- Périmètre : uniquement classifyAnswerSaveFailure dans src/lib/answerPersistence.ts, nouveau test answer-delay-classification-24oct et cas de conservation dans eb2-queue-recovery-24oct ; suivi dans roadmap.md.
- Cause reproduite : délai/delai isolé classait les erreurs techniques françaises comme refus 48h avant le classement temporaire ; 16 assertions en échec avant correction.
- Correctif : 48h seulement P0471 ou 48h avec contexte nouveau passage/nouvelle tentative et interdiction/attente explicite. Familles SQL 08/40/53/57/58/XX, 55P03, PGRST00x et HTTP408/429/5xx temporaires après préservation des gardes métier/auth existantes, y compris HTTP400 hérité.
- Aucun changement à la logique de déblocage : anciennes entrées blocked intégralement conservées, aucun appel simulé lors de reconnexion dans le test dédié.
- Tests exécutés sur dernière version : 8 fichiers, 54/54 PASS ; tests de fonction réelle, sessions, propriétés, clôture vide, files durables et diagnostics. Réseau simulé uniquement, aucune demande production.
- Compilation automatique du dernier état : build OK à 09:55:10 UTC. Typecheck et build manuels NON EXÉCUTÉS : interdiction explicite de l’environnement d’exécuter ces commandes ; aucun succès typecheck manuel revendiqué.
- Aucune publication, fonction déployée, SQL/donnée/contenu/IA/mail modifié ou appelé.