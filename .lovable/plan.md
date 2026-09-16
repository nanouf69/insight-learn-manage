# Sécuriser les mots de passe apprenants et fiabiliser le renvoi d'identifiants

## 1. Résultat de la vérification demandée (aucune donnée modifiée)

- La colonne `apprenants.mot_de_passe_plateforme` contient bien des mots de passe **lisibles en clair** : 65 fiches renseignées sur 3 275, toutes de 8 caractères, aucune sous forme chiffrée. Aucun mot de passe n'est affiché ici.
- Le compte de Yasin n'a **jamais** reçu de lien « Mot de passe oublié » (date d'envoi de récupération vide depuis la création du compte le 7 septembre).
- Les journaux d'authentification ne sont conservés que quelques minutes et l'historique d'audit est vide : **il est impossible de prouver quel geste a provoqué le changement**. La désynchronisation entre le mot de passe réel du compte et celui mémorisé dans la fiche est certaine ; le bouton « Changer le mot de passe » de l'espace élève en est la **cause probable**, pas une certitude.

Conclusion : défaut structurel confirmé, et stockage en clair à supprimer plutôt qu'à consolider.

## 2. Architecture proposée

Principe : **le mot de passe réel n'existe plus que dans le service d'authentification**. Le CRM ne le connaît plus.

1. **Arrêt de la mémorisation du mot de passe.**
   Plus aucun mot de passe n'est écrit dans la fiche apprenant, ni à la création de compte, ni à l'envoi automatique, ni à la réinitialisation, ni quand l'élève le change lui-même. La colonne actuelle est vidée (contenu effacé, colonne conservée pour ne rien casser).

2. **Deux façons d'envoyer les accès, au choix de l'administrateur :**
   - **Lien sécurisé** (recommandé) : l'élève reçoit un lien personnel à durée limitée pour définir lui-même son mot de passe. Personne d'autre ne le connaît.
   - **Mot de passe temporaire** : généré, affiché **une seule fois** à l'administrateur au moment de l'envoi, envoyé à l'élève, jamais stocké. L'élève est invité à le changer à sa première connexion.

3. **Le bouton « Renvoyer les identifiants » ne peut plus envoyer une valeur périmée**, puisqu'il n'a plus aucune ancienne valeur à envoyer : il propose soit le lien sécurisé, soit un nouveau mot de passe temporaire.

4. **Le changement de mot de passe côté élève** (espace cours, page de connexion élève, lien de réinitialisation) reste entièrement géré par le service d'authentification : plus rien à synchroniser, donc plus de désynchronisation possible.

## 3. Garanties

- **Aucun mot de passe existant n'est changé** : les élèves continuent de se connecter normalement avec leur mot de passe actuel. Seule la copie stockée dans le CRM est effacée.
- Aucune donnée pédagogique touchée : réponses, notes, tentatives, résultats, progression, modules, examens, historiques.
- Aucune fiche apprenant, aucun accès, aucune session modifiés.
- L'opération n°5 reste intouchée.
- Seule conséquence visible : l'administrateur ne verra plus le mot de passe d'un élève dans sa fiche ; il enverra à la place un lien ou un mot de passe temporaire.

## 4. Détail technique

- `supabase/functions/resend-credentials/index.ts` : deux modes (`mode: "reset_link"` via `auth.admin.generateLink({ type: "recovery" })`, `mode: "temp_password"` via `updateUserById` + envoi immédiat) ; suppression de toute écriture dans `mot_de_passe_plateforme` ; le mot de passe n'est plus jamais relu depuis la base.
- `supabase/functions/auto-send-credentials/index.ts` : suppression de l'écriture `mot_de_passe_plateforme` (lignes 264-267).
- `src/components/crm/ApprenantDetailPage.tsx` et `src/components/sessions/SessionDetail.tsx` : remplacement de la section « Voir / réinitialiser le mot de passe » par « Envoyer un lien de définition du mot de passe » et « Générer un mot de passe temporaire » (affiché une fois, non persisté).
- `src/pages/CoursPublic.tsx`, `src/components/cours-en-ligne/StudentLogin.tsx`, `src/pages/ResetPassword.tsx` : inchangés (déjà corrects une fois la copie CRM supprimée).
- Nettoyage des 65 valeurs en clair : exécuté seulement après votre validation, via une mise à jour ciblée de cette seule colonne (`update public.apprenants set mot_de_passe_plateforme = null where mot_de_passe_plateforme is not null`), aucun autre champ touché.

Rien n'est codé ni exécuté avant votre validation.
