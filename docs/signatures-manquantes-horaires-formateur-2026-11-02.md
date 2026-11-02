# Feuille « signatures manquantes » : horaires + formateur — 02/11/2026

## Demande
Le propriétaire a demandé que la feuille imprimable « Signatures manquantes à imprimer (PDF) » affiche les horaires de chaque créneau et le formateur « Guenichi Naoufal ».

## Cause du défaut initial
`calculerSignaturesManquantes` transformait le créneau en libellé simple (« Matin », « Après-midi ») et les horaires étaient perdus ; le PDF ne retenait que le libellé, d'où une colonne sans heures (capture FIACRE LALEYE).

## Modifications
- `src/lib/signaturesManquantes.ts` : champ `horaires` ajouté à `SignatureManquante` (additif) ; `horairesAttendus()` déduit les horaires réels des mêmes sources que les créneaux attendus (horaires de session théorique via `creneauxSessionInscrite`, planning pratique `day_time_slots`, réservations, sinon horaires de la session pratique). Aucune heure inventée : sans source, `horaires` reste absent.
- `src/lib/pdf/signatures-manquantes-pdf.ts` : ligne « Formateur : Guenichi Naoufal » dans l'en-tête, colonne « Formateur » par ligne (constante `FORMATEUR_EMARGEMENT`, à la demande explicite du propriétaire ; aucune donnée formateur n'existe sur les sessions), horaires affichés sous le libellé du créneau, colonnes rééquilibrées (Date 44 / Créneau 48 / Formateur 38 / Signature 52), hauteur de ligne 30. Fonction pure `lignesPdfSignaturesManquantes` testable.

## Tests
- `src/test/signatures-manquantes-horaires.test.ts` (nouveau) : 9h-12h / 13h-16h, soir 17h-18h30 / 18h30-21h, FC 13h-17h (jamais généralisé), réservation pratique avec planning, session pratique 13h-17h.
- `src/test/signatures-manquantes-pdf.test.ts` (nouveau) : formateur = « Guenichi Naoufal », horaires par ligne, mention absence conservée, PDF réel multi-pages généré.
- Suites voisines : signatures-manquantes, bornes, relance, signatures-rassemblees, signatures-pdf-compte — 49 tests PASS.

## Limites
- Aucune donnée écrite, aucun mail, aucune publication du site dans ce chantier.
- Le formateur est une constante affichée à la demande du propriétaire : les sessions ne portent aucune liaison formateur en base ; si un jour un vrai formateur doit apparaître par session, il faudra une source de données.
