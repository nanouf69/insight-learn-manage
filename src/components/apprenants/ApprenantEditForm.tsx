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
import { Loader2, CalendarIcon, User, UserCheck, PlusCircle, X, Monitor } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { parseDateRange } from "@/lib/parseDateRange";

// Mapping type d'apprenant → modules par défaut
const DEFAULT_MODULES_BY_TYPE: Record<string, number[]> = {
  // Formation VTC — modules parents uniquement (ID 2 regroupe les matières A-G via expandModulesAutorises)
  "vtc":               [1, 2, 3, 4, 35, 5, 8],
  "vtc-e-presentiel":  [1, 2, 3, 4, 35, 5, 8],
  // Formation VTC E-learning — Intro e-learning
  "vtc-e":             [26, 2, 3, 4, 35, 5, 8],
  // Formation TAXI — matières séparées (10=T3P, 20=Gestion, 21=Sécurité, 22=Français, 23=Anglais, 24=Réglementation)
  "taxi":              [1, 10, 20, 21, 22, 23, 24, 7, 3, 9, 13, 11, 36, 6],
  "taxi-e-presentiel": [1, 10, 20, 21, 22, 23, 24, 7, 3, 9, 13, 11, 36, 6],
  // Formation TAXI E-learning — Intro e-learning
  "taxi-e":            [26, 10, 20, 21, 22, 23, 24, 7, 3, 9, 13, 11, 36, 6],
  // Formation TA présentiel
  "ta":                [31, 40, 7, 3, 27, 28, 37, 6],
  "ta-e-presentiel":   [31, 40, 7, 3, 27, 28, 37, 6],
  // Formation TA E-learning
  "ta-e":              [32, 40, 7, 3, 27, 13, 28, 37, 6],
  // Formation VA
  "va":                [34, 41, 7, 3, 29, 30, 38, 8],
  "va-e-presentiel":   [34, 41, 7, 3, 29, 30, 38, 8],
  "va-e":              [34, 41, 7, 3, 29, 30, 38, 8],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 50, 51, 52, 53, 60, 61, 62, 63]);

const normalizeTypeApprenant = (rawType: string | null | undefined): string => {
  if (!rawType) return "";

  const normalized = rawType.trim().toLowerCase();
  if (!normalized) return "";

  if (DEFAULT_MODULES_BY_TYPE[normalized]) return normalized;

  const dashed = normalized.replace(/\s+/g, "-");
  if (DEFAULT_MODULES_BY_TYPE[dashed]) return dashed;

  const aliases: Record<string, string> = {
    "vtc e": "vtc-e",
    "vtc e presentiel": "vtc-e-presentiel",
    "taxi e": "taxi-e",
    "taxi e presentiel": "taxi-e-presentiel",
    "ta e": "ta-e",
    "ta e presentiel": "ta-e-presentiel",
    "va e": "va-e",
    "va e presentiel": "va-e-presentiel",
  };

  return aliases[normalized] || aliases[dashed] || normalized;
};

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
  inscrit_france_travail?: boolean | null;
  date_examen_pratique?: string | null;
  documents_complets?: boolean | null;
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

// Dates des examens pratiques 2026 (Rhône 69)
const datesExamenPratique = [
  "Du 23 février au 6 mars 2026",
  "Du 4 au 13 mai 2026",
  "Du 29 juin au 7 juillet 2026",
  "Du 1er au 11 septembre 2026",
  "Du 2 au 13 novembre 2026",
  "Du 16 au 23 décembre 2026",
  "Début janvier 2027",
];

// Dates de formation continue 2026
const datesFormationContinue = [
  "27 et 28 janvier 2026",
  "17 et 18 février 2026",
  "31 mars et 1er avril 2026",
  "28 et 29 avril 2026",
  "26 et 27 mai 2026",
  "23 et 24 juin 2026",
  "21 et 22 juillet 2026",
  "29 et 30 septembre 2026",
  "28 et 29 octobre 2026",
  "17 et 18 novembre 2026",
  "23 et 24 décembre 2026",
];

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
  "ta-e-presentiel": "999",
  "continue-vtc": "200",
  "continue-taxi": "299"
};

