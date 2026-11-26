-- CANDIDAT NON EXECUTE. Revue explicite avant changement de planification.
-- Job 18 vérifié en SELECT le 26/11 : */2 1-5 * * * (150 appels/jour).
-- Proposition : reprise toutes les 2 minutes toute la journée (720 appels/jour).
-- Ne crée pas un nouvel export, ne répare pas une journée historique, ne restaure rien.
-- La fonction à déployer AVANT ce changement traite jusqu'à 8 paquets / 20 s par appel.
-- Après fin elle ne relit que le checkpoint; le coût des 720 appels reste à revoir.
SELECT cron.alter_job(18, schedule := '*/2 * * * *');
-- Retour au calendrier antérieur, sans toucher aux exports :
-- SELECT cron.alter_job(18, schedule := '*/2 1-5 * * *');