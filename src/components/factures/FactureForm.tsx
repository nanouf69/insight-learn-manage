import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAvatarUrl } from "@/lib/avatarUrl";
import { 
  FileText, 
  GraduationCap, 
  Package, 
  Users, 
  Building2, 
  User,
  Plus,
  Trash2,
  Download,
  Send,
  Printer,
  Search,
  Check,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShoppingCart,
  Save,
  BookCheck
} from "lucide-react";
import { toast } from "sonner";

// Informations de l'entreprise émettrice
const entrepriseEmettrice = {
  nom: "FTRANSPORT",
  slogan: "Spécialiste Formations Transport",
  adresse: "86 route de genas",
  codePostal: "69003",
  ville: "Lyon",
  siret: "82346156100016",
  telephone: "0428296091",
  email: "contact@ftransport.fr",
  declarationActivite: "84691511469",
  capital: "5000",
  nafApe: "8559B",
  rcs: "823461561",
  tvaIntra: "FR44823461561",
  prefectures: "69-18-001 et 69-16-15",
  banque: "Revolut Bank UAB",
  iban: "FR76 2823 3000 0185 7527 9099 426",
  bic: "REVOFRP2",
  adresseBanque: "10 avenue Kléber, 75116, Paris, France",
  bicIntermediaire: "CHASDEFX"
};

interface ApprenantItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  formationChoisie: string;
  typeApprenant: string;
  dateDebutFormation: string;
  dateFinFormation: string;
  montantTtc: number;
  organismeFinanceur?: string | null;
  societeNom?: string | null;
  societeSiret?: string | null;
  societeTvaIntra?: string | null;
  societeAdresse?: string | null;
  societeCodePostal?: string | null;
  societeVille?: string | null;
  factureContactNom?: string | null;
  factureContactEmail?: string | null;
  factureContactTelephone?: string | null;
}

// Liste des organisations
const organisations = [
  { id: 1, name: "Tech Solutions SARL", type: "client", contact: "Marc Dubois", email: "contact@techsolutions.fr", phone: "01 23 45 67 89", address: "15 Rue de l'Innovation, 75001 Paris", siret: "12345678901234", tvaIntra: "FR12345678901" },
  { id: 2, name: "Groupe Industriel ABC", type: "client", contact: "Claire Moreau", email: "rh@groupe-abc.com", phone: "01 98 76 54 32", address: "Zone Industrielle Nord, 69000 Lyon", siret: "98765432101234", tvaIntra: "FR98765432101" },
  { id: 3, name: "Caisse des Dépôts et Consignations", type: "client", contact: "Direction Formation", email: "formation@cdc.fr", phone: "01 58 50 00 00", address: "56, rue de Lille, 75356 PARIS 07 SP", siret: "180.020.026.00", tvaIntra: "FR77180020026" },
  { id: 4, name: "OPCO Mobilités", type: "opco", contact: "Service Prise en Charge", email: "contact@opcomobilites.fr", phone: "0 800 00 99 99", address: "14 rue Scandicci, 93500 Pantin", siret: "85129986300017", tvaIntra: "FR85129986300" },
  { id: 5, name: "Mairie de Lyon", type: "client", contact: "Jean-Pierre Martin", email: "formation@mairie-lyon.fr", phone: "04 72 10 30 30", address: "Place de la Comédie, 69001 Lyon", siret: "21690123800019", tvaIntra: "FR21690123800" },
];

// Sessions de formation — chargées depuis Supabase
interface SessionItem {
  id: string;
  title: string;
  formation: string;
  dateDebut: string;
  dateFin: string;
  horaire: string;
  lieu: string;
  participants: number;
  maxParticipants: number;
  prix: number;
  status: string;
}

// Liste des produits/services (basée sur l'image fournie)
const produits = [
  { id: 1, nom: "Formation continue VTC", prix: 199 },
  { id: 2, nom: "Formation et location de Véhicule examen TAXI/VTC", prix: 299 },
  { id: 3, nom: "Formation pratique TAXI/VTC", prix: 149 },
  { id: 4, nom: "Formation TAXI", prix: 1599 },
  { id: 5, nom: "Formation VTC", prix: 1499 },
  { id: 6, nom: "Frais d'examen de la chambre des métiers TAXI/VTC", prix: 206 },
  { id: 7, nom: "Frais d'examen de la chambre des métiers TAXI/VTC mobilité", prix: 145 },
  { id: 8, nom: "Frais d'examen de la chambre des métiers TAXI/VTC pratique", prix: 101 },
];

interface LigneFacture {
  id: string;
  type: "session" | "produit";
  stagiaire: string;
  designation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  quantite: number;
  prixUnitaire: number;
  tvaType: "EXO" | "5.5" | "10" | "20";
  remise: number;
}

interface FactureData {
  numero: string;
  numeroInterne: string;
  date: string;
  dateEcheance: string;
  duplicata: boolean;
  typeFinanceur: "particulier" | "professionnel";
  selectedApprenantId: string | null;
  selectedOrganisationId: number | null;
  refDossier: string;
  refConvention: string;
  lignes: LigneFacture[];
  notes: string;
  acquittee: boolean;
  datePaiement: string;
  moyenPaiement: string;
}

