// ===== Données du module "2. COURS ET EXERCICES VTC" =====
// Structure : 5 matières (A à E), 1 carte par partie (= 1 fichier PowerPoint)

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  actif: boolean;
}

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

// =============================================
// MATIÈRE A — RÉGLEMENTATION T3P (1 partie)
// =============================================

const MATIERE_A: ContentItem[] = [
  {
    id: 1001, actif: true,
    titre: "A. RÉGLEMENTATION T3P",
    sousTitre: "Cadre général, Transport public/privé, Loi LOTI, Taxis, VTC, VMDTR, Organismes, Assurances, Formation continue, Agents de contrôle, Juridictions, Sanctions, TPMR, Covoiturage, Intermédiaires, VSS & Discriminations",
    description: `Arrêté du 20 mars 2024 — En vigueur depuis le 1er avril 2024

═══════════════════════════════════════
1. TRANSPORT PUBLIC OU TRANSPORT PRIVÉ ?
═══════════════════════════════════════

TRANSPORT PRIVÉ — Pour compte propre :
• Transport pour son propre compte, sans ouvrir le service au public.
• Aucune autorisation administrative spécifique n'est requise.
• Pas de carte professionnelle T3P nécessaire.
• Exemple : entreprise avec son propre minibus pour ses salariés.

TRANSPORT PUBLIC — Pour compte d'autrui :
• Transport pour un CLIENT, contre rémunération.
• Service ouvert à quiconque souhaite l'utiliser.
• Des autorisations administratives sont nécessaires.
• Exemple : école commandant un car, client appelant un taxi.

✔ Règle clé : TRANSPORT PRIVÉ = pour soi-même, pas de carte pro. TRANSPORT PUBLIC = pour un client, contre paiement = réglementation obligatoire.

═══════════════════════════════════════
2. LE TRANSPORT PUBLIC — DEUX GRANDES FAMILLES
═══════════════════════════════════════

TRANSPORT PUBLIC COLLECTIF :
• Services réguliers (bus TCL, métro, TER) — horaires et lignes FIXES
• Services à la demande (TAD) — flexible selon réservations
• Services occasionnels — groupes, billet collectif
• Les conducteurs de services collectifs n'ont PAS besoin d'une carte pro T3P.

TRANSPORT PUBLIC PARTICULIER (T3P) :
• 🚕 TAXI — Maraude dans la zone, ADS obligatoire, tarif réglementé
• 🚗 VTC — Réservation obligatoire, Registre national, tarif libre
• 🏍 VMDTR — Max 1 passager

✔ Seul le T3P nécessite une carte professionnelle. Taxi, VTC et VMDTR sont les 3 professions T3P.

═══════════════════════════════════════
3. LA LOI LOTI — DÉFINITION DU T3P
═══════════════════════════════════════

Loi n°82-1153 du 30 décembre 1982 — Le cadre légal fondateur.

DÉFINITION OFFICIELLE :
"Les prestations de transports publics particuliers de personnes sont des prestations de transport public routier de personnes qui ne relèvent NI des transports publics collectifs NI du transport privé routier de personnes. Elles sont exécutées à titre ONÉREUX par les taxis, les VTC et les véhicules motorisés à deux ou trois roues."

• À titre ONÉREUX : le service est payant.
• NI collectif NI privé.
• Taxi, VTC ou VMDTR : seules ces 3 professions sont légalement habilitées.
• La DREAL ou la DRIEAT (Île-de-France) délivre les autorisations de transport.

═══════════════════════════════════════
4. NON-INSCRIPTION AUX EXAMENS T3P
═══════════════════════════════════════

3 situations bloquantes — Art. R3120-1 Code des transports :

CAS 1 — RETRAIT DÉFINITIF DE CARTE (10 ANS)
Ne pas avoir fait l'objet, dans les 10 ans qui précèdent la demande, d'un RETRAIT DÉFINITIF de la carte professionnelle T3P.

CAS 2 — FRAUDE À L'EXAMEN (5 ANS)
Ne pas avoir fait l'objet, dans les 5 ans qui précèdent la demande, d'une EXCLUSION POUR FRAUDE.

CAS 3 — PERMIS PROBATOIRE
Minimum requis : 2 ans de permis en conduite accompagnée (AAC) ou 3 ans en conduite normale.

⚠ Mémo : Retrait carte → 10 ans | Fraude → 5 ans | Permis probatoire → inscription impossible.

═══════════════════════════════════════
5. RÉGLEMENTATION DES TAXIS
═══════════════════════════════════════

• Licence ADS obligatoire (délivrée par le Préfet). Sans ADS : DÉLIT — 1 an + 15 000 €.
• Casier judiciaire B2 vierge. Permis B hors probatoire.
• Carte professionnelle + Certificat médical + PSC1 OBLIGATOIRE pour taxi uniquement.

Les 4 statuts d'exercice :
• ARTISAN : dispose de sa propre licence (ADS), propriétaire
• SALARIÉ : travaille pour un employeur qui possède l'ADS
• LOCATAIRE-GÉRANT : loue la licence ET le véhicule
• ACTIONNAIRE : achète des parts d'une société de taxi

Calcul du tarif : Prise en charge + Km parcourus + Suppléments = TARIF FINAL
Tarifs fixés par ARRÊTÉ PRÉFECTORAL — pas libres.

LA MARAUDE — Droit exclusif du taxi :
1. PRENDRE EN CHARGE un client sur la voie publique SANS réservation préalable.
2. ÊTRE EN QUÊTE DE CLIENTÈLE sur la voie publique.
3. Dépasser 1 HEURE d'attente en gare/aéroport.

TAXI — Maraude AUTORISÉE ✔ (uniquement dans la zone de rattachement)
VTC / VMDTR — Maraude INTERDITE ✖
⚠ Maraude VTC = DÉLIT : 1 an d'emprisonnement + 15 000 € d'amende.

═══════════════════════════════════════
6. RÉGLEMENTATION DES VTC
═══════════════════════════════════════

• Inscription obligatoire au REGISTRE NATIONAL des VTC (DRIEAT)
• Vignette VTC sur le véhicule
• Exercer sans inscription : DÉLIT — 1 an + 15 000 €
• Peut exercer sur TOUTE LA FRANCE — aucune restriction géographique

⚠ LA RÈGLE D'OR DU VTC : Réservation PRÉALABLE OBLIGATOIRE — toujours.

• Tarif : FORFAIT LIBRE fixé à l'avance. Prix communiqué AVANT le départ.
• RC Circulation + RC Professionnelle obligatoires.
• PSC1 NON obligatoire pour les VTC.

CONDITIONS DU VÉHICULE VTC — 5 critères :
• 4 à 9 places (chauffeur compris)
• Moins de 7 ans (sauf hybrides/électriques/collection)
• Minimum 4 portes
• Dimensions min : 4,50 m × 1,70 m
• Puissance min : 84 kW (~114 ch)
• Formation continue : 14 heures tous les 5 ans

═══════════════════════════════════════
6b. RÉGLEMENTATION DES VMDTR
═══════════════════════════════════════

• Permis de conduire catégorie A (3 ans minimum)
• Maximum 1 seul passager
• Réservation préalable obligatoire
• Véhicule de moins de 5 ans
• Puissance minimum 40 kW

COMPARATIF TAXI / VTC / VMDTR :
• Permis : B (Taxi/VTC) | A 3 ans (VMDTR)
• Maraude : ✔ zone seule (Taxi) | ✘ (VTC/VMDTR)
• Passagers max : 4 à 7 (Taxi) | 4 à 8 (VTC) | 1 seul (VMDTR)
• Âge véhicule : < 10 ans (Taxi) | < 7 ans (VTC) | < 5 ans (VMDTR)
• PSC1 : ✔ Obligatoire (Taxi) | ✘ Facultatif (VTC/VMDTR)

═══════════════════════════════════════
7. LES ORGANISMES AUTOUR DU T3P
═══════════════════════════════════════

PRÉFECTURE / PRÉFET : Délivre et retire les cartes professionnelles T3P.
MINISTÈRE DE LA TRANSITION ÉCOLOGIQUE : Application des lois T3P, délivre les ADS.
DRIEAT / DREAL : Agrée les centres de formation, inscription au registre VTC.
CMA : Enregistrement des entreprises, organisation des examens.
COMMISSION DISCIPLINAIRE : 3 sections (Taxi/VTC/VMDTR), composée à parts égales.

═══════════════════════════════════════
8. LES ASSURANCES OBLIGATOIRES
═══════════════════════════════════════

2 assurances CUMULATIVES et obligatoires :

1. RC CIRCULATION : Couvre les dommages AVEC implication du véhicule.
   Défaut d'assurance : DÉLIT — jusqu'à 3 750 € d'amende.

2. RC PROFESSIONNELLE : Couvre les dommages EN DEHORS de toute implication du véhicule.
   3 éléments : FAUTE + DOMMAGE + LIEN DE CAUSALITÉ.

LOI BADINTER (5 juillet 1985) : Garantit l'indemnisation de TOUTES les victimes.
FGAO : indemnise quand le responsable n'est PAS ASSURÉ ou PAS IDENTIFIÉ.

═══════════════════════════════════════
9. FORMATION CONTINUE ET VISITE MÉDICALE
═══════════════════════════════════════

FORMATION CONTINUE — 14 heures tous les 5 ANS :
• Mise à jour réglementaire, sécurité routière, relation client
• Depuis 2024 : prévention des discriminations et VSS
• Centre de formation AGRÉÉ par le Préfet (pour 5 ans)

Visite médicale — Fréquence selon l'âge :
• 20 → 60 ans : Tous les 5 ANS
• 60 → 76 ans : Tous les 2 ANS
• 76 ans et plus : Chaque ANNÉE

⚠ CHIFFRES À RETENIR :
14h formation / 5 ans | 3 750 € défaut assurance | 15 000 € exercice illégal | 1 an prison | 10 ans retrait carte | 5 ans fraude | 12/20 note min pratique | 6/20 note éliminatoire

═══════════════════════════════════════
8b. AGENTS DE CONTRÔLE ET DOCUMENTS T3P
═══════════════════════════════════════

AGENTS HABILITÉS À CONTRÔLER :
• Police nationale et Gendarmerie : infractions pénales, verbalisation, garde à vue
• Agents DRIEAT/DREAL : registre VTC, documents professionnels
• URSSAF : cotisations sociales — SANS PRÉAVIS en cas de travail dissimulé
• DGFIP : contrôle fiscal — avis préalable d'environ 15 jours
• DGCCRF : pratiques commerciales, tarifs, concurrence
• Douanes : contrôle des personnes et marchandises

DOCUMENTS À PRÉSENTER :
• Véhicule : carte grise, attestation assurance RC + RC Pro, contrôle technique, permis
• Profession : carte professionnelle T3P (sur pare-brise), attestation médicale
• Taxis : carnet métrologique du taximètre
• Salariés : contrat de travail + DPAE

═══════════════════════════════════════
10. LES JURIDICTIONS COMPÉTENTES
═══════════════════════════════════════

JURIDICTIONS CIVILES :
• Tribunal judiciaire : litiges non confiés à un autre tribunal
• Tribunal de commerce : litiges entre commerçants
• Conseil des Prud'hommes : litiges salarié/employeur
• Cour d'appel : réexamine l'affaire (délai 1 mois en civil)

JURIDICTIONS PÉNALES :
• Tribunal de police : contraventions classe 5
• Tribunal correctionnel : délits (jusqu'à 10 ans + amendes)
• Cour d'assises : crimes (réclusion jusqu'à perpétuité)
• Cour de cassation : vérifie la bonne application de la loi (ne rejuge PAS)

En T3P :
• Contestation retrait carte pro → Tribunal administratif
• Infraction pénale (maraude illégale) → Tribunal correctionnel
• Litige salarié/employeur → Conseil de Prud'hommes

═══════════════════════════════════════
11. SANCTIONS ET VOIES DE RECOURS
═══════════════════════════════════════

BARÈME DES AMENDES :
• Classe 1 : forfaitaire 11 € | majorée 33 € | max 38 €
• Classe 2 : minorée 22 € | forfaitaire 35 € | majorée 75 € | max 150 €
• Classe 3 : minorée 45 € | forfaitaire 68 € | majorée 180 € | max 450 €
• Classe 4 : minorée 90 € | forfaitaire 135 € | majorée 375 € | max 750 €
• Classe 5 : max 1 500 € (3 000 € récidive)

INFRACTIONS SPÉCIFIQUES T3P :
• Non apposition carte pro : Classe 1
• Non présentation carte pro : Classe 2
• Non justification carte pro (5 jours) : Classe 4
• Conduite sans attestation visite médicale : Classe 4
• Exercice sans carte pro valide : Classe 5
• Maraude illégale : DÉLIT — 1 an + 15 000 €

VOIES DE RECOURS :
• Contravention : lettre de contestation avant paiement
• Délit : appel (10 jours après jugement)
• Cour de cassation : 10 jours à 2 mois après jugement pénal

═══════════════════════════════════════
12. TRANSPORT DE PERSONNES À MOBILITÉ RÉDUITE (TPMR)
═══════════════════════════════════════

Formation obligatoire (21h à 400h) pour toute personne intervenant dans le transport des PMR.

CRITÈRES OBLIGATOIRES VÉHICULES TPMR :
1. Homologation spécifique pour usage professionnel
2. Place réservée pour une PMR non en fauteuil roulant
3. Dimensions intérieures minimums imposées
4. Ceintures de sécurité à 3 points d'ancrage renforcés
5. Signalétique spécifique et notices d'utilisation

═══════════════════════════════════════
13. COVOITURAGE ET TRANSPORT PRIVÉ
═══════════════════════════════════════

Le covoiturage = utilisation en commun d'un véhicule à titre NON ONÉREUX. Partage des frais sans bénéfice.

COVOITURAGE vs T3P :
• Nature : privée vs professionnelle réglementée
• Rémunération : NON (partage frais) vs OUI (titre onéreux)
• Carte pro : non requise vs obligatoire
• Assurance : personnelle suffit vs RC Circulation + RC Pro

═══════════════════════════════════════
14. LES INTERMÉDIAIRES DE LA MISE EN RELATION
═══════════════════════════════════════

Intermédiaire = toute personne mettant en relation clients et conducteurs T3P via plateforme (Uber, Bolt, Heetch...).

OBLIGATIONS DE L'INTERMÉDIAIRE :
• Vérifier carte pro T3P valide
• Vérifier inscription VTC au registre national
• S'assurer que le conducteur est assuré (RC + RC Pro)
• Transmettre infos course : tarif, véhicule, conducteur
• Information irrégulière sur disponibilité → Classe 5

DROITS DU CONDUCTEUR T3P :
• Transparence tarifaire
• Accès aux CGU en français
• Préavis raisonnable avant modification/résiliation
• Non-discrimination
• Liberté de refuser des courses (indépendant)

═══════════════════════════════════════
15. VSS ET DISCRIMINATIONS
═══════════════════════════════════════

4 INFRACTIONS À CARACTÈRE SEXUEL OU SEXISTE :

1. OUTRAGE SEXISTE OU SEXUEL — amende 3 750 € — Délit si aggravé
2. HARCÈLEMENT SEXUEL — 2 ans + 30 000 €
3. AGRESSION SEXUELLE — 5 ans + 75 000 €
4. VIOL — 15 ans de réclusion criminelle

DISCRIMINATIONS (art. 225-1 Code pénal) :
3 ans d'emprisonnement + 45 000 €
Critères protégés : origine, sexe, situation de famille, grossesse, apparence physique, handicap, orientation sexuelle, âge...`,
  },
];

