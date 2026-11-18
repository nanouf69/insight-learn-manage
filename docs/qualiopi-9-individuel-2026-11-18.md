# Audit individuel Qualiopi 9, complément 10/11 — 18 novembre 2026

## Périmètre et méthode
Lecture individuelle des inscriptions et du contenu réel des mails, pas déduction par objet seul. Sources : `emails.subject`, `body_html`, `body_preview`, `apprenant_id`, `recipients`, `sent_at`, `email_accuse_id` ; `session_apprenants.id`, `session_id`, `date_debut/date_fin` ; `sessions.type_session`, dates et horaires ; `apprenant_documents_completes.donnees`, `documents_a_signer`, `email_accuses`, `email_confirmations_reception` et `apprenant_questions`.

804 inscriptions inventoriées. 553 inscriptions de formation retenues pour 354 apprenants ; 251 lignes exclues (sessions examen seules, attente, comptes techniques ou retirés). Les périodes pratiques distinctes restent distinctes. 2 950 dossiers actifs n'ont aucune inscription : absence de rattachement, pas preuve d'absence de prestation ni de conformité. Les dossiers sans session peuvent avoir une référence d'accueil au dossier, jamais une session fabriquée.

Dates de convocation recherchées uniquement dans la partie consacrée au déroulement de la formation, avant les dates d'examen ; identifiants apprenant et inscription conservés. Une adresse destinataire ne rapproche un mail non lié que si elle désigne un dossier unique ; 92 mails candidats ainsi récupérables, 12 mails à identité ambiguë non affectés. Aucun rapprochement par le nom seul. Les formations/date/horaires contradictoires nécessitent une revue ; une date compatible ne garantit pas la justesse de toutes les informations du mail.

## Résultats finaux relus en SQL
Les catégories peuvent se recouper : elles ne s'additionnent pas. Les acceptations et dossiers signés sont des preuves **au dossier**, non des signatures répétées pour chaque inscription.

| Constat | Inscriptions | Apprenants distincts concernés |
|---|---:|---:|
| Convocation envoyée avant le premier jour, lien non ambigu | 150 | 149 |
| Information/convocation après le premier jour | 5 | 5 |
| Envoi le jour du début, antériorité horaire non établie | 6 | 6 |
| Acceptation RI au dossier | 215 | 127 |
| Dossier de bienvenue finalisé signé au dossier | 126 | 77 |
| Pas de référence 9 identifiable parmi les sources retenues | 186 | 127 |
| Pas de convocation rattachable sans ambiguïté à cette session | 398 | 283 |
| Plusieurs inscriptions compatibles, aucun choix automatique | 12 | 6 |

Les 186 lignes ne prouvent pas une absence absolue d'information : les mails non rapprochables, pièces non inspectables et archives restent à examiner. Les 398 lignes incluent la pratique et des dossiers pourtant informés/signés ; ne pas les qualifier globalement de « sans preuve ». 317 inscriptions / 205 apprenants ont un accueil au dossier, sans antériorité à la session présumée. 4 inscriptions / 2 apprenants ont un dossier de bienvenue sans signature probante ; ne pas les qualifier de dossier signé.

Deux lectures indépendantes ont d'abord produit 152 puis 150 antériorités : quatre mails ont des dates compatibles avec deux inscriptions (et des libellés VTC/TAXI contradictoires). La relecture SQL, plus prudente, est retenue : ces cas sont explicitement non attribués. Noms et identifiants d'exceptions uniquement dans le tableau privé, pas dans ce rapport.

## Enregistrements effectifs
832 nouvelles références, 832 liens, zéro doublon de source avec les anciennes preuves et zéro référence orpheline.

| Indicateur | Avant | Ajouts | Après |
|---|---:|---:|---:|
| 9 | 4 | 798 | 802 |
| 10 | 6 | 28 | 34 |
| 11 | 10 | 6 | 16 |

9 : 241 mails de convocation datés (235 avec une inscription candidate, 6 avec plusieurs), 311 accueils au dossier, 131 acceptations RI (une déjà présente non dupliquée), 115 dossiers signés. Références exactes aux lignes sources et dates, sans copie de nom, adresse, réponses, signatures ou tokens. Les envois en double dans l'historique restent distincts comme événements, aucun historique n'est supprimé ; une source n'est référencée qu'une fois.

