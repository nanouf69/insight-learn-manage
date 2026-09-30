# Rapport des changements de questions

Aucune question n'est modifiée par ce chantier. Il ne fait qu'observer et signaler.

## Ce qui sera fait
1. **Journal central en base** : chaque changement de question (ajout, suppression, retrait, déplacement, modification du texte, des réponses ou de la bonne réponse) est enregistré automatiquement par le serveur, quel que soit l'auteur. Ça couvre les modules, bilans, quiz et examens blancs.
2. **Qui** : compte humain (e-mail de l'admin), agent (écritures faites avec les droits techniques), ou traitement automatique (déclencheurs, synchronisations, tâches planifiées).
3. **E-mail groupé** à contact@ftransport.fr : vérification toutes les 10 minutes. Un e-mail part seulement s'il y a eu des changements. Il contient la date, l'heure, l'auteur, le module, l'exercice, le type de changement, l'avant et l'après.
4. **Récapitulatif quotidien à 20h (Paris)** : envoyé chaque jour, avec « 0 changement » quand il n'y a rien.
5. **Page admin « Historique des questions »** : liste de tous les changements, filtres par module et par date, détail avant/après. Accès réservé aux admins.
6. **Test** : modification d'une question sur un module fictif créé pour l'essai (jamais un vrai module). On vérifie l'arrivée de l'e-mail dans le journal d'envoi Outlook, puis on publie.

## Points à confirmer
- Vérifier toutes les 10 minutes représente 144 contrôles par jour. C'est léger, mais la base reste un peu plus active. L'autre option, un e-mail à chaque changement, enverrait trop de messages en cas de gros lot.
- L'envoi passe par la boîte Outlook déjà utilisée (contact@ftransport.fr), comme les autres e-mails du centre.

## Détails techniques
- Nouvelle table `question_change_log` (ajout seul, jamais de suppression ni de modification), GRANT + RLS réservée aux admins.
- Déclencheur AFTER UPDATE sur `module_editor_state` et `exam_content_versions` : comparaison question par question de l'ancien et du nouveau JSON, une ligne par question changée. Auteur = `auth.uid()` / e-mail, sinon `service_role` = agent/fonction, sinon « automatique » avec le nom du déclencheur.
- Colonne `notifie_at` pour savoir ce qui a déjà été envoyé.
- Nouvelle fonction `rapport-changements-questions` (modes `lot` et `quotidien`), envoi via `_shared/send-branded-email.ts`.
- 2 tâches planifiées : toutes les 10 min (lot) et `0 18 * * *` UTC (20h Paris l'été ; à ajuster à 19h UTC en hiver).
- Nouvelle page `src/pages/AdminHistoriqueQuestions.tsx` + route dans `src/App.tsx` + lien dans le menu admin.

## Fichiers touchés
- Migration SQL (table, déclencheurs)
- supabase/functions/rapport-changements-questions/index.ts (nouveau)
- src/pages/AdminHistoriqueQuestions.tsx (nouveau)
- src/App.tsx, menu admin (1 lien)
