# Plan final — réparer le fonctionnement futur, sans toucher à l'existant

## 0. Engagement explicite

Ce plan comporte **0 suppression** et **0 modification** de données apprenants existantes :

- Aucune valeur existante effacée ni vidée, y compris les 65 mots de passe actuellement présents dans les fiches : ils restent **exactement tels quels**.
- Aucune fiche apprenant supprimée, aucun compte, accès ou session modifié.
- Aucun mot de passe actuel changé : tous les élèves continuent de se connecter comme aujourd'hui.
- Aucune réponse, note, tentative, résultat, progression, module, examen ni historique touché.
- Aucun nettoyage global de la base, aucune migration de schéma.
- L'opération n°5 reste totalement intouchée.

Le nettoyage éventuel des 65 anciennes valeurs sera traité **séparément**, après sauvegarde et validation explicite de votre part.

## 1. Vérification déjà faite (lecture seule)

- La colonne du CRM contient des mots de passe lisibles en clair : 65 fiches renseignées sur 3 275. Aucun mot de passe affiché ici.
- Le compte de Yasin n'a jamais reçu de lien « Mot de passe oublié ».
- Les journaux ne sont conservés que quelques minutes : la désynchronisation est **certaine**, mais le clic sur « Changer le mot de passe » est la **cause probable**, pas un fait prouvé.

## 2. Ce que la correction change (uniquement pour l'avenir)

1. **Plus aucun nouveau mot de passe n'est enregistré dans la fiche CRM.**
   Création de compte, envoi automatique, réinitialisation : le mot de passe est envoyé à l'élève et n'est plus recopié dans la base. Le service d'authentification devient la seule référence.

2. **Le renvoi d'identifiants ne peut plus envoyer une valeur périmée.**
   Le bouton propose désormais deux actions, au choix de l'administrateur :
   - **Lien sécurisé** : l'élève définit lui-même son mot de passe, personne d'autre ne le connaît.
   - **Mot de passe temporaire** : généré, affiché une seule fois à l'administrateur, envoyé à l'élève, jamais stocké.
   Le simple renvoi d'une valeur mémorisée disparaît, donc plus aucun envoi de mot de passe invalide.

3. **Les fiches déjà renseignées continuent d'afficher leur valeur actuelle**, inchangée, tant que vous n'aurez pas validé l'étape 2 (nettoyage).

## 3. Détail technique

- `supabase/functions/resend-credentials/index.ts` : deux modes (`reset_link` via `auth.admin.generateLink({ type: "recovery" })`, `temp_password` via `updateUserById` + envoi immédiat) ; **suppression de l'écriture** dans `mot_de_passe_plateforme` (écriture future uniquement — aucune valeur existante n'est effacée) ; plus de relecture de cette colonne pour composer l'email.
- `supabase/functions/auto-send-credentials/index.ts` : suppression de l'écriture `mot_de_passe_plateforme` (lignes 264-267), le reste inchangé.
- `src/components/crm/ApprenantDetailPage.tsx` et `src/components/sessions/SessionDetail.tsx` : les boutons deviennent « Envoyer un lien de définition du mot de passe » et « Générer un mot de passe temporaire » (affiché une fois, non persisté).
- `src/pages/CoursPublic.tsx`, `src/components/cours-en-ligne/StudentLogin.tsx`, `src/pages/ResetPassword.tsx` : inchangés.
- Aucune migration, aucun `update`, aucun `delete` exécuté sur la base.

## 4. Étape 2, plus tard et séparément

Nettoyage des 65 valeurs en clair : uniquement après export de sauvegarde et votre autorisation écrite. Non inclus dans cette intervention.
