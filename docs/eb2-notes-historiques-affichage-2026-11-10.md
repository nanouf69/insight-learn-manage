# EB2 VTC — affichage des notes historiques

## Correctif autorisé et intégré
- Seul fichier applicatif changé : `src/features/correction-qrc-v2/eb2Consultation.ts`.
- SELECT ajoute maximum et note /20 ; projection du résultat original dans `session.resultats`, identité `consultation:<result_id>`.
- Lecteur commun des notes utilisé ; aucune somme des seules QRC, aucun nouveau résultat V2, aucun appel serveur d’écriture/recalcul.
- QRC non validées ou note absente : score masqué, statut provisoire, pas de faux zéro.
- TAXI et passages natifs utilisent leurs chemins existants, inchangés.

## Vérification
- 77 tests PASS, dont sept nouveaux tests : score original incluant QCM, maximum différent de 20, attente, zéro enregistré vs absence, TAXI/en cours exclus, révision relue sans mutation, chargement/rechargement SELECT-only.
- Aperçu authentifié sur données réelles, mutations bloquées : journée 49/49 notes historiques exactes, soirée 54/54 exactes ; 34 copies soir non définitives conservées sans score.
- Réouverture/rechargement identiques sur PC et téléphone ; 88 cellules soir, 49 journée et 42 TAXI présentes.
- TAXI : 42 notes affichées, aucun tiret ; comportement V2 conservé.
- Aucun appel de mutation tenté par les parcours navigateur.
- Sommes historiques réelles après contrôle : points = 1325, notes = 1325, identiques à l’audit.
- Build OK. Diff depuis la référence `71e5f3baf` : projection, test dédié, roadmap seulement.
- Scan serveur frais : six avertissements et deux informations, aucun critique dans ce scan ; pas de correction de sécurité hors périmètre.

## Publication
Publication ciblée demandée via le service de publication.
Contrôle unique sur gestion.ftransport.fr à 07:21 UTC : HTTP 200, bundle `index-Cv4rxQEI.js`, **ancienne version**, ne contenant pas la projection.
Le basculement effectif n’est donc pas confirmé ; aucun nouveau déploiement concurrent ni boucle de contrôle lancé.
La demande de publication inclut le correctif et ses tests ; le présent rapport est postérieur à cette demande.

## Limites
Aucune nouvelle correction réelle créée pour tester un événement ; notes existantes seulement.
Compte élève autonome et navigateur physique non rejoués ; contrôles PC/téléphone émulé dans le correcteur admin.