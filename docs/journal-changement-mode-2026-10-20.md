# Changement de mode de formation — 20/10/2026

Demande : après passage présentiel vers e-learning, réactualiser les indicateurs ; conserver les présences réelles et ne plus mettre le total e-learning en rouge. Jalons e-learning toujours rouges.

Cause : cache de taux indexé seulement par dossier, non invalidé lors de la modification. Le badge lisait le nouveau type pendant que le total conservait totalParSignatures de l'ancien type ; lecture de présence désactivée sur e-learning => faux chargement permanent.

Changements : identité de requête incluant mode et heures ; invalidation après modification de la fiche ; lecture des présences et cartes session/pratique sur les parcours concernés, y compris e-learning ; taux présentiel affiché sur le total des heures prévues session/pratique, sans réécrire heures contractuelles ou relevés. Le total e-learning garde le calcul existant heures en ligne + présentiel, couleur primaire, jalons rouges. Aucune modification des signatures, réponses, notes, historique ni publication.

PASS : 35 tests / 4 fichiers dont bascule fictive présentiel vers e-learning sur la même fiche montée, conservation de la présence signée 3 h et disparition de la logique total par signatures. Compilation automatique OK 15:45:33 UTC.

Contrôle CRM connecté lecture seule, appels fonctions et écritures table bloqués : Aba-Bakre e-learning ; total 75 % bleu, 49h43/66h ; présence réelle pratique 6/6 h = 100 %, aucune session théorique inscrite ; taux présentiel 6/6 = 100 % ; jalons rouges. Capture inspectée. Aucun changement réel de formation enregistré pour le test, aucune signature dessinée, aucun envoi. Contrôle de tous les dossiers individuellement NON PROUVÉ.