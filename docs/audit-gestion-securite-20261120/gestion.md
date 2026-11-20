# Audit sémantique exhaustif GESTION — snapshot serveur réel

## TL;DR
Cinq transferts locaux strictement justifiés par module (10 occurrences pour modules 2 et 10), après hydratation **45/58/43** : exercice 62 Q8 → partie 2, Q32 → partie 1, Q46 → partie 2, Q53 → partie 1, Q54 → partie 2. **Ex61 Q28/Q30 restent en partie 2**, couverture exacte slide 19. Aucun transfert depuis exercice 60. Les autres questions restent, même lorsqu’une autre partie les traite aussi. Les cas sans preuve suffisante sont explicitement conservés/incertains. Aucun fichier projet ni snapshot source n’a été modifié.

## Périmètre, preuves et méthode
- Entrées : `/tmp/gestion-securite-audit/modules-before.json`, les deux `questions-2.txt` et `questions-10.txt`, et les trois vrais PPTX avec leurs extractions `.pptx.txt`. Les listes questions ont été confrontées aux objets JSON (énoncés, toutes propositions et indicateurs corrects, images, métadonnées et tombstones).
- Toutes les diapositives ont été lues : P1 **36**, P2 **22**, P3 **27**, soit **85**. Les numéros cités sont les positions physiques `DIAPOSITIVE`, non les numéros imprimés anciens (ex. P3 slide 13 imprime « 36e »). Les références texte indiquent la ligne portant le texte de la diapositive.
- Identité : les questions brutes Gestion des deux modules sont identiques champ pour champ, sauf Q49 de l’exercice 62 présent uniquement en module 10 et tombstoné. Titres de cours/exercices ne servent pas de preuve de périmètre : P1 contient réellement toute la comptabilité et une partie du social; P2 traite réellement marge et BIC.
- Données : 148 questions brutes module 2 (45/58/45), 149 module 10 (45/58/46). Après tombstones : **146 actives par module**, soit 292 dispositions actives. Ce rapport groupe les deux modules pour éviter duplication; le JSON donne une disposition par occurrence brute.
- QRC : recherche récursive de clés QRC/ouverte/réponse/corrigé dans tout JSON sans résultat. Aucun champ QRC, aucun exercice Gestion séparé de QRC : les seules clés questions Gestion sont `id,enonce,choix,image,imageSize,_editedAt,manually_edited`. Les formulations « Citez », « Définir », etc. sont stockées avec `choix`, et sont incluses. On ne peut pas auditer des QRC non présentes dans ce snapshot.
- Critère conservateur : on transfère seulement lorsqu’une compétence décisive manque à la partie source et qu’une autre partie la documente explicitement. Une simple mention voisine n’est pas une explication; inversement une vraie couverture partagée interdit le transfert. Une erreur de correction ou une formulation juridique contestable n’autorise pas un reclassement inventé.
- Les ancres JSON utilisent des sélecteurs stables `module_id/exerciseId/questionId`, pas des numéros de ligne artificiels (snapshot compact). Voir chaque table et le JSON machine pour l’énoncé exact et le sélecteur.

## Tombstones — ne pas réintroduire ni transférer
`deletedQuestionIds` des deux modules : exercice 60 `[47]`; exercice 61 `[24,38,57,62]`; exercice 62 `[42,40,41,49]`. Q40 (FR) et Q41 (trésorerie) existent encore dans les deux tableaux bruts, mais sont exclues. Q49 (crédit-bail) existe seulement dans le brut module 10 et est exclue. Q42 de 62, Q47 de 60, Q24/38/57/62 de 61 sont déjà absentes des tableaux bruts. Les absences ne doivent pas devenir des questions à recréer. Les questions FR/trésorerie tombstonées étaient bien couvertes P3 s25, mais cela ne change pas leur exclusion.

## Transferts strictement justifiés


### Exercice 62, Q8 — P3 → P2 (modules 2 et 10)
**Énoncé :** Comment se calcule le BIC imposable pour le régime en micro-entreprise ?

**Source :** TRANSFERT P2 : P3 traite versement libératoire, pas abattement micro-BIC 50%; P2 s12–13 donne explicitement calcul abattement 50%. Ancres : `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`).

**Destination exacte :** `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`).


> Régimes d'imposition Micro · Réel simplifié · Réel normal · Franchise en base de TVA  37 Un régime d'imposition détermine comment calculer votre bénéfice imposable et à quelle fréquence déclarer la TVA. Le régime applicable dépend de votre chiffre d'affaires (seuils 2026, arrêté du 27/01/2026). 💶 Seuils de chiffre d’affaires (HT) Micro-entreprise : jusqu’à 83 600 € (prestations de service) Réel simplifié : de 83 600 € à 286 000 € Réel normal : au-delà de 286 000 € Franchise en base de TVA : jusqu’à 37 500 € (seuil majoré 41 250 €) 📋 Obligations et cotisations Micro : pas de bilan, abattement forfaitaire 50% (services), ~22% de cotisations Réel simplifié : 1 déclaration TVA annuelle + 2 acomptes, ~45% du bénéfice Réel normal : 12 déclarations TVA mensuelles, comptabilité d’engagement complète 


> Régimes d'imposition — Tableau comparatif Micro, réel simplifié, mini-réel, réel normal, franchise en base  37b 


### Exercice 62, Q32 — P3 → P1 (modules 2 et 10)
**Énoncé :** A partir de quel montant, un artisan VTC ou TAXI doit-il faire une facture (ou une note)

