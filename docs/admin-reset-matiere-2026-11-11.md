# Remise à zéro admin d’une matière — aperçu bloqué

## État
Bouton et confirmation uniquement. **Pas d’action effective, pas de publication, pas de migration préparée ou appliquée.** Le bouton de confirmation est toujours désactivé ; aucun transport de mutation n’est importé dans ce composant.

## Diagnostic en lecture seule
Le catalogue réel expose `start_exam_subject_retake(uuid,uuid,text,text,text,uuid)` :
- exige `core_est_proprietaire`, pas un droit admin ;
- crée une nouvelle réponse, éventuellement une tentative V2, et démarre immédiatement un chronomètre ;
- consomme éventuellement une autorisation à portée examen ;
- exige une identité de source univoque et refuse certaines copies historiques/V2 ambiguës.

Ce circuit élève ne peut donc pas être appelé depuis la fiche admin, ni être adapté en usurpant l’identité de l’élève. La restauration côté élève dépend notamment d’un reçu sélectionné dans son navigateur : une création admin seule ne prouve pas que seule cette matière sera proposée dans son parcours actif.

`core_admin_reset_exam`, `core_restart_matiere` et `reset_quiz_attempt` ne sont jamais utilisés comme replis. Le bouton global et ses actions restent byte-identiques.

## Parcours
VTC/TAXI anciens et V2 : action admin bloquée, aucune compatibilité effective annoncée. TA/VA également bloqués. Copies en cours : aucun déplacement/écrasement ; ce lot n’ajoute aucune action aux lignes en cours sans résultat. Les lignes terminées ouvrent uniquement une confirmation indisponible, identifiée par apprenant/examen/filière/matière/résultat et noms affichés.

## Prérequis de mise en service
Une opération additive spécifique doit permettre une autorisation nominative et différée sans lancer le chronomètre admin, vérifier côté serveur le rôle admin, le dossier, le parcours/filière, la matière, le résultat et le passage source, les copies concurrentes et l’idempotence. La lecture du parcours élève doit retrouver cette autorisation sans réécrire ses anciennes copies, sessions ou résultats, puis créer une nouvelle tentative non notée uniquement au démarrage de cette matière. Aucun score zéro, recalcul historique, suppression ou effet de bord global n’est admissible.

## Vérification attendue de ce lot
Les tests couvrent le blocage, l’annulation, les identités et l’absence de mutation. Le succès d’un reset, ses droits serveur et sa concurrence restent **NON PROUVÉS**, puisque l’opération admin n’existe pas. Ne pas assimiler un test d’interface à un contrat serveur positif.