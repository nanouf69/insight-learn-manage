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
import { Switch } from "@/components/ui/switch";
import { Plus, User, UserCheck, Loader2, CalendarIcon, PlusCircle, X, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { autoAssignToSession } from "@/hooks/useAutoAssignSession";
import { parseDateRange } from "@/lib/parseDateRange";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";
import { filterFutureExamDates, filterFutureDateStrings } from "@/lib/filterPastDates";

// Mapping type d'apprenant → modules par défaut
const DEFAULT_MODULES_BY_TYPE: Record<string, number[]> = {
  // Formation VTC — modules parents uniquement (ID 2 regroupe les matières A-G via expandModulesAutorises)
  "vtc":               [1, 2, 3, 4, 35, 5, 8],
  "vtc-e-presentiel":  [1, 2, 3, 4, 35, 5, 8],
  // Formation VTC E-learning — Intro e-learning
  "vtc-e":             [26, 2, 3, 4, 35, 5, 8],
  // Formation TAXI — module parent uniquement
  "taxi":              [1, 10, 7, 3, 9, 13, 11, 36, 6],
  "taxi-e-presentiel": [1, 10, 7, 3, 9, 13, 11, 36, 6],
  // Formation TAXI E-learning — Intro e-learning
  "taxi-e":            [26, 10, 7, 3, 9, 13, 11, 36, 6],
  // Formation TA présentiel
  "ta":                [31, 40, 7, 3, 27, 28, 37, 6],
  "ta-e-presentiel":   [31, 40, 7, 3, 27, 28, 37, 6],
  // Formation TA E-learning
  "ta-e":              [32, 40, 7, 3, 27, 13, 28, 37, 6],
  // Formation VA
  "va":                [34, 41, 3, 29, 30, 38, 8],
  "va-e-presentiel":   [34, 41, 3, 29, 30, 38, 8],
  "va-e":              [34, 41, 3, 29, 30, 38, 8],
  // Formation Continue VTC — bilan exercices uniquement (sans gestion)
  "continue-vtc":      [81],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 50, 51, 52, 53, 60, 61, 62, 63, 64, 81]);

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
}

// Liste des dates par type de formation (présentiel uniquement)
const datesFormations = {
  vtc: {
    label: "Formation VTC",
    dates: filterFutureDateStrings([
      "Du 12 au 25 janvier 2026",
      "Du 16 au 30 mars 2026",
      "Du 11 au 24 mai 2026",
      "Du 6 au 19 juillet 2026",
      "Du 14 au 27 septembre 2026",
      "Du 2 au 15 novembre 2026"
    ])
  },
  taxi: {
    label: "Formation TAXI",
    dates: filterFutureDateStrings([
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ])
  },
  ta: {
    label: "Formation TAXI pour chauffeur VTC (TA)",
    dates: filterFutureDateStrings([
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ])
  }
};