**Source :** TRANSFERT P1 : facturation quel que soit montant absente P3; P1 s22 explicite si client demande, sinon seuil 25 € TTC particulier; question manque cette condition. Ancres : `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 14 (`GESTION_3SUR3_v12.pptx.txt:41`).

**Destination exacte :** `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`).


> Autres obligations essentielles de l'entrepreneur Conservation des factures et dépôt des comptes annuels  14b Deux obligations essentielles, trop souvent oubliées : la conservation des factures et, pour les sociétés, le dépôt des comptes annuels au greffe. 🗂️ Conserver les factures 10 ans Toutes les factures (achats et ventes) doivent être conservées pendant 10 ANS à compter de la clôture de l'exercice. Ce délai s'applique aussi aux autres pièces : livre-journal, grand livre, relevés bancaires professionnels. En cas de contrôle fiscal, l'administration peut demander ces documents sur toute cette période. Sanction : absence de justificatif → charge réintégrée, TVA non déductible, voire amende. Facture ou note :  un artisan VTC ou TAXI doit en remettre une quel que soit le montant si le client la demande (obligatoire d'office dès 25 € TTC pour un particulier, et toujours pour un client professionnel). 🏛️ Déposer les comptes au greffe Obligatoire pour toutes les SOCIÉTÉS (EURL, SARL, SASU, SAS, SA) — pas pour les entreprises individuelles. Dépôt au greffe du tribunal de commerce dans le mois suivant l'approbation des comptes (2 mois si dépôt électronique). Sanction : amende jusqu'à 1 500 € (3 000 € en récidive) et injonction possible sous astreinte. 


### Exercice 62, Q46 — P3 → P2 (modules 2 et 10)
**Énoncé :** Quels impôts et taxes sont obligatoires en tant que professionnel ?

**Source :** TRANSFERT P2 : cotisations sociales citées source, mais CET non enseignée; P2 s16 définit CET=CFE+CVAE et s19 cotisations. Réponse catégorielle/obligation à nuancer selon exonérations. Ancres : `GESTION_3SUR3_v12.pptx`, slide 5 (`GESTION_3SUR3_v12.pptx.txt:14`); `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`).

**Destination exacte :** `GESTION_2SUR3_v12.pptx`, slide 16 (`GESTION_2SUR3_v12.pptx.txt:47`); `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`).


> CFE et CET À payer chaque année par toute entreprise  39 La CFE (Cotisation Foncière des Entreprises) est un impôt local. La CET (Cotisation Économique Territoriale = CFE + CVAE) remplace l'ancienne Taxe Professionnelle. 🏛️ CFE — Cotisation Foncière Impôt local versé à la commune. Son montant dépend : • avec un local :  de sa  valeur locative  (surface, emplacement)  × le taux voté par la commune ; • sans local : du  chiffre d'affaires  → on paie une cotisation minimum. Les véhicules et le matériel n'entrent pas dans le calcul. Même avec une simple boîte aux lettres (domiciliation), la CFE minimum est due. Exonération la 1ère année, base réduite de 50 % la 2e année, et exonération si CA ≤ 5 000 €. Taxi : exonération si propriétaire de 1 ou 2 voitures ≤ 7 places (art. 1453 CGI) 📊 CET — Cotisation Économique Territoriale Définition : la CET regroupe deux impositions locales — la CFE (part foncière) et la CVAE (part valeur  ajoutée ). La CVAE (Cotisation sur la Valeur Ajoutée) est due uniquement si CA > 500 000 € HT Affectée aux collectivités territoriales (communes, départements,  régions ) Pour un VTC/Taxi standard : seule la CFE s'applique — la CVAE ne concerne pas les petites structures. 


> Les régimes sociaux TNS vs Assimilé salarié — qui cotise comment ?  41 👷 TRAVAILLEUR NON SALARIÉ (TNS) Qui ? EI, Micro, gérant majoritaire SARL, associé unique EURL Cotisations ~45% du bénéfice (BIC) Maladie Remboursements identiques, IJ après 1 an de cotisation Retraite ~45% du dernier salaire (moins favorable que salarié) Fiche de paie NON — pas de fiche de paie, pas de chômage (sauf option payante) 🏢 ASSIMILÉ SALARIÉ Qui ? Gérant minoritaire/égalitaire SARL, Président SASU/SAS, PDG SA Cotisations ~80 % du salaire net versé Maladie Remboursements + indemnités journalières dès le 1er jour Retraite ~75% du dernier salaire (identique à un salarié) Fiche de paie OUI — bulletin de salaire obligatoire (mais pas de chômage pour un dirigeant) 


### Exercice 62, Q53 — P3 → P1 (modules 2 et 10)
**Énoncé :** Citez deux régimes sociaux

**Source :** TRANSFERT P1 : source évoque couverture/général mais pas régime agricole; P1 s6 oppose explicitement régime général et MSA agricole. P2 s19–20 ne donne que TNS/assimilé, pas agricole. Ancres : `GESTION_3SUR3_v12.pptx`, slide 9 (`GESTION_3SUR3_v12.pptx.txt:26`); `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`).

**Destination exacte :** `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`).


> Pourquoi connaître sa catégorie ? La catégorie détermine deux choses essentielles  6 Selon que vous soyez artisan ou commerçant, vous ne créerez pas votre entreprise au même endroit et vous ne dépendrez pas de la même caisse sociale. 🏛️ Lieu de création Artisan → Chambre des Métiers et de l'Artisanat (CMA) Commerçant → Chambre de Commerce et d'Industrie (CCI) Libéral → Ordre professionnel ou URSSAF Agriculteur → Chambre d'Agriculture 💳 Caisse sociale Artisan, commerçant, libéral non réglementé  → Sécurité Sociale des Indépendants (SSI), intégrée au régime général :  maladie via la CPAM, retraite via l'Assurance retraite (CARSAT). Profession libérale réglementée  (architecte, ostéopathe, moniteur de ski…) → CIPAV pour la retraite,  régime général pour la  maladie . Agriculteur (exploitant agricole) →  MSA (Mutualité Sociale Agricole), qui gère maladie ET  retraite . Dans tous les cas, les cotisations sont recouvrées par l'URSSAF. Important : cela impacte directement le montant de vos cotisations. 


## Disposition exhaustive des questions actives
Chaque ligne vaut pour **les deux modules**, et constitue un identifiant exact dans le JSON source. « Conserver » ne certifie pas la vérité juridique : les lacunes sont signalées séparément.


### Exercice 60 — partie 1
| Q | Énoncé exact | Disposition / pertinence source | Preuve source |
|---|---|---|---|

| 1 | Qu'est-ce que le compte de résultat pour une entreprise ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 23 (`GESTION_1SUR3_v16.pptx.txt:68`); `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 2 | Choisir parmi les éléments suivants, les dépenses qui constituent des charges : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 25 (`GESTION_1SUR3_v16.pptx.txt:74`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 3 | Le compte de résultat montre : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 23 (`GESTION_1SUR3_v16.pptx.txt:68`); `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 4 | À l'actif du bilan figure : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 5 | Un exemple de charges d'exploitation : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 25 (`GESTION_1SUR3_v16.pptx.txt:74`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 6 | Un exemple de charges financières : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 25 (`GESTION_1SUR3_v16.pptx.txt:74`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 7 | Un exemple de produit d'exploitation : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 25 (`GESTION_1SUR3_v16.pptx.txt:74`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 8 | Dans le bilan de l'entreprise, le véhicule figure : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 9 | Quel élément ne se trouve pas au passif d'un bilan ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 10 | Les dettes à court terme sont un poste : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 11 | Dans un bilan : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 12 | Les dettes fiscales et sociales de l'entreprise sont reprises : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 13 | La Trésorerie/Disponibilités/Banque figure : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 14 | Quelle est la définition du bilan ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 15 | De quoi est composé le bilan ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 27 (`GESTION_1SUR3_v16.pptx.txt:80`); `GESTION_1SUR3_v16.pptx`, slide 28 (`GESTION_1SUR3_v16.pptx.txt:83`); `GESTION_1SUR3_v16.pptx`, slide 29 (`GESTION_1SUR3_v16.pptx.txt:86`); `GESTION_1SUR3_v16.pptx`, slide 30 (`GESTION_1SUR3_v16.pptx.txt:89`) |

| 16 | En tant que micro-entrepreneur inscrit comme chauffeur VTC ou TAXI, j'agis en tant que : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 7 (`GESTION_1SUR3_v16.pptx.txt:20`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`) |

| 17 | Qu'est-ce qu'une SARL ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 18 | Quel est le capital minimal pour une S.A.S. ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 19 | Combien y a-t-il d'associés minimum dans une SARL ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 20 | Le capital social d'une SARL est au minimum de : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 21 | Je peux créer une Société par Actions Simplifiée avec un seul associé. Cela s'appelle : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 22 | Une entreprise individuelle est obligée de déposer ses comptes tous les ans au greffe du tribunal de commerce. | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`) |

| 23 | En EURL, la responsabilité est engagée en cas de faute grave de gestion(abus de biens sociaux, négligence des obligations sociales ou fiscales, comptabilité frauduleuse... ) ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 18 (`GESTION_1SUR3_v16.pptx.txt:53`) |

