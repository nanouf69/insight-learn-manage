# ZIP Contrôle — signatures session + pratique — 15/10/2026

## Accord et périmètre
Plan approuvé : ajouter le PDF existant au ZIP des formations présentielles sans remplacer les autres documents. Fichiers : ControleQualiteTab.tsx, controleZipSignatures.ts, test ciblé, AGENTS.md et roadmap.md.

## Changement
Le bouton Tout télécharger appelle le même loader planning-scoped et le même générateur que Signatures session + pratique. Sous-dossier : signatures-session-pratique. Aucun filtrage par ancienneté de formation. E-learning pur inchangé. Zéro signature réellement lu : mention explicite TXT, aucun faux PDF. Erreur de lecture : export interrompu.

## Vérifications exécutées
- 131 tests PASS : 23 ZIP, 12 PDF signatures, 5 compte signatures et 91 ordre des formations.
- Compilation automatique : build OK à 15:08:20 UTC.
- Clic du véritable bouton ControleQualiteTab dans une page isolée, données intégralement fictives, tous les échanges externes interceptés. ZIP téléchargé et inspecté : PDF consolidé, pièces hebdomadaires/pratiques et autres documents présents.
- PDF consolidé extrait et rendu : 3 signatures lisibles, 2 versions de session conservées et 1 signature pratique ; références originales distinctes, dates de présence séparées des instants de signature, aucun chevauchement/coupure constaté sur l’unique page.
- Défauts de fixture corrigés pendant QA : PNG initial illisible remplacé par une image fictive valide ; type de session fictif « theorie » remplacé par la valeur « theorique » reconnue du circuit existant. Aucun changement du générateur ou du loader pour ces défauts de test.
- Aucune erreur JavaScript de page au téléchargement ; aucune écriture externe. Aucune donnée réelle, heure, réponse, note ou signature modifiée, aucun envoi ni publication.

## Limites
Parcours authentifié complet et dossier réel NON PROUVÉS : interdiction de tester sur un vrai apprenant respectée. Vérification de bout en bout limitée au vrai bouton avec sources simulées. Des avertissements React de refs préexistants sont présents dans la page isolée ; aucun plantage. Les autres tâches du roadmap restent hors périmètre de cet accord.