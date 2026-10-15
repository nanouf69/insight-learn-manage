# Cohérence signatures VTC journée — 15 octobre 2026

## Accord et diagnostic lecture seule
Plan approuvé : journée comme soir, 20 signatures de session + 2 de pratique = 22. Source unique erronée dans `calculerBilanSignaturesEdof` : 40 + 2 = 42. Compteur et exports recevaient cet objectif.
Requête agrégée sur le dossier indiqué : 22 lignes visibles, 20 images compatibles PDF, 2 dates signées sans image compatible. Le bilan et le PDF ne représentent pas le même ensemble de preuves. Aucune image reconstruite.

## Fichiers modifiés
- `src/lib/signaturesManquantes.ts` : objectif partagé VTC journée/soir 20 + 2 ; TAXI et TA conservés.
- `src/components/crm/apprenant-sections/SignaturesRassembleesExport.tsx` : mention des images disponibles et dates sans image, plutôt que « pratique incluse » systématique.
- `src/test/signatures-manquantes-bornes.test.ts`, `src/test/signatures-pdf-compte.test.ts` : jour/soir, TAXI/TA, non-mutation et cas 22 dates / 20 images.
- `AGENTS.md`, `roadmap.md` : règle et suivi.

## Contrôles réellement exécutés
- 81 tests PASS (7 fichiers) : bornes/signatures manquantes, compte PDF, PDF signatures, ZIP Contrôle, heures par filière et sessions mixtes.
- 91 tests PASS : ordre des formations comparé à la référence datée.
- Compilation automatique : build OK le 15/10/2026 à 15:22:39 UTC.
- Chromium isolé, véritable bouton avec sources fictives : bilan 22/22, session 20/20, pratique 2/2 ; PDF 20 images sur 22 attendues avec explication ; PDF réellement téléchargé (4 pages). Aucune erreur JS de page ni écriture externe au test final. Avertissements React de refs préexistants.
- Échecs initiaux de fixture : double version QueryClient puis interception réseau incomplète ; corrigés uniquement dans le script temporaire. Test final avec échanges externes interceptés.

## Limites et conservation
Parcours authentifié complet et export réel NON PROUVÉS : aucun test sur un vrai apprenant. Les 2 images absentes restent absentes, aucun faux PDF à 22 images. Aucun changement des heures (VTC journée 60 h session / 66 h total), signatures, versions, réponses, notes, planning ou dossiers. Aucun envoi, écriture serveur ni publication.