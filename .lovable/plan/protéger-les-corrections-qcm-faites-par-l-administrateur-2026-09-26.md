# Protéger les corrections QCM faites par l'administrateur

## Constat (lecture seule)
- `CorrectionQCMTab.tsx` (enregistrement de la correction) met à jour `score_obtenu`, `score_max`, `note_sur_20`, `reussi` dans la fiche de note, sans aucun marqueur.
- Le verrou `garde_correction_admin_quiz` ne protège une note que si `details.correctionsIA` contient `validatedByAdmin` ou `manuel`. Une correction QCM seule n'est donc pas protégée.

## 1. Marqueur lors d'une correction QCM (CorrectionQCMTab.tsx)
- Lire d'abord `details` de la fiche (lecture), puis ajouter dans la même mise à jour :
  `details.correctionQCMAdmin = { manuel: true, validatedByAdmin: true, correctedAt: <heure>, par: <id admin> }`.
- Toutes les autres clés de `details` sont conservées telles quelles (fusion, rien n'est effacé).
- Calcul de la note inchangé (mêmes `totalScore`, `totalMax`, `noteSur20`, `admis`).

## 2. Extension du verrou (migration, remplace uniquement la fonction)
- La fiche est protégée si `correctionsIA` porte le marqueur (règle actuelle) OU si `details.correctionQCMAdmin` porte `manuel` ou `validatedByAdmin` = true.
- Pour un compte élève : même refus 42501 si score, note, réussite, `correctionsIA` ou `correctionQCMAdmin` changent (un élève ne peut ni retirer ni modifier le marqueur).
- Admin et service : toujours autorisés. Renvoi des mêmes valeurs : accepté.
- Déclencheur existant inchangé ; aucune donnée écrite par la migration.

## 3. Lecture seule : fiches déjà corrigées sans marqueur
- Recherche des traces détectables (journal d'audit des modifications admin sur les notes, ou note différente du score recalculé depuis les réponses). Résultat donné avec le niveau de preuve (PROUVÉ / NON PROUVÉ). Aucune modification.

## Tests
- Test automatique (nouveau) : le marqueur est ajouté sans changer la note ; les autres clés de `details` sont conservées.
- Base, dans une transaction annulée (données fictives) : élève modifie une note marquée → 42501 ; élève renvoie les mêmes valeurs → OK ; élève retire le marqueur → 42501 ; admin et service → OK.
- Compte TEST (version de préparation) : correction QCM admin simulée puis tentative d'écriture élève refusée.
- Arrêt avant toute publication.

## Fichiers touchés
- `src/components/cours-en-ligne/CorrectionQCMTab.tsx` — ajout du marqueur dans `details`.
- Nouvelle migration — nouvelle version de `garde_correction_admin_quiz`.
- `src/test/correction-qcm-admin-marqueur.test.ts` (nouveau) — tests du marqueur.

Non touchés : synchronisation, questions, barèmes, réponses, notes existantes, boutons élèves.
