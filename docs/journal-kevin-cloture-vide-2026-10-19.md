# Journal 19/10/2026 — KEVIN FERNANDES, EB2 F(V) t2 « Clôture refusée »

Lecture seule (avant) :
- `reponses_apprenants` : aucune ligne `EB2__reglementation_vtc__t2` ; 5 matières t2 soumises (t3p, gestion, sécurité, français, anglais).
- `reponses_apprenants_journal` : 0 événement pour cette clé (aucune réponse jamais reçue).
- `apprenant_examen_timers` : chrono démarré 14/10 07:54:47 UTC, 30 min (expiré 08:24:47).
- Postgres 19/10 12:04–12:42 : refus `P0530` (garde `garde_eb_legacy_cloture_vide`) pour 20 opérations de clôture du 14/10 10:41–11:00 rejouées depuis la file locale à chaque ouverture de session.
- Chaque clôture refusée transporte toutes les réponses de l'écran : le serveur n'y trouve aucune valeur renseignée.

Cause : le refus P0530 mémorisé primait sur la garde de clôture et affichait « Clôture refusée par le serveur » en permanence.

Correctif (code client uniquement) : P0530 classé `cloture_vide` ; s'il n'existe aucune réponse locale renseignée, l'écran passe par « Temps écoulé sans réponse » (aucune écriture, aucune note). Divergence avec réponse locale = toujours bloquée. File locale intacte, 48 h inchangé.
Aucune donnée modifiée en base.
