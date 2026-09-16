# Fiabiliser le mot de passe affiché dans la fiche apprenant

## Ce que disent les journaux (vérifié, rien modifié)

- Le compte de Yasin n'a **jamais** utilisé « Mot de passe oublié » : la date d'envoi d'un lien de récupération est vide sur son compte depuis sa création le 7 septembre.
- Le compte n'a jamais été suspendu, ni désactivé, ni supprimé.
- Le journal détaillé des connexions n'est conservé que quelques minutes côté hébergeur, et l'historique d'audit du service d'authentification est vide : il est donc **impossible de prouver dans les journaux** le clic exact sur « Changer le mot de passe ». Par élimination, le seul chemin restant est ce bouton, présent dans l'espace élève : il modifie le mot de passe du compte sans mettre à jour celui affiché dans la fiche.

Conclusion : le défaut est structurel, il concerne tous les élèves, et il doit être corrigé quel que soit le chemin utilisé.

## Ce que je vais modifier

1. **Un seul circuit pour tout changement de mot de passe côté élève.**
   Les trois endroits où un élève peut changer son mot de passe lui-même (bouton dans l'espace cours, bouton sur la page de connexion élève, page atteinte depuis « Mot de passe oublié ») passeront par un même traitement côté serveur qui met à jour **en même temps** le mot de passe du compte et celui mémorisé dans sa fiche. Les deux valeurs ne peuvent donc plus diverger.

2. **Un indicateur « mot de passe non vérifié » dans la fiche.**
   Nouvelle information ajoutée à la fiche apprenant, vide pour tout le monde au départ. Elle passe à « non fiable » uniquement si un changement se produit hors de ce circuit (cas résiduel).

3. **Le bouton « Renvoyer les identifiants » ne peut plus envoyer une valeur périmée.**
   Si l'indicateur signale une valeur non fiable, le renvoi simple est bloqué et le bouton propose la réinitialisation (nouveau mot de passe généré, appliqué au compte, enregistré dans la fiche et envoyé). Dans tous les autres cas, le comportement actuel reste identique.

## Garanties pour les comptes existants

- Aucun mot de passe existant n'est modifié : la correction ne touche que les futurs changements.
- Aucune donnée pédagogique n'est concernée : réponses, notes, tentatives, résultats, progression, modules, examens et historiques restent intacts.
- La nouvelle information de fiche est ajoutée avec une valeur neutre par défaut ; aucune ligne existante n'est réécrite.
- L'opération n°5 n'est pas touchée.

## Détail technique

- Nouvelle fonction serveur `update-own-password` (JWT élève obligatoire) : `auth.updateUser` + mise à jour de `apprenants.mot_de_passe_plateforme` limitée à l'apprenant du jeton, via clé de service.
- Appels remplacés dans `src/pages/CoursPublic.tsx` (ChangePasswordDialog), `src/components/cours-en-ligne/StudentLogin.tsx`, `src/pages/ResetPassword.tsx`.
- Migration : `alter table public.apprenants add column mot_de_passe_plateforme_verifie boolean not null default true;` (valeur neutre, aucune réécriture des lignes existantes).
- `supabase/functions/resend-credentials/index.ts` : si `mot_de_passe_plateforme_verifie = false` et `reset_password = false`, renvoi refusé avec un message clair côté CRM ; `ApprenantDetailPage.tsx` et `SessionDetail.tsx` proposent alors la réinitialisation.
