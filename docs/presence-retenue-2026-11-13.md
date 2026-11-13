# Présence retenue — contrôle du 13/11/2026

## Résultat réel CHERNI
- Signatures retenues : 33 h 30, 17/20 créneaux.
- Trois reçus de validation actifs avec PDF privé : 17/09 18:30–21:00 (2 h 30), 18/09 17:00–18:30 (1 h 30), 18/09 18:30–21:00 (2 h 30).
- Auteur relu : Naoufel. Total manuel 6 h 30, ajout net 6 h 30.
- Théorie retenue : 40/40 h = 100 %. Pratique : 0/6 h.
- TOTAL : 40/46 h = 87,0 %. La capture 37 h est antérieure à ces preuves et ne doit pas être imposée au calcul.
- Les deux anciennes validations annulées restent conservées et exclues du calcul.
- Les trois signatures restent manquantes : une validation PDF n'est pas une image de signature. La revue de couverture administrative ne présente plus de conflit de créneaux ; les anomalies de signature demeurent indépendantes.

## Changements
Projection en lecture seule des reçus immuables par union des intervalles, intersectée avec les créneaux prévus. Détail des dates, horaires, auteur, preuve privée et statut dans Formulaires. Signatures, heures manuelles brutes et ajout net affichés séparément. Plafond VTC par théorie/pratique, sans imposer les durées VTC aux autres parcours. Actualisation locale après événement confirmé, Realtime et relecture sur retour de fenêtre. Les anciens justificatifs sans créneau exact gardent leur projection historique conservatrice : ils ne sont pas requalifiés automatiquement en nouveaux reçus.

## Vérification exécutée
- 56 tests Vitest, 5 fichiers : union, doublons, absence de preuve, annulation relue, plafond, cas 40+6/60+6, non-régression TAXI/TA/VA, hooks de progression.
- Lecture authentifiée administrateur CHERNI, vrai onglet Formulaires, détail des trois reçus ; desktop et mobile 390 px.
- Rechargement du chargeur partagé : total 40/46 conservé, aucune erreur navigateur.
- Les vrais composants admin/élève rendent le même calcul avec cette session administrateur ; cela ne constitue pas un test sous identité propriétaire élève.
- Compilation de l'aperçu : OK.

## Limites / non effectué
Aucune écriture, annulation, correction de doublon, signature, note, migration ou publication effectuée. La persistance vérifiée est celle des trois reçus déjà enregistrés, pas une nouvelle validation sur un dossier réel. Les mutations restent testées par fixtures et tests existants ; pas de nouveau cycle hébergé de validation/annulation autorisé sur un compte de test isolé.

La parité sous identité élève reste bloquée : les politiques de lecture des validations, du journal et des liens de créneaux autorisent seulement les administrateurs. Aucun droit n'a été élargi et aucun PDF privé rendu public. Une projection serveur propriétaire limitée aux heures et aux statuts, sans chemin PDF ni données d'autres élèves, doit être préparée/testée avant activation côté élève. Les changements présents sont donc non publiés et ne permettent pas de revendiquer une parité hébergée élève complète.