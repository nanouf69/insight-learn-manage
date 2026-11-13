# Lettre CMA — sélection préparée, non publiée

## Changements
- Projection pure par catégorie, période pratique cible exacte et période précédente publiée, identité permanente du dossier.
- Confirmation issue d'un planning nominatif exact ou statut `inscription_validee` d'un lien session examen exact ; paiements, réussite théorique seule et ajouts manuels ne suffisent plus.
- Ajourné = résultat pratique `non` avec date dans la période précédente ; reprise nominative plus récente exclut l'ancien ajournement. Jamais de fusion par nom ni changement de date/résultat.
- Distinction dans le contenu généré « confirmé » / « à représenter — inscription à confirmer ». Lecture paginée spécifique, relecture avant impression/envoi manuel, changement ou erreur = refus.
- Les anciennes lettres envoyées et configurations sont conservées. Aucun envoi, migration, publication ni modification de statut exécuté.

## Blocage réel : territoire pratique
Les 39 lignes de planning CMA actuellement enregistrées n'ont pas de colonne territoire pratique. Les dates/lieux théoriques ne prouvent pas ce territoire. Le lecteur ne fabrique donc aucun territoire : les candidats avec confirmation ou ajournement admissible sont placés « à vérifier » et la génération est suspendue.

Calvo Enzo : planning CMA nominatif du 03/11/2026 retrouvé, VTC ; résultat pratique `non`, date identique. La prochaine période précise publiée est 16–23 décembre 2026. Il est **à vérifier**, pas déclaré inscrit ni ajouté artificiellement à une confirmation. Le test fictif avec territoire explicitement prouvé 69 l'inclut une seule fois comme demande de représentation.

Cette préparation n'est donc pas une activation fonctionnelle complète de l'automatisation demandée. Il faut une source territoriale vérifiée et durable, et un historique de reprises qualifié, pour l'activer sans déclarations fausses. Aucune migration engagée ; aucun élargissement de droits.

## Tests
- 41 tests PASS /4 fichiers : 15 règles sélection CMA +17 dossier bienvenue +5 sélecteur session +4 notes pratiques.
- Chromium exécute le module réel : données Calvo lues en base reprises pour vérifier le classement « à vérifier » ; fixture territoire connu = une seule représentation. Zéro écriture.
- Aucun clic réel d'envoi/impression ni contrôle de toute la page authentifiée effectué ; intégration visuelle complète et générations effectives NON PROUVÉES.
- Les ajournements successifs sont pris en compte seulement si la date/résultat actuels et les traces nominatives concordent. Pas d'historique complet des résultats par passage ; impossibilité de certifier tous les cycles anciens sans preuve supplémentaire.
- Dernier build observé OK. Publication NON.