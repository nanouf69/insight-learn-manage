# Comparaison module 7 — session TAXI/TA du 26 octobre au 16 novembre 2026

## Identité et périmètre
Recherche indépendante SOUICI, SOUISSI et Ahlem : le dossier est **SOUICI Ahlem**, parcours TA présentiel, inscrit dans la session `82b3a426-39d1-44f9-bfaa-d750c4575e8d`. Les dossiers SOUISSI trouvés portent d'autres prénoms : aucun rattachement/modification.

Les onze inscriptions de cette session sont hors liste d'attente. Dix listes explicites incluent le module 7 ; HADDOU utilise l'attribution par parcours TAXI (liste explicite nulle). SARKISIAN a type TAXI mais formation_choisie `vtc-exam` : anomalie de libellé enregistrée, non corrigée automatiquement. Le contenu module 7 n'est pas choisi par ce libellé dans le correctif.

## Sources et positions réellement vérifiées
| Identité | Titre / format | Nombre | Source/version | Position actuelle |
|---|---|---:|---|---|
| 7020 / module_7_exo_7020 | Métropole, choix multiples regroupés | 10 | JSON serveur, 28/10 10:45:14 UTC | Partie 32 |
| quiz_m7_58_communes_metropole_v1 | Métropole, une question par commune | 58 | code, 2026-10-28-m7-metropole-v1 | panneau de 7020 |
| 7021 / module_7_exo_7021 | ZUPC, choix multiples regroupés | 6 | même JSON serveur | Partie 33 |
| quiz_m7_communes_zupc_v1 | ZUPC, 23 communes + aéroport | 24 | code, 2026-10-28-m7-zupc-v1 | panneau de 7021 |
| 17/18/19/20/21 | Légende / Quartiers / Communes / Quiz / Carte | 0 question JSON (jeux externes) | JSON serveur | après les communes |

Le serveur contient 22 exercices, pas de tombstone exercice. Aucun doublon d'identifiant dans cette liste. Les séries 58/24 ne sont PAS copiées dans le JSON : ce sont deux activités différentes des quiz 10/6, pas des questions perdues. Les routes restent fondées sur 7020/7021, jamais sur 32/33.

## Tableau par élève — lecture au 29/10 vers 08:47–08:59 UTC
Session commune : TAXI/TA, 26 octobre–16 novembre. Colonnes M/Z : séries nouvelles 58/24. Pour **chaque ligne**, avant et après : anciennes identités 7020/7021, titres Métropole/ZUPC, 10/6 questions, statut soumis ; nouvelles identités et versions du tableau précédent, 58/24 questions, **contenu accessible identique**. Les états sont personnels, pas des contenus différents.

| Élève | Parcours | Questions snapshot module | 7020/7021 avant→après | M 58 avant→après | Z 24 avant→après | Changement d'affichage |
|---|---|---:|---|---|---|---|
| BEN ALI Mohktar | TA présentiel | 241 | soumis→inchangé | non soumis→inchangé | non soumis→inchangé | accès direct, ancien quiz distingué |
| BENKHELIL HASSEN | TAXI présentiel | 241 | soumis→inchangé | non soumis→inchangé | non soumis→inchangé | idem |
| CHEMOUN Mourad | TA présentiel | 241 | soumis→inchangé | non soumis→inchangé | soumis→inchangé | idem |
| Dakhlaoui Ilyes | TA présentiel | 241 | soumis→inchangé | non soumis→inchangé | non soumis→inchangé | idem |
| HADDOU MASSINISSA | TAXI présentiel | 241 | soumis→inchangé | soumis→inchangé | non soumis→inchangé | idem |
| HAMDI Mohamed | TAXI présentiel | 241 | soumis→inchangé | soumis→inchangé | soumis→inchangé | idem |
| MEMDOUH Ilies | TAXI présentiel | 241 | soumis→inchangé | soumis→inchangé | non soumis→inchangé | idem |
| Pndukyan Harutyun | TA présentiel | 241 | soumis→inchangé | non soumis→inchangé | non soumis→inchangé | idem |
| RAYMAN CIHAN | TA présentiel | 241 | soumis→inchangé | soumis→inchangé | soumis→inchangé | idem |
| SARKISIAN Pogos | TAXI présentiel | 241 | soumis→inchangé | soumis→inchangé | soumis→inchangé | idem |
| SOUICI Ahlem | TA présentiel | 282 | soumis→inchangé | soumis→inchangé | soumis→inchangé | idem |

« Non soumis » signifie absence de preuve finale de cette activité à l'heure de lecture, pas absence du quiz, ni absence de brouillon. Aucune note ou réponse d'Ahlem utilisée pour un autre élève.