| 24 | Combien d'associés possède une EURL ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 25 | Le nombre d'associés d'une SARL est au maximum de : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 26 | Dans une entreprise individuelle : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 7 (`GESTION_1SUR3_v16.pptx.txt:20`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`) |

| 28 | Pour une entreprise individuelle, la constitution d'un capital est-elle nécessaire ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 29 | Combien y a-t-il d'associés dans une SARL ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 30 | L'entreprise individuelle est considérée comme une personne : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 7 (`GESTION_1SUR3_v16.pptx.txt:20`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`) |

| 31 | À l'installation d'un artisan avec le statut d'EURL, quel est le montant du capital minimum ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 32 | Quel est le capital maximum pour créer une SARL ? | Conserver, preuve incomplète : minimum 1 € donné, aucun maximum SARL explicitement indiqué. Ne pas déduire absence de plafond du silence. | `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 33 | Quelles sociétés sont soumises à l'impôt sur les sociétés ? | Conserver : fiscalité des sociétés déjà enseignée ici; aussi P2 s15,22 et P3 s5. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 12 (`GESTION_1SUR3_v16.pptx.txt:35`) |

| 34 | Combien vous faut-il d’associé au minimum pour créer votre société ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 35 | Quelle est la durée de vie maximum prévue par la loi pour une SARL ?<br>[s=12]Indice : la durée d'une société  est obligatoirement ne peut pas dépasser 99 ans.[/s] | Conserver; aussi P3 s14 (99 ans), donc aucun transfert. | `GESTION_1SUR3_v16.pptx`, slide 16 (`GESTION_1SUR3_v16.pptx.txt:47`) |

| 36 | Le gérant d’une S.A.R.L peut être | Conserver/incertain : gérant nommé dans tableau, mais gérant non associé / tiers gérant EURL non explicitement enseigné; aucune autre partie ne résout ce détail. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 37 | Dans une entreprise unipersonnelle à responsabilité limitée (EURL), l’associé unique est obligatoirement le gérant | Conserver/incertain : gérant nommé dans tableau, mais gérant non associé / tiers gérant EURL non explicitement enseigné; aucune autre partie ne résout ce détail. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 38 | La libération totale du capital social dans une société à responsabilité limitée (SARL) doit intervenir au plus tard dans un délai de : | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 16 (`GESTION_1SUR3_v16.pptx.txt:47`) |

| 39 | Quelles sont les principales différences entre une entreprise individuelle et une S.A.R.L ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 8 (`GESTION_1SUR3_v16.pptx.txt:23`); `GESTION_1SUR3_v16.pptx`, slide 9 (`GESTION_1SUR3_v16.pptx.txt:26`); `GESTION_1SUR3_v16.pptx`, slide 11 (`GESTION_1SUR3_v16.pptx.txt:32`) |

| 40 | Quelles sont les différentes catégories d’entrepreneur pour la création d’une entreprise ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 5 (`GESTION_1SUR3_v16.pptx.txt:14`); `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`) |

| 41 | De quelle catégorie d’entrepreneur relève les VTC et les TAXIS ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 5 (`GESTION_1SUR3_v16.pptx.txt:14`); `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`) |

| 42 | Quels documents comptables obligatoires sont à conserver pour tout entrepreneur disposant d’une entreprise ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`); `GESTION_1SUR3_v16.pptx`, slide 31 (`GESTION_1SUR3_v16.pptx.txt:92`); `GESTION_1SUR3_v16.pptx`, slide 35 (`GESTION_1SUR3_v16.pptx.txt:104`) |

| 43 | Quelles sont les obligations d’un entrepreneur ? | Conserver; compte dédié soumis à condition de CA dans le PPT, question plus générale. | `GESTION_1SUR3_v16.pptx`, slide 21 (`GESTION_1SUR3_v16.pptx.txt:62`); `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`) |

| 44 | Quel est le document comptable qui mesure l’enrichissement et l’appauvrissement d’une entreprise ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 23 (`GESTION_1SUR3_v16.pptx.txt:68`); `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`); `GESTION_1SUR3_v16.pptx`, slide 26 (`GESTION_1SUR3_v16.pptx.txt:77`) |

| 45 | Pendant combien d’année(s) une facture doit-elle être conservée ? | Couverture dans la partie source; conserver. | `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`); `GESTION_1SUR3_v16.pptx`, slide 31 (`GESTION_1SUR3_v16.pptx.txt:92`); `GESTION_1SUR3_v16.pptx`, slide 35 (`GESTION_1SUR3_v16.pptx.txt:104`) |

| 46 | La durée d'un exercice comptable est de 1 an maximum. | Conserver/incertain : PPT dit 12 mois généralement, pas « maximum absolu »; aucun déplacement ne corrige cela. | `GESTION_1SUR3_v16.pptx`, slide 24 (`GESTION_1SUR3_v16.pptx.txt:71`) |

### Exercice 61 — partie 2
| Q | Énoncé exact | Disposition / pertinence source | Preuve source |
|---|---|---|---|

| 1 | Dans un bilan comptable, l'amortissement fait baisser : | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`) |

| 2 | Les dotations aux amortissements sont : | Conserver : amortissement au cœur de P2; classement charge exploitation aussi explicite P1 s25–26. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`) |

| 3 | Au 1er janvier 2015, j’achète un véhicule 20 000 € HT amortissable sur 4 ans, un ordinateur portable 600 € HT amortissable sur 3 ans. Quel sera le montant de la dotation d’amortissement déductible sur les charges d’entreprise en 2016 ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`) |

| 4 | La dotation annuelle aux amortissements d’un véhicule amorti sur 4 ans est de 5 875€ ht. Quel est le prix d’achat TTC du véhicule ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`) |

| 5 | Quelle est la durée d'amortissement habituelle d'un véhicule ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`) |

| 6 | L'amortissement dégressif est-il autorisé pour les véhicules VTC/Taxi ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`) |

| 7 | Définition d'une charge fixe : | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 6 (`GESTION_2SUR3_v12.pptx.txt:17`) |

| 8 | Définition d'une charge variable : | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 6 (`GESTION_2SUR3_v12.pptx.txt:17`) |

| 9 | Charges fixes 25 000 €, Charges variables 8 000 €, 55 000 km/an. Calculer le CRK coût de revient kilométrique   | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 7 (`GESTION_2SUR3_v12.pptx.txt:20`) |

| 10 | Formule binôme<br><br>Charges fixes : 25000€<br>Charges variables : 8000€<br>Le véhicule a parcouru 55000km en 280 jours<br><br>Calculer le temps Terme kilométrique TK =charge variable/nb de km<br>Puis calculer le Terme journalier TJ= Charges fixes/nb de jour. | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 7 (`GESTION_2SUR3_v12.pptx.txt:20`) |

| 11 | Si l’on estime que le coût variable sur une course facturée 8 € est de 3 €, alors on peut considérer que l'activité est rentable. | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 8 (`GESTION_2SUR3_v12.pptx.txt:23`) |

