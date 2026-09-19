# Module Qualiopi — dossier d'audit vivant

Nouvel onglet principal « Qualiopi » dans le CRM, organisé selon les 7 critères et 32 indicateurs du Référentiel National Qualité. Aucune donnée pédagogique existante n'est modifiée, migrée ou supprimée : le module se contente de référencer l'existant et de stocker ses propres preuves.

## 1. Référentiel intégré

Les 7 critères et 32 indicateurs sont intégrés en dur dans l'application (numéro, intitulé officiel, critère, niveau attendu, exemples de preuves du guide, obligations spécifiques, non-concordances éventuelles). Les exemples de preuves sont affichés comme indications, jamais comme checklist obligatoire.

## 2. Tableau de bord (haut de l'onglet)

Compteurs : indicateurs applicables, conformes, à compléter, sans preuve, non applicables, et pourcentage de couverture documentaire. Mention explicite affichée : ce pourcentage mesure uniquement la présence de preuves, il n'affirme jamais la conformité ni la certifiabilité — la décision reste humaine.

## 3. Liste des indicateurs

Regroupés par critère, chaque ligne affiche : numéro, intitulé, niveau attendu résumé, statut (Conforme / À compléter / Preuve manquante / Non applicable), nombre de preuves, date de dernière vérification, responsable. Filtres par critère, statut et recherche texte.

## 4. Fiche indicateur (3 parties)

- **A — Ce que demande Qualiopi** : niveau attendu du guide + obligations spécifiques.
- **B — Exemples de preuves** : exemples du guide, signalés comme non exhaustifs.
- **C — Nos preuves** : preuves réellement rattachées, avec ouverture/téléchargement immédiat.

Plus une zone « Commentaire / justification pour l'auditeur », le statut modifiable manuellement, le responsable et la date de dernière vérification. Le statut n'est jamais passé automatiquement à « Conforme » parce qu'un fichier existe.

## 5. Gestion des preuves

Pour chaque preuve : plusieurs fichiers (PDF, Word, Excel, images), description expliquant en quoi elle répond à l'indicateur, date de la preuve, période de validité, ajout d'un lien vers un élément du CRM. Actions : visualiser, télécharger, remplacer, archiver (jamais de suppression définitive — la preuve archivée reste consultable dans l'historique). Une même preuve peut être rattachée à plusieurs indicateurs.

## 6. Preuves déjà présentes dans le CRM (suggestions automatiques)

Un panneau « Preuves déjà disponibles dans le CRM » propose, par indicateur, les éléments existants pertinents avec rattachement en un clic (référence seule, jamais de copie ni de modification) :

- programmes de formation, devis, conventions/contrats, convocations, règlements intérieurs, livrets d'accueil ;
- questionnaires de satisfaction, positionnement et évaluations (indicateur 8 : quiz/QCM, exercices, auto-positionnement déjà enregistrés dans les cours en ligne) ;
- résultats d'examens, taux de réussite, bilans pédagogiques, attestations de formation (indicateur 11) ;
- feuilles d'émargement, progression e-learning, relevés de connexion, échanges/emails avec les apprenants ;
- formateurs (CV, contrats, qualifications), documents fournisseurs et sous-traitance, documents handicap (indicateur 17 et moyens) ;
- documents de contrôle qualité et statistiques déjà produits par le CRM.

## 7. Alertes

Signalées sur le tableau de bord et sur la fiche : aucun élément de preuve, preuves uniquement anciennes, document expiré, mise à jour annuelle requise, preuve archivée, indicateur marqué « À compléter ».

## 8. Préparation d'audit

Bouton « Préparer l'audit Qualiopi » : vue déroulante Critère → Indicateur → Exigence → Preuves disponibles (ouvrables immédiatement) → Commentaire → Statut. Export PDF et Excel de l'état des preuves.

## Détails techniques

- Tables dédiées (Lovable Cloud) : `qualiopi_indicateurs_etat` (statut, responsable, commentaire auditeur, date de vérification, applicable), `qualiopi_preuves` (titre, description, date, validité, fichiers, lien CRM, archivée), `qualiopi_preuve_liens` (rattachement N-N preuve ↔ indicateur, avec référence optionnelle à une entité CRM existante : table + id). RLS admin authentifié + GRANT explicites.
- Bucket de stockage privé `qualiopi-preuves` avec URLs signées pour la visualisation.
- Référentiel des 32 indicateurs en constante TypeScript (`src/lib/qualiopi/referentiel.ts`).
- Nouvelle entrée de menu `qualiopi` dans la barre latérale et un cas correspondant dans la page principale ; aucun écran existant n'est modifié.
- Export PDF via jsPDF (même style que les documents existants) et Excel via feuille CSV/XLSX.