export function ApprenantEditForm({ apprenant, open, onOpenChange }: ApprenantEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [typeApprenant, setTypeApprenant] = useState<"prospect" | "client">("prospect");
  const [dateDebutFormation, setDateDebutFormation] = useState<Date | undefined>();
  const [dateFinFormation, setDateFinFormation] = useState<Date | undefined>();
  const [datePaiement, setDatePaiement] = useState<Date | undefined>();
  const [selectedDateOption, setSelectedDateOption] = useState("");
  const submitInProgressRef = useRef(false);
  const [inscritFranceTravail, setInscritFranceTravail] = useState(false);
  const [dateExamenPratique, setDateExamenPratique] = useState("");
  const [sessionsDisponibles, setSessionsDisponibles] = useState<{id: string, nom: string, date_debut: string, date_fin: string}[]>([]);
  const [documentsComplets, setDocumentsComplets] = useState(false);
  const [secondFormation, setSecondFormation] = useState("");
  const [secondTypeApprenant, setSecondTypeApprenant] = useState("");
  const [dateDebutCours, setDateDebutCours] = useState<Date | undefined>();
  const [dateFinCours, setDateFinCours] = useState<Date | undefined>();
  const [modulesAutorises, setModulesAutorises] = useState<number[]>([]);
  const [hasTouchedModules, setHasTouchedModules] = useState(false);
  
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
        type_apprenant: normalizeTypeApprenant(apprenant.type_apprenant),
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
      setInscritFranceTravail(apprenant.inscrit_france_travail ?? false);
      setDateExamenPratique(apprenant.date_examen_pratique || "");
      setDocumentsComplets(apprenant.documents_complets ?? false);
      // Restaurer la 2ème formation si elle existe
      const formationChoisie = apprenant.formation_choisie || "";
      if (formationChoisie.includes(" + ")) {
        const parts = formationChoisie.split(" + ");
        setFormData(prev => ({ ...prev, selected_formation: parts[0] }));
        setSecondFormation(parts[1] || "");
      }
      // Restaurer le 2ème type d'apprenant si il existe
      const typeApprenantVal = apprenant.type_apprenant || "";
      const typeParts = typeApprenantVal.split(" + ").map(normalizeTypeApprenant).filter(Boolean);
      const primaryType = typeParts[0] || "";
      const secondaryType = typeParts[1] || "";

      setFormData(prev => ({ ...prev, type_apprenant: primaryType }));
      setSecondTypeApprenant(secondaryType);

      // Restaurer les dates d'accès cours en ligne
      setDateDebutCours((apprenant as any).date_debut_cours_en_ligne ? new Date((apprenant as any).date_debut_cours_en_ligne) : undefined);
      setDateFinCours((apprenant as any).date_fin_cours_en_ligne ? new Date((apprenant as any).date_fin_cours_en_ligne) : undefined);
      setHasTouchedModules(false);
      const savedModulesRaw = (apprenant as any).modules_autorises || [];
      const savedModules = Array.isArray(savedModulesRaw)
        ? savedModulesRaw.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
        : [];

      if (savedModules.length > 0) {
        setModulesAutorises(savedModules);
      } else {
        // Pour les apprenants existants sans modules enregistrés, auto-assigner selon le type
        if (primaryType && DEFAULT_MODULES_BY_TYPE[primaryType]) {
          setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[primaryType]]);
        } else {
          setModulesAutorises([]);
        }
      }
    }
  }, [apprenant]);

  // Charger les sessions pour les dates d'examen pratique (formation continue ou repassage pratique)
  useEffect(() => {
    const needsSessions = formData.selected_formation === "continue-vtc" || formData.selected_formation === "continue-taxi" || formData.selected_formation === "repassage-pratique";
    if (needsSessions && open) {
      const fetchSessions = async () => {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, nom, date_debut, date_fin')
          .order('date_debut', { ascending: true });
        
        if (!error && data) {
          setSessionsDisponibles(data.map(s => ({ id: s.id, nom: s.nom || '', date_debut: s.date_debut, date_fin: s.date_fin })));
        }
      };
      fetchSessions();
    }
  }, [formData.selected_formation, open]);

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

  const normalizedFormType = normalizeTypeApprenant(formData.type_apprenant);
  const formationKey = (formData.selected_formation || "").split(" + ")[0];
  const fallbackTypeFromFormation = normalizeTypeApprenant(formationToType[formationKey]);
  const fallbackDefaultModules = DEFAULT_MODULES_BY_TYPE[normalizedFormType]
    || (fallbackTypeFromFormation ? DEFAULT_MODULES_BY_TYPE[fallbackTypeFromFormation] : undefined)
    || [];
  const effectiveModulesAutorises = (modulesAutorises.length > 0 || hasTouchedModules)
    ? modulesAutorises
    : fallbackDefaultModules;

  const handleFormationChange = (value: string) => {
    const newType = formationToType[value] || undefined;
    const updates: any = {
      selected_formation: value,
      montant_ttc: prixFormations[value] || undefined,
      type_apprenant: newType
    };

    // Pour les RP, forcer le mode de financement à "personnel"
    if (value === "repassage-pratique" || value === "repassage-theorique") {
      updates.mode_financement = "personnel";
      updates.organisme_financeur = "personnel";
    }

    setFormData(prev => ({
      ...prev,
      ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined))
    }));

    // Auto-assigner les modules par défaut selon le type
    if (newType && DEFAULT_MODULES_BY_TYPE[newType]) {
      setHasTouchedModules(false);
      setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[newType]]);
    }
    
    if (value === "vtc" || value === "vtc-exam") {
      setSelectedDateOption(datesFormations.vtc.dates[0]);
    } else if (value === "taxi" || value === "taxi-exam") {
      setSelectedDateOption(datesFormations.taxi.dates[0]);
    } else if (value === "passerelle-taxi") {
      setSelectedDateOption(datesFormations.ta.dates[0]);
    } else {
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
      type_apprenant: secondTypeApprenant ? `${formData.type_apprenant} + ${secondTypeApprenant}` : (formData.type_apprenant || null),
      formation_choisie: secondFormation ? `${formData.selected_formation} + ${secondFormation}` : (formData.selected_formation || null),
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
      inscrit_france_travail: inscritFranceTravail,
      date_examen_pratique: dateExamenPratique || null,
      documents_complets: documentsComplets,
      date_debut_cours_en_ligne: dateDebutCours ? format(dateDebutCours, 'yyyy-MM-dd') : null,
      date_fin_cours_en_ligne: dateFinCours ? format(dateFinCours, 'yyyy-MM-dd') : null,
      modules_autorises: effectiveModulesAutorises.length > 0 ? effectiveModulesAutorises : null,
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

          {/* Inscrit à France Travail */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="edit-inscritFranceTravail" className="text-sm font-medium">Inscrit à France Travail</Label>
              <p className="text-xs text-muted-foreground">L'apprenant est-il inscrit à France Travail ?</p>
            </div>
            <Switch
              id="edit-inscritFranceTravail"
              checked={inscritFranceTravail}
              onCheckedChange={setInscritFranceTravail}
            />
          </div>

          {/* Possession des documents */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="edit-documentsComplets" className="text-sm font-medium">Possession des documents</Label>
              <p className="text-xs text-muted-foreground">L'apprenant a-t-il fourni tous ses documents ?</p>
            </div>
            <Switch
              id="edit-documentsComplets"
              checked={documentsComplets}
              onCheckedChange={setDocumentsComplets}
            />
          </div>

          {/* Formation ou Service */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation ou Service</h3>

            <div className="space-y-2">
              <Label htmlFor="formation">Formations ou Services souhaités</Label>
              <Select value={formData.selected_formation} onValueChange={handleFormationChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une formation ou un service" />
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
                  <SelectGroup>
                    <SelectLabel>Formations Continues</SelectLabel>
                    <SelectItem value="continue-vtc">Formation continue VTC - 200 €</SelectItem>
                    <SelectItem value="continue-taxi">Formation continue TAXI - 299 €</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Services</SelectLabel>
                    <SelectItem value="location-vehicule">Location de véhicule</SelectItem>
                    <SelectItem value="formation-et-location">Formation et location de véhicule</SelectItem>
                    <SelectItem value="repassage-theorique">Repassage examen théorique</SelectItem>
                    <SelectItem value="repassage-pratique">Repassage examen pratique</SelectItem>
                    <SelectItem value="passage-pratique">Passage examen pratique</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Formation supplémentaire */}
            {secondFormation ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Formation supplémentaire</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => setSecondFormation("")}>
                    <X className="h-3 w-3 mr-1" /> Supprimer
                  </Button>
                </div>
                <Select value={secondFormation} onValueChange={setSecondFormation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une 2ème formation" />
                  </SelectTrigger>
                  <SelectContent>
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
                    <SelectGroup>
                      <SelectLabel>Formations Continues</SelectLabel>
                      <SelectItem value="continue-vtc">Formation continue VTC - 200 €</SelectItem>
                      <SelectItem value="continue-taxi">Formation continue TAXI - 299 €</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Marketing Digital</SelectLabel>
                      <SelectItem value="marketing-digital-24h">Marketing Digital 24H - 1 500 €</SelectItem>
                      <SelectItem value="marketing-digital-26h">Marketing Digital 26H - 2 100 €</SelectItem>
                      <SelectItem value="marketing-digital-28h">Marketing Digital 28H - 3 300 €</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Anglais Professionnel</SelectLabel>
                      <SelectItem value="anglais-17h">Anglais Professionnel 17H - 1 200 €</SelectItem>
                      <SelectItem value="anglais-28h">Anglais Professionnel 28H - 2 000 €</SelectItem>
                      <SelectItem value="anglais-35h">Anglais Professionnel 35H - 3 000 €</SelectItem>
                      <SelectItem value="anglais-45h">Anglais Professionnel 45H - 4 500 €</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Services</SelectLabel>
                      <SelectItem value="location-vehicule">Location de véhicule</SelectItem>
                      <SelectItem value="formation-et-location">Formation et location de véhicule</SelectItem>
                      <SelectItem value="repassage-theorique">Repassage examen théorique</SelectItem>
                      <SelectItem value="repassage-pratique">Repassage examen pratique</SelectItem>
                      <SelectItem value="passage-pratique">Passage examen pratique</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setSecondFormation("continue-vtc")}>
                <PlusCircle className="h-4 w-4" />
                Ajouter une formation supplémentaire
              </Button>
            )}

            {/* Type d'apprenant - rempli automatiquement */}
            <div className="space-y-2">
              <Label htmlFor="type_apprenant">Type d'apprenant</Label>
              <Select value={formData.type_apprenant} onValueChange={(value) => {
                setFormData({ ...formData, type_apprenant: value });
                if (DEFAULT_MODULES_BY_TYPE[value]) {
                  setHasTouchedModules(false);
                  setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[value]]);
                }
              }}>
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
                  <SelectItem value="va">VA (Passerelle VTC)</SelectItem>
                  <SelectItem value="va-e">VA E (Passerelle VTC E-learning)</SelectItem>
                  <SelectItem value="va-e-presentiel">VA E Présentiel</SelectItem>
                  <SelectItem value="pa-vtc">PA VTC</SelectItem>
                  <SelectItem value="pa-taxi">PA TAXI</SelectItem>
                  <SelectItem value="rp-vtc">RP VTC</SelectItem>
                  <SelectItem value="rp-taxi">RP TAXI</SelectItem>
                </SelectContent>
              </Select>
              {formData.type_apprenant && (
                <p className="text-xs text-muted-foreground">
                  Défini automatiquement selon la formation sélectionnée
                </p>
              )}
            </div>

            {/* Second type d'apprenant */}
            {secondTypeApprenant ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Type d'apprenant supplémentaire</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => setSecondTypeApprenant("")}>
                    <X className="w-3 h-3 mr-1" /> Supprimer
                  </Button>
                </div>
                <Select value={secondTypeApprenant} onValueChange={setSecondTypeApprenant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vtc">VTC</SelectItem>
                    <SelectItem value="taxi">TAXI</SelectItem>
                    <SelectItem value="ta">TA</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="vtc-e">VTC E</SelectItem>
                    <SelectItem value="taxi-e">TAXI E</SelectItem>
                    <SelectItem value="ta-e">TA E</SelectItem>
                    <SelectItem value="pa-vtc">PA VTC</SelectItem>
                    <SelectItem value="pa-taxi">PA TAXI</SelectItem>
                    <SelectItem value="rp-vtc">RP VTC</SelectItem>
                    <SelectItem value="rp-taxi">RP TAXI</SelectItem>
                    <SelectItem value="vtc-e-presentiel">VTC E Présentiel</SelectItem>
                    <SelectItem value="taxi-e-presentiel">TAXI E Présentiel</SelectItem>
                    <SelectItem value="ta-e-presentiel">TA E Présentiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-2 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setSecondTypeApprenant("vtc")}>
                <PlusCircle className="w-4 h-4" />
                Ajouter un type d'apprenant supplémentaire
              </Button>
            )}

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

            {/* Date d'examen théorique - masqué pour repassage pratique, passage pratique et formation continue */}
            {formData.selected_formation !== "repassage-pratique" && formData.selected_formation !== "passage-pratique" && formData.selected_formation !== "continue-vtc" && formData.selected_formation !== "continue-taxi" && (
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
            )}

            {/* Date d'examen pratique - pour repassage pratique et passage pratique */}
            {(formData.selected_formation === "repassage-pratique" || formData.selected_formation === "passage-pratique") && (
              <div className="space-y-2">
                <Label htmlFor="dateExamenPratique">Date d'examen pratique (Rhône 69) *</Label>
                <Select value={dateExamenPratique} onValueChange={setDateExamenPratique}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une date d'examen pratique" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="pas_encore_choisi">Pas de date choisie encore</SelectItem>
                    {datesExamenPratique.map((date, idx) => (
                      <SelectItem key={idx} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dates de formation continue */}
            {(formData.selected_formation === "continue-vtc" || formData.selected_formation === "continue-taxi") && (
              <div className="space-y-2">
                <Label htmlFor="dateExamenPratique">Dates de formation continue</Label>
                <Select value={dateExamenPratique} onValueChange={setDateExamenPratique}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner les dates de formation continue" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="pas_encore_choisi">Pas de date choisie encore</SelectItem>
                    {datesFormationContinue.map((date, idx) => (
                      <SelectItem key={idx} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>
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

          {/* Section paiement pour RP (repassage) */}
          {formData.selected_formation === "repassage-pratique" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Paiement repassage</h3>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Location de véhicule</span>
                  <span className="font-semibold">80,00 €</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="moyen_paiement">Moyen de paiement</Label>
                  <Select 
                    value={formData.moyen_paiement} 
                    onValueChange={(value) => setFormData({ ...formData, moyen_paiement: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cb">Carte bancaire</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="space-y-2">
                <Label>Reste à payer</Label>
                <div className={cn(
                  "h-10 px-3 py-2 rounded-md border flex items-center font-medium",
                  80 - (parseFloat(formData.montant_paye) || 0) > 0
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-green-50 text-green-700 border-green-200"
                )}>
                  {(80 - (parseFloat(formData.montant_paye) || 0)).toFixed(2)} €
                </div>
              </div>
            </div>
          )}

          {/* Prix de la formation et Paiement - Masqué pour repassage/passage examen et PA */}
          {formData.mode_financement === "personnel" && !["repassage-theorique", "repassage-pratique", "passage-pratique"].includes(formData.selected_formation) && !["pa-vtc", "pa-taxi"].includes(formData.type_apprenant) && (
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

          {/* Accès cours en ligne */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Accès cours en ligne
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début d'accès</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateDebutCours && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateDebutCours ? format(dateDebutCours, "dd/MM/yyyy") : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateDebutCours} onSelect={setDateDebutCours} initialFocus locale={fr} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Date de fin d'accès</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFinCours && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFinCours ? format(dateFinCours, "dd/MM/yyyy") : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFinCours} onSelect={setDateFinCours} initialFocus locale={fr} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modules autorisés</Label>
              <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto border rounded-md p-3">
                {MODULES_DATA.filter(m => MANAGED_MODULE_IDS.has(m.id)).map((mod) => {
                  const isIntro = mod.nom.includes("INTRODUCTION");
                  const isTA = mod.nom.includes(" TA") || mod.formations.includes("taxi-pour-vtc" as any);
                  const isVA = mod.nom.includes(" VA") || mod.formations.includes("vtc-pour-taxi" as any);
                  const isVTC = !isIntro && !isTA && !isVA && mod.formations.some((f: string) => f.includes("vtc"));
                  const isTaxi = !isIntro && !isTA && !isVA && mod.formations.some((f: string) => f.includes("taxi"));
                  const isCommon = isVTC && isTaxi;

                  let colorClass = "bg-muted/30 border-muted";
                  let dotColor = "bg-gray-400";
                  let label = "";
                  if (isIntro) { colorClass = "bg-blue-50 border-blue-200"; dotColor = "bg-blue-500"; label = "INTRO"; }
                  else if (isCommon) { colorClass = "bg-purple-50 border-purple-200"; dotColor = "bg-purple-500"; label = "COMMUN"; }
                  else if (isTA) { colorClass = "bg-amber-50 border-amber-200"; dotColor = "bg-amber-500"; label = "TA"; }
                  else if (isVA) { colorClass = "bg-teal-50 border-teal-200"; dotColor = "bg-teal-500"; label = "VA"; }
                  else if (isVTC) { colorClass = "bg-emerald-50 border-emerald-200"; dotColor = "bg-emerald-500"; label = "VTC"; }
                  else if (isTaxi) { colorClass = "bg-orange-50 border-orange-200"; dotColor = "bg-orange-500"; label = "TAXI"; }

                  return (
                    <label key={mod.id} className={cn("flex items-center gap-2 py-1.5 cursor-pointer rounded px-2 border", colorClass)}>
                      <Checkbox
                        checked={effectiveModulesAutorises.includes(mod.id)}
                        onCheckedChange={(checked) => {
                          setHasTouchedModules(true);
                          const baseModules = (modulesAutorises.length > 0 || hasTouchedModules)
                            ? modulesAutorises
                            : fallbackDefaultModules;
                          const nextModules = checked
                            ? Array.from(new Set([...baseModules, mod.id]))
                            : baseModules.filter(id => id !== mod.id);
                          setModulesAutorises(nextModules);
                        }}
                      />
                      <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                      <span className="text-sm flex-1">{mod.nom}</span>
                      {label && <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", dotColor, "text-white")}>{label}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

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
