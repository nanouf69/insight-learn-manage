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
// MATIÈRE A — RÉGLEMENTATION T3P (2 parties)
// =============================================

const MATIERE_A: ContentItem[] = [
  {
    id: 1001, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 1",
    sousTitre: "Cadre général, Transport public/privé, Loi LOTI, Taxis, VTC, VMDTR, Organismes, Assurances, Formation continue",
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
14h formation / 5 ans | 3 750 € défaut assurance | 15 000 € exercice illégal | 1 an prison | 10 ans retrait carte | 5 ans fraude | 12/20 note min pratique | 6/20 note éliminatoire`,
  },
  {
    id: 1002, actif: true,
    titre: "A. RÉGLEMENTATION T3P — Partie 2",
    sousTitre: "Agents de contrôle, Juridictions, Sanctions, TPMR, Covoiturage, Intermédiaires, VSS & Discriminations",
    description: `═══════════════════════════════════════
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
// MATIÈRE B — GESTION (3 parties)
// =============================================

const MATIERE_B: ContentItem[] = [
  {
    id: 2001, actif: true,
    titre: "B. GESTION — Partie 1",
    sousTitre: "Types d'entrepreneurs, Personne physique/morale, Formes juridiques (EI → SA)",
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

✔ VTC/Taxi → souvent SASU ou micro-entreprise.`,
  },
  {
    id: 2002, actif: true,
    titre: "B. GESTION — Partie 2",
    sousTitre: "Amortissements, Coût de revient, TVA, Régimes d'imposition, Régimes sociaux",
    description: `═══════════════════════════════════════
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

CSG : 9,2% sur tous les revenus | CRDS : 0,5%`,
  },
  {
    id: 2003, actif: true,
    titre: "B. GESTION — Partie 3",
    sousTitre: "Marge, Dividendes, Statuts du conjoint, CMA/CGA, Moyens de paiement",
    description: `═══════════════════════════════════════
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
// MATIÈRE C — SÉCURITÉ ROUTIÈRE (3 parties)
// =============================================

const MATIERE_C: ContentItem[] = [
  {
    id: 3001, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 1",
    sousTitre: "Avertisseurs, Panneaux, Vérifications, Marquages au sol, Stationnements, Priorités & Feux",
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

CROISEMENT EN PENTE : Le véhicule qui monte a la priorité.`,
  },
  {
    id: 3002, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 2",
    sousTitre: "Distances, Sièges auto, Alcool & Stupéfiants, Vitesses, Dépassements",
    description: `═══════════════════════════════════════
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
• Distance latérale : 1 m en agglomération, 1,5 m hors agglomération`,
  },
  {
    id: 3003, actif: true,
    titre: "C. SÉCURITÉ ROUTIÈRE — Partie 3",
    sousTitre: "Médicaments, Fatigue, Prise en charge passagers, Éco-conduite, Contrôle technique, Accidents, Permis à points",
    description: `═══════════════════════════════════════
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
// MATIÈRE D — FRANÇAIS (7 parties)
// =============================================

const MATIERE_D: ContentItem[] = [
  {
    id: 4001, actif: true,
    titre: "D. FRANÇAIS — Partie 1 : Conjugaison",
    sousTitre: "Les 3 groupes verbaux, terminaisons, accords du participe passé",
    description: `LE 1er GROUPE — Verbes en -er (sauf aller) :
90% des verbes | Terminaisons : -e, -es, -e, -ons, -ez, -ent
Ex : donner → je donne, tu donnes, il donne, nous donnons, vous donnez, ils donnent

LE 2ème GROUPE — Verbes en -ir (participe présent en -issant) :
Terminaisons : -is, -is, -it, -issons, -issez, -issent
Ex : finir → finissant | choisir → choisissant

LE 3ème GROUPE — Verbes irréguliers (-ir, -oir, -re + aller) :
Règle générale : -s, -s, -t, -ons, -ez, -ent
Exceptions : pouvoir/vouloir/valoir → -x, -x, -t
ouvrir/cueillir → comme le 1er groupe (-e, -es, -e)

ACCORD DU PARTICIPE PASSÉ :
• Avec ÊTRE : accord avec le SUJET (ex : "Les filles sont parties")
• Avec AVOIR : accord avec le COD si placé AVANT (ex : "Les pommes qu'ils ont cueillies")
• PRONOMINAL : pas d'accord si COD après le verbe

Terminaisons PP : 1er groupe → -é | 2ème → -i | 3ème → -i, -is, -t, -u`,
  },
  {
    id: 4002, actif: true,
    titre: "D. FRANÇAIS — Partie 2 : Compréhension de texte",
    sousTitre: "6 étapes · Mots clés · Antonymes, paradoxes",
    description: `MÉTHODOLOGIE — 6 étapes :
1. Lire les questions et définir les mots clés avant de lire le texte
2. Lire le texte et s'arrêter aux passages pertinents
3. Lire minimum 3 lignes autour de la réponse
4. Ne pas inventer ce qui n'est pas dit — rester fidèle au texte
5. Procéder par élimination si hésitation
6. Si question trop difficile, répondre avec logique

VOCABULAIRE UTILE :
• Antonyme : mot de sens opposé (grand/petit, monter/descendre)
• Paradoxe : opinion contraire à l'avis général ("Il faut se dépêcher d'attendre")`,
  },
  {
    id: 4003, actif: true,
    titre: "D. FRANÇAIS — Partie 3 : Accueillir la clientèle",
    sousTitre: "Formules d'accueil · Première impression · Erreurs à éviter",
    description: `FORMULES D'ACCUEIL :
• "Bonjour Monsieur/Madame [Nom]."
• "Bienvenue, je suis [Prénom], votre chauffeur."
• "Puis-je prendre vos bagages ?"
• "Installez-vous confortablement."
• "Nous allons à [destination], c'est bien cela ?"

CLÉS DE LA PREMIÈRE IMPRESSION :
✓ Sourire naturel et chaleureux
✓ Tenue soignée et professionnelle
✓ Ponctualité : arriver 5 minutes avant
✓ Sortir du véhicule, ouvrir la porte
✓ Confirmer la destination

ERREURS À ÉVITER :
✗ Rester dans la voiture sans sortir
✗ Téléphoner pendant l'accueil
✗ Tutoyer un client sans y être invité
✗ Voiture sale ou malodorante`,
  },
  {
    id: 4004, actif: true,
    titre: "D. FRANÇAIS — Partie 4 : Comprendre les demandes",
    sousTitre: "Écoute active · Reformulation · Vocabulaire des courses",
    description: `DEMANDES FRÉQUENTES :
• "Pouvez-vous passer par [rue] ?" → Trajet spécifique
• "Peut-on faire un arrêt rapide ?" → Arrêt intermédiaire
• "À quelle heure arrivons-nous ?" → Estimation durée
• "Combien va coûter la course ?" → Tarification

TECHNIQUES D'ÉCOUTE ACTIVE :
1. Écouter sans interrompre
2. Reformuler : "Si je comprends bien, vous souhaitez…"
3. Confirmer : "Très bien, je prends la route par [X]."
4. Proposer des alternatives
5. Rester calme face à un client mécontent

VOCABULAIRE TRANSPORT : prise en charge, destination, itinéraire, détour, péage, embouteillage, forfait, course, tarif, supplément, bagages, coffre, climatisation, réservation préalable`,
  },
  {
    id: 4005, actif: true,
    titre: "D. FRANÇAIS — Partie 5 : Interroger sur le confort",
    sousTitre: "Questions types · Température, musique, trajet",
    description: `QUESTIONS À POSER :
• "La température vous convient-elle ?"
• "Souhaitez-vous de la musique ?"
• "Préférez-vous l'autoroute ou les nationales ?"
• "Avez-vous besoin de quelque chose ?"

BONNES PRATIQUES :
✓ Poser la question en début de course
✓ Proposer eau, bonbons, chargeurs
✓ Conduite douce : vitesse et freinages souples
✓ Anticiper : clim avant que le client monte
✓ Ne pas insister si le client décline

SERVICES À BORD : Eau, bonbons, chargeurs USB, journaux, Wi-Fi, mouchoirs, parapluie

🎯 Client confortable = client satisfait = client qui revient`,
  },
  {
    id: 4006, actif: true,
    titre: "D. FRANÇAIS — Partie 6 : Conversation neutre et courtoise",
    sousTitre: "Sujets appropriés / à éviter · Adapter son langage",
    description: `SUJETS APPROPRIÉS ✓ :
• La météo, le trafic, la ville, les événements locaux, le voyage, le sport

SUJETS À ÉVITER ✗ :
✗ Politique, religion, sujets polémiques, problèmes personnels, critiques

RÈGLES :
• Vouvoyer systématiquement
• Respecter le silence (c'est un choix du client)
• Rester positif, ne pas se plaindre
• Adapter son langage (pas d'argot, articuler)
• Être discret, ne pas donner son avis personnel`,
  },
  {
    id: 4007, actif: true,
    titre: "D. FRANÇAIS — Partie 7 : Prendre congé",
    sousTitre: "Formules de départ · Remerciements · Fidélisation",
    description: `FORMULES DE DÉPART :
• "Nous sommes arrivés, Monsieur/Madame."
• "Merci d'avoir fait appel à nos services."
• "Je vous souhaite une excellente journée/soirée."
• "Au plaisir de vous revoir."

GESTES DE FIN DE COURSE :
• Sortir du véhicule, ouvrir la porte au client
• Aider avec les bagages
• Remettre sa carte de visite
• Vérifier les oublis : "Rien oublié ?"
• Proposer un reçu / une facture
• Demander un avis en ligne

FIDÉLISATION :
• Donner PLUSIEURS cartes de visite
• Proposer réductions fidélité : "10% pour votre prochaine course"
• Rester joignable : numéro, site web, réseaux sociaux

🤝 La fin de course = le début de la fidélisation
Client satisfait = 2 personnes informées | Client insatisfait = 10 personnes informées !`,
  },
];

// =============================================
// MATIÈRE E — ANGLAIS (8 parties)
// =============================================

const MATIERE_E: ContentItem[] = [
  {
    id: 5001, actif: true,
    titre: "E. ANGLAIS — Partie 1 : Vocabulary",
    sousTitre: "Station, Airport, Vehicle, Weather",
    description: `AT THE STATION :
The train (Le train) | The platform (Le quai) | A passenger (Un voyageur) | The ticket office (Le guichet) | A single ticket (Aller simple) | A return ticket (Aller-retour) | Lost property office (Objets trouvés) | To punch (Composter)

AIRPORT :
To go through customs (Passer la douane) | To fly / To board (Voler / Embarquer) | The flight number (Numéro de vol) | Jetlag (Décalage horaire) | Business / Economy class | To take off / To land (Décoller / Atterrir) | A seat belt (Ceinture de sécurité)

THE VEHICLE :
Back seat / Front seat | Battery / Engine | Boot (GB) / Trunk (US) = Coffre | Brake / Clutch | Dashboard (Tableau de bord) | Steering wheel (Volant) | Tire / Wheel | Air conditioned (Climatisé)

WEATHER :
Hot / Boiling hot | Cold / Freezing | Sunny / Cloudy | It's raining / It's snowing`,
  },
  {
    id: 5002, actif: true,
    titre: "E. ANGLAIS — Partie 2 : Vocabulary (Verbs & Words)",
    sousTitre: "Transport words, BE & HAVE, Useful words",
    description: `TRANSPORT WORDS :
Board / Get-off (Monter/Descendre) | Cancellation / Delay (Annulation/Retard) | An extra charge (Supplément) | Break down (Tomber en panne) | Keep the change (Gardez la monnaie) | The ride (La course) | A tip (Pourboire) | Toll (Péage)

TO BE — ÊTRE :
I am / You are / He is / We are / They are
Past: I was / You were / He was

TO HAVE — AVOIR :
I have / You have / He has / We have / They have
Past: I had / You had / He had

There is + singulier | There are + pluriel = Il y a

⚠ Mots toujours SINGULIERS en anglais : accommodation, advice, baggage, bread, furniture, information, luggage, news, work`,
  },
  {
    id: 5003, actif: true,
    titre: "E. ANGLAIS — Partie 3 : Grammar (Tenses)",
    sousTitre: "Prepositions, Preterit, Present Perfect, Future, Conditional, Modals",
    description: `PREPOSITIONS :
IN : mois (in July), saisons (in winter), pays (in Italy), villes (in Lyon)
ON : jours précis (on Tuesday)
AT : heures (at 11 o'clock), AT night
TO : mouvement (go TO the cinema)

THE PRETERIT (passé) :
Réguliers : base + ED (worked) | Irréguliers : à apprendre (go → went)

THE PRESENT PERFECT :
HAVE + participe passé | FOR = durée | SINCE = date précise

FUTURE : Sujet + WILL + verbe
CONDITIONAL : Sujet + WOULD + verbe

MODAL VERBS :
CAN/COULD (pouvoir) | MAY/MIGHT (peut-être) | MUST (devoir)
SHOULD (conseil) | WOULD (conditionnel) | SHALL (suggestion) | NEED (avoir besoin)`,
  },
  {
    id: 5004, actif: true,
    titre: "E. ANGLAIS — Partie 4 : Grammar (Comparatives, Time, Plural)",
    sousTitre: "Comparatifs, superlatifs, heure, quantifieurs",
    description: `COMPARATIFS :
• Supériorité : adj + ER + than (taller than) — adj long : MORE + adj + than
• Égalité : AS + adj + AS
• Infériorité : LESS + adj + THAN
Irréguliers : good → better → best | bad → worse → worst

TELLING THE TIME :
AM (matin) / PM (soir) | O'CLOCK = pile | QUARTER = 15 min | HALF = 30 min
PAST (1-30 min) / TO (31-59 min)
8:15 → quarter past eight | 8:30 → half past eight | 7:45 → quarter to eight

THE PLURAL :
Régulier : +S (cats) | En S/SS : +ES (buses) | En O : +ES (potatoes)
Irréguliers : man→men, woman→women, person→people, tooth→teeth

QUANTIFIERS :
MUCH (indénombrables) | MANY (dénombrables) | A LOT OF (les deux)`,
  },
  {
    id: 5005, actif: true,
    titre: "E. ANGLAIS — Partie 5 : Welcoming & Directions",
    sousTitre: "Accueillir la clientèle en anglais + Directions",
    description: `WELCOMING :
"Hello, are you Mr or Mrs…?" | "May I confirm your identity?"
"You're welcome." | "If you'd like to get into the car…"
"Do you mind if I check your identity?"

DIRECTIONS & MEETING POINT :
"What's your current location?" | "What can you see around?"
"Are you in a parking lot?" | "I'm close to…"
"Go straight on" | "Could you open the boot?"
"I'm afraid you're late" — Vous êtes en retard

🎯 First impression matters! A warm welcome makes clients feel valued.

ERREURS :
✗ "What is your name?" → ✓ "May I have your name, please?"
✗ "You want go where?" → ✓ "Where would you like to go?"`,
  },
  {
    id: 5006, actif: true,
    titre: "E. ANGLAIS — Partie 6 : During the Ride",
    sousTitre: "Confort & conversation en anglais",
    description: `COMFORT PHRASES :
"Make yourself comfortable." — Installez-vous.
"Is everything alright?" — Tout va bien ?
"What's your destination?" — Où allez-vous ?
"Fine, I'll take you there." — Je vous y emmène.
"Would you like some water?" — De l'eau ?
"Is the temperature OK?" — Température OK ?
"Shall I increase/decrease the temp.?" — Augmenter/baisser ?

SMALL TALK & SAFETY :
"What line of business are you in?" — Que faites-vous ?
"What a beautiful day!" — Il fait beau !
"There's a bit of traffic." — Il y a de la circulation.
"Have you been here before?" — Vous connaissez ?
"Please, fasten your seat-belt." — Ceinture SVP.

✗ Avoid: politics, religion, personal questions, controversial topics
💡 "I'm sorry, could you say that again more slowly?"`,
  },
  {
    id: 5007, actif: true,
    titre: "E. ANGLAIS — Partie 7 : Lyon & Saying Goodbye",
    sousTitre: "Parler de Lyon en anglais + Prendre congé",
    description: `TALKING ABOUT LYON :
"Lyon has a population of over 500,000." — Plus de 500 000 habitants.
"The city is well-known for pharmaceuticals." — Chimie, pharmacie, biotech.
"Lyon is at the forefront of vaccines." — 1er centre vaccins au monde.
"Lyon has prestigious universities." — 2ème ville étudiante.

SAYING GOODBYE :
"Here we are! We've arrived." — Nous sommes arrivés.
"Thank you for choosing us." — Merci !
"I hope you enjoyed the ride." — Le trajet vous a plu ?
"Have a great day/evening!" — Bonne journée !
"Enjoy your stay in Lyon!" — Profitez de Lyon !
"It was a pleasure. Goodbye!" — Au revoir !

END-OF-RIDE ACTIONS :
✓ Open the door | ✓ Help with luggage | ✓ Hand over business card
✓ "Have you got everything?" | ✓ Offer a receipt | ✓ Ask for a review
✓ "10% discount for returning clients." — 10% fidélité

🤝 The end of the ride is the beginning of the next booking!`,
  },
  {
    id: 5008, actif: true,
    titre: "E. ANGLAIS — Partie 8 : Question Words",
    sousTitre: "Which, Where, When, Who, What, How long",
    description: `QUESTION WORDS :

WHICH (Qui — chose, antécédent non humain) :
"The car which is pink is mine." — La voiture qui est rose est la mienne.

WHERE (Où — antécédent = lieu) :
"The city where I live is beautiful." — La ville où je vis est belle.

WHEN (Quand — antécédent = date) :
"She was born the day when Diana died."

WHO (Qui — personne, antécédent humain) :
"The woman who drives is my neighbour."

WHAT (Que, quoi — question ouverte) :
"What do you want?" — Que veux-tu ?

HOW LONG (Combien de temps — durée) :
"How long are you staying in France?" — Combien de temps restez-vous ?`,
  },
];

// =============================================
// ASSEMBLAGE DU MODULE COMPLET
// =============================================

export const VTC_COURS_DATA: ModuleData = {
  id: 2,
  nom: "2.COURS ET EXERCICES VTC",
  description: "Cours complets pour les 5 matières communes de l'examen VTC : A. Réglementation T3P (2 parties), B. Gestion (3 parties), C. Sécurité Routière (3 parties), D. Français (7 parties), E. Anglais (8 parties).",
  cours: [
    ...MATIERE_A,
    ...MATIERE_B,
    ...MATIERE_C,
    ...MATIERE_D,
    ...MATIERE_E,
  ],
  exercices: [],
};
