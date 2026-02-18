import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parseDateRange } from "@/lib/parseDateRange";
import { Plus, Loader2, CalendarIcon, Users, FileText, Receipt, Upload, Trash2, Eye, CalendarDays } from "lucide-react";
import logoFtransport from "@/assets/logo-ftransport.png";

// Dates formations (same as ApprenantForm)
const datesFormations = {
  vtc: { label: "Formation VTC", dates: ["Du 12 au 25 janvier 2026", "Du 16 au 30 mars 2026", "Du 11 au 24 mai 2026", "Du 6 au 19 juillet 2026", "Du 14 au 27 septembre 2026", "Du 2 au 15 novembre 2026"] },
  taxi: { label: "Formation TAXI", dates: ["Du 5 au 26 janvier 2026", "Du 9 au 30 mars 2026", "Du 4 au 25 mai 2026", "Du 29 juin au 20 juillet 2026", "Du 7 au 28 septembre 2026", "Du 26 octobre au 16 novembre 2026"] },
  ta: { label: "Formation TAXI pour chauffeur VTC (TA)", dates: ["Du 5 au 26 janvier 2026", "Du 9 au 30 mars 2026", "Du 4 au 25 mai 2026", "Du 29 juin au 20 juillet 2026", "Du 7 au 28 septembre 2026", "Du 26 octobre au 16 novembre 2026"] }
};

const datesExamenTheorique = [
  { date: "27 janvier 2026", lieu: "Rhône – Double Mixte, Villeurbanne", horaire: "après-midi" },
  { date: "31 mars 2026", lieu: "Puy-de-Dôme – Polydome, Clermont-Ferrand", horaire: "après-midi" },
  { date: "26 mai 2026", lieu: "Rhône – Double Mixte, Villeurbanne", horaire: "après-midi" },
  { date: "21 juillet 2026", lieu: "Rhône – Double Mixte, Villeurbanne", horaire: "après-midi" },
  { date: "29 septembre 2026", lieu: "Rhône – Double Mixte, Villeurbanne", horaire: "après-midi" },
  { date: "17 novembre 2026", lieu: "Rhône – Double Mixte, Villeurbanne", horaire: "après-midi" },
];

const datesExamenPratique = [
  "Du 23 février au 6 mars 2026", "Du 4 au 13 mai 2026", "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026", "Du 2 au 13 novembre 2026", "Du 16 au 23 décembre 2026", "Début janvier 2027",
];

const datesFormationContinue = [
  "27 et 28 janvier 2026", "17 et 18 février 2026", "31 mars et 1er avril 2026", "28 et 29 avril 2026",
  "26 et 27 mai 2026", "23 et 24 juin 2026", "21 et 22 juillet 2026", "29 et 30 septembre 2026",
  "28 et 29 octobre 2026", "17 et 18 novembre 2026", "23 et 24 décembre 2026",
];

const prixFormations: Record<string, string> = {
  "vtc": "1099", "vtc-exam": "1599", "taxi": "1299", "taxi-exam": "1799",
  "passerelle-taxi": "999", "vtc-elearning-1099": "1099", "vtc-elearning": "1599",
  "taxi-elearning": "1299", "passerelle-taxi-elearning": "999", "passerelle-vtc-elearning": "499",
  "vtc-e-presentiel": "1599", "taxi-e-presentiel": "1799", "ta-e-presentiel": "999",
  "continue-vtc": "200", "continue-taxi": "299",
  "marketing-digital-24h": "1500", "marketing-digital-26h": "2100", "marketing-digital-28h": "3300",
  "anglais-20h": "1200", "anglais-35h": "2000", "anglais-45h": "3000"
};

const formationToType: Record<string, string> = {
  "vtc": "vtc", "vtc-exam": "vtc", "vtc-elearning-1099": "vtc-e", "vtc-elearning": "vtc-e",
  "taxi": "taxi", "taxi-exam": "taxi", "taxi-elearning": "taxi-e",
  "passerelle-taxi": "ta", "passerelle-taxi-elearning": "ta-e", "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel", "taxi-e-presentiel": "taxi-e-presentiel", "ta-e-presentiel": "ta-e-presentiel",
  "continue-vtc": "vtc", "continue-taxi": "taxi",
  "marketing-digital-24h": "marketing-digital", "marketing-digital-26h": "marketing-digital", "marketing-digital-28h": "marketing-digital",
  "anglais-20h": "anglais", "anglais-35h": "anglais", "anglais-45h": "anglais"
};

interface FournisseurApprenant {
  id: string;
  nom: string;
  prenom: string;
  formation_choisie: string | null;
  created_at: string;
}

interface FournisseurDocument {
  id: string;
  titre: string;
  nom_fichier: string;
  url: string;
  fournisseur_apprenant_id: string;
  created_at: string;
}

interface FournisseurFacture {
  id: string;
  nom_fichier: string;
  url: string;
  destinataire: string;
  montant: number | null;
  description: string | null;
  created_at: string;
}

export default function FournisseurPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fournisseur, setFournisseur] = useState<{ id: string; nom: string; factures_only?: boolean; formateur_id?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("apprenants");

  // Apprenants list
  const [apprenants, setApprenants] = useState<FournisseurApprenant[]>([]);
  const [documents, setDocuments] = useState<FournisseurDocument[]>([]);
  const [factures, setFactures] = useState<FournisseurFacture[]>([]);
  const [planning, setPlanning] = useState<any[]>([]);

  // Apprenant form
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [selectedFormation, setSelectedFormation] = useState("marketing-digital-24h");
  const [montantTtc, setMontantTtc] = useState("1500");
  const [typeApprenantFormation, setTypeApprenantFormation] = useState("marketing-digital");
  const [creneauHoraire, setCreneauHoraire] = useState("");
  const [dateExamenTheorique, setDateExamenTheorique] = useState("27 janvier 2026");
  const [dateExamenPratique, setDateExamenPratique] = useState("");
  const [selectedDateOption, setSelectedDateOption] = useState(datesFormations.vtc.dates[0]);
  const [dateDebutFormation, setDateDebutFormation] = useState<Date | undefined>();
  const [dateFinFormation, setDateFinFormation] = useState<Date | undefined>();
  const [inscritFranceTravail, setInscritFranceTravail] = useState(false);
  const [documentsComplets, setDocumentsComplets] = useState(false);
  const [financement, setFinancement] = useState("cpf");
  const [organismeFinanceur, setOrganismeFinanceur] = useState("cpf-cdc");

  // Document upload
  const [selectedApprenantForDoc, setSelectedApprenantForDoc] = useState("");
  const [docTitre, setDocTitre] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Facture upload
  const [factureDestinataire, setFactureDestinataire] = useState("Finally Academy Ltd");
  const [factureMontant, setFactureMontant] = useState("");
  const [factureDescription, setFactureDescription] = useState("Prestation de services");
  const [factureMoisAnnee, setFactureMoisAnnee] = useState("");
  const [factureMoisMultiples, setFactureMoisMultiples] = useState<string[]>([]);
  const [isUploadingFacture, setIsUploadingFacture] = useState(false);

  // Load fournisseur by token
  useEffect(() => {
    const loadFournisseur = async () => {
      if (!token) { setError("Lien invalide"); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('fournisseurs')
        .select('id, nom, actif, factures_only, formateur_id')
        .eq('token', token)
        .maybeSingle();
      if (err || !data) { setError("Lien invalide ou expiré"); setLoading(false); return; }
      if (!data.actif) { setError("Ce compte fournisseur est désactivé"); setLoading(false); return; }
      const facOnly = (data as any).factures_only === true;
      const formateurId = (data as any).formateur_id || null;
      setFournisseur({ id: data.id, nom: data.nom, factures_only: facOnly, formateur_id: formateurId });
      // Pré-remplir le destinataire avec le nom du fournisseur lui-même
      setFactureDestinataire(data.nom);
      if (formateurId) setActiveTab("planning");
      else if (facOnly) setActiveTab("factures");
      else setActiveTab("apprenants");
      setLoading(false);
    };
    loadFournisseur();
  }, [token]);

  // Load data
  useEffect(() => {
    if (!fournisseur) return;
    const load = async () => {
      const [appRes, docRes, facRes] = await Promise.all([
        supabase.from('fournisseur_apprenants').select('id, nom, prenom, formation_choisie, created_at').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
        supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
        supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false }),
      ]);
      if (appRes.data) setApprenants(appRes.data);
      if (docRes.data) setDocuments(docRes.data as FournisseurDocument[]);
      if (facRes.data) setFactures(facRes.data as FournisseurFacture[]);

      // Charger le planning si c'est un formateur (depuis agenda_blocs)
      if (fournisseur.formateur_id) {
        const { data: planData } = await supabase
          .from('agenda_blocs')
          .select('id, discipline_nom, formation, heure_debut, heure_fin, semaine_debut, jour, discipline_color')
          .eq('formateur_id', fournisseur.formateur_id)
          .order('semaine_debut', { ascending: true });
        if (planData) setPlanning(planData);
      }
    };
    load();
  }, [fournisseur, showForm]);

  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    if (prixFormations[value]) setMontantTtc(prixFormations[value]);
    if (formationToType[value]) setTypeApprenantFormation(formationToType[value]);
    if (value === "vtc" || value === "vtc-exam") setSelectedDateOption(datesFormations.vtc.dates[0]);
    else if (value === "taxi" || value === "taxi-exam") setSelectedDateOption(datesFormations.taxi.dates[0]);
    else if (value === "passerelle-taxi") setSelectedDateOption(datesFormations.ta.dates[0]);
    else setSelectedDateOption("");
  };

  const resetForm = () => {
    setCivilite(""); setPrenom(""); setNom(""); setEmail(""); setTelephone("");
    setAdresse(""); setCodePostal(""); setVille(""); setSelectedFormation("marketing-digital-24h");
    setMontantTtc("1500"); setTypeApprenantFormation("marketing-digital"); setCreneauHoraire("");
    setDateExamenTheorique(""); setDateExamenPratique("");
    setSelectedDateOption(""); setDateDebutFormation(undefined);
    setDateFinFormation(undefined); setInscritFranceTravail(false); setDocumentsComplets(false);
    setFinancement("cpf"); setOrganismeFinanceur("cpf-cdc");
  };

  const handleSubmitApprenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Insert into main apprenants table so it appears in CRM
      const { data: newApprenant, error: apprenantError } = await supabase
        .from('apprenants')
        .insert({
          civilite: civilite || null,
          nom: nom.trim(), prenom: prenom.trim(),
          email: email.trim() || null, telephone: telephone.trim() || null,
          adresse: adresse.trim() || null, code_postal: codePostal.trim() || null,
          ville: ville.trim() || null, formation_choisie: selectedFormation,
          type_apprenant: typeApprenantFormation, montant_ttc: parseFloat(montantTtc) || null,
          date_debut_formation: dateDebutFormation ? format(dateDebutFormation, "yyyy-MM-dd") : null,
          date_fin_formation: dateFinFormation ? format(dateFinFormation, "yyyy-MM-dd") : null,
          inscrit_france_travail: inscritFranceTravail,
          mode_financement: financement, organisme_financeur: organismeFinanceur || null,
          statut: 'fournisseur',
          notes: `Via fournisseur: ${fournisseur.nom}`,
        })
        .select('id')
        .single();

      if (apprenantError) throw apprenantError;

      // Also insert into fournisseur_apprenants for supplier portal tracking
      await supabase.from('fournisseur_apprenants').insert({
        fournisseur_id: fournisseur.id,
        civilite, nom: nom.trim(), prenom: prenom.trim(),
        email: email.trim() || null, telephone: telephone.trim() || null,
        adresse: adresse.trim() || null, code_postal: codePostal.trim() || null,
        ville: ville.trim() || null, formation_choisie: selectedFormation,
        type_apprenant: typeApprenantFormation, montant_ttc: parseFloat(montantTtc) || null,
        date_formation_catalogue: dateDebutFormation ? format(dateDebutFormation, "yyyy-MM-dd") : null,
        date_examen_pratique: dateFinFormation ? format(dateFinFormation, "yyyy-MM-dd") : null,
        inscrit_france_travail: inscritFranceTravail,
        mode_financement: financement, organisme_financeur: organismeFinanceur || null,
        notes: `apprenant_id:${newApprenant.id}`,
      });

      toast({ title: "Apprenant ajouté", description: `${prenom} ${nom} a été enregistré avec succès.` });
      resetForm();
      setShowForm(false);
      // Refresh apprenants list
      const { data: refreshed } = await supabase.from('fournisseur_apprenants').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (refreshed) setApprenants(refreshed as FournisseurApprenant[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur) return;
    const fileInput = document.getElementById('doc-file') as HTMLInputElement;
    const files = fileInput?.files;
    if (!files || files.length === 0 || !selectedApprenantForDoc) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un apprenant et au moins un fichier.", variant: "destructive" });
      return;
    }
    setIsUploadingDoc(true);
    try {
      // Find the linked apprenant_id from fournisseur_apprenant notes
      let mainApprenantId: string | null = null;
      const { data: faData } = await supabase
        .from('fournisseur_apprenants')
        .select('notes')
        .eq('id', selectedApprenantForDoc)
        .single();
      if (faData?.notes) {
        const match = faData.notes.match(/apprenant_id:(.+)/);
        if (match) mainApprenantId = match[1];
      }

      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${fournisseur.id}/${selectedApprenantForDoc}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('fournisseur-documents').upload(filePath, file);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('fournisseur-documents').getPublicUrl(filePath);
        const { error: insertErr } = await supabase.from('fournisseur_documents').insert({
          fournisseur_id: fournisseur.id, fournisseur_apprenant_id: selectedApprenantForDoc,
          titre: file.name, nom_fichier: file.name, url: publicUrl,
        });
        if (insertErr) throw insertErr;

        // Also insert into documents_inscription for CRM visibility
        if (mainApprenantId) {
          await supabase.from('documents_inscription').insert({
            apprenant_id: mainApprenantId,
            type_document: 'custom',
            titre: file.name,
            description: `Document fournisseur: ${fournisseur.nom}`,
            url: publicUrl,
            nom_fichier: file.name,
            statut: 'valid',
          });
        }

        successCount++;
      }
      toast({ title: "Documents envoyés", description: `${successCount} document(s) uploadé(s) avec succès.` });
      setSelectedApprenantForDoc(""); fileInput.value = "";
      const { data } = await supabase.from('fournisseur_documents').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (data) setDocuments(data as FournisseurDocument[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUploadFacture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseur) return;
    const fileInput = document.getElementById('facture-file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    const isFormateur = !!fournisseur.formateur_id;
    const moisValue = isFormateur
      ? (factureMoisMultiples.length > 0 ? factureMoisMultiples.sort().join(', ') : null)
      : (factureMoisAnnee || null);
    if (!file) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier.", variant: "destructive" });
      return;
    }
    if (isFormateur && factureMoisMultiples.length === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins un mois.", variant: "destructive" });
      return;
    }
    setIsUploadingFacture(true);
    try {
      const filePath = `factures/${fournisseur.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('fournisseur-documents').upload(filePath, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('fournisseur-documents').getPublicUrl(filePath);
      const { error: insertErr } = await supabase.from('fournisseur_factures').insert({
        fournisseur_id: fournisseur.id, nom_fichier: file.name, url: publicUrl,
        destinataire: factureDestinataire,
        montant: factureMontant ? parseFloat(factureMontant) : null,
        description: factureDescription || null,
        mois_annee: moisValue,
      } as any);
      if (insertErr) throw insertErr;
      toast({ title: "Facture envoyée", description: `Facture envoyée avec succès.` });
      setFactureMontant(""); setFactureDescription("Prestation de services"); setFactureMoisAnnee(""); setFactureMoisMultiples([]); fileInput.value = "";
      const { data } = await supabase.from('fournisseur_factures').select('*').eq('fournisseur_id', fournisseur.id).order('created_at', { ascending: false });
      if (data) setFactures(data as FournisseurFacture[]);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingFacture(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive font-medium text-lg">{error}</p>
          <p className="text-muted-foreground text-sm mt-2">Veuillez vérifier votre lien d'accès.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoFtransport} alt="FTransport" className="h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold">Portail Fournisseur</h1>
              <p className="text-sm text-muted-foreground">{fournisseur?.nom}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {fournisseur?.factures_only ? (
            <TabsList className={`grid w-full mb-6 ${fournisseur.formateur_id ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {fournisseur.formateur_id && (
                <TabsTrigger value="planning" className="gap-2"><CalendarDays className="w-4 h-4" />Mon planning</TabsTrigger>
              )}
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Mes factures</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="apprenants" className="gap-2"><Users className="w-4 h-4" />Apprenants</TabsTrigger>
              <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" />Documents</TabsTrigger>
              <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" />Factures</TabsTrigger>
            </TabsList>
          )}

          {/* ============ TAB APPRENANTS ============ */}
          <TabsContent value="apprenants">
            {!showForm ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Mes apprenants ({apprenants.length})</h2>
                  <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" />Ajouter un apprenant</Button>
                </div>
                {apprenants.length === 0 ? (
                  <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun apprenant enregistré. Cliquez sur "Ajouter un apprenant" pour commencer.</CardContent></Card>
                ) : (
                  <div className="grid gap-3">
                    {apprenants.map(a => (
                      <Card key={a.id}>
                        <CardContent className="pt-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{a.prenom} {a.nom}</p>
                            <p className="text-sm text-muted-foreground">{a.formation_choisie || "Pas de formation"} • {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Nouvel apprenant</CardTitle>
                  <CardDescription>Remplissez le formulaire pour enregistrer un apprenant</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitApprenant} className="space-y-6">
                    {/* Identité */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Identité</h3>
                      <div className="space-y-2">
                        <Label>Civilité</Label>
                        <Select value={civilite} onValueChange={setCivilite}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                          <SelectContent><SelectItem value="M.">M.</SelectItem><SelectItem value="Mme">Mme</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Nom *</Label><Input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Martin" /></div>
                        <div className="space-y-2"><Label>Prénom *</Label><Input required value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Jean" /></div>
                      </div>
                    </div>

                    {/* Coordonnées */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" /></div>
                        <div className="space-y-2"><Label>Téléphone</Label><Input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
                      </div>
                    </div>

                    {/* France Travail */}
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div><Label className="text-sm font-medium">Inscrit à France Travail</Label><p className="text-xs text-muted-foreground">L'apprenant est-il inscrit à France Travail ?</p></div>
                      <Switch checked={inscritFranceTravail} onCheckedChange={setInscritFranceTravail} />
                    </div>


                    {/* Adresse */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
                      <div className="space-y-2"><Label>Adresse</Label><Input value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="12 rue des Lilas" /></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Code postal</Label><Input maxLength={5} value={codePostal} onChange={e => setCodePostal(e.target.value)} placeholder="69001" /></div>
                        <div className="space-y-2 col-span-2"><Label>Ville</Label><Input value={ville} onChange={e => setVille(e.target.value)} placeholder="Lyon" /></div>
                      </div>
                    </div>

                    {/* Formation */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation ou Service</h3>
                      <div className="space-y-2">
                        <Label>Formation souhaitée</Label>
                        <Select value={selectedFormation} onValueChange={handleFormationChange}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une formation" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pas_encore_choisi">Pas encore choisi</SelectItem>
                            <SelectGroup><SelectLabel>Marketing Digital</SelectLabel>
                              <SelectItem value="marketing-digital-24h">Marketing Digital 24H - 1 500 €</SelectItem>
                              <SelectItem value="marketing-digital-26h">Marketing Digital 26H - 2 100 €</SelectItem>
                              <SelectItem value="marketing-digital-28h">Marketing Digital 28H - 3 300 €</SelectItem>
                            </SelectGroup>
                            <SelectGroup><SelectLabel>Anglais Professionnel</SelectLabel>
                              <SelectItem value="anglais-20h">Anglais Professionnel 20H - 1 200 €</SelectItem>
                              <SelectItem value="anglais-35h">Anglais Professionnel 35H - 2 000 €</SelectItem>
                              <SelectItem value="anglais-45h">Anglais Professionnel 45H - 3 000 €</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Financement */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Financement</h3>
                      <Select value={financement} onValueChange={setFinancement}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF (Mon Compte Formation)</SelectItem>
                          <SelectItem value="personnel">Personnel (auto-financement)</SelectItem>
                          <SelectItem value="opco">OPCO</SelectItem>
                          <SelectItem value="france_travail">France Travail</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prix */}
                    <div className="space-y-2">
                      <Label>Prix de la formation (€)</Label>
                      <Input type="number" value={montantTtc} onChange={e => setMontantTtc(e.target.value)} min="0" step="0.01" />
                    </div>

                    {/* Dates d'entrée et sortie */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Dates de formation</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date d'entrée en formation</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateDebutFormation && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateDebutFormation ? format(dateDebutFormation, "dd/MM/yyyy") : "Choisir une date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={dateDebutFormation} onSelect={setDateDebutFormation} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Date de sortie de formation</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFinFormation && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFinFormation ? format(dateFinFormation, "dd/MM/yyyy") : "Choisir une date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={dateFinFormation} onSelect={setDateFinFormation} initialFocus className={cn("p-3 pointer-events-auto")} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>


                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>Annuler</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Enregistrer l'apprenant
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB DOCUMENTS ============ */}
          <TabsContent value="documents">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Envoyer un document</CardTitle><CardDescription>Associez un document à un apprenant</CardDescription></CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Apprenant *</Label>
                        <Select value={selectedApprenantForDoc} onValueChange={setSelectedApprenantForDoc}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un apprenant" /></SelectTrigger>
                          <SelectContent>
                            {apprenants.map(a => <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier(s) *</Label>
                      <Input id="doc-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple required />
                    </div>
                    <Button type="submit" disabled={isUploadingDoc} className="gap-2">
                      {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Envoyer le document
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <h3 className="text-lg font-semibold">Documents envoyés ({documents.length})</h3>
              {documents.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucun document envoyé.</CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {documents.map(d => (
                    <Card key={d.id}>
                      <CardContent className="pt-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{d.titre}</p>
                          <p className="text-sm text-muted-foreground">{d.nom_fichier} • {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ TAB FACTURES ============ */}
          <TabsContent value="factures">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Déposer une facture</CardTitle><CardDescription>Envoyez votre facture au prestataire concerné</CardDescription></CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadFacture} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Destinataire</Label>
                      <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm font-medium">{factureDestinataire}</div>
                    </div>
                    {fournisseur?.formateur_id ? (
                      <div className="space-y-2">
                        <Label>Mois couverts *</Label>
                        <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                          {Array.from({ length: 12 }, (_, i) => {
                            const now = new Date();
                            // Générer les 6 derniers mois + 2 à venir
                            const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
                            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                            const checked = factureMoisMultiples.includes(val);
                            return (
                              <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setFactureMoisMultiples(prev =>
                                    checked ? prev.filter(m => m !== val) : [...prev, val]
                                  )}
                                  className="rounded"
                                />
                                <span className="capitalize">{label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {factureMoisMultiples.length > 0 && (
                          <p className="text-xs text-muted-foreground">{factureMoisMultiples.length} mois sélectionné(s)</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Mois et année concernés *</Label>
                        <Input
                          type="month"
                          value={factureMoisAnnee}
                          onChange={e => setFactureMoisAnnee(e.target.value)}
                          required={!!fournisseur?.factures_only}
                        />
                        <p className="text-xs text-muted-foreground">Indiquez le mois et l'année que cette facture couvre</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Montant (€)</Label>
                        <Input type="number" min="0" step="0.01" value={factureMontant} onChange={e => setFactureMontant(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={factureDescription} onChange={e => setFactureDescription(e.target.value)} placeholder="Prestation de services" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Fichier facture *</Label>
                      <Input id="facture-file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
                    </div>
                    <Button type="submit" disabled={isUploadingFacture} className="gap-2">
                      {isUploadingFacture ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Déposer la facture
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <h3 className="text-lg font-semibold">Factures déposées ({factures.length})</h3>
              {factures.length === 0 ? (
                <Card><CardContent className="pt-6 text-center text-muted-foreground">Aucune facture déposée.</CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {factures.map(f => (
                    <Card key={f.id}>
                      <CardContent className="pt-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{f.nom_fichier}</p>
                          <p className="text-sm text-muted-foreground">
                            Prestataire : <span className="font-medium">{f.destinataire}</span>
                            {(f as any).mois_annee ? ` • Période : ${(f as any).mois_annee}` : ""}
                            {f.montant ? ` • ${f.montant.toLocaleString('fr-FR')} €` : ""}
                            {" • "}{new Date(f.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ TAB PLANNING (formateurs uniquement) ============ */}
          {fournisseur?.formateur_id && (
            <TabsContent value="planning">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Mon planning de cours</h2>
                {planning.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Aucun créneau planifié pour le moment.
                    </CardContent>
                  </Card>
                ) : (() => {
                  // Grouper par date réelle (semaine_debut + jour)
                  const grouped: Record<string, typeof planning> = {};
                  planning.forEach((bloc: any) => {
                    const [year, month, day] = bloc.semaine_debut.split('-').map(Number);
                    const base = new Date(year, month - 1, day);
                    base.setDate(base.getDate() + bloc.jour);
                    const dateKey = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push({ ...bloc, _dateObj: base });
                  });
                  const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
                  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
                  const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
                  return (
                    <div className="space-y-4">
                      {sortedKeys.map((dateKey) => {
                        const blocs = grouped[dateKey];
                        const d = blocs[0]._dateObj as Date;
                        const isPast = d < new Date();
                        const label = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
                        return (
                          <div key={dateKey} className={`border rounded-xl overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
                            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
                              <span className="font-semibold text-sm">{label}</span>
                              {isPast && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Passé</span>}
                            </div>
                            <div className="divide-y">
                              {(blocs as any[])
                                .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                                .map((bloc: any) => {
                                  const [sh, sm] = bloc.heure_debut.split(':').map(Number);
                                  const [eh, em] = bloc.heure_fin.split(':').map(Number);
                                  const heures = (eh + em/60) - (sh + sm/60);
                                  return (
                                    <div key={bloc.id} className="flex items-center gap-3 px-4 py-3">
                                      <div className="w-3 h-10 rounded-sm shrink-0" style={{ backgroundColor: bloc.discipline_color || '#6366f1' }} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{bloc.discipline_nom}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {bloc.heure_debut} – {bloc.heure_fin} · {heures.toFixed(1)}h · {bloc.formation}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