// =============================================
// MATIÈRE B — GESTION (1 partie)
// =============================================

const MATIERE_B: ContentItem[] = [
  {
    id: 2001, actif: true,
    titre: "B. GESTION",
    sousTitre: "Types d'entrepreneurs, Formes juridiques, Amortissements, Coût de revient, TVA, Régimes d'imposition, Régimes sociaux, Marge, Dividendes, CMA/CGA, Moyens de paiement",
    description: `═══════════════════════════════════════
1. LES TYPES D'ENTREPRENEURS
═══════════════════════════════════════

🔨 L'ARTISAN : Exerce un métier manuel selon des normes traditionnelles. Moins de 11 salariés à la création.
→ Ex : boulanger, maçon, chauffeur VTC/taxi
→ S'immatricule à la Chambre des Métiers et de l'Artisanat (CMA)

📚 LA PROFESSION LIBÉRALE : Exercée à titre personnel, sous sa responsabilité, de façon indépendante.
→ Ex : médecin, avocat, architecte, expert-comptable

🌾 L'AGRICULTEUR : Mise en culture de la terre et/ou élevage d'animaux.

🏪 LE COMMERÇANT : Exerce des actes de commerce à titre habituel.
→ Ex : restaurateur, agent immobilier

✔ Un chauffeur VTC/Taxi est un ARTISAN → il s'inscrit à la CMA, pas à la Chambre de Commerce.

═══════════════════════════════════════
2. PERSONNE PHYSIQUE OU MORALE ?
═══════════════════════════════════════

PERSONNE PHYSIQUE :
• Patrimoine personnel et professionnel CONFONDUS (sauf EI avec option séparation)
• Pas de capital social minimum
• Pas d'abus de bien social possible
• Exemples : Micro-entrepreneur, EI

PERSONNE MORALE :
• Patrimoine SÉPARÉ de celui du dirigeant
• Capital social obligatoire (variable selon forme)
• Abus de bien social = DÉLIT (5 ans + 375 000 €)
• Exemples : EURL, SARL, SASU, SAS, SA

✔ Personne morale = entité juridique distincte du dirigeant.

═══════════════════════════════════════
3. LES FORMES JURIDIQUES
═══════════════════════════════════════

EI (Entreprise Individuelle) :
• 1 personne | Pas de capital | Patrimoine confondu (sauf option) | IR

EURL (Entreprise Unipersonnelle à Responsabilité Limitée) :
• 1 associé | Capital libre | Responsabilité limitée aux apports | IR ou IS

SARL (Société à Responsabilité Limitée) :
• 2 à 100 associés | Capital libre | Responsabilité limitée | IR ou IS
• Parts sociales NON librement cessibles (agrément)

SASU (Société par Actions Simplifiée Unipersonnelle) :
• 1 actionnaire | Capital libre | Président = assimilé salarié | IS

SAS (Société par Actions Simplifiée) :
• 2+ actionnaires | Capital libre | Grande liberté statutaire | IS

SA (Société Anonyme) :
• 7+ actionnaires | Capital min 37 000 € | Conseil d'administration | IS

✔ VTC/Taxi → souvent SASU ou micro-entreprise.

═══════════════════════════════════════
1. L'AMORTISSEMENT
═══════════════════════════════════════

L'amortissement est la dépréciation d'un bien due à l'usage, au temps ou à l'obsolescence.

📏 LINÉAIRE : Dépréciation CONSTANTE chaque année.
Formule : Prix HT ÷ Durée = Dotation annuelle
Ex : Voiture 20 000 € HT, durée 4 ans → 5 000 €/an

📉 DÉGRESSIF : Annuités DÉCROISSANTES — amortissement accéléré au début.
INTERDIT pour : biens d'occasion, véhicules de tourisme (VTC/Taxi !), biens < 3 ans

⚡ EXCEPTIONNEL : Amortissement accéléré sur 24 mois.

Durées indicatives : Véhicule 4-5 ans | Matériel 5-10 ans | Mobilier 10 ans | Bâtiment 20 ans
VALEUR RÉSIDUELLE = Prix d'achat − Total des amortissements cumulés

═══════════════════════════════════════
2. COÛT DE REVIENT ET SEUIL DE RENTABILITÉ
═══════════════════════════════════════

CHARGES FIXES : ne changent pas (loyer, assurance, amortissement)
CHARGES VARIABLES : varient selon l'activité (carburant, péages, entretien)

COÛT DE REVIENT = Charges fixes + Charges variables

Formule MONÔME : Coût total ÷ Nombre de km = Coût au km
Formule BINÔME : Charges fixes ÷ Nombre de courses + Charges variables ÷ km

SEUIL DE RENTABILITÉ = le chiffre d'affaires minimum pour couvrir toutes les charges.

═══════════════════════════════════════
3. TVA — COLLECTÉE VS DÉDUCTIBLE
═══════════════════════════════════════

• TVA COLLECTÉE : celle que vous facturez à vos clients
• TVA DÉDUCTIBLE : celle que vous payez à vos fournisseurs
• TVA À PAYER = TVA collectée − TVA déductible
• Si TVA déductible > TVA collectée → CRÉDIT DE TVA

TAUX DE TVA :
• Transport VTC/Taxi = 10%
• Taux normal = 20% | Intermédiaire = 10% | Réduit = 5,5%

CALCUL :
• HT → TTC : TTC = HT × 1,10
• TTC → HT : HT = TTC ÷ 1,10
Ex : Course 80 € HT → TTC = 88 € → TVA = 8 €

═══════════════════════════════════════
4. RÉGIMES D'IMPOSITION
═══════════════════════════════════════

MICRO-ENTREPRISE :
• CA max : 77 700 € (services) / 188 700 € (vente)
• Abattement forfaitaire (34% ou 50%) sur le CA
• Comptabilité simplifiée (livre des recettes)

RÉEL SIMPLIFIÉ :
• Déduction des charges réelles
• Bilan simplifié, TVA déclarée semestriellement

RÉEL NORMAL :
• Comptabilité complète obligatoire
• TVA déclarée mensuellement

═══════════════════════════════════════
5. RÉGIMES SOCIAUX — TNS VS ASSIMILÉ SALARIÉ
═══════════════════════════════════════

TNS (Travailleur Non Salarié) :
• EI, EURL, SARL (gérant majoritaire)
• Cotisations SSI — environ 45% du revenu
• Pas d'assurance chômage

ASSIMILÉ SALARIÉ :
• SASU, SAS (président)
• Cotisations régime général — environ 65-80% du salaire brut
• Meilleure couverture sociale
• Pas d'assurance chômage non plus

CSG : 9,2% sur tous les revenus | CRDS : 0,5%

═══════════════════════════════════════
1. MARGE, TVA ET CALCUL DU PRIX DE VENTE
═══════════════════════════════════════

CALCUL DE LA TVA — Taux VTC/Taxi = 10% :
• HT → TTC : TTC = HT × 1,10
• TTC → HT : HT = TTC ÷ 1,10

LA MARGE — Ce qui reste après le coût de revient :
Exemple : Coût = 40 € | Prix de vente = 60 € HT
• Marge = 20 €
• % sur le coût de revient = (20 ÷ 40) × 100 = 50%
• % sur le chiffre d'affaires = (20 ÷ 60) × 100 = 33,3%

═══════════════════════════════════════
2. LES DIVIDENDES
═══════════════════════════════════════

Les dividendes = part des bénéfices nets distribuée aux actionnaires.
• Non soumis aux cotisations sociales mais prélèvements sociaux (~17,2%)

IMPOSITION :
• Flat tax (PFU) = 30% (12,8% IR + 17,2% prélèvements sociaux)
• OU option barème progressif avec abattement 40%

⚠ Dividendes possibles uniquement en société (pas en EI/micro).

═══════════════════════════════════════
3. STATUTS DU CONJOINT ENTREPRENEUR
═══════════════════════════════════════

COLLABORATEUR : Participe sans être rémunéré ni associé. Droits sociaux propres.
ASSOCIÉ : Détient des parts, participe aux décisions, perçoit des dividendes.
SALARIÉ : Contrat de travail + lien de subordination, protection sociale complète.

═══════════════════════════════════════
4. CMA, CGA & EXPERT-COMPTABLE
═══════════════════════════════════════

CMA : Immatriculation artisans, organisation examens T3P.
CGA : Aide à la gestion comptable, adhésion = pas de majoration 25% du bénéfice.
EXPERT-COMPTABLE : Tenue et certification des comptes, membre de l'Ordre.
Hiérarchie : Commissaire aux comptes > Expert-comptable > Comptable

═══════════════════════════════════════
5. LES MOYENS DE PAIEMENT
═══════════════════════════════════════

CHÈQUE :
• Valable 1 an et 8 jours après émission
• Provision suffisante obligatoire

CARTE BANCAIRE :
• Terminal de paiement obligatoire pour VTC/Taxi
• Pas de montant minimum exigible

ESPÈCES :
• Acceptation obligatoire jusqu'à 1 000 €
• Au-delà : paiement par carte ou chèque obligatoire
• Le commerçant doit rendre la monnaie`,
  },
];