// Dates centralisées — on affiche TOUTES les dates (y compris passées) pour le dossier apprenant
import { ALL_DATES_EXAMEN_THEORIQUE, ALL_DATES_EXAMEN_PRATIQUE } from '@/lib/examDatesConfig';
const datesExamenTheorique = ALL_DATES_EXAMEN_THEORIQUE;
const datesExamenPratique = ALL_DATES_EXAMEN_PRATIQUE;
const datesFormationContinue = filterFutureDateStrings([
  "26 et 27 mai 2026",
  "23 et 24 juin 2026",
  "21 et 22 juillet 2026",
  "29 et 30 septembre 2026",
  "28 et 29 octobre 2026",
  "17 et 18 novembre 2026",
  "23 et 24 décembre 2026",
]);

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
  const [datePaiement, setDatePaiement] = useState<Date | undefined>();
  const [montantPayeRp, setMontantPayeRp] = useState("");
  const [inscritFranceTravail, setInscritFranceTravail] = useState(false);
  const [dateExamenPratique, setDateExamenPratique] = useState("");
  const [sessionsDisponibles, setSessionsDisponibles] = useState<{id: string, nom: string, date_debut: string, date_fin: string}[]>([]);
  const [documentsComplets, setDocumentsComplets] = useState(false);
  const [secondFormation, setSecondFormation] = useState("");
  const [secondTypeApprenant, setSecondTypeApprenant] = useState("");
  const [modulesAutorises, setModulesAutorises] = useState<number[]>([]);

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
    "ta-e-presentiel": "999",
    "continue-vtc": "200",
    "continue-taxi": "299",
    "marketing-digital-24h": "1500",
    "marketing-digital-26h": "2100",
    "marketing-digital-28h": "3300",
    "anglais-20h": "1200",
    "anglais-35h": "2000",
    "anglais-45h": "3000"
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
    "ta-e-presentiel": "ta-e-presentiel",
    "continue-vtc": "vtc",
    "continue-taxi": "taxi",
    "marketing-digital-24h": "marketing-digital",
    "marketing-digital-26h": "marketing-digital",
    "marketing-digital-28h": "marketing-digital",
    "anglais-20h": "anglais",
    "anglais-35h": "anglais",
    "anglais-45h": "anglais"
  };

  // Mettre à jour le prix, le type d'apprenant et les dates par défaut quand la formation change
  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    if (prixFormations[value]) {
      setMontantTtc(prixFormations[value]);
    }
    if (formationToType[value]) {
      const newType = formationToType[value];
      setTypeApprenantFormation(newType);
      // Pré-sélectionner les modules par défaut selon le type
      if (DEFAULT_MODULES_BY_TYPE[newType]) {
        setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[newType]]);
      }
    }

    // Pour les RP, forcer le mode de financement à "personnel"
    if (value === "repassage-pratique" || value === "repassage-theorique") {
      setFinancement("personnel");
      setOrganismeFinanceur("personnel");
    }
    
    // Pré-sélectionner automatiquement la première date de formation selon le type (présentiel uniquement)
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

  // Charger les apprenants existants + initialiser les modules par défaut
  useEffect(() => {
    if (open) {
      const fetchApprenants = async () => {
        const { data, error } = await supabase
          .from('apprenants')
          .select('id, nom, prenom')
          .order('nom', { ascending: true });
        
        if (!error && data) {
          setApprenants(data);
        }
      };
      fetchApprenants();
      
      // Initialiser les modules si vides (premier affichage)
      if (modulesAutorises.length === 0 && DEFAULT_MODULES_BY_TYPE[typeApprenantFormation]) {
        setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[typeApprenantFormation]]);
      }
    }
  }, [open]);

  // Charger les sessions pour les dates d'examen pratique (formation continue ou repassage pratique)
  useEffect(() => {
    const needsSessions = selectedFormation === "continue-vtc" || selectedFormation === "continue-taxi" || selectedFormation === "repassage-pratique";
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
  }, [selectedFormation, open]);

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
    setInscritFranceTravail(false);
    setDateExamenPratique("");
    setDocumentsComplets(false);
    setSecondFormation("");
    setSecondTypeApprenant("");
    setModulesAutorises([]);
  };

  // Ref pour éviter les doubles soumissions
  const submitInProgressRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Protection contre les doubles clics
    if (submitInProgressRef.current || isLoading) return;
    submitInProgressRef.current = true;
    setIsLoading(true);

    // Validation : date d'examen pratique obligatoire pour RP pratique et PA pratique
    if ((selectedFormation === "repassage-pratique" || selectedFormation === "passage-pratique") && (!dateExamenPratique || dateExamenPratique === "pas_encore_choisi")) {
      toast({ title: "Date d'examen obligatoire", description: "Veuillez sélectionner une date d'examen pratique.", variant: "destructive" });
      setIsLoading(false);
      submitInProgressRef.current = false;
      return;
    }

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
      type_apprenant: secondTypeApprenant ? `${typeApprenantFormation} + ${secondTypeApprenant}` : (typeApprenantFormation || null),
      formation_choisie: secondFormation ? `${selectedFormation} + ${secondFormation}` : (selectedFormation || null),
      montant_ttc: montantTtc ? parseFloat(montantTtc) : null,
      date_formation_catalogue: selectedDateOption || null,
      date_debut_formation: dateDebutFormation 
        ? format(dateDebutFormation, 'yyyy-MM-dd') 
        : (selectedDateOption ? parseDateRange(selectedDateOption).dateDebut : null),
      date_fin_formation: dateFinFormation 
        ? format(dateFinFormation, 'yyyy-MM-dd') 
        : (selectedDateOption ? parseDateRange(selectedDateOption).dateFin : null),
      creneau_horaire: creneauHoraire || null,
      date_examen_theorique: dateExamenTheorique || null,
      inscrit_france_travail: inscritFranceTravail,
      date_examen_pratique: dateExamenPratique || null,
      documents_complets: documentsComplets,
      modules_autorises: modulesAutorises.length > 0 ? modulesAutorises : null,
    };

    try {
      const { data: newApprenant, error } = await supabase
        .from('apprenants')
        .insert(formData)
        .select()
        .single();

      if (error) throw error;

      // Auto-assign to session if client (not prospect)
      let sessionInfo = "";
      if (typeApprenant === "client" && newApprenant) {
        const result = await autoAssignToSession(
          newApprenant.id,
          formData.type_apprenant,
          formData.creneau_horaire,
          formData.date_formation_catalogue,
          formData.montant_ttc
        );
        
        if (result.success && result.sessionName) {
          sessionInfo = result.created 
            ? ` et assigné à la nouvelle session "${result.sessionName}"`
            : ` et assigné à la session "${result.sessionName}"`;
        }
      }

      // Auto-envoi des emails (pré-information + bienvenue)
      let emailPreInfoSent = false;
      let emailBienvenueSent = false;
      if (newApprenant && formData.email) {
        const ONBOARDING_URL = "https://insight-learn-manage.lovable.app/bienvenue";
        
        // Déterminer le type de pré-info (vtc, taxi, ta, va)
        const baseType = typeApprenantFormation.replace(/-e$/, '').replace(/-e-presentiel$/, '');
        const preInfoType = ['vtc', 'taxi', 'ta', 'va'].includes(baseType) ? baseType : null;

        // Déterminer le label de formation pour le mail de bienvenue
        const formationLabels: Record<string, string> = {
          'vtc': 'VTC', 'vtc-e': 'VTC (E-learning)', 'vtc-e-presentiel': 'VTC (E-learning + Présentiel)',
          'taxi': 'TAXI', 'taxi-e': 'TAXI (E-learning)', 'taxi-e-presentiel': 'TAXI (E-learning + Présentiel)',
          'ta': 'Passerelle TA (VTC→TAXI)', 'ta-e': 'Passerelle TA (E-learning)', 'ta-e-presentiel': 'Passerelle TA (E-learning + Présentiel)',
          'va': 'Passerelle VA (TAXI→VTC)', 'va-e': 'Passerelle VA (E-learning)', 'va-e-presentiel': 'Passerelle VA (E-learning + Présentiel)',
        };
        const formationLabel = formationLabels[typeApprenantFormation] || typeApprenantFormation.toUpperCase();

        // 1) Email pré-information
        if (preInfoType) {
          try {
            const templateId = `pre-information-${preInfoType}-sans-date`;
            const { data: tpl } = await supabase
              .from('email_templates')
              .select('subject_template, body_template')
              .eq('id', templateId)
              .single();
            
            if (tpl) {
              const vars: Record<string, string> = {
                '{{prenom}}': formData.prenom,
                '{{nom}}': formData.nom,
                '{{email}}': formData.email,
                '{{apprenant_id}}': newApprenant.id,
                '{{formation}}': formData.formation_choisie || '',
                '{{date_debut}}': formData.date_debut_formation || '',
              };
              let subject = tpl.subject_template;
              let body = tpl.body_template;
              for (const [key, val] of Object.entries(vars)) {
                subject = subject.split(key).join(val);
                body = body.split(key).join(val);
              }
              await supabase.functions.invoke('sync-outlook-emails', {
                body: { action: 'send', apprenantId: newApprenant.id, userEmail: 'contact@ftransport.fr', to: formData.email, subject, body },
              });
              emailPreInfoSent = true;
            }
          } catch (err) {
            console.error('Erreur envoi email pré-information:', err);
          }
        }

        // 2) Email de bienvenue (onboarding)
        try {
          const bienvenueSubject = `Bienvenue chez Ftransport - ${formData.prenom} ${formData.nom}`;
          const bienvenueBody = `<p>Bonjour ${formData.prenom} ${formData.nom},</p>
<p>Nous avons le plaisir de vous confirmer votre inscription à la formation <strong>${formationLabel}</strong>.</p>
<p>🚨 <strong style="color: #dc2626;">IMPORTANT : Afin de valider définitivement votre inscription à l'examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l'examen.</strong></p>
<p>👉 <strong><a href="${ONBOARDING_URL}">CLIQUEZ ICI POUR COMPLÉTER VOTRE DOSSIER D'INSCRIPTION</a></strong></p>
<p>⚠️ <strong>Ce dossier est OBLIGATOIRE. Sans celui-ci complété, vous ne pourrez pas effectuer votre formation.</strong></p>
<p>Pour toute question :<br>📞 04 28 29 60 91<br>📧 contact@ftransport.fr</p>
<p>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon</p>`;

          await supabase.functions.invoke('sync-outlook-emails', {
            body: { action: 'send', apprenantId: newApprenant.id, userEmail: 'contact@ftransport.fr', to: formData.email, subject: bienvenueSubject, body: bienvenueBody },
          });
          emailBienvenueSent = true;
        } catch (err) {
          console.error('Erreur envoi email bienvenue:', err);
        }
      }

      const emailInfoParts: string[] = [];
      if (emailPreInfoSent) emailInfoParts.push("Pré-information");
      if (emailBienvenueSent) emailInfoParts.push("Bienvenue");
      const emailInfo = emailInfoParts.length > 0 ? ` — Emails envoyés : ${emailInfoParts.join(" + ")} ✉️` : "";
      toast({
        title: "Apprenant ajouté",
        description: `${formData.prenom} ${formData.nom} a été ajouté en tant que ${typeApprenant === "prospect" ? "prospect" : "client"}${sessionInfo}.${emailInfo}`,
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

          {/* Inscrit à France Travail */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="inscritFranceTravail" className="text-sm font-medium">Inscrit à France Travail</Label>
              <p className="text-xs text-muted-foreground">L'apprenant est-il inscrit à France Travail ?</p>
            </div>
            <Switch
              id="inscritFranceTravail"
              checked={inscritFranceTravail}
              onCheckedChange={setInscritFranceTravail}
            />
          </div>

          {/* Possession des documents */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-0.5">
              <Label htmlFor="documentsComplets" className="text-sm font-medium">Possession des documents</Label>
              <p className="text-xs text-muted-foreground">L'apprenant a-t-il fourni tous ses documents ?</p>
            </div>
            <Switch
              id="documentsComplets"
              checked={documentsComplets}
              onCheckedChange={setDocumentsComplets}
            />
          </div>

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
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Formation ou Service</h3>
            <div className="space-y-2">
              <Label htmlFor="formation">Formations ou Services souhaités {typeApprenant === "client" && "*"}</Label>
              <Select value={selectedFormation} onValueChange={handleFormationChange} required={typeApprenant === "client"}>
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
              <Label htmlFor="typeApprenantFormation">Type d'apprenant</Label>
              <Select value={typeApprenantFormation} onValueChange={(v) => {
                setTypeApprenantFormation(v);
                if (DEFAULT_MODULES_BY_TYPE[v]) {
                  setModulesAutorises([...DEFAULT_MODULES_BY_TYPE[v]]);
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
                  <SelectItem value="va-e">VA E (Passerelle VTC E-learning)</SelectItem>
                  <SelectItem value="pa-vtc">PA VTC</SelectItem>
                  <SelectItem value="pa-taxi">PA TAXI</SelectItem>
                  <SelectItem value="rp-vtc">RP VTC</SelectItem>
                  <SelectItem value="rp-taxi">RP TAXI</SelectItem>
                  <SelectItem value="marketing-digital">Marketing Digital</SelectItem>
                  <SelectItem value="anglais">Anglais Professionnel</SelectItem>
                </SelectContent>
              </Select>
              {typeApprenantFormation && (
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

            {/* Modules autorisés — checkboxes */}
            {modulesAutorises.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Modules autorisés ({modulesAutorises.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setModulesAutorises(MODULES_DATA.filter(m => MANAGED_MODULE_IDS.has(m.id)).map(m => m.id))}
                    >
                      Tout cocher
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setModulesAutorises([])}
                    >
                      Tout décocher
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto rounded-lg border p-3">
                  {MODULES_DATA.filter(m => MANAGED_MODULE_IDS.has(m.id)).map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    >
                      <Checkbox
                        checked={modulesAutorises.includes(mod.id)}
                        onCheckedChange={(checked) => {
                          setModulesAutorises(prev =>
                            checked
                              ? [...prev, mod.id]
                              : prev.filter(id => id !== mod.id)
                          );
                        }}
                      />
                      <span className="truncate">{mod.nom}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pré-rempli selon le type d'apprenant. Vous pouvez cocher/décocher manuellement.
                </p>
              </div>
            )}

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
                  <SelectItem value="repassage">Repassage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date d'examen théorique - masqué pour repassage pratique, passage pratique et formation continue */}
            {selectedFormation !== "repassage-pratique" && selectedFormation !== "passage-pratique" && selectedFormation !== "continue-vtc" && selectedFormation !== "continue-taxi" && (
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
            )}

            {/* Date d'examen pratique - pour repassage pratique et passage pratique */}
            {(selectedFormation === "repassage-pratique" || selectedFormation === "passage-pratique") && (
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
            {(selectedFormation === "continue-vtc" || selectedFormation === "continue-taxi") && (
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

          {/* Prix de la formation - Masqué pour repassage/passage examen */}
          {!["repassage-theorique", "repassage-pratique", "passage-pratique"].includes(selectedFormation) && !["pa-vtc", "pa-taxi"].includes(typeApprenantFormation) && (
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
          </div>
          )}

          {/* Section paiement pour RP (repassage) */}
          {selectedFormation === "repassage-pratique" && (
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
                  <Label htmlFor="montantPayeRp">Montant payé (€)</Label>
                  <Input 
                    id="montantPayeRp" 
                    type="number" 
                    placeholder="0" 
                    min="0"
                    max="80"
                    step="0.01"
                    value={montantPayeRp}
                    onChange={(e) => setMontantPayeRp(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moyenPaiementRp">Moyen de paiement</Label>
                  <Select>
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
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reste à payer</span>
                  <span className={cn(
                    "font-semibold",
                    (80 - (parseFloat(montantPayeRp) || 0)) > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {(80 - (parseFloat(montantPayeRp) || 0)).toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Informations financières - Uniquement si financement personnel */}
          {organismeFinanceur === "personnel" && !["repassage-theorique", "repassage-pratique", "passage-pratique"].includes(selectedFormation) && !["pa-vtc", "pa-taxi"].includes(typeApprenantFormation) && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Informations financières</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montantPaye">Montant payé (€)</Label>
                  <Input 
                    id="montantPaye" 
                    type="number" 
                    placeholder="0" 
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moyenPaiement">Moyen de paiement</Label>
                  <Select>
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
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reste à payer</span>
                  <span className="font-semibold">{montantTtc ? `${parseFloat(montantTtc).toFixed(2)} €` : "0.00 €"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" placeholder="Informations complémentaires..." />
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
