# Afficher l’accusé de réception des mails Teams

## Résultat attendu

Dans l’historique des liens Teams, afficher pour chaque destinataire :
- **Envoyé** lorsque le service d’envoi a accepté le mail ;
- **Ouvert** avec la date et l’heure de première ouverture lorsque celle-ci est détectée ;
- **Non ouvert** tant qu’aucune ouverture n’a été détectée ;
- **Échec** si l’envoi a échoué.

Le statut sera actualisé automatiquement pendant que la fenêtre reste ouverte.

## Mise en œuvre

- Rapprocher chaque entrée de l’historique Teams avec son accusé grâce à l’adresse du destinataire, au sujet du mail et à l’heure d’envoi.
- Afficher le statut individuellement sous chaque nom, sans modifier le bouton **Renvoyer**.
- Conserver les données d’envoi et d’ouverture existantes en lecture seule.
- Préserver les envois sans blocage anti-doublon.

## Sécurité des données

Aucun mail ne sera renvoyé automatiquement. Aucun accusé, historique, destinataire ou donnée apprenant ne sera modifié.

## Vérification

Contrôler l’affichage sur l’historique visible de Léa CATANIA, notamment :
- 17 septembre 2026 : ouvert ;
- 18 septembre 2026 : non ouvert à l’heure du contrôle.