// =============================================
// MATIÈRE C — SÉCURITÉ ROUTIÈRE (1 partie)
// =============================================

const MATIERE_C: ContentItem[] = [
  {
    id: 3001, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE",
    sousTitre: "Avertisseurs, Panneaux, Vérifications, Marquages au sol, Stationnements, Priorités, Distances, Alcool & Stupéfiants, Vitesses, Accidents, Permis à points",
    description: `═══════════════════════════════════════
1. AVERTISSEURS : SONORE, LUMINEUX, CLIGNOTANTS & DÉTRESSE
═══════════════════════════════════════

🔔 AVERTISSEUR SONORE :
• En agglomération : uniquement en cas de danger immédiat
• Hors agglomération : pour avertir les autres usagers
• Sanction : amende forfaitaire classe 2

🔆 APPELS DE PHARES : Utilisables la nuit en remplacement de l'avertisseur sonore.

CLIGNOTANTS : Obligatoires pour tourner, dépasser, changer de voie, s'arrêter.
FEUX DE DÉTRESSE : Véhicule immobilisé, allure réduite, dernier d'une file.

TYPES DE PANNEAUX :
• INTERDICTION : Rond rouge bordé de rouge
• OBLIGATION : Rond bleu fond bleu
• DANGER : Triangle rouge fond blanc
• INDICATION : Carré ou rectangle fond bleu

═══════════════════════════════════════
2. VÉRIFICATIONS DU VÉHICULE
═══════════════════════════════════════

• Niveaux : huile, liquide de refroidissement, lave-glace, freins
• Pneumatiques : pression, usure (témoin 1,6 mm minimum)
• Éclairage : feux avant, arrière, stop, clignotants
• Rétroviseurs : intérieur + extérieurs propres et réglés

ÉQUIPEMENTS OBLIGATOIRES :
• Gilet jaune (dans l'habitacle, pas le coffre)
• Triangle de présignalisation
• Éthylotest (recommandé)
• Roue de secours ou kit anti-crevaison

═══════════════════════════════════════
3. MARQUAGES AU SOL & TYPES DE VOIES
═══════════════════════════════════════

• Ligne continue : interdiction de franchir ou chevaucher
• Ligne discontinue : autorisation de franchir
• Ligne mixte : selon le côté
• Piste cyclable : réservée aux vélos
• Voie de bus : réservée aux transports en commun (et parfois taxis)

═══════════════════════════════════════
4. STATIONNEMENTS
═══════════════════════════════════════

STATIONNEMENT ALTERNÉ :
• Du 1er au 15 : côté impair | Du 16 à la fin : côté pair
STATIONNEMENT INTERDIT : panneau rond cerclé rouge avec barre oblique
ARRÊT ET STATIONNEMENT INTERDITS : panneau avec croix (2 barres)

═══════════════════════════════════════
5. PRIORITÉS, FEUX & CROISEMENTS
═══════════════════════════════════════

• Priorité à droite : règle par défaut
• Route prioritaire : panneau losange jaune
• STOP : arrêt obligatoire + céder le passage
• Cédez le passage : ralentir sans obligation de s'arrêter

FEUX TRICOLORES :
• Vert : passage autorisé
• Orange : arrêt sauf si arrêt dangereux
• Rouge : arrêt obligatoire

CROISEMENT EN PENTE : Le véhicule qui monte a la priorité.

═══════════════════════════════════════
1. DISTANCES : RÉACTION, ARRÊT, FREINAGE
═══════════════════════════════════════

DISTANCE DE RÉACTION = 1 SECONDE
Formule : Dizaines × 3
• 50 km/h → 15 m | 80 km/h → 24 m | 130 km/h → 39 m

DISTANCE D'ARRÊT (route sèche) = Dizaines × Dizaines
• 50 km/h → 25 m | 80 km/h → 64 m | 130 km/h → 169 m

ROUTE MOUILLÉE : Distance d'arrêt × 1,5

DISTANCE DE SÉCURITÉ = Dizaines × 6
INTERVALLE DE SÉCURITÉ MINIMUM : 2 secondes

═══════════════════════════════════════
2. SIÈGE AUTO & FIXATION ISOFIX
═══════════════════════════════════════

Obligation : tout enfant < 135 cm doit être en siège auto adapté.
• Groupe 0 (0-10 kg) : nacelle ou coque dos à la route
• Groupe 0+ (0-13 kg) : coque dos à la route
• Groupe 1 (9-18 kg) : siège face à la route avec harnais
• Groupe 2 (15-25 kg) : rehausseur avec dossier
• Groupe 3 (22-36 kg) : rehausseur sans dossier

ISOFIX : système de fixation standardisé, plus sûr que la ceinture seule.

═══════════════════════════════════════
3. ALCOOL AU VOLANT
═══════════════════════════════════════

SEUILS LÉGAUX :
• Conducteur normal : 0,5 g/L sang = 0,25 mg/L air expiré
• Permis probatoire : 0,2 g/L sang = 0,10 mg/L air expiré

Contravention (0,5–0,8 g/L) : 135 € + 6 points
Délit (≥ 0,8 g/L) : 2 ans prison + 4 500 € + 6 points + suspension/annulation permis

STUPÉFIANTS : Tolérance ZÉRO
• 2 ans prison + 4 500 € + 6 points
• Alcool + Stupéfiants : 3 ans + 9 000 €

═══════════════════════════════════════
4. VITESSES ET DÉPASSEMENTS
═══════════════════════════════════════

LIMITATIONS :
• Agglomération : 50 km/h | Route : 80 km/h | Séparées : 110 km/h | Autoroute : 130 km/h
• Pluie : −10/−20 km/h | Visibilité < 50 m : 50 km/h partout

DÉPASSEMENT :
• Par la GAUCHE (sauf véhicule tournant à gauche)
• Interdit : ligne continue, virage, sommet de côte, passage piéton
• Distance latérale : 1 m en agglomération, 1,5 m hors agglomération

═══════════════════════════════════════
1. MÉDICAMENTS, STRESS ET FATIGUE AU VOLANT
═══════════════════════════════════════

MÉDICAMENTS — 3 niveaux de pictogrammes :
🟡 Niveau 1 — Soyez prudent : conduite possible
🟠 Niveau 2 — Soyez très prudent : avis médecin
🔴 Niveau 3 — DANGER : conduite INTERDITE

FATIGUE : 1ère cause de mortalité autoroute (~20% des accidents mortels)
→ Pause 15-20 min toutes les 2h | Ne pas conduire entre 2h et 5h

STRESS VTC : Anticiper trajets | Respiration profonde | Ne jamais conduire sous émotion forte

═══════════════════════════════════════
2. PRISE EN CHARGE DES PASSAGERS — SÉCURITÉ
═══════════════════════════════════════

Avant le départ :
• Vérifier ceinture pour TOUS les passagers
• S'assurer des sièges enfants adaptés (< 135 cm)
• Verrouiller les portières

SÉCURITÉ PASSIVE : airbags, ceinture, structure déformable (protège PENDANT l'accident)
SÉCURITÉ ACTIVE : ABS, ESP, direction assistée (ÉVITE l'accident)

Sanctions ceinture : 135 € + 3 points (conducteur)

═══════════════════════════════════════
3. LIMITATIONS DE VITESSE & ÉCO-CONDUITE
═══════════════════════════════════════

8 PRINCIPES ÉCO-CONDUITE :
1. Anticiper le trafic et les freinages
2. Passer les rapports tôt (2000 tr/min diesel, 2500 essence)
3. Utiliser le frein moteur en descente
4. Maintenir une vitesse stable
5. Couper le moteur à l'arrêt (> 20 secondes)
6. Vérifier la pression des pneus
7. Ne pas surcharger le véhicule
8. Limiter la climatisation

═══════════════════════════════════════
4. CONTRÔLE TECHNIQUE & ACCIDENTS
═══════════════════════════════════════

CONTRÔLE TECHNIQUE :
• Obligatoire pour véhicules de plus de 4 ans, puis tous les 2 ans (annuel pour taxis)
• 133 points de contrôle, 3 niveaux de défaillances
• Défaillance critique = interdiction de circuler

EN CAS D'ACCIDENT — P.A.S. :
P = PROTÉGER (baliser, gilet jaune, triangle)
A = ALERTER (15 SAMU | 18 Pompiers | 17 Police | 112 Urgences européen)
S = SECOURIR (PLS si inconscient, ne pas déplacer sauf danger)

CONSTAT AMIABLE : Remplir sur place, envoyer sous 5 jours ouvrés.

═══════════════════════════════════════
5. PERMIS À POINTS
═══════════════════════════════════════

• Capital initial : 12 points (6 en probatoire)
• Perte maximale par infraction : 8 points
• 0 point = invalidation du permis

RÉCUPÉRATION :
• 6 mois sans infraction : récupération classe 1
• 2 ans : classes 2-3
• 3 ans : TOUS les points (retour à 12)

STAGE : +4 points max, 2 jours consécutifs (14h), environ 200-300 €

ANNULATION (judiciaire) vs INVALIDATION (administrative = 0 point)
→ Repassage permis après 6 mois minimum`,
  },
];

