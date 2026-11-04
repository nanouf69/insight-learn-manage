# Délai dépassé (57014) dans l'éditeur de questions — constat du 04/11 15h18 et plan

## Constats confirmés (lecture seule, 04/11 vers 14h20 UTC)

1. **Le correctif préparé n'a jamais été appliqué à la base en ligne.**
   - La fonction de propagation active en base ne contient pas l'optimisation préparée (marqueur `v_changed_keys` absent, empreinte `9fd28018…`, 4 572 caractères).
   - Aucune migration 0239 n'existe : la dernière est 0238. Le fichier `docs/propagation-partagee-0239-preparee.sql` n'est qu'un brouillon dans la documentation. Le commit 4ac1cac contenait seulement la préparation, pas de changement de la base.
   - Conséquence : rien n'a changé côté serveur depuis l'incident de 13h52. La répétition de l'erreur était donc attendue.

2. **La trace de 15h18 (14:18:32 UTC) correspond bien à cet échec.**
   - Journal d'erreurs : même erreur que celle de 13h52, revue à 14:18:32. Compte `contact@ftransport.fr`, message « Erreur sauvegarde DB module_editor_state … 57014 », 2 occurrences au total aujourd'hui.
   - Modification en cours : Sécurité routière Partie 3 (exercice 82), question 18. Cet exercice est partagé entre 4 modules : 2 (VTC, 128 Ko), 10 (TAXI, 156 Ko), 15 et 21 (32 Ko chacun).
   - Enregistrements réussis à 14:16:52, 14:17:08 et 14:17:34. Échec à 14:18:32. À 14:18:45, un enregistrement réussi contient à la fois la question 18 et la question 20 : la saisie restée affichée a donc bien été enregistrée au clic suivant. Rien n'a été perdu.
   - Chaque enregistrement réussi écrit ses 4 modules à la même seconde, ce qui confirme la propagation vers les modules partagés.

3. **État de la base au moment du constat :** mémoire à 89 %, 56 connexions sur 90, 20 310 transactions annulées (54 de plus que lors du constat précédent). Le délai maximal autorisé pour les comptes connectés est de 8 secondes.

## Hypothèses (non prouvées, à mesurer)

- H1 : la propagation lit encore les 62 modules (environ 8,7 Mo) à chaque enregistrement. C'est la cause déjà mesurée sur la copie isolée. Le correctif préparé ne retirerait que cette partie.
- H2 : pour l'exercice 82, il reste obligatoire de réécrire 3 autres modules, dont le 10 (156 Ko). Chaque réécriture relance les autres contrôles automatiques de la base : journal des différences, intégrité, synchronisation des Bilans pour les modules 2 et 10. Le correctif préparé pourrait donc ne pas suffire à lui seul quand la base est chargée. Ce point n'a jamais été mesuré séparément.
- H3 : la vérification automatique répétée par chaque écran ouvert (environ 57 000 appels, 252 ms en moyenne) charge la base et allonge les enregistrements pendant les pics.

## Plan proposé (rien n'est exécuté sans votre accord)

### Étape 1 — Sauvegarde et mesure (lecture seule, sans effet sur le site)
- Recréer la copie isolée à partir de la structure et des données actuelles. L'ancienne copie a disparu au redémarrage du bac à sable.
- Calculer les empreintes de référence, ligne par ligne, sur les 62 modules et les tables liées : questions, choix, bonnes réponses, journal des questions, Bilans, examens commencés et leurs copies figées. Conserver ces empreintes dans le rapport comme preuve avant/après.
- Rejouer sur la copie l'enregistrement exact de 15h18 (exercice 82, question 18, depuis le module 2 puis le module 10). Mesurer le temps de chaque contrôle automatique, avant et après le correctif, pour confirmer ou écarter H1 et H2.

### Étape 2 — Correctif durable, choisi selon les mesures
- A (déjà prêt) : la propagation ne lit plus que les modules qui contiennent réellement l'exercice modifié. Comparaison déjà faite sur 9 cas, à refaire sur le cas réel de 15h18.
- B (si H2 est confirmée) : écrire les modules partagés en une seule passe et ne relancer les contrôles coûteux que sur les parties réellement modifiées. Ces contrôles ne sont jamais supprimés : ils s'exécutent seulement moins souvent quand rien n'a changé.
- C (si H3 pèse) : alléger la vérification automatique des écrans ouverts en comparant seulement un repère de version, jamais le contenu complet. C'est un changement de l'application, sans effet sur la base.
- Exclu : allonger simplement le délai maximal, ou supprimer un contrôle.

### Étape 3 — Contrôles de non-régression sur la copie isolée
- Résultat identique entre l'ancienne et la nouvelle logique pour : modification de texte, de choix, de bonne réponse, ajout et retrait de question, exercice non partagé, modules 2, 5, 10, 11, 15, 21, 28.
- Empreintes inchangées pour tout ce qui ne devait pas changer : autres modules, examens commencés, copies figées, réponses des élèves, notes.
- Protections toujours actives : refus d'un retrait massif, contrôle des identifiants des Bilans, refus d'une écriture périmée.
- Temps mesuré sous charge simulée, avec une marge nette sous 8 secondes.

### Étape 4 — Mise en place (seulement après votre accord explicite)
- Appliquer la modification de la base dans une migration numérotée. Elle est active tout de suite pour le site en ligne, et elle reste compatible : même interface, mêmes résultats.
- Vérifier ensuite que la fonction active en base est bien la nouvelle version, par sa relecture et son empreinte. C'est cette vérification qui avait manqué la dernière fois.
- Test de persistance : avec votre accord, sur un exercice de test, sinon sur une modification que vous faites vous-même. Enregistrer, recharger la page, relire la valeur dans la base, puis vérifier que les 4 modules partagés sont identiques.
- Recomparer les empreintes avant/après et surveiller le journal d'erreurs pendant les jours suivants.
- Aucune publication de l'application sans accord distinct si l'option C est retenue.

## Détails techniques

- Fonction active : `public.propagate_shared_exercices`, déclencheur AFTER UPDATE sur `module_editor_state`, appelée par la fonction `save_module_editor_state` (appel côté éditeur dans `ModuleDetailView.tsx`, vers la ligne 5804).
- Contrôles relancés sur chaque module cible : `trg_log_module_editor_state_question_diff`, `trg_enforce_exam_content_integrity`, `trg_bilan_aa_controle_ids`, `trg_module_editor_state_sync_bilans` (modules 2, 4, 9 et 10), `trg_zzz_qcl_journal`.
- Méthode de mesure prévue : `EXPLAIN ANALYZE` et `clock_timestamp()` par déclencheur, sur la copie isolée.
- Fichiers prévus : nouvelle migration 0239 (fonction de propagation, et éventuellement les déclencheurs concernés), `src/test/propagation_partagee_equivalence.py` (cas réel ajouté), le rapport `docs/timeout-editeur-questions-2026-11-04.md` mis à jour, et une règle dans `AGENTS.md`.
- Si l'option C est retenue : `ModuleDetailView.tsx` et `ExamensBlancsEditor.tsx` (vérification de version).
