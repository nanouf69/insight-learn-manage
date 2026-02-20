import { useState } from "react";
import { FileText, Download, Plus, Trash2, Eye, CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
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

interface DevisSectionProps {
  apprenant: any;
}

interface LigneDevis {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
}

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
Ce contrat precise obligatoirement :
- Nature de la formation : Formation continue obligatoire VTC - Prevention des discriminations et des violences sexuelles et sexistes
- Duree : 14 heures (pouvant etre fractionnees en quatre periodes de 3h30 sur une periode de 2 mois maximum)
- Programme et objectifs : Conformement a l'arrete du 6 avril 2017 modifie par l'arrete du 20 mars 2024
- Module A : Reglementation du transport public particulier de personnes et prevention des discriminations et des violences sexuelles et sexistes (3h30)
- Module B : Reglementation specifique a l'activite de VTC (3h30)
- Module C : Securite routiere (3h30)
- Module au choix (3h30) : Anglais, Gestion et developpement commercial, ou Prevention et secours civiques
- Niveau de connaissances prealables requis : Etre titulaire d'une carte professionnelle de chauffeur VTC de plus de 5 ans
- Moyens pedagogiques et techniques : Tablettes numeriques et plateforme d'apprentissage en ligne
- Formateur : M. Guenichi Naoufal, plus de 10 ans d'experience dans la formation professionnelle en transport
- Modalites d'evaluation : Exercices continus tout au long de la formation
- Prix : 200 euros TTC
- Modalites de paiement : Especes ou virement bancaire, conformement a l'article 3 des presentes CGV

ARTICLE 6 - DEDIT ET REMPLACEMENT D'UN PARTICIPANT
En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure ou de le remplacer par un autre participant.

ARTICLE 7 - ANNULATION, ABSENCE OU INTERRUPTION D'UNE FORMATION
Tout module commence est du dans son integralite.
7.1 - Annulation par le Client
- Si l'annulation intervient dans le delai de retractation de 10 jours : aucun frais d'annulation ne sera applique.
- Si l'annulation intervient apres le delai de retractation mais avant le debut de la formation : les frais d'annulation seront egaux a 30% du prix TTC de la formation.
- Si l'annulation intervient apres le debut de la formation : les frais d'annulation seront egaux a 100% du prix TTC de la formation.
7.2 - Cas de force majeure et motifs legitimes
Les frais d'annulation ne seront pas applicables en cas de : Force majeure dument reconnue, Certificat medical, Accident grave, Deces d'un membre de la famille proche, Mutation professionnelle avec justificatif, Licenciement avec justificatif.
7.3 - Annulation par FTRANSPORT
FTRANSPORT se reserve le droit d'annuler ou de reporter une session de formation en cas de force majeure ou d'insuffisance de participants. Dans ce cas, les Clients inscrits en seront informes au plus tot et FTRANSPORT proposera soit un report a une date ulterieure, soit le remboursement integral des sommes versees.
7.4 - Exclusion du Stagiaire
FTRANSPORT se reserve le droit d'exclure un Stagiaire de la formation, sans remboursement, dans les cas suivants : retards repetes non justifies, absences injustifiees, comportement inapproprie.

ARTICLE 8 - ASSIDUITE ET CONTROLE DE PRESENCE
La presence du stagiaire est obligatoire et controlee par une feuille d'emargement signee par demi-journee. En cas d'absence, le stagiaire doit prevenir FTRANSPORT dans les meilleurs delais et fournir un justificatif. Les absences non justifiees peuvent entrainer l'exclusion de la formation sans remboursement.
A l'issue de la formation, une attestation de formation continue obligatoire sera remise au stagiaire, conformement a l'article R. 3120-8-2 du Code des transports.

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
Reference Handicap : contact@ftransport.fr - 04.28.29.60.91

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

export function DevisSection({ apprenant }: DevisSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const validiteDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  // Trouver la désignation correcte depuis le catalogue
  const getDesignationInitiale = () => {
    if (!apprenant.formation_choisie) return "Formation professionnelle";
    const found = FORMATIONS_CATALOGUE.find(f =>
      apprenant.formation_choisie === f.label ||
      f.label.toLowerCase().includes((apprenant.formation_choisie || '').toLowerCase())
    );
    return found?.designation || apprenant.formation_choisie;
  };

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
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [statutDevis, setStatutDevis] = useState<'en_attente' | 'valide' | 'refuse'>('en_attente');
  const [creatingFacture, setCreatingFacture] = useState(false);
  const [factureCreee, setFactureCreee] = useState<string | null>(null);

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
  const totalTTC = totalHT; // Non assujetti TVA

  const creerFacture = async () => {
    setCreatingFacture(true);
    try {
      // Générer un numéro de facture
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
        montant_tva: 0,
        montant_ttc: totalTTC,
        tva_taux: 0,
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

      // En-tête fond bleu
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

      // Bloc CLIENT
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

      // Titre formation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('DETAIL DE LA PRESTATION', margin, y);
      y += 6;

      // Colonnes : Designation | Qte | Prix unit. | Total TTC
      // x de départ de chaque colonne
      const col0x = margin;           // Designation
      const col1x = margin + 100;     // Qte (centre à col1x+10)
      const col2x = margin + 125;     // Prix unitaire (right align à col2x+42)
      const col3x = margin + 152;     // Total TTC (right align à pageW-margin)
      const tableRight = pageW - margin;

      // Header tableau
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

      // Lignes de prestation
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      lignes.forEach((ligne, idx) => {
        // Calculer la hauteur de ligne selon le texte de désignation
        const designW = col1x - col0x - 4;
        const designLines = doc.splitTextToSize(ligne.designation, designW);
        const nbLines = Math.max(1, Math.min(designLines.length, 3));
        const rowH = Math.max(10, nbLines * 4.5 + 4);

        doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setDrawColor(210, 210, 210);
        doc.line(margin, y, tableRight, y);
        doc.line(margin, y + rowH, tableRight, y + rowH);
        // Séparateurs verticaux
        doc.line(col1x, y, col1x, y + rowH);
        doc.line(col2x, y, col2x, y + rowH);
        doc.line(col3x, y, col3x, y + rowH);
        doc.line(margin, y, margin, y + rowH);
        doc.line(tableRight, y, tableRight, y + rowH);

        doc.setFontSize(8);
        const vertCenter = y + rowH / 2 + 1;

        // Designation (texte wrappé, aligné en haut)
        const linesToShow = designLines.slice(0, 3);
        const textStartY = y + 4;
        linesToShow.forEach((l: string, li: number) => {
          doc.text(l, col0x + 2, textStartY + li * 4);
        });

        // Quantité centrée
        doc.text(String(ligne.quantite), col1x + 10, vertCenter, { align: 'center' });

        // Prix unitaire aligné à droite dans sa colonne
        doc.text(formatEUR(ligne.prixUnitaire), col2x + 26, vertCenter, { align: 'right' });

        // Total aligné à droite
        const total = ligne.quantite * ligne.prixUnitaire;
        doc.text(formatEUR(total), tableRight - 2, vertCenter, { align: 'right' });

        y += rowH;
      });

      // Ligne de fermeture du tableau
      doc.setDrawColor(210, 210, 210);
      doc.line(margin, y, tableRight, y);

      // Bloc totaux
      y += 6;
      const totBoxX = margin + contentW * 0.55;
      const totBoxW = contentW * 0.45;
      const totBoxH = 22;
      doc.setFillColor(243, 244, 246);
      doc.rect(totBoxX, y, totBoxW, totBoxH, 'F');
      doc.setDrawColor(210, 210, 210);
      doc.rect(totBoxX, y, totBoxW, totBoxH);

      // Séparateur vertical dans le bloc totaux (libellé | montant)
      const totSepX = totBoxX + totBoxW * 0.58;
      doc.line(totSepX, y, totSepX, y + totBoxH);
      // Séparateurs horizontaux
      doc.line(totBoxX, y + 8, totBoxX + totBoxW, y + 8);
      doc.line(totBoxX, y + 15, totBoxX + totBoxW, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Total HT :', totSepX - 2, y + 5.5, { align: 'right' });
      doc.text('TVA (0% - Non assujetti) :', totSepX - 2, y + 12.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text('TOTAL TTC :', totSepX - 2, y + 19.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(formatEUR(totalHT), totBoxX + totBoxW - 3, y + 5.5, { align: 'right' });
      doc.text('0,00 EUR', totBoxX + totBoxW - 3, y + 12.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text(formatEUR(totalTTC), totBoxX + totBoxW - 3, y + 19.5, { align: 'right' });

      y += totBoxH + 8;

      // Notes
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

      // Signature
      y = Math.max(y + 8, 215);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`A Lyon, le ${format(new Date(dateDevis), 'dd MMMM yyyy', { locale: fr })}`, margin, y);
      y += 5;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, margin + 75, y);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Signature et mention "Bon pour accord"', margin, y + 4);

      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 140);
      doc.text('FTRANSPORT - SASU au capital de 5 000 EUR - SIRET : 82346156100018 - N Decl. : 84 69 15114 69', margin, 288);
      doc.text('Non assujetti TVA | contact@ftransport.fr | 04.28.29.60.91 | 86 route de Genas, 69003 Lyon', margin, 293);

      // === PAGE 2 : CGV ===
      doc.addPage();

      // En-tête
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
        if (trimmed === '') {
          y += 2;
          continue;
        }
        // Titres en gras
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

      // Footer CGV
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'italic');
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} / ${pageCount}`, pageW / 2, 297, { align: 'center' });
      }

      // Téléchargement
      const fileName = `Devis_${apprenant.prenom}_${apprenant.nom}_${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(fileName);
      toast.success("Devis généré avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du devis");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Création du devis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infos devis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date du devis</Label>
              <Input
                type="date"
                value={dateDevis}
                onChange={(e) => setDateDevis(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valable jusqu'au</Label>
              <Input
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
              />
            </div>
          </div>

          {/* Sélecteur formation rapide */}
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

            {/* En-tête colonnes */}
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
                  <Input
                    type="number"
                    min={1}
                    value={ligne.quantite}
                    onChange={(e) => updateLigne(ligne.id, 'quantite', Number(e.target.value))}
                    className="text-center"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ligne.prixUnitaire}
                    onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', Number(e.target.value))}
                    className="text-right"
                  />
                </div>
                <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                  <span className="font-semibold text-sm">
                    {(ligne.quantite * ligne.prixUnitaire).toLocaleString('fr-FR')} €
                  </span>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLigne(ligne.id)}
                    className="text-destructive hover:text-destructive h-8 w-8"
                    disabled={lignes.length === 1}
                  >
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
                <span className="text-muted-foreground">TVA (0% - Non assujetti)</span>
                <span>0,00 €</span>
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
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions particulières, modalités de paiement, informations complémentaires..."
              className="min-h-[80px]"
            />
          </div>

          <Separator />

          {/* Statut du devis */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Statut du devis</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => { setStatutDevis('en_attente'); setFactureCreee(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  statutDevis === 'en_attente'
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-border bg-background text-muted-foreground hover:border-amber-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                En attente
              </button>
              <button
                onClick={() => setStatutDevis('valide')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  statutDevis === 'valide'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-border bg-background text-muted-foreground hover:border-green-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Validé
              </button>
              <button
                onClick={() => { setStatutDevis('refuse'); setFactureCreee(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  statutDevis === 'refuse'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-border bg-background text-muted-foreground hover:border-red-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Refusé
              </button>

              {/* Badge statut actif */}
              {statutDevis === 'en_attente' && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">⏳ En attente de réponse client</Badge>
              )}
              {statutDevis === 'valide' && (
                <Badge className="bg-green-100 text-green-800 border-green-300">✅ Devis accepté par le client</Badge>
              )}
              {statutDevis === 'refuse' && (
                <Badge className="bg-red-100 text-red-800 border-red-300">❌ Devis refusé par le client</Badge>
              )}
            </div>

            {/* Zone facturation si validé */}
            {statutDevis === 'valide' && (
              <div className="mt-3 p-4 rounded-lg border-2 border-green-200 bg-green-50/50 space-y-3">
                <p className="text-sm font-medium text-green-800">
                  Le devis est validé — vous pouvez générer la facture correspondante.
                </p>
                {factureCreee ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Facture <strong>{factureCreee}</strong> créée avec succès dans le module Comptabilité.
                  </div>
                ) : (
                  <Button
                    onClick={creerFacture}
                    disabled={creatingFacture}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    {creatingFacture ? "Création en cours..." : "Générer la facture"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions PDF */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button
              onClick={generateDevisPDF}
              disabled={generating}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {generating ? "Génération..." : "Télécharger le devis PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
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
                {CGV_TEXT.replace(
                  /ARTICLE \d+[\s\S]*?(?=\nARTICLE|\n---)/g,
                  (m) => m
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
