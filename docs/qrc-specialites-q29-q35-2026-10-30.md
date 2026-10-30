# QRC TAXI spécialités — QCM locaux 29 et 35 — 30/10/2026

## Identités et périmètre
Les numéros29/35 affichés sont les QCM locaux `local:29`/`local:35`, pas les IDs nationaux29/35 (taxi de remplacement/carnet métrologique). Aucun changement des énoncés, choix, copie TA, manifeste, réponses/tentatives, notes enregistrées, IA ou sauvegarde. Pas de publication.

## Q35 — appliqué
Énoncé exact : « Que doit faire un chauffeur TAXI qui n'est pas en course et qui stationne sur une place de TAXI ? »

Corrigé historique : C, « La station doit avoir 3 places minimum, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord ».

Réponse acceptée dans le quiz facultatif : **D**, « La station doit avoir 6 places minimum, 1/3 de la partie arrière peut être utilisée, le lumineux doit être allumé et un disque de stationnement doit être sur le tableau de bord ».

Source projet directement téléchargée/lue : **F_Locale_1_TAXI_20261027.pdf, pages8–9**, « Stations (art.9) & équipements véhicule (art.7) » puis conditions de stationnement :
> Sur les stations ≥6 places,1/3 de la partie arrière peut être utilisé par des taxis momentanément hors course ou réservés (lumineux allumé + disque). Durée max :2 heures.

La page9 distingue station de moins de6 places (attente de clients, pas pause), station de6 places ou plus (tiers arrière) et lumineux/disque/2h maximum.

Corroboration réglementaire : **arrêté Rhône69-2026-09-21-00001 du21/09/2026, art.10, page17 du PDF recueil** :
> Dans les stations de taxis disposant d'un nombre de places supérieur ou égal à6,1/3 de la partie arrière de la station peut être utilisée par des taxis qui ne sont momentanément pas en course ou des taxis réservés.
Puis lumineux allumé, disque tableau de bord, deux heures maximum.

Source : https://www.rhone.gouv.fr/contenu/telechargement/70315/473664/file/RAA_69-2026-285-220926.pdf
Copie déjà téléchargée pendant l’audit précédent, relue page17 cette intervention ; pas une nouvelle validation de publication légale. Le support cite le texte métropolitain2024 article9 ; la corroboration2026 est article10 : références distinctes.

**Précision importante : ≥6, pas >6 ; tiers arrière de la station, pas tiers des places libres.** Le feedback complète D avec la durée2h sans changer la proposition.

## Q29 — feedback précisé, nouvelles clés bloquées
Énoncé exact : « Je dispose d'une licence de Villefranche, je souhaite déposer un article trouvé dans mon véhicule à Lyon8, je le dépose à : »
Choix : A La Métropole de Lyon ; B La mairie de Lyon8 ; C La mairie de Villeurbanne ; D La mairie de Villefranche. Historique A.

**Le sujet est un objet oublié, pas le dépôt du client.** Le livre `Livre_TAXI_FINAL_1.pdf`, **page PDF33**, « Réglementation locale — Partie1 », mentionne « Objets trouvés :72h guichet Métropole ». Support Locale partie1 **pages3/7**, et Locale partie2 version27/10b : guichet unité taxis Métropole sous72h. Ces supports ne donnent pas ici l’alternative demandée.

Le texte préfectoral2026 art.9, **page17 du recueil**, dit exactement :
> Les objets oubliés dans le véhicule par le client après son départ sont déposés le plus rapidement possible, sans excéder72 heures, au service des objets trouvés de la mairie de dépose ou auprès de l'autorité de délivrance de l'autorisation de stationnement.

Donc **mairie de dépose**, pas lieu de prise en charge ni restitution automatique sur un trottoir. L’énoncé ne dit pas où le client a été déposé : « souhaite déposer un article […] à Lyon8 » ne prouve pas que le client y a été déposé. Le rôle exact du guichet Métropole pour une ADS Villefranche mérite également arbitrage.

Application : feedback expose les deux voies du texte et l’ambiguïté, affichage « corrigé historiqueA — autres possibilités à arbitrer » plutôt qu’une exclusion fausse catégorique. **Aucune nouvelle lettre acceptée** en déduisant un trajet absent. La clé historique n’a pas été réécrite. Aucun score historique recalculé.

## Mise en œuvre et contrôles
- Module séparé `correctionsLocalesVerifiees.ts`, gardes ID+énoncé+choix exact pour Q35 ; sélection et feedback du seul quiz intégré. Banque TA statique conservée.
- `QuizQrcTaxiIntegre.tsx` utilise ce comparateur d’affichage, sans écriture de correction dans les réponses. Q29 affiche l’arbitrage ; Q35D passe juste, C refusé. Pour copies déjà soumises, le feedback courant peut évoluer ; les choix sauvegardés restent intacts. Aucun mécanisme de note officielle n’est appelé.
- **35 tests Vitest PASS** :4 nouveaux (D, autres clés inchangées, ambiguïtéQ29, garde exact),22 quiz,6 durables,3 alertesQ5/Q6/Q13.
- Aucun appel IA, aucune mutation serveur, aucun mail/SMS. Contrôle navigateur du nouveau feedback NON PROUVÉ ; tests écran existants exécutés.
- MD5 banque40QCM `ef7b3e8bde9448c6104f4caa152aaa52`, banque39QRC `68c4e0ca8fbaf934211b8c55dde37a68`, inchangées.
- PDF Locale1 SHA256 `bc63ce163da539a9f340ded6f46d288f0c42e8ebc4ceb273bd6037f003a73c80` ; recueil `34199f2ea5dafe94bc54211f4f6cbab5d2a092e2fe01543faa7333cd3eef5d6c`.

Arbitrage nécessaire pour Q29 : confirmer le lieu réel de dépose du client et le guichet compétent, ou autoriser un corrigé explicitement conditionnel sans inventer ce lieu. Aucun changement d’énoncé proposé/appliqué.