// =============================================
// MATIÈRE D — FRANÇAIS (1 partie)
// =============================================

const MATIERE_D: ContentItem[] = [
  {
    id: 4001, actif: true,
    titre: "D. FRANÇAIS",
    sousTitre: "Conjugaison, Compréhension de texte, Accueil clientèle, Demandes, Confort, Conversation, Prise de congé",
    description: `═══════════════════════════════════════
1. CONJUGAISON
═══════════════════════════════════════

LE 1er GROUPE — Verbes en -er (sauf aller) :
90% des verbes | Terminaisons : -e, -es, -e, -ons, -ez, -ent

LE 2ème GROUPE — Verbes en -ir (participe présent en -issant) :
Terminaisons : -is, -is, -it, -issons, -issez, -issent

LE 3ème GROUPE — Verbes irréguliers (-ir, -oir, -re + aller) :
Règle générale : -s, -s, -t, -ons, -ez, -ent
Exceptions : pouvoir/vouloir/valoir → -x, -x, -t

ACCORD DU PARTICIPE PASSÉ :
• Avec ÊTRE : accord avec le SUJET
• Avec AVOIR : accord avec le COD si placé AVANT
• PRONOMINAL : pas d'accord si COD après le verbe

═══════════════════════════════════════
2. COMPRÉHENSION DE TEXTE
═══════════════════════════════════════

MÉTHODOLOGIE — 6 étapes :
1. Lire les questions et définir les mots clés avant de lire le texte
2. Lire le texte et s'arrêter aux passages pertinents
3. Lire minimum 3 lignes autour de la réponse
4. Ne pas inventer ce qui n'est pas dit — rester fidèle au texte
5. Procéder par élimination si hésitation
6. Si question trop difficile, répondre avec logique

• Antonyme : mot de sens opposé (grand/petit)
• Paradoxe : opinion contraire à l'avis général

═══════════════════════════════════════
3. ACCUEILLIR LA CLIENTÈLE
═══════════════════════════════════════

FORMULES D'ACCUEIL :
• "Bonjour Monsieur/Madame [Nom]."
• "Bienvenue, je suis [Prénom], votre chauffeur."
• "Puis-je prendre vos bagages ?"
• "Installez-vous confortablement."

CLÉS DE LA PREMIÈRE IMPRESSION :
✓ Sourire naturel | ✓ Tenue soignée | ✓ Ponctualité (5 min avant)
✓ Sortir du véhicule, ouvrir la porte | ✓ Confirmer la destination

ERREURS À ÉVITER :
✗ Rester dans la voiture | ✗ Téléphoner pendant l'accueil
✗ Tutoyer un client | ✗ Voiture sale ou malodorante

═══════════════════════════════════════
4. COMPRENDRE LES DEMANDES
═══════════════════════════════════════

DEMANDES FRÉQUENTES :
• "Pouvez-vous passer par [rue] ?" → Trajet spécifique
• "Peut-on faire un arrêt rapide ?" → Arrêt intermédiaire
• "Combien va coûter la course ?" → Tarification

TECHNIQUES D'ÉCOUTE ACTIVE :
1. Écouter sans interrompre
2. Reformuler : "Si je comprends bien, vous souhaitez…"
3. Confirmer : "Très bien, je prends la route par [X]."
4. Proposer des alternatives
5. Rester calme face à un client mécontent

═══════════════════════════════════════
5. INTERROGER SUR LE CONFORT
═══════════════════════════════════════

• "La température vous convient-elle ?"
• "Souhaitez-vous de la musique ?"
• "Préférez-vous l'autoroute ou les nationales ?"

BONNES PRATIQUES :
✓ Proposer eau, bonbons, chargeurs | ✓ Conduite douce
✓ Anticiper : clim avant que le client monte | ✓ Ne pas insister si décliné

🎯 Client confortable = client satisfait = client qui revient

═══════════════════════════════════════
6. CONVERSATION NEUTRE ET COURTOISE
═══════════════════════════════════════

SUJETS APPROPRIÉS ✓ : Météo, trafic, ville, événements, voyage, sport
SUJETS À ÉVITER ✗ : Politique, religion, sujets polémiques, problèmes personnels

RÈGLES :
• Vouvoyer systématiquement | • Respecter le silence du client
• Rester positif | • Adapter son langage (pas d'argot)

═══════════════════════════════════════
7. PRENDRE CONGÉ
═══════════════════════════════════════

FORMULES DE DÉPART :
• "Nous sommes arrivés, Monsieur/Madame."
• "Merci d'avoir fait appel à nos services."
• "Je vous souhaite une excellente journée/soirée."
• "Au plaisir de vous revoir."

GESTES DE FIN DE COURSE :
• Ouvrir la porte | • Aider avec les bagages | • Carte de visite
• "Rien oublié ?" | • Proposer un reçu | • Demander un avis en ligne

FIDÉLISATION :
• Donner PLUSIEURS cartes de visite
• "10% pour votre prochaine course"

🤝 Client satisfait = 2 personnes informées | Client insatisfait = 10 !`,
  },
];

