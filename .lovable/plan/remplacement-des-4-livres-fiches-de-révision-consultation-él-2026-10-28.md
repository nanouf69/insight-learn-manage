# Remplacement des 4 livres « Fiches de révision » — consultation élève sans téléchargement

## Constat (lecture seule, 28/10)
- Modules concernés : 70 VTC, 71 TAXI, 72 TA, 73 VA (Fiches révisions). Chaque formation a un seul module, partagé par ses variantes présentiel et e-learning : pas de croisement TAXI/TA ni VTC/VA possible si l'on garde ce rattachement.
- Les livres actuels sont des fichiers publics : toute personne qui a le lien peut les télécharger. Le module VA dit même « à consulter et télécharger ».
- Nouveaux fichiers lisibles : TAXI 112 pages, VTC 87 pages, TA 52 pages, VA 27 pages.

## Ce qui change pour l'élève
- Dans son module Fiches de révision, il lit le livre de SA formation page par page (images des pages, zoom, adapté mobile/tablette).
- Aucun bouton télécharger, imprimer ou ouvrir l'original. Le PDF d'origine ne lui est jamais envoyé.
- Chaque page vient d'un lien qui expire au bout de quelques minutes. Il n'est accordé qu'après vérification par le serveur du compte et de la formation.
- Limite assumée : une capture d'écran reste possible ; on ne peut pas l'empêcher.

## Ce qui change pour l'admin
- Consultation identique, plus un bouton « Télécharger le PDF original ». Le serveur vérifie le rôle admin et refuse un élève ou un visiteur non connecté.

## Étapes
1. Espace de stockage privé « livres-formation » : PDF originaux et pages rendues en images (150 dpi), une version datée par livre.
2. Fonction serveur `livre-formation` :
   - pages : identifie l'utilisateur, vérifie admin OU élève dont la formation correspond (vtc / taxi / ta / va, variantes e-learning comprises), puis renvoie les liens courts des pages ;
   - original : réservé aux admins ; refusé (403) pour élève et anonyme.
3. Visionneuse `LivreFormationViewer` dans les modules 70–73, à la place des liens actuels. Les fiches « Télécharger le livre » déjà inactives restent inactives. Le texte VA « et télécharger » est corrigé.
4. Retrait des anciens fichiers publics, seulement après avoir vérifié qu'aucune autre page, aucun mail et aucun autre projet ne les utilise. S'il reste un doute, je vous le signale avant de supprimer quoi que ce soit.
5. Audit des 4 livres comparés aux Définitions, aux Bilans QRC et aux corrigés de la même formation. Livrable : un tableau « avant / après / page source / formation / justification ». En cas de contradiction réglementaire, je vérifie la source officielle actuelle et je vous la signale au lieu de recopier le PDF.
6. Corrections des définitions et QRC : uniquement celles que l'audit justifie, enregistrées comme nouvelle version pour les futures tentatives. Les réponses, notes, tentatives, modules terminés et jalons existants ne sont ni renotés ni rouverts.

## Contrôles avant livraison
- Nombre de pages rendues identique à chaque PDF (112 / 87 / 52 / 27).
- Comptes de test : élève TAXI → TAXI seulement ; élève TA → TA seulement (refusé sur TAXI) ; élève VTC et élève VA idem ; anonyme refusé ; admin peut lire et télécharger.
- Élève qui demande l'original : refus côté serveur.
- Lecture sur mobile, tablette et ordinateur ; tests ciblés et build.

## Publication
- Rien n'est publié tant que tout n'a pas été vérifié. La publication se fait pour tout le projet en une fois : elle emporterait aussi les travaux encore en attente (reprise de matière, calendrier des devis, correctif connexion, protection quiz Musées). Je vous redemanderai votre accord avant de publier.
- Les quiz Musées sont déjà corrigés en production (41 questions). Le correctif du bouton de connexion attend toujours un test en conditions réelles : il faut d'abord valider l'approbation de session technique.

## Détails techniques
- Pages pré-rendues ici avec `pdftoppm` et envoyées dans le stockage privé sous `livres/{formation}/{version}/page-NNN.jpg`, avec `original.pdf` et un `manifest.json` (nombre de pages, empreinte sha256).
- La fonction vérifie le jeton dans son code (`getClaims`), le rôle via `has_role` et la formation via `apprenants.type_apprenant` / `formation_choisie`, sans tenir compte de la casse et en retirant le suffixe e-learning. Elle crée des liens signés de 120 s par page, par paquets de 10.
- Aucune table élève n'est modifiée ; les nouvelles versions QRC/définitions suivent les règles existantes (identifiants immuables, révision journalisée).
