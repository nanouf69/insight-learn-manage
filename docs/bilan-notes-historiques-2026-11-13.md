# Bilan examen invisible — HASSEN BENKHELIL

- Cause : `lireBilansNotes` lisait uniquement passages figés et reçus futurs ; aucun pour cet apprenant. Les remises historiques restent dans `reponses_apprenants` et n’étaient pas affichées.
- SELECT : exercices 600, 601, 602, 605, 606 : `status=submitted`, `completed=true`, date de remise enregistrée. 604 est un brouillon ; 603 absent. Module 11 reste `in_progress` : aucune validation de module déduite de ces cinq remises.
- Correctif en aperçu : lecteur nominatif paginé des métadonnées des exercices historiques. Révisions exclues par identité exacte. Carte distincte, aucune association supposée avec tentative figée/future. Notes historiques non vérifiées restent nulles, jamais zéro/recalcul.
- 13 tests PASS ; vrai compte administrateur, fiche → Vue apprenant → Notes → Bilan examen : une carte, cinq remises visibles sur PC ; compteur Bilan examen (1) vérifié à 390 px. Menu CRM préexistant recouvre une partie de la capture mobile, non modifié dans ce chantier.
- Build automatique OK. SELECT avant/après : six IDs, dates, flags et empreintes identiques.
- Aucun changement des réponses, notes, validation, droits ; aucune migration/publication.