// =============================================
// MATIÈRE E — ANGLAIS (1 partie)
// =============================================

const MATIERE_E: ContentItem[] = [
  {
    id: 5001, actif: true,
    titre: "E. ANGLAIS",
    sousTitre: "Vocabulary, Grammar, Welcoming, During the Ride, Lyon, Saying Goodbye, Question Words",
    description: `═══════════════════════════════════════
1. VOCABULARY — Station, Airport, Vehicle, Weather
═══════════════════════════════════════

AT THE STATION :
The train | The platform (Quai) | A passenger | The ticket office (Guichet) | A single ticket (Aller simple) | A return ticket (Aller-retour) | Lost property office (Objets trouvés)

AIRPORT :
To go through customs (Douane) | To fly / To board | The flight number | Jetlag | Business / Economy class | To take off / To land | A seat belt (Ceinture)

THE VEHICLE :
Back seat / Front seat | Battery / Engine | Boot (GB) / Trunk (US) = Coffre | Brake / Clutch | Dashboard (Tableau de bord) | Steering wheel (Volant) | Air conditioned

WEATHER :
Hot / Boiling hot | Cold / Freezing | Sunny / Cloudy | It's raining / It's snowing

TRANSPORT WORDS :
Board / Get-off | Cancellation / Delay | An extra charge (Supplément) | Break down (Panne) | Keep the change | The ride (La course) | A tip (Pourboire) | Toll (Péage)

⚠ Mots toujours SINGULIERS : accommodation, advice, baggage, bread, furniture, information, luggage, news, work

═══════════════════════════════════════
2. GRAMMAR — BE, HAVE, Tenses
═══════════════════════════════════════

TO BE : I am / You are / He is / We are / They are | Past: was/were
TO HAVE : I have / You have / He has | Past: had
There is + singulier | There are + pluriel

PREPOSITIONS :
IN : mois, saisons, pays, villes | ON : jours | AT : heures, AT night | TO : mouvement

THE PRETERIT : base + ED (réguliers) | Irréguliers (go → went)
PRESENT PERFECT : HAVE + PP | FOR = durée | SINCE = date
FUTURE : WILL + verbe | CONDITIONAL : WOULD + verbe

MODALS : CAN/COULD | MAY/MIGHT | MUST | SHOULD | WOULD | SHALL | NEED

═══════════════════════════════════════
3. GRAMMAR — Comparatives, Time, Plural, Quantifiers
═══════════════════════════════════════

COMPARATIFS :
• adj + ER + than (court) | MORE + adj + than (long)
• AS + adj + AS (égalité) | LESS + adj + THAN (infériorité)
Irréguliers : good → better → best | bad → worse → worst

TIME : AM/PM | O'CLOCK | QUARTER | HALF | PAST (1-30) / TO (31-59)

PLURAL : +S | S/SS → +ES | O → +ES | man→men, woman→women, person→people

QUANTIFIERS : MUCH (indénombrables) | MANY (dénombrables) | A LOT OF (les deux)

═══════════════════════════════════════
4. WELCOMING & DIRECTIONS
═══════════════════════════════════════

"Hello, are you Mr or Mrs…?" | "May I confirm your identity?"
"If you'd like to get into the car…" | "Do you mind if I check your identity?"

DIRECTIONS :
"What's your current location?" | "Go straight on" | "Could you open the boot?"
"I'm afraid you're late"

✗ "What is your name?" → ✓ "May I have your name, please?"
✗ "You want go where?" → ✓ "Where would you like to go?"

═══════════════════════════════════════
5. DURING THE RIDE — Comfort & Small Talk
═══════════════════════════════════════

"Make yourself comfortable." | "Is everything alright?"
"What's your destination?" | "Fine, I'll take you there."
"Would you like some water?" | "Is the temperature OK?"

SMALL TALK :
"What line of business are you in?" | "What a beautiful day!"
"There's a bit of traffic." | "Have you been here before?"
"Please, fasten your seat-belt."

✗ Avoid: politics, religion, personal questions
💡 "I'm sorry, could you say that again more slowly?"

═══════════════════════════════════════
6. TALKING ABOUT LYON
═══════════════════════════════════════

"Lyon has a population of over 500,000."
"The city is well-known for pharmaceuticals."
"Lyon is at the forefront of vaccines." — 1er centre vaccins au monde.
"Lyon has prestigious universities." — 2ème ville étudiante.

═══════════════════════════════════════
7. SAYING GOODBYE
═══════════════════════════════════════

"Here we are! We've arrived." | "Thank you for choosing us."
"I hope you enjoyed the ride." | "Have a great day/evening!"
"Enjoy your stay in Lyon!" | "It was a pleasure. Goodbye!"

✓ Open the door | ✓ Help with luggage | ✓ Hand over business card
✓ "Have you got everything?" | ✓ Offer a receipt | ✓ Ask for a review
✓ "10% discount for returning clients."

🤝 The end of the ride is the beginning of the next booking!

═══════════════════════════════════════
8. QUESTION WORDS
═══════════════════════════════════════

WHICH : "The car which is pink is mine." (chose)
WHERE : "The city where I live is beautiful." (lieu)
WHEN : "She was born the day when Diana died." (date)
WHO : "The woman who drives is my neighbour." (personne)
WHAT : "What do you want?" (question ouverte)
HOW LONG : "How long are you staying in France?" (durée)`,
  },
];

