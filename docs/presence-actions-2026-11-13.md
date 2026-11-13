# Présences manuelles et heures non signées — 13/11/2026

## Diagnostic confirmé en lecture seule
- Tarek CHERNI, VTC soir : 17 preuves d'image valides ; trois créneaux sans preuve, 17/09 18h30–21h (150 min), 18/09 17h–18h30 (90 min), 18/09 18h30–21h (150 min) : **390 minutes / 6h30**.
- Deux déclarations théorie : 90 min et 240 min, total brut **330 min / 5h30**. Aucun champ séance/créneau/session dans la table ; aucune révocation existante.
- `DocumentsCompletes` additionnait 33h30 signées + 5h30 administratives et appelait **39h « basé sur les signatures »**. Le nouveau bloc distingue les preuves signées et l'ajout administratif net dédoublonné : **33h30 + 4h = 37h30**. Le 17/09 est en revue pour chevauchement avec soir_1 signé.
- Les **6h30 non signées ne sont jamais réduites par 5h30 date-only**. Le second compteur indique les créneaux à justifier faute de preuve liée précisément à chacun ; il ne prétend ni à une absence ni à une présence fictive.
- Total des inscriptions connues : **40h théorie, 0h pratique inscrite**. Heures individuelles et heures session configurées NULL, aucun contrat enregistré retrouvé : 40h est le défaut soir, pas une durée contractuelle certifiée. Aucune nouvelle modification du dénominateur dans ce chantier.

## Aperçu livré
- Mise à jour 15:19 UTC : **Supprimer** ouvre « Êtes-vous sûr de vouloir supprimer ces heures de présence ? », boutons **Annuler** et **Oui, supprimer**, sans motif demandé. L'identité de la ligne reste visible ; le contrôleur attribue automatiquement un libellé technique d'audit, conserve operationId/CAS et exige un retour exact avant actualisation. Le motif de restauration reste distinct et inchangé.
- **Transport réel volontairement débranché** : journal sécurisé non installé/vérifié. La confirmation réelle reste désactivée ; aucune annulation ni recalcul fictif des données réelles. Le transport simulé prouve uniquement la confirmation ciblée et la projection des compteurs.
- SQL de revue séparé : journal append-only, RLS admin SELECT, RPC admin scoped dossier/validation, CAS version, horloge serveur, idempotence operation_id, update/delete refusés ; dossiers EDOF/relevés protégés refusés. Rien installé.
- Compteurs et détail présents dans Documents et Signatures manquantes, erreurs/durées inconnues explicites. Bloc Documents utilise la même projection minutes que le taux CRM. Événement local après confirmation invalide les seuls calculs du dossier.

## Vérifications réellement exécutées
- **69 tests Vitest PASS, 9 fichiers** : compteurs 390 min, futures/absences, doublons, conflits, annulation/restauration, journal étranger, refus admin et retour étranger, double clic, régressions ajouts/signatures/taux.
- **1 contrat PostgreSQL jetable PASS**, couvrant 14 assertions : permissions, dossier étranger, motif, idempotence, CAS, journal immuable, RLS élève, restauration, refus dossier protégé et conservation des originaux. Schéma minimal fictif, pas restauration d'une sauvegarde réelle ni totalité des triggers réels.
- PC/mobile : compteur et dialogues inspectés après animation ; annulation/restauration fictives réussies, sans débordement. **Lecture authentifiée des vrais composants et du dossier réel** : 2 boutons Supprimer, validations 1,5h/4h, compteur 6h30 et trois durées confirmés. Aucun clic d'enregistrement réel. Montage isolé des composants, pas parcours complet de navigation CRM ni compte élève.
- Compilation observée **build OK 14:30:42 UTC**. Avertissements de tests React act préexistants dans saisie-races, aucun test en échec.
- Empreinte validations inchangée `09a38657f55fa99702ee04e73d3a5dad`. Journal réel absent confirmé par SELECT.

## Statut / NO-GO
**Pas publié, aucune écriture réelle.** Pour activer annulation/restauration : installer et valider le journal séparé, adapter tous les lecteurs live (y compris jalons sans altérer EDOF/relevés gelés), vérifier les permissions propriétaires et la restauration, puis autorisation de diffusion isolée. Les lignes sans liaison exacte restent en revue ; aucun rattachement de créneau inventé. Parité élève/événements distants non prouvée, table d'origine admin-only. Les preuves originales et les notes sont intactes.