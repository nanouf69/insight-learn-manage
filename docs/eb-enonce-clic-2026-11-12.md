# Énoncé cliquable — éditeur examens blancs

## Identification et diff
Référence avant intervention : `e2fa69ca50e9db04a9e6eb61ea4e2f25d2c53ee8`.
La capture correspond à `AdminExamQuestionCard`, montée par `MatiereEditor` dans `ExamensBlancsEditor.tsx` : cadre primaire bleu, badge QRC/Q4, crayon, sélecteur Pos 4. L’énoncé était un simple `div` avec `RichText`, sans action.

Deux fichiers fonctionnels changés uniquement :
- `AdminExamQuestionCard.tsx` : édition locale du texte de l’énoncé avec le champ coloré déjà utilisé par le crayon, enregistrer/annuler, attente de confirmation, conservation du brouillon en cas de refus ou exception. Sans callback, rendu lecture seule inchangé.
- `ExamensBlancsEditor.tsx` : callback énoncé → `updateQuestion({...q, enonce}, false)` ; même identifiant, même circuit que le crayon. L’attente existante est créée avant la modification. Aucune modification du circuit des réponses.

Circuit conservé : `updateQuestion` → `handleMatiereChange` → autosave existant → `persistExamens` → `saveExamModuleWithCas` → référence serveur vérifiée, CAS, comparaison après relecture → publication V2 existante lorsqu’une version active existe → réconciliation d’affichage. Pas de nouveau rapprochement par position ou texte, ni de nouvelle propagation.

## Validation exécutée
- 25 tests Vitest PASS : édition QRC/QCM, refus et exception, retry malgré affichage optimiste, annulation/crayon, CAS/version périmée, partage/relecture, copies figées.
- Deux parcours navigateur PASS (1280×1800 et 390×844) sur le **vrai éditeur** avec toutes les méthodes de transport remplacées avant montage et toute requête externe bloquée : clic QRC Q4 puis QCM, une modification/enregistrement chacun, rechargement, réouverture variante EB1 VA, relecture via `loadSavedExamens`, conservation EB2 et des identités distinctes, snapshot d’origine, édition existante de proposition B, refus P0409/saisie conservée/retry.
- Aucune question fournie au composant n’est mutée par le champ local ; choix/corrigés conservés. Les contrôles et recalculs existants du crayon ne sont pas modifiés.
- Dernier journal de construction contrôlé : build OK.
- Captures PC/mobile inspectées ; avertissements de refs de l’aperçu présents, sans exception d’exécution du parcours. Refus CAS volontaire vérifié.

## Périmètre réellement prouvé / limites
Partage prouvé en simulation pour EB1 VTC ↔ EB1 VA F(V), par le groupe existant numéro d’examen + matière ; EB2 et autre identifiant de question restent distincts. La lecture active utilisée par les écrans apprenants a été exécutée sur ces fixtures ; **écran apprenant authentifié et publication V2 de bout en bout non vérifiés** (aucune version active simulée dans ce parcours). La copie figée conserve l’énoncé et les clés d’origine via le résolveur réel.

Le partage existant porte sur une matière entière dans son groupe déclaré, pas sur une nouvelle table de continuité par question. Aucune garantie supplémentaire de rapprochement de variantes divergentes ou de propagation à toutes les banques n’est revendiquée. Les examens commencés, notes et réponses ne sont jamais visés par ce diff.

Aucun compte réel, lecture/écriture en base réelle, migration, déploiement, publication ou envoi à un tiers. Les autres changements déjà en aperçu sont conservés. Tests : `src/test/exam-prompt-inline.test.tsx`, harness `src/test/exam-prompt-browser/`.