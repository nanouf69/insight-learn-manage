# Sécuriser les 6 opérations internes appelables sans connexion

Objectif : réduire l'exposition sans changer le comportement visible et sans toucher aux données.
Aucune modification n'est appliquée à ce stade.

## Constat général

Les 6 opérations ont aujourd'hui le droit d'exécution donné à la fois aux visiteurs non connectés
et aux comptes connectés. Dans la plupart des cas, le droit « visiteur non connecté » est un reste
de configuration : le parcours réel se fait toujours avec un compte connecté.

---

## 1. Vérification des rôles (`has_role`)

- **Qui l'appelle** : l'espace d'administration (contrôle d'accès des pages), l'espace apprenant, et
  plusieurs opérations serveur.
- **Pourquoi ça marche sans connexion** : le droit a été ouvert largement ; sans connexion la
  réponse est simplement « non ».
- **Correction proposée** : retirer le droit aux visiteurs non connectés, le garder pour les comptes
  connectés et le serveur.
- **Risque** : nul. Un visiteur non connecté est déjà renvoyé vers la page de connexion.
- **Verdict** : sécurisable sans changement visible.

## 2. Modification des coordonnées par l'apprenant (`update_own_apprenant_coordonnees`)

- **Qui l'appelle** : l'espace apprenant, uniquement après connexion.
- **Pourquoi ça marche sans connexion** : droit ouvert à tous ; la fonction vérifie déjà en interne
  que le dossier appartient bien à la personne connectée.
- **Correction proposée** : retirer le droit aux visiteurs non connectés.
- **Risque** : nul, l'appel n'existe que dans l'espace connecté.
- **Verdict** : sécurisable sans changement visible.

## 3. Progression des pages d'un module (`save_module_pages_progress`)

- **Qui l'appelle** : l'espace apprenant pendant la lecture d'un module, toujours connecté.
- **Pourquoi ça marche sans connexion** : droit ouvert à tous.
- **Correction proposée** : retirer le droit aux visiteurs non connectés uniquement.
- **Garantie demandée** : c'est une modification de droits d'accès, pas de données. Aucune
  progression, réponse, tentative, résultat ni enregistrement existant n'est lu, modifié, remis à
  zéro ou supprimé. La fonction elle-même reste identique (elle ajoute/complète, elle n'efface pas).
  En cas de doute pendant le test, le droit est rétabli immédiatement, sans perte possible.
- **Vérification avant/après** : comptage des enregistrements de progression et de réponses avant et
  après, et test réel d'un module depuis un compte apprenant de démonstration.
- **Verdict** : sécurisable sans changement visible, avec test apprenant obligatoire.

## 4. Enregistrement des erreurs techniques (`log_error`)

- **Qui l'appelle** : le journal d'erreurs de l'application, y compris sur les pages publiques
  (inscription en ligne, signature de document, réservation).
- **Pourquoi l'accès sans connexion est nécessaire** : sans lui, on perd la remontée des erreurs qui
  surviennent justement sur les pages publiques.
- **Correction proposée** : garder l'accès sans connexion mais le limiter (écriture seulement,
  aucune lecture possible, et limitation du volume par visiteur pour éviter les abus).
- **Risque** : faible ; au pire on perd une partie du journal technique, jamais de donnée métier.
- **Verdict** : sécurisable avec un aménagement, sans changement visible.

## 5. Affichage des questions pour l'espace fournisseur (`get_canonical_quiz_questions`)

- **Qui l'appelle** : le portail fournisseur/formateur, qui s'ouvre par un lien contenant un jeton
  personnel, sans compte.
- **Pourquoi ça marche sans connexion** : c'est voulu, le jeton remplace le compte. La fonction
  vérifie déjà ce jeton.
- **Correction proposée** : faire passer l'appel par le serveur (le portail utilise déjà ce canal
  pour tout le reste), afin que la fonction ne soit plus joignable directement de l'extérieur.
- **Garantie demandée** : aucune question ni réponse n'est modifiée, déplacée ou supprimée ; seul le
  chemin d'accès change. Le portail affichera exactement les mêmes questions.
- **Risque** : faible mais réel — il faut tester le portail fournisseur avec un vrai lien avant de
  fermer l'ancien accès. Fermeture seulement après validation.
- **Verdict** : nécessite une petite migration technique (changement de chemin d'appel) + test.

## 6. Inscription en ligne / recherche du dossier (`search_apprenant_onboarding`)

- **Qui l'appelle** : la page d'accueil du parcours d'inscription, où la personne saisit son nom et
  prénom pour retrouver son dossier. Elle n'a pas encore de compte.
- **L'accès sans connexion est-il réellement nécessaire ?** Oui : c'est la première étape, avant
  toute création de compte.
- **Point d'attention** : aujourd'hui la recherche renvoie nom, prénom, e-mail, téléphone et adresse
  à partir d'un simple nom/prénom. C'est le vrai risque de l'alerte.
- **Correction proposée** : passer par le serveur avec un jeton limité à cette seule opération
  (lien d'invitation ou jeton court généré à l'ouverture de la page), limitation du nombre d'essais,
  et réponse réduite au strict nécessaire. Pas d'accès général à la base.
- **Risque** : c'est le parcours le plus sensible côté visible (formulaire d'inscription public).
- **Verdict** : nécessite une migration plus importante, à traiter séparément.

---

## Synthèse

**Sécurisables sans modifier le comportement visible** (droits d'accès uniquement) :
1. Vérification des rôles
2. Coordonnées apprenant
3. Progression des pages de module
4. Journal d'erreurs (avec aménagement)

**Nécessitent une vraie migration** :
5. Questions du portail fournisseur (changement de chemin d'appel + test du portail)
6. Recherche de dossier à l'inscription (jeton dédié + limitation des essais)

## Déroulé proposé si vous validez

Une opération à la fois, avec contrôle avant/après et test des trois parcours (administration,
fournisseur/formateur, apprenant). Aucune donnée n'est lue, modifiée ni migrée. Retour arrière
immédiat possible à chaque étape.

Tant que vous n'avez pas validé, l'alerte reste telle quelle et rien n'est modifié.
