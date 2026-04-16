import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, Eraser, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ─── FORMATIONS CATALOGUE ─── */
const FORMATIONS = [
  { id: "vtc_complet", label: "Formation initiale VTC (présentiel journée)", prix: 1099, designation: "Formation initiale VTC - Préparation à la carte professionnelle chauffeur VTC", duree: "66 heures" },
  { id: "vtc_complet_examen", label: "Formation initiale VTC avec frais d'examen", prix: 1599, designation: "Formation initiale VTC avec frais d'examen - Préparation complète à la carte professionnelle chauffeur VTC", duree: "66 heures" },
  { id: "vtc_soir", label: "Formation initiale VTC (présentiel soirée)", prix: 1099, designation: "Formation initiale VTC cours du soir - Préparation à la carte professionnelle chauffeur VTC", duree: "66 heures" },
  { id: "vtc_soir_examen", label: "Formation initiale VTC soirée avec frais d'examen", prix: 1599, designation: "Formation initiale VTC cours du soir avec frais d'examen", duree: "66 heures" },
  { id: "vtc_elearning", label: "Formation VTC E-learning", prix: 1099, designation: "Formation initiale VTC en E-learning - Préparation à la carte professionnelle chauffeur VTC", duree: "Plateforme 3 mois + pratique" },
  { id: "vtc_elearning_examen", label: "Formation VTC E-learning avec frais d'examen", prix: 1599, designation: "Formation initiale VTC en E-learning avec frais d'examen", duree: "Plateforme 3 mois + pratique" },
  { id: "taxi_elearning", label: "Formation TAXI E-learning", prix: 1299, designation: "Formation initiale TAXI en E-learning", duree: "96 heures (plateforme 3 mois)" },
  { id: "taxi_elearning_examen", label: "Formation TAXI E-learning avec frais d'examen", prix: 1799, designation: "Formation initiale TAXI en E-learning avec frais d'examen", duree: "96 heures (plateforme 3 mois)" },
  { id: "taxi_presential", label: "Formation TAXI présentiel", prix: 1299, designation: "Formation initiale TAXI en présentiel", duree: "96 heures" },
  { id: "taxi_presential_examen", label: "Formation TAXI présentiel avec frais d'examen", prix: 1799, designation: "Formation initiale TAXI présentiel avec frais d'examen", duree: "96 heures" },
  { id: "ta_elearning", label: "Passerelle VTC → TAXI (TA) E-learning", prix: 999, designation: "Formation passerelle TAXI pour chauffeur VTC (TA) en E-learning", duree: "Plateforme 3 mois + pratique" },
  { id: "va_elearning", label: "Passerelle TAXI → VTC (VA) E-learning", prix: 499, designation: "Formation passerelle VTC pour chauffeur TAXI (VA) en E-learning", duree: "Plateforme 3 mois + pratique" },
  { id: "taxi_pratique", label: "Formation pratique TAXI", prix: 349, designation: "Formation pratique TAXI - Préparation pratique à l'examen taxi", duree: "6h en groupe ou 3h solo" },
  { id: "fc_vtc", label: "Formation continue VTC", prix: 200, designation: "Formation continue obligatoire VTC - Prévention des discriminations et des violences sexuelles et sexistes (14h)", duree: "14 heures" },
  { id: "fc_taxi", label: "Formation continue TAXI", prix: 299, designation: "Formation continue obligatoire TAXI (14h)", duree: "14 heures" },
];

/* ─── CGV TEXT ─── */
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

ARTICLE 3 - CONDITIONS FINANCIERES, REGLEMENTS ET MODALITES DE PAIEMENT
Tous les prix sont indiques en euros, toutes taxes comprises.
Conformement a l'article L6353-6 du Code du travail, lorsque le Client est une personne physique qui finance elle-meme sa formation :
- Aucune somme ne peut etre exigee avant l'expiration du delai de retractation de 10 jours.
- A l'expiration de ce delai, un premier versement ne pourra exceder 30% du prix total de la formation.
- Le solde sera echelonne au fur et a mesure du deroulement de la formation.
Moyens de paiement acceptes : especes, virement bancaire, cheque.

ARTICLE 4 - INSCRIPTION ET EFFECTIF
L'effectif de chaque formation est limite. Les inscriptions sont prises en compte dans leur ordre d'arrivee.

ARTICLE 5 - ANNULATION, ABSENCE OU INTERRUPTION
Tout module commence est du dans son integralite.

ARTICLE 6 - OBLIGATIONS ET FORCE MAJEURE
FTRANSPORT est tenue a une obligation de moyens et non de resultat vis-a-vis de ses Clients ou de ses Stagiaires.