| 12 | Les charges fixes sont égales à 2 000 €, Les courses vous coutent 10 € avec 2 € de frais variables. Seuil de rentabilité , combien de courses doit réaliser pour être rentable ?[s=12][c=#dc2626] Seuil de rentabilité = Charges fixes/PV de vente- Charges variables du prix de vente[/c][/s] | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 8 (`GESTION_2SUR3_v12.pptx.txt:23`) |

| 13 | Quelle est la définition du seuil de rentabilité ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 8 (`GESTION_2SUR3_v12.pptx.txt:23`) |

| 14 | Avec un niveau d'activité en dessous du seuil de rentabilité, l'entreprise est déficitaire. | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 8 (`GESTION_2SUR3_v12.pptx.txt:23`) |

| 15 | En tant que micro-entrepreneur, vous avez réalisé un chiffre d'affaires annuel de 26 500€ HT. Le régime d’imposition auquel vous serez soumis de plein droit sera : | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 16 | Quel est le chiffre d’affaires maximum autorisé pour une entreprise placée sous le régime simplifié pour une entreprise de prestation de services ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 17 | Quel est le montant maximum de recettes qu’un artisan VTC ou TAXI peut réaliser pour être imposé au régime de la Micro-Entreprise ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 18 | Quelle est la définition d'un régime d'imposition ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 19 | Quel est le principal avantage du régime simplifié ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 20 | Quel est le principal inconvénient du régime réel normal pour de la prestation de service ?  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 21 | Comment calcule-t-on le bénéfice pour les régimes réel normal et simplifié ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 22 | Qu'est-ce que le bénéfice pour le régime des micro-entreprises ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 23 | Vous exercez une activité professionnelle en entreprise individuelle. Sur votre déclaration d’impôts, vous communiquez à l’administration fiscale :  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 15 (`GESTION_2SUR3_v12.pptx.txt:44`); `GESTION_2SUR3_v12.pptx`, slide 22 (`GESTION_2SUR3_v12.pptx.txt:65`) |

| 25 | Comment se calcule la TVA à payer pour une entreprise individuelle au régime du réel simplifié ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 26 | Quand est-on affilié comme travailleur non salarié ? | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 27 | Le dirigeant d'une entreprise individuelle a pour statut social ? | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 28 | TRANSFERT P1 : source cite URSSAF (formalités, CSG), mais ne dit pas qui recouvre les cotisations générales/TNS; P1 s6 le dit explicitement. Destination : `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`) | CONSERVER P2 : couverture exacte dans GESTION_2SUR3_v12.pptx slide 19, y compris texte après pied de page : « URSSAF = Union de Recouvrement des cotisations de Sécurité Sociale et d’Allocations Familiales : elle encaisse les cotisations sociales et la CSG/CRDS. » P1 s6 recoupe ce contenu; aucun transfert. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`) |

| 29 | À quel type d'impôt est soumise une S.A.R.L ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 15 (`GESTION_2SUR3_v12.pptx.txt:44`); `GESTION_2SUR3_v12.pptx`, slide 22 (`GESTION_2SUR3_v12.pptx.txt:65`) |

| 30 | TRANSFERT P1 : source cite URSSAF (formalités, CSG), mais ne dit pas qui recouvre les cotisations générales/TNS; P1 s6 le dit explicitement. Destination : `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`) | CONSERVER P2 : slide 19 distingue TNS/assimilé puis précise explicitement que l’URSSAF encaisse les cotisations sociales et la CSG/CRDS. P1 s6 couvre aussi le recouvrement; aucun transfert. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`) |

| 31 | Quel taux de TVA est applicable au transport de personnes ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 32 | A quel régime social est affilié un gérant majoritaire ? | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 33 | Quelle est la particularité du régime de la micro-entreprise ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 34 | Quels risques sont couverts par le régime social obligatoire des travailleurs non-salariés  ? | Conserver : maladie/retraite enseignées; distinction retraite de base/complémentaire pas explicitement détaillée. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 35 | La rémunération d'un gérant minoritaire SARL n'exige pas un bulletin de paye. | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 36 | Quel est le statut social du président d’une Société par action simplifiées (S.A.S) ? | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 37 | Quelle est la base de calcul des cotisations sociales du travailleur indépendant, chef d’entreprise qui a une entreprise individuelle ?<br> | Conserver : source explicite, même si P1 s9,12–13 enseigne aussi ces régimes. | `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`); `GESTION_2SUR3_v12.pptx`, slide 20 (`GESTION_2SUR3_v12.pptx.txt:59`) |

| 39 | Le BIC : quelle (s) proposition (s) est (sont) vraie (s) | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 15 (`GESTION_2SUR3_v12.pptx.txt:44`); `GESTION_2SUR3_v12.pptx`, slide 22 (`GESTION_2SUR3_v12.pptx.txt:65`) |

| 40 | Indiquez lesquels de ces postes constituent des charges<br> | Conserver : charges/salaires/amortissements traités ici; intérêts explicitement P1 s26, mais sujet déjà pertinent source; pas de transfert strict. | `GESTION_2SUR3_v12.pptx`, slide 4 (`GESTION_2SUR3_v12.pptx.txt:11`); `GESTION_2SUR3_v12.pptx`, slide 6 (`GESTION_2SUR3_v12.pptx.txt:17`); `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`) |

| 41 | Le bénéfice d’un artisan VTC ou Taxi est imposable à l’impôt sur le revenu dans la catégorie :  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 15 (`GESTION_2SUR3_v12.pptx.txt:44`); `GESTION_2SUR3_v12.pptx`, slide 22 (`GESTION_2SUR3_v12.pptx.txt:65`) |

| 42 | Le taux de TVA pour les VTC et les Taxis est de :  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 43 | La TVA est-ce un impôt ?<br> | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 44 | La TVA est-elle une charge pour l’entreprise ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 45 | Parmi les charges suivantes, cochez celle(s) non soumises à récupération de TVA ? | Conserver/incertain : assurance non récupérable en TVA absente de la source ET de P3 s18–19. Ne pas confondre déductibilité de la charge assurance et récupération de TVA. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 46 | Pour une entreprise de VTC ou de Taxi sous statut de SARL, la TVA est : | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 47 | Si la T.V.A. déductible est supérieure à la T.V.A. collectée, la T.V.A. est considérée comme :  | Conserver : mécanisme collectée moins déductible et crédit TVA permettent interprétation; terme exact « récupérable » n’est pas défini comme un régime distinct. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 48 | La TVA collectée est calculée :  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 49 | La TVA déductible est calculée :  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 50 | Le montant d'un transfert est de 75 € TTC, quel est le montant de la TVA déductible ? | Conserver : conversion TTC/HT et taux explicitement enseignés. Q50 parle de TVA « déductible » sur un transfert facturé : ambiguïté terminologique non résolue par déplacement. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`) |

| 51 | La TVA collectée est une TVA que l’on doit à l’état ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 52 | La TVA récupérable est une TVA que l'état nous doit ? | Conserver : mécanisme collectée moins déductible et crédit TVA permettent interprétation; terme exact « récupérable » n’est pas défini comme un régime distinct. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 53 | Vous avez payé 70 € TTC de gasoil, calculez la TVA ? | Conserver : conversion TTC/HT et taux explicitement enseignés. Q50 parle de TVA « déductible » sur un transfert facturé : ambiguïté terminologique non résolue par déplacement. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`) |

| 54 | Quel est le montant de TVA pour une facture TTC de 638 euros établie pour une course de Taxi ou VTC ? | Conserver : conversion TTC/HT et taux explicitement enseignés. Q50 parle de TVA « déductible » sur un transfert facturé : ambiguïté terminologique non résolue par déplacement. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`) |

| 55 | Définir la TVA collectée  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 56 | Définir la TVA déductible | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 58 | Une micro-entreprise est toujours assujettie à la TVA ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`); `GESTION_2SUR3_v12.pptx`, slide 14 (`GESTION_2SUR3_v12.pptx.txt:41`) |

