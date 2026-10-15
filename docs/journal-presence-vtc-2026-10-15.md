# Présence VTC journée — 15 octobre 2026

Accord explicite : « Oui, corriger ». La fiche utilisait les 90 h de la session commune TAXI/VTC pour une VTC. Le calcul reçoit désormais la filière : VTC journée 60 h de session + 6 h pratique ; TAXI 90 + 6. Les autres sessions gardent leur durée enregistrée.

Périmètre : sessionHeures.ts, TauxPresenceSessionsCard.tsx, ApprenantDetailPage.tsx, test dédié, AGENTS.md et roadmap.md. Aucun changement des signatures, heures enregistrées, contrats, notes, progression ou relevés figés ; aucun envoi ni publication.

Vérification : 46 tests fictifs réussis (bases VTC/TAXI, autres durées, conservation des preuves, indicateurs). Carte réelle montée avec lectures interceptées sur données fictives : 100 % et 60/60 en session, 0/6 en pratique, aucune erreur JavaScript. Calcul total testé : 60/66 = 90,9 %. Compilation automatique OK le 15/10 à 15:00:25 UTC. Aucun vrai parcours élève testé.