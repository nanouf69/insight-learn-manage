# Accès présentiel — une session, un examen (11/11/2026)

## Diagnostic réel, lecture seule

- Le catalogue `pg_proc` ne contient ni `admin_session_exam_access_context(uuid)`, ni `admin_set_session_exam_access(uuid,uuid,text,boolean,uuid,text)`, ni `admin_set_sessions_exam_access`. Le journal `session_exam_access_events` et les déclencheurs `session_exam_new_*` sont également absents.
- Aucun candidat d’accès session/EB n’est dans `supabase/migrations`. Les fichiers SQL existent uniquement dans `docs/sql-revue`, volontairement non installés.
- « Contrôle non installé » vient de l’échec PGRST202 de la lecture. Ce n’est pas un état ouvert ou fermé.
- Le composant multi-session proposait toujours le chemin groupé, même avec une seule case cochée, et sa confirmation était volontairement désactivée. Ce deuxième blocage est indépendant de l’absence du serveur.
- La carte est montée par `EcranSelection` / `ExamenBlancsListe` avec **`examen.id` exact**. Le « groupé » désigne plusieurs sessions CRM pour ce seul examen, pas plusieurs EB ni plusieurs matières. Catalogue réel : EB1–EB6 VTC, EB1–EB6-TAXI, eb1–eb6-ta et eb1–eb6-va séparés. Aucun numéro d’EB de capture non fournie n’est déduit.

## Correction préparée

Une seule session cochée et un état vérifiable montent le contrôle unitaire partagé `SessionExamAccess`, avec « Ouvrir cette session » / « Fermer cette session ». Le groupé ne conditionne plus ce chemin. Sans lecture fiable, ces boutons restent désactivés et le motif est explicite.

Le contrôle conserve confirmation nominative, identifiant exact session/examen, CAS du dernier événement, identifiant d’opération réutilisable, refus de double clic, contrôle du reçu puis relecture serveur concordante. Changer session/examen ou relire invalide la confirmation ouverte. Plusieurs sessions conservent le groupé désactivé, sans boucle d’écritures unitaires.

## Serveur strictement nécessaire, non installé

Le candidat unitaire existant **`docs/sql-revue/2026-11-11-session-exam-access.sql`** suffit pour ce chemin ; le candidat `...-batch.sql` n’est pas requis.

Le candidat unitaire inclut le journal append-only et ses droits/RLS, les deux RPC admin lecture/écriture, le catalogue compatible et les gardes de création V2/repassage/timer ancien. Installer les RPC seules ne suffirait pas : il faut les gardes de nouveaux démarrages pour qu’une fermeture soit réellement appliquée.

La fermeture est une restriction additionnelle, jamais une attribution de module. Les reprises, réponses, sauvegardes, remises et chronomètres existants restent utilisables ; une fermeture sur une autre inscription croisée applicable reste prioritaire. Auteur admin vérifié au serveur, verrou transactionnel contre les démarrages concurrents, pas de ligne initiale = comportement existant.

**Blocage restant :** accord séparé pour installation du candidat unitaire complet, précédé du prévol de compatibilité avec le catalogue serveur actuel et de la couverture de tous les chemins de démarrage applicables. Les fixtures utilisent le catalogue archivé du 11/11 ; l’ensemble des déclencheurs/Edge Functions actuels n’est pas certifié par ces seuls tests. Aucun contrôle d’accès réel n’est activé dans ce tour.

## Vérifications exécutées

- **43 tests Vitest réussis**, 7 fichiers : sélection simple/multiple, serveur absent, rôles, périmètre, confirmation, annulation, double clic, reçu/relecture, changement d’examen, routage sans repli.
- **16 contrats PostgreSQL réussis** sur cluster jetable socket-local sans variables PG héritées : unitaire sans RPC groupée, autre session/examen inchangé, fermeture avant création, reprise ancienne/V2, sauvegarde/remise après fermeture, droits, CAS/rejeu, journal immuable, inscriptions croisées et concurrence.
- **Chromium fictif 1280×1800 et 390×844** : annuler, fermer avec reçu/relecture, rouvrir avec relecture, groupé désactivé, serveur absent désactivé ; aucune erreur JS. Appels Cloud de données bloqués. Les fermetures de fixture ne sont jamais présentées comme des fermetures réelles.
- **Admin réel, lecture seule** : carte EB4 présente, sessions novembre lisibles, contrôle non installé, sélection d’une session et « Fermer cette session » désactivé ; aucune écriture d’accès envoyée.
- Compilation automatique observée : **build OK**.

Aucune migration, fermeture/ouverture réelle, modification de note/réponse ou publication exécutée.