# Preuves — exercices TAXI Rhône 2026

Consultation lecture seule le 21 octobre 2026 (UTC). Aucun appel IA de correction élève.

## Arrêté départemental
- Numéro **69-2026-02-19-00002**, signé à Lyon le **19 février 2026**, 6 pages.
- URL préfectorale : https://www.rhone.gouv.fr/contenu/telechargement/67519/454692/file/Arr%C3%AAt%C3%A9%20reglementant%20les%20tarifs%20taxis%20dans%20le%20d%C3%A9partement%20du%20Rh%C3%B4ne%202026.pdf
- Limite de provenance : téléchargement préfectoral répond « Site en maintenance ». Document scanné lu intégralement depuis la copie https://www.taxis-de-france.com/arretesprefectoraux/2026/69.pdf ; même numéro/signature, pas de certification de copie octroyée par le site préfectoral.
- SHA256 du PDF consulté : `a06a37fa832c2a3923cd05699b968d5c675d9bffe833dee21a2bd0ce0501e4fb`.
- Art. 11 p. 6 : entrée en vigueur dès publication ; date de publication exacte non établie dans le PDF.

| Règle | Source | Extrait / portée |
|---|---|---|
| Attente | Art. 3 p. 2, art. 4 p. 3 | Montant maximal horaire 41,30 €/h, identique A/B/C/D. |
| A | Art. 4 §2 p. 3 | « course de jour avec retour en charge à la station » |
| B | Idem | Nuit, dimanche/férié ou neige effective, retour en charge. |
| C | Idem | « course de jour avec retour à vide à la station » |
| D | Idem | Nuit, dimanche/férié ou neige effective, retour à vide. |
| Jour/nuit | Art. 4 p. 3 | « Les horaires de nuit s’étendent de 19 h à 7 h. » |
| Neige | Art. 4 §1 p. 3 | Deux conditions cumulatives : routes effectivement enneigées/verglacées ET équipements spéciaux ou pneus hiver utilisés. Majoration kilométrique ≤50%, non cumulable avec nuit. |
| Minimum | Art. 5 p. 3 | « Le tarif minimum, suppléments inclus […] est fixé à 8,00 euros. » |
| Passagers | Art. 6 §1 p. 3 | « 4 € […] pour chaque passager, majeur ou mineur, à partir du cinquième. » |
| Bagages | Art. 6 §2 p. 4 | 2 € par encombrant ; extérieur nécessaire OU valises/taille équivalente au-delà de trois PAR PASSAGER. Pas seuil global véhicule. |
| Réservations | Art. 6 §3 p. 4 | Seulement prises en charge dans ZUPC de l’arrêté 69-2018-07-19-001 ; immédiate 2 €, anticipée 4 €. Immédiate : compteur à l’adresse à l’arrivée ; anticipée : à l’adresse ET heure réservée. |
| Hors ZUPC | Art. 8 §2b p. 5 | « Les suppléments “réservations” […] ne s’appliquent pas. » Approche A/B depuis station prévue par le texte, à distinguer. |
| Changement tarif | Art. 8 §1 p. 4 | « Tout changement de tarif pendant la course devra être signalé au client. » Répartition kilométrique exacte inconnue sans durée réelle. |
| Tableau maximum | Art. 4 §3 p. 3 | A 1 €/km, B 1,50, C 2, D 3 ; prise en charge 3,10 ; montants maximaux, pas prix effectivement pratiqués imposés. |

## Exceptions et calendrier
- Jours fériés : https://www.service-public.gouv.fr/particuliers/actualites/A18558 (publication 07/01/2026, mise à jour 22/04/2026) ; https://code.travail.gouv.fr/code-du-travail/l3133-1 . Exactement 11 dates nationales listées dans donnees.ts ; Rhône = cas général, pas Alsace/Moselle.
- Chien guide : loi 87-588 du 30/07/1987, art. 88 https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033220273 : « La présence du chien guide d'aveugle ou d'assistance […] ne doit pas entraîner de facturation supplémentaire ». Pas gratuité de la course. Version courante consultée depuis le 19/08/2026 ; version historique antérieure non contrôlée.
- ZUPC : référentiel officiel le.taxi, état connu au 01/01/2021, https://www.data.gouv.fr/datasets/zones-uniques-de-prise-en-charge-des-taxis ; ressource https://static.data.gouv.fr/resources/zones-uniques-de-prises-en-charge-des-taxis-zupc/20210315-152231/zupc.geojson . Entrée agglomération lyonnaise + aéroport : Lyon 69123, La Mulatière 69142, Oullins 69149 inclus. **Corroboration ancienne, annexe préfectorale 2018 et périmètre actuel non prouvés** : suppléments des scénarios restent conditionnels.
- Fauteuil roulant : aucune disposition explicite dans l’arrêté départemental ; référence nationale repérée https://www.legifrance.gouv.fr/loda/id/JORFTEXT000049040513/ mais passage exact non obtenu. Corrigé 0 € attendu sans pénalité, pas gratuité réglementaire déclarée prouvée.
- Ivresse : aucune règle officielle Rhône de refus automatique établie ; jamais transformée en supplément. Sécurité à examiner sans inventer une autorisation de refus.

## Hypothèses / écarts explicités
- Retour à vide non écrit dans 2/4/6/9/11/12 : hypothèse explicite, alternative chargé acceptée sans pénalité.
- Scénario 7 : client initial + quatre enfants = cinq seulement si le client revient ; bagages selon répartition par passager, pas quatre valises automatiquement facturées.
- Scénario 8 : 4 € cinquième passager + éventuellement 2 € pour quatre valises du client seul de taille équivalente, pas omission silencieuse du bagage.
- Scénario 10 : huit objets répartis entre cinq musiciens ne produisent pas automatiquement cinq bagages supplémentaires ; tailles/répartition/extérieur à établir.
- Scénarios 11/12 : réservation territoriale conditionnelle. Adresse place Valmy conservée telle que fournie ; rattachement exact au lieu « Mairie d’Oullins » non corrigé/inventé.
- Aucune situation RTST n’entraîne de note/pénalité automatique ; réalisation = saisie complète + confirmation serveur, jamais justesse locale.
- Arrondis pédagogiques à deux décimales : 41,3/60×15=10,33 ; ×45=30,98 ; ×10=6,88. Ce n’est pas une reconstitution du montant réel d’un taximètre (chutes réglementaires).