# Mots de passe élèves plus faciles à saisir — diagnostic et proposition

Diagnostic en lecture seule. Rien n'a été modifié, envoyé ou publié.

## Cause de la complexité actuelle

Un seul endroit fabrique un mot de passe que l'élève doit taper :
- **Renvoi des identifiants, mode « mot de passe temporaire »** (fonction `resend-credentials`). Il tire 8 caractères au hasard parmi majuscules, minuscules et chiffres (exemple de forme : `kP7mQx3R`). C'est ce mélange qui rend la saisie difficile, surtout sur téléphone.

Les autres chemins ne donnent aucun mot de passe à taper :
- **Création de compte et envoi automatique** (`create-apprenant-account`, `auto-send-credentials`) : un mot de passe interne très long, jamais communiqué, puis un lien sécurisé « Définir mon mot de passe ».
- **Renvoi en mode « lien »** et **« Mot de passe oublié »** : lien sécurisé ; l'élève choisit le sien.
- La page de choix du mot de passe demande seulement 6 caractères minimum, sans majuscule imposée.

La politique d'authentification n'impose donc pas de majuscule : cette contrainte vient uniquement du générateur du mode temporaire. Les réglages exacts côté serveur (longueur minimale, catégories de caractères requises, contrôle des mots de passe divulgués) restent à relire avec l'outil de configuration avant toute modification. Je ne les ai pas vérifiés ici.

Note : aucune règle légale universelle n'impose le mélange majuscules/minuscules. Les recommandations actuelles (ANSSI, NIST) privilégient la longueur et le hasard plutôt que des catégories imposées.

## Format proposé

Une phrase de passe faite de **4 mots français courants, en minuscules, sans accents, séparés par des tirets**, plus 2 chiffres. Exemple de forme : `table-orange-velo-pluie-47`.
- Tirage cryptographique (même source de hasard que l'actuel), sur une liste fixe d'environ 2 000 mots courts et non ambigus.
- Robustesse : environ 50 bits, bien plus que les 8 caractères actuels (environ 46 bits). Avec la limitation des tentatives côté serveur, une attaque par essais successifs n'est pas réaliste.
- Facile à dicter, à lire et à taper sur mobile, sans majuscule.

Variante plus courte possible : 3 mots + 3 chiffres (environ 43 bits). Elle est moins robuste ; je la déconseille.

## Protections conservées

- Limitation des tentatives de connexion et session unique : inchangées.
- Mot de passe temporaire jamais enregistré, masqué dans l'historique des emails (`redactForHistory`) : inchangé.
- Le lien sécurisé reste le mode par défaut et recommandé.
- Les mots de passe existants des élèves ne sont pas touchés : seuls les nouveaux mots de passe temporaires changent de forme.

## Périmètre exact d'une modification future (après votre accord)

1. `supabase/functions/_shared/credential-secrets.ts` : ajouter un générateur de phrase de passe et sa liste de mots.
2. `supabase/functions/resend-credentials/index.ts` : remplacer uniquement les lignes 144–152 (le tirage sur 8 caractères) par ce générateur.
3. Test unitaire : format respecté (minuscules, tirets, chiffres), pas de majuscule, longueur minimale, tirages différents.
4. Optionnel, à décider : relever le minimum de la page de choix du mot de passe (aujourd'hui 6 caractères), et aligner le réglage serveur. Cela demande un accord séparé.

Aucun mot de passe existant, compte, question, réponse, progression ou signature n'est concerné. Aucun email ni SMS de test, et aucune publication sans accord distinct.