| 59 | Quelle mention spécifique doit apparaître sur une facture établie par une microentreprise ? | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`); `GESTION_2SUR3_v12.pptx`, slide 11 (`GESTION_2SUR3_v12.pptx.txt:32`) |

| 60 | Quel est le montant hors taxes d’un transport de personnes d’un montant de 38.50€ TTC ? | Conserver : conversion TTC/HT et taux explicitement enseignés. Q50 parle de TVA « déductible » sur un transfert facturé : ambiguïté terminologique non résolue par déplacement. | `GESTION_2SUR3_v12.pptx`, slide 9 (`GESTION_2SUR3_v12.pptx.txt:26`); `GESTION_2SUR3_v12.pptx`, slide 10 (`GESTION_2SUR3_v12.pptx.txt:29`) |

| 61 | Que signifie le sigle CET ?  | Couverture dans la partie source; conserver. | `GESTION_2SUR3_v12.pptx`, slide 16 (`GESTION_2SUR3_v12.pptx.txt:47`); `GESTION_2SUR3_v12.pptx`, slide 17 (`GESTION_2SUR3_v12.pptx.txt:50`) |

### Exercice 62 — partie 3
| Q | Énoncé exact | Disposition / pertinence source | Preuve source |
|---|---|---|---|

| 1 | Quelle est la différence entre chiffre d'affaires et bénéfice ? | Conserver : formation du résultat/CA/bénéfice traitée par SIG source, y compris image s24; P1 s23–26 couvre aussi directement, donc aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |

| 2 | Quand les charges d'exploitation sont inférieures aux produits : | Conserver : formation du résultat/CA/bénéfice traitée par SIG source, y compris image s24; P1 s23–26 couvre aussi directement, donc aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |

| 3 | Comment se calcule le résultat d'une entreprise ? | Conserver : formation du résultat/CA/bénéfice traitée par SIG source, y compris image s24; P1 s23–26 couvre aussi directement, donc aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |

| 4 | Est-ce que le capital remboursé des emprunts est une charge déductible du résultat de l’entreprise ? | Conserver : loyers déductibles et intérêts seuls (pas remboursement capital) explicitement source; P1 s24–26 recoupe charges/leasing/intérêts. | `GESTION_3SUR3_v12.pptx`, slide 17 (`GESTION_3SUR3_v12.pptx.txt:50`); `GESTION_3SUR3_v12.pptx`, slide 19 (`GESTION_3SUR3_v12.pptx.txt:56`) |

| 5 | Dans les comptes de l’entreprise, les remboursements du capital de l’emprunt apparaissent :  | Conserver/incertain : P3 exclut capital emprunté des charges mais ne place pas les remboursements au passif; P1 s27 place les emprunts/dettes au passif, pas le flux de remboursement. Aucun transfert strict fondé sur une équivalence dette/flux. | `GESTION_3SUR3_v12.pptx`, slide 17 (`GESTION_3SUR3_v12.pptx.txt:50`); `GESTION_3SUR3_v12.pptx`, slide 19 (`GESTION_3SUR3_v12.pptx.txt:56`) |

| 6 | Qu'est-ce qui constitue une charge déductible pour un entrepreneur individuel ? | Conserver : loyers déductibles et intérêts seuls (pas remboursement capital) explicitement source; P1 s24–26 recoupe charges/leasing/intérêts. | `GESTION_3SUR3_v12.pptx`, slide 17 (`GESTION_3SUR3_v12.pptx.txt:50`); `GESTION_3SUR3_v12.pptx`, slide 19 (`GESTION_3SUR3_v12.pptx.txt:56`) |

| 7 | Le crédit-bail d'un véhicule permet la déduction fiscale : | Conserver : loyers déductibles et intérêts seuls (pas remboursement capital) explicitement source; P1 s24–26 recoupe charges/leasing/intérêts. | `GESTION_3SUR3_v12.pptx`, slide 17 (`GESTION_3SUR3_v12.pptx.txt:50`); `GESTION_3SUR3_v12.pptx`, slide 19 (`GESTION_3SUR3_v12.pptx.txt:56`) |

| 8 | Comment se calcule le BIC imposable pour le régime en micro-entreprise ? | TRANSFERT P2 : P3 traite versement libératoire, pas abattement micro-BIC 50%; P2 s12–13 donne explicitement calcul abattement 50%. Destination : `GESTION_2SUR3_v12.pptx`, slide 12 (`GESTION_2SUR3_v12.pptx.txt:35`); `GESTION_2SUR3_v12.pptx`, slide 13 (`GESTION_2SUR3_v12.pptx.txt:38`) | `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`) |

| 9 | Les dividendes d'une société sont : | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 4 (`GESTION_3SUR3_v12.pptx.txt:11`) |

| 10 | Le conjoint collaborateur d'une entreprise individuelle peut-il être rémunéré ? | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 8 (`GESTION_3SUR3_v12.pptx.txt:23`); `GESTION_3SUR3_v12.pptx`, slide 9 (`GESTION_3SUR3_v12.pptx.txt:26`) |

| 11 | Une entreprise artisanale relève de plein droit d'un régime fiscal au titre de : | Conserver/incertain : réponse « nombre de salariés » contredit P2 s12 (régime fiscal selon CA); P3 s6 ne parle effectif que pour artisanat. Ne pas déplacer une question dont la réponse confond catégorie artisanale et régime fiscal. | `GESTION_3SUR3_v12.pptx`, slide 6 (`GESTION_3SUR3_v12.pptx.txt:17`); `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`) |

| 13 | Que signifie C.F.E au sein d'une CMA (Chambre de Métiers et de l’Artisanat) ? | Conserver, avec conflit : source explique ancien CFE/CMA et remplacement par guichet unique INPI en 2023; réponses Q25–26 restent au CFE. Le déplacement ne corrige pas cette obsolescence. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`) |

| 14 | La chambre des métiers et de l'artisanat est : | Conserver : CMA enseignée ici; Q45 missions « aménagement local/tenir répertoire » pas toutes explicitement énumérées (s7 et extrait D1 s16 donnent contexte). | `GESTION_3SUR3_v12.pptx`, slide 6 (`GESTION_3SUR3_v12.pptx.txt:17`); `GESTION_3SUR3_v12.pptx`, slide 7 (`GESTION_3SUR3_v12.pptx.txt:20`) |

| 15 | Quelles sont les missions d'un expert-comptable ? | Conserver : expert-comptable explicite ici ET P1 s20; aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 11 (`GESTION_3SUR3_v12.pptx.txt:32`) |

| 17 | Un centre de gestion agréé tient la comptabilité ?<br><br>[s=12]C'est un organisme ayant pour objet de fournir aux entreprises une aide en termes de gestion/prévention des difficultés économiques. [/s] | Conserver : CGA vérifie/révise; expert tient. « Ne tient pas » inféré par contraste, pas phrase littérale. | `GESTION_3SUR3_v12.pptx`, slide 10 (`GESTION_3SUR3_v12.pptx.txt:29`); `GESTION_3SUR3_v12.pptx`, slide 11 (`GESTION_3SUR3_v12.pptx.txt:32`) |

| 18 | Quel est le taux normal d’imposition à l’impôt sur les sociétés d’une société commerciale ? | Conserver : taux normal IS ici ET P1 s9,12/P2 s15; aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 5 (`GESTION_3SUR3_v12.pptx.txt:14`) |

