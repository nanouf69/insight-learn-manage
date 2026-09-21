# Challenge en direct (type Formative) — architecture proposée

Module **totalement séparé** : nouvelles tables `live_*`, nouveaux écrans, nouvelles routes. Aucune lecture ni écriture sur les tentatives, QRC, notes ou progressions des Examens Blancs et du e-learning. Le moteur QRC en pilote sur VTC N°2 n'est pas touché.

## 1. Modèle de données (nouvelles tables uniquement)

- **live_sessions** — 1 challenge = 1 identifiant unique
  id, code (6 caractères, unique), titre, source (quiz d'origine, pour mémoire), **questions_snapshot** (copie figée des questions au lancement), created_by, statut (`brouillon` / `en_cours` / `question_ouverte` / `terminee`), index de la question en cours, masquer_noms (mode projection), dates.
- **live_participants** — 1 participation = 1 identifiant unique
  id, live_session_id, nom affiché, apprenant_id facultatif, jeton d'appareil, score, dernière activité. Unicité sur (session, jeton d'appareil) : reconnexion = même participant, jamais un doublon.
- **live_responses** — 1 réponse = 1 identifiant unique
  id, live_session_id, participant_id, question_id (issu du snapshot), type (QCM / QRC), réponse, est_correcte, points, corrigee_manuellement, points_attribues, commentaire, dates.
  **Contrainte d'unicité en base sur (live_session_id, participant_id, question_id)** : double-clic, F5, reconnexion ou renvoi ne peuvent jamais créer deux lignes. L'enregistrement passe par une fonction serveur idempotente (même principe que `upsert_qrc_instances`).

Sécurité : RLS + GRANT sur chaque table ; le formateur (admin) voit sa session entière, un participant ne voit que ses propres réponses. Une réponse déjà corrigée manuellement n'est jamais écrasée par un renvoi.

## 2. Temps réel (pas de rechargement périodique)

- Realtime activé sur `live_participants` et `live_responses`.
- Écran formateur : un abonnement aux changements de la session en cours → chaque réponse enregistrée met l'écran à jour immédiatement, sans F5.
- Écran élève : abonnement à la session pour suivre la question affichée par le formateur.
- **Rattrapage** : à l'abonnement et à chaque reconnexion (retour d'onglet, coupure réseau, canal rétabli), relecture complète de l'état de la session depuis le serveur. Aucune réponse ne peut manquer. Un contrôle de secours très espacé sert uniquement de filet quand le canal reste coupé.

## 3. Écran formateur

- Bouton **▶ Lancer un challenge en direct** depuis un quiz / un ensemble de questions : génère le code de session + QR code, et **fige le snapshot des questions**. Modifier le quiz ensuite ne change pas un challenge déjà lancé ; le challenge suivant reprendra la dernière version.
- Tableau de bord live : connectés | ont répondu | sans réponse | bonnes / mauvaises | score | progression, avec l'en-tête « Question 4/20 — 18/22 ont répondu ».
- Contrôles : question suivante / précédente, révéler les résultats, terminer le challenge.
- **Mode projection** : grand affichage, noms masquables.
- **QRC** : les réponses ouvertes arrivent en direct dans un volet de correction ; le formateur attribue les points, le score du participant est recalculé immédiatement. La correction cible l'identifiant unique de la réponse — jamais une reconnaissance par texte ou par date.

## 4. Écran apprenant

- Page publique de participation : saisie du code (ou scan du QR) + prénom/nom.
- Une question à la fois, pilotée par le formateur ; envoi immédiat de la réponse au serveur.
- Reconnexion : l'élève retrouve sa place et ses réponses déjà envoyées, sans doublon ni perte.

## 5. Routes et fichiers

- `/challenge` (participant, public) et `/challenge/:code`.
- Onglet « Challenge en direct » côté admin, avec la page de pilotage et le mode projection.
- Nouveau dossier `src/components/challenge-live/` + `src/lib/liveChallenge.ts`. Aucun fichier des Examens Blancs modifié.

## 6. Tests avant tout branchement réel

Sur une session de test : 20 réponses = exactement 20 lignes ; double-clic, F5 répétés, coupure réseau, déconnexion/reconnexion et renvoi = toujours 20, 0 doublon, 0 perte ; correction QRC immédiate et non réversible par un renvoi ; modification du quiz d'origine en plein challenge = aucun changement en cours de route. Aucun vrai apprenant n'est branché tant que ces tests ne sont pas validés.
