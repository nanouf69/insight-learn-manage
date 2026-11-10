# Commentaires rapides personnalisés — 10/11/2026

## Statut : NO-GO publication
Fonctionnalité disponible en aperçu et stockage serveur installé (migration 0260). Aucune publication appelée.

## Portée
- Les quatre boutons initiaux restent inchangés.
- Catalogue commun à tous les comptes ayant le rôle admin : TAXI/VTC, toutes sessions et appareils. Chaque administrateur peut modifier ou retirer un élément commun, avec confirmation.
- Ajout au commentaire courant local uniquement ; l'enregistrement explicite existant reste nécessaire pour le candidat.
- Retrait = archivage de l'élément. Les commentaires déjà enregistrés restent du texte indépendant et ne sont jamais modifiés par le catalogue.
- Version serveur et conflit explicite empêchent un autre onglet d'écraser une modification concurrente. Rejeu identique sans duplication.
- Aucune écriture dans une copie réelle, note, question, réponse ou signature pendant ces tests.

## Contrôles réellement exécutés
- PASS : 4 097 tests applicatifs ; 13 ignorés, zéro échec. Les tests ciblés comprennent création, remontage, cumul sans doublon, confirmation de renommage/retrait, annulation, refus et conservation du brouillon.
- PASS : 5 parcours HTTP/PostgreSQL jetables : lecture/écriture admin exclusivement ; second admin ; rejeu ; conflit de version ; archivage ; validation de texte vide ; interdiction d'écriture directe ; commentaire personnalisé relu par le candidat malgré renommage/retrait du catalogue, empreinte note/réponse inchangée ; parcours VTC/TAXI existants.
- PASS : dernier journal compilation « build OK » 14:26:30 UTC.
- NON PROUVÉ : interactions visuelles ordinateur/mobile sur le correcteur. Deux essais du navigateur n'ont pas atteint la grille : le compte de contrôle rétabli est redirigé vers /cours-public avec accès expiré au 30/04/2026. Aucun droit ou accès modifié pour contourner ce refus.
- NON PROUVÉ : site publié, aucune publication effectuée tant que le contrôle visuel critique reste bloqué.

## Reprise
Vérifier avec une session administrateur reconnue par l'application, sans écrire de correction réelle, puis publier et vérifier le site. Revenir au composant précédent désactive l'interface du catalogue sans supprimer ses lignes ni toucher aux commentaires des candidats.