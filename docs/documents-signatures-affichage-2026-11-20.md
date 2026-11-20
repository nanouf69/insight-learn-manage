# Documents et signatures visibles — 20 novembre 2026

## Cause et correction
Dans Formulaires, une liste de documents vide provoquait un retour anticipé avant tout le bloc présence/signatures. Cette condition est supprimée : le même affichage administratif s'applique désormais aux dossiers vides et non vides, toutes formations confondues.

- Absence de document explicitement signalée.
- Signatures manquantes toujours présentées via la classification existante, sans nouvel objectif ni modification de périmètre.
- Erreurs des lectures documentaires signalées comme indisponibilité, pas absence.
- Planning incomplet ou total non confirmé : pas de déclaration « aucune signature manquante ».
- Signatures en attente de rattachement conservées dans l'affichage.

## Vérification
29 tests exécutés avec succès dans quatre fichiers, dont huit tests de fiche vide/erreur et sept types de parcours fictifs (FC VTC/TAXI, VTC, TAXI, TA, VA, VTC e-learning). Dernier contrôle de compilation : build OK.

Contrôle navigateur CRM : NON PROUVÉ. La session officielle du demandeur a été restaurée sans changement de droits ; l'application redirige vers cours-public et affiche un accès expiré. Aucun autre compte usurpé, aucun rôle modifié. Contrôle visuel PC/mobile à terminer depuis une session administrateur.

Aucune écriture documentaire, signature, présence ou inscription exécutée ; aucun mail ni publication. Les pièces manquantes ne sont pas créées, les règles de complétude et les exclusions de périmètre restent inchangées.