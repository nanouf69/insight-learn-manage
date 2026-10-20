# Mode formation et taux de jalons — 20/10/2026

Demande : préciser présentiel/e-learning sur la fiche ; taux de jalons e-learning en rouge. Affichage uniquement, sans changement des taux, données pédagogiques, heures, signatures ou relevés figés. Aucune publication ni envoi.

Fichiers : modeFormationAffichage.ts, ApprenantDetailPage.tsx, JalonsPonderesCard.tsx, test de classification. La règle visuelle ne dépend plus de la date de début (contrairement à la règle des calculs, conservée intégralement). Mixte explicitement libellé E-learning + Présentiel ; type inconnu signalé à vérifier.

PASS : 3 tests de classification couvrant VTC/TAXI/TA/VA, alias, pratique, e-learning et mixte. Compilation automatique OK 15:32:01 UTC. Contrôle CRM connecté de la fiche ouverte : Formation : Présentiel visible ; capture inspectée. Appels de fonctions/écritures de table bloqués pour ce contrôle (2 appels bloqués). Aucun clic de modification ni signature/envoi.

NON PROUVÉ : rendu sur une vraie fiche e-learning et contrôle de toutes les autres pages ; aucun changement de calcul prévu. La capture fournie est un dossier présentiel, son taux total reste donc le taux de présence, non le taux de jalons.