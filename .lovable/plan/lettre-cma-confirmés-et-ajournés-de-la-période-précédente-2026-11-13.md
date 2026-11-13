# Lettre CMA : confirmés et ajournés de la période précédente

## Périmètre
Modifier uniquement la sélection et la présentation de la lettre CMA pratique TAXI/VTC. Aucun changement de résultat, inscription, réservation ou date ; aucun envoi automatique ni publication.

**Interprétation retenue :** ajournement pratique (`non`), comme Calvo Enzo. Un échec théorique n’autorise pas une présentation pratique.

## Constats vérifiés
- La lettre inclut actuellement tous les résultats pratiques « non », sans limiter à la période précédente, ainsi que des ajouts manuels et déplacés sous l’intitulé « inscrits ».
- Calvo Enzo : VTC, théorie admise le 21 juillet 2026, pratique le 3 novembre 2026, ajourné ; aucun statut de confirmation sur son lien de session examen. Le présenter **à représenter**, pas officiellement inscrit.
- Le statut métier `inscription_validee` existe. « Payé », « Dossier complet », numéro CMA ou convocation de formation ne prouvent pas une confirmation d’examen.
- Les champs de résultat actuels ne constituent pas un historique complet des reprises. Période pratique et date théorique sont distinctes ; le territoire pratique doit être prouvé, pas déduit du lieu théorique.

## Changements
1. Créer une sélection commune en lecture seule pour aperçu, impression et régénération.
2. Inclure seulement les confirmations rattachées à la **session cible exacte** et les ajournés pratiques de la **période immédiatement précédente**, même catégorie/territoire, sans reprise plus récente prouvée.
3. S’appuyer sur le lien session examen et son statut métier, ainsi que le planning CMA nominatif exact. Ne jamais utiliser le dernier statut toutes sessions confondues.
4. Dédupliquer par identité permanente du candidat et session cible ; un candidat confirmé ne figure pas aussi dans les ajournés. Aucun rapprochement automatique par nom.
5. Séparer **« Candidats confirmés pour cette session »** et **« Ajournés à représenter — inscription à confirmer »** ; supprimer la déclaration globale trompeuse « inscrits ».
6. Les ajouts manuels ne contournent pas les critères ; exclure absents non ajournés, annulés, déplacés non confirmés, autres périodes et ajournés anciens déjà repris.
7. Relire les sources à la génération. Erreur ou preuve ambiguë = qualification indisponible, jamais liste élargie par défaut.
8. Conserver configurations, lettres envoyées et historiques ; produire seulement une nouvelle copie, sans écriture de statut ni envoi automatique.

## Tests
- Calvo : novembre → prochaine période pratique publiée, une occurrence, « à représenter », jamais confirmé sans preuve.
- Confirmation exacte, doublon entre sources, absence, annulation, ajout manuel non admissible, autre catégorie/territoire, ajourné ancien, reprise et ajournements successifs.
- Période suivante inconnue et historique ambigu : signalement sans invention.
- Régénération déterministe ; aperçu/impression cohérents et anciennes lettres intactes.
- Tests automatisés et navigateur sur données fictives ; lecture réelle de Calvo sans mutation ni envoi.

## Détails techniques et limites
Module de projection indépendant testé ; lectures paginées, aucune migration prévue. Qualifier les sources du territoire pratique et des reprises avant activation : le couple « date actuelle + résultat non » ne suffit pas à prouver tout le cycle demandé. Le rapport final distinguera les cas prouvés et ceux impossibles à automatiser avec les données disponibles.