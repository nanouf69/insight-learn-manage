# Publication atomique des résultats d’Examens Blancs

## Objectif
Tant qu’au moins une QRC d’un passage reste à valider manuellement, ne publier aucun score, note, statut, bilan, classement ni recommandation calculée. La dernière validation publie immédiatement l’ensemble des résultats définitifs déjà enregistrés.

## Mise en œuvre
- Centraliser une règle de lecture seule déterminant, pour un examen et une tentative précis, si toutes les QRC sont validées.
- Appliquer cette règle à tous les affichages concernés : résultat détaillé, carte d’examen, notes de l’apprenant, fiche CRM, bilans automatiques, statistiques et résumés.
- Pendant l’attente, remplacer les zones chiffrées par le seul message demandé et masquer les détails permettant de déduire un résultat provisoire.
- Conserver l’actualisation immédiate existante après la dernière correction QRC, y compris après actualisation ou reconnexion.
- Empêcher aussi la génération ou l’affichage d’un bilan automatique provisoire pendant l’attente.

## Garanties
- Modification d’affichage uniquement.
- Aucune réponse, note, correction QRC, tentative, progression, snapshot, historique ou donnée pédagogique existante ne sera modifiée ou recalculée.
- Même règle pour VTC, TAXI, TA, VA et toutes les tentatives.

## Vérifications
- 0 QRC corrigée : aucun résultat chiffré.
- Correction partielle : aucun résultat chiffré.
- Dernière QRC corrigée : bilan complet publié immédiatement.
- Actualisation, déconnexion/reconnexion : état identique.
- Vérifier les vues apprenant, détail, carte, notes, CRM et résumés/statistiques.
- Confirmer explicitement 0 écriture sur les données apprenants existantes.
