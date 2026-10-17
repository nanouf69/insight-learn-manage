# Dates pratiques des devis — 17 octobre 2026

Demande : proposer les dates de session pratique dans le devis MESBAHI.

Diagnostic SELECT : le devis utilisait les plages théoriques fixes. Le planning enregistré contient les journées TAXI 17, 22 et 23 octobre 2026 et les journées VTC séparées. Les intitulés historiques de période ne concordent pas toujours avec les journées : seules les journées explicitement typées sont utilisées.

Changement frontend : `DevisSection.tsx` lit le planning en pagination ; `devisPratiqueDates.ts` sépare les filières, exclut les jours retirés, conserve les week-ends et évite les dates doublonnées. Erreur de lecture affichée distinctement ; aucune substitution théorique. Choix manuel conservé dans le circuit existant du PDF.

Preuves : 5 tests exécutés PASS ; navigateur sur devis fictif, tous les appels d’écriture bloqués, trois options TAXI exactes et sélection du 22 octobre confirmée. Compilation automatique OK à 08:46:41 UTC.

Aucune écriture élève/planning, aucun prix modifié, aucune modification pédagogique, aucun document remplacé, aucun e-mail ni publication. PDF final et dossier réel non testés. Autres chantiers de la feuille de route hors périmètre ; blocage publication coordonnée upload inchangé.