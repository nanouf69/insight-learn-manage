# Formulaires Qualiopi 7/8 — livraison partielle en aperçu

## Effectivement modifié
- CRM : chaque analyse du besoin, projet professionnel, test de compétences et évaluation des acquis présente la formation enregistrée dans le document, inscription/session, remplissage, validation, décision et date de décision.
- Aucun fallback à la formation actuelle du dossier, à created_at ou à completed_at pour une validation. Historique inconnu : À rattacher / Non renseignée / À valider humainement.
- Choix manuel d'une inscription réelle parmi celles du dossier. Plusieurs sessions : aucune présélection. Aperçu distinct par document, sans mélange de réponses.
- Décision positive explicitement renseignée : Admis. Refusé, En attente et Non évalué ne deviennent jamais Admis.
- Nouveaux PDF individuels : même projection, retrait de l'admission automatique et de la date de création comme validation ; signatures propres au document uniquement. Les anciens PDF et données sont inchangés.
- Modification volontaire en aperçu exige référence de preuve et confirmation humaine. PDF utilisant cette modification porte APERÇU LOCAL — NON ENREGISTRÉ.

## Non installé / limites
- Le bouton applique un aperçu local seulement : rien n'est enregistré après rechargement.
- Schéma serveur append-only + RPC admin, CAS, idempotence et contrôle propriétaire préparés dans formulaires-pedagogiques-schema-apercu.sql, non installés dans la base partagée. Aucun historique déplacé ni date rétroactive ajoutée.
- Le transport de lecture est préparé mais pas branché ; la sauvegarde durable, relecture et création de nouveaux questionnaires distincts par inscription restent à raccorder avant activation.
- Les questionnaires publics et apprenants conservent leur circuit existant. Ce lot corrige le CRM et le PDF individuel, pas tous les exports regroupés.
- La formation peut être précisée manuellement en aperçu avec justificatif ; la vérification serveur de son adéquation exacte au parcours reste à compléter. Une étiquette historique ne constitue pas un rattachement certifié.
- Pas de matrice de correspondance certification/contenus créée, donc aucune conformité Qualiopi 7/8 déclarée.

## Contrôles exécutés
- 28 Vitest PASS (17 règles nouvelles, 1 interaction React, 10 non-régressions indicateur 6).
- 9 PostgreSQL jetable PASS : originaux inchangés, idempotence, absence de décision automatique, version périmée, refus apprenant, conflit de replay, immutabilité, droits publics minimaux et isolation de lecture.
- Playwright synthétique PC 1280×1800 et mobile 390×844 PASS ; PDF téléchargé et lu avec pdftotext : TAXI même si fiche synthétique VTC, Admis explicite, validation absente Non renseignée, session À rattacher.
- Aucun dossier réel écrit, aucune session test créée, aucune migration appliquée et aucune publication.
- Parcours complet dans CRM administrateur connecté et persistance après rechargement : NON PROUVÉ. Test navigateur limité au formulaire monté avec des données synthétiques.