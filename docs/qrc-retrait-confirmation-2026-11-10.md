# Retrait de la confirmation de copie — 10/11/2026

## Changement en aperçu
- Composant : `AdminCorrectionQrcV2Reel.tsx`. Suppression des deux encadrés/cases de confirmation (notation et révision), de leur état local et de leur désactivation des boutons de notes.
- Le clic sur une note envoie directement la correction pour une copie prouvée. La relecture ciblée existante doit confirmer la note avant navigation et met à jour le résultat de la grille.
- Identité supplémentaire avant envoi : QRC ↔ passage ↔ élève ↔ question et ID du résultat historique cohérents.
- `reconnaissanceRemise` n'émet plus de confirmation humaine pour `resultat_seul`. Sans remise identique prouvée pour élève/exercice/tentative/réponses, clic autorisé mais erreur claire, aucun envoi. La validation automatique reste exclue pour ces copies.
- Pour une remise aux réponses identiques avec date différente, la trace de vérification automatique existante reste envoyée : pas de case, pas d'attestation humaine inventée.
- Les confirmations distinctes de révision d'une note déjà enregistrée restent conservées ; elles protègent l'historique, ce n'est pas la confirmation de remise supprimée.

## Serveur inchangé
Lecture ciblée de `qrc_historique_noter` : administrateur requis, copie originale verrouillée, lien V2 refusé, question unique du snapshot, barème, score initial et version attendue vérifiés, provenance recalculée, journal append-only et recalcul transactionnel existants. Aucune migration ni changement des contrôles serveur.
La suppression d'une case ne rend pas une copie non prouvée fiable : ces cas restent refusés sans fausse confirmation.

## Tests et limites
- PASS : 53 tests ciblés (enregistrement immédiat natif/historique, relecture, identité divergente, remise non prouvée, note matière/finale, attente réelle et affichage historique).
- PASS : 12 contrats PostgreSQL jetables existants (recalcul, preuves intactes, idempotence, concurrence, droits, score périmé, lien V2, barème, journal et révision).
- Contrôle navigateur authentifié en lecture seule : correcteur réel chargé ; aucune écriture de note réelle. Le parcours d'enregistrement complet est vérifié sur copies synthétiques dans les tests, pas sur une copie réelle.
- Aucune réponse, note existante, copie, compte ou historique modifié en production ; aucune publication. Le correctif de tri précédent reste également en aperçu.