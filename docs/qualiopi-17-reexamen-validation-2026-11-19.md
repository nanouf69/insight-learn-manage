# Indicateur 17 — réexamen de validation du 19/11/2026

## Décision réellement enregistrée
- Une ligne créée dans `qualiopi_indicateurs_etat` pour 17 : `statut=a_completer`, `applicable=true`, `date_verification=2026-11-19`.
- « À vérifier » n'est pas un état pris en charge par l'interface ; « À compléter » est l'état disponible retenu, sans ajouter de statut invisible.
- Les 20 références existantes ont été réexaminées ensemble, sans modification : 16 originaux Agrément, agenda, intervention datée, plateforme, synthèse.
- La demande de validation est explicitement autorisée mais deux vérifications factuelles empêchent encore une conclusion globale. Aucun défaut réel de moyen n'est constaté : absence de conclusion n'est pas constat de non-conformité.

## Exigence et méthode
Décret 2026-728, critère 4, indicateur 17 : « Le prestataire met à disposition ou s'assure de la mise à disposition des moyens humains et techniques adaptés et d'un environnement approprié (conditions, locaux, équipements, plateaux techniques …). »

Source : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054608509 ; reproduction PDF effectivement relue : https://www.psppaca.fr/IMG/pdf/decret_no_2026-728_du_1er_aout_2026_relatif_au_referentiel_national_sur_la_qualite_des_actions_concourant_au_developpement_des_competences_-_legifrance.pdf ; SHA256 `f417b50db115262e371839f7c8b5947077a19c2ae6f7bf0b566a1b6dddb2a783` identique au précédent audit.

Guide V10 novembre 2026 : copie secondaire effectivement téléchargée et lue, page 24 inspectée par OCR, préambule p.2/3 lu. https://www.copilof.fr/guide-rnq-v10-qualiopi/docs/guide-lecture-qualiopi-v10-novembre-2026.pdf ; SHA256 `835ca0ff8310dc5ebf47bdcec955d24187af3662ae71a0feee6bbae0558becf5`. Authenticité de cette copie non certifiée auprès du ministère, limite inscrite en base. Niveau attendu : démontrer l'adéquation des locaux, équipements et moyens humains aux objectifs. Exemples non exhaustifs ; appréciation proportionnée ; observation possible. La décision interne ne remplace pas celle du certificateur.

## Réévaluation des six réserves
| Réserve précédente | Appréciation proportionnée |
|---|---|
| Bail, renouvellement et dates de l'avenant | Bail signé + avenant signé 2026 + assurance actuelle étayent les locaux. Terme initial seul ne prouve pas cessation. Certificat de signature/renouvellement particulier non obligatoire pour 17. Divergence d'effet documentaire conservée, pas blocage autonome. |
| Surface 64,40/66 m², capacité 18 | Écart de surface non bloquant en soi. Adéquation de la salle à l'effectif réellement accueilli à corroborer, sans présumer surcapacité. |
| Accessibilité/sécurité, pièces indépendantes absentes | Audit ERP indépendant/registre/maintenance non imposés comme liste de pièces par 17. L'environnement approprié doit néanmoins être corroboré, regroupé avec la vérification des conditions d'accueil. |
| Matériel, absence de factures/photos | Descriptif et plateforme recevables. Factures/photos/inventaire signé non obligatoires. Disponibilité de la salle équipée à corroborer avec les conditions d'accueil. |
| Formateurs, contrats/Master 2 | CV, diplômes pertinents, planning et trace d'intervention sont des preuves recevables. Aucun Master 2, contrat signé ou émargement de chaque intervention imposé par 17 ; compétences/coordination aussi abordées par 18/21. Pas blocage autonome. |
| Véhicule et contrat non signé | Carte grise, assurance, facture double commande et liste étayent l'existence d'un véhicule équipé. Reste la mise à disposition au bon organisme, pièces OPTO/assurance SERVICES PRO, pas le loyer ni la possession d'un contrat particulier. |

## Seuls points empêchant la validation
1. Corroborer les conditions actuelles d'accueil et la salle équipée au regard d'un effectif réellement accueilli, avec environnement/accessibilité appropriés. Observation ou trace existante pertinente recevable, sans exiger une facture ou un audit ERP particulier.
2. Établir la mise à disposition effective du véhicule équipé pour les séances pratiques de l'organisme audité. Convention exécutée, planning/preuve d'usage ou autre élément existant pertinent recevable ; propriété/contrat de location spécifique non imposés.

## Contrôles exécutés
- PASS : insertion conditionnée à l'absence d'état 17, 20 références actives et empreinte inchangée ; 1 ligne retournée.
- PASS : relecture SQL de l'état, de la date, du caractère applicable et des deux points.
- PASS : 20 références avant/après, empreinte identique `b6f95e8e8ca11268960e94c5cd682e11` (preuves + liens).
- PASS : empreintes des pièces Agrément (43), blocs (4), formateurs (3), agenda (336), émargements formateurs (3) strictement identiques à l'audit antérieur et avant/après cette écriture.
- PASS : interface admin connectée `/?section=qualiopi`, ligne 17 « À compléter », 20 preuves, vérifié le 2026-11-19 ; fiche ouverte, onglet « C — Nos preuves (20) » et remarques relus. Premier script arrêté par une méthode Playwright inexistante, corrigé et réexécuté avec succès.
- Captures privées temporaires : `/tmp/browser/qualiopi17-validation/row.png`, `dialog.png`.
- Aucun code applicatif, preuve, source élève, bail, note ou résultat modifié. Aucun envoi ni publication.