ARTICLE 7 - PROPRIETE INTELLECTUELLE
L'ensemble des contenus et supports pedagogiques utilises par FTRANSPORT constituent des oeuvres protegees par le droit d'auteur.

ARTICLE 8 - PROTECTION DES DONNEES PERSONNELLES
Conformement au RGPD et a la loi n 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de rectification et d'effacement des donnees personnelles le concernant.

ARTICLE 9 - DROIT APPLICABLE
Les presentes conditions generales de vente sont regies par le droit francais. En cas de litige, les Tribunaux competents de Lyon seront saisis.

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

  // Formation selection
  const [selectedFormation, setSelectedFormation] = useState(formationType);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 15;

      const signatureDataUrl = hasSigned && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null;

      // === PAGE 1 : DEVIS ===
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
      doc.text("DEVIS", pageW - margin - 35, 18, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const numDevis = `DEV-${format(new Date(), "yyyyMM")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      doc.text(`N° ${numDevis}`, pageW - margin, 25, { align: "right" });
      doc.text(`Date : ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, pageW - margin, 30, { align: "right" });
      const validite = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      doc.text(`Valide jusqu'au : ${format(validite, "dd MMMM yyyy", { locale: fr })}`, pageW - margin, 35, { align: "right" });

      y = 50;
      doc.setTextColor(0, 0, 0);

      // Client info box
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, contentW, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("CLIENT", margin + 3, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${civilite} ${prenom} ${nom}`.trim(), margin + 3, y + 14);
      doc.setFontSize(9);
      if (adresse) doc.text(adresse, margin + 3, y + 19);
      const villeCP = [codePostal, ville].filter(Boolean).join(" ");
      if (villeCP) doc.text(villeCP, margin + 3, y + 24);
      if (email) doc.text(email, margin + contentW / 2, y + 19);
      if (telephone) doc.text(telephone, margin + contentW / 2, y + 24);

      y += 35;

      // Formation info
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, contentW, 14, "F");
      doc.setDrawColor(191, 219, 254);
      doc.rect(margin, y, contentW, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("FORMATION", margin + 3, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`${formation.label}  |  Durée : ${formation.duree}`, margin + 3, y + 11);
      y += 20;

      // Detail prestation
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

      doc.setDrawColor(210, 210, 210);
      doc.line(margin, y, tableRight, y);

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

      // Rappel
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const rappel = "Ce devis est valable pour une duree d'une semaine sous reserve de places disponibles. Inscription validee : devis + fiche inscription + conditions generales de ventes remplis et signes + documents justificatifs + reglement.";
      const rappelLines = doc.splitTextToSize(rappel, contentW);
      doc.text(rappelLines, margin, y);
      y += rappelLines.length * 3 + 6;

      // Signatures
      y = Math.max(y, 215);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`A Lyon, le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, margin, y);
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

      // Footer
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
              1. Sélectionnez votre formation
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-[#1e3a8a]">{formation.designation}</p>
                <p className="text-muted-foreground">Durée : {formation.duree}</p>
                <p className="font-bold text-[#1e3a8a] text-lg mt-1">{formation.prix} € TTC</p>
                <p className="text-xs text-muted-foreground">Non assujetti à la TVA</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 2 : Informations personnelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
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
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 XX XX XX XX" />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse postale" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Code postal</Label>
                <Input value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="69003" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={ville} onChange={e => setVille(e.target.value)} placeholder="Lyon" />
              </div>
            </div>
            <div>
              <Label>Date de naissance</Label>
              <Input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Étape 3 : Signature (optionnelle) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-[#1e3a8a]" />
              3. Signature (optionnelle)
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
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="w-full md:w-auto px-8 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white text-lg"
            onClick={generateDevisPDF}
            disabled={generating || !prenom || !nom || !selectedFormation}
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Génération en cours...</>
            ) : (
              <><Download className="w-5 h-5 mr-2" /> Télécharger mon devis PDF</>
            )}
          </Button>

          {generated && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Devis téléchargé avec succès !
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center max-w-md">
            Après avoir téléchargé votre devis, envoyez-le signé par email à{" "}
            <a href="mailto:contact@ftransport.fr" className="text-[#1e3a8a] font-medium">contact@ftransport.fr</a>{" "}
            ou apportez-le au 86 route de Genas, 69003 Lyon.
          </p>
          <p className="text-xs text-muted-foreground">
            📞 Pour toute question : <strong>04.28.29.60.91</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
