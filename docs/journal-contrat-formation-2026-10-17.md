# Contrat de formation individuel — 17 octobre 2026

## Périmètre livré
- Onglet adjacent à Devis dans la fiche apprenant et dans le panneau Devis ; bouton dans Documents de Formation.
- Formulaire vertical prérempli avec identité/contact/montant disponibles ; choix explicite du financement, parcours vendu et session appartenant à cet apprenant.
- Programme proposé uniquement depuis les modules attribués compatibles avec le parcours ; aucune durée, diplôme, agrément, médiateur ou exonération inventés. Sessions/formateurs lus avec pagination et refus sur erreur.
- Modèle individuel, annexe 1 modules/activités/modalité/durée/évaluation/valeur, planning/formateurs et formulaire de rétractation. Notice confidentialité/règlement/pièces à renseigner.
- Aperçu et PDF utilisent les mêmes sections et validations ; brouillon, régularisation et complet non signé distincts. Aucun horodatage de conclusion/signature fabriqué.
- Jour réel Europe/Paris ; début après 14 jours entiers ; prolongation de l’échéance distance/hors établissement pour week-end/jour férié national. Report proposé seulement, aucune session modifiée. Toute modification manuelle du début/fin détache la session choisie pour éviter une fausse association.
- Financement personnel seulement pour un complet ; champs manquants/non vérifiés bloquants. TVA/HT/total, heures sans double compte, valorisation et quatre versements contrôlés ; premier ≤30 %, aucun paiement pendant délai, solde à l’achèvement.
- Rôle administrateur vérifié par RPC serveur à l’entrée et au téléchargement ; aucun accès contrat non-admin dans les essais fictifs.

## Fichiers
- `src/components/crm/ApprenantDetailPage.tsx`
- `src/components/crm/apprenant-sections/DevisSection.tsx`
- `src/components/crm/apprenant-sections/DocumentsFormation.tsx`
- `src/components/crm/apprenant-sections/ContratFormationSection.tsx`
- `src/lib/contratFormation/model.ts`, `text.ts`, `pdf.ts`, `prefill.ts`
- `src/test/contrat-formation.test.ts`
- `package.json` et fichier verrouillage : bibliothèque calendrier `date-holidays`.
- `AGENTS.md`, `roadmap.md`, présent journal.

## Preuves exécutées
- Vitest : 30 tests contrat + 5 date/signature devis + 5 dates pratiques = **40 PASS**.
- Compilation automatique : **build OK 09:11:04 UTC** (contrôle ultérieur requis après dernier ajustement brouillon).
- Playwright : vrai panneau Devis monté avec un apprenant fictif, toutes les requêtes distantes interceptées ; aucun compte authentifié réel, appel de rôle et session simulés.
- Choix CPF interdit au complet ; choix personnel/pratique TAXI ; dates de la session fictive 02–10/11 ; valeurs fictives complétées ; PDF complet téléchargé, puis date passée 16/10 : complet désactivé et brouillon de régularisation téléchargé.
- Largeurs 1280 et 390 : aucun débordement horizontal ; non-admin simulé : aucun bouton téléchargement ; **0 erreur JavaScript**.
- PDF complet et régularisation : **6 pages chacun**, toutes rendues puis inspectées. Tableau annexe et formulaire présents, aucune coupure ni chevauchement visible. Pages références et formulaire séparées. Saut de paragraphe entre pages normal ; pas de page blanche.
- Anomalies de revue corrigées : date libre détache la session, marqueurs « à vérifier » empêchent le complet, TVA vérifiée, mode de conclusion explicite requis, prolongation du délai ajoutée. Saisie temporaire explicitement signalée.

## Limites et protection
- **Pas d’enregistrement durable du formulaire** : état temporaire jusqu’à fermeture/rechargement, signalé à l’écran ; téléchargement à conserver. Aucun nouveau document archivé dans le dossier automatiquement.
- **Pas de service de signature/conclusion** : aucune signature en ligne proposée ; aucun verrou serveur nouveau sur l’ouverture pédagogique. Les contrôles ici concernent la préparation/export et non une conclusion effective. Le PDF complet est toujours non signé ; à recontrôler à la conclusion réelle. Ce chantier ne prétend pas livrer une signature serveur.
- Références organisme contradictoires entre les générateurs historiques ; champs laissés à confirmer. Programme, durées, effectifs, pièces et diplômes demandent validation de l’admin ; aucune source fiable inventée.
- Les références légales reproduisent le modèle fourni ; validation juridique indépendante **NON PROUVÉE**. Calendrier national, pas d’exceptions locales/territoriales inférées.
- Vue complète CRM authentifiée réelle, contrats existants, parcours de signature réelle et contrôle d’ouverture pédagogique **NON PROUVÉS**. Tests seulement fictifs, pas de modification de données réelles.
- Aucune migration, écriture de table, modification pédagogique/progression/signature, envoi email/SMS/IA ou publication. Ismail et autres dossiers réels jamais utilisés dans les essais.