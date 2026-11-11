# EB3 TAXI — Haddou Massinissa et Memdouh Ilies, suivi du 11/11/2026

## Verdict

Les trois copies importées sont **effectivement visibles et manuellement notables dans Correction QRC V2 en production**. Aucun filtre ne les masque ; aucun correctif ni déploiement n’est nécessaire.

Aucune correction humaine définitive tracée n’a été trouvée pour les dix QRC concernées, sur leur copie, leur version et leurs réponses exactes. Les anciennes valeurs sont des propositions déterministes encore marquées `qrc_pending_correction=true`, pas des validations humaines.

Aucune note n’a été saisie ou modifiée. Aucune IA, aucun email, reset ou changement de contenu.

## Preuves base — mêmes copies uniquement

| Élève / matière | Tentative V2 importée | QRC en attente | Ancien total | Décomposition enregistrée | Validation humaine trouvée |
|---|---|---:|---:|---|---|
| Haddou — F(T) Réglementation nationale TAXI | `84dec7a6-b65b-4f60-81fc-ae52caef49d0` | 4 | 17,5 | 12 QCM + 5,5 propositions | Non |
| Memdouh — F(T) Réglementation nationale TAXI | `ef0769aa-c166-474f-acb4-c1b22646a891` | 4 | 15,5 | 11 QCM + 4,5 propositions | Non |
| Memdouh — G(T) Territoire et réglementation locale | `288f527f-8266-4c98-b9a3-f9aea12134de` | 2 | 16 | 12 QCM + 4 propositions | Non |

Pour les dix QRC : `etat=en_attente`, `note=NULL`, `corrige_par=NULL`, `corrige_email=NULL`, `corrige_at=NULL`.

Journaux contrôlés sans validation sur ces identifiants : `qrc_correction_events`, `qrc_historique_corrections`, `qrc_historique_liaisons_remise`, ancien `qrc_instances`, `audit_journal`, `audit_logs`, `examens_blancs_audit_log`, demandes de vérification et journaux IA. Le seul événement `audit_journal` des trois tentatives est `IMPORT_PASSAGE_FINALISE` le 11/11 à 10:18 UTC.

Les résultats historiques ne contiennent que les clés `correctionsIA`, `qrc_pending_correction`, `questions`, `reponses`, `snapshot` : ni `correctedBy`, ni `validatedByAdmin`, ni événement humain. Les remises `reponses_apprenants` exactes sont bien soumises, mais ne portent aucune correction humaine.

## Preuves sur l’écran réel de production

Navigation effectuée sur `https://gestion.ftransport.fr/admin/correction-qrc-v2` avec le compte admin injecté. Toutes les requêtes de notation ou mutation étaient bloquées par le harnais navigateur ; aucune n’a été émise pendant l’ouverture des QRC.

Parcours :

1. **Session TAXI et TA — Du 26 octobre au 16 novembre 2026** ;
2. **EB3-TAXI** ;
3. date **30/10/2026** (3 passages) ;
4. rechercher Haddou ou Memdouh ;
5. ouvrir une cellule rouge **À corriger** de F(T) ou G(T).

Lien direct revérifié :

https://gestion.ftransport.fr/admin/correction-qrc-v2?qrc_groupe=crm%3A82b3a426-39d1-44f9-bfaa-d750c4575e8d&qrc_eb=crm%3A82b3a426-39d1-44f9-bfaa-d750c4575e8d%3A%3AEB3-TAXI&qrc_date=2026-10-30

Constats réels :

- Haddou F(T) : une ligne, 4 boutons « À corr. /2 » ; panneau ouvert avec question, réponse élève, réponse officielle du snapshot, barème 2 et boutons 0 à 2.
- Memdouh F(T) : une ligne, 4 boutons « À corr. /2 » ; même panneau de notation manuelle.
- Memdouh G(T) : une ligne, 2 boutons « À corr. /4 » ; panneau ouvert avec barème 4 et boutons 0 à 4.
- Le rapprochement de l’écran indique 4 508 copies attendues, 4 508 visibles, 0 manquante.
- Les copies natives du 10/11 portent « Inscription croisée » et apparaissent aussi dans l’autre session ; les copies importées du 30/10 sont dans la session TAXI/TA qui couvre leur date. Il ne faut pas additionner les compteurs des deux sessions.

## Notes actuellement définitives

- **Haddou** : A 17,5 ; B 17,5 ; C 17 ; D 14 ; E 14 ; G(T) 16. F(T) reste réellement à corriger.
- **Memdouh** : A 18 ; B 13 ; C 15 ; D 16 ; E 12. F(T) et G(T) restent réellement à corriger.

Les anciens 17,5 / 15,5 / 16 ne doivent pas être promus en notes définitives sans validation humaine. Le correcteur existant permet maintenant de terminer ces corrections sans refaire celles des autres matières.
