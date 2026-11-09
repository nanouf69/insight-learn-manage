# EB2 VTC — notation des copies historiques dans Correction QRC V2 (09/11/2026)

## Publié
- Serveur : journal append-only `qrc_historique_corrections` + fonction `qrc_historique_noter` (migrations 0253, 0254).
- Écran : copies EB2 journée (156 QRC) et soir (16 QRC) notables dans le même correcteur V2, sans ancien correcteur.
- Bundle public contrôlé : `index-C3pLpHjM.js` (contient la notation, ne contient pas le correctif statistiques).

## Garanties de la notation
- Admin seul ; copie originale verrouillée ; question et barème lus dans les questions figées ; demi-points de 0 au barème.
- Score enregistré doit être prouvé (QCM exacts + points enregistrés), sinon refus. Copie modifiée depuis l'affichage : refus.
- QRC déjà validée ou copie déjà liée au moteur V2 : refus, jamais de réécriture.
- Remise non identique (même réponses, autre instant) : case de confirmation obligatoire, enregistrée avec la note.
- Proposition automatique en attente conservée dans la copie, jamais transformée en note.
- Rejeu d'une même opération = même résultat, sans doublon.

## Preuves
- 10 tests PostgreSQL jetable PASS ; 53 tests écran PASS ; build OK.
- Serveur réel, sans écriture : non-admin refusé ; question QCM refusée ; copie journée et soir passent identité/barème/preuve du score puis s'arrêtent sur le contrôle de confirmation. Journal = 0, notes 9,5 et 9 inchangées.
- Site public, écritures bloquées : 156/16 cellules, 5 boutons de note, désactivés tant que la case n'est pas cochée.

## Incident corrigé pendant le contrôle
- Les refus « copie modifiée » utilisaient un code que la couche API réessaie automatiquement : sondes bouclées sans écriture. Code remplacé (0254), boucles arrêtées.

## Non prouvé / restant
- Aucune note réelle saisie (aucune note fictive) : premier enregistrement à faire par un formateur.
- Nouvelle copie EB2 soir de bout en bout (soumission → apparition → note → résultat élève) non rejouée en réel.
- Correctif « Erreur au 1er essai » : toujours en aperçu, non publié (attente d'accord).