// =============================================
// MATIÈRE F — RÉGLEMENTATION SPÉCIFIQUE VTC (1 partie)
// =============================================

const MATIERE_F: ContentItem[] = [
  {
    id: 6001, actif: true,
    titre: "F. RÉGLEMENTATION SPÉCIFIQUE VTC",
    sousTitre: "Registre VTC, Garantie financière, Vignettes, Véhicule, Bon de commande, Carte professionnelle, Sanctions",
    description: `═══════════════════════════════════════
1. INSCRIPTION AU REGISTRE DES VTC
═══════════════════════════════════════

OBLIGATION D'INSCRIPTION :
Après avoir reçu votre carte professionnelle, pour créer votre entreprise il va falloir vous inscrire au registre des VTC (cette inscription ne concerne que les personnes qui souhaitent travailler à leur compte). En tant qu'exploitant vous devez obligatoirement vous inscrire sur le registre des VTC et payer une taxe de 170 euros tous les 5 ans.

Site : https://registre-vtc.developpement-durable.gouv.fr/

DURÉE DE VALIDITÉ :
L'inscription au registre des VTC dure 5 ans. Vous devez faire un renouvellement au bout de ces 5 ans si vous n'avez pas changé d'entreprise dans les 3 mois qui précèdent la fin de l'inscription.

• Taxe : 170€ / 5 ans
• Durée inscription : 5 ans
• Garantie / véhicule : 1 500€

DOCUMENTS À FOURNIR (exploitant) :
1. Attestation d'assurance (responsabilité civile professionnelle)
2. Copie de l'extrait KBIS, D1 ou répertoire SIREN à jour
3. Copie du certificat d'immatriculation (carte grise) pour chaque véhicule
4. Copie de la carte professionnelle pour chaque conducteur
5. Justificatif de la capacité financière : 1 500€ par véhicule (sauf propriétaires, location > 6 mois, événements exceptionnels)

═══════════════════════════════════════
2. LA GARANTIE FINANCIÈRE : 1 500€ PAR VÉHICULE
═══════════════════════════════════════

La garantie financière est un indice de votre capacité à détenir des ressources financières suffisantes pour assurer une gestion optimale de votre activité.

ORGANISMES : Ces garanties sont accordées par un ou plusieurs organismes financiers agréés par l'Autorité de contrôle prudentiel et de résolution, ou par tout établissement de crédit fournissant des prestations en France.

CAS D'EXEMPTION — Vous n'avez PAS besoin de la garantie financière si :
• Vous êtes propriétaire de votre véhicule
• Vous avez loué un véhicule pour ≥ 6 mois
• En cas de panne ou d'événements commerciaux, culturels, éducatifs, politiques…

Dans ces cas, envoyer au registre VTC : copie certificat d'immatriculation + carte pro + période du recours. Ce recours ne peut excéder 1 mois.

═══════════════════════════════════════
3. MODIFICATIONS & CESSATION DE VALIDITÉ
═══════════════════════════════════════

Si vous changez de véhicule, de statut ou toute autre information administrative, vous devez prévenir le registre des VTC dans un délai maximum de 15 jours.

L'inscription cesse d'être valide quand :
• Le véhicule déclaré n'est plus conforme aux caractéristiques techniques
• L'inscription arrive à échéance (maximum 5 ans)
• La durée du recours à des véhicules exceptionnels est expirée (au-delà de la durée déclarée, 3 mois max)

📌 Délai de déclaration des modifications : 15 jours maximum

═══════════════════════════════════════
4. VIGNETTES VTC : TEMPORAIRE & DÉFINITIVES
═══════════════════════════════════════

VIGNETTE TEMPORAIRE :
Après être enregistré au registre des VTC et avoir reçu l'attestation d'inscription (sous 2 mois), il faut commander les vignettes (2 au total). Avant de recevoir les définitives, imprimer une vignette temporaire à placer sur le pare-brise avant côté chauffeur. Valable 30 jours ouvrés.

2 VIGNETTES DÉFINITIVES :
• 1ère : angle du pare-brise avant, en bas à gauche (côté conducteur)
• 2ème : angle du pare-brise arrière, en bas à droite (opposé au conducteur)
• Prix : 36€ (obligatoirement délivrées par l'Imprimerie nationale)

MENTIONS INSCRITES SUR LA VIGNETTE :
• Le numéro d'inscription de l'entreprise au registre des VTC (1er carré blanc)
• Le numéro d'immatriculation du véhicule (2nd carré blanc)
• La référence de la vignette

LA VIGNETTE N'EST PLUS VALABLE SI :
• Véhicule non conforme aux caractéristiques techniques
• Inscription arrivée à échéance (max 5 ans)
• Durée du recours expiré (1 mois max)
• Changement de véhicule → nouvelles vignettes à payer

═══════════════════════════════════════
5. CARACTÉRISTIQUES TECHNIQUES DU VÉHICULE VTC
═══════════════════════════════════════

• Places : entre 4 et 9 places, chauffeur compris
• Âge : moins de 7 ans
• Portes : au moins 4 portes
• Dimensions : minimum 4,50 m × 1,70 m
• Puissance : moteur ≥ 84 kW (environ 115 CV)

Exceptions : Les véhicules hybrides, électriques et de collection ne sont pas dans l'obligation de respecter ces conditions.
Un véhicule est considéré comme collection lorsqu'il a au moins 30 ans et que sa production a cessé.

═══════════════════════════════════════
6. JUSTIFICATIF DE RÉSERVATION PRÉALABLE
═══════════════════════════════════════

Obligation (arrêté du 6 août 2025 — en vigueur depuis le 29 octobre 2025)

En tant que chauffeur VTC, vous devez disposer d'un justificatif de réservation préalable pour chaque course effectuée. Ce document peut être sur support papier ou électronique (« bon de commande », « bon de réservation », « billet individuel » ou « billet collectif »).

📋 7 MENTIONS OBLIGATOIRES (article 1 de l'arrêté du 6 août 2025) :
1. Nom ou dénomination sociale et coordonnées de la société VTC
2. Numéro d'inscription de l'exploitant au registre des VTC (REVTC)
3. Numéro unique d'identification de l'exploitant (SIREN)
4. Nom et coordonnées téléphoniques du client
5. Date et heure de la réservation préalable effectuée par le client
6. Date et heure de la prise en charge souhaitées par le client
7. Lieu de prise en charge indiqué par le client

⚠ Absence de réservation préalable = 1 an de prison + 15 000€ d'amende + immobilisation véhicule

═══════════════════════════════════════
7. CARTE PROFESSIONNELLE VTC
═══════════════════════════════════════

DOCUMENTS À FOURNIR (à la préfecture) :
1. Photocopie de votre pièce d'identité recto-verso
2. Photocopie recto-verso de votre permis de conduire
3. Certificat médical
4. Justificatif de domicile de moins de 3 mois
5. 1 photo d'identité
6. Attestation de formation continue

AU RECTO : Code à barres bidimensionnel « 2D-DOC », date de fin de validité, numéro de la carte, photographie d'identité du conducteur.
AU VERSO : Nom, prénom, date et lieu de naissance, signature du conducteur.

• Coût : environ 60€ TTC (Imprimerie nationale)
• Valable 5 ans
• Doit être apposée sur le pare-brise ou à défaut à l'intérieur du véhicule (de façon visible)

═══════════════════════════════════════
8. DOCUMENTS À PRÉSENTER EN CAS DE CONTRÔLE ROUTIER
═══════════════════════════════════════

7 DOCUMENTS OBLIGATOIRES :
1. Carte professionnelle VTC — apposée sur le pare-brise ou visible dans le véhicule (valable 5 ans)
2. Permis de conduire — catégorie B en cours de validité
3. Certificat d'immatriculation (carte grise) — du véhicule utilisé pour l'activité
4. Attestation d'assurance — responsabilité civile professionnelle en cours de validité
5. Justificatif de réservation préalable — papier ou numérique, avec les 7 mentions obligatoires
6. Vignettes VTC — 2 vignettes (ou temporaire) apposées sur les pare-brises avant et arrière
7. Attestation d'inscription au registre des VTC — délivrée dans les 2 mois suivant l'inscription

⚠ L'absence de l'un de ces documents peut entraîner une contravention ou la suspension de l'activité.

═══════════════════════════════════════
9. SANCTIONS ADMINISTRATIVES ET PÉNALES
═══════════════════════════════════════

SANCTIONS ADMINISTRATIVES :
L'autorité compétente (le Préfet), en cas de violation de la réglementation par le conducteur VTC, peut :
• Donner un avertissement
• Procéder au retrait temporaire de sa carte professionnelle
• Procéder au retrait définitif de sa carte professionnelle

DÉLITS — 1 an de prison + 15 000€ :
• Prise en charge d'un client sur la voie publique sans réservation préalable
• Location à la place
• Exercice illégal de l'activité
• Absence d'inscription au registre

CONTRAVENTIONS DE 5ÈME CLASSE :
• Circulation sur voie publique en quête de clients
• Arrêt/stationnement en quête de clients
• Stationnement en gare/aérogare au-delà de 1h avant la prise en charge

SANCTIONS PÉNALES (peines complémentaires) :
• Suspension du permis de conduire pour une durée maximale de 5 ans
• Immobilisation du véhicule pour une durée maximale de 1 an`,
  },
];

