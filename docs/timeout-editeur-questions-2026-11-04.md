# Timeout 57014 éditeur de questions — 04/11/2026
Incident : contact@ftransport.fr 13:52:46 UTC, save_module_editor_state (module 10/2 Sécurité routière), réessai réussi 13:54:34.
Cause mesurée (copie jetable) : une sauvegarde réécrit le module + 3 modules frères (≈130–200 Ko JSON chacun, tous les contrôles relancés 4 fois) ;
propagate_shared_exercices reconstruisait les ~60 modules et re-parcourait l'ancien JSON pour chaque exercice (coût quadratique).
Copie au repos : 0,4–0,6 s ; en production, sous charge (mémoire 86 %, lecture triviale moyenne 257 ms), dépasse parfois la limite de 8 s.
Correctif préparé, NON appliqué : docs/propagation-partagee-0239-preparee.sql (passage unique, modules non concernés ignorés, ordre de verrouillage fixe).
Équivalence : src/test/propagation_partagee_equivalence.py — 12/12 PASS (mêmes modules écrits, même JSON, même journal, mêmes refus), 20–60 % plus rapide.
Non résolu : verrous croisés entre deux sauvegardes simultanées de modules liés ; durée prod non mesurable par requête.