| 19 | En cas de non-respect des délais de dépôt de la déclaration fiscale, la pénalité encourue s’applique :  | Conserver/incertain : obligations fiscales présentes, mais sanction de retard imputable entreprise non explicitement donnée dans aucun PPT; P1 s35 vise comptes inexacts/fictifs, pas retard déclaration. | `GESTION_3SUR3_v12.pptx`, slide 5 (`GESTION_3SUR3_v12.pptx.txt:14`); `GESTION_3SUR3_v12.pptx`, slide 10 (`GESTION_3SUR3_v12.pptx.txt:29`); `GESTION_3SUR3_v12.pptx`, slide 11 (`GESTION_3SUR3_v12.pptx.txt:32`) |

| 21 | La déclaration de cessation de paiement se fait :<br><br>[s=12]La cessation des paiements se définit comme l'impossibilité de faire face à ses dettes[/s] | Conserver : tribunal de commerce/45 jours ici ET P1 s18–19; aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 15 (`GESTION_3SUR3_v12.pptx.txt:44`) |

| 22 | Le dispositif A.C.R.E.* permet l’exonération :<br><br>[s=12]L'aide à la création ou à la reprise d'une entreprise (Acre) consiste en une exonération temporaire de cotisations sociales en début d'activité<br>Ne pas confondre avec l'aide à la reprise et à la création d'entreprise (Arce) est une aide financière versée par France Travail (anciennement Pôle emploi) et destinée aux créateurs ou repreneurs d'entreprise. Elle consiste à recevoir une partie de ses allocations chômage sous la forme d'un capital et sous conditions  l'Arce s'élève à 60 % des droits[/s] | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`) |

| 23 | La publication de l'annonce légale est obligatoire pour : | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 15 (`GESTION_3SUR3_v12.pptx.txt:44`) |

| 24 | Le dépôt des statuts est obligatoire pour la création d'une E.U.R.L ?<br><br>[s=12]Indice : vous êtes soumis à l’obligation de rédiger des statuts si vous optez pour la création d'une entreprise sous la forme d'une société.[/s] | Conserver : statuts explicites ici ET P1 s8,11; aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 14 (`GESTION_3SUR3_v12.pptx.txt:41`) |

| 25 | Où enregistrez-vous votre société ? | Conserver, avec conflit : source explique ancien CFE/CMA et remplacement par guichet unique INPI en 2023; réponses Q25–26 restent au CFE. Le déplacement ne corrige pas cette obsolescence. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`) |

| 26 | Pour immatriculer son entreprise, le VTC ou le TAXI doit s’adresser au centre de formalité des entreprises (CFE). | Conserver, avec conflit : source explique ancien CFE/CMA et remplacement par guichet unique INPI en 2023; réponses Q25–26 restent au CFE. Le déplacement ne corrige pas cette obsolescence. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`) |

| 27 | Le numéro SIRET de votre entreprise est délivré par : | Conserver : identifiants explicités; INSEE explicitement relié à SIREN, attribution SIRET non dite séparément (preuve partielle Q27). | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 28 | Le numéro SIREN identifie : | Conserver : identifiants explicités; INSEE explicitement relié à SIREN, attribution SIRET non dite séparément (preuve partielle Q27). | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 29 | Le code NAF/APE se rattache à :<br>[s=12]<br>Le code APE (activité principale exercée) permet d'identifier la branche d'activité principale du travailleur indépendant ou de la société.[/s] | Conserver : identifiants explicités; INSEE explicitement relié à SIREN, attribution SIRET non dite séparément (preuve partielle Q27). | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 30 | Que signifie RCS ? | Conserver : RCS/Répertoire métiers source; acronymie RCS entièrement développée aussi P1 s5, mais source traite immatriculation et extrait D1. Q31=Q50 doublon exact. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 31 | Auprès de quel organisme doit s'immatriculer un VTC ou Taxi exploitant individuel ? | Conserver : RCS/Répertoire métiers source; acronymie RCS entièrement développée aussi P1 s5, mais source traite immatriculation et extrait D1. Q31=Q50 doublon exact. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 32 | A partir de quel montant, un artisan VTC ou TAXI doit-il faire une facture (ou une note) | TRANSFERT P1 : facturation quel que soit montant absente P3; P1 s22 explicite si client demande, sinon seuil 25 € TTC particulier; question manque cette condition. Destination : `GESTION_1SUR3_v16.pptx`, slide 22 (`GESTION_1SUR3_v16.pptx.txt:65`) | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 14 (`GESTION_3SUR3_v12.pptx.txt:41`) |

| 33 | Définition d'un SIG (Soldes Intermédiaires de Gestion) ? | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |

| 34 | Que signifie un BFR positif ? | Conserver : FR/BFR explicites. Q34 simplifie trop : BFR positif signifie besoin à financer, pas nécessairement incapacité de payer. | `GESTION_3SUR3_v12.pptx`, slide 25 (`GESTION_3SUR3_v12.pptx.txt:74`); `GESTION_3SUR3_v12.pptx`, slide 26 (`GESTION_3SUR3_v12.pptx.txt:77`) |

| 35 | Que signifie un BFR négatif ? | Conserver : FR/BFR explicites. Q34 simplifie trop : BFR positif signifie besoin à financer, pas nécessairement incapacité de payer. | `GESTION_3SUR3_v12.pptx`, slide 25 (`GESTION_3SUR3_v12.pptx.txt:74`); `GESTION_3SUR3_v12.pptx`, slide 26 (`GESTION_3SUR3_v12.pptx.txt:77`) |

| 36 | Quelle est la définition du BFR ? | Conserver : FR/BFR explicites. Q34 simplifie trop : BFR positif signifie besoin à financer, pas nécessairement incapacité de payer. | `GESTION_3SUR3_v12.pptx`, slide 25 (`GESTION_3SUR3_v12.pptx.txt:74`); `GESTION_3SUR3_v12.pptx`, slide 26 (`GESTION_3SUR3_v12.pptx.txt:77`) |

| 37 | Quelle est la durée de validé d’un chèque ? | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 20 (`GESTION_3SUR3_v12.pptx.txt:59`) |

| 44 | Les 3 statuts possibles du conjoint qui travaille dans l'entreprise : | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 8 (`GESTION_3SUR3_v12.pptx.txt:23`); `GESTION_3SUR3_v12.pptx`, slide 9 (`GESTION_3SUR3_v12.pptx.txt:26`) |

| 45 | Quelles sont les 3 principales missions de la Chambre de Métiers et de l’Artisanat. | Conserver : CMA enseignée ici; Q45 missions « aménagement local/tenir répertoire » pas toutes explicitement énumérées (s7 et extrait D1 s16 donnent contexte). | `GESTION_3SUR3_v12.pptx`, slide 6 (`GESTION_3SUR3_v12.pptx.txt:17`); `GESTION_3SUR3_v12.pptx`, slide 7 (`GESTION_3SUR3_v12.pptx.txt:20`) |

| 46 | Quels impôts et taxes sont obligatoires en tant que professionnel ? | TRANSFERT P2 : cotisations sociales citées source, mais CET non enseignée; P2 s16 définit CET=CFE+CVAE et s19 cotisations. Réponse catégorielle/obligation à nuancer selon exonérations. Destination : `GESTION_2SUR3_v12.pptx`, slide 16 (`GESTION_2SUR3_v12.pptx.txt:47`); `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`) | `GESTION_3SUR3_v12.pptx`, slide 5 (`GESTION_3SUR3_v12.pptx.txt:14`); `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`) |