10 : 26 derniers rappels pédagogiques individuels et 2 questions avec réponse effective du centre. Preuve de suivi enregistré seulement : aucune efficacité, adaptation personnalisée ou validité des mentions juridiques des mails présumée. Les notifications automatiques de correction ne sont pas utilisées comme preuve d'accompagnement humain.

11 : 6 formulaires `evaluation-acquis` réellement `completed`, toutes les compétences renseignées. Évaluateur, session et date pédagogique non documentés : les 6 `date_preuve` restent vides ; la création/mise à jour technique n'est pas une date d'évaluation. Aucun verdict ou note copié/modifié. Les bilans et notes déjà référencés restent intacts.

## Remise, pièces et archives
393 mails de tout le catalogue déclarent des pièces jointes ; le booléen `has_attachments` n'est pas une pièce lisible. Aucun des mails nouvellement retenus ne comporte de pièce jointe déclarée. Aucun fichier joint ou archive créé : 0. `documents` ne contient aucune ligne. Les documents d'inscription comportent notamment 94 références d'émargement et 40 attestations FC, mais ce sont des preuves de présence/attestation, pas de remise du livret préalable. Aucune identité ou pièce médicale copiée.

28 documents à signer, dont 19 avec texte figé, inventoriés ; aucun de leurs intitulés ne permet d'identifier une convocation/livret/RI dans cette source. Pas de remplacement d'archive. 252 mails du catalogue liés à un accusé, 151 liens de confirmation mais **0 confirmation enregistrée** ; les mails retenus n'ont ni remise ni réception confirmée. `opened_at` et `is_read` ne sont pas une réception attestée. Une réponse entrante peut prouver un échange, pas la réception de tous les documents ni une signature du dossier.

## Contrôles et limites
- Relecture en base : 798/28/6 ajouts, 802/34/16 liens finaux, 0 fichier, 6 dates inconnues maintenues, états 9/10/11 inchangés.
- Les empreintes avant/après sont identiques : emails 15 957 (`3a4d41cfb17cdef3838148f49f80c37b`), dossiers 1 867 (`a9cb1d97af0310d45bf18720588458b2`), notes 7 740 (`a8c674ed3164668b26dec0b7ee2476ea`), inscriptions 804 (`80e65af45da04c46745c23202f612557`).
- Première commande refusée (colonne ambiguë), 0 écriture confirmée ; seconde commande réussie après qualification. Script SQL voisin correspond à la commande corrigée. Pas de fonction, migration ou règle d'accès modifiée.
- Contrôle connecté a révélé une lecture tronquée à 1 000 preuves/liens : pagination stable ajoutée aux deux sources, erreur de page bloquante plutôt que faux résultat vide. 18 tests exécutés (lecture complète + indicateurs 6/7).
- Vérification connectée finale sur `/?section=qualiopi` : 1 149 preuves relues, compteurs 802/34/16 identiques à SQL ; page Qualiopi visible. Le correctif d'affichage est en aperçu, non publié ; les références documentaires sont déjà enregistrées dans Cloud. Le site publié peut encore tronquer ses lectures tant que ce correctif n'est pas publié.
- Aucun envoi, aucune publication, aucune modification des sources, des notes/résultats ou des statuts de conformité.

## Suites recommandées
Revue privée des dates/libellés contradictoires, des inscriptions multiples et des mails sans session ; retrouver les originaux des pièces annoncées et la version effectivement remise. Documenter la remise préalable réelle, les adaptations mises en œuvre et leur suivi, la date/évaluateur et la correspondance objectifs-critères de chaque évaluation. Ne pas recréer rétroactivement les événements manquants.

## Demandes antérieures
6/7 : 4/1 références, toujours 0 original joint ; quatre DOCX et planning TAXI non accessibles, blocage inchangé. 8 : 239 références totales, dont 234 annotations d'admission ; 93 dépôts signés pour 64 apprenants et 141 exceptions, aucune date de décision inventée. Rien modifié dans ce lot.