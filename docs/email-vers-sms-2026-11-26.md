# Mail vers SMS — aperçu du 26 novembre 2026

- Bouton « Envoyer par SMS » sur chaque mail dans la fiche CRM et sa consultation.
- Téléphone de l’apprenant prérempli, modifiable et contrôlé selon les mobiles français acceptés par le service existant.
- Texte et liens HTML convertis en texte brut ; aucune modification du mail original.
- Raccourcissement explicite à 480 caractères avec conservation des liens complets, alerte sur les omissions et relecture obligatoire. Un lien seul trop long n’est pas tronqué : l’envoi reste bloqué.
- Pièces jointes exclues, coût potentiellement multi-SMS annoncé, confirmation du numéro et du texte avant tout appel.
- Réutilisation de `send-sms-ovh`, expéditeur FTRANSPORT, un destinataire, aucune modification serveur ou migration.
- Après une tentative, le bouton reste désactivé dans le dialogue ; résultat inconnu signalé sans reprise automatique. La réponse fournisseur confirme une transmission, pas une réception.

## Vérification

- 24 tests Vitest exécutés avec succès : conversion, liens, limite, mobiles et non-régression des helpers mail existants.
- Scénario Playwright isolé 1158×846 et 390×846 : ouverture sans appel, réduction, blocage avant confirmation, un appel simulé au bon numéro avec le texte affiché, accusé puis bouton bloqué. Captures inspectées, aucune erreur navigateur.
- Toutes les requêtes externes du scénario sont interceptées ; aucun SMS réel ni modification de dossier.
- Build de l’aperçu : OK.
- **NON PROUVÉ** : parcours CRM sous session administrateur réelle et livraison réelle OVH. Aucun test payant effectué.
- Rien publié, envoyé en masse ou activé automatiquement.