| 48 | Parmi ces propositions, qu’est ce qui constitue une charge déductible pour un entrepreneur individuel ? | Conserver : loyers déductibles et intérêts seuls (pas remboursement capital) explicitement source; P1 s24–26 recoupe charges/leasing/intérêts. | `GESTION_3SUR3_v12.pptx`, slide 17 (`GESTION_3SUR3_v12.pptx.txt:50`); `GESTION_3SUR3_v12.pptx`, slide 19 (`GESTION_3SUR3_v12.pptx.txt:56`) |

| 50 | Auprès de quel organisme doit s'immatriculer un VTC ou Taxi exploitant individuel ? | Conserver : RCS/Répertoire métiers source; acronymie RCS entièrement développée aussi P1 s5, mais source traite immatriculation et extrait D1. Q31=Q50 doublon exact. | `GESTION_3SUR3_v12.pptx`, slide 13 (`GESTION_3SUR3_v12.pptx.txt:38`); `GESTION_3SUR3_v12.pptx`, slide 16 (`GESTION_3SUR3_v12.pptx.txt:47`) |

| 53 | Citez deux régimes sociaux | TRANSFERT P1 : source évoque couverture/général mais pas régime agricole; P1 s6 oppose explicitement régime général et MSA agricole. P2 s19–20 ne donne que TNS/assimilé, pas agricole. Destination : `GESTION_1SUR3_v16.pptx`, slide 6 (`GESTION_1SUR3_v16.pptx.txt:17`) | `GESTION_3SUR3_v12.pptx`, slide 9 (`GESTION_3SUR3_v12.pptx.txt:26`); `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`) |

| 54 | Que signifie Urssaf ? | TRANSFERT P2 : URSSAF citée source s6/s21 sans développement du sigle. Destination exacte `GESTION_2SUR3_v12.pptx`, slide 19 (`GESTION_2SUR3_v12.pptx.txt:56`) : sigle entièrement développé après le pied de page. | `GESTION_3SUR3_v12.pptx`, slide 6 (`GESTION_3SUR3_v12.pptx.txt:17`); `GESTION_3SUR3_v12.pptx`, slide 21 (`GESTION_3SUR3_v12.pptx.txt:62`) |

| 47 | Quand les charges d’exploitation d’une entreprise sont inférieures aux produits :  | Conserver : formation du résultat/CA/bénéfice traitée par SIG source, y compris image s24; P1 s23–26 couvre aussi directement, donc aucun transfert. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |

| 51 | Quelle est la définition d’un SIG (solde intermédiaires de gestion) ? | Couverture dans la partie source; conserver. | `GESTION_3SUR3_v12.pptx`, slide 23 (`GESTION_3SUR3_v12.pptx.txt:68`); `GESTION_3SUR3_v12.pptx`, slide 24 (`GESTION_3SUR3_v12.pptx.txt:71`) |
## Doublons et recouvrements — aucune suppression proposée
- **Intermodules :** toutes les 146 questions hydratées sont des copies identiques entre modules 2 et 10; ce n’est pas une raison de supprimer une occurrence. Les recommandations sont symétriques.
- **Ex62 Q31 / Q50 : doublon exact** d’énoncé et même réponse Répertoire des métiers. **Ex62 Q33 / Q51 : quasi-doublon SIG**; **Q2 / Q47 : quasi-doublon bénéfice si charges inférieures aux produits**. Conserver les deux occurrences tant qu’une déduplication n’est pas demandée.
- Ex61 Q31 / Q42 : même taux TVA 10%; Q48/Q55 et Q49/Q56 reformulent bases/définitions collectée/déductible; Q26/Q27/Q32 recoupent TNS. Ex60 Q19/Q25/Q29 recoupent nombre d’associés SARL; Q16/Q30 personne physique. Ce sont des répétitions pédagogiques, pas forcément des objets identiques.
- Ex62 Q6/Q48 : charges déductibles, Q48 plus large. Q7 / Q49 module 10 : crédit-bail quasi-doublon mais Q49 est tombstonée, donc ne pas la réactiver.
- **Recouvrements qui interdisent des faux transferts :** comptabilité/résultat Ex60 Q1–15/Q44 et Ex62 Q1–3/Q47 (P1 s23–30, P3 s23–24 y compris image); expert-comptable Ex62 Q15 (P1 s20 et P3 s11); IS Ex60 Q33/Ex61 Q29/Ex62 Q18 (P1 s8–12, P2 s15, P3 s5); cessation Ex62 Q21 (P1 s18–19, P3 s15); statuts Ex62 Q24 (P1 s8, P3 s13–14); cotisations/statuts sociaux Ex61 Q26/27/32/35/36/37 (P1 s9/12–13 et P2 s19–20). Le titre nominal d’une partie ne prime jamais ces preuves.

## Images et limites de l’extraction XML
Les relations des vrais PPTX ont été inspectées, puis **les sept images matricielles ont été vues** dans `/tmp/gestion-media-audit.jpg` (contact sheet temporaire). Aucun `ppt/charts/`, `ppt/diagrams/` ni `ppt/embeddings/` dans ces trois archives. P2 ne contient aucune image de slide.
- `GESTION_1SUR3_v16.pptx`, s32, `ppt/media/image1.png` : vrai journal d’achats avec dates/débit/crédit; s33, `image2.png` : vrai grand livre, comptes fournisseurs/immobilisations; s34, `image3.png` : couverture Plan Comptable Général et classes. Pas de justification supplémentaire de transfert.
- `GESTION_3SUR3_v12.pptx`, s12, `image1.png` : diagramme **8 classes** PCG, classe 8 comptes spéciaux (élément absent de l’extraction textuelle détaillée); s14, `image2.png` : exemple statuts SASU, associé unique, possibilité de fonctionner à un ou plusieurs associés; ne prouve pas tiers-gérant EURL; s16, `image3.png` : extrait d’immatriculation D1P au Répertoire des métiers, activité taxi et code; renforce le maintien Q31/Q50.
- P3 s24, `ppt/media/image4.jpg` : cascade SIG, **CA = ventes marchandises + biens/services**, marge brute, VA, EBE, résultat d’exploitation, résultat net (résultat financier, exceptionnel, impôts), CAF. Cette image apporte une preuve réelle de couverture résultat/CA en P3; déplacer automatiquement Ex62 Q1–3/Q47 vers P1 en ignorant l’image serait injustifié.
- Extraction initiale (`extract.py:9-12`) = concaténation des seuls nœuds DrawingML `a:t` dans `ppt/slides/slideN.xml`, pas OCR. Elle inclut les textes de tableaux natifs mais ne préserve ni géométrie ni ordre visuel logique; elle exclut texte bitmap, notes, commentaires, dispositions/masques et contenu d’objets externes. L’inspection des images comble les lacunes importantes constatées, mais **aucun rendu PowerPoint complet ni examen exhaustif des notes/masques/animations** n’a été fait. Les preuves d’absence signifient « non trouvé dans les textes de slides et images examinées », pas preuve absolue d’absence dans tout contenu caché du package.
- Les URLs d’images attachées aux questions sont des références externes, **non téléchargées et non OCRisées**. Le jugement utilise les énoncés/options réellement enregistrés; une pièce jointe pourrait ajouter un contexte. Les cinq transferts doivent rester des recommandations de classement local, non des corrections irréversibles.

