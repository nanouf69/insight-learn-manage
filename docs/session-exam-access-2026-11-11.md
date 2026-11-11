# Accès EB par session CRM — aperçu, non activé

## Chemin
CRM → Sessions → ouvrir une session théorique présentielle → **Accès examens blancs** → **Ouvrir / Fermer** à côté de l’EB → confirmation nominative session/EB → relecture serveur.

Le serveur actuel n’a PAS été modifié. La fiche affiche donc « Contrôle des examens blancs préparé, mais non installé sur le serveur. Aucun accès n’a été modifié. » et aucune action modifiante n’est proposée. Le test navigateur utilise le même écran sur un transport entièrement fictif.

## Structure vérifiée en lecture seule
- Accès existants : `apprenants.modules_autorises`, dates/parcours, `examens_blancs_parcours`, inscriptions CRM `session_apprenants`. Aucun de ces paramètres n’est remplacé ou étendu.
- `core_start_attempt` retourne d’abord une tentative en cours ou un reçu existant, avant création. `start_exam_subject_retake` crée une nouvelle copie et un timer transactionnels. `start_or_get_exam_timer` réutilise son timer par apprenant/exercice/tentative.
- Aucune règle actuelle explicite de fermeture session/EB retrouvée dans ces frontières. Extension additive minimale : journal de consignes session/EB, lectures/écritures admin dédiées et trois gardes BEFORE INSERT sur les frontières existantes. Pas de deuxième moteur, liste d’élèves ou système de droits de cours.
- `examens_blancs_parcours` a une clé composite module/examen, pas une clé unique examen : aucune FK invalide sur exam_id seul.
- Noms/types de sessions et catégories réelles lus. Sessions sans catalogue de filières, pratique/FC ou mode non prouvé ne sont pas supposées éligibles.

## Candidat SQL (jamais appliqué au Cloud)
`docs/sql-revue/2026-11-11-session-exam-access.sql`, hors historique de migration.

- Journal append-only, état dérivé du dernier événement, auteur, heure, ID d’opération et CAS du précédent. Aucune ligne initiale = accès existants inchangés.
- Permissions contrôlées côté serveur via rôle admin ; clients sans écriture directe ; droits explicites + RLS ; helpers privés.
- Fermeture vérifiée avant insertion de nouvelle tentative V2, nouveau reçu de repassage ou timer ancien. Échec annule la transaction entière. Les reprises ne créant rien gardent l’accès ; aucune garde sur update/save/finalize/lecture/correction.
- Verrou partagé de démarrage et exclusif de changement de consigne, même clé examen : la fermeture attend la transaction qui a déjà démarré ; un nouveau départ après fermeture est refusé.
- Timer ancien existant conservé byte-identique ; V2 commencé avant création de timer reprend avec tentative concordante. Sources importées finalisées restent consultables sans requalification.
- Inscriptions croisées : intersection des sessions enregistrées dont le catalogue accepte l’examen ET du module attribué à l’élève ; fermeture explicite dans une de ces sessions prioritaire. Message `P0551` nomme les sessions bloquantes. Une ouverture n’ajoute ni module, ni inscription, ni droit et ne lève pas la fermeture d’une autre session.
- Message côté élève propagé sans fallback V2→ancien ni repli sur chrono local pour ce refus précis.
- E-learning/distanciel et modes ambigus conservés hors de cette restriction, classification conservatrice conforme aux parcours types prouvés. Liste d’attente ignorée comme preuve d’inscription éligible.

## Tests réellement exécutés
- **15 contrats PostgreSQL PASS**, cluster jetable socket-local sans variables PG héritées : droits, default, fermé avant timer/copie, ouverture sans extension de modules, timer ancien inchangé, e-learning/distanciel/mode inconnu, inscriptions croisées et fermeture prioritaire, session hors filière, append-only, CAS/rejeu, repassage refusé sans reçu, concurrence admin et verrou démarrage/fermeture.
- Sauvegarde/remise après fermeture : vrais `core_save_answer` et `core_finalize_attempt` du catalogue existant sur copie fictive, statut final `terminee`, nouvelle copie refusée. Aucun mail/IA de production ; aucune donnée réelle copiée dans les fixtures.
- **29 tests Vitest PASS** (5 fichiers) : confirmation/cancel/double clic/identité/readback/refus droits/serveur absent + routage fermé sans fallback et reprise V2 existante + 20 régressions de clôture et réouverture.
- **Chromium PC 1280×1800 et mobile 390×844 PASS** : annuler sans appel modifiant, fermer+confirmation+état relu, rouvrir+état relu ; API fictive interceptée, autres appels Cloud interdits, zéro erreur JS. Captures de confirmation et état inspectées.
- Build automatique observé OK après modifications.

## Limites et préactivation
- **Aucune installation, fermeture/ouverture réelle ni publication.** Le contrôle n’est pas effectif sur les élèves tant que le candidat serveur n’est pas installé avec accord séparé.
- Session CRM authentifiée réelle et parcours apprenant complet via interface (y compris sauvegarde puis remise après fermeture) **NON PROUVÉS** ; UI admin exécutée sur fixture, save/finalize testés avec vraies RPC en PostgreSQL jetable, routage repris avec tests JS. La fiche SessionDetail complète n’a pas été exécutée en navigateur.
- Catalogue/procédures des fixtures proviennent du diagnostic serveur existant ; tous les déclencheurs de production et écritures des différentes Edge Functions n’ont pas été rejoués ensemble. Préactivation exige validation des chemins anciens/contournements directs, variantes TA/VA et éligibilité courante entière avec les derniers déclencheurs. Ne pas installer à l’aveugle.
- Politique volontaire de prudence : aucune inférence de filière pour une session sans `types_apprenant`, mode d’apprenant inconnu inchangé. Ces cas restent sans commande plutôt que d’imposer une fermeture silencieuse.
- La garde est une restriction supplémentaire, pas une nouvelle autorisation serveur universelle de parcours : les contraintes existantes restent responsables de l’éligibilité en dehors de la fermeture.
- Régressions/écarts préexistants hors chantier : `ExamenBlancsPassage` possède encore des resynchronisations périodiques, contraires à la consigne zéro polling. Non modifiées pour ne pas changer le chronomètre ici ; arbitrage distinct requis.

## Fichiers et architecture
Nouvelle zone `src/components/sessions/acces-examens` intégrée dans SessionDetail ; transport scoped/readback, deux propagations de refus en frontend, candidat SQL séparé et contrats fictifs. Règles documentées dans le AGENTS local ; root AGENTS à son budget historique, règles utilisateur non modifiées. Commit géré automatiquement par la plateforme, référence observée fournie en réponse.