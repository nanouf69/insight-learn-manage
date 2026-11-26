# Feuilles de pratique — matin seul, 26 novembre 2026

## Règle
Un après-midi explicitement vide dans le planning ne devient pas une obligation ou un horaire imprimé par défaut. Une preuve déjà enregistrée reste conservée. Aucun original signé, document envoyé, date, inscription, réglage ou droit n'est modifié par les vérifications.

## Constat réel en lecture seule
Le planning du 17 novembre, pour le 2 décembre, contient bien `matin: 9h-12h`, `apresmidi: ''`, `horaireMode: custom`, `type: taxi`. Une autre configuration de janvier contient seulement `type: vtc` pour la même date. La facture précédente n'est pas concernée.

## Lecteurs effectivement lus
| Endroit | État après correction |
|---|---|
| ExamenReussitePage, résumé planning | Pas de badge après-midi lorsque le champ est vide. Le choix personnalisé ne réinjecte plus de valeur à la place d'une chaîne vide. |
| ExamenReussitePage, téléchargement et message des horaires | Résolution commune, matin seul. |
| PlanningCalendar, lectures des configurations | Dernière configuration par date, paginée et ordonnée, sans fusion de l'après-midi d'une autre configuration. |
| PlanningCalendar, horaires candidat et export pratique | Consomme les créneaux retenus ; matin seul. |
| emargement-pratique PDF | Pas de colonne après-midi pour une feuille sans heure ni preuve après-midi ; preuve ancienne conservée avec horaire « — ». |
| ControleQualiteTab, ZIP pratique | Prend les parties réellement calculées, plus de 9h/13h injectés localement. |
| EmargementsSignesViewer, écran/impression/téléchargement individuel | Une case sans obligation ni preuve n'imprime plus de durée/heure. Les signatures et versions restent affichées. |
| SessionDetail, feuille session collective pratique | Utilise le générateur pratique et le planning du jour ; théorie inchangée. |
| SessionDetail, exports individuels/lot | Lit aussi le planning pour les jours sans réservation ; marque explicitement les parties retenues. |
| EmargementIndividuelGenerator | Une partie pratique absente n'imprime plus le créneau standard dans l'en-tête ni le pied de feuille. |
| pratiqueSlots / pratiqueDocumentHours / syncPratiqueSessions | Le cas demandé avec matin non vide et après-midi vide conserve seulement le matin ; non modifiés. Les archives figées ne sont pas recalculées. |
| CoursPublic / EmargementFCModal / emargementFenetres | Droits et horaires issus des fenêtres serveur ; ne pas substituer une autorisation du navigateur. |
| save-emargement-apprenant | Contrôle serveur commun, erreur bloquante, signatures déjà remplies non remplacées. |
| confirm-reservation-pratique, email | Le cas exact imprime seulement le matin. L'ancien envoi de réservation n'est pas déclenché ni réécrit. |
| planning_pratique_horaires_stricts, définition Cloud lue | Laisse l'après-midi vide intact. |
| pratique_creneaux_planifies, définition Cloud lue | Avec le matin saisi, ne retourne aucune partie après-midi vide. |
| emargement_creneaux_reels / contrôle / fenêtres, définitions Cloud lues | Chemin avec réservation conforme au cas demandé ; chemin inscription sans réservation à risque ci-dessous. |
| relance-emargements-manquants | Ancien circuit théorie, non déclenché ; compte deux demi-journées théoriques, pas utilisé pour le PDF de pratique demandé. |
| auto-send-pratique-booking | Ancien circuit automatique désactivé selon règle du projet ; texte ancien conservé, aucune réactivation/envoi. |

## Limites distinctes — non activées
Le SQL `emargement_creneaux_reels` peut encore proposer un après-midi sur une inscription pratique sans réservation en reprenant les heures de la session. Corriger cette autorisation nécessite une migration ciblée, tests de contrats SQL et accord distinct conformément à la règle permanente ; aucune migration ni droit modifié ici. L'appel direct de `pratique_creneaux_planifies` a été refusé par les droits disponibles : lecture de sa définition prouvée, exécution réelle non prouvée.

Un jour personnalisé entièrement vide (matin ET après-midi) a également un repli ancien dans SQL/pratiqueSlots/confirm-reservation-pratique ; ce n'est pas le cas reçu. Les métadonnées de création de session dans confirm-reservation-pratique restent 09:00–16:00 ; aucune session ni fonction d'envoi n'a été changée ou déployée.

## Vérifications
- 48 tests Vitest ciblés exécutés (PDF, absence conservée, feuilles individuelles, exports de contrôle, planning/attente).
- Playwright PC 1158×846 et téléphone 390×844 : carte du 2 décembre avec matin seul, téléchargement réel du PDF fictif, PDF rendu et inspecté. Toutes les requêtes Cloud étaient interceptées ; trois tentatives d'écriture automatique de l'écran interceptées par scénario, zéro écriture réelle.
- PDF : 09h00–12h00, aucune colonne après-midi vide, aucune heure 13h00–16h00 inventée. Signatures élève non fabriquées.
- Aperçu compilé sans erreur. Parcours connecté réel d'un élève et contrôle SQL exécuté non prouvés. Rien publié ni envoyé.