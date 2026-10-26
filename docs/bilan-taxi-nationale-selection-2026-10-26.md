# Correctif ciblé — Bilan exercices TAXI / Nationale

## Cause vérifiée
Le chargement canonique du module 9 remplaçait le JSON (99 anciennes questions) par les 195 lignes actives de `bilan-exercices-taxi`, section 203. Cette section est aussi liée au module TA 27/exercice 250. Une modification de ses lignes aurait affecté TA et potentiellement les preuves historiques.

## Correction sans écriture Cloud
La lecture du module TAXI 9 inclut désormais `reglementation-nationale`, sections 70 puis 71. Une projection stricte sélectionne 64 + 34 lignes actives. Elle reprend leur texte et leurs corrigés actuels, tout en conservant les UUID et IDs du bilan déjà existants, par correspondance structurelle `section_source * 1000 + id_source`. Les 98 correspondances ont été vérifiées en lecture seule : aucune identité créée ni renumérotée.

- Question Partie 2 ID 7 : UUID source `98b4e7de-5c7c-418a-8aa5-be448a136b7e`, identité Bilan 71007, 30,55 €/hl, réponse 916,50 €.
- Question Partie 2 ID 10 : UUID source `40fa8764-71ce-4e9e-a0b1-3124bf324909`, identité Bilan 71010, texte/corrigé actuel DGFIP.
- Ancienne question Partie 2 ID 15 : UUID source `e7040798-6c8a-4fcb-acc1-e20e0bba5ddc`, inactive, non sélectionnée. Aucun enregistrement supprimé.
- Partie 1 : IDs Bilan 70000 + ID source ; Partie 2 : 71000 + ID source. Ordre canonique de chaque partie conservé.
- Les lectures de confirmation après sauvegarde utilisent la même projection ; aucune commande canonique d'écriture supplémentaire n'est introduite.
- Les passages TAXI nationale déjà figés gardent leurs propres questions et corrigés, sans actualisation à partir de la nouvelle sélection. Les autres passages restent sur leur circuit inchangé.
- TA module 27, exercice 250 : projection désactivée ; 195 questions toujours affichées.

## Entrées résiduelles conservées
Les 195 lignes actives en base restent toutes présentes. 97 ne sont plus sélectionnées dans TAXI : IDs hérités 1–69 et 71–98 de la section 203 (ID 70 déjà inactif). Ce ne sont pas des suppressions. Les UUID des 98 lignes sélectionnées sont ceux des entrées existantes 700xx/710xx ; la totalité de la table reste identique.

## Contrôles exécutés
- 50 tests PASS sur 5 fichiers, dont 12 nouveaux tests de projection : 195 avant / 98 après, unicité, ordre 64+34, exclusion ID15, versions 7/10, identité historique, absence de mutation, isolation TA/locale et arrêt sur source incomplète ou identité manquante.
- Tests existants des passages figés, interface historiques, suppressions canoniques et relecture après édition PASS.
- Aperçu admin authentifié réel : TAXI affiche 98 ; TA affiche toujours 195. Onglet Résultats élèves accessible. Aucun clic d'enregistrement ni test sur les réponses d'un élève.
- Compilation automatique : build OK 26/10/2026 14:48:49 UTC.
- Empreintes Cloud avant/après identiques : 558 lignes canoniques nationales/bilan, `b8a16e29b152fe26245998698eb6f4b5` ; JSON module9 `95b7f94842846dd57dfbeba11e60c87f`, module10 `3e10b4e3aca401c54a5a90d0ebb5a826`, module27 `933ace34d56b645886d25198c161aa22`.

## Fichiers
- `src/lib/bilanTaxiNationaleSelection.ts` : projection pure, garde historique ciblée.
- `src/components/cours-en-ligne/ModuleDetailView.tsx` : branchement lecture/relecture TAXI et maintien des snapshots.
- `src/test/bilan-taxi-nationale-selection.test.ts` : 12 tests ciblés.
- `AGENTS.md`, `roadmap.md`, ce rapport : contraintes et suivi.

## Limites
Aucune publication, aucun changement SQL, aucune donnée élève écrite. Lecture de chaque résultat individuel en compte élève NON PROUVÉE ; les circuits historiques ont été testés et l'onglet admin vérifié. Aucun ancien résultat recalculé.