# Présence par créneau — aperçu, pas de publication

## Diagnostic lecture seule
Le catalogue actuel `presentiel_heures_validees` ne possède ni inscription, session, créneau, formateur, preuve liée ou version de décision. Le lecteur des signatures manquantes expose date/créneau/plage/source, mais pas l'ID inscription/session. Une insertion via le formulaire date-only ne satisferait donc pas la demande d'identité exacte et de journal atomique. Aucun appel d'écriture ajouté.

## Préparé
- Action à côté de chaque créneau manquant dans les deux vues CRM, contrôle frais du compte et du rôle admin avant ouverture, lecture des déclarations du même dossier et avertissement de chevauchement.
- Confirmation : date de séance figée si créneau existant, durée réelle affichée, session/inscription, formateur, référence preuve et confirmation du déroulement réel. Bouton final déconnecté ; aucune simulation affichée comme validation réelle.
- Bloc pratique affichant les heures prouvées relues et la cible 6 h demandée, explicitement non contractuellement confirmée. Durée 0–6 h ; zéro n'est pas une nouvelle présence. Aucun rattachement ou 6 h automatiquement créés. Lecture impossible ne produit pas zéro.
- Projection pure de reçus confirmés exacts : signature manquante reste à signer ; justification diminue uniquement avec preuve exacte cohérente ; dates seules 1h30/4h restent en revue, jamais additionnées automatiquement. Cette projection reste déconnectée des taux réels tant que le serveur n'existe pas.

## Identités et dénominateurs
Les trois plages demandées représentent 150+90+150=390 minutes (6h30). Les déclarations historiques sans créneau ne sont ni supprimées ni affectées à un créneau deviné. Dernier audit CHERNI : 40 h de théorie par défaut du parcours soir, durée configurée NULL ; aucune session pratique inscrite ; 46 h non prouvées contractuellement. Le bloc 0h/6h n'ajoute pas 6 h au dénominateur. Contrat à confirmer avant tout changement.

## Blocage activation
Il faut un journal append-only serveur avec rôle admin vérifié, clock_timestamp, preuve liée, inscription/session/créneau revalidés, refus de signatures/absences existantes, verrou atomicité/idempotence, arbitrage explicite des anciennes déclarations, protection EDOF/relevés et lecture propriétaire. Puis raccorder les lecteurs communs et événements sans polling et prouver restauration. Ni migration ni transport réel ni taux optimistes ajoutés ici. Mises à jour réelles inter-écrans non implémentées car aucune écriture autorisée ni nouvelle source serveur installée.