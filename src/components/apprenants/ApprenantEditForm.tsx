import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, User, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { parseDateRange } from "@/lib/parseDateRange";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  civilite: string | null;
  statut: string | null;
  mode_financement: string | null;
  date_naissance: string | null;
  numero_dossier_cma: string | null;
  organisme_financeur: string | null;
  type_apprenant: string | null;
  formation_choisie?: string | null;
  montant_ttc?: number | null;
  date_formation_catalogue?: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
  creneau_horaire?: string | null;
  date_examen_theorique?: string | null;
  montant_paye?: number | null;
  moyen_paiement?: string | null;
  notes?: string | null;
  date_paiement?: string | null;
}

interface ApprenantEditFormProps {
  apprenant: Apprenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ApprenantEditForm({ apprenant, open, onOpenChange }: ApprenantEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [typeApprenant, setTypeApprenant] = useState<"prospect" | "client">("prospect");
  const [dateDebutFormation, setDateDebutFormation] = useState<Date | undefined>();
  const [dateFinFormation, setDateFinFormation] = useState<Date | undefined>();
  const [datePaiement, setDatePaiement] = useState<Date | undefined>();
  const [selectedDateOption, setSelectedDateOption] = useState("");
  const submitInProgressRef = useRef(false);
  
  const [formData, setFormData] = useState({
    civilite: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    statut: "particulier",
    mode_financement: "cpf",
    organisme_financeur: "cpf-cdc",
    date_naissance: "",
    numero_dossier_cma: "",
    type_apprenant: "",
    selected_formation: "",
    creneau_horaire: "",
    montant_ttc: "1299",
    date_examen_theorique: "27 janvier 2026",
    montant_paye: "0",
    moyen_paiement: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (apprenant) {
      const isClient = apprenant.statut === "inscrit" || apprenant.statut === "entreprise";
      setTypeApprenant(isClient ? "client" : "prospect");
      
      setFormData({
        civilite: apprenant.civilite || "",
        prenom: apprenant.prenom,
        nom: apprenant.nom,
        email: apprenant.email || "",
        telephone: apprenant.telephone || "",
        adresse: apprenant.adresse || "",
        code_postal: apprenant.code_postal || "",
        ville: apprenant.ville || "",
        statut: apprenant.statut || "particulier",
        mode_financement: apprenant.mode_financement || "cpf",
        organisme_financeur: apprenant.organisme_financeur || "cpf-cdc",
        date_naissance: apprenant.date_naissance || "",
        numero_dossier_cma: apprenant.numero_dossier_cma || "",
        type_apprenant: apprenant.type_apprenant || "",
        selected_formation: apprenant.formation_choisie || "",
        creneau_horaire: apprenant.creneau_horaire || "",
        montant_ttc: apprenant.montant_ttc?.toString() || "1299",
        date_examen_theorique: apprenant.date_examen_theorique || "27 janvier 2026",
        montant_paye: apprenant.montant_paye?.toString() || "0",
        moyen_paiement: apprenant.moyen_paiement || "",
        notes: apprenant.notes || "",
      });
      
      // Restaurer la date de formation du catalogue si elle existe
      if (apprenant.date_formation_catalogue) {
        setSelectedDateOption(apprenant.date_formation_catalogue);
      }
      
      // Restaurer les dates manuelles si elles existent
      if (apprenant.date_debut_formation) {
        setDateDebutFormation(new Date(apprenant.date_debut_formation));
      }
      if (apprenant.date_fin_formation) {
        setDateFinFormation(new Date(apprenant.date_fin_formation));
      }
      if (apprenant.date_paiement) {
        setDatePaiement(new Date(apprenant.date_paiement));
      }
    }
  }, [apprenant]);

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

  const handleFormationChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      selected_formation: value,
      montant_ttc: prixFormations[value] || prev.montant_ttc,
      type_apprenant: formationToType[value] || prev.type_apprenant
    }));
    
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

  const handleDateSelect = (value: string) => {
    setSelectedDateOption(value);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Protection contre les doubles clics
    if (submitInProgressRef.current || isLoading) return;
    submitInProgressRef.current = true;
    setIsLoading(true);

    // Capturer les valeurs actuelles pour éviter la perte de données
    const updateData = {
      civilite: formData.civilite?.trim() || null,
      prenom: formData.prenom.trim(),
      nom: formData.nom.trim(),
      email: formData.email?.trim() || null,
      telephone: formData.telephone?.trim() || null,
      adresse: formData.adresse?.trim() || null,
      code_postal: formData.code_postal?.trim() || null,
      ville: formData.ville?.trim() || null,
      statut: typeApprenant === "prospect" ? "prospect" : "inscrit",
      mode_financement: formData.mode_financement,
      organisme_financeur: formData.organisme_financeur || null,
      date_naissance: formData.date_naissance || null,
      numero_dossier_cma: formData.numero_dossier_cma?.trim() || null,
      type_apprenant: formData.type_apprenant || null,
      formation_choisie: formData.selected_formation || null,
      montant_ttc: formData.montant_ttc ? parseFloat(formData.montant_ttc) : null,
      date_formation_catalogue: selectedDateOption || null,
      date_debut_formation: dateDebutFormation 
        ? format(dateDebutFormation, 'yyyy-MM-dd') 
        : (selectedDateOption ? parseDateRange(selectedDateOption).dateDebut : null),
      date_fin_formation: dateFinFormation 
        ? format(dateFinFormation, 'yyyy-MM-dd') 
        : (selectedDateOption ? parseDateRange(selectedDateOption).dateFin : null),
      creneau_horaire: formData.creneau_horaire || null,
      date_examen_theorique: formData.date_examen_theorique || null,
      montant_paye: formData.montant_paye ? parseFloat(formData.montant_paye) : 0,
      moyen_paiement: formData.moyen_paiement || null,
      notes: formData.notes?.trim() || null,
      date_paiement: datePaiement ? format(datePaiement, 'yyyy-MM-dd') : null,
    };

    try {
      const { error } = await supabase
        .from('apprenants')
        .update(updateData)
        .eq('id', apprenant.id);

      if (error) throw error;

      toast.success("Apprenant modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ['apprenants'] });
      queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenant.id] });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la modification de l'apprenant");
    } finally {
      setIsLoading(false);
      submitInProgressRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'apprenant</DialogTitle>
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
                <RadioGroupItem value="prospect" id="edit-prospect" />
                <Label htmlFor="edit-prospect" className="flex items-center gap-2 cursor-pointer flex-1">
                  <User className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-medium">Prospect</div>
                    <div className="text-xs text-muted-foreground">Personne intéressée</div>
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
                <RadioGroupItem value="client" id="edit-client" />
                <Label htmlFor="edit-client" className="flex items-center gap-2 cursor-pointer flex-1">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">Client</div>
                    <div className="text-xs text-muted-foreground">Inscrit à une formation</div>
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
              <Select value={formData.civilite} onValueChange={(value) => setFormData({ ...formData, civilite: value })}>
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
                <Label htmlFor="nom">Nom *</Label>
                <Input 
                  id="nom" 
                  placeholder="Martin" 
                  required 
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input 
                  id="prenom" 
                  placeholder="Jean" 
                  required 
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_naissance">Date de naissance</Label>
              <Input 
                id="date_naissance" 
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
              />
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Coordonnées</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="jean.martin@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input 
                  id="telephone" 
                  type="tel" 
                  placeholder="06 12 34 56 78"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Adresse postale */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Adresse postale</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input 
                  id="adresse" 
                  placeholder="12 rue des Lilas"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input 
                    id="code_postal" 
                    placeholder="69001" 
                    maxLength={5}
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input 
                    id="ville" 
                    placeholder="Lyon"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Formation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation</h3>

            <div className="space-y-2">
              <Label htmlFor="formation">Formation souhaitée</Label>
              <Select value={formData.selected_formation} onValueChange={handleFormationChange}>
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
              <Label htmlFor="type_apprenant">Type d'apprenant</Label>
              <Select value={formData.type_apprenant} onValueChange={(value) => setFormData({ ...formData, type_apprenant: value })}>
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
              {formData.type_apprenant && (
                <p className="text-xs text-muted-foreground">
                  Défini automatiquement selon la formation sélectionnée
                </p>
              )}
            </div>

            {/* Créneau horaire */}
            <div className="space-y-2">
              <Label htmlFor="creneauHoraire">Créneau horaire</Label>
              <Select value={formData.creneau_horaire} onValueChange={(value) => setFormData({ ...formData, creneau_horaire: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un créneau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="journee">Formation en journée (9h - 16h)</SelectItem>
                  <SelectItem value="soiree">Formation en soirée (17h - 21h)</SelectItem>
                  <SelectItem value="en-ligne">Formation en ligne</SelectItem>
                  <SelectItem value="repassage">Repassage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date d'examen théorique */}
            <div className="space-y-2">
              <Label htmlFor="dateExamenTheorique">Date d'examen théorique</Label>
              <Select value={formData.date_examen_theorique} onValueChange={(value) => setFormData({ ...formData, date_examen_theorique: value })}>
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
              <Select value={formData.mode_financement} onValueChange={(value) => {
                setFormData({ ...formData, mode_financement: value });
                if (value === "cpf-a") {
                  setFormData(prev => ({ ...prev, organisme_financeur: "cpf-a" }));
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
            
            <div className="space-y-2">
              <Label htmlFor="company">Organisme financeur</Label>
              <Select value={formData.organisme_financeur} onValueChange={(value) => setFormData({ ...formData, organisme_financeur: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un organisme" />
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
                  
                  <SelectGroup>
                    <SelectLabel>{datesFormations.vtc.label}</SelectLabel>
                    {datesFormations.vtc.dates.map((date, idx) => (
                      <SelectItem key={`vtc-${idx}`} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  <SelectGroup>
                    <SelectLabel>{datesFormations.taxi.label}</SelectLabel>
                    {datesFormations.taxi.dates.map((date, idx) => (
                      <SelectItem key={`taxi-${idx}`} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectGroup>

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
              <Label htmlFor="numero_dossier_cma">Numéro de dossier CMA</Label>
              <Input 
                id="numero_dossier_cma" 
                placeholder="Ex: CMA-2025-001"
                value={formData.numero_dossier_cma}
                onChange={(e) => setFormData({ ...formData, numero_dossier_cma: e.target.value })}
              />
            </div>
          </div>

          {/* Prix de la formation et Paiement - Uniquement pour financement personnel */}
          {formData.mode_financement === "personnel" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Informations financières</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prixFormation">Prix de la formation (€)</Label>
                  <Input 
                    id="prixFormation" 
                    type="number" 
                    placeholder="1299" 
                    value={formData.montant_ttc}
                    onChange={(e) => setFormData({ ...formData, montant_ttc: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant_paye">Montant payé (€)</Label>
                  <Input 
                    id="montant_paye" 
                    type="number" 
                    placeholder="0" 
                    value={formData.montant_paye}
                    onChange={(e) => setFormData({ ...formData, montant_paye: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="moyen_paiement">Moyen de paiement</Label>
                  <Select 
                    value={formData.moyen_paiement} 
                    onValueChange={(value) => setFormData({ ...formData, moyen_paiement: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="cb">Carte bancaire</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de paiement</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !datePaiement && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datePaiement ? format(datePaiement, "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={datePaiement}
                        onSelect={setDatePaiement}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reste à payer</Label>
                <div className={cn(
                  "h-10 px-3 py-2 rounded-md border flex items-center font-medium",
                  (parseFloat(formData.montant_ttc) || 0) - (parseFloat(formData.montant_paye) || 0) > 0
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-green-50 text-green-700 border-green-200"
                )}>
                  {((parseFloat(formData.montant_ttc) || 0) - (parseFloat(formData.montant_paye) || 0)).toFixed(2)} €
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes et commentaires</Label>
              <textarea 
                id="notes" 
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-y"
                placeholder="Notes internes sur cet apprenant..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
