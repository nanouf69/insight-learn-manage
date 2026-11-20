# Qualiopi 19 — confinement réseau et état du contrôle, 20/11/2026

## Conclusion

**PASS limité au confinement d’une nouvelle commande et de ses descendants.** Le blocage BPF précédent est contourné techniquement par un espace de noms réseau Linux sans route externe. **STOP maintenu pour toute création de compte** : les processus PostgreSQL/pg_net, Auth et fonctions du brouillon séparé ne sont pas administrables depuis ce fil et n’ont pas été démarrés dans cet espace confiné. Le parcours authentifié reste **NON PROUVÉ**.

Aucun mail, compte, dossier, question, réponse, cours ou élève réel créé/modifié. Aucun appel payant, gel de relevé, acceptation du brouillon ou publication. L’indicateur 19 reste **À compléter**.

## Déclencheur externe identifié précisément

Lecture du fichier `drizzle/migrations/0135_acces_auto_apres_modification_apprenant.sql` et rapport du brouillon au commit `80b9a9eec716089978939ef6b8f0624203c11093` :

```text
AFTER UPDATE ON public.apprenants
→ public.verifier_acces_apres_modification_apprenant()
→ net.http_post(...) [pg_net]
→ fonction réelle auto-send-credentials
```

Le garde-fou retourne sans appel lorsque `NEW.auth_user_id` est déjà renseigné, mais cela ne constitue pas une preuve d’absence exhaustive de sortie. La fonction est non bloquante en cas d’erreur réseau : une modification de dossier peut donc être enregistrée même si l’appel externe est refusé. Aucun appel du déclencheur n’a été exécuté.

## Confinement réellement exécuté

Nouvel outil : `src/test/qualiopi19_network_confinement.py`.

Il lance `unshare --user --map-root-user --net`, active uniquement `lo`, vérifie l’espace réseau puis n’exécute la commande demandée qu’après succès complet. Les variables d’environnement héritées sont limitées à une liste blanche ; les credentials PG/Supabase/Resend/SMTP/agence ne sont pas transmis.

Dix contrôles **PASS** à 09:04:51 UTC, journal durable `docs/qualiopi19-confinement-preflight-2026-11-20.json` :

1. échange TCP réel sur la boucle locale ;
2. HTTPS externe IPv4 refusé (`ENETUNREACH`, 101) ;
3. SMTP externe IPv4 port 25 refusé ;
4. soumission email externe IPv4 port 587 refusée ;
5. HTTPS externe IPv6 refusé ;
6. SMTP externe IPv6 refusé ;
7. résolution DNS de `example.com` impossible ;
8. aucune route IPv4 hors boucle locale ;
9. aucune route IPv6 par défaut ;
10. espace réseau distinct de celui du projet.

Deux contrôles de garde supplémentaires ont été exécutés sur la version finale :

- commande locale fictive exécutée après les dix PASS, code 0, variables sensibles héritées absentes ;
- préparation de `lo` volontairement fait échouer : verdict FAIL, code 70, **commande jamais exécutée**.

Ces résultats prouvent le refus de connexions IP externes depuis le nouvel espace. Ils ne déplacent pas les services déjà démarrés du brouillon et ne prouvent pas leur confinement. L’espace de noms ne nettoie pas les fichiers `.env` du système de fichiers : le parcours futur devra utiliser une configuration explicitement locale, sans recharger les credentials de production.

## Blocage exact et étape manuelle requise

Le fil principal peut lire le commit du brouillon `drft_01m7tdj6x0ezkr6p5stys1n7d3`, mais ne peut ni ouvrir son contexte d’exécution ni administrer ses processus. Envelopper seulement un navigateur ou un client SQL ne confinerait pas le worker `pg_net` déjà lancé : ce serait une preuve insuffisante.

Dans l’espace **« Qualiopi 19 — contrôle élève isolé »**, il faut donc :

1. récupérer `src/test/qualiopi19_network_confinement.py` depuis le projet principal ;
2. arrêter les anciens services du brouillon, puis démarrer PostgreSQL/pg_net, Auth et les fonctions comme descendants du lanceur confiné, avec configuration locale et supports fictifs préchargés ;
3. relever `/proc/<pid>/ns/net` de chaque service et worker émetteur et vérifier son identité avec l’espace ayant passé les dix contrôles ; vérifier l’absence de relais externe et recharger aucun `.env` de production ;
4. seulement après cette preuve, créer deux identités fictives par l’authentification officielle du brouillon et exécuter connexion, cours/PPT/PDF local, sauvegarde/remise/reconnexion/relecture, progression, heures réellement observées, jalons, assistance et refus RLS croisés.

Tant que ces étapes ne sont pas exécutées dans le brouillon, **aucun compte ne doit être créé**. Une connexion interactive seule ne lève pas ce blocage.

## État Qualiopi 19

- Avant intervention : `a_completer`, 16 preuves liées.
- Preuve documentaire ajoutée : uniquement les dix contrôles du lanceur, le test de commande et le refus fermé ; aucune réussite de parcours élève revendiquée.
- Relecture après rattachement : base `a_completer`, une seule nouvelle preuve `q19-controle-20261120-confinement`, **17 preuves actives**. Interface administrateur réellement relue : indicateur **#19 « À compléter » — 17 preuve(s)**, sans erreur JavaScript. Aucun autre statut modifié.
- Statut volontairement inchangé : **À compléter**. Le confinement partiel ne démontre ni le parcours authentifié complet ni les exigences organisationnelles FOAD, assistance/résolution et référent conditionnel.
