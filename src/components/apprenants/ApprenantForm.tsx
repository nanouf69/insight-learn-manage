import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, User, UserCheck, Loader2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
}

// Liste des dates par type de formation (présentiel uniquement)
const datesFormations = {
  vtc: {
    label: "Formation VTC",
    dates: [
      "Du 12 au 25 janvier 2026",
      "Du 16 au 30 mars 2026",
      "Du 11 au 24 mai 2026",
      "Du 6 au 19 juillet 2026",
      "Du 14 au 27 septembre 2026",
      "Du 2 au 15 novembre 2026"
    ]
  },
  taxi: {
    label: "Formation TAXI",
    dates: [
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ]
  },
  ta: {
    label: "Formation TAXI pour chauffeur VTC (TA)",
    dates: [
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ]
  }
};

// Dates des examens théoriques 2026
const datesExamenTheorique = [
  { date: "27 janvier 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "31 mars 2026", lieu: "Puy-de-Dôme – Polydome, Place du 1er mai, 63100 Clermont-Ferrand", horaire: "après-midi" },
  { date: "26 mai 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "21 juillet 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "29 septembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
  { date: "17 novembre 2026", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne", horaire: "après-midi" },
];

export function ApprenantForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [typeApprenant, setTypeApprenant] = useState<"prospect" | "client">("prospect");
  const [isLoading, setIsLoading] = useState(false);
  
  // Liste des apprenants existants pour CPF A
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [selectedApprenantId, setSelectedApprenantId] = useState("");
  
  // États pour les champs du formulaire
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [financement, setFinancement] = useState("cpf");
  const [organismeFinanceur, setOrganismeFinanceur] = useState("cpf-cdc");
  const [numeroDossierCma, setNumeroDossierCma] = useState("");
  const [dateDebutFormation, setDateDebutFormation] = useState<Date | undefined>();
  const [dateFinFormation, setDateFinFormation] = useState<Date | undefined>();
  const [selectedDateOption, setSelectedDateOption] = useState(datesFormations.vtc.dates[0]);
  const [creneauHoraire, setCreneauHoraire] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState("vtc-exam");
  const [montantTtc, setMontantTtc] = useState("1599");
  const [typeApprenantFormation, setTypeApprenantFormation] = useState("vtc");
  const [dateExamenTheorique, setDateExamenTheorique] = useState("27 janvier 2026");

  // Prix par défaut selon la formation
  const prixFormations: Record<string, string> = {
    "vtc": "1099",
    "vtc-exam": "1599",
    "taxi": "1299",
    "taxi-exam": "1799",
    "passerelle-taxi": "999",
    "vtc-elearning-1099": "1099",
    "vtc-elearning": "1599",
    "taxi-elearning": "1299",
    "passerelle-taxi-elearning": "999",
    "passerelle-vtc-elearning": "499",
    "vtc-e-presentiel": "1599",
    "taxi-e-presentiel": "1799",
    "ta-e-presentiel": "999"
  };

  // Mapping formation → type d'apprenant
  const formationToType: Record<string, string> = {
    "vtc": "vtc",
    "vtc-exam": "vtc",
    "vtc-elearning-1099": "vtc-e",
    "vtc-elearning": "vtc-e",
    "taxi": "taxi",
    "taxi-exam": "taxi",
    "taxi-elearning": "taxi-e",
    "passerelle-taxi": "ta",
    "passerelle-taxi-elearning": "ta-e",
    "passerelle-vtc-elearning": "va-e",
    "vtc-e-presentiel": "vtc-e-presentiel",
    "taxi-e-presentiel": "taxi-e-presentiel",
    "ta-e-presentiel": "ta-e-presentiel"
  };

  // Mettre à jour le prix, le type d'apprenant et les dates par défaut quand la formation change
  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    if (prixFormations[value]) {
      setMontantTtc(prixFormations[value]);
    }
    if (formationToType[value]) {
      setTypeApprenantFormation(formationToType[value]);
    }
    
    // Pré-sélectionner automatiquement la première date de formation selon le type (présentiel uniquement)
    if (value === "vtc" || value === "vtc-exam") {
      setSelectedDateOption(datesFormations.vtc.dates[0]); // "Du 12 au 25 janvier 2026"
    } else if (value === "taxi" || value === "taxi-exam") {
      setSelectedDateOption(datesFormations.taxi.dates[0]); // "Du 5 au 26 janvier 2026"
    } else if (value === "passerelle-taxi") {
      setSelectedDateOption(datesFormations.ta.dates[0]); // "Du 5 au 26 janvier 2026"
    } else {
      // E-learning : pas de date pré-sélectionnée
      setSelectedDateOption("");
    }
  };

  // Charger les apprenants existants
  useEffect(() => {
    const fetchApprenants = async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('id, nom, prenom')
        .order('nom', { ascending: true });
      
      if (!error && data) {
        setApprenants(data);
      }
    };
    
    if (open) {
      fetchApprenants();
    }
  }, [open]);

  // Vérifier les doublons en temps réel
  useEffect(() => {
    const checkDuplicate = async () => {
      const nomTrimmed = nom.trim().toLowerCase();
      const prenomTrimmed = prenom.trim().toLowerCase();
      
      if (!nomTrimmed || !prenomTrimmed) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      
      // Récupérer tous les apprenants et comparer côté client pour gérer les espaces parasites
      const { data, error } = await supabase
        .from('apprenants')
        .select('id, nom, prenom, statut');

      if (!error && data) {
        const doublon = data.find(a => 
          a.nom.trim().toLowerCase() === nomTrimmed && 
          a.prenom.trim().toLowerCase() === prenomTrimmed
        );
        
        if (doublon) {
          const typeExistant = doublon.statut === 'prospect' ? 'prospect' : 'client';
          setDuplicateWarning(`"${doublon.prenom.trim()} ${doublon.nom.trim()}" est déjà enregistré(e) en tant que ${typeExistant}. Les doublons ne sont pas autorisés.`);
        } else {
          setDuplicateWarning(null);
        }
      } else {
        setDuplicateWarning(null);
      }
      
      setIsCheckingDuplicate(false);
    };

    // Débounce de 500ms pour éviter trop de requêtes
    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [nom, prenom]);
  // Gérer la sélection d'une date de formation
  const handleDateSelect = (value: string) => {
    setSelectedDateOption(value);
    // Si c'est "manuel", on laisse les date pickers actifs
  };

  const resetForm = () => {
    setCivilite("");
    setPrenom("");
    setNom("");
    setEmail("");
    setTelephone("");
    setAdresse("");
    setCodePostal("");
    setVille("");
    setFinancement("cpf");
    setOrganismeFinanceur("cpf-cdc");
    setNumeroDossierCma("");
    setDateDebutFormation(undefined);
    setDateFinFormation(undefined);
    setSelectedDateOption(datesFormations.vtc.dates[0]);
    setCreneauHoraire("");
    setTypeApprenant("prospect");
    setSelectedApprenantId("");
    setDuplicateWarning(null);
    setSelectedFormation("vtc-exam");
    setMontantTtc("1599");
    setTypeApprenantFormation("vtc");
    setDateExamenTheorique("27 janvier 2026");
  };

  // Ref pour éviter les doubles soumissions
  const submitInProgressRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Protection contre les doubles clics
    if (submitInProgressRef.current || isLoading) return;
    submitInProgressRef.current = true;
    setIsLoading(true);

    // Capturer les valeurs actuelles pour éviter la perte de données
    const formData = {
      civilite,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      adresse: adresse.trim() || null,
      code_postal: codePostal.trim() || null,
      ville: ville.trim() || null,
      mode_financement: financement,
      organisme_financeur: organismeFinanceur || null,
      numero_dossier_cma: numeroDossierCma.trim() || null,
      statut: typeApprenant === "prospect" ? "prospect" : "inscrit",
      type_apprenant: typeApprenantFormation || null,
      formation_choisie: selectedFormation || null,
      montant_ttc: montantTtc ? parseFloat(montantTtc) : null,
      date_formation_catalogue: selectedDateOption || null,
      date_debut_formation: dateDebutFormation ? format(dateDebutFormation, 'yyyy-MM-dd') : null,
      date_fin_formation: dateFinFormation ? format(dateFinFormation, 'yyyy-MM-dd') : null,
      creneau_horaire: creneauHoraire || null,
      date_examen_theorique: dateExamenTheorique || null,
    };

    try {
      const { error } = await supabase
        .from('apprenants')
        .insert(formData);

      if (error) throw error;

      toast({
        title: "Apprenant ajouté",
        description: `${formData.prenom} ${formData.nom} a été ajouté en tant que ${typeApprenant === "prospect" ? "prospect" : "client"}.`,
      });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      // Vérifier si c'est une erreur de doublon
      const isDuplicate = error.code === '23505' || error.message?.includes('apprenants_nom_prenom_unique');
      
      toast({
        title: isDuplicate ? "Doublon détecté" : "Erreur",
        description: isDuplicate 
          ? `Un apprenant avec le nom "${formData.nom}" et le prénom "${formData.prenom}" existe déjà.`
          : (error.message || "Erreur lors de l'ajout de l'apprenant"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      submitInProgressRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un apprenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel apprenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type : Prospect ou Client */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Type</Label>
            <RadioGroup 
              value={typeApprenant} 
              onValueChange={(v) => setTypeApprenant(v as "prospect" | "client")}
              className="grid grid-cols-2 gap-4"
            >
              <div 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  typeApprenant === "prospect" 
                    ? "border-amber-500 bg-amber-50" 
                    : "border-border hover:border-amber-300"
                }`}
                onClick={() => setTypeApprenant("prospect")}
              >
                <RadioGroupItem value="prospect" id="prospect" />
                <Label htmlFor="prospect" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-medium">Prospect</div>
                    <div className="text-xs text-muted-foreground">Personne intéressée, pas encore inscrite</div>
                  </div>
                </Label>
              </div>
              <div 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  typeApprenant === "client" 
                    ? "border-green-500 bg-green-50" 
                    : "border-border hover:border-green-300"
                }`}
                onClick={() => setTypeApprenant("client")}
              >
                <RadioGroupItem value="client" id="client" />
                <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">Client</div>
                    <div className="text-xs text-muted-foreground">Personne inscrite à une formation</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Identité */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Identité</h3>
            <div className="space-y-2">
              <Label htmlFor="civilite">Civilité</Label>
              <Select value={civilite} onValueChange={setCivilite}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une civilité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input 
                  id="lastName" 
                  placeholder="Martin" 
                  required 
                  value={nom} 
                  onChange={(e) => setNom(e.target.value)}
                  className={duplicateWarning ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input 
                  id="firstName" 
                  placeholder="Jean" 
                  required 
                  value={prenom} 
                  onChange={(e) => setPrenom(e.target.value)}
                  className={duplicateWarning ? "border-destructive" : ""}
                />
              </div>
            </div>
            
            {/* Avertissement doublon */}
            {duplicateWarning && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{duplicateWarning}</span>
              </div>
            )}
            
            {isCheckingDuplicate && nom && prenom && (
              <p className="text-xs text-muted-foreground">Vérification en cours...</p>
            )}
          </div>

          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="jean.martin@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" placeholder="06 12 34 56 78" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Adresse postale */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" placeholder="12 rue des Lilas" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input id="codePostal" placeholder="69001" maxLength={5} value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input id="ville" placeholder="Lyon" value={ville} onChange={(e) => setVille(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Formation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation</h3>
            <div className="space-y-2">
              <Label htmlFor="formation">Formation souhaitée {typeApprenant === "client" && "*"}</Label>
              <Select value={selectedFormation} onValueChange={handleFormationChange} required={typeApprenant === "client"}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pas_encore_choisi">Pas encore choisi</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Formations Présentiel</SelectLabel>
                    <SelectItem value="vtc">Formation VTC - 1 099 € (VTC)</SelectItem>
                    <SelectItem value="vtc-exam">Formation VTC avec frais d'examen - 1 599 € (VTC)</SelectItem>
                    <SelectItem value="taxi">Formation TAXI - 1 299 € (TAXI)</SelectItem>
                    <SelectItem value="taxi-exam">Formation TAXI avec frais d'examen - 1 799 € (TAXI)</SelectItem>
                    <SelectItem value="passerelle-taxi">Formation TAXI pour chauffeur VTC - 999 € (TA)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Formations E-learning</SelectLabel>
                    <SelectItem value="vtc-elearning-1099">Formation VTC (E-learning) - 1 099 € (VTC)</SelectItem>
                    <SelectItem value="vtc-elearning">Formation VTC (E-learning) - 1 599 € (VTC)</SelectItem>
                    <SelectItem value="taxi-elearning">Formation TAXI (E-learning) - 1 299 € (TAXI)</SelectItem>
                    <SelectItem value="passerelle-taxi-elearning">Formation TAXI pour chauffeur VTC (E-learning) - 999 € (TA)</SelectItem>
                    <SelectItem value="passerelle-vtc-elearning">Formation VTC pour chauffeur TAXI (E-learning) - 499 € (VA)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Formations E-learning en présentiel</SelectLabel>
                    <SelectItem value="vtc-e-presentiel">Formation VTC E (Présentiel) - 1 599 € (VTC E Présentiel)</SelectItem>
                    <SelectItem value="taxi-e-presentiel">Formation TAXI E (Présentiel) - 1 799 € (TAXI E Présentiel)</SelectItem>
                    <SelectItem value="ta-e-presentiel">Formation TA E (Présentiel) - 999 € (TA E Présentiel)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Type d'apprenant - rempli automatiquement */}
            <div className="space-y-2">
              <Label htmlFor="typeApprenantFormation">Type d'apprenant</Label>
              <Select value={typeApprenantFormation} onValueChange={setTypeApprenantFormation}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionné automatiquement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vtc">VTC</SelectItem>
                  <SelectItem value="vtc-e">VTC E</SelectItem>
                  <SelectItem value="vtc-e-presentiel">VTC E Présentiel</SelectItem>
                  <SelectItem value="taxi">TAXI</SelectItem>
                  <SelectItem value="taxi-e">TAXI E</SelectItem>
                  <SelectItem value="taxi-e-presentiel">TAXI E Présentiel</SelectItem>
                  <SelectItem value="ta">TA (Passerelle TAXI)</SelectItem>
                  <SelectItem value="ta-e">TA E (Passerelle TAXI E-learning)</SelectItem>
                  <SelectItem value="ta-e-presentiel">TA E Présentiel</SelectItem>
                  <SelectItem value="va-e">VA E (Passerelle VTC E-learning)</SelectItem>
                </SelectContent>
              </Select>
              {typeApprenantFormation && (
                <p className="text-xs text-muted-foreground">
                  Défini automatiquement selon la formation sélectionnée
                </p>
              )}
            </div>

            {/* Créneau horaire pour formation présentiel */}
            <div className="space-y-2">
              <Label htmlFor="creneauHoraire">Créneau horaire</Label>
              <Select value={creneauHoraire} onValueChange={setCreneauHoraire}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un créneau" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="journee">Formation en journée (9h - 16h)</SelectItem>
                  <SelectItem value="soiree">Formation en soirée (17h - 21h)</SelectItem>
                  <SelectItem value="en-ligne">Formation en ligne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date d'examen théorique */}
            <div className="space-y-2">
              <Label htmlFor="dateExamenTheorique">Date d'examen théorique</Label>
              <Select value={dateExamenTheorique} onValueChange={setDateExamenTheorique}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une date d'examen" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="pas_encore_choisi">Pas de date choisie encore</SelectItem>
                  {datesExamenTheorique.map((exam, idx) => (
                    <SelectItem key={idx} value={exam.date}>
                      <div className="flex flex-col">
                        <span className="font-medium">{exam.date} ({exam.horaire})</span>
                        <span className="text-xs text-muted-foreground">{exam.lieu}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Mode de financement */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Financement</h3>
            <div className="space-y-2">
              <Label htmlFor="financement">Mode de financement *</Label>
              <Select value={financement} onValueChange={(value) => {
                setFinancement(value);
                if (value === "cpf-a") {
                  setOrganismeFinanceur("cpf-a");
                } else {
                  setSelectedApprenantId("");
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mode de financement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      CPF (Mon Compte Formation)
                    </span>
                  </SelectItem>
                  <SelectItem value="personnel">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Personnel (auto-financement)
                    </span>
                  </SelectItem>
                  <SelectItem value="opco">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      OPCO
                    </span>
                  </SelectItem>
                  <SelectItem value="france_travail">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      France Travail
                    </span>
                  </SelectItem>
                  <SelectItem value="autre">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Autre
                    </span>
                  </SelectItem>
                  <SelectItem value="cpf-a">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      CPF A
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {financement === "cpf-a" && (
              <div className="space-y-2">
                <Label htmlFor="apprenantCpfA">Apprenant associé (CPF A)</Label>
                <Select value={selectedApprenantId} onValueChange={setSelectedApprenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un apprenant existant" />
                  </SelectTrigger>
                  <SelectContent>
                    {apprenants.length > 0 ? (
                      apprenants.map((apprenant) => (
                        <SelectItem key={apprenant.id} value={apprenant.id}>
                          {apprenant.nom} {apprenant.prenom}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        Aucun apprenant enregistré
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="company">Entreprise / Organisme financeur (optionnel)</Label>
              <Select value={organismeFinanceur} onValueChange={setOrganismeFinanceur}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une entreprise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Organismes publics</SelectLabel>
                    <SelectItem value="cpf-cdc">CPF (Caisse des Dépôts)</SelectItem>
                    <SelectItem value="france-travail">France Travail</SelectItem>
                    <SelectItem value="metropole-lyon">Métropole de Lyon</SelectItem>
                    <SelectItem value="mairie">Mairie</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>OPCO</SelectLabel>
                    <SelectItem value="opco-mobilites">OPCO Mobilités</SelectItem>
                    <SelectItem value="opco-ep">OPCO EP</SelectItem>
                    <SelectItem value="fafcea">FAFCEA</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Autres</SelectLabel>
                    <SelectItem value="personnel">Personnel (auto-financement)</SelectItem>
                    <SelectItem value="societe">Société / Entreprise</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                    <SelectItem value="cpf-a">CPF A</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Dates de formation */}
            <div className="space-y-4">
              <Label>Dates de formation</Label>
              
              {/* Menu déroulant des dates disponibles */}
              <Select value={selectedDateOption} onValueChange={handleDateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une date de formation" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-80">
                  <SelectItem value="manuel">
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Définir les dates manuellement
                    </span>
                  </SelectItem>
                  
                  {/* Formations VTC */}
                  <SelectGroup>
                    <SelectLabel>{datesFormations.vtc.label}</SelectLabel>
                    {datesFormations.vtc.dates.map((date, idx) => (
                      <SelectItem key={`vtc-${idx}`} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Formations TAXI */}
                  <SelectGroup>
                    <SelectLabel>{datesFormations.taxi.label}</SelectLabel>
                    {datesFormations.taxi.dates.map((date, idx) => (
                      <SelectItem key={`taxi-${idx}`} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Passerelle TA */}
                  <SelectGroup>
                    <SelectLabel>{datesFormations.ta.label}</SelectLabel>
                    {datesFormations.ta.dates.map((date, idx) => (
                      <SelectItem key={`ta-${idx}`} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>


              {/* Date pickers (toujours visibles pour permettre l'ajustement) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateDebut" className="text-xs text-muted-foreground">Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateDebutFormation && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateDebutFormation ? format(dateDebutFormation, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={dateDebutFormation}
                        onSelect={setDateDebutFormation}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFin" className="text-xs text-muted-foreground">Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFinFormation && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFinFormation ? format(dateFinFormation, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFinFormation}
                        onSelect={setDateFinFormation}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroDossierCma">Numéro de dossier CMA</Label>
              <Input 
                id="numeroDossierCma" 
                placeholder="Ex: CMA-2025-001" 
                value={numeroDossierCma} 
                onChange={(e) => setNumeroDossierCma(e.target.value)} 
              />
            </div>
          </div>

          {/* Prix de la formation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Informations</h3>
            <div className="space-y-2">
              <Label htmlFor="prixFormation">Prix de la formation (€)</Label>
              <Input 
                id="prixFormation" 
                type="number" 
                placeholder="1299" 
                value={montantTtc} 
                onChange={(e) => setMontantTtc(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" placeholder="Informations complémentaires..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {typeApprenant === "prospect" ? "Ajouter le prospect" : "Ajouter le client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