// Compteur séquentiel persistant - démarre à 202604207
const FACTURE_COUNTER_KEY = "facture_numero_interne_counter";
const FACTURE_COUNTER_START = 202604207;

const generateNumeroFacture = () => {
  try {
    const stored = localStorage.getItem(FACTURE_COUNTER_KEY);
    const current = stored ? parseInt(stored, 10) : FACTURE_COUNTER_START;
    const next = isNaN(current) || current < FACTURE_COUNTER_START ? FACTURE_COUNTER_START : current;
    localStorage.setItem(FACTURE_COUNTER_KEY, String(next + 1));
    return String(next);
  } catch {
    return String(FACTURE_COUNTER_START);
  }
};

const defaultFactureData: FactureData = {
  numero: "7",
  numeroInterne: generateNumeroFacture(),
  date: new Date().toISOString().split('T')[0],
  dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  duplicata: false,
  typeFinanceur: "professionnel",
  selectedApprenantId: null,
  selectedOrganisationId: null,
  refDossier: "",
  refConvention: "",
  lignes: [],
  notes: "",
  acquittee: false,
  datePaiement: "",
  moyenPaiement: "virement",
};

export function FactureForm() {
  const [data, setData] = useState<FactureData>(defaultFactureData);
  const [searchApprenant, setSearchApprenant] = useState("");
  const [searchOrganisation, setSearchOrganisation] = useState("");
  const [searchSession, setSearchSession] = useState("");
  const [activeMainTab, setActiveMainTab] = useState<"financeur" | "prestations">("financeur");
  const [searchProduit, setSearchProduit] = useState("");
  const [isAddLineDialogOpen, setIsAddLineDialogOpen] = useState(false);
  const [addLineType, setAddLineType] = useState<"session" | "produit">("session");
  const [apprenants, setApprenants] = useState<ApprenantItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);

  const DRAFT_KEY = 'facture_draft_v1';

  // Recharger le brouillon au montage (s'il existe)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setData((prev) => ({ ...prev, ...draft }));
        toast.info("Brouillon précédent restauré");
      }
    } catch (e) {
      console.warn("Impossible de charger le brouillon", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      const allRows: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, nom, date_debut, date_fin, heure_debut, heure_fin, lieu, places_disponibles, statut, type_session, formation_id, formations:formation_id(nom, prix_ht)')
          .order('date_debut', { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error || !data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < batchSize) break;
        offset += batchSize;
      }
      const mapped: SessionItem[] = allRows.map((s: any) => ({
        id: s.id,
        title: s.nom || 'Session sans nom',
        formation: s.formations?.nom || s.type_session || '',
        dateDebut: s.date_debut || '',
        dateFin: s.date_fin || s.date_debut || '',
        horaire: s.heure_debut && s.heure_fin ? `${s.heure_debut} - ${s.heure_fin}` : '',
        lieu: s.lieu || '',
        participants: 0,
        maxParticipants: s.places_disponibles ?? 0,
        prix: Number(s.formations?.prix_ht ?? 0),
        status: s.statut === 'confirmee' ? 'confirmed' : (s.statut === 'planifiee' ? 'pending' : (s.statut || 'pending')),
      }));
      setSessions(mapped);
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchApprenants = async () => {
      const allData: ApprenantItem[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, email, telephone, adresse, ville, code_postal, civilite, formation_choisie, type_apprenant, date_debut_formation, date_fin_formation, montant_ttc, organisme_financeur, societe_nom, societe_siret, societe_tva_intra, societe_adresse, societe_code_postal, societe_ville, facture_contact_nom, facture_contact_email, facture_contact_telephone')
          .range(offset, offset + batchSize - 1);
        if (error) break;
        if (data && data.length > 0) {
          const mapped: ApprenantItem[] = data.map((a: any) => ({
            id: a.id,
            name: `${a.prenom} ${a.nom}`,
            email: a.email || '',
            phone: a.telephone || '',
            address: [a.adresse, a.code_postal, a.ville].filter(Boolean).join(', '),
            avatar: getAvatarUrl(a.prenom, a.nom, a.civilite),
            formationChoisie: a.formation_choisie || '',
            typeApprenant: a.type_apprenant || '',
            dateDebutFormation: a.date_debut_formation || a.date_debut_cours_en_ligne || '',
            dateFinFormation: a.date_fin_formation || a.date_fin_cours_en_ligne || '',
            montantTtc: Number(a.montant_ttc ?? 0),
            organismeFinanceur: a.organisme_financeur ?? null,
            societeNom: a.societe_nom ?? null,
            societeSiret: a.societe_siret ?? null,
            societeTvaIntra: a.societe_tva_intra ?? null,
            societeAdresse: a.societe_adresse ?? null,
            societeCodePostal: a.societe_code_postal ?? null,
            societeVille: a.societe_ville ?? null,
            factureContactNom: a.facture_contact_nom ?? null,
            factureContactEmail: a.facture_contact_email ?? null,
            factureContactTelephone: a.facture_contact_telephone ?? null,
          }));
          allData.push(...mapped);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      setApprenants(allData);
    };
    fetchApprenants();
  }, []);

  const updateField = <K extends keyof FactureData>(field: K, value: FactureData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const selectedApprenant = apprenants.find(a => a.id === data.selectedApprenantId);
  const selectedOrganisation = organisations.find(o => o.id === data.selectedOrganisationId);

  // Auto-remplit la facture (réf dossier + ligne formation) à la sélection d'un apprenant
  useEffect(() => {
    if (!selectedApprenant) return;
    let injected = false;
    setData(prev => {
      const dejaInjecte = prev.lignes.some(
        l => l.type === "session" && l.stagiaire === selectedApprenant.name
      );
      const designation = selectedApprenant.formationChoisie || selectedApprenant.typeApprenant || "Formation";
      if (dejaInjecte) {
        return { ...prev, refDossier: prev.refDossier || selectedApprenant.name };
      }
      injected = true;
      return {
        ...prev,
        refDossier: prev.refDossier || selectedApprenant.name,
        lignes: [
          ...prev.lignes,
          {
            id: crypto.randomUUID(),
            type: "session" as const,
            stagiaire: selectedApprenant.name,
            designation,
            dateDebut: selectedApprenant.dateDebutFormation || "",
            dateFin: selectedApprenant.dateFinFormation || "",
            lieu: "86 route de genas 69003 Lyon",
            quantite: 1,
            prixUnitaire: selectedApprenant.montantTtc || 0,
            tvaType: "EXO" as const,
            remise: 0,
          },
        ],
      };
    });
    if (injected) {
      toast.success(`Prestation pré-remplie pour ${selectedApprenant.name}`);
      setActiveMainTab("prestations");
    }
  }, [selectedApprenant?.id]);

  // Auto-remplit la réf dossier à la sélection d'une organisation (sans nom de stagiaire)
  useEffect(() => {
    if (!selectedOrganisation) return;
    setData(prev => ({
      ...prev,
      refDossier: prev.refDossier || selectedOrganisation.name,
    }));
  }, [selectedOrganisation?.id]);

  const filteredApprenants = apprenants.filter(a => 
    a.name.toLowerCase().includes(searchApprenant.toLowerCase()) ||
    a.email.toLowerCase().includes(searchApprenant.toLowerCase())
  );

  const filteredOrganisations = organisations.filter(o => 
    o.name.toLowerCase().includes(searchOrganisation.toLowerCase()) ||
    o.contact.toLowerCase().includes(searchOrganisation.toLowerCase())
  );

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchSession.toLowerCase()) ||
    s.formation.toLowerCase().includes(searchSession.toLowerCase())
  );

  const filteredProduits = produits.filter(p => 
    p.nom.toLowerCase().includes(searchProduit.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "client":
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Client</Badge>;
      case "opco":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OPCO</Badge>;
      case "prospect":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Prospect</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ajouterLigneSession = (session: SessionItem) => {
    const nouvelleLigne: LigneFacture = {
      id: crypto.randomUUID(),
      type: "session",
      stagiaire: selectedApprenant?.name || "",
      designation: session.title,
      dateDebut: session.dateDebut,
      dateFin: session.dateFin,
      lieu: session.lieu,
      quantite: 1,
      prixUnitaire: session.prix,
      tvaType: "EXO",
      remise: 0,
    };
    setData(prev => ({ ...prev, lignes: [...prev.lignes, nouvelleLigne] }));
    setIsAddLineDialogOpen(false);
    toast.success(`Session "${session.title}" ajoutée`);
  };

  const ajouterLigneProduit = (produit: typeof produits[0]) => {
    const nouvelleLigne: LigneFacture = {
      id: crypto.randomUUID(),
      type: "produit",
      stagiaire: selectedApprenant?.name || "",
      designation: produit.nom,
      dateDebut: "",
      dateFin: "",
      lieu: "",
      quantite: 1,
      prixUnitaire: produit.prix,
      tvaType: "EXO",
      remise: 0,
    };
    setData(prev => ({ ...prev, lignes: [...prev.lignes, nouvelleLigne] }));
    setIsAddLineDialogOpen(false);
    toast.success(`Produit "${produit.nom}" ajouté`);
  };

  const supprimerLigne = (id: string) => {
    setData(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }));
  };

  const updateLigne = (id: string, field: keyof LigneFacture, value: string | number) => {
    setData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const getTvaRate = (tvaType: string) => {
    switch (tvaType) {
      case "5.5": return 5.5;
      case "10": return 10;
      case "20": return 20;
      default: return 0;
    }
  };

  const calculerLigneHT = (ligne: LigneFacture) => {
    const total = ligne.quantite * ligne.prixUnitaire;
    return total - (total * ligne.remise / 100);
  };

  const calculerTotalHT = () => {
    return data.lignes.reduce((sum, l) => sum + calculerLigneHT(l), 0);
  };

  const calculerTotalTVA = () => {
    return data.lignes.reduce((sum, l) => {
      const ht = calculerLigneHT(l);
      return sum + (ht * getTvaRate(l.tvaType) / 100);
    }, 0);
  };

  const calculerTotalTTC = () => {
    return calculerTotalHT() + calculerTotalTVA();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      toast.success("Brouillon enregistré");
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'enregistrer le brouillon");
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success("Impression lancée");
  };

  const handleExport = () => {
    const factureHTML = generateFactureHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre. Vérifiez le blocage des popups.");
      return;
    }
    printWindow.document.write(factureHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
    toast.success("Téléchargement PDF lancé (choisissez « Enregistrer en PDF »)");
  };

  const getClientInfo = () => {
    if (data.typeFinanceur === "particulier" && selectedApprenant) {
      // Si l'apprenant est financé par sa société → facture au nom de la société
      if (selectedApprenant.organismeFinanceur === "societe" && selectedApprenant.societeNom) {
        const adresseSociete = [
          selectedApprenant.societeAdresse,
          [selectedApprenant.societeCodePostal, selectedApprenant.societeVille].filter(Boolean).join(' '),
        ].filter(Boolean).join(', ');
        return {
          nom: selectedApprenant.societeNom,
          adresse: adresseSociete || selectedApprenant.address,
          email: selectedApprenant.factureContactEmail || selectedApprenant.email,
          telephone: selectedApprenant.factureContactTelephone || selectedApprenant.phone,
          siret: selectedApprenant.societeSiret || "",
          tvaIntra: selectedApprenant.societeTvaIntra || "",
          contactNom: selectedApprenant.factureContactNom || "",
          stagiaire: selectedApprenant.name,
        };
      }
      return { nom: selectedApprenant.name, adresse: selectedApprenant.address, email: selectedApprenant.email, telephone: selectedApprenant.phone, siret: "", tvaIntra: "", contactNom: "", stagiaire: selectedApprenant.name };
    } else if (data.typeFinanceur === "professionnel" && selectedOrganisation) {
      return { nom: selectedOrganisation.name, adresse: selectedOrganisation.address, email: selectedOrganisation.email, telephone: selectedOrganisation.phone, siret: selectedOrganisation.siret, tvaIntra: selectedOrganisation.tvaIntra, contactNom: "", stagiaire: "" };
    }
    return null;
  };

  const generateFactureHTML = () => {
    const client = getClientInfo();
    const lignesHTML = data.lignes.map(l => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${l.stagiaire}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${l.designation}${l.dateDebut ? `<br><small>Du ${formatDate(l.dateDebut)} au ${formatDate(l.dateFin)}</small>` : ''}${l.lieu ? `<br><small>Lieu : ${l.lieu}</small>` : ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.tvaType}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${l.prixUnitaire.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.quantite.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.remise || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${calculerLigneHT(l).toFixed(2)}</td>
      </tr>
    `).join('');

    const clientHTML = client ? `${client.nom}<br>${client.adresse || ''}${client.contactNom ? `<br>À l'attention de : ${client.contactNom}` : ''}${client.email ? `<br>Email : ${client.email}` : ''}${client.telephone ? `<br>Tél : ${client.telephone}` : ''}${client.siret ? `<br>SIRET : ${client.siret}` : ''}${client.tvaIntra ? `<br>TVA Intracommunautaire : ${client.tvaIntra}` : ''}${client.stagiaire && client.stagiaire !== client.nom ? `<br><em>Stagiaire : ${client.stagiaire}</em>` : ''}` : 'Aucun client sélectionné';

    const moyenLabels: Record<string, string> = {
      virement: "Virement bancaire", virement_especes: "Virement + Espèces", cheque: "Chèque", especes: "Espèces",
      cb: "Carte bancaire", cpf: "CPF", opco: "OPCO",
      france_travail: "France Travail", autre: "Autre",
    };
    const acquitteHTML = data.acquittee
      ? `<div style="margin-top:20px;padding:15px;background:#d1fae5;border:2px solid #059669;border-radius:8px;text-align:center;"><div style="font-size:18px;font-weight:bold;color:#065f46;">✓ FACTURE ACQUITTÉE</div><div style="margin-top:6px;font-size:12px;color:#065f46;">Payée le ${data.datePaiement ? formatDate(data.datePaiement) : '—'} par ${moyenLabels[data.moyenPaiement] || data.moyenPaiement}</div></div>`
      : '';
    const acquitteStamp = data.acquittee
      ? `<div style="display:inline-block;margin-top:8px;padding:4px 12px;background:#059669;color:#fff;font-weight:bold;border-radius:4px;">✓ ACQUITTÉE</div>`
      : '';

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${data.numeroInterne}</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}.header{display:flex;justify-content:space-between;margin-bottom:30px}.logo{font-size:24px;font-weight:bold;color:#2563eb}.logo-sub{font-size:14px;color:#666}.title{text-align:right}.title h1{font-size:18px;margin:0}.info-row{display:flex;justify-content:space-between;margin-bottom:20px}.info-box{width:48%}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f3f4f6;padding:10px;border:1px solid #ddd;text-align:left}.totals{text-align:right;margin-top:20px}.bank-info{margin-top:30px;padding:15px;background:#f9fafb;border:1px solid #e5e7eb}.conditions{margin-top:20px;padding:15px;background:#fefce8;border:1px solid #fde68a;font-size:11px;line-height:1.5}.conditions h4{margin:0 0 8px 0;font-size:12px;color:#92400e}.footer{margin-top:30px;font-size:10px;color:#666;text-align:center;border-top:1px solid #ddd;padding-top:15px}</style></head><body><div class="header"><div><div class="logo">🚌 ${entrepriseEmettrice.nom}</div><div class="logo-sub">${entrepriseEmettrice.slogan}</div></div><div class="title"><h1>FACTURE ${data.duplicata ? 'DUPLICATA ' : ''}N°${data.numero}</h1><p>Numéro : ${data.numeroInterne}</p><p>Date de facturation : ${formatDate(data.date)}</p><p>Date d'échéance : ${formatDate(data.dateEcheance)}</p>${acquitteStamp}</div></div><div class="info-row"><div class="info-box"><strong>Émetteur :</strong><br>${entrepriseEmettrice.nom}<br>${entrepriseEmettrice.adresse}<br>${entrepriseEmettrice.codePostal} ${entrepriseEmettrice.ville}<br>SIRET : ${entrepriseEmettrice.siret}<br>Tél.: ${entrepriseEmettrice.telephone}<br>Email: ${entrepriseEmettrice.email}<br>Déclaration d'activité n° ${entrepriseEmettrice.declarationActivite}${data.refDossier ? `<br>Réf dossier : ${data.refDossier}` : ''}</div><div class="info-box"><strong>Adressée à :</strong><br>${clientHTML}${data.refConvention ? `<br>Réf à rappeler : ${data.refConvention}` : ''}</div></div><h3>Désignation</h3><table><thead><tr><th>Stagiaire</th><th>Désignation</th><th>TVA</th><th>P.U. HT</th><th>Qté</th><th>Rem</th><th>Total HT</th></tr></thead><tbody>${lignesHTML}</tbody></table><div class="totals"><p><strong>Total HT :</strong> ${calculerTotalHT().toFixed(2)} €</p><p><strong>Total TVA :</strong> ${calculerTotalTVA().toFixed(2)} €</p><p style="font-size:16px;"><strong>Total TTC :</strong> ${calculerTotalTTC().toFixed(2)} €</p></div>${acquitteHTML}<div class="bank-info"><h4>Règlement par virement :</h4><p>Banque : ${entrepriseEmettrice.banque} | IBAN : ${entrepriseEmettrice.iban} | BIC : ${entrepriseEmettrice.bic}</p></div><div class="conditions"><h4>Conditions de règlement</h4><p>Paiement par virement bancaire ou en espèces à réception de facture. Date d'échéance : ${formatDate(data.dateEcheance)}. Aucun escompte accordé pour paiement anticipé. En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal en vigueur seront appliquées, ainsi qu'une indemnité forfaitaire de recouvrement de 40,00 €, conformément aux articles L441-10 et D441-5 du Code de commerce.</p></div><div class="footer"><p>Centre de formation agrée par la préfecture n°${entrepriseEmettrice.prefectures}</p><p>TVA non applicable - article 293 B du CGI</p><p>SASU FTRANSPORT - Capital de ${entrepriseEmettrice.capital} € - SIRET : ${entrepriseEmettrice.siret}</p></div></body></html>`;
  };

  const handleSaveToAccounting = async () => {
    const client = getClientInfo();
    if (!client) {
      toast.error("Veuillez sélectionner un client (apprenant ou organisation)");
      return;
    }
    if (data.lignes.length === 0) {
      toast.error("Veuillez ajouter au moins une prestation");
      return;
    }
    try {
      const montantHT = calculerTotalHT();
      const montantTVA = calculerTotalTVA();
      const montantTTC = calculerTotalTTC();
      const tvaTaux = montantHT > 0 ? Math.round((montantTVA / montantHT) * 100) : 0;

      const sessionLine: any = data.lignes.find((l: any) => l.type === "session" && l.sessionId);
      const payload: any = {
        numero: data.numeroInterne || data.numero,
        date_emission: data.date,
        date_echeance: data.dateEcheance || null,
        type_financement: data.typeFinanceur === "particulier" ? "particulier" : "professionnel",
        client_nom: client.nom,
        client_adresse: client.adresse || null,
        client_siret: client.siret || null,
        montant_ht: montantHT,
        tva_taux: tvaTaux,
        montant_tva: montantTVA,
        montant_ttc: montantTTC,
        statut: data.acquittee ? "payee" : "en_attente",
        date_paiement: data.acquittee && data.datePaiement ? data.datePaiement : null,
        apprenant_id: data.typeFinanceur === "particulier" ? data.selectedApprenantId : null,
        session_id: sessionLine?.sessionId || null,
      };

      const { error } = await supabase.from("factures").insert(payload);
      if (error) throw error;

      toast.success("Facture enregistrée en comptabilité");
      // Nettoyer le brouillon une fois la facture validée
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch (e: any) {
      console.error(e);
      toast.error(`Erreur lors de l'enregistrement : ${e.message ?? e}`);
    }
  };

  const handleEnvoyer = () => {
    const client = getClientInfo();
    if (!client?.email) {
      toast.error("Veuillez sélectionner un client avec une adresse email");
      return;
    }
    const sujet = encodeURIComponent(`Facture N°${data.numeroInterne} - ${entrepriseEmettrice.nom}`);
    const corps = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint la facture N°${data.numeroInterne}.\n\nMontant TTC : ${calculerTotalTTC().toFixed(2)} €\n\nCordialement,\n${entrepriseEmettrice.nom}`);
    window.location.href = `mailto:${client.email}?subject=${sujet}&body=${corps}`;
    toast.success("Ouverture du client email...");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Création de Facture</h2>
          <p className="text-muted-foreground">Format conforme à votre modèle de facturation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} variant="outline"><Save className="w-4 h-4 mr-2" />Brouillon</Button>
          <Button onClick={handleSaveToAccounting} variant="secondary"><BookCheck className="w-4 h-4 mr-2" />Enregistrer en comptabilité</Button>
          <Button onClick={handleEnvoyer} variant="outline"><Send className="w-4 h-4 mr-2" />Envoyer</Button>
          <Button onClick={handlePrint} variant="outline"><Printer className="w-4 h-4 mr-2" />Imprimer</Button>
          <Button onClick={handleExport}><Download className="w-4 h-4 mr-2" />Télécharger PDF</Button>
        </div>
      </div>

      {/* (Aperçu de l'en-tête déplacé plus bas) */}

      {/* Type de financeur (déplacé en haut) */}
      <Card>
        <CardHeader><CardTitle>Type de financeur</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={data.typeFinanceur} onValueChange={(v) => { updateField('typeFinanceur', v as "particulier" | "professionnel"); updateField('selectedApprenantId', null); updateField('selectedOrganisationId', null); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${data.typeFinanceur === "particulier" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => { updateField('typeFinanceur', "particulier"); updateField('selectedApprenantId', null); updateField('selectedOrganisationId', null); }}>
              <RadioGroupItem value="particulier" id="particulier-top" />
              <Label htmlFor="particulier-top" className="flex items-center gap-3 cursor-pointer flex-1">
                <User className="w-5 h-5 text-muted-foreground" />
                <div><div className="font-medium">Particulier</div><div className="text-sm text-muted-foreground">Personne physique finançant à titre personnel</div></div>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${data.typeFinanceur === "professionnel" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => { updateField('typeFinanceur', "professionnel"); updateField('selectedApprenantId', null); updateField('selectedOrganisationId', null); }}>
              <RadioGroupItem value="professionnel" id="professionnel-top" />
              <Label htmlFor="professionnel-top" className="flex items-center gap-3 cursor-pointer flex-1">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div><div className="font-medium">Professionnel</div><div className="text-sm text-muted-foreground">Entreprise, OPCO, organisme financeur</div></div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as "financeur" | "prestations")} className="space-y-4">
        <TabsList className="grid grid-cols-2 gap-2 h-auto">
          <TabsTrigger value="financeur" className="flex items-center gap-2"><Users className="w-4 h-4" />Financeur (Client)</TabsTrigger>
          <TabsTrigger value="prestations" className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Prestations / Formations</TabsTrigger>
        </TabsList>

        {/* Onglet Financeur */}
        <TabsContent value="financeur" className="space-y-4">
          {data.typeFinanceur === "particulier" ? (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Sélectionner un apprenant</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un apprenant..." className="pl-10" value={searchApprenant} onChange={(e) => setSearchApprenant(e.target.value)} />
                </div>
                <ScrollArea className="h-[300px] rounded-md border">
                  <div className="p-2 space-y-2">
                    {filteredApprenants.map((apprenant) => (
                      <div key={apprenant.id} onClick={() => updateField('selectedApprenantId', apprenant.id)} className={`p-4 rounded-lg border cursor-pointer transition-all ${data.selectedApprenantId === apprenant.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}>
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12"><AvatarImage src={apprenant.avatar} /><AvatarFallback>{apprenant.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between"><h4 className="font-semibold">{apprenant.name}</h4>{data.selectedApprenantId === apprenant.id && <Check className="w-5 h-5 text-primary" />}</div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{apprenant.email}</div>
                              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{apprenant.phone}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedApprenant && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Client sélectionné :</h4>
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarImage src={selectedApprenant.avatar} /><AvatarFallback>{selectedApprenant.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                      <div><p className="font-semibold">{selectedApprenant.name}</p><p className="text-sm text-muted-foreground">{selectedApprenant.email}</p></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Sélectionner une organisation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher une organisation..." className="pl-10" value={searchOrganisation} onChange={(e) => setSearchOrganisation(e.target.value)} />
                </div>
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-2 space-y-2">
                    {filteredOrganisations.map((org) => (
                      <div key={org.id} onClick={() => updateField('selectedOrganisationId', org.id)} className={`p-4 rounded-lg border cursor-pointer transition-all ${data.selectedOrganisationId === org.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12 bg-primary/10"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{org.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2"><h4 className="font-semibold">{org.name}</h4>{getTypeBadge(org.type)}</div>
                              {data.selectedOrganisationId === org.id && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Contact : {org.contact}</p>
                            <div className="text-sm text-muted-foreground space-y-1 mt-2">
                              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{org.email}</div>
                              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{org.phone}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedOrganisation && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Organisation sélectionnée :</h4>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-primary/10"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{selectedOrganisation.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
                      <div>
                        <div className="flex items-center gap-2"><p className="font-semibold">{selectedOrganisation.name}</p>{getTypeBadge(selectedOrganisation.type)}</div>
                        <p className="text-sm text-muted-foreground">{selectedOrganisation.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Prestations */}
        <TabsContent value="prestations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Package className="w-5 h-5" />Désignation</span>
                <Dialog open={isAddLineDialogOpen} onOpenChange={setIsAddLineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Ajouter une ligne</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Ajouter une prestation</DialogTitle>
                    </DialogHeader>
                    <Tabs value={addLineType} onValueChange={(v) => setAddLineType(v as "session" | "produit")} className="mt-4">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="session" className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Sessions de formation
                        </TabsTrigger>
                        <TabsTrigger value="produit" className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          Produits / Services
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="session" className="mt-4 space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Rechercher une session..." className="pl-10" value={searchSession} onChange={(e) => setSearchSession(e.target.value)} />
                        </div>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-3">
                            {filteredSessions.map((session) => (
                              <div key={session.id} onClick={() => ajouterLigneSession(session)} className="p-4 rounded-lg border cursor-pointer transition-all hover:border-primary hover:bg-primary/5">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3">
                                      <h4 className="font-semibold">{session.title}</h4>
                                      {getStatusBadge(session.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{session.formation}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /><span>{formatDate(session.dateDebut)} - {formatDate(session.dateFin)}</span></div>
                                      <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{session.horaire}</span></div>
                                      <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /><span>{session.lieu}</span></div>
                                      <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /><span>{session.participants}/{session.maxParticipants}</span></div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary">{session.prix.toFixed(2)} €</p>
                                    <p className="text-xs text-muted-foreground">HT</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {filteredSessions.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Aucune session trouvée</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="produit" className="mt-4 space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Rechercher un produit..." className="pl-10" value={searchProduit} onChange={(e) => setSearchProduit(e.target.value)} />
                        </div>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {filteredProduits.map((produit) => (
                              <div key={produit.id} onClick={() => ajouterLigneProduit(produit)} className="p-4 rounded-lg border cursor-pointer transition-all hover:border-primary hover:bg-primary/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5 text-primary" />
                                  </div>
                                  <span className="font-medium">{produit.nom}</span>
                                </div>
                                <span className="text-lg font-bold text-primary">{produit.prix.toFixed(2)} €</span>
                              </div>
                            ))}
                            {filteredProduits.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Aucun produit trouvé</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.lignes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune ligne ajoutée</p>
                  <p className="text-sm">Cliquez sur "Ajouter une ligne" pour sélectionner une session ou un produit</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-2">Stagiaire</div>
                    <div className="col-span-3">Désignation</div>
                    <div className="col-span-1">TVA</div>
                    <div className="col-span-1">P.U. HT</div>
                    <div className="col-span-1">Qté</div>
                    <div className="col-span-1">Rem %</div>
                    <div className="col-span-2">Total HT</div>
                    <div className="col-span-1"></div>
                  </div>

                  {data.lignes.map((ligne) => (
                    <div key={ligne.id} className="p-4 border rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-2 space-y-1">
                          <Label className="md:hidden">Stagiaire</Label>
                          <Input value={ligne.stagiaire} onChange={(e) => updateLigne(ligne.id, 'stagiaire', e.target.value)} placeholder="Nom Prénom" />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label className="md:hidden">Désignation</Label>
                          <div className="flex items-center gap-2">
                            {ligne.type === "session" ? <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" /> : <ShoppingCart className="w-4 h-4 text-primary flex-shrink-0" />}
                            <Input value={ligne.designation} onChange={(e) => updateLigne(ligne.id, 'designation', e.target.value)} />
                          </div>
                        </div>
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">TVA</Label>
                          <Select value={ligne.tvaType} onValueChange={(v) => updateLigne(ligne.id, 'tvaType', v as LigneFacture['tvaType'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EXO">EXO</SelectItem>
                              <SelectItem value="5.5">5,5%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">P.U. HT</Label>
                          <Input type="number" min="0" step="0.01" value={ligne.prixUnitaire} onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">Qté</Label>
                          <Input type="number" min="0.01" step="0.01" value={ligne.quantite} onChange={(e) => updateLigne(ligne.id, 'quantite', parseFloat(e.target.value) || 1)} />
                        </div>
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">Remise %</Label>
                          <Input type="number" min="0" max="100" value={ligne.remise || ""} onChange={(e) => updateLigne(ligne.id, 'remise', parseFloat(e.target.value) || 0)} placeholder="" />
                        </div>
                        <div className="md:col-span-2">
                          <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium justify-end">{calculerLigneHT(ligne).toFixed(2)} €</div>
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => supprimerLigne(ligne.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      
                      {ligne.type === "session" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                          <div className="space-y-2">
                            <Label>Date début</Label>
                            <Input type="date" value={ligne.dateDebut} onChange={(e) => updateLigne(ligne.id, 'dateDebut', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Date fin</Label>
                            <Input type="date" value={ligne.dateFin} onChange={(e) => updateLigne(ligne.id, 'dateFin', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Lieu</Label>
                            <Input value={ligne.lieu} onChange={(e) => updateLigne(ligne.id, 'lieu', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {data.lignes.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="flex justify-between text-sm"><span>Total HT</span><span className="font-medium">{calculerTotalHT().toFixed(2)} €</span></div>
                      <div className="flex justify-between text-sm"><span>Total TVA</span><span className="font-medium">{calculerTotalTVA().toFixed(2)} €</span></div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold"><span>Total TTC</span><span className="text-primary">{calculerTotalTTC().toFixed(2)} €</span></div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Coordonnées bancaires */}
          <Card>
            <CardHeader><CardTitle className="text-base">Règlement par virement, coordonnées bancaires</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Titulaire :</span><p className="font-medium">SERVICES PRO</p></div>
                <div><span className="text-muted-foreground">Banque :</span><p className="font-medium">{entrepriseEmettrice.banque}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">IBAN :</span><p className="font-medium font-mono">{entrepriseEmettrice.iban}</p></div>
                <div><span className="text-muted-foreground">BIC/SWIFT :</span><p className="font-medium font-mono">{entrepriseEmettrice.bic}</p></div>
                <div><span className="text-muted-foreground">Adresse banque :</span><p className="font-medium">{entrepriseEmettrice.adresseBanque}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">BIC Intermédiaire (hors EEA) :</span><p className="font-medium font-mono">{entrepriseEmettrice.bicIntermediaire}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Infos facture (déplacé sous les onglets) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Informations de la facture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">N° Facture</Label>
              <Input id="numero" value={data.numero} onChange={(e) => updateField('numero', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroInterne">Numéro interne</Label>
              <Input id="numeroInterne" value={data.numeroInterne} onChange={(e) => updateField('numeroInterne', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date de facturation</Label>
              <Input id="date" type="date" value={data.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEcheance">Date d'échéance</Label>
              <Input id="dateEcheance" type="date" value={data.dateEcheance} onChange={(e) => updateField('dateEcheance', e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.duplicata} onChange={(e) => updateField('duplicata', e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Duplicata</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="refDossier">Réf dossier</Label>
              <Input id="refDossier" placeholder="Nom du stagiaire principal" value={data.refDossier} onChange={(e) => updateField('refDossier', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refConvention">Réf Convention à rappeler</Label>
              <Input id="refConvention" placeholder="Convention num 2024..." value={data.refConvention} onChange={(e) => updateField('refConvention', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acquittement de la facture */}
      <Card className={data.acquittee ? "border-emerald-500 bg-emerald-50/50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            Acquittement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.acquittee}
              onChange={(e) => {
                const checked = e.target.checked;
                updateField('acquittee', checked);
                if (checked && !data.datePaiement) {
                  updateField('datePaiement', new Date().toISOString().split('T')[0]);
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Marquer cette facture comme acquittée (payée)</span>
          </label>
          {data.acquittee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="datePaiement">Date de paiement</Label>
                <Input
                  id="datePaiement"
                  type="date"
                  value={data.datePaiement}
                  onChange={(e) => updateField('datePaiement', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moyenPaiement">Moyen de paiement</Label>
                <Select value={data.moyenPaiement} onValueChange={(v) => updateField('moyenPaiement', v)}>
                  <SelectTrigger id="moyenPaiement">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                    <SelectItem value="virement_especes">Virement + Espèces</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="cb">Carte bancaire</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="opco">OPCO</SelectItem>
                    <SelectItem value="france_travail">France Travail</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aperçu de l'en-tête (déplacé en bas) */}
      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🚌</span>
                <div>
                  <h3 className="text-2xl font-bold text-primary">{entrepriseEmettrice.nom}</h3>
                  <p className="text-muted-foreground italic">{entrepriseEmettrice.slogan}</p>
                </div>
              </div>
              <div className="mt-4 text-sm space-y-1">
                <p>{entrepriseEmettrice.adresse}</p>
                <p>{entrepriseEmettrice.codePostal} {entrepriseEmettrice.ville}</p>
                <p>SIRET : {entrepriseEmettrice.siret}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">FACTURE {data.duplicata && <span className="text-orange-500">DUPLICATA</span>} N°{data.numero}</h2>
              <p className="text-muted-foreground">Numéro : {data.numeroInterne}</p>
              {data.acquittee && (
                <div className="mt-2 inline-block bg-emerald-600 text-white px-3 py-1 rounded font-bold text-sm">
                  ✓ ACQUITTÉE
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes et mentions légales */}
      <Card>
        <CardHeader><CardTitle>Notes et mentions légales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notes additionnelles</Label>
            <Textarea value={data.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Notes particulières pour cette facture..." rows={3} />
          </div>
          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <p>Centre de formation agrée par la préfecture n°{entrepriseEmettrice.prefectures}</p>
            <p className="font-medium">TVA non applicable - article 293 B du CGI</p>
            <p>« Membre d'un centre de gestion agréé, le règlement par chèque est accepté »</p>
            <p className="text-muted-foreground text-xs">En application de l'article 441-6 du Code de commerce, tout règlement effectué au delà du délai de paiement sera majoré d'un intérêt égal à 3 fois le taux d'intérêt légal.</p>
          </div>
          <Separator />
          <div className="text-center text-sm text-muted-foreground">
            <p>SASU FTRANSPORT - Capital de {entrepriseEmettrice.capital} € - SIRET : {entrepriseEmettrice.siret}</p>
            <p>NAF-APE : {entrepriseEmettrice.nafApe} - RCS/RM : {entrepriseEmettrice.rcs} - Num. TVA : {entrepriseEmettrice.tvaIntra}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
