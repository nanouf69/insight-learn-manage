# Audit lecture seule — Devis DOCX « Formation continue TAXI » vs page publique FC TAXI

Aucune modification effectuée. Ce document est le rapport ; l'approuver ne déclenche aucun changement sans nouvelle demande.

## Sources examinées
- Modèle CRM : `public/devis/Devis_formation_continue_TAXI.docx` (texte extrait intégralement).
- Sélection du modèle et prix : `src/components/crm/apprenant-sections/DevisSection.tsx` (l.393 modèle `fc_taxi` prix 200 ; catalogue « Formation continue obligatoire TAXI - 200 € » ; détection l.805-807).
- Page publique : https://ftransport.fr/reservation-formation-continue-taxi (lue le 20/11 15:19 UTC, CGV « CGV-FC-TAXI-2026-10-22-v6 »).
- Base (lecture) : aucun devis enregistré dans `devis_envois` pour AKSU → l'exemple du 18/11 (Vénissieux) n'est pas retrouvé en base ; comparaison faite sur le modèle.

## Tableau
| Point | Devis DOCX CRM | Page publique | Verdict |
|---|---|---|---|
| Raison sociale / siège | FTRANSPORT, 86 route de Genas 69003 Lyon | Identique | Identique |
| SIRET / NDA | 823 461 561 000 18 / 84 69 15114 69 | Identiques | Identique |
| Agrément préfecture n°69-18-001, Qualiopi | Présents | Absents | Différent |
| Mention « Services pro » | Clause données : « Services pro » | Uniquement « FTRANSPORT » | Différent |
| TVA | « non assujetti, prix nets » | « Régime de TVA à confirmer » | Différent |
| Prix | 200 € (catalogue CRM) | 299 € (acompte 50 € + solde 249 €) | **Différent** |
| Durée / lieu | 14 h, « LYON (69) » | 14 h, 86 route de Genas, 9h–12h / 13h–17h | Partiel (horaires absents du devis) |
| Dates | Champ libre `{devis_ligne_produit_date1}` | 19 et 20/11/2026 | Non vérifiable (dépend de la saisie) |
| Effectif 16 max, prérequis, programme | Absents | Présents (art. 4-5) | Différent |
| Moyens de paiement | Chèque possible, règlement sur place | Virement ou espèces uniquement | **Différent** |
| Échéancier | « prélevé après rétractation, peut être échelonné » | Acompte 50 € après délai, 2 × 124,50 € pendant la formation | **Différent** |
| Pénalités 1,5 × taux légal, recouvrement contentieux | Présentes | Absentes | Différent |
| Choix signature à distance 14 j / au centre 10 j | Aucun choix ; 14 jours seulement | Deux options explicites | **Différent** |
| Texte variante « au centre 10 jours » | — | Non affiché sans sélection (seule la variante 14 j est lisible) | Non vérifiable |
| Renonciation à la rétractation | Case « je renonce… art. L221-25 » + clause dans Annulation | « Aucune case de renonciation n'est proposée » | **Différent (contradiction)** |
| Forme de la rétractation | Lettre recommandée AR | Toute déclaration non ambiguë, e-mail ou lettre | **Différent** |
| Aucune somme avant fin du délai (L6353-6) | Implicite | Explicite, y compris l'acompte | Différent |
| Frais d'annulation 100 % après 14 j | Présents | Art. 7 « en cours de validation » | Différent |
| Absence : remboursement à partir du 8e jour | Présent | Absent | Différent |
| Dédit 7 jours / report ou remplacement | Report ou remboursement si FTRANSPORT ne peut assurer | Report ou remplacement par un autre participant | Partiellement identique |
| Force majeure / prorata L6353-7 | Absent | Présent (art. 11) | Différent |
| Propriété intellectuelle | Non retrouvée dans l'extrait | Présente (art. 12) | Non vérifiable |
| Règlement intérieur | Non retrouvé | Art. 10 | Non vérifiable |
| Données personnelles (5 ans) | Présente | « en cours de validation » | Différent |
| Juridiction : tribunaux de Lyon | Présente | « en cours de validation » | Différent |
| Questionnaire | Questions casier/points **répondables**, « B2 vierge » | Questions 1-5 non répondables, « B3 vierge » | **Différent** |
| Pièces justificatives | Domicile, identité, hébergement | Non listées | Différent |
| Signature | Manuscrite « Lu et approuvé » | Signature en ligne sous le devis | Différent |

## Conclusion
Le modèle DOCX CRM n'est pas aligné avec la page publique (CGV v6). Écarts contractuels majeurs : prix 200 € vs 299 €, moyens/échéancier de paiement, absence du choix 14 j / 10 j, case de renonciation à la rétractation contraire à la page publique, rétractation par recommandé uniquement, questions sur les condamnations répondables.

## Suite possible (non engagée, sur votre accord uniquement)
Créer une nouvelle version du modèle FC TAXI reprenant le texte des CGV v6 publiques (prix 299 €, choix 14 j / 10 j, sans case de renonciation, questions 1-5 non répondables), sans toucher aux devis déjà envoyés ou signés.
