# Présence par créneau — statut 13/11, demande 15:23 UTC

## Production : bouton NON actif, aucune publication
Cause exacte : `ValidationPresenceCreneauDialog` rend un bouton `disabled` sans fonction de soumission. Aucun dépôt PDF ni journal exact n’a été installé. Ce n’est pas un champ mal rempli par l’utilisateur. Le message du formulaire distingue désormais clairement sélection locale et validation impossible.

## Lecture seule vérifiée
- Tarek CHERNI : inscription `dc4690e5-803e-4fbd-8829-4ba1e6590d7f`, session `20a69b8e-fdf6-4fad-a1e6-666a0997a6c1`, 14–27/09, horaires 17:00–21:00. Fin individuelle 31/10 ; la borne commune reste le 27/09.
- Déclaration 17/09 : `69de7ba5-6d4a-422f-86a2-fb9a3faa6e34`, 1,50 h, sans créneau. Déclaration 18/09 : `a1a3de55-21da-4123-a2e6-22cbd7ab32bb`, 4 h, sans créneau. Aucune attribution précise inférée.
- Contrôle EDOF fin de formation, relevés fin d’accès et gels : zéro ligne pour ce dossier à cette lecture.
- Le catalogue du calendrier serveur a été lu. Son exécution par l’outil de lecture a été refusée par permission : aucun élargissement de droits effectué.
- Les deux brouillons listés utilisent explicitement la base réelle. Aucun environnement Auth + Storage hébergé isolé n’est disponible ; aucune création de compte ni aucun téléversement sur le Cloud réel.

## Préparation réalisée, non installée
- SQL de revue : reçu exact élève/inscription/session/date/créneau, calendrier serveur existant, contrôle admin, minutes calculées serveur, horodatage réel, formateur enregistré, PDF vérifié lié à la même opération/auteur/élève.
- Original des déclarations conservé. Avant validation, la commande doit apporter leur snapshot complet du même jour et confirmer explicitement le remplacement de leur contribution d’affichage. Snapshot périmé refusé. Cela ne doit pas effacer une preuve ni signer un créneau.
- Journal de présence et pièces PDF append-only ; idempotence stricte, conflits de créneaux refusés, EDOF/gels protégés.
- Analyse PDF : extension/MIME, limite 4 Mo, entête/fin, parseur réel, nombre de pages, SHA-256 et relecture avant journal. Usine Edge candidate pour dépôt privé service-only après identité/rôle serveur ; pas d’entrée déployable.
- Projection candidate : union des intervalles exacts, aucune addition double entre signature et présence administrative. Non branchée sur les taux réels.

## Contrôles exécutés
- 46 tests Vitest PASS / 5 fichiers : minutes exactes, union/doublons, rattachement, PDF local, formulaire déconnecté ; 7 tests ciblés rejoués PASS après le message final.
- 7 tests Deno PASS : PDF réel/parseur, limite 4 Mo, MIME, non-admin avant dépôt, relecture avant journal, corruption refusée. Le port dépôt/Auth est simulé ; le handler Cloud candidat n’est pas déployé ni vérifié de bout en bout.
- 1 contrat PostgreSQL jetable PASS, avec douze cas de refus, protection EDOF, auteur/date/minutes, double appel identique, conflit, deux tables immuables/RLS et restauration pg_dump dans une seconde base avec reçu identique. Le calendrier y est une fixture, non le catalogue complet de production.
- Chromium authentifié en lecture sur le dossier réel via les composants CRM, PC/mobile : inscription retrouvée et formateur NAOUFAL GUENICHI, faux PDF refusé, sélection locale uniquement, bouton toujours désactivé, refus pratique 7 h. Captures inspectées ; aucune soumission.
- Build OK à 15:28:32 UTC. Lecture avant/après : les deux déclarations réelles 1,50 h et 4 h sont identiques.
- NON PROUVÉ : vrai flux Auth/Storage/PDF/RPC/UI hébergé isolé, concurrence avec anciennes écritures, annulation/restauration des nouveaux reçus, parité des lecteurs. Aucun résultat simulé ne remplace ces contrôles.

## Obstacles précis et chemin d’activation
1. Environnement indépendant avec Auth, API et Storage nécessaire pour le test demandé avec vrai compte/PDF ; les brouillons actuels ne conviennent pas. Le PostgreSQL jetable teste SQL/restauration, pas ces services.
2. Raccorder le remplacement explicite dans la modale, installer le dépôt privé et le journal, puis relire le reçu et actualiser les lecteurs admin/élève. Le transport n’est pas branché : aucune réussite UI prétendue.
3. Prouver l’interverrouillage avec les anciens formulaires de validation/signature : le verrou du nouveau RPC ne protège pas seul une insertion concurrente par un ancien chemin. Aucun correctif réel autorisé sur ces chemins tant que le test isolé manque.
4. Qualifier annulation/restauration des remplacements et préserver les relevés déjà figés. Ne jamais exécuter le gel manuellement.
5. Isoler depuis la version publiée : 49 fichiers diffèrent sur les dix derniers changements inspectés ; publier l’aperçu complet embarquerait des travaux distincts non validés. Aucune publication lancée.

**NO-GO activation/production.** Pas de présence, signature, note, progression, droit ou document réel modifié. Ce tour apporte un candidat serveur testé, pas un bouton opérationnel en production.