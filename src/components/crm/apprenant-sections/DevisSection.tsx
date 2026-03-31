import { useState, useRef, useEffect } from "react";
import { FileText, Download, Plus, Trash2, Eye, CheckCircle2, XCircle, Clock, Receipt, PenLine, RotateCcw, Send, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";

interface DevisSectionProps {
  apprenant: any;
}

interface LigneDevis {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
}

// ─── DEVIS TEMPLATES DOCX ───
const DEVIS_TEMPLATES = [
  { id: "vtc_complet", label: "Formation VTC complète (théorique + pratique)", file: "Devis_VTC_complet.docx", prix: 1499, emailId: "devis-vtc-complet" },
  { id: "vtc_elearning", label: "Formation VTC E-learning", file: "Devis_VTC_elearning.docx", prix: 1099, emailId: "devis-vtc-elearning" },
  { id: "taxi_elearning_examen", label: "Formation TAXI E-learning avec examen", file: "Devis_TAXI_elearning_avec_examen.docx", prix: 1299, emailId: "devis-taxi-elearning" },
  { id: "ta_elearning", label: "Formation TA (passerelle VTC→TAXI) E-learning", file: "Devis_Ta_elearning.docx", prix: 999, emailId: "devis-ta-elearning" },
  { id: "va_elearning", label: "Formation VA (passerelle TAXI→VTC) E-learning", file: "Devis_VTC_pour_chauffeurs_TAXI.docx", prix: 999, emailId: "devis-va-elearning" },
  { id: "taxi_pratique", label: "Formation pratique TAXI", file: "Devis_TAXI_pratique.docx", prix: 0, emailId: "devis-taxi-pratique" },
  { id: "fc_vtc", label: "Formation continue VTC", file: "Devis_formation_continue_VTC.docx", prix: 200, emailId: "devis-fc-vtc" },
  { id: "fc_taxi", label: "Formation continue TAXI", file: "Devis_formation_continue_TAXI.docx", prix: 200, emailId: "devis-fc-taxi" },
  { id: "vtc_sans_frais_examen", label: "Formation VTC sans frais d'examen", file: "Devis_VTC_sans_frais_examen.docx", prix: 1099, emailId: "devis-vtc-sans-frais-examen" },
  { id: "vtc_soir_avec_examen", label: "Formation VTC soir avec examen", file: "Devis_VTC_soir_avec_examen.docx", prix: 1499, emailId: "devis-vtc-soir-avec-examen" },
  { id: "vtc_soir_sans_examen", label: "Formation VTC soir sans examen", file: "Devis_VTC_soir_sans_examen.docx", prix: 1099, emailId: "devis-vtc-soir-sans-examen" },
];

// ─── EMAIL BODY TEMPLATES (per devis type) ───
const DEVIS_EMAIL_BODIES: Record<string, { subject: string; body: string }> = {
  "devis-vtc-complet": {
    subject: "Votre devis Formation VTC complète - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation VTC complète (théorique et pratique).

📋 Détails de la formation :
- Intitulé : Formation VTC
- Durée : 66 heures
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de :
1. Remplir et signer le devis ci-joint
2. Nous renvoyer la fiche d'inscription complétée
3. Joindre les documents justificatifs demandés (pièce d'identité, justificatif de domicile)

📧 Par mail : contact@ftransport.fr
📍 Ou en vous rendant au 86 route de Genas, 69003 Lyon

N'hésitez pas à nous contacter au 04.28.29.60.91 pour toute question.

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-elearning": {
    subject: "Votre devis Formation VTC E-learning - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation VTC E-learning.

📋 Détails de la formation :
- Intitulé : Formation VTC E-learning
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Formation pratique VTC 3h solo ou 6h en groupe + Frais d'examen + Mise à disposition du véhicule
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de :
1. Remplir et signer le devis ci-joint
2. Nous renvoyer la fiche d'inscription complétée
3. Joindre les documents justificatifs demandés

📧 Par mail : contact@ftransport.fr
📍 Ou sur place : 86 route de Genas, 69003 Lyon

N'hésitez pas à nous contacter au 04.28.29.60.91 pour toute question.

Cordialement,
L'équipe Ftransport`,
  },
  "devis-taxi-elearning": {
    subject: "Votre devis Formation TAXI E-learning - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Nous avons le plaisir de vous transmettre en pièce jointe votre devis pour la Formation TAXI E-learning avec examen.

📋 Détails de la formation :
- Intitulé : Formation TAXI E-learning
- Durée : 96h
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Frais d'examen CMA + Mise à disposition du véhicule pour l'examen
- Lieu : LYON
- Montant : {{montant}} € TTC (non assujetti TVA)

Pour valider votre inscription, merci de nous renvoyer le devis signé avec les justificatifs demandés.

📧 Par mail : contact@ftransport.fr
📍 Sur place : 86 route de Genas, 69003 Lyon
📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-ta-elearning": {
    subject: "Votre devis Formation TA (Passerelle VTC→TAXI) - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation TAXI pour chauffeurs VTC (TA) en E-learning.

📋 Détails :
- Intitulé : Formation passerelle TAXI pour chauffeurs VTC
- Plateforme E-learning : accès 3 mois
- Inclus : Frais d'examen CMA + Formation pratique TAXI + Mise à disposition du véhicule
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-va-elearning": {
    subject: "Votre devis Formation VA (Passerelle TAXI→VTC) - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC pour chauffeurs TAXI (VA) en E-learning.

📋 Détails :
- Intitulé : Formation VTC pour chauffeurs TAXI
- Formation théorique et pratique
- Plateforme E-learning : accès 3 mois
- Inclus : Entrainement pratique VTC + Mise à disposition du véhicule
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-taxi-pratique": {
    subject: "Votre devis Formation pratique TAXI - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation pratique TAXI.

📋 Détails :
- Intitulé : Formation pratique TAXI
- Durée : 6h en groupe ou 3h solo
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-fc-vtc": {
    subject: "Votre devis Formation continue VTC - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation continue obligatoire VTC.

📋 Détails :
- Intitulé : Formation continue VTC
- Durée : 14 heures présentielles
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Cette formation est obligatoire pour le renouvellement de votre carte professionnelle VTC (tous les 5 ans).

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-fc-taxi": {
    subject: "Votre devis Formation continue TAXI - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation continue obligatoire TAXI.

📋 Détails :
- Intitulé : Formation continue TAXI
- Durée : 14 heures présentielles
- Lieu : LYON (69)
- Montant : {{montant}} € TTC

Cette formation est obligatoire pour le renouvellement de votre carte professionnelle TAXI (tous les 5 ans).

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-sans-frais-examen": {
    subject: "Votre devis Formation VTC sans frais d'examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC E-learning (sans frais d'examen).

📋 Détails :
- Intitulé : Formation VTC E-learning
- Plateforme : www.gestion.ftransport.fr/cours (accès 3 mois)
- Inclus : Formation pratique VTC + Mise à disposition du véhicule
- Frais d'examen NON inclus (à votre charge auprès de la CMA)
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-soir-avec-examen": {
    subject: "Votre devis Formation VTC soir avec examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC en cours du soir (avec frais d'examen inclus).

📋 Détails :
- Intitulé : Formation VTC cours du soir
- Plateforme : www.gestion.ftransport.fr/cours
- Inclus : Formation pratique VTC + Frais d'examen CMA + Mise à disposition du véhicule
- Horaires : Cours du soir
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
  "devis-vtc-soir-sans-examen": {
    subject: "Votre devis Formation VTC soir sans examen - {{prenom}} {{nom}}",
    body: `Bonjour {{prenom}} {{nom}},

Veuillez trouver en pièce jointe votre devis pour la Formation VTC en cours du soir (sans frais d'examen).

📋 Détails :
- Intitulé : Formation VTC cours du soir
- Plateforme : www.gestion.ftransport.fr/cours
- Inclus : Formation pratique VTC + Mise à disposition du véhicule
- Frais d'examen NON inclus (à votre charge auprès de la CMA)
- Horaires : Cours du soir
- Lieu : LYON (69)
- Montant : {{montant}} € TTC (non assujetti TVA)

Merci de nous renvoyer le devis signé avec vos justificatifs.

📧 contact@ftransport.fr | 📞 04.28.29.60.91

Cordialement,
L'équipe Ftransport`,
  },
};

const FORMATIONS_CATALOGUE = [
  { label: "Formation initiale VTC (sans examen) - 1 099 €", prix: 1099, designation: "Formation initiale VTC - Préparation à la carte professionnelle chauffeur VTC (sans frais d'examen)" },
  { label: "Formation initiale VTC avec frais d'examen - 1 599 €", prix: 1599, designation: "Formation initiale VTC avec frais d'examen - Préparation complète à la carte professionnelle chauffeur VTC" },
  { label: "Formation initiale TAXI (sans examen) - 1 299 €", prix: 1299, designation: "Formation initiale TAXI - Préparation à la carte professionnelle chauffeur de taxi (sans frais d'examen)" },
  { label: "Formation initiale TAXI avec frais d'examen - 1 799 €", prix: 1799, designation: "Formation initiale TAXI avec frais d'examen - Préparation complète à la carte professionnelle chauffeur de taxi" },
  { label: "Formation passerelle TAXI pour chauffeur VTC (TA) - 999 €", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC (TA) - Accès à la carte professionnelle taxi pour titulaires d'une carte VTC" },
  { label: "Formation continue obligatoire VTC - 200 €", prix: 200, designation: "Formation continue obligatoire VTC - Prévention des discriminations et des violences sexuelles et sexistes (14h)" },
  { label: "Formation VTC E-learning - 1 099 €", prix: 1099, designation: "Formation initiale VTC en E-learning - Préparation à la carte professionnelle chauffeur VTC" },
  { label: "Formation VTC E-learning avec examen - 1 599 €", prix: 1599, designation: "Formation initiale VTC en E-learning avec frais d'examen" },
  { label: "Formation TAXI E-learning - 1 299 €", prix: 1299, designation: "Formation initiale TAXI en E-learning" },
  { label: "Formation TA E-learning - 999 €", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC en E-learning (TA)" },
  { label: "Formation VA E-learning - 499 €", prix: 499, designation: "Formation passerelle VTC pour chauffeur TAXI en E-learning (VA)" },
];

const CGV_TEXT = `CONDITIONS GENERALES DE VENTE - FTRANSPORT

FTRANSPORT est un organisme de formation professionnelle specialise dans le secteur du transport.
Siege social : 86 route de Genas, 69003 Lyon
Numero SIRET : 82346156100018
Numero de declaration d'activite : 84 69 15114 69
(Cet enregistrement ne vaut pas agrement de l'Etat)
Organisme non assujetti a la TVA
Contact : 04.28.29.60.91 | contact@ftransport.fr

DEFINITIONS
CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT
STAGIAIRE : la personne physique ou morale qui participe a une formation
CGV : les conditions generales de vente, detaillees ci-dessous.
OPCO : les organismes paritaires collecteurs agrees charges de collecter et gerer l'effort de formation des entreprises.

ARTICLE 1 - OBJET
Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente.

ARTICLE 2 - DELAI DE RETRACTATION
Conformement a l'article L6353-5 du Code du travail, le Client beneficie d'un delai de retractation de dix jours a compter de la conclusion du contrat de formation professionnelle.
Le Client peut exercer son droit de retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT a l'adresse suivante : 86 route de Genas, 69003 Lyon, ou par e-mail a : contact@ftransport.fr
Aucun paiement ne sera exige du Client avant l'expiration de ce delai de retractation.

ARTICLE 3 - CONDITIONS FINANCIERES, REGLEMENTS ET MODALITES DE PAIEMENT
Tous les prix sont indiques en euros, toutes taxes comprises.

3.1 - Modalites de paiement pour les particuliers
Conformement a l'article L6353-6 du Code du travail, lorsque le Client est une personne physique qui finance elle-meme sa formation :
- Aucune somme ne peut etre exigee avant l'expiration du delai de retractation de 10 jours.
- A l'expiration de ce delai, un premier versement ne pourra exceder 30% du prix total de la formation.
- Le solde sera echelonne au fur et a mesure du deroulement de la formation, selon un echeancier qui sera communique au Client.
Toutefois, le Client reste libre de regler l'integralite du montant de la formation en avance s'il le souhaite, apres l'expiration du delai de retractation de 10 jours. Ce paiement anticipe ne peut en aucun cas etre impose ou exige par FTRANSPORT.
Moyens de paiement acceptes : especes, virement bancaire, cheque.

3.2 - Modalites de paiement pour les entreprises et organismes financeurs
Lorsque la formation est financee par une entreprise, un OPCO, France Travail (anciennement Pole Emploi) ou tout autre organisme financeur, le paiement integral peut etre demande avant le debut de la formation, conformement aux accords conclus avec ces organismes.

3.3 - Retard de paiement
Toute somme non payee a echeance entraine de plein droit et sans mise en demeure prealable, l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal, ainsi qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros.

ARTICLE 4 - INSCRIPTION ET EFFECTIF
L'effectif de chaque formation est limite. Les inscriptions sont prises en compte dans leur ordre d'arrivee.
L'inscription devient definitive apres signature du contrat de formation et expiration du delai de retractation de 10 jours, conformement aux articles L6353-3 et suivants du Code du travail.
Seuls les contrats dument renseignes, dates, signes et revetus de la mention "Bon pour accord" ont valeur contractuelle.

ARTICLE 5 - CONTRAT DE FORMATION POUR LES PARTICULIERS
Conformement aux articles L6353-3 et L6353-4 du Code du travail, lorsqu'une personne physique finance elle-meme sa formation, un contrat de formation professionnelle est conclu entre FTRANSPORT et le stagiaire AVANT l'inscription definitive et tout reglement de frais.

ARTICLE 6 - DEDIT ET REMPLACEMENT D'UN PARTICIPANT
En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure ou de le remplacer par un autre participant.

ARTICLE 7 - ANNULATION, ABSENCE OU INTERRUPTION D'UNE FORMATION
Tout module commence est du dans son integralite.

ARTICLE 8 - ASSIDUITE ET CONTROLE DE PRESENCE
La presence du stagiaire est obligatoire et controlee par une feuille d'emargement signee par demi-journee.

ARTICLE 9 - HORAIRES ET ACCUEIL
Les formations se deroulent de 09h00 a 12h00 et de 13h00 a 17h00 avec une pause en milieu de chaque demi-journee, sauf indication contraire mentionnee sur la convocation.

ARTICLE 10 - REGLEMENT INTERIEUR
Le reglement interieur applicable aux stagiaires est remis a chaque participant avant le debut de la formation.

ARTICLE 11 - OBLIGATIONS ET FORCE MAJEURE
FTRANSPORT est tenue a une obligation de moyens et non de resultat vis-a-vis de ses Clients ou de ses Stagiaires.

ARTICLE 12 - PROPRIETE INTELLECTUELLE
L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT constituent des oeuvres protegees par le droit d'auteur et sont la propriete exclusive de FTRANSPORT ou de ses partenaires.

ARTICLE 13 - ACCESSIBILITE AUX PERSONNES EN SITUATION DE HANDICAP
FTRANSPORT s'engage a accueillir les personnes en situation de handicap dans les meilleures conditions.

ARTICLE 14 - PROTECTION DES DONNEES PERSONNELLES
Conformement au RGPD et a la loi n 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de rectification, de limitation, d'opposition, de portabilite et d'effacement des donnees personnelles le concernant.

ARTICLE 15 - DROIT APPLICABLE ET REGLEMENT DES LITIGES
Les presentes conditions generales de vente sont regies par le droit francais. En cas de litige, les parties s'engagent a rechercher une solution amiable. A defaut d'accord, le litige sera porte devant les Tribunaux competents de Lyon.

---
Numero de declaration d'activite : 84 69 15114 69 - Cet enregistrement ne vaut pas agrement de l'Etat
Ftransport n'est pas assujetti a la TVA
Services Pro - FTransport - SASU au capital social de 5 000 euros
SIRET : 82346156100018 | 86 route de Genas - 69003 LYON | Tel : 04.28.29.60.91 | contact@ftransport.fr`;

// Formatteur de nombre compatible jsPDF (pas d'espaces insécables)
const formatEUR = (n: number): string => {
  const parts = n.toFixed(2).replace('.', ',').split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts[0]},${parts[1]} EUR`;
};

// Détecte le template de devis le plus adapté selon le type d'apprenant
function detectDevisTemplate(apprenant: any): string | null {
  const type = (apprenant.type_apprenant || "").toUpperCase();
  const formation = (apprenant.formation_choisie || "").toLowerCase();

  if (type.includes("PA") && type.includes("VTC")) return "fc_vtc";
  if (type.includes("PA") && type.includes("TAXI")) return "fc_taxi";
  if (formation.includes("continue") && formation.includes("vtc")) return "fc_vtc";
  if (formation.includes("continue") && formation.includes("taxi")) return "fc_taxi";
  if (type === "TA" || type === "TA E") return "ta_elearning";
  if (type === "VA" || type === "VA E") return "va_elearning";
  if (type === "VTC" || type === "VTC E") {
    if (formation.includes("e-learning") || formation.includes("elearning") || type.includes("E")) return "vtc_elearning";
    return "vtc_complet";
  }
  if (type === "TAXI" || type === "TAXI E") {
    if (formation.includes("pratique")) return "taxi_pratique";
    return "taxi_elearning_examen";
  }
  if (type === "RP TAXI") return "taxi_pratique";
  return null;
}

export function DevisSection({ apprenant }: DevisSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const validiteDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const detectedTemplate = detectDevisTemplate(apprenant);

  const getDesignationInitiale = () => {
    if (!apprenant.formation_choisie) return "Formation professionnelle";
    const found = FORMATIONS_CATALOGUE.find(f =>
      apprenant.formation_choisie === f.label ||
      f.label.toLowerCase().includes((apprenant.formation_choisie || '').toLowerCase())
    );
    return found?.designation || apprenant.formation_choisie;
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string>(detectedTemplate || "");
  const [lignes, setLignes] = useState<LigneDevis[]>([
    {
      id: crypto.randomUUID(),
      designation: getDesignationInitiale(),
      quantite: 1,
      prixUnitaire: apprenant.montant_ttc || 0,
    }
  ]);
  const [dateDevis, setDateDevis] = useState(today);
  const [dateValidite, setDateValidite] = useState(validiteDate);
  const [notes, setNotes] = useState("");
  const [tvaTaux, setTvaTaux] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statutDevis, setStatutDevis] = useState<'en_attente' | 'valide' | 'refuse'>('en_attente');
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [factureCreee, setFactureCreee] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas) setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const addLigne = () => {
    setLignes(prev => [...prev, {
      id: crypto.randomUUID(),
      designation: "",
      quantite: 1,
      prixUnitaire: 0,
    }]);
  };

  const removeLigne = (id: string) => {
    setLignes(prev => prev.filter(l => l.id !== id));
  };

  const updateLigne = (id: string, field: keyof LigneDevis, value: string | number) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const applyFormationCatalogue = (formationLabel: string) => {
    const f = FORMATIONS_CATALOGUE.find(f => f.label === formationLabel);
    if (!f) return;
    setLignes(prev => prev.map((l, i) => i === 0 ? { ...l, designation: f.designation, prixUnitaire: f.prix } : l));
  };

  const totalHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  const montantTVA = totalHT * (tvaTaux / 100);
  const totalTTC = totalHT + montantTVA;

  // ─── DOCX TEMPLATE DOWNLOAD ───
  const generateDocxFromTemplate = async () => {
    if (!selectedTemplate) {
      toast.error("Veuillez sélectionner un modèle de devis");
      return;
    }
    setGeneratingDocx(true);
    try {
      const tmpl = DEVIS_TEMPLATES.find(t => t.id === selectedTemplate);
      if (!tmpl) throw new Error("Template introuvable");

      const response = await fetch(`/devis/${tmpl.file}`);
      if (!response.ok) throw new Error("Impossible de charger le modèle DOCX");
      const blob = await response.blob();

      const fileName = `Devis_${apprenant.prenom}_${apprenant.nom}_${tmpl.id}_${format(new Date(), 'ddMMyyyy')}.docx`;
      saveAs(blob, fileName);
      toast.success("Devis DOCX téléchargé avec succès !");
    } catch (err: any) {
      console.error("Erreur génération DOCX:", err);
      toast.error(`Erreur : ${err.message || "Impossible de générer le DOCX"}`);
    } finally {
      setGeneratingDocx(false);
    }
  };

  // ─── EMAIL SEND (via Outlook) ───
  const getEmailContent = () => {
    const tmpl = DEVIS_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!tmpl) return null;
    const emailData = DEVIS_EMAIL_BODIES[tmpl.emailId];
    if (!emailData) return null;
    const montant = apprenant.montant_ttc || tmpl.prix || 0;
    const subject = emailData.subject
      .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
      .replace(/\{\{nom\}\}/g, apprenant.nom || '');
    const body = emailData.body
      .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
      .replace(/\{\{nom\}\}/g, apprenant.nom || '')
      .replace(/\{\{montant\}\}/g, String(montant));
    return { subject, body };
  };

  const sendDevisEmail = async () => {
    if (!apprenant.email) {
      toast.error("Aucun email renseigné pour cet apprenant");
      return;
    }
    const emailContent = getEmailContent();
    if (!emailContent) {
      toast.error("Aucun modèle d'email pour ce type de devis");
      return;
    }

    setSendingEmail(true);
    try {
      const bodyHtml = emailContent.body.replace(/\n/g, '<br/>');
      const { error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          to: apprenant.email,
          subject: emailContent.subject,
          body: bodyHtml,
          apprenantId: apprenant.id,
        }
      });
      if (error) throw error;
      toast.success(`Email de devis envoyé à ${apprenant.email}`);
      setShowEmailPreview(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  const creerFacture = async () => {
    setCreatingFacture(true);
    try {
      const { data: lastFacture } = await supabase
        .from('factures')
        .select('numero')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const year = new Date().getFullYear();
      let nextNum = 1;
      if (lastFacture?.numero) {
        const match = lastFacture.numero.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const numero = `FAC-${year}-${String(nextNum).padStart(4, '0')}`;

      const designation = lignes.map(l => l.designation).join(' / ');
      const { data, error } = await supabase.from('factures').insert({
        numero,
        apprenant_id: apprenant.id,
        client_nom: `${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim(),
        client_adresse: [apprenant.adresse, apprenant.code_postal, apprenant.ville].filter(Boolean).join(', '),
        date_emission: dateDevis,
        date_echeance: dateValidite,
        montant_ht: totalHT,
        montant_tva: montantTVA,
        montant_ttc: totalTTC,
        tva_taux: tvaTaux,
        type_financement: apprenant.mode_financement || 'particulier',
        statut: 'en_attente',
      }).select().single();

      if (error) throw error;
      setFactureCreee(data.numero);
      toast.success(`Facture ${data.numero} créée avec succès !`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la création de la facture");
    } finally {
      setCreatingFacture(false);
    }
  };

  const generateDevisPDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 15;

      // === PAGE 1 : DEVIS ===
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('FTRANSPORT', margin, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Organisme de formation professionnelle', margin, 25);
      doc.text('86 route de Genas - 69003 Lyon', margin, 30);
      doc.text('04.28.29.60.91 | contact@ftransport.fr', margin, 35);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('DEVIS', pageW - margin - 35, 18, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const numDevis = `DEV-${format(new Date(), 'yyyyMM')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      doc.text(`N° ${numDevis}`, pageW - margin, 25, { align: 'right' });
      doc.text(`Date : ${format(new Date(dateDevis), 'dd MMMM yyyy', { locale: fr })}`, pageW - margin, 30, { align: 'right' });
      doc.text(`Valide jusqu'au : ${format(new Date(dateValidite), 'dd MMMM yyyy', { locale: fr })}`, pageW - margin, 35, { align: 'right' });

      y = 50;
      doc.setTextColor(0, 0, 0);

      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, contentW, 28, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('CLIENT', margin + 3, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${apprenant.civilite || ''} ${apprenant.prenom} ${apprenant.nom}`.trim(), margin + 3, y + 14);
      doc.setFontSize(9);
      if (apprenant.adresse) doc.text(apprenant.adresse, margin + 3, y + 19);
      const villeCP = [apprenant.code_postal, apprenant.ville].filter(Boolean).join(' ');
      if (villeCP) doc.text(villeCP, margin + 3, y + 24);
      if (apprenant.email) doc.text(apprenant.email, margin + contentW / 2, y + 19);
      if (apprenant.telephone) doc.text(apprenant.telephone, margin + contentW / 2, y + 24);

      y += 35;

      const dateDebut = apprenant.date_debut_formation;
      const dateFin = apprenant.date_fin_formation;
      const dateCatalogue = apprenant.date_formation_catalogue;

      if (dateDebut || dateFin || dateCatalogue) {
        doc.setFillColor(239, 246, 255);
        doc.rect(margin, y, contentW, 14, 'F');
        doc.setDrawColor(191, 219, 254);
        doc.rect(margin, y, contentW, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text('DATES DE LA FORMATION', margin + 3, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const dateInfos: string[] = [];
        if (dateCatalogue) dateInfos.push(`Session catalogue : ${dateCatalogue}`);
        if (dateDebut) {
          try { dateInfos.push(`Debut : ${format(new Date(dateDebut + 'T12:00:00'), 'dd MMMM yyyy', { locale: fr })}`); }
          catch { dateInfos.push(`Debut : ${dateDebut}`); }
        }
        if (dateFin) {
          try { dateInfos.push(`Fin : ${format(new Date(dateFin + 'T12:00:00'), 'dd MMMM yyyy', { locale: fr })}`); }
          catch { dateInfos.push(`Fin : ${dateFin}`); }
        }
        doc.text(dateInfos.join('   |   '), margin + 3, y + 11);
        y += 20;
      } else {
        y += 6;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('DETAIL DE LA PRESTATION', margin, y);
      y += 6;

      const col0x = margin;
      const col1x = margin + 100;
      const col2x = margin + 125;
      const col3x = margin + 152;
      const tableRight = pageW - margin;

      doc.setFillColor(30, 58, 138);
      doc.rect(margin, y, contentW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Designation', col0x + 2, y + 5.5);
      doc.text('Qte', col1x + 10, y + 5.5, { align: 'center' });
      doc.text('Prix unitaire', col2x + 21, y + 5.5, { align: 'center' });
      doc.text('Total TTC', tableRight - 2, y + 5.5, { align: 'right' });
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      lignes.forEach((ligne, idx) => {
        const designW = col1x - col0x - 4;
        const designLines = doc.splitTextToSize(ligne.designation, designW);
        const nbLines = Math.max(1, Math.min(designLines.length, 3));
        const rowH = Math.max(10, nbLines * 4.5 + 4);

        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setDrawColor(210, 210, 210);
        doc.line(margin, y, tableRight, y);
        doc.line(margin, y + rowH, tableRight, y + rowH);
        doc.line(col1x, y, col1x, y + rowH);
        doc.line(col2x, y, col2x, y + rowH);
        doc.line(col3x, y, col3x, y + rowH);
        doc.line(margin, y, margin, y + rowH);
        doc.line(tableRight, y, tableRight, y + rowH);

        doc.setFontSize(8);
        const vertCenter = y + rowH / 2 + 1;
        const linesToShow = designLines.slice(0, 3);
        const textStartY = y + 4;
        linesToShow.forEach((l: string, li: number) => {
          doc.text(l, col0x + 2, textStartY + li * 4);
        });
        doc.text(String(ligne.quantite), col1x + 10, vertCenter, { align: 'center' });
        doc.text(formatEUR(ligne.prixUnitaire), col2x + 26, vertCenter, { align: 'right' });
        const total = ligne.quantite * ligne.prixUnitaire;
        doc.text(formatEUR(total), tableRight - 2, vertCenter, { align: 'right' });
        y += rowH;
      });

      doc.setDrawColor(210, 210, 210);
      doc.line(margin, y, tableRight, y);

      y += 6;
      const totBoxX = margin + contentW * 0.55;
      const totBoxW = contentW * 0.45;
      const totBoxH = 22;
      doc.setFillColor(243, 244, 246);
      doc.rect(totBoxX, y, totBoxW, totBoxH, 'F');
      doc.setDrawColor(210, 210, 210);
      doc.rect(totBoxX, y, totBoxW, totBoxH);

      const totSepX = totBoxX + totBoxW * 0.58;
      doc.line(totSepX, y, totSepX, y + totBoxH);
      doc.line(totBoxX, y + 8, totBoxX + totBoxW, y + 8);
      doc.line(totBoxX, y + 15, totBoxX + totBoxW, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Total HT :', totSepX - 2, y + 5.5, { align: 'right' });
      doc.text(`TVA (${tvaTaux}%${tvaTaux === 0 ? ' - Non assujetti' : ''}) :`, totSepX - 2, y + 12.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text('TOTAL TTC :', totSepX - 2, y + 19.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(formatEUR(totalHT), totBoxX + totBoxW - 3, y + 5.5, { align: 'right' });
      doc.text(formatEUR(montantTVA), totBoxX + totBoxW - 3, y + 12.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(formatEUR(totalTTC), totBoxX + totBoxW - 3, y + 19.5, { align: 'right' });

      y += totBoxH + 8;

      if (notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text('Notes :', margin, y);
        y += 4;
        const noteLines = doc.splitTextToSize(notes, contentW);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 4 + 4;
      }

      y = Math.max(y + 8, 215);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`A Lyon, le ${format(new Date(dateDevis), 'dd MMMM yyyy', { locale: fr })}`, margin, y);
      y += 6;

      const sigBoxW = 80;
      const sigBoxH = 30;
      const sigClientX = margin;
      const sigFtransX = pageW - margin - sigBoxW;

      doc.setDrawColor(180, 180, 180);
      doc.rect(sigClientX, y, sigBoxW, sigBoxH);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Signature client + "Bon pour accord"', sigClientX + 2, y + 5);

      if (signatureDataUrl) {
        doc.addImage(signatureDataUrl, 'PNG', sigClientX + 2, y + 7, sigBoxW - 4, sigBoxH - 9);
        doc.setFontSize(6.5);
        doc.setTextColor(30, 58, 138);
        doc.text(`Signe electroniquement le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, sigClientX + 2, y + sigBoxH - 2);
      }

      doc.setDrawColor(180, 180, 180);
      doc.rect(sigFtransX, y, sigBoxW, sigBoxH);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Pour FTRANSPORT', sigFtransX + 2, y + 5);
      doc.setFontSize(7);
      doc.text('Le responsable de formation', sigFtransX + 2, y + 9);

      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text('FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69', margin, 288);
      doc.text('Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon', margin, 293);

      // === PAGE 2 : CGV ===
      doc.addPage();
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageW, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CONDITIONS GENERALES DE VENTE', pageW / 2, 13, { align: 'center' });

      y = 28;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      const cgvLines = CGV_TEXT.split('\n');
      for (const line of cgvLines) {
        if (y > 285) {
          doc.addPage();
          y = 15;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
        }
        const trimmed = line.trim();
        if (trimmed === '') { y += 2; continue; }
        const isTitle = trimmed.startsWith('ARTICLE') || trimmed === 'CONDITIONS GENERALES DE VENTE - FTRANSPORT' || trimmed === 'DEFINITIONS';
        if (isTitle) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(30, 58, 138);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0, 0, 0);
        }
        const wrapped = doc.splitTextToSize(trimmed, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * (isTitle ? 4.5 : 3.5) + (isTitle ? 1 : 0);
      }

      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} / ${pageCount}`, pageW / 2, 297, { align: 'center' });
      }

      const fileName = `Devis_${apprenant.prenom}_${apprenant.nom}_${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(fileName);
      toast.success("Devis PDF généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du devis PDF");
    } finally {
      setGenerating(false);
    }
  };

  const emailContent = getEmailContent();

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1 : DEVIS DOCX TEMPLATES ═══ */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileDown className="w-5 h-5 text-primary" />
            Devis DOCX pré-rempli
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sélectionner le modèle de devis</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un modèle de devis..." />
              </SelectTrigger>
              <SelectContent>
                {DEVIS_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label} {t.prix > 0 ? `- ${t.prix} €` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {detectedTemplate && selectedTemplate === detectedTemplate && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Détecté automatiquement selon le type d'apprenant ({apprenant.type_apprenant})
              </p>
            )}
          </div>

          {selectedTemplate && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Données qui seront injectées dans le DOCX :</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Nom :</span> <strong>{apprenant.prenom} {apprenant.nom}</strong></div>
                <div><span className="text-muted-foreground">Adresse :</span> <strong>{apprenant.adresse || '—'}</strong></div>
                <div><span className="text-muted-foreground">CP :</span> <strong>{apprenant.code_postal || '—'}</strong></div>
                <div><span className="text-muted-foreground">Ville :</span> <strong>{apprenant.ville || '—'}</strong></div>
                <div><span className="text-muted-foreground">Tél :</span> <strong>{apprenant.telephone || '—'}</strong></div>
                <div><span className="text-muted-foreground">Email :</span> <strong>{apprenant.email || '—'}</strong></div>
                <div><span className="text-muted-foreground">Date devis :</span> <strong>{format(new Date(dateDevis), 'dd/MM/yyyy')}</strong></div>
                <div><span className="text-muted-foreground">Montant :</span> <strong>{apprenant.montant_ttc || DEVIS_TEMPLATES.find(t => t.id === selectedTemplate)?.prix || 0} €</strong></div>
                <div><span className="text-muted-foreground">Dates formation :</span> <strong>{apprenant.date_formation_catalogue || apprenant.date_debut_formation || '—'}</strong></div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={generateDocxFromTemplate}
              disabled={generatingDocx || !selectedTemplate}
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              {generatingDocx ? "Génération..." : "Télécharger le devis DOCX"}
            </Button>

            {selectedTemplate && apprenant.email && (
              <Button
                variant="outline"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {showEmailPreview ? "Masquer" : "Envoyer"} l'email de devis
              </Button>
            )}
          </div>

          {/* Email preview */}
          {showEmailPreview && emailContent && (
            <div className="border rounded-lg p-4 space-y-3 bg-background">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Destinataire</p>
                <p className="text-sm font-medium">{apprenant.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Objet</p>
                <p className="text-sm font-medium">{emailContent.subject}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Corps du message</p>
                <div className="bg-muted/30 rounded p-3 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {emailContent.body}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={sendDevisEmail}
                  disabled={sendingEmail}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? "Envoi en cours..." : "Envoyer l'email"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowEmailPreview(false)}>
                  Annuler
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Le devis DOCX doit être joint manuellement via Outlook. Cet email sert d'accompagnement.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ SECTION 2 : DEVIS PDF PERSONNALISÉ (existant) ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Devis PDF personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infos devis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du devis</Label>
              <Input type="date" value={dateDevis} onChange={(e) => setDateDevis(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valable jusqu'au</Label>
              <Input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Appliquer une formation catalogue</Label>
            <Select onValueChange={applyFormationCatalogue}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une formation..." />
              </SelectTrigger>
              <SelectContent>
                {FORMATIONS_CATALOGUE.map(f => (
                  <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Lignes du devis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Lignes du devis</h3>
              <Button variant="outline" size="sm" onClick={addLigne}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter une ligne
              </Button>
            </div>
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <span className="col-span-6">Désignation</span>
              <span className="col-span-1">Qté</span>
              <span className="col-span-2">Prix unit. (€)</span>
              <span className="col-span-2 text-right">Total (€)</span>
              <span className="col-span-1"></span>
            </div>
            {lignes.map((ligne) => (
              <div key={ligne.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 md:col-span-6">
                  <Textarea
                    value={ligne.designation}
                    onChange={(e) => updateLigne(ligne.id, 'designation', e.target.value)}
                    placeholder="Désignation de la prestation..."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <Input type="number" min={1} value={ligne.quantite} onChange={(e) => updateLigne(ligne.id, 'quantite', Number(e.target.value))} className="text-center" />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input type="number" min={0} step={0.01} value={ligne.prixUnitaire} onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', Number(e.target.value))} className="text-right" />
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                  <span className="font-semibold text-sm">{(ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button variant="ghost" size="icon" onClick={() => removeLigne(ligne.id)} className="text-destructive hover:text-destructive h-8 w-8" disabled={lignes.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{totalHT.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({tvaTaux}%{tvaTaux === 0 ? ' - Non assujetti' : ''})</span>
                <span>{montantTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total TTC</span>
                <span className="text-primary">{totalTTC.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Modalités particulières</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions particulières, modalités de paiement, informations complémentaires..." className="min-h-[80px]" />
          </div>

          <Separator />

          {/* Signature électronique */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <PenLine className="w-4 h-4 text-primary" />
                Signature électronique client
              </Label>
              <Button variant="ghost" size="sm" onClick={clearSignature} className="text-muted-foreground hover:text-destructive gap-1 text-xs">
                <RotateCcw className="w-3 h-3" />
                Effacer
              </Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!signatureDataUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground text-sm">Signez ici avec votre souris ou votre doigt</span>
                </div>
              )}
            </div>
            {signatureDataUrl && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Signature enregistrée — elle sera intégrée dans le PDF
              </p>
            )}
          </div>

          <Separator />

          {/* Statut du devis */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Statut du devis</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => { setStatutDevis('en_attente'); setFactureCreee(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'en_attente' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border bg-background text-muted-foreground hover:border-amber-200'}`}>
                <Clock className="w-4 h-4" /> En attente
              </button>
              <button onClick={() => setStatutDevis('valide')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'valide' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border bg-background text-muted-foreground hover:border-green-200'}`}>
                <CheckCircle2 className="w-4 h-4" /> Validé
              </button>
              <button onClick={() => { setStatutDevis('refuse'); setFactureCreee(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${statutDevis === 'refuse' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border bg-background text-muted-foreground hover:border-red-200'}`}>
                <XCircle className="w-4 h-4" /> Refusé
              </button>

              {statutDevis === 'en_attente' && <Badge className="bg-amber-100 text-amber-800 border-amber-300">En attente de réponse client</Badge>}
              {statutDevis === 'valide' && <Badge className="bg-green-100 text-green-800 border-green-300">Devis accepté par le client</Badge>}
              {statutDevis === 'refuse' && <Badge className="bg-red-100 text-red-800 border-red-300">Devis refusé par le client</Badge>}
            </div>

            {statutDevis === 'valide' && (
              <div className="mt-3 p-4 rounded-lg border-2 border-green-200 bg-green-50/50 space-y-3">
                <p className="text-sm font-medium text-green-800">Le devis est validé — vous pouvez générer la facture correspondante.</p>
                {factureCreee ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Facture <strong>{factureCreee}</strong> créée avec succès dans le module Comptabilité.
                  </div>
                ) : (
                  <Button onClick={creerFacture} disabled={creatingFacture} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    {creatingFacture ? "Création en cours..." : "Générer la facture"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions PDF */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button onClick={generateDevisPDF} disabled={generating} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              {generating ? "Génération..." : "Télécharger le devis PDF"}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {showPreview ? "Masquer" : "Aperçu"} les CGV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Récap client */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Récapitulatif client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{apprenant.civilite} {apprenant.prenom} {apprenant.nom}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{apprenant.email || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="font-medium">{apprenant.telephone || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mode de financement</p>
              <Badge variant="outline">{apprenant.mode_financement || '-'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu CGV */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Conditions Générales de Vente — FTRANSPORT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                {CGV_TEXT}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
