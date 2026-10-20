# Total présence — 20 octobre 2026

Demande : total présence session + pratique cohérent pour cet élève et les autres. Affichage live uniquement : aucune écriture de signatures, heures, comptes, questions ou relevés gelés ; aucune publication.

Cause : ApprenantDetailPage imposait max(session + pratique, reqTotal contractuel) ; cours du soir 40/40 h + pratique 6/6 h affichait 46/66. Correction commune dans tauxTotalPresence : dénominateur session réelle + pratique réellement prévue (6 h prévues de pratique conservées si non inscrite), soit 46/46 = 100 %. Chaque partie plafonnée séparément pour éviter qu'un surplus théorie compense une pratique manquante. Lecture non disponible : total affiché indisponible/chargement, pas ancien taux ni faux zéro visible.

Tests fictifs PASS : 43 tests / 4 fichiers. Soir, journée, TAXI, TA complets = 100 % ; pratique absente 60/66 = 90,909 % ; surplus théorie sans pratique inférieur à 100 % ; pratique explicite 3 h respectée ; lecture null sans taux. Aucun test sur compte élève ni action de signature.

Contrôle CRM connecté lecture seule, appels fonctions et écritures de table bloqués : dossier signalé 46 h signées/46 h prévues, 100 % ; Amor Mahroug 60/66 h, 90,9 %, pratique 0/6 h. Captures des deux tuiles inspectées. Compilation automatique OK à 15:41:09 UTC. Le calcul commun concerne les autres dossiers éligibles ; audit individuel de tous les élèves NON PROUVÉ, pas de prétention de vérification exhaustive. Taux e-learning/jalons et taux présentiel séparé inchangés.