// =============================================
// MATIÈRE G — DÉVELOPPEMENT COMMERCIAL (1 partie)
// =============================================

const MATIERE_G: ContentItem[] = [
  {
    id: 7001, actif: true,
    titre: "G. DÉVELOPPEMENT COMMERCIAL",
    sousTitre: "Marketing, Mercatique, SWOT, PESTEL, Porter, Segmentation, Fidélisation, Communication numérique, Partenaires, Devis & Facture",
    description: `═══════════════════════════════════════
1. LA MERCATIQUE : PRINCIPES FONDAMENTAUX
═══════════════════════════════════════

DÉFINITION :
Le marketing peut être défini comme l'ensemble des actions ayant pour objectifs d'étudier et d'influencer les besoins et comportements des consommateurs et de réaliser en continu les adaptations de la production et de l'appareil commercial.

LA DÉMARCHE MERCATIQUE :
Consiste, à partir de l'analyse des attentes des consommateurs, à définir l'offre de biens et de services avec leurs moyens de commercialisation. Elle est composée du marketing stratégique et opérationnel.

• Marketing stratégique : analyse externe (marché, demande, offre, environnement) + analyse interne (forces et faiblesses de l'entreprise).
• Marketing opérationnel : les 4P (Produit, Prix, Communication, Distribution). Actions à court terme pour atteindre les objectifs stratégiques.

LES 4P DU MIX MARKETING :
• Produit : Quel service VTC proposer ?
• Prix : À quel tarif ? (prix psychologique, forfaits, grille tarifaire)
• Communication : Comment se faire connaître ? (pub, réseaux, partenariats)
• Distribution : Comment accéder au client ? (applis, plateformes, direct)

COHÉRENCE DU PLAN DE MARCHÉAGE :
• Cohérence interne : Prix élevé = produit de qualité = communication ciblée = distribution sélective
• Cohérence externe : Le plan doit être en cohérence avec les capacités financières et techniques de l'entreprise
• Cohérence temporelle : Les promotions doivent être temporaires

═══════════════════════════════════════
2. OUTILS D'ANALYSE STRATÉGIQUE
═══════════════════════════════════════

ANALYSE SWOT (Strengths – Weaknesses – Opportunities – Threats) :
• S — Forces : véhicule premium, service personnalisé, ponctualité, connaissance terrain
• W — Faiblesses : coûts fixes élevés, dépendance aux plateformes, travail seul
• O — Opportunités : tourisme croissant, événementiel, partenariats entreprises, transport PMR
• T — Menaces : concurrence plateformes, hausse carburant, réglementation changeante

LES 5 FORCES DE PORTER :
1. Concurrents actuels — état de la concurrence, quels sont leurs moyens ?
2. Menace des nouveaux entrants — anticiper l'arrivée de concurrents
3. Menace des produits de substitution — covoiturage, trottinettes…
4. Pouvoir des fournisseurs — peu de fournisseurs = position de force
5. Pouvoir des clients — comparaison via applis, sensibilité au prix

ANALYSE PESTEL :
• P — Politique : évolution de la population et caractéristiques
• E — Économique : taux de croissance, inflation, confiance consommateurs
• S — Social : démographie, nouveaux comportements socioculturels
• T — Technologique : applis, GPS, véhicules électriques
• E — Écologique : ZFE, CRIT'AIR, développement durable
• L — Légal : Code des transports, RGPD, obligations fiscales

═══════════════════════════════════════
3. DÉFINITIONS ESSENTIELLES DU MARKETING
═══════════════════════════════════════

ÉTUDE DE MARCHÉ : Rechercher des informations sur le secteur d'activité (offre, demande, réglementation).

ZONE DE CHALANDISE : Zone habituelle ou prévisionnelle de provenance de l'essentiel des clients.

PRIX PSYCHOLOGIQUE (prix d'acceptabilité) : Le prix accepté par le plus grand nombre de consommateurs selon les caractéristiques du produit/service.

MARKETING DIRECT : Approche du client sans intermédiaire, personnalisée et à distance. C'est à la fois un mode de distribution, de communication, de vente et de stratégie.

B2B (Business to Business) : Activités commerciales réalisées entre professionnels uniquement.
B2C (Business to Consumer) : Activités commerciales réalisées par des entreprises pour des particuliers.

NOTORIÉTÉ : Le nombre de personnes qui connaissent votre marque/service dans votre zone.

PACKAGING : Pour un VTC : l'apparence globale du service (véhicule, tenue du chauffeur, carte de visite, site web…).

STREET MARKETING : Distribution de matériel publicitaire dans un espace public pour créer un bouche-à-oreille favorable.

MARCHÉ DE NICHE : Marché très étroit correspondant à un service très spécialisé. Ex : transport PMR, VTC luxe, navettes entreprise.

SERVICE PREMIUM : Service haut de gamme. Véhicule haut de gamme, eau/bonbons/chargeurs, tenue soignée, tarif justifié par la qualité.

═══════════════════════════════════════
4. SEGMENTATION, CIBLAGE, POSITIONNEMENT
═══════════════════════════════════════

CIBLE : La clientèle à qui nous allons vendre le service. Ex VTC : particuliers, entreprises, touristes, patients médicaux…

SEGMENTATION : Diviser le marché en sous-groupes ayant les mêmes caractéristiques et comportements.

POSITIONNEMENT : Quel service allons-nous proposer ? Haut de gamme / Moyen de gamme / Entrée de gamme.

═══════════════════════════════════════
5. VALORISER LA PRESTATION VTC
═══════════════════════════════════════

QUALITÉS DU CHAUFFEUR VTC :
• Bonne présentation vestimentaire
• Courtois, serviable, chaleureux
• Véhicule de qualité (< 7 ans, ≥ 4m50 de long)
• Bouteilles d'eau, bonbons, chargeurs à disposition
• Ponctualité irréprochable
• Discrétion et adaptation au client
• Véhicule toujours propre (pas de désodorisant)
• Pas de sujets politiques ou religieux

STRATÉGIE DE DIFFÉRENCIATION TARIFAIRE :
• Forfait aéroport/gare — prix fixe rassurant
• Tarif horaire (mise à disposition) — événements, mariages, journées business
• Abonnement entreprise — contrat mensuel, tarifs négociés
• Tarif premium — véhicule haut de gamme, services VIP
• Réductions fidélité — petite remise pour client régulier (pas excessive)

⚠ Un client insatisfait le dira à 10 personnes, un client satisfait le dira à 2 personnes !

═══════════════════════════════════════
6. FIDÉLISATION & PROSPECTION
═══════════════════════════════════════

FIDÉLISATION : Ensemble des actions pour que les clients restent fidèles et continuent à consommer vos services.

PROSPECTION : Ensemble des actions qui visent à identifier et contacter de nouveaux clients (prospects = clients potentiels).

COMMENT FIDÉLISER :
• Être disponible et réactif (téléphone, mail, WhatsApp)
• Envoyer régulièrement des courriels ou SMS avec offres et promotions (1× toutes les 2 semaines min.)
• Laisser PLUSIEURS cartes de visite au client
• Prestation irréprochable à chaque course
• Se distinguer : journaux, chargeurs, tablettes, eau, bonbons
• Petites réductions fidélité (pas de remise importante)

FACTEURS DE RÉUSSITE :
• Être respectueux, courtois et serviable
• Le sourire est toujours plus agréable
• Apprendre à connaître le client, utiliser son langage
• Ne pas parler s'il n'a pas envie, parler s'il a envie
• Être au besoin du client, repérer ses besoins
• Voiture toujours propre, pas d'odeurs

PROSPECTION TRADITIONNELLE : Porte à porte (hôtels, restaurants, entreprises), téléphone, cartes de visite et flyers, événements locaux.
PROSPECTION NUMÉRIQUE : Site web professionnel, réseaux sociaux (Instagram, Facebook, LinkedIn), emailing/SMS, Google My Business, plateformes VTC.

═══════════════════════════════════════
7. COMMUNICATION & PRÉSENCE NUMÉRIQUE
═══════════════════════════════════════

SITE WEB PROFESSIONNEL : Page d'accueil, services, tarifs, réservation en ligne, mentions légales. Responsive mobile. Nom de domaine professionnel.

GOOGLE MY BUSINESS : Fiche gratuite sur Google. Apparaître dans les recherches locales ("VTC Lyon"). Photos, horaires, avis, lien de réservation.

RÉSEAUX SOCIAUX :
• Instagram : photos véhicule, stories
• Facebook : page pro, avis
• LinkedIn : clients B2B
• Publication régulière (2-3/semaine)
• 90% des clients consultent les avis avant de réserver

COMMUNICATION MÉDIA : Publicité en ligne (Google Ads, Facebook Ads), référencement naturel (SEO), articles sponsorisés, vidéos YouTube/TikTok.

COMMUNICATION HORS MÉDIA : Carte de visite et flyers, emailing/SMS personnalisés, parrainage client, partenariats locaux, événementiel.

ASTUCES SEO : Mots-clés locaux ("VTC Lyon", "chauffeur privé Lyon"), créer du contenu utile (blog), optimiser images et vitesse du site, annuaires locaux.

═══════════════════════════════════════
8. RÉSEAU DE PARTENAIRES & PLATEFORMES
═══════════════════════════════════════

HÔTELS & RESTAURANTS : Tarif préférentiel, cartes à la réception, commission sur course recommandée, cibler le haut de gamme.

ENTREPRISES & CE : Contrats mensuels, navettes salariés, clients VIP, séminaires, facturation sur compte.

PLATEFORMES VTC : Uber, Bolt, Marcel, Heetch, LeCab. Diversifier les sources. Commissions 20-25%. Complément, pas dépendance.

CONCIERGERIES & ÉVÉNEMENTIEL : Mariages, événements d'entreprise, tourisme premium. Marge plus élevée. Confiance à construire.

CLINIQUES, HÔPITAUX, CPAM : Transport médical conventionné. Régulier et prévisible. Conventionnement CPAM nécessaire.

AGENCES DE VOYAGE & TOURS : Transferts aéroport/gare. Circuits touristiques. Service multilingue. Contrats annuels.

🤝 Un partenaire vous recommande si VOTRE qualité de service le fait bien paraître auprès de SES clients.

═══════════════════════════════════════
9. DEVIS & FACTURE VTC
═══════════════════════════════════════

11 MENTIONS OBLIGATOIRES DU DEVIS :
1. Date du devis et durée de validité de l'offre
2. Nom, raison sociale et adresse de l'entreprise (n° de tél. et adresse email)
3. Statut et forme juridique de l'entreprise
4. Pour un artisan : n° au Répertoire des métiers (n° Siren + RM + n° département)
5. Numéro individuel d'identification à la TVA
6. Nom et adresse du client
7. Date de début et durée estimée de la prestation
8. Décompte détaillé de chaque prestation, en quantité et en prix unitaire
9. Prix horaire ou forfaitaire de main d'œuvre
10. Modalités de paiement, de livraison et d'exécution du contrat ; modalités des réclamations et conditions du SAV
11. Somme globale à payer HT et TTC, en précisant les taux de TVA applicables

LA FACTURE : Reprend toutes les mentions du devis + le numéro de la facture (unique et chronologique).

⚠ Le capital social n'est PAS obligatoire sur le devis VTC.
📌 Conservation : 10 ans minimum.`,
  },
];

// =============================================
// ASSEMBLAGE DU MODULE COMPLET
// =============================================

export const VTC_COURS_DATA: ModuleData = {
  id: 2,
  nom: "2.COURS ET EXERCICES VTC",
  description: "Cours complets pour les 7 matières de l'examen VTC : A. Réglementation T3P, B. Gestion, C. Sécurité Routière, D. Français, E. Anglais, F. Réglementation Spécifique VTC, G. Développement Commercial.",
  cours: [
    ...MATIERE_A,
    ...MATIERE_B,
    ...MATIERE_C,
    ...MATIERE_D,
    ...MATIERE_E,
    ...MATIERE_F,
    ...MATIERE_G,
  ],
  exercices: [],
};
