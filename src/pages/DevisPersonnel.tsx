import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Loader2, Eraser, CheckCircle2, Building2, User, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sendAdminNotification } from "@/lib/sendAdminNotification";

/* ─── DATES DE FORMATION CATALOGUE ─── */
const DATES_VTC = [
  "Du 12 au 25 janvier 2026",
  "Du 16 au 30 mars 2026",
  "Du 11 au 24 mai 2026",
  "Du 6 au 19 juillet 2026",
  "Du 14 au 27 septembre 2026",
  "Du 2 au 15 novembre 2026",
];

const DATES_TAXI = [
  "Du 5 au 26 janvier 2026",
  "Du 9 au 30 mars 2026",
  "Du 4 au 25 mai 2026",
  "Du 29 juin au 20 juillet 2026",
  "Du 7 au 28 septembre 2026",
  "Du 26 octobre au 16 novembre 2026",
];

/* ─── FORMATIONS CATALOGUE ─── */
const FORMATIONS = [
  { id: "vtc_complet", label: "Formation initiale VTC (présentiel journée)", prix: 1099, designation: "Formation initiale VTC - Préparation à la carte professionnelle chauffeur VTC", duree: "66 heures", agrement: "n° VTC16-15", type: "vtc" },
  { id: "vtc_complet_examen", label: "Formation initiale VTC avec frais d'examen", prix: 1499, designation: "Formation initiale VTC avec frais d'examen - Préparation complète à la carte professionnelle chauffeur VTC", duree: "66 heures", agrement: "n° VTC16-15", type: "vtc" },
  { id: "vtc_soir", label: "Formation initiale VTC (présentiel soirée)", prix: 1099, designation: "Formation initiale VTC cours du soir - Préparation à la carte professionnelle chauffeur VTC", duree: "66 heures", agrement: "n° VTC16-15", type: "vtc" },
  { id: "vtc_soir_examen", label: "Formation initiale VTC soirée avec frais d'examen", prix: 1499, designation: "Formation initiale VTC cours du soir avec frais d'examen", duree: "66 heures", agrement: "n° VTC16-15", type: "vtc" },
  { id: "vtc_elearning", label: "Formation VTC E-learning", prix: 1099, designation: "Formation initiale VTC en E-learning - Préparation à la carte professionnelle chauffeur VTC", duree: "Plateforme 3 mois + pratique", agrement: "n° VTC16-05", type: "vtc" },
  { id: "vtc_elearning_examen", label: "Formation VTC E-learning avec frais d'examen", prix: 1499, designation: "Formation initiale VTC en E-learning avec frais d'examen", duree: "Plateforme 3 mois + pratique", agrement: "n° VTC16-05", type: "vtc" },
  { id: "taxi_elearning", label: "Formation TAXI E-learning", prix: 1299, designation: "Formation initiale TAXI en E-learning", duree: "96 heures (plateforme 3 mois)", agrement: "n°69-18-001", type: "taxi" },
  { id: "taxi_elearning_examen", label: "Formation TAXI E-learning avec frais d'examen", prix: 1699, designation: "Formation initiale TAXI en E-learning avec frais d'examen", duree: "96 heures (plateforme 3 mois)", agrement: "n°69-18-001", type: "taxi" },
  { id: "taxi_presential", label: "Formation TAXI présentiel", prix: 1299, designation: "Formation initiale TAXI en présentiel", duree: "96 heures", agrement: "n°69-18-001", type: "taxi" },
  { id: "taxi_presential_examen", label: "Formation TAXI présentiel avec frais d'examen", prix: 1699, designation: "Formation initiale TAXI présentiel avec frais d'examen", duree: "96 heures", agrement: "n°69-18-001", type: "taxi" },
  { id: "ta_elearning", label: "Passerelle VTC → TAXI (TA) E-learning", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC (TA) en E-learning", duree: "Plateforme 3 mois + pratique", agrement: "n°69-18-001", type: "taxi" },
  { id: "va_elearning", label: "Passerelle TAXI → VTC (VA) E-learning", prix: 499, designation: "Formation passerelle VTC pour chauffeur TAXI (VA) en E-learning", duree: "Plateforme 3 mois + pratique", agrement: "n° VTC16-05", type: "vtc" },
  { id: "taxi_pratique", label: "Formation pratique TAXI", prix: 349, designation: "Formation pratique TAXI - Préparation pratique à l'examen taxi", duree: "6h en groupe ou 3h solo", agrement: "n°69-18-001", type: "taxi" },
  { id: "fc_vtc", label: "Formation continue VTC", prix: 200, designation: "Formation continue obligatoire VTC - Prévention des discriminations et des violences sexuelles et sexistes (14h)", duree: "14 heures", agrement: "n° VTC16-15", type: "vtc" },
  { id: "fc_taxi", label: "Formation continue TAXI", prix: 299, designation: "Formation continue obligatoire TAXI (14h)", duree: "14 heures", agrement: "n°69-18-001", type: "taxi" },
];

/* ─── CGV TEXT ─── */
const CGV_TEXT = `CONDITIONS GENERALES DE VENTE - FTRANSPORT

FTRANSPORT est un organisme de formation professionnelle specialise dans le secteur du transport de personnes.
Siege social : 86 route de Genas, 69003 Lyon
Numero SIRET : 82346156100018
Numero de declaration d'activite : 84 69 15114 69
(Cet enregistrement ne vaut pas agrement de l'Etat)
Organisme non assujetti a la TVA
Contact : 04.28.29.60.91 | contact@ftransport.fr

DEFINITIONS
CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT.
STAGIAIRE : la personne physique qui participe a une formation dispensee par FTRANSPORT.
CGV : les conditions generales de vente, detaillees ci-dessous.
OPCO : les organismes paritaires collecteurs agrees charges de collecter et gerer l'effort de formation des entreprises.
FORMATION : l'ensemble des actions de formation dispensees par FTRANSPORT dans le cadre de ses agrements.

ARTICLE 1 - OBJET ET CHAMP D'APPLICATION
Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client, qu'il s'agisse de formations initiales VTC, TAXI, passerelles (TA, VA), formations continues ou formations pratiques. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente. Toute condition contraire posee par le Client sera, a defaut d'acceptation expresse, inopposable a FTRANSPORT, quel que soit le moment ou elle aura pu etre portee a sa connaissance.

ARTICLE 2 - DELAI DE RETRACTATION
Conformement a l'article L6353-5 du Code du travail, le Client beneficie d'un delai de retractation de dix (10) jours a compter de la conclusion du contrat de formation professionnelle.
Le Client peut exercer son droit de retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT a l'adresse suivante : 86 route de Genas, 69003 Lyon, ou par e-mail a : contact@ftransport.fr
Aucun paiement ne sera exige du Client avant l'expiration de ce delai de retractation.
En cas d'exercice du droit de retractation dans le delai imparti, toute somme deja versee sera integralement remboursee dans un delai de 30 jours.

ARTICLE 3 - CONDITIONS FINANCIERES, REGLEMENTS ET MODALITES DE PAIEMENT
Tous les prix sont indiques en euros, toutes taxes comprises. FTRANSPORT n'est pas assujetti a la TVA.

3.1 - Modalites de paiement pour les particuliers
Conformement a l'article L6353-6 du Code du travail, lorsque le Client est une personne physique qui finance elle-meme sa formation :
- Aucune somme ne peut etre exigee avant l'expiration du delai de retractation de 10 jours.
- A l'expiration de ce delai, un premier versement ne pourra exceder 30% du prix total de la formation.
- Le solde sera echelonne au fur et a mesure du deroulement de la formation, selon un echeancier qui sera communique au Client.
Toutefois, le Client reste libre de regler l'integralite du montant de la formation en avance s'il le souhaite, apres l'expiration du delai de retractation de 10 jours. Ce paiement anticipe ne peut en aucun cas etre impose ou exige par FTRANSPORT.
Moyens de paiement acceptes : especes, virement bancaire, cheque.

3.2 - Modalites de paiement pour les entreprises et organismes financeurs
Lorsque la formation est financee par une entreprise, un OPCO, France Travail (anciennement Pole Emploi) ou tout autre organisme financeur, le paiement integral peut etre demande avant le debut de la formation, conformement aux accords conclus avec ces organismes. En cas de prise en charge partielle, le solde restant a la charge du Client sera facture selon les memes modalites que pour un financement personnel.

3.3 - Retard de paiement
Toute somme non payee a echeance entraine de plein droit et sans mise en demeure prealable, l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal en vigueur, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros (article D441-5 du Code de commerce). FTRANSPORT se reserve le droit de suspendre la formation en cas de non-paiement.

3.4 - Frais d'examen
Lorsque la formation inclut les frais d'examen (inscription a l'examen CMA), ceux-ci sont compris dans le prix total indique sur le devis. Si la formation ne les inclut pas, le stagiaire devra s'inscrire et regler les frais d'examen directement aupres de la Chambre des Metiers et de l'Artisanat (CMA).

ARTICLE 4 - INSCRIPTION ET EFFECTIF
L'effectif de chaque formation est limite a 18 stagiaires pour les formations theoriques et 3 stagiaires pour les formations pratiques. Les inscriptions sont prises en compte dans leur ordre d'arrivee.
L'inscription devient definitive apres signature du contrat de formation et expiration du delai de retractation de 10 jours, conformement aux articles L6353-3 et suivants du Code du travail.
Seuls les contrats dument renseignes, dates, signes et revetus de la mention "Bon pour accord" ont valeur contractuelle.
FTRANSPORT se reserve le droit d'ajourner ou d'annuler une session de formation si le nombre minimal de participants n'est pas atteint. Le Client en sera informe au moins 7 jours avant la date prevue et pourra reporter son inscription sur une session ulterieure ou demander le remboursement integral des sommes versees.

ARTICLE 5 - CONTRAT DE FORMATION POUR LES PARTICULIERS
Conformement aux articles L6353-3 et L6353-4 du Code du travail, lorsqu'une personne physique finance elle-meme sa formation, un contrat de formation professionnelle est conclu entre FTRANSPORT et le stagiaire AVANT l'inscription definitive et tout reglement de frais. Ce contrat mentionne notamment :
- L'intitule, la nature, la duree, les effectifs prevus et les modalites du deroulement de la formation ;
- Le prix de la formation et les modalites de reglement ;
- Les conditions financieres prevues en cas de cessation anticipee de la formation ou d'abandon en cours de stage.

ARTICLE 6 - DEDIT ET REMPLACEMENT D'UN PARTICIPANT
En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours ouvrables avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure ou de le remplacer par un autre participant repondant aux memes criteres d'eligibilite.
En cas de dedit signifie moins de 7 jours ouvrables avant le debut de la formation, FTRANSPORT se reserve le droit de facturer un dedit forfaitaire de 30% du prix total de la formation. Ce dedit ne s'applique pas en cas de force majeure dument justifiee.

ARTICLE 7 - ANNULATION, ABSENCE OU INTERRUPTION D'UNE FORMATION
7.1 - Annulation par le Client : tout module commence est du dans son integralite. En cas d'abandon ou d'interruption prematuree de la formation par le Client pour un motif autre que la force majeure, le prix de la formation reste integralement du.
7.2 - Annulation par FTRANSPORT : FTRANSPORT se reserve le droit d'annuler ou de reporter une formation en cas de force majeure, d'insuffisance d'inscriptions, d'absence imprevisible d'un formateur ou de tout autre evenement exceptionnel. Dans ce cas, FTRANSPORT s'engage a :
  - Informer les stagiaires dans les meilleurs delais par tout moyen (telephone, email, SMS) ;
  - Proposer une session de remplacement dans un delai raisonnable ;
  - Rembourser integralement les sommes versees si aucune session de remplacement ne convient au Client.
7.3 - Absence d'un formateur : en cas d'absence imprevue d'un formateur (maladie, accident, empechement), FTRANSPORT met en oeuvre tous les moyens necessaires pour assurer la continuite de la formation, soit par le remplacement du formateur par un intervenant de competence equivalente, soit par le report de la seance concernee. En aucun cas l'absence ponctuelle d'un formateur ne pourra donner lieu a une annulation de la formation ou a une demande de remboursement, des lors que les heures de formation sont effectivement rattrapees.

ARTICLE 8 - ASSIDUITE ET CONTROLE DE PRESENCE
La presence du stagiaire est obligatoire et controlee par une feuille d'emargement signee par demi-journee (matin et apres-midi). Toute absence non justifiee sera signalee a l'organisme financeur le cas echeant.
Pour les formations en E-learning, le controle de presence est effectue par le biais de la plateforme de cours en ligne (connexion, progression des modules, controles de presence periodiques). Le stagiaire s'engage a se connecter regulierement et a suivre l'integralite des modules dans le delai imparti.
En cas d'absences repetees ou injustifiees, FTRANSPORT se reserve le droit de mettre fin a la formation sans remboursement.

ARTICLE 9 - HORAIRES ET ACCUEIL
Les formations en presentiel se deroulent aux horaires suivants, sauf indication contraire mentionnee sur la convocation :
- Journee : de 09h00 a 12h00 et de 13h00 a 17h00, avec une pause de 15 minutes en milieu de chaque demi-journee.
- Soiree : de 17h00 a 21h00.
Le lieu de formation est situe au 86 route de Genas, 69003 Lyon, sauf indication contraire. FTRANSPORT met a disposition des stagiaires une salle de formation equipee et conforme aux normes de securite et d'accessibilite.
Pour les formations en E-learning, la plateforme de cours est accessible 24h/24 et 7j/7 pendant toute la duree de validite de l'acces (3 mois a compter de l'inscription).

ARTICLE 10 - REGLEMENT INTERIEUR
Le reglement interieur applicable aux stagiaires est remis a chaque participant avant le debut de la formation et est affiche dans les locaux de FTRANSPORT. Il prevoit notamment les mesures applicables en matiere de sante et de securite, les regles de discipline et la procedure et les sanctions disciplinaires, conformement aux articles L6352-3 et suivants du Code du travail. Tout stagiaire s'engage a respecter le reglement interieur en vigueur.

ARTICLE 11 - OBLIGATIONS, RESPONSABILITES ET FORCE MAJEURE
11.1 - Obligation de moyens : FTRANSPORT est tenue a une obligation de moyens et non de resultat vis-a-vis de ses Clients ou de ses Stagiaires. FTRANSPORT s'engage a mettre en oeuvre tous les moyens pedagogiques, techniques et d'encadrement necessaires a la bonne execution de la formation.
11.2 - Responsabilite du stagiaire : le stagiaire s'engage a suivre la formation avec assiduite, a respecter les consignes de securite et le reglement interieur, et a adopter un comportement compatible avec le bon deroulement de la formation.
11.3 - Force majeure : FTRANSPORT ne pourra etre tenue responsable a l'egard du Client en cas d'inexecution de ses obligations resultant d'un evenement de force majeure au sens de l'article 1218 du Code civil, et notamment en cas d'epidemie, de catastrophe naturelle, d'incendie, d'inondation, de greve, de panne informatique majeure, de decision administrative ou de toute autre circonstance independante de sa volonte.
11.4 - Assurance : FTRANSPORT dispose d'une assurance responsabilite civile professionnelle couvrant les dommages corporels, materiels et immateriels susceptibles de survenir pendant les formations.

ARTICLE 12 - PROPRIETE INTELLECTUELLE
L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT (cours, exercices, examens blancs, fiches de synthese, supports numeriques, videos, etc.) constituent des oeuvres protegees par le droit d'auteur (articles L111-1 et suivants du Code de la propriete intellectuelle) et sont la propriete exclusive de FTRANSPORT ou de ses partenaires. Toute reproduction, representation, diffusion ou utilisation de tout ou partie de ces contenus sans l'accord prealable et ecrit de FTRANSPORT est strictement interdite et constitue un delit de contrefacon passible de sanctions penales.
Le stagiaire s'interdit notamment de photographier, filmer, enregistrer les cours ou de partager les identifiants d'acces a la plateforme en ligne avec des tiers.

ARTICLE 13 - ACCESSIBILITE AUX PERSONNES EN SITUATION DE HANDICAP
FTRANSPORT s'engage a accueillir les personnes en situation de handicap dans les meilleures conditions possibles. Un referent handicap est disponible pour etudier les besoins specifiques de chaque stagiaire et mettre en place les amenagements necessaires (adaptation des supports, accessibilite des locaux, amenagement des horaires, etc.).
Contact referent handicap : contact@ftransport.fr ou 04.28.29.60.91.

ARTICLE 14 - PROTECTION DES DONNEES PERSONNELLES
Conformement au Reglement General sur la Protection des Donnees (RGPD - Reglement UE 2016/679) et a la loi n°78-17 du 6 janvier 1978 modifiee, FTRANSPORT collecte et traite les donnees personnelles des stagiaires aux fins exclusives de la gestion administrative et pedagogique des formations.
Le Stagiaire dispose d'un droit d'acces, de rectification, de limitation, d'opposition, de portabilite et d'effacement des donnees personnelles le concernant. Il peut exercer ces droits en adressant sa demande par courrier a FTRANSPORT, 86 route de Genas, 69003 Lyon, ou par e-mail a : contact@ftransport.fr.
Les donnees personnelles sont conservees pour la duree necessaire a la gestion de la formation et aux obligations legales (notamment la conservation des documents pedagogiques pendant 5 ans). Elles ne sont en aucun cas cedees ou vendues a des tiers.

ARTICLE 15 - RECLAMATIONS ET MEDIATION
Toute reclamation relative a la formation peut etre adressee a FTRANSPORT par e-mail (contact@ftransport.fr) ou par courrier. FTRANSPORT s'engage a accuser reception de la reclamation dans un delai de 48 heures et a y repondre dans un delai de 15 jours.
En cas de litige non resolu, le Client peut recourir gratuitement a un mediateur de la consommation conformement aux articles L611-1 et suivants du Code de la consommation.

ARTICLE 16 - DROIT APPLICABLE ET REGLEMENT DES LITIGES
Les presentes conditions generales de vente sont regies par le droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable prealablement a toute action judiciaire. A defaut d'accord amiable dans un delai de 30 jours, le litige sera porte devant les Tribunaux competents de Lyon.

---
Numero de declaration d'activite : 84 69 15114 69 - Cet enregistrement ne vaut pas agrement de l'Etat
Ftransport n'est pas assujetti a la TVA
Services Pro - FTransport - SASU au capital social de 5 000 euros
SIRET : 82346156100018 | 86 route de Genas - 69003 LYON | Tel : 04.28.29.60.91 | contact@ftransport.fr`;

const RIB_INFO = {
  titulaire: "SERVICES PRO FTRANSPORT",
  adresse: "86 ROUTE DE GENAS, 69003 LYON 3EME",
  swift: "REVOFRP2",
  iban: "FR76 2823 3000 0185 7527 9099 426",
  banque: "Revolut Bank UAB",
};

const formatEUR = (n: number): string => {
  const parts = n.toFixed(2).replace('.', ',').split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts[0]},${parts[1]} EUR`;
};

export default function DevisPersonnel() {
  const [searchParams] = useSearchParams();
  const formationType = searchParams.get("type") || "";
  const focusParam = (searchParams.get("focus") || searchParams.get("financement") || "").toLowerCase();
  const financementSectionRef = useRef<HTMLDivElement>(null);
  const [highlightFinancement, setHighlightFinancement] = useState(false);

  // Personal info
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");

  // Formation selection & dates
  const [selectedFormation, setSelectedFormation] = useState(formationType);
  const [dateDebutSouhaitee, setDateDebutSouhaitee] = useState("");
  const [creneauSouhaite, setCreneauSouhaite] = useState("");

  // Financeur
  const [typeFinancement, setTypeFinancement] = useState<"personnel" | "organisme">("personnel");
  const [financeurNom, setFinanceurNom] = useState("");
  const [financeurAdresse, setFinanceurAdresse] = useState("");
  const [financeurCodePostal, setFinanceurCodePostal] = useState("");
  const [financeurVille, setFinanceurVille] = useState("");
  const [financeurSiret, setFinanceurSiret] = useState("");
  const [financeurEmail, setFinanceurEmail] = useState("");
  const [financeurTelephone, setFinanceurTelephone] = useState("");
  const [financeurContactNom, setFinanceurContactNom] = useState("");
  const [financeurType, setFinanceurType] = useState("");

  // Questions d'éligibilité
  const [q1PerduPoints, setQ1PerduPoints] = useState<string>("");
  const [q2CondamneSansPermis, setQ2CondamneSansPermis] = useState<string>("");
  const [q3RefusRestitution, setQ3RefusRestitution] = useState<string>("");
  const [q4Condamne6Mois, setQ4Condamne6Mois] = useState<string>("");
  const [q5CasierVierge, setQ5CasierVierge] = useState<string>("");
  const [q6FormationContinueDeja, setQ6FormationContinueDeja] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ribRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  // Scroll auto vers la section "Mode de financement" si ?focus=financement ou ?financement=personnel
  useEffect(() => {
    if (focusParam === "financement" || focusParam === "personnel" || focusParam === "perso") {
      setTypeFinancement("personnel");
      const t = setTimeout(() => {
        financementSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightFinancement(true);
        setTimeout(() => setHighlightFinancement(false), 3500);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [focusParam]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, c);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, c);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSigned(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearSig = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    setHasSigned(false);
  };

  const formation = FORMATIONS.find(f => f.id === selectedFormation);

  const generateDevisPDF = async () => {
    if (!prenom || !nom) { toast.error("Veuillez renseigner votre nom et prénom"); return; }
    if (!selectedFormation || !formation) { toast.error("Veuillez sélectionner une formation"); return; }
    if (!telephone) { toast.error("Veuillez renseigner votre téléphone"); return; }
    if (!email) { toast.error("Veuillez renseigner votre email"); return; }
    if (!codePostal || !ville) { toast.error("Veuillez renseigner votre code postal et ville"); return; }

    if (typeFinancement === "organisme" && !financeurNom) {
      toast.error("Veuillez renseigner le nom de l'organisme financeur");
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 15;

      const signatureDataUrl = hasSigned && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;
      const numDevis = `DEV-${format(new Date(), "yyyyMM")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const dateToday = format(new Date(), "dd MMMM yyyy", { locale: fr });
      const validite = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "dd MMMM yyyy", { locale: fr });

      // === PAGE 1 : DEVIS ===
      // Header
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("FTRANSPORT", margin, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Organisme de formation professionnelle", margin, 25);
      doc.text("86 route de Genas - 69003 Lyon", margin, 30);
      doc.text("04.28.29.60.91 | contact@ftransport.fr", margin, 35);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("DEVIS", pageW - margin, 18, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`N° ${numDevis}`, pageW - margin, 25, { align: "right" });
      doc.text(`Date : ${dateToday}`, pageW - margin, 30, { align: "right" });
      doc.text(`Valide jusqu'au : ${validite}`, pageW - margin, 35, { align: "right" });

      y = 45;
      doc.setTextColor(0, 0, 0);

      // === Emetteur + Client side by side ===
      const halfW = contentW / 2 - 3;
      // Emetteur
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, halfW, 32, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text("EMETTEUR", margin + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("SERVICES PRO FTRANSPORT", margin + 3, y + 10);
      doc.text("SASU au capital de 5 000 EUR", margin + 3, y + 14);
      doc.text("SIRET : 82346156100018", margin + 3, y + 18);
      doc.text("86 route de Genas - 69003 Lyon", margin + 3, y + 22);
      doc.text("N° decl. activite : 84 69 15114 69", margin + 3, y + 26);
      doc.setFontSize(7);
      doc.text("(Cet enregistrement ne vaut pas agrement de l'Etat)", margin + 3, y + 30);

      // Client
      const clientX = margin + halfW + 6;
      doc.setFillColor(239, 246, 255);
      doc.rect(clientX, y, halfW, 32, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text("CLIENT / STAGIAIRE", clientX + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text(`${civilite} ${prenom} ${nom}`.trim(), clientX + 3, y + 10);
      if (adresse) doc.text(adresse, clientX + 3, y + 14);
      doc.text(`${codePostal} ${ville}`.trim(), clientX + 3, y + 18);
      if (telephone) doc.text(`Tel : ${telephone}`, clientX + 3, y + 22);
      if (email) doc.text(email, clientX + 3, y + 26);
      if (dateNaissance) {
        try {
          doc.text(`Ne(e) le : ${format(new Date(dateNaissance), "dd/MM/yyyy")}`, clientX + 3, y + 30);
        } catch { /* ignore */ }
      }

      y += 38;

      // === Financeur (si organisme) ===
      if (typeFinancement === "organisme" && financeurNom) {
        doc.setFillColor(255, 249, 235);
        doc.setDrawColor(251, 191, 36);
        doc.rect(margin, y, contentW, 24, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(120, 53, 15);
        doc.text("ORGANISME FINANCEUR / PAYEUR", margin + 3, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(`${financeurNom}${financeurType ? ` (${financeurType})` : ""}`, margin + 3, y + 10);
        const financeurAddr = [financeurAdresse, `${financeurCodePostal} ${financeurVille}`.trim()].filter(Boolean).join(" - ");
        if (financeurAddr.trim()) doc.text(financeurAddr, margin + 3, y + 14);
        const financeurDetails: string[] = [];
        if (financeurSiret) financeurDetails.push(`SIRET : ${financeurSiret}`);
        if (financeurEmail) financeurDetails.push(financeurEmail);
        if (financeurTelephone) financeurDetails.push(financeurTelephone);
        if (financeurContactNom) financeurDetails.push(`Contact : ${financeurContactNom}`);
        if (financeurDetails.length) doc.text(financeurDetails.join(" | "), margin + 3, y + 18);
        doc.setDrawColor(0, 0, 0);
        y += 30;
      }

      // === Formation + dates ===
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      const formBoxH = 22;
      doc.rect(margin, y, contentW, formBoxH, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("FORMATION", margin + 3, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`${formation.designation}`, margin + 3, y + 10.5);
      doc.text(`Duree : ${formation.duree}  |  Agrement : ${formation.agrement}`, margin + 3, y + 15);
      const isElearning = formation.id?.includes("elearning");
      const datesLine: string[] = [];
      if (isElearning) {
        datesLine.push("E-learning : plateforme disponible 3 mois a compter de l'inscription");
      } else {
        if (dateDebutSouhaitee) datesLine.push(`Session : ${dateDebutSouhaitee}`);
        if (creneauSouhaite) datesLine.push(`Creneau : ${creneauSouhaite}`);
      }
      if (datesLine.length) doc.text(datesLine.join("  |  "), margin + 3, y + 19.5);
      doc.setDrawColor(0, 0, 0);
      y += formBoxH + 6;

      // === Detail prestation ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text("DETAIL DE LA PRESTATION", margin, y);
      y += 6;

      const col0x = margin;
      const col1x = margin + 100;
      const col2x = margin + 125;
      const col3x = margin + 152;
      const tableRight = pageW - margin;

      // Table header
      doc.setFillColor(30, 58, 138);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Designation", col0x + 2, y + 5.5);
      doc.text("Qte", col1x + 10, y + 5.5, { align: "center" });
      doc.text("Prix unitaire", col2x + 21, y + 5.5, { align: "center" });
      doc.text("Total TTC", tableRight - 2, y + 5.5, { align: "right" });
      y += 8;

      // Table row
      const designW = col1x - col0x - 4;
      const designLines = doc.splitTextToSize(formation.designation, designW);
      const nbLines = Math.max(1, Math.min(designLines.length, 3));
      const rowH = Math.max(10, nbLines * 4.5 + 4);

      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentW, rowH, "F");
      doc.setDrawColor(210, 210, 210);
      doc.line(margin, y, tableRight, y);
      doc.line(margin, y + rowH, tableRight, y + rowH);
      doc.line(col1x, y, col1x, y + rowH);
      doc.line(col2x, y, col2x, y + rowH);
      doc.line(col3x, y, col3x, y + rowH);
      doc.line(margin, y, margin, y + rowH);
      doc.line(tableRight, y, tableRight, y + rowH);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const vertCenter = y + rowH / 2 + 1;
      const textStartY = y + 4;
      designLines.slice(0, 3).forEach((l: string, li: number) => {
        doc.text(l, col0x + 2, textStartY + li * 4);
      });
      doc.text("1", col1x + 10, vertCenter, { align: "center" });
      doc.text(formatEUR(formation.prix), col2x + 26, vertCenter, { align: "right" });
      doc.text(formatEUR(formation.prix), tableRight - 2, vertCenter, { align: "right" });
      y += rowH;

      // Totals
      y += 6;
      const totBoxX = margin + contentW * 0.55;
      const totBoxW = contentW * 0.45;
      const totBoxH = 22;
      doc.setFillColor(243, 244, 246);
      doc.rect(totBoxX, y, totBoxW, totBoxH, "F");
      doc.setDrawColor(210, 210, 210);
      doc.rect(totBoxX, y, totBoxW, totBoxH);

      const totSepX = totBoxX + totBoxW * 0.58;
      doc.line(totSepX, y, totSepX, y + totBoxH);
      doc.line(totBoxX, y + 8, totBoxX + totBoxW, y + 8);
      doc.line(totBoxX, y + 15, totBoxX + totBoxW, y + 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Total HT :", totSepX - 2, y + 5.5, { align: "right" });
      doc.text("TVA (0% - Non assujetti) :", totSepX - 2, y + 12.5, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("TOTAL TTC :", totSepX - 2, y + 19.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(formatEUR(formation.prix), totBoxX + totBoxW - 3, y + 5.5, { align: "right" });
      doc.text(formatEUR(0), totBoxX + totBoxW - 3, y + 12.5, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(formatEUR(formation.prix), totBoxX + totBoxW - 3, y + 19.5, { align: "right" });

      // Modalites paiement (left side)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138);
      doc.text("MODALITES DE PAIEMENT", margin, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      if (typeFinancement === "personnel") {
        doc.text("Financement personnel", margin, y + 7);
        doc.text("Moyens : especes, virement, cheque", margin, y + 11);
        doc.text("Acompte 30% puis solde echelonne", margin, y + 15);
      } else {
        doc.text(`Prise en charge par : ${financeurNom}`, margin, y + 7);
        if (financeurType) doc.text(`Type : ${financeurType}`, margin, y + 11);
        doc.text("Reglement selon convention", margin, y + 15);
      }

      y += totBoxH + 10;

      // RIB info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("COORDONNEES BANCAIRES (VIREMENT)", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Titulaire : ${RIB_INFO.titulaire}`, margin, y); y += 3.5;
      doc.text(`IBAN : ${RIB_INFO.iban}`, margin, y); y += 3.5;
      doc.text(`BIC / SWIFT : ${RIB_INFO.swift}  |  Banque : ${RIB_INFO.banque}`, margin, y); y += 8;

      // Rappel & mentions obligatoires
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const rappel = "Ce devis est valable pour une duree d'une semaine sous reserve de places disponibles. Inscription validee : devis + fiche inscription + conditions generales de ventes remplis et signes + documents justificatifs + reglement.";
      const rappelLines = doc.splitTextToSize(rappel, contentW);
      doc.text(rappelLines, margin, y);
      y += rappelLines.length * 3 + 3;

      // Mentions obligatoires
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      const mentions = [
        "Conformement a l'article L6353-5 du Code du travail, le client beneficie d'un delai de retractation de 10 jours.",
        "Conformement a l'article L6353-6, aucun paiement ne peut etre exige avant l'expiration du delai de retractation.",
        `Organisme de formation : SERVICES PRO FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018`,
        `N° de declaration d'activite : 84 69 15114 69 aupres du Prefet de la region Auvergne-Rhone-Alpes`,
        "Non assujetti a la TVA (Art. 261-4-4° du CGI).",
      ];
      mentions.forEach(m => {
        const ml = doc.splitTextToSize(m, contentW);
        doc.text(ml, margin, y);
        y += ml.length * 2.8 + 0.5;
      });

      y += 4;

      // Signatures
      y = Math.max(y, 220);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`A Lyon, le ${dateToday}`, margin, y);
      y += 6;

      const sigBoxW = 80;
      const sigBoxH = 30;
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, y, sigBoxW, sigBoxH);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Signature client + "Bon pour accord"', margin + 2, y + 5);

      if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, "PNG", margin + 2, y + 7, sigBoxW - 4, sigBoxH - 9);
        doc.setFontSize(6.5);
        doc.setTextColor(30, 58, 138);
        doc.text(`Signe electroniquement le ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin + 2, y + sigBoxH - 2);
      }

      const sigFtransX = pageW - margin - sigBoxW;
      doc.setDrawColor(180, 180, 180);
      doc.rect(sigFtransX, y, sigBoxW, sigBoxH);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text("Pour FTRANSPORT", sigFtransX + 2, y + 5);
      doc.setFontSize(7);
      doc.text("Le responsable de formation", sigFtransX + 2, y + 9);

      // Footer page 1
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text("FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69", margin, 288);
      doc.text("Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon", margin, 293);

      // === PAGE 2 : CGV ===
      doc.addPage();
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("CONDITIONS GENERALES DE VENTE", pageW / 2, 13, { align: "center" });

      y = 28;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      const cgvLines = CGV_TEXT.split("\n");
      for (const line of cgvLines) {
        if (y > 285) {
          doc.addPage();
          y = 15;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
        }
        const trimmed = line.trim();
        if (trimmed === "") { y += 2; continue; }
        const isTitle = trimmed.startsWith("ARTICLE") || trimmed === "CONDITIONS GENERALES DE VENTE - FTRANSPORT" || trimmed === "DEFINITIONS";
        if (isTitle) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(30, 58, 138);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(0, 0, 0);
        }
        const wrapped = doc.splitTextToSize(trimmed, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * (isTitle ? 4.5 : 3.5) + (isTitle ? 1 : 0);
      }

      // === PAGE BORDEREAU DE RENONCIATION AU DELAI DE RETRACTATION ===
      doc.addPage();
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("BORDEREAU DE RENONCIATION AU DELAI DE RETRACTATION", pageW / 2, 13, { align: "center" });

      y = 30;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      const renonciationText = [
        "Conformement a l'article L6353-5 du Code du travail, tout client beneficie d'un delai de retractation de dix (10) jours a compter de la signature du contrat de formation professionnelle.",
        "",
        "Toutefois, si le client souhaite que la formation debute avant l'expiration de ce delai, il peut renoncer expressement a son droit de retractation en remplissant et signant le present bordereau.",
        "",
        "Cette renonciation n'emporte aucune consequence financiere pour le client si elle est exercee avant le debut effectif de la formation.",
      ];
      for (const line of renonciationText) {
        if (line === "") { y += 3; continue; }
        const wrapped = doc.splitTextToSize(line, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4;
      }

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("INFORMATIONS DU CLIENT", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const clientInfo = [
        `Nom et prenom : ${civilite} ${prenom} ${nom}`.trim(),
        `Adresse : ${adresse ? adresse + ", " : ""}${codePostal} ${ville}`.trim(),
        `Telephone : ${telephone || "_______________"}`,
        `Email : ${email || "_______________"}`,
      ];
      clientInfo.forEach(l => { doc.text(l, margin, y); y += 5; });

      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("FORMATION CONCERNEE", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Formation : ${formation.designation}`, margin, y); y += 5;
      doc.text(`Duree : ${formation.duree}`, margin, y); y += 5;
      doc.text(`Montant TTC : ${formatEUR(formation.prix)}`, margin, y); y += 5;
      if (!isElearning && dateDebutSouhaitee) {
        doc.text(`Session : ${dateDebutSouhaitee}`, margin, y); y += 5;
      }
      if (isElearning) {
        doc.text("Modalite : E-learning (plateforme 3 mois)", margin, y); y += 5;
      }

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("DECLARATION DE RENONCIATION", margin, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const declarationLines = [
        "Je soussigne(e), " + `${civilite} ${prenom} ${nom}`.trim() + ", declare avoir pris connaissance des conditions generales de vente de FTRANSPORT et du delai de retractation de dix (10) jours prevu par l'article L6353-5 du Code du travail.",
        "",
        "Par la presente, je renonce expressement a l'exercice de mon droit de retractation et demande que la formation commence avant l'expiration du delai de dix jours.",
        "",
        "Je reconnais que cette renonciation est faite librement et sans aucune pression.",
      ];
      for (const line of declarationLines) {
        if (line === "") { y += 3; continue; }
        const wrapped = doc.splitTextToSize(line, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4;
      }

      y += 12;
      doc.text(`Fait a Lyon, le ${dateToday}`, margin, y);
      y += 10;

      // Signature boxes
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, y, 80, 30);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Signature du client', margin + 2, y + 5);
      doc.text('precedee de la mention', margin + 2, y + 9);
      doc.text('"Lu et approuve, bon pour renonciation"', margin + 2, y + 13);

      if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, "PNG", margin + 2, y + 14, 76, 14);
      }

      const sigFtransX2 = pageW - margin - 80;
      doc.rect(sigFtransX2, y, 80, 30);
      doc.text("Pour FTRANSPORT", sigFtransX2 + 2, y + 5);
      doc.text("Le responsable de formation", sigFtransX2 + 2, y + 9);

      // Footer
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text("FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69", margin, 288);
      doc.text("Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon", margin, 293);

      // Page numbers
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "italic");
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} / ${pageCount}`, pageW / 2, 297, { align: "center" });
      }

      const fileName = `Devis_${prenom}_${nom}_${format(new Date(), "ddMMyyyy")}.pdf`;
      doc.save(fileName);
      setGenerated(true);
      toast.success("Votre devis a été téléchargé !");
      setTimeout(() => ribRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);

      // ── Notify admin (email + alerte système) — fire & forget ──
      const reponsesCritiques = [
        q1PerduPoints === "oui" && "A perdu tous ses points",
        q2CondamneSansPermis === "oui" && "Condamné conduite sans permis",
        q3RefusRestitution === "oui" && "Refus de restitution de permis",
        q4Condamne6Mois === "oui" && "Condamné +6 mois ferme",
      ].filter(Boolean);

      sendAdminNotification({
        type_document: "Devis personnel téléchargé",
        nom,
        prenom,
        email,
        telephone,
        donnees: {
          numero_devis: numDevis,
          formation: formation.label,
          montant: `${formation.prix} €`,
          type_financement: typeFinancement,
          ...(typeFinancement === "organisme" ? { financeur: financeurNom, siret_financeur: financeurSiret } : {}),
          ...(reponsesCritiques.length > 0 ? { alertes: reponsesCritiques } : {}),
        },
      });

      try {
        const alerteCritique = reponsesCritiques.length > 0;
        await supabase.from("alertes_systeme").insert({
          type: alerteCritique ? "warning" : "info",
          titre: alerteCritique
            ? `⚠️ Devis téléchargé avec alertes — ${prenom} ${nom}`
            : `📄 Nouveau devis téléchargé — ${prenom} ${nom}`,
          message: `${formation.label} • ${formation.prix} € • ${typeFinancement === "organisme" ? `Financeur : ${financeurNom}` : "Financement personnel"}${alerteCritique ? ` • ⚠️ ${reponsesCritiques.join(", ")}` : ""}`,
          details: `Devis ${numDevis}\nEmail: ${email}\nTéléphone: ${telephone}`,
        } as any);
      } catch (alertErr) {
        console.warn("Insertion alerte système échouée (non-bloquant):", alertErr);
      }

      // ── Auto-save devis to storage + DB ──
      try {
        const pdfBlob = doc.output("blob");
        const storagePath = `public/${numDevis}_${fileName}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("devis")
          .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

        if (uploadErr) {
          console.error("Devis upload error:", uploadErr);
        } else {
          const { data: urlData } = supabase.storage.from("devis").getPublicUrl(storagePath);
          const fichierUrl = urlData?.publicUrl || "";

          // Try to find matching apprenant
          const { data: matchedApprenant } = await supabase
            .from("apprenants")
            .select("id")
            .ilike("nom", nom.trim())
            .ilike("prenom", prenom.trim())
            .limit(1)
            .maybeSingle();

          if (matchedApprenant?.id) {
            await supabase.from("devis_envois").insert({
              apprenant_id: matchedApprenant.id,
              modele: "devis_personnel",
              montant: `${formation.prix} €`,
              formation: formation.label,
              fichier_url: fichierUrl,
              statut: "telecharge",
            } as any);
            console.log("Devis saved to apprenant:", matchedApprenant.id);
          } else {
            // Save as organisation/contact if financeur, or create apprenant-linked record via edge function
            const contactInfo = {
              civilite, prenom, nom, email, telephone, adresse, codePostal, ville, dateNaissance,
              formation: formation.label,
              montant: `${formation.prix} €`,
              fichierUrl,
              numDevis,
              typeFinancement,
              ...(typeFinancement === "organisme" ? {
                financeurNom, financeurAdresse, financeurCodePostal, financeurVille,
                financeurSiret, financeurEmail, financeurTelephone, financeurContactNom, financeurType,
              } : {}),
            };
            // Create the apprenant automatically
            const { data: newApprenant, error: insertErr } = await supabase
              .from("apprenants")
              .insert({
                nom: nom.trim(),
                prenom: prenom.trim(),
                civilite,
                email: email.trim(),
                telephone: telephone.trim(),
                adresse: adresse.trim() || null,
                code_postal: codePostal.trim() || null,
                ville: ville.trim() || null,
                date_naissance: dateNaissance || null,
                formation_choisie: formation.label,
                montant_ttc: formation.prix,
                mode_financement: typeFinancement === "organisme" ? "organisme" : "personnel",
                organisme_financeur: typeFinancement === "organisme" ? financeurNom : null,
                statut: "particulier",
                type_apprenant: formation.type === "taxi" ? "TAXI" : "VTC",
                notes: `Devis ${numDevis} généré le ${dateToday}` + (typeFinancement === "organisme" ? `\nFinanceur: ${financeurNom} (${financeurSiret})` : ""),
              } as any)
              .select("id")
              .single();

            if (!insertErr && newApprenant?.id) {
              await supabase.from("devis_envois").insert({
                apprenant_id: newApprenant.id,
                modele: "devis_personnel",
                montant: `${formation.prix} €`,
                formation: formation.label,
                fichier_url: fichierUrl,
                statut: "telecharge",
              } as any);
              console.log("New apprenant + devis saved:", newApprenant.id);
            } else {
              console.warn("Could not create apprenant for devis:", insertErr);
            }
          }
        }
      } catch (saveErr) {
        console.warn("Auto-save devis failed (non-blocking):", saveErr);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du devis");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Sonner position="top-center" />

      {/* Header */}
      <div className="bg-[#1e3a8a] text-white py-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold">FTRANSPORT</h1>
          <p className="text-blue-200 mt-1">Organisme de formation professionnelle — Transport de personnes</p>
          <p className="text-sm text-blue-300 mt-2">Générez votre devis personnalisé en quelques clics</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">

        {/* Étape 1 : Formation */}
        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
              1. Sélectionnez votre formation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedFormation} onValueChange={setSelectedFormation}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une formation..." />
              </SelectTrigger>
              <SelectContent>
                {FORMATIONS.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label} — {f.prix} €
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formation && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-[#1e3a8a]">{formation.designation}</p>
                <p className="text-muted-foreground">Durée : {formation.duree}</p>
                <p className="font-bold text-[#1e3a8a] text-lg mt-1">{formation.prix} € TTC</p>
                <p className="text-xs text-muted-foreground">Non assujetti à la TVA</p>
              </div>
            )}

            {/* Dates de formation souhaitées */}
            <div className="pt-2 border-t space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#1e3a8a]" />
                Dates de formation souhaitées
              </p>
              {(() => {
                const isElearning = formation?.id?.includes("elearning");
                if (isElearning) {
                  return (
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium">📚 Formation E-learning</p>
                      <p className="text-sm text-blue-700 mt-1">Plateforme de cours disponible pendant 3 mois à compter de l'inscription. Accès 24h/24 et 7j/7.</p>
                    </div>
                  );
                }
                const dates = formation?.type === "taxi" ? DATES_TAXI : DATES_VTC;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Session de formation *</Label>
                      <Select value={dateDebutSouhaitee} onValueChange={setDateDebutSouhaitee}>
                        <SelectTrigger><SelectValue placeholder="Choisir une session..." /></SelectTrigger>
                        <SelectContent>
                          {dates.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Créneau souhaité</Label>
                      <Select value={creneauSouhaite} onValueChange={setCreneauSouhaite}>
                        <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Journée (9h-17h)">Journée (9h-17h)</SelectItem>
                          <SelectItem value="Soirée (17h-21h)">Soirée (17h-21h)</SelectItem>
                          
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Étape 2 : Informations personnelles */}
        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-[#1e3a8a]" />
              2. Vos informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Civilité</Label>
                <Select value={civilite} onValueChange={setCivilite}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prénom *</Label>
                <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom" />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Téléphone *</Label>
                <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 00 00 00 00" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.fr" />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse postale" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Code postal *</Label>
                <Input value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="69000" />
              </div>
              <div>
                <Label>Ville *</Label>
                <Input value={ville} onChange={e => setVille(e.target.value)} placeholder="Lyon" />
              </div>
            </div>
            <div>
              <Label>Date de naissance</Label>
              <Input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Étape 3 : Coordonnées du financeur */}
        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-[#1e3a8a]" />
              3. Coordonnées du financeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={typeFinancement} onValueChange={(v) => setTypeFinancement(v as "personnel" | "organisme")} className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-blue-50/50 transition-colors">
                <RadioGroupItem value="personnel" id="fin-perso" className="mt-0.5" />
                <label htmlFor="fin-perso" className="cursor-pointer">
                  <p className="font-medium text-sm">Financement personnel</p>
                  <p className="text-xs text-muted-foreground">Je finance moi-même ma formation</p>
                </label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-blue-50/50 transition-colors">
                <RadioGroupItem value="organisme" id="fin-org" className="mt-0.5" />
                <label htmlFor="fin-org" className="cursor-pointer">
                  <p className="font-medium text-sm">Ma formation est financée par ma société ou un organisme tiers</p>
                  <p className="text-xs text-muted-foreground">(entreprise, OPCO, France Travail, etc.)</p>
                </label>
              </div>
            </RadioGroup>

            {typeFinancement === "organisme" && (
              <div className="space-y-4 pt-3 border-t mt-3">
                <p className="text-sm font-semibold text-[#1e3a8a]">Informations sur l'organisme financeur</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Type de financeur</Label>
                    <Select value={financeurType} onValueChange={setFinanceurType}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entreprise">Entreprise</SelectItem>
                        <SelectItem value="OPCO">OPCO</SelectItem>
                        <SelectItem value="France Travail">France Travail</SelectItem>
                        <SelectItem value="Région / Collectivité">Région / Collectivité</SelectItem>
                        <SelectItem value="Autre organisme">Autre organisme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nom de l'organisme / société *</Label>
                    <Input value={financeurNom} onChange={e => setFinanceurNom(e.target.value)} placeholder="Nom de la société ou organisme" />
                  </div>
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input value={financeurAdresse} onChange={e => setFinanceurAdresse(e.target.value)} placeholder="Adresse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Code postal</Label>
                    <Input value={financeurCodePostal} onChange={e => setFinanceurCodePostal(e.target.value)} placeholder="Code postal" />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input value={financeurVille} onChange={e => setFinanceurVille(e.target.value)} placeholder="Ville" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>SIRET</Label>
                    <Input value={financeurSiret} onChange={e => setFinanceurSiret(e.target.value)} placeholder="N° SIRET" />
                  </div>
                  <div>
                    <Label>Nom du contact</Label>
                    <Input value={financeurContactNom} onChange={e => setFinanceurContactNom(e.target.value)} placeholder="Personne à contacter" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={financeurEmail} onChange={e => setFinanceurEmail(e.target.value)} placeholder="email@organisme.fr" />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={financeurTelephone} onChange={e => setFinanceurTelephone(e.target.value)} placeholder="Téléphone" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 4 : Informations vous concernant */}
        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
              4. Informations vous concernant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { q: "1. Avez-vous déjà perdu 6 points d'un coup sur votre permis ?", val: q1PerduPoints, set: setQ1PerduPoints },
              { q: "2. Avez-vous déjà été condamné pour conduite sans permis ?", val: q2CondamneSansPermis, set: setQ2CondamneSansPermis },
              { q: "3. Avez-vous été condamné pour refus de restitution du permis ?", val: q3RefusRestitution, set: setQ3RefusRestitution },
              { q: "4. Avez-vous été condamné à plus de 6 mois d'emprisonnement pour vol, escroquerie, etc. ?", val: q4Condamne6Mois, set: setQ4Condamne6Mois },
              { q: "5. Avez-vous le casier judiciaire B3 vierge ?", val: q5CasierVierge, set: setQ5CasierVierge },
              { q: "6. Formation VTC continue déjà réalisée il y a plus de 5 ans ?", val: q6FormationContinueDeja, set: setQ6FormationContinueDeja },
            ].map(({ q, val, set }, idx) => (
              <div key={idx}>
                <p className="text-sm font-medium mb-2">{q} <span className="text-destructive">*</span></p>
                <RadioGroup value={val} onValueChange={set} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="oui" id={`q${idx}-oui`} />
                    <label htmlFor={`q${idx}-oui`} className="text-sm cursor-pointer">Oui</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="non" id={`q${idx}-non`} />
                    <label htmlFor={`q${idx}-non`} className="text-sm cursor-pointer">Non</label>
                  </div>
                </RadioGroup>
              </div>
            ))}

            {(q1PerduPoints === "oui" || q2CondamneSansPermis === "oui" || q3RefusRestitution === "oui" || q4Condamne6Mois === "oui") && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mt-2">
                <p className="text-red-700 font-bold text-sm">
                  ⚠️ Attention : au vu de vos réponses, merci de nous recontacter au 04 28 29 60 91 avant de poursuivre votre inscription.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 4bis : Aperçu du devis + CGV + Bordereau de renonciation */}
        {formation && prenom && nom && (
          <Card className="border-l-4 border-l-green-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                <FileText className="w-5 h-5" />
                Aperçu de votre devis — Veuillez lire attentivement avant de signer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Récap du devis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-[#1e3a8a] text-base">RÉCAPITULATIF DU DEVIS</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Client :</p>
                  <p className="font-medium">{civilite} {prenom} {nom}</p>
                  {email && <><p className="text-muted-foreground">Email :</p><p>{email}</p></>}
                  {telephone && <><p className="text-muted-foreground">Téléphone :</p><p>{telephone}</p></>}
                  {adresse && <><p className="text-muted-foreground">Adresse :</p><p>{adresse}</p></>}
                  {(codePostal || ville) && <><p className="text-muted-foreground">Ville :</p><p>{codePostal} {ville}</p></>}
                </div>
                {typeFinancement === "organisme" && financeurNom && (
                  <div className="border-t pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted-foreground">Organisme financeur :</p>
                    <p className="font-medium">{financeurNom}</p>
                    {financeurSiret && <><p className="text-muted-foreground">SIRET :</p><p>{financeurSiret}</p></>}
                    {financeurAdresse && <><p className="text-muted-foreground">Adresse :</p><p>{financeurAdresse} {financeurCodePostal} {financeurVille}</p></>}
                  </div>
                )}
                <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Formation :</span> <span className="font-medium">{formation.designation}</span></p>
                  <p><span className="text-muted-foreground">Agrément :</span> {formation.agrement}</p>
                  <p><span className="text-muted-foreground">Durée :</span> {formation.duree}</p>
                  {!formation.id.includes("elearning") && dateDebutSouhaitee && (
                    <p><span className="text-muted-foreground">Session :</span> {dateDebutSouhaitee} {creneauSouhaite && `— ${creneauSouhaite}`}</p>
                  )}
                  {formation.id.includes("elearning") && (
                    <p><span className="text-muted-foreground">Modalité :</span> E-learning — Plateforme disponible 3 mois à compter de l'inscription</p>
                  )}
                  <p className="text-lg font-bold text-[#1e3a8a] mt-2">Montant TTC : {formation.prix} € <span className="text-xs font-normal text-muted-foreground">(Non assujetti à la TVA)</span></p>
                </div>
              </div>

              {/* CGV complètes */}
              <div className="border rounded-lg">
                <div className="bg-gray-100 px-4 py-2 rounded-t-lg border-b">
                  <h3 className="font-bold text-sm">CONDITIONS GÉNÉRALES DE VENTE</h3>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto text-xs leading-relaxed whitespace-pre-line font-mono bg-white">
                  {CGV_TEXT}
                </div>
              </div>

              {/* Bordereau de renonciation */}
              <div className="border-2 border-[#1e3a8a] rounded-lg p-4 space-y-3 bg-blue-50/30">
                <h3 className="font-bold text-[#1e3a8a] text-center text-base">BORDEREAU DE RENONCIATION AU DÉLAI DE RÉTRACTATION</h3>
                <div className="text-sm space-y-2">
                  <p>
                    Je soussigné(e), <strong>{civilite} {prenom} {nom}</strong>, déclare avoir pris connaissance des conditions générales de vente de FTRANSPORT 
                    et du délai de rétractation de dix (10) jours prévu par l'article L6353-5 du Code du travail.
                  </p>
                  <p>
                    <strong>Formation concernée :</strong> {formation.designation}
                  </p>
                  <p>
                    <strong>Montant TTC :</strong> {formation.prix} €
                  </p>
                  <p className="italic">
                    Par la présente, je renonce expressément à l'exercice de mon droit de rétractation et demande que la formation commence 
                    avant l'expiration du délai de dix jours.
                  </p>
                  <p className="italic">
                    Je reconnais que cette renonciation est faite librement et sans aucune pression.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ En signant ci-dessous, vous acceptez les conditions générales de vente et renoncez à votre délai de rétractation de 10 jours.
                </p>
              </div>
            </CardContent>
          </Card>
        )}


        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
              5. Signature (optionnelle)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous pouvez signer directement ici ou imprimer le PDF et le signer manuellement.
            </p>
            <div className="border rounded-lg overflow-hidden" style={{ touchAction: "none" }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full cursor-crosshair bg-white"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearSig} className="flex items-center gap-1">
              <Eraser className="w-3 h-3" /> Effacer la signature
            </Button>
          </CardContent>
        </Card>

        {/* Download button */}
        <div className="flex flex-col items-center gap-3 pb-8">
          <Button
            size="lg"
            className="w-full md:w-auto px-8 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white text-lg"
            onClick={generateDevisPDF}
            disabled={generating || !prenom || !nom || !selectedFormation || !telephone || !email || !codePostal || !ville}
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Génération en cours...</>
            ) : (
              <><Download className="w-5 h-5 mr-2" /> Télécharger mon devis PDF</>
            )}
          </Button>

          {generated && (
            <div className="space-y-4 w-full max-w-lg">
              <div className="flex items-center gap-2 text-green-600 text-sm justify-center">
                <CheckCircle2 className="w-4 h-4" />
                Devis téléchargé avec succès !
              </div>

              <div ref={ribRef} className="bg-[#1e3a8a]/5 border-2 border-[#1e3a8a] rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-[#1e3a8a] text-center">🏦 Coordonnées bancaires (RIB)</h3>
                <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Titulaire :</span><span className="font-semibold">{RIB_INFO.titulaire}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IBAN :</span><span className="font-bold text-[#1e3a8a] tracking-wide">{RIB_INFO.iban}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">BIC / SWIFT :</span><span className="font-semibold">{RIB_INFO.swift}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Banque :</span><span className="font-semibold">{RIB_INFO.banque}</span></div>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center space-y-2">
                  <p className="text-amber-800 font-bold text-base">
                    ⚠️ Votre devis ne sera pris en compte qu'après avoir effectué le premier virement.
                  </p>
                  <p className="text-amber-700 text-sm">
                    Merci de nous recontacter au <strong className="text-lg">04.28.29.60.91</strong> après l'avoir effectué.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">
                Après avoir téléchargé votre devis, envoyez-le signé par email à{" "}
                <a href="mailto:contact@ftransport.fr" className="text-[#1e3a8a] font-medium">contact@ftransport.fr</a>{" "}
                ou apportez-le au 86 route de Genas, 69003 Lyon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