## Cas incertains / conflits de contenu à ne pas résoudre par déplacement
1. **Ex61 Q28/Q30 : CONSERVER P2.** La slide 19 donne exactement le recouvrement URSSAF des cotisations sociales, dans le texte après pied de page. La variante de transfert antérieure est retirée sans réserve.
2. **Ex62 Q8 → P2** : P1 s9 donne aussi micro-IR « abatt. 50% », donc P1 serait une destination défendable; P2 s12–13 est retenue car elle explique directement le calcul du bénéfice micro. Aucun abattement 50% en P3 s21 : taux libératoire 1,7% et cotisations ~22% sont d’autres mécanismes.
3. **Ex62 Q32 → P1** : ne certifie pas la correction « n’importe quel montant » sans condition; P1 s22 précise demande du client, seuil 25 € TTC particulier, et professionnels toujours. La compétence facturation reste explicitement P1.
4. **Ex62 Q46 → P2** : source P3 couvre cotisations mais pas CET; destination couvre les deux. CET n’est pas universellement due sans exception (P2 s16–17); conserver ces réserves avec la question.
5. **Ex62 Q53 → P1** : « régime agricole / général » est une classification différente de TNS/assimilé P2; P1 s6 est la preuve explicite. Ne pas choisir P2 sur son seul titre « régimes sociaux ».
6. **Ex60 Q32/Q36/Q37**, **Ex62 Q19**, **Ex61 Q45** : détails attendus non explicitement prouvés. Aucun transfert. En particulier P3 s19 « assurance pro déductible » ne répond pas à TVA récupérable assurance Q45; P3 s18 ne cite pas l’assurance.
7. **Ex62 Q5** : dette d’emprunt au passif ≠ remboursement du capital en tant que flux. P1 s27 ne suffit pas à justifier un transfert strict de cette formulation.
8. **Ex62 Q11** : réponse effectif salarié non compatible avec critère CA du régime fiscal P2 s12. Le lien artisanat/effectif P3 s6 ne valide pas cette réponse fiscale. **Q25/Q26** : ancien CFE corrigé dans la diapo P3 s13 mais pas dans les réponses; **Q27** : INSEE attribue SIREN explicitement, SIRET pas séparément. **Ex60 Q46** : maximum absolu d’un an non prouvé par « généralement 12 mois » P1 s24.
9. Conflits intrinsèques des supports, hors reclassement : conservation **10 ans** P1 s22 contre « au moins **6 ans** » justificatifs P3 s19; P3 s18 dit carburant tourisme 80% puis s19 précise taxi/VTC 100%; P3 s5 exclut globalement EI de l’IS, alors P1 s8/11 mentionne option IS depuis 2022. Ces contradictions ne prouvent pas une mauvaise partie et n’ont pas été corrigées. Les données de taux/seuils ont été prises comme contenu pédagogique fourni, pas comme droit vérifié au jour courant.

## Open questions / limites restantes
- QRC supplémentaires dans un autre endpoint ou un état hydraté séparé : fournir cette source serait nécessaire; aucune dans ce JSON.
- Images de questions externes : une vérification visuelle de chaque pièce jointe et un rendu complet des PPT pourraient affiner les réserves sans inventer de contenu.
- Les tombstones sont respectées selon listes snapshot et confirmation structurelle utilisateur. Le code projet n’a pas été utilisé pour remplacer la vérité de contenu serveur.
- Application éventuelle : affichage uniquement, préserver identifiants/contenu/ordre persistant et tombstones, traiter symétriquement modules 2 et 10. **Aucune application réalisée.** Le fichier `gestion-movements.json` contient 10 mouvements proposés et les 297 dispositions brutes, y compris 5 occurrences tombstonées réellement présentes.


## Réconciliation définitive — relecture intégrale sans suppression après pied de page
**Erreur reconnue et corrigée :** mon nettoyage d’affichage précédent `ÉPREUVE GESTION[^\n]*` supprimait aussi les ajouts XML situés après le pied de page sur la même ligne. Cela n’était pas une absence dans le PPT. Les 85 textes de slides ont maintenant été comparés à tous les nœuds `a:t` des XML originaux : correspondance exacte pour 36/22/27 slides. Les passages post-pied de page ont été contrôlés séparément (P2 s5,13,14,17,19; P3 s24). Aucun n’a été supprimé pour cette révision.

### Retraits obligatoires
`GESTION_2SUR3_v12.pptx`, **slide 19**, `GESTION_2SUR3_v12.pptx.txt:56` :
> URSSAF = Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales : elle encaisse les cotisations sociales et la CSG/CRDS.

Couvre exactement **61-Q28 et 61-Q30**. P1 s6 couvre également : **pas de transfert**, conformément à la règle « si les deux, ne pas déplacer ».

### Liste définitive par module (2 ET 10)
| Exercice-question | Destination exacte | Vérification de toutes les slides source P3 (1–27) et des images déjà inspectées |
|---|---|---|
| 62-Q8, abattement micro-BIC | `GESTION_2SUR3_v12.pptx` s12–13; texte lignes 35,38 | P3 s21 enseigne versement libératoire 1,7%/cotisations ~22%, **pas abattement bénéfice micro 50%**. Abattement s4 = dividendes 40%, distinct. SIG s24 ne couvre pas micro-BIC. P1 s9 couvre aussi 50%, mais pas la partie source P3; P2 destination retenue pour explication directe. |
| 62-Q32, émission facture/note | `GESTION_1SUR3_v16.pptx` s22; texte ligne 65 | P3 s13/14 = formalités INPI et statuts, **aucune facture ni règle de seuil**. S19 cite factures/tickets uniquement comme justificatifs à conserver. S20 « quel que soit le montant » concerne acceptation carte taxi, pas émission facture. Réserve conservée : P1 précise demande client/seuil 25 € TTC particulier/professionnel toujours; ne valide pas réponse inconditionnelle. |
| 62-Q46, cotisations + CET | `GESTION_2SUR3_v12.pptx` s16,19; texte lignes 47,56 | P3 couvre cotisations mais **aucune CET**, ni économique territoriale. P3 s13 CFE = ancien Centre de formalités, distingué de cotisation foncière; ne répond pas à CET. P2 couvre les deux éléments, sous réserves d’exonérations. |
| 62-Q53, agricole/général | `GESTION_1SUR3_v16.pptx` s6; texte ligne 17 | **Aucun agricole ni MSA dans P3**. Statut conjoint et couverture paie ne donnent pas les deux régimes demandés; P1 s6 fournit régime général et MSA agricole. |
| 62-Q54, sigle URSSAF | `GESTION_2SUR3_v12.pptx` s19; texte ligne 56 | P3 s6/s21 mentionne URSSAF sans développer le sigle. **Nouvelle preuve exacte retrouvée P2 s19**; ancienne conclusion « introuvable dans trois PPT » retirée. Le transfert est désormais strictement documenté. |

**Bilan final : aucun mouvement depuis 60 ou 61; cinq identifiants depuis 62, dix occurrences intermodules.** 141 maintiens actifs + 5 transferts par module; tombstones inchangées. Les 297 dispositions brutes demeurent. Le JSON contient la portée du contrôle intégral source et une réconciliation spécifique pour chacun des dix mouvements. Les limites sur images externes de questions, notes/masques non rendus et contenu juridique ne changent pas.
