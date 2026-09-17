# Contrôle visuel des anomalies — Examens blancs

Ajout d'un « voyant de contrôle technique » dans Gestion → Examens blancs.
**Strictement informatif : aucune question, aucun type, aucun point, aucun coefficient
n'est ajouté, supprimé ou corrigé automatiquement. Aucune donnée apprenant n'est lue
en écriture (réponses, notes, QRC corrigées, tentatives, progressions, snapshots,
chronomètres, historiques restent intacts).**

## Ce qui sera vérifié (par matière)

Référentiel officiel figé, déjà défini :

| Matière | Format attendu | Points | Coef | Élim. |
|---|---|---|---|---|
| A - T3P | 10 QCM + 5 QRC | 1 / 2 | 3 | < 6/20 |
| B - Gestion | 16 QCM + 2 QRC | 1 / 2 | 2 | < 6/20 |
| C - Sécurité routière | 20 QCM | 1 | 3 | < 6/20 |
| D - Français | 7 QCM + 3 QRC | 2 / 2 | 2 | < 6/20 |
| E - Anglais | 20 QCM | 1 | 1 | < 4/20 |
| F(V) Dév. commercial / F(T) Régl. nationale | 12 QCM + 4 QRC | 1 / 2 | 3 | < 6/20 |
| G(V) Régl. spécifique / G(T) Territoire | 6 QCM + 2 QRC | 2 / 4 | 3 | < 6/20 |

Contrôles effectués :

1. Total de points différent de 20 (manque / excédent chiffré).
2. Nombre de QCM ou de QRC différent du format attendu.
3. Nombre total de questions différent du format attendu.
4. QCM sans aucune bonne réponse cochée.
5. QCM avec moins de 2 propositions, ou proposition au texte vide.
6. QCM dont toutes les propositions sont cochées correctes.
7. Lettres de propositions en double.
8. QRC sans réponse attendue, ou dont la réponse attendue est en fait la question.
9. Énoncé vide.
10. Coefficient différent du coefficient officiel.
11. Seuil éliminatoire différent du seuil officiel (6, ou 4 en Anglais).
12. Matière partagée non synchronisée : même identifiant de matière présent dans un
    autre examen chargé avec un contenu différent (questions, choix, bonnes réponses,
    ordre) → signalée des deux côtés.

## Affichage

- Dans l'en-tête de chaque matière : badge rouge `⚠️ ANOMALIE — EXAMEN À VÉRIFIER`,
  et juste en dessous la liste complète des raisons, une par ligne
  (`🔴 Total incorrect : 19/20 — il manque 1 point`,
  `🔴 Format incorrect : 15 QCM + 2 QRC, attendu 16 QCM + 2 QRC`,
  `🔴 Q7 : QCM sans bonne réponse définie`,
  `🔴 Q12 : aucune proposition de réponse`,
  `🔴 Coefficient incorrect : 3, attendu 2`).
  Tous les problèmes sont affichés, pas seulement le premier.
- Dans la liste des examens : `⚠️ Examen incomplet / anomalie détectée` en rouge
  dès qu'une matière est en anomalie, avec le nombre de matières concernées ;
  sinon `✓ Examen conforme` en vert.
- Le badge existant « Total X/20 » reste en place.

## Mise en œuvre technique

- Nouveau fichier `src/components/cours-en-ligne/examens-blancs-anomalies.ts` :
  référentiel officiel (format attendu par matière) + fonctions pures
  `detectMatiereAnomalies(matiere, contexte)` et `detectExamenAnomalies(examen, tousExamensCharges)`
  retournant une liste de messages. Aucune écriture, aucun effet de bord.
- `ExamensBlancsEditor.tsx` : appel de ces fonctions au rendu uniquement
  (`useMemo`), affichage des badges. Aucune modification de `persistExamens`,
  `reconcileSharedMatieres`, `addQuestion`, `confirmDelete`, ni du calcul des notes.
- Aucune migration, aucun accès en écriture à la base.
