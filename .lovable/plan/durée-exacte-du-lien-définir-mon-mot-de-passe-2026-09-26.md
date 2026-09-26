# Durée exacte du lien « Définir mon mot de passe »

## 1. Réponse en lecture seule
La durée réelle (réglage « Email OTP expiration ») n'est **pas lisible** avec les outils disponibles : NON PROUVÉ. La valeur par défaut est 1 heure, mais rien ne prouve qu'elle n'a pas été changée.

## 2. Ce qui sera fait (choix « durée fixée par nous »)
- Une seule valeur, `DUREE_LIEN_MOT_DE_PASSE_MINUTES = 60` (1 heure, à confirmer), placée dans le fichier commun des e-mails d'accès. Le texte de l'e-mail est calculé à partir de cette valeur (« 1 heure »), jamais écrit à la main.
- Le lien porte l'heure d'envoi. La page « Définir mon mot de passe » refuse un lien plus ancien que cette même valeur et affiche : « Ce lien a expiré. Cliquez sur « Mot de passe oublié » pour en recevoir un nouveau. »
- Ainsi, le lien ne peut jamais durer plus longtemps que la durée annoncée. Seule limite, à vérifier : si le réglage caché est plus court qu'une heure, le lien expire plus tôt.
- Nouvelle phrase, en gras et en rouge, juste au-dessus du bouton :
  « ⏱️ Attention : ce lien est valable 1 heure après la réception de cet e-mail et ne fonctionne qu'une seule fois. Passé ce délai, allez sur la page de connexion et cliquez sur « Mot de passe oublié » pour en recevoir un nouveau. »
- L'e-mail de renvoi des accès utilise désormais le bloc commun, comme les 2 autres.

## 3. Vérification
- Contrôle du texte produit par les 3 e-mails.
- Aperçu de l'e-mail pour le compte TEST uniquement : image de l'e-mail, sans envoi à un élève.
- Essai d'un lien trop ancien sur la page, avec le compte TEST.
- Aucune publication.

## Fichiers touchés
- supabase/functions/_shared/credential-secrets.ts : durée unique, heure d'envoi dans le lien, nouvelle phrase en rouge.
- supabase/functions/resend-credentials/index.ts : utilise le bloc commun et le lien commun.
- La page de définition du mot de passe (reset-password) : refuse un lien plus ancien que la durée annoncée.

Aucune donnée, aucune synchronisation et aucun contenu pédagogique ne seront touchés. Les fonctions auto-send-credentials et create-apprenant-account profitent du changement sans être modifiées.

## Détails techniques
L'heure d'envoi (`emis=`) est ajoutée à `redirectTo`. Si quelqu'un la modifie, il ne gagne rien : l'expiration réelle continue de s'appliquer.
