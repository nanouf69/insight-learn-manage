# Afficher toutes les sessions d’examen dans le sélecteur

## Diagnostic
Le menu « Toutes les dates » ne contient que les dates des élèves déjà chargés pour la session sélectionnée (ici le 29 septembre). Il ne permet donc pas de choisir les autres sessions.

## Correctif proposé
- Remplacer ce filtre trompeur par un sélecteur « Session d’examen », proposant toutes les sessions disponibles dans le sélecteur principal, y compris les anciennes.
- Synchroniser les deux sélecteurs : choisir une session charge ses inscriptions et résultats, sans modifier aucune date enregistrée.
- Conserver les filtres nom, statut, identifiants et formation.
- Aucun mail, aucune écriture de dossier, aucune modification des périodes pratiques enregistrées.

## Fichiers prévus
- `src/components/examens/ExamenReussitePage.tsx` : liste et sélection de session communes, retrait du filtre limité à la session courante.
- `src/test/examen-session-selector.test.ts` : contrôle des sessions proposées et de la sélection.
- `roadmap.md` : suivi et résultats des vérifications.

## Vérification
Tester les deux sélecteurs avec des données fictives et contrôler que les sessions anciennes et futures sont accessibles ; aucun test d’écriture sur un vrai élève.

## Détails techniques
Réutiliser `datesExamenTheorique`, `selectedExamDate` et `handleExamDateChange` plutôt que créer un deuxième périmètre de données. Retirer `filterDateExamen` et son filtrage local.