## Différences normales et défauts
- Les 10 anciens snapshots de 241 questions ne comportent pas les 41 questions Musées ; celui d'Ahlem, enregistré le 29/10, en contient 282. **Différence de périmètre historique**, pas motif pour ajouter rétroactivement 41 obligations. Le cours actuel propose bien Musées 41 à tous.
- Tous sauf Ahlem ont un completed_at avant le 28/10 14:17 UTC, borne des nouvelles activités. Les 58/24 restent facultatives pour ces anciens achèvements ; pas de statut terminé fabriqué pour ces activités.
- Ahlem a quatre vides historiques Consulats, CIHAN/Pogos neuf vides historiques Métropole. Vérification exacte des clés : soumission entière 29/29 ou 10/10 couvre ces mêmes questions. La projection de preuves les résout sans toucher aux snapshots, notes ni dates. Une simple note faible n'est pas un manque.
- Défaut code prouvé : hydratation « serveur + source + suppressions explicites » et deuxième lecture d'ouverture « filtrage JSON brut » pouvaient se contredire (ex. tableau questions vide). Corrigé **module 7 seulement** en supprimant ce deuxième chemin d'affichage. Les protections de sauvegarde Admin restent intactes.
- Ambiguïté réelle : 58/24 et 10/6 apparaissaient côte à côte sans distinction suffisante. Ajout de « Quiz historique — 10/6 questions » et de deux accès directs. Les deux activités nouvelles gardent leurs propres identités, réponses et versions.
- Attribution de la course concurrente au navigateur spécifique d'Ahlem : **NON PROUVÉE**. Aucun enregistrement de ses requêtes/ancienne version navigateur disponible. La différence de versions chargées reste une hypothèse, pas un diagnostic affirmé.

## Correctif et vérifications
Fichiers : `ModuleDetailView.tsx`, règle locale AGENTS et test `module-completion-effective.test.ts`. Aucun changement pédagogique ou écriture de données de production.

- **PASS : 72 tests / 9 fichiers**, quiz 58/24, sélection identités, obligations historiques, mauvaises notes, quatre parcours, preuve entière, dates facultatives, activité facultative et sélection/ouverture émargement. Deux cas supplémentaires reproduisent les périmètres 7002 29 questions/4 vides et 7020 10 questions/9 vides : même soumission autorisée, nouvelle activité refusée comme preuve de l'ancien quiz.
- **PASS : clics navigateur**, aperçu Admin connecté avec données apprenant fictives interceptées en lecture seule : parcours TA puis TAXI ; bouton Revoir, ouverture réelle Métropole et ZUPC. 58/24 questions comptées dans chaque fenêtre, aucun résultat hérité de l'autre série. Deuxième parcours : clics sur les libellés de progression **Partie 32/33**, mêmes résultats.
- **PASS : téléphone 375 px**, ouverture Métropole 58, texte dans la fenêtre sans chevauchement. Captures vues, aucune erreur JavaScript.
- **PASS : compilation** dernière entrée build OK.
- **NON PROUVÉ : connexion véritable sous compte technique** (contrôle réalisé via aperçu Admin et dossier fictif, pas en se faisant passer pour Ahlem). Aucun envoi de réponse, mail, SMS ou correction IA.
- **NON PROUVÉ : intégration différée des deux réponses réseau dans les deux ordres**. La contradiction code est supprimée pour module 7, mais les tests de dataset/rendu ne sont pas ce test de course.

JSON serveur inchangé, updated_at 28/10 10:45:14 UTC et empreinte `f59ac79c3537a7e4f84aaa0e0396c9a4`. Aucun appel d'écriture réel émis. Les utilisateurs ont continué à travailler pendant l'audit : les empreintes globales de réponses/signatures ne sont donc pas une preuve d'immobilité durant toute cette fenêtre.

## Autres chantiers et production
- Réalisés : cas de vides historiques recouverts par preuve entière vérifiés pour cette session ; tests complétude repassés. Audit élève réel et règles facultatives globales restent ouverts, pas annoncés clos.
- Émargement −30 min : tests frontend repassés. Migration/fonction serveur ciblées déjà déployées ; affichage automatique encore non publié. Contrôle réel minuteur + conflit sous compte fictif reste ouvert.
- Deux échecs préexistants signalés : assertion source Promise.race et classification d'une feuille historique masquée. Non corrigés arbitrairement ici.
- **Pas de publication globale** : correctif visible dans l'aperçu uniquement ; les travaux inachevés ne sont pas embarqués. Aucune promesse de disponibilité de cette navigation sur gestion.ftransport.fr.