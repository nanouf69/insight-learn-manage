# Audit global EB — 09/11/2026, 16:10–16:20 UTC

## Intervention
Lecture seule des tables réelles. Aucun UPDATE/INSERT/DELETE, migration, correction de note, réponse ou signature. Correctifs de code en aperçu uniquement. Publication non effectuée.

## Couverture réellement lue
Toutes les lignes correspondant aux 24 identités `EB1`–`EB6`, `-TAXI`, `-TA`, `-VA`, sans filtre élève/date/session. Les données présentes couvrent 12 identités VTC/TAXI ; aucune ligne TA/VA sous ces identités. Les comptes de démonstration restent inclus dans les décomptes.

| Mesure | Total |
|---|---:|
| Résultats matière historiques | 5 848 |
| Élèves distincts | 191 |
| Groupes élève/examen/numéro de tentative enregistré | 1 025 |
| Tentatives matière V2 | 2 545 |
| Tentatives matière V2 en cours | 41 |
| Résultats V2 définitifs, zéro QRC restante | 2 348 |
| Résultats V2 avec QRC restantes | 148 |
| Tentatives V2 sans résultat | 49 |
| Drapeaux historiques QRC en attente | 958 |
| Lignes techniques auto_created + needs_recompute sans questions | 381 |
| Ancien registre pilote : QRC en attente | 476 |

Les groupes de numéros enregistrés ne prouvent pas une identité globale immuable d'examen. Les catégories ne sont pas à additionner.

### Répartition de toutes les tentatives historiques
| Examen | Résultats matière | Élèves | Groupes tentative |
|---|---:|---:|---:|
| EB1 VTC | 1709 | 156 | 314 |
| EB1 TAXI | 200 | 25 | 39 |
| EB2 VTC | 1098 | 126 | 196 |
| EB2 TAXI | 210 | 23 | 36 |
| EB3 VTC | 704 | 92 | 125 |
| EB3 TAXI | 123 | 16 | 24 |
| EB4 VTC | 591 | 67 | 96 |
| EB4 TAXI | 105 | 12 | 21 |
| EB5 VTC | 524 | 52 | 78 |
| EB5 TAXI | 89 | 12 | 16 |
| EB6 VTC | 421 | 50 | 66 |
| EB6 TAXI | 74 | 10 | 14 |

## Causes de non-remontée / contradiction prouvées
1. **CRM ne sélectionnait pas `tentative`** : le sélecteur commun recevait toutes les tentatives comme T1. La nouvelle lecture transmet toutes les colonnes, y compris ce champ et `reussi`.
2. **Ancienne tentative remplaçait une matière déjà présente dans la dernière** : le backfill appelait `pickBestScoreRow` par date même pour une matière déjà sélectionnée. Test de reproduction échoué puis réussi après suppression de ce remplacement. Le complément des matières réellement absentes reste inchangé, conformément au contrat existant ; aucun historique fusionné en base.
3. **Ancien pilote QRC bloquait toutes les tentatives du même examen/matière** : lecture désormais porte `attempt_id` ; carte/détail comparent l'identifiant déterministe déjà utilisé lors de l'enregistrement pour le numéro de tentative sélectionné. Numéro inconnu = blocage conservateur conservé ; __core toujours prioritaire. Cela ne corrige aucune QRC.
4. **Détail conservait la ligne historique capturée à l'ouverture** : les événements relisent désormais les résultats et rafraîchissent seulement les mêmes `resultId`/examen/matière. Une nouvelle tentative ne remplace pas la copie ouverte.
5. **Lectures historiques non paginées** : carte/Notes/CRM/détail passent par la même lecture complète ordonnée par PK et paginée par 1000. Échec de page = aucun tableau partiel. Aucun élève réel n'a >1000 résultats à cet audit : ce défaut est préventif, pas une cause réelle de disparition démontrée ici.
6. **Détail omettait les remises à zéro** : même sélection reset-aware que carte/CRM, lecture refusée = aucun affichage inventé.
7. **Rafraîchissement disparate** : correctif préparé au tour Zine inclus, événements historiques aussi ; aucun polling ajouté.

## Cas nominatifs détectés par comparaison des sélections
Après exclusion des placeholders et prise en compte des cutoffs, comparaison SQL dernier numéro versus dernière date : **17 matières candidates, 8 ensembles, 7 élèves**. Ce sont des écarts de sélection, pas 17 faux verdicts certifiés ; `pickBestScoreRow`, les preuves de soumission et de contenu peuvent encore influencer certains cas.

| Élève | Examen | Matières candidates |
|---|---|---|
| Jérôme antignac | EB1 | T3P |
| Kamel BOUDJORF DOUBAA | EB1 | Français |
| Naime GHEZZAL | EB1 | G(V) |
| Kaltrina HASANI | EB3 | G(V) |
| Hugues MASUDI | EB1 | T3P |
| Aymen MOHSEN | EB1 | Gestion, Sécurité |
| Moumouni SAWADOGO | EB1 | T3P, Sécurité, Français, Anglais, F(V), G(V) |
| Moumouni SAWADOGO | EB2 | Français, Anglais, F(V), G(V) |

