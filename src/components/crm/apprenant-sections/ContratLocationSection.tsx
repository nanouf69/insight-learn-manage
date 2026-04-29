import { useState } from "react";
import { Car, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface Props {
  apprenant: any;
}

const NIVEAUX_CARBURANT = ["Vide", "1/4", "1/2", "3/4", "Plein"];

export function ContratLocationSection({ apprenant }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Locataire (pré-rempli depuis l'apprenant)
  const [nomComplet, setNomComplet] = useState(`${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim());
  const [dateNaissance, setDateNaissance] = useState<string>(apprenant.date_naissance || "");
  const [adresse, setAdresse] = useState<string>(
    [apprenant.adresse, apprenant.code_postal, apprenant.ville].filter(Boolean).join(", ")
  );
  const [telephone, setTelephone] = useState<string>(apprenant.telephone || "");
  const [email, setEmail] = useState<string>(apprenant.email || "");
  const [numPermis, setNumPermis] = useState("");
  const [dateDelivrancePermis, setDateDelivrancePermis] = useState("");
  const [prefecturePermis, setPrefecturePermis] = useState("");

  // Véhicule
  const [marqueModele, setMarqueModele] = useState("Volkswagen Sharan");
  const [immatriculation, setImmatriculation] = useState("FL-511-KH");
  const [annee, setAnnee] = useState("2016");
  const [couleur, setCouleur] = useState("");
  const [kmDepart, setKmDepart] = useState("");
  const [carburantDepart, setCarburantDepart] = useState("Plein");

  // Période
  const [dateDebut, setDateDebut] = useState(today);
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [dateFin, setDateFin] = useState(today);
  const [heureFin, setHeureFin] = useState("18:00");

  // Prix
  const [prixLocation, setPrixLocation] = useState("");
  const [formationIncluse, setFormationIncluse] = useState(false);

  // Caution
  const [numCheque, setNumCheque] = useState("");
  const [banque, setBanque] = useState("");

  // Signature
  const [lieuSignature, setLieuSignature] = useState("Lyon");
  const [dateSignature, setDateSignature] = useState(today);

  // Observations
  const [observations, setObservations] = useState("");

  const [generating, setGenerating] = useState(false);

  const fmtDate = (v: string) => {
    if (!v) return "............................";
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return format(d, "dd/MM/yyyy");
  };

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      const checkPage = (needed = 10) => {
        if (y + needed > pageH - 20) {
          addFooter();
          doc.addPage();
          y = margin;
        }
      };

      const addFooter = () => {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(
          "FTRANSPORT SERVICES PRO | SASU | SIRET 823 461 561 000 18 | NDA 84 69 15114 69 | 86 route de Genas, 69003 Lyon",
          pageW / 2,
          pageH - 8,
          { align: "center" }
        );
        doc.setTextColor(0);
      };

      const h1 = (txt: string) => {
        checkPage(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(txt, margin, y);
        y += 7;
      };

      const h2 = (txt: string) => {
        checkPage(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(txt, margin, y);
        y += 5;
      };

      const para = (txt: string, opts: { bold?: boolean; size?: number } = {}) => {
        doc.setFont("helvetica", opts.bold ? "bold" : "normal");
        doc.setFontSize(opts.size ?? 9);
        const lines = doc.splitTextToSize(txt, pageW - 2 * margin);
        for (const line of lines) {
          checkPage(5);
          doc.text(line, margin, y);
          y += 4.5;
        }
      };

      const kv = (label: string, value: string) => {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(value || "............................", margin + 65, y);
        y += 5;
      };

      // ── Header ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("FTRANSPORT SERVICES PRO", pageW / 2, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "SASU | SIRET 823 461 561 000 18 | NDA 84 69 15114 69 | 86 route de Genas, 69003 Lyon | contact@ftransport.fr",
        pageW / 2,
        y,
        { align: "center" }
      );
      y += 8;

      doc.setDrawColor(30, 58, 138);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      h1("CONTRAT DE LOCATION DE VÉHICULE");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(
        "Réservé à l'usage exclusif des candidats aux examens Chauffeur Taxi (RS5637) et VTC (RS5635)",
        margin,
        y
      );
      y += 8;

      // ── Article 1 ──
      h1("ARTICLE 1 – PARTIES AU CONTRAT");
      h2("1.1 – Le Loueur");
      kv("Raison sociale :", "FTRANSPORT SERVICES PRO (SASU)");
      kv("SIRET :", "823 461 561 000 18");
      kv("Adresse :", "86 route de Genas, 69003 Lyon");
      kv("Représentant :", "M. Guenichi Naoufal, Gérant");
      y += 3;

      h2("1.2 – Le Locataire");
      kv("Nom et Prénom :", nomComplet);
      kv("Date de naissance :", fmtDate(dateNaissance));
      kv("Adresse :", adresse);
      kv("Téléphone :", telephone);
      kv("E-mail :", email);
      kv("N° de permis (cat. B) :", numPermis);
      kv("Date de délivrance :", fmtDate(dateDelivrancePermis));
      kv("Préfecture délivrance :", prefecturePermis);
      y += 2;
      para(
        "Le locataire certifie être titulaire d'un permis de conduire valide de catégorie B, en cours de validité à la date de prise en charge du véhicule, et autorise FTRANSPORT SERVICES PRO à en vérifier l'authenticité."
      );
      y += 4;

      // ── Article 2 ──
      h1("ARTICLE 2 – VÉHICULE MIS À DISPOSITION");
      kv("Marque / Modèle :", marqueModele);
      kv("Immatriculation :", immatriculation);
      kv("Année de mise en circulation :", annee);
      kv("Couleur :", couleur);
      kv("Kilométrage au départ :", kmDepart ? `${kmDepart} km` : "");
      kv("Niveau de carburant départ :", carburantDepart);
      y += 2;
      para(
        "Un état des lieux contradictoire (procès-verbal) sera établi lors de la remise et de la restitution du véhicule. Cet état des lieux est annexé au présent contrat et en fait partie intégrante."
      );
      y += 4;

      // ── Article 3 ──
      h1("ARTICLE 3 – DURÉE ET PÉRIODE DE LOCATION");
      kv("Début de location :", `${fmtDate(dateDebut)} à ${heureDebut}`);
      kv("Fin de location / restitution :", `${fmtDate(dateFin)} à ${heureFin}`);
      y += 2;
      para(
        "Le véhicule doit être restitué à l'adresse suivante : FTRANSPORT SERVICES PRO – 86 route de Genas, 69003 Lyon, dans les conditions prévues à l'article 6."
      );
      y += 4;

      // ── Article 4 ──
      h1("ARTICLE 4 – PRIX ET MODALITÉS DE PAIEMENT");
      h2("4.1 – Prix de la location");
      kv("Prix de location (TTC) :", prixLocation ? `${prixLocation} € TTC` : "");
      kv("Formation incluse :", formationIncluse ? "Oui" : "Non");
      kv("Forfait kilométrique inclus :", "100 km");
      kv("Kilomètre supplémentaire :", "0,30 € TTC / km");
      kv("Retard de restitution :", "20,00 € TTC / heure entamée");
      y += 2;
      h2("4.2 – Modalités de paiement");
      para(
        "Le paiement est dû au plus tard le jour de la prise en charge du véhicule, par chèque, espèces ou virement bancaire. Aucun départ ne sera autorisé sans paiement intégral préalable."
      );
      y += 4;

      // ── Article 5 ──
      h1("ARTICLE 5 – DÉPÔT DE CAUTION");
      para(
        "Le locataire remet au loueur, préalablement à la prise en charge du véhicule, un chèque de caution d'un montant de 500 € (cinq cents euros)."
      );
      para("Ce chèque :");
      para("• sera encaissé en cas d'accident responsable ou semi-responsable, de dégradation, de perte de document du véhicule, de contravention restant à la charge du locataire, ou de non-restitution du véhicule à l'échéance ;");
      para("• sera restitué ou détruit dans un délai de 5 jours ouvrés suivant la restitution du véhicule en bon état et sans réserve.");
      para("En cas de dommage supérieur au montant de la caution, le locataire reste redevable du solde.");
      y += 1;
      kv("N° du chèque de caution :", numCheque);
      kv("Banque :", banque);
      y += 4;

      // ── Article 6 ──
      h1("ARTICLE 6 – RESTITUTION DU VÉHICULE");
      para("Le véhicule doit être restitué :");
      para("• dans le même état que lors de la remise (propreté, carburant au même niveau) ;");
      para("• aux date et heure prévues à l'article 3 ;");
      para("• à l'adresse de FTRANSPORT SERVICES PRO.");
      para("Tout retard de restitution sera facturé 20 € TTC par heure entamée, sauf accord écrit préalable du loueur.");
      para("En cas de non-restitution dans les 24h suivant l'échéance, FTRANSPORT SERVICES PRO se réserve le droit de signaler le véhicule comme volé.");
      y += 4;

      // ── Article 7 ──
      h1("ARTICLE 7 – ASSURANCE ET RESPONSABILITÉ");
      para("7.1 Le véhicule est assuré par FTRANSPORT SERVICES PRO au titre de sa police d'assurance propre, couvrant la responsabilité civile obligatoire.");
      para("7.2 En cas de sinistre, le locataire est tenu de :");
      para("• prévenir immédiatement FTRANSPORT SERVICES PRO par téléphone ;");
      para("• compléter un constat amiable avec la partie adverse si applicable ;");
      para("• transmettre le constat rempli et signé dans les 24 heures.");
      para("7.3 Le locataire est responsable des dommages non couverts par l'assurance, notamment en cas de conduite sous l'emprise d'alcool ou de stupéfiants, d'infraction grave au Code de la route ou d'utilisation du véhicule en dehors de l'objet défini à l'article 8.");
      para("7.4 Les contraventions et amendes reliées à des infractions commises durant la période de location sont entièrement à la charge du locataire.");
      y += 4;

      // ── Article 8 ──
      h1("ARTICLE 8 – UTILISATION DU VÉHICULE");
      para("La location est strictement réservée à l'usage suivant : passage de l'examen pratique de chauffeur de taxi et/ou VTC. Toute autre utilisation est formellement interdite.");
      para("Il est interdit :");
      para("• de confier le véhicule à un tiers non mentionné au présent contrat ;");
      para("• de sortir du territoire métropolitain français sans accord écrit préalable ;");
      para("• d'utiliser le véhicule à des fins commerciales ou lucratives autres que celles prévues ci-dessus ;");
      para("• de fumer ou de transporter des animaux dans le véhicule ;");
      para("• de conduire sous l'emprise de l'alcool ou de toute substance psychoactive.");
      y += 4;

      // ── Article 9 ──
      h1("ARTICLE 9 – CARBURANT");
      para("Le véhicule est remis avec un niveau de carburant indiqué à l'état des lieux. Il doit être restitué avec le même niveau. En cas de restitution avec un niveau inférieur, le coût du carburant manquant, majoré de 10 € de frais de service, sera déduit de la caution ou facturé séparément.");
      y += 4;

      // ── Article 10 ──
      h1("ARTICLE 10 – PROTECTION DES DONNÉES PERSONNELLES (RGPD)");
      para("Les informations collectées dans le cadre du présent contrat font l'objet d'un traitement informatique par FTRANSPORT SERVICES PRO, responsable de traitement.");
      para("Ces données sont utilisées exclusivement dans le cadre de la gestion des contrats de location et de la relation pédagogique. Elles sont conservées pour une durée de 5 ans à compter de la fin du contrat.");
      para("Conformément au Règlement (UE) 2016/679, le locataire dispose d'un droit d'accès, de rectification, de suppression et d'opposition en écrivant à contact@ftransport.fr.");
      y += 4;

      // ── Article 11 ──
      h1("ARTICLE 11 – CLAUSE DE COMPÉTENCE JURIDICTIONNELLE");
      para("Tout litige relatif à l'interprétation ou à l'exécution du présent contrat fera l'objet d'une tentative de règlement amiable préalable.");
      para("En cas d'échec, et dans la mesure où le locataire agit en qualité de particulier (non-professionnel), la compétence est attribuée au Tribunal judiciaire de Lyon.");
      para("En cas de litige avec un locataire agissant en qualité de professionnel, compétence est attribuée au Tribunal de commerce de Lyon.");
      y += 6;

      // ── Signatures ──
      checkPage(60);
      h1("SIGNATURES");
      para(`Fait en deux exemplaires originaux, à ${lieuSignature}, le ${fmtDate(dateSignature)}.`);
      y += 8;

      const colW = (pageW - 2 * margin - 10) / 2;
      const startY = y;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Le LOUEUR", margin, y);
      doc.text("Le LOCATAIRE", margin + colW + 10, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("FTRANSPORT SERVICES PRO", margin, y);
      doc.text(`${nomComplet || "Nom et Prénom"}`, margin + colW + 10, y);
      y += 4;
      doc.text("Guenichi Naoufal, Gérant", margin, y);
      y += 4;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("(Signature précédée de la mention", margin, y);
      doc.text("(Signature précédée de la mention", margin + colW + 10, y);
      y += 3.5;
      doc.text('manuscrite « Bon pour accord »)', margin, y);
      doc.text('manuscrite « Bon pour accord »)', margin + colW + 10, y);
      y += 25;

      doc.setDrawColor(0);
      doc.line(margin, y, margin + colW - 5, y);
      doc.line(margin + colW + 10, y, pageW - margin, y);

      // ── Annexe : État des lieux ──
      addFooter();
      doc.addPage();
      y = margin;

      h1("ANNEXE – ÉTAT DES LIEUX DU VÉHICULE");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Véhicule : ${marqueModele || "................"} | Immatriculation : ${immatriculation || "................"} | Date : ${fmtDate(dateDebut)}`,
        margin,
        y
      );
      y += 8;

      const elements = [
        "Carrosserie avant",
        "Carrosserie arrière",
        "Flanc gauche",
        "Flanc droit",
        "Toit",
        "Vitres",
        "Jantes / Pneus",
        "Intérieur / sièges",
        "Tableau de bord",
        "Coffre",
        "Documents bord (CI + carte grise + assurance)",
        "Niveau carburant",
        "Kilométrage",
      ];

      const tableX = margin;
      const colElW = 80;
      const colStateW = (pageW - 2 * margin - colElW) / 2;
      const rowH = 9;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setFillColor(230, 230, 240);
      doc.rect(tableX, y, colElW, rowH, "F");
      doc.rect(tableX + colElW, y, colStateW, rowH, "F");
      doc.rect(tableX + colElW + colStateW, y, colStateW, rowH, "F");
      doc.text("Élément", tableX + 2, y + 6);
      doc.text("État au départ", tableX + colElW + 2, y + 6);
      doc.text("État au retour", tableX + colElW + colStateW + 2, y + 6);
      y += rowH;

      doc.setFont("helvetica", "normal");
      for (const el of elements) {
        checkPage(rowH + 2);
        doc.rect(tableX, y, colElW, rowH);
        doc.rect(tableX + colElW, y, colStateW, rowH);
        doc.rect(tableX + colElW + colStateW, y, colStateW, rowH);
        doc.text(el, tableX + 2, y + 6);
        y += rowH;
      }
      y += 6;

      h2("Observations au départ :");
      const obsLines = doc.splitTextToSize(observations || "............................................................................................................................", pageW - 2 * margin);
      for (const line of obsLines) {
        checkPage(5);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 4;
      h2("Observations au retour :");
      doc.text("...............................................................................................................................", margin, y);
      y += 5;
      doc.text("...............................................................................................................................", margin, y);
      y += 12;

      // Signatures annexe
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Le LOUEUR", margin, y);
      doc.text("Le LOCATAIRE", margin + colW + 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("FTRANSPORT SERVICES PRO", margin, y);
      doc.text(nomComplet || "Nom et Prénom", margin + colW + 10, y);
      y += 25;
      doc.line(margin, y, margin + colW - 5, y);
      doc.line(margin + colW + 10, y, pageW - margin, y);

      addFooter();

      const fileName = `Contrat_location_${(apprenant.prenom || "").trim()}_${(apprenant.nom || "").trim()}_${format(new Date(), "ddMMyyyy")}.pdf`;
      doc.save(fileName);
      toast.success("Contrat de location PDF généré !");
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur génération PDF : " + (err.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-orange-300/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5 text-orange-600" />
          Contrat de location de véhicule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Locataire */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Locataire</h3>
          <div className="space-y-2">
            <Label>Nom et Prénom</Label>
            <Input value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date de naissance</Label>
            <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Adresse complète</Label>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>N° de permis (catégorie B)</Label>
            <Input value={numPermis} onChange={(e) => setNumPermis(e.target.value)} placeholder="Ex : 123456789012" />
          </div>
          <div className="space-y-2">
            <Label>Date de délivrance du permis</Label>
            <Input type="date" value={dateDelivrancePermis} onChange={(e) => setDateDelivrancePermis(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Préfecture de délivrance</Label>
            <Input value={prefecturePermis} onChange={(e) => setPrefecturePermis(e.target.value)} placeholder="Ex : Lyon" />
          </div>
        </div>

        <Separator />

        {/* Véhicule */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Véhicule mis à disposition</h3>
          <div className="space-y-2">
            <Label>Marque / Modèle</Label>
            <Input value={marqueModele} onChange={(e) => setMarqueModele(e.target.value)} placeholder="Ex : Peugeot 308" />
          </div>
          <div className="space-y-2">
            <Label>Immatriculation</Label>
            <Input value={immatriculation} onChange={(e) => setImmatriculation(e.target.value)} placeholder="AA-123-BB" />
          </div>
          <div className="space-y-2">
            <Label>Année de mise en circulation</Label>
            <Input value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="2022" />
          </div>
          <div className="space-y-2">
            <Label>Couleur</Label>
            <Input value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="Noir" />
          </div>
          <div className="space-y-2">
            <Label>Kilométrage au départ (km)</Label>
            <Input value={kmDepart} onChange={(e) => setKmDepart(e.target.value)} placeholder="45000" />
          </div>
          <div className="space-y-2">
            <Label>Niveau de carburant au départ</Label>
            <Select value={carburantDepart} onValueChange={setCarburantDepart}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEAUX_CARBURANT.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Période */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Durée et période de location</h3>
          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Heure de début</Label>
            <Input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date de fin</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Heure de fin</Label>
            <Input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
          </div>
        </div>

        <Separator />

        {/* Prix */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prix et caution</h3>
          <div className="space-y-2">
            <Label>Prix de location TTC (€)</Label>
            <Input value={prixLocation} onChange={(e) => setPrixLocation(e.target.value)} placeholder="150" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="formationIncluse" checked={formationIncluse} onCheckedChange={(c) => setFormationIncluse(!!c)} />
            <Label htmlFor="formationIncluse" className="cursor-pointer">Formation incluse</Label>
          </div>
          <div className="space-y-2">
            <Label>N° du chèque de caution (500 €)</Label>
            <Input value={numCheque} onChange={(e) => setNumCheque(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Banque</Label>
            <Input value={banque} onChange={(e) => setBanque(e.target.value)} />
          </div>
        </div>

        <Separator />

        {/* Signature */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Signature</h3>
          <div className="space-y-2">
            <Label>Lieu</Label>
            <Input value={lieuSignature} onChange={(e) => setLieuSignature(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date de signature</Label>
            <Input type="date" value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observations état des lieux (départ)</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Rayures, impacts, accessoires..." rows={3} />
          </div>
        </div>

        <Button onClick={generatePDF} disabled={generating} className="w-full gap-2 bg-orange-600 hover:bg-orange-700">
          <FileDown className="w-4 h-4" />
          {generating ? "Génération..." : "Télécharger le contrat de location (PDF)"}
        </Button>
      </CardContent>
    </Card>
  );
}
