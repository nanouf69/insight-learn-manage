# Timeout 57014 éditeur de questions — 04/11/2026
Incident : contact@ftransport.fr 13:52:46 UTC, save_module_editor_state (module 10/2 Sécurité routière), réessai réussi 13:54:34.
Cause mesurée (copie jetable) : une sauvegarde réécrit le module + 3 modules frères (≈130–200 Ko JSON chacun, tous les contrôles relancés 4 fois) ;
propagate_shared_exercices reconstruisait les ~60 modules et re-parcourait l'ancien JSON pour chaque exercice (coût quadratique).
Copie au repos : 0,4–0,6 s ; en production, sous charge (mémoire 86 %, lecture triviale moyenne 257 ms), dépasse parfois la limite de 8 s.
Correctif préparé, NON appliqué : docs/propagation-partagee-0239-preparee.sql (passage unique, modules non concernés ignorés, ordre de verrouillage fixe).
Équivalence : src/test/propagation_partagee_equivalence.py — 12/12 PASS (mêmes modules écrits, même JSON, même journal, mêmes refus), 20–60 % plus rapide.
Non résolu : verrous croisés entre deux sauvegardes simultanées de modules liés ; durée prod non mesurable par requête.

---

## Complément 04/11 — incident 15h18 (14:18:32 UTC), lecture seule + copie isolée

### Confirmé
- Correctif 0239 **jamais appliqué** : fonction live `propagate_shared_exercices` sans `v_changed_keys` (md5 définition `9fd28018…`), dernière migration = 0238.
- Trace 14:18:32 UTC : `contact@ftransport.fr`, « Erreur sauvegarde DB module_editor_state 57014 » (2e occurrence du jour). Édition exercice 82 (Sécurité routière P3) q18, partagé modules 2/10/15/21. Clic suivant 14:18:45 : q18+q20 enregistrées → aucune perte.
- Copie isolée reconstruite (empreinte module_editor_state identique au live à 14:24 : `8a1340db…`).
- Équivalence ancienne/nouvelle propagation : **16/16 PASS** (dont 4 cas réels exo 82 : énoncé depuis 2/10/15, bonne réponse).
- Coût intrinsèque d'un enregistrement exo 82 (copie isolée, médianes) : 450 ms ; propagation = ~350 ms ; autres contrôles chacun < 100 ms (bruit). Avec 0239 : ~310 ms, dont ~300 ms = réécriture **nécessaire** des 3 modules partagés. Gain 0239 ≈ 25–30 % seulement.
- Production (pg_stat_statements depuis 03/11 19:39 UTC) : `save_module_editor_state` moyenne **2 217 ms**, max 7 078 ms (réussites seules) → ×5 par rapport à la copie isolée. Une sonde triviale (`module_id, updated_at`) : 0,8 ms en isolé, **287 ms** moyenne en production.
- Temps base cumulés depuis 03/11 19:39 UTC : `etat_completion_modules` 21 600 s (40 200 appels, 538 ms) ; sonde de version module 18 050 s (62 900 appels) ; `save_module_completion` 7 000 s (1 236 ms moyenne) ; Realtime (lecture WAL) 4 900 s ; relectures complètes de module ~2 000 s. Instance Small, mémoire 89 %.

### Conclusion
La cause directe reste la propagation, mais le dépassement vient surtout de la **saturation générale de la base** aux heures de pointe : un enregistrement de 0,45 s en isolé dépasse 8 s quand la base est occupée. 0239 seul ne suffira pas.

### Hypothèses non prouvées
- Les 19 abonnements Realtime non filtrés sur `module_editor_state` multiplient le décodage des lignes de 156 Ko (4 lignes par enregistrement admin).
- La lenteur de la sonde (×350) suggère une file d'attente CPU/E-S, non mesurable sans télémétrie par requête en production.

### Empreintes live de référence (14:3x UTC, édition admin en cours)
module_editor_state 62 `bbf7f716…` ; quiz_questions 2 317 `7842c53a…` ; exam_attempts_v2 2 231 `f3fc9451…` ; bilan_passages_figes 17 `461e966a…` ; canonical_questions 0.