Cas test antignac : T2 `04298836-81c2-4bce-b70c-4d95095f5c19` ne doit pas être remplacée par T1 `18ec0ab4-eac6-4952-a935-de8ee68dedef` simplement parce que cette ligne porte une date ultérieure. Aucun verdict nominatif inventé à partir de ces seuls IDs.

## État des preuves anciennes
- 1 472 liens par `source_historique.result_id` ; 1 305 fiches identiques, **167 fiches différentes**. Aucune attribution V2 forcée sur les différences.
- Parmi ces liens : 242 drapeaux anciens en attente malgré un résultat V2 définitif ; 141 différences de note ancienne/V2. Ces chiffres ne prouvent pas une anomalie visible : l'identité/contenu doivent être vérifiés avant substitution, et le code commun le fait.
- 0 résultat déclaré définitif avec QRC en attente ; 0 désaccord compteur QRC entre table et dernier résultat.
- 1 ancien résultat V2 définitif invalide (score NULL, total 0) : Thierno Diallo EB3, `3876fbf8-7eec-4705-9d03-1c0a573d20d2`. Ne doit pas devenir une note/réussite.
- 5 passages natifs terminés sans aucune ligne historique de la même matière identifiée par le snapshot, dont 4 présents dans la requête avec dernier résultat : comptes Test VTC DEMO et ESSAI IA FICTIF ; pas de données d'élève réel créées pour les rendre visibles.
- Les 167 fiches différentes concernent notamment BARRY Mahmoud EB2, BELLAKEHAL Mohammed EB2, BEN TOURKIA Mohamed EB2, BOUDJORF DOUBAA Kamel EB2, Bouguessa Fethi EB2/EB3, Calvo Enzo EB1, CATANIA Léa EB3, Diallo Thierno EB3, DIOP Bernard EB2, FERREIRA David EB3-TAXI, HASAINE Mohammed EB1-TAXI, HUSSAIN KHAIL Noor EB2, inacio nicolas EB2, KEBBAB Mehdi EB2, KESKAS Khelifa EB2, LABIOD Riyad EB2, MAHROUG Amor EB2, MOHSEN Aymen EB2, MTIMET Chokri EB2, NESAR Abdullbaset EB2, Ouerfelli Isam EB2, PANDA GBIANIMBI Auguste EB2, SAWADOGO Moumouni EB1/EB2/EB3, SBOUI Dhia EB2, SILLA Gils EB2, sinine arou Souleyman EB1, TENGUE Nunangnon EB2, VALENTIN Lea EB5-TAXI, ZAOUI Hakim EB2. Différence de JSON ≠ copie incorrecte : aucune mutation.

## Tests et site public
- **109 tests PASS**, 13 fichiers : matrice 24 définitions/108 matières source, Zine, seuils, QRC attente, source unique, identité native, 2501 lignes/3 pages, panne seconde page, correction tardive même ID, ancienne tentative, réponses hors ligne.
- Build automatique OK après changements.
- Parcours aperçu avec données réelles, en consultation admin puis Vue apprenant : Zine EB1 réussi 10,7 ; Moumouni SAWADOGO : EB1 échoué, EB2 échoué **10,6 avec D éliminatoire**, EB3 attente, EB4 réussi, EB5 échoué, EB6 réussi ; six badges CRM concordent visuellement avec six cartes. Il ne faut pas transformer son EB2 en réussite pour sa seule moyenne.
- Sessions personnelles des 191 élèves : NON VÉRIFIÉES. Ce n'est pas une comparaison live exhaustive de toutes leurs interfaces/tentatives.
- Public recontrôlé : `/assets/index-BNKO-425.js`, version déjà observée du commit a5945bd815c2d5e5f89b74f542310e020408d89a. Les trois anciens correctifs sont bien publiés ; absence de publication exclue comme cause générale. Un onglet personnel ancien n'est pas vérifié.
- Nouveaux correctifs de ce rapport : **NON PUBLIÉS**.

## Limites / chantiers non résolus
Inventaire exhaustif SQL réel effectué, mais rejeu fonctionnel exhaustif de chaque ancien passage avec configuration live/proofs et toutes les interfaces NON PROUVÉ. Aucun total fiable de verdicts opposés restants n'est annoncé. Les anciennes copies sans preuves, 167 divergences, QRC réellement en attente, passages sans résultat, définition live 112 versus matrice source 108, restauration après reload et erreurs de lecture nécessitent encore des contrôles. Aucun recalcul stocké effectué. La remontée/notation globale dans le correcteur V2 reste un chantier serveur séparé non autorisé ici.