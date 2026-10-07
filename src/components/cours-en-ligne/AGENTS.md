# Supports pédagogiques et protection T3P

- Corrected media use new assets, matching PDF/PPTX, exact historical-path selection, originals retained; why: fix clipping without replacing custom uploads.
- T3P 07/10 : sauvegarder un module ne doit jamais reconstruire globalement les Bilans ; migration 0128 conserve les objets questions inchangés et partage seulement les deltas de contenu. Réactivation limitée aux quiz 1/2 du module VTC 2 ; `shouldSyncVtcBilanFromCours` reste false ; why: préserver bilans, historiques et acquis.