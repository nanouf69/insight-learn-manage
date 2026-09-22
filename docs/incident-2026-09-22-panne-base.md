# Incident 22/09/2026 — base de données injoignable (19h46 → 20h50 Paris)

Document de preuve. Lecture seule : aucune donnée pédagogique modifiée pendant l'analyse.

## Chronologie établie (heure de Paris)

| Heure | Fait | Preuve |
|---|---|---|
| 19h46 | Dernière écriture acceptée par le serveur (`reponses_apprenants.updated_at` max avant coupure) | requête SQL lecture seule |
| 19h46 → 20h50 | Base injoignable : « Sauvegarde échouée » côté élèves, faux « Email ou mot de passe incorrect » côté connexion | signalements + absence totale d'écritures |
| 20h50:07 | Redémarrage du moteur de base **déclenché par Lovable** (outil de redémarrage du backend, à ma demande dans cette conversation) | `pg_postmaster_start_time()` = 2026-09-22 18:50:07 UTC |
| 20h55 | Première trace disponible dans les journaux (toutes sources) | `min(timestamp)` par source = 18:55 UTC |
| 21h51+ | Resynchronisations des files locales (hamani djamel, inacio nicolas) | écritures acceptées |

## Cause racine : NON PROUVÉE

- La panne a commencé vers 19h46, **avant** tout redémarrage.
- Le redémarrage de 20h50:07 est **notre action de rétablissement**, pas la cause.
- Effet secondaire majeur : ce redémarrage a **effacé tous les journaux antérieurs** (base, auth, API, fonctions, réseau). Aucune métrique ni log de 19h40–20h50 n'est conservé.
- Conséquence : impossible de démontrer saturation, OOM, limite de connexions, incident hébergeur ou crash. Ne pas conclure sans preuve.

## Défauts prouvés (à corriger après la session EB3)

1. **Alertes cassées** : chaque écriture dans `alertes_systeme` est refusée (`new row violates row-level security policy for table "alertes_systeme"`). Les alertes sont produites puis jetées → aucune notification pendant la panne.
2. **Faux message d'identifiants** : l'écran de connexion affiche « Email ou mot de passe incorrect » pour toute erreur, y compris serveur injoignable.
3. **`permission denied for function check_apprenant_session`** : erreur répétée plusieurs fois par minute (également `start_or_get_exam_timer`).
4. **Règle 48 h** : le refus `P0471` (`enforce_exam_retake_delay`) remonte comme « Sauvegarde échouée » et le client réessaie ~1 fois/seconde sans fin. Observé le 22/09 à partir de 21h03 : ~195 échecs `POST /rest/v1/rpc/persist_answer_batch_v2` (500) pour SAWADOGO MOUMOUNI (`0760af63-eb39-4102-811f-96d09adedffa`), EB3 terminé le matin à 10h09 → nouveau passage refusé jusqu'au 24/09 10h09.
5. **Supervision interne à la base** : une surveillance qui écrit dans la base ne peut pas alerter quand la base tombe.
6. **Journaux non conservés** après redémarrage.

## Métriques disponibles APRÈS rétablissement (pas pendant la panne)

- Instance : Small. Mémoire 55 %. Disque 16 %. Base 548 Mo. WAL 560 Mo.
- Connexions : 46/90 (modéré). Clients pooler : 1/400. Redémarrages depuis boot : 0.
- Ces valeurs ne prouvent rien sur l'état pendant la panne.

## Décisions prises

- Règle des 48 h **non modifiée**, aucune autorisation de nouveau passage pour SAWADOGO.
- Aucun déploiement tant que des élèves passent EB3 et que les 15 resynchronisations ne sont pas confirmées.
- Dimensionnement de l'instance **décidé après test de charge**, pas avant.
