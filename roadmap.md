# Feuille de route — 21/10

## 1. ErrorBoundary : rechargement sans effacement (priorité)
- [ ] Supprimer tout clear global : handleHardReload = rechargement cache-bust conservant URL, aucune donnée persistante effacée.
- [ ] Tests : files inconnues/propriétaires conservées, URL conservée.

## 2. Ancien chunk 404 (Riyad, JeuxCartesLyon)
- [ ] Notification nouvelle version + action recharger sans perdre les queues ; pas de boucle auto-reload ni refresh pendant frappe/envoi.
- [ ] Tests chunk obsolète/résolution/sécurité.

## 3. Rattrapage IA Aba-Bakre (64 QRC EB1/EB4/EB5/EB6)
- [ ] Collecte fraîche SELECT, allowlist figée, exécution via qrc_ia_suites bornée, vérification notes/résultats après.

## 4. Diagnostic Belarbi (révision module_3_revision_exo_404)
- [ ] Cause relecture ; corriger bug prouvé seulement.

## 5. Diagnostic Smail (révision module_2_revision_exo_1)
- [ ] Vérifier guards reconnexion ; aucune action sur données.

## 6. Finalisation
- [ ] Empreintes avant/après identiques, tests/types/build, déploiement fonctions, publication, journal.
