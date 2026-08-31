import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDateShortFR, formatDateFR } from "@/lib/safeDateParse";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Mail, 
  Phone, 
  FileText, 
  FileCheck,
  Plus, 
  Search,
  UserCog,
  X,
  Download,
  Loader2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  GraduationCap,
  StickyNote,
  CreditCard,
  Euro,
  Save,
  Send,
  UserPlus,
  Pencil,
  KeyRound,
  Copy,
  Printer,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ArrowRightLeft,
} from "lucide-react";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";
import { ALL_MODULES, FORMATION_MODULES, MANAGED_MODULE_IDS, DEFAULT_MODULES_BY_TYPE } from "@/components/cours-en-ligne/modules-config";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generateEmargementPDF } from "./EmargementGenerator";
import { generateEmargementIndividuelPDF, AgendaDaySlot } from "./EmargementIndividuelGenerator";
import { supabase } from "@/integrations/supabase/client";
import { isPratiqueType } from "@/lib/sessionTypes";
import { generateAttestationFCVTC } from "@/lib/pdf/attestation-fc-vtc";
import { generateFactureFC } from "@/lib/pdf/facture-fc";
import { saveFactureToCRM } from "@/lib/saveFactureToCRM";
import { saveAttestationToCRM } from "@/lib/saveAttestationToCRM";
import { saveEmargementToCRM } from "@/lib/saveEmargementToCRM";
import { getPratiqueDatesForFormation, getTheoriqueDateForFormation } from "@/lib/pratiquePeriodes";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computePresenceHours, formatPresenceHours, isEveningTrainingValue, isFormationContinueValue } from "@/lib/emargementHours";
import { filterAndSortApprenants } from "@/lib/apprenantSearch";
import { SmallTransfersTable } from "@/components/dashboard/SmallTransfersTable";
import GrilleNotationConduite from "./GrilleNotationConduite";
import { fetchPlanningDaySlotsForDates, normalizePratiqueCreneau, resolvePratiqueSlotParts } from "@/lib/pratiqueSlots";

interface Session {
  id: string;
  title: string;
  formation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  formateur: string;
  participants: number;
  maxParticipants: number;
  status: string;
  type_session?: string;
  creneaux?: string[] | string | null;
}

interface SessionDetailProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToApprenant?: (apprenantId: string) => void;
  asPage?: boolean;
  onBack?: () => void;
}

// Interface pour l'apprenant depuis la base de données
interface ApprenantDB {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  civilite?: string | null;
  type_apprenant: string | null;
  formation_choisie?: string | null;
  mode_financement: string | null;
  numero_dossier_cma: string | null;
  mot_de_passe_cma?: string | null;
  date_debut_formation: string | null;
  date_fin_formation: string | null;
  date_examen_theorique: string | null;
  date_examen_pratique: string | null;
  statut: string | null;
  creneau_horaire?: string | null;
  documents_complets?: boolean | null;
}

const modesFinancement = [
  { value: "cpf", label: "CPF", color: "bg-purple-100 text-purple-700" },
  { value: "personnel", label: "Personnel", color: "bg-gray-100 text-gray-700" },
  { value: "opco", label: "OPCO", color: "bg-blue-100 text-blue-700" },
  { value: "france_travail", label: "France Travail", color: "bg-orange-100 text-orange-700" },
  { value: "autre", label: "Autre", color: "bg-slate-100 text-slate-700" },
];

const ORDERED_FORMATION_MODULES = Object.fromEntries(
  Object.entries(FORMATION_MODULES).map(([k, v]) => [k, v.modules])
);

const COMPTE_FORMATIONS = [
  { id: "vtc", label: "VTC (Présentiel)" },
  { id: "vtc-e", label: "VTC E-learning" },
  { id: "continue-vtc", label: "Formation continue VTC" },
  { id: "taxi", label: "TAXI (Présentiel)" },
  { id: "taxi-e", label: "TAXI E-learning" },
  { id: "continue-taxi", label: "Formation continue TAXI" },
  { id: "mobilite-taxi", label: "Formation Mobilité TAXI" },
  { id: "ta", label: "TA (Présentiel)" },
  { id: "ta-e", label: "TA E-learning" },
  { id: "va", label: "VA (Présentiel)" },
  { id: "va-e", label: "VA E-learning" },
] as const;

const ACCOUNT_FORMATION_TO_TYPE: Record<string, string> = {
  vtc: "vtc", "vtc-e": "vtc-e", taxi: "taxi", "taxi-e": "taxi-e",
  "continue-vtc": "pa vtc", "continue-taxi": "pa taxi", "mobilite-taxi": "taxi",
  ta: "ta", "ta-e": "ta-e", va: "va", "va-e": "va-e",
};

const ACCOUNT_FORMATION_TO_DB_FORMATION: Record<string, string> = {
  vtc: "vtc", "vtc-e": "vtc-elearning", taxi: "taxi", "taxi-e": "taxi-elearning",
  "continue-vtc": "continue-vtc", "continue-taxi": "continue-taxi", "mobilite-taxi": "mobilite-taxi",
  ta: "passerelle-taxi", "ta-e": "passerelle-taxi-elearning",
  va: "passerelle-vtc-elearning", "va-e": "passerelle-vtc-elearning",
};

const getTypeBadgeColor = (type: string | null) => {
  if (!type) return "bg-gray-100 text-gray-700";
  const t = type.toLowerCase();
  if (t.includes("taxi")) return "bg-yellow-100 text-yellow-700";
  if (t.includes("vtc")) return "bg-blue-100 text-blue-700";
  if (t.includes("ta")) return "bg-green-100 text-green-700";
  if (t.includes("va")) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-700";
};

const getFinancementBadge = (mode: string | null) => {
  if (!mode) return { value: "autre", label: "Non défini", color: "bg-gray-100 text-gray-700" };
  const financement = modesFinancement.find(f => f.value === mode);
  return financement || { value: mode, label: mode, color: "bg-gray-100 text-gray-700" };
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
    case "confirmee":
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmée</Badge>;
    case "pending":
    case "planifiee":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Planifiée</Badge>;
    case "cancelled":
    case "annulee":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Annulée</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

type SessionApprenantSchedule = {
  date_fin_personnalisee?: string | null;
  heure_debut_personnalisee?: string | null;
  heure_fin_personnalisee?: string | null;
};

const buildDefaultFCVTCDay = (date: Date, isCoursDuSoir = false): AgendaDaySlot => isCoursDuSoir
  ? {
      date: new Date(date),
      matinDebut: '17:00',
      matinFin: '18:30',
      apremDebut: '18:30',
      apremFin: '21:00',
      isSoir: true,
    }
  : {
      date: new Date(date),
      matinDebut: '09:00',
      matinFin: '12:00',
      apremDebut: '13:00',
      apremFin: '17:00',
    };

/**
 * Fallback : génère une liste de jours d'émargement basés uniquement sur les
 * dates de la session, sans dépendre de blocs agenda. Utilisé notamment pour
 * les sessions pratiques (un seul jour) ou lorsque l'agenda n'est pas saisi.
 */
const buildFallbackAgendaDays = (
  dateDebutISO: string,
  dateFinISO: string,
  options: {
    isPratique: boolean;
    isVTC: boolean;
    isTaxi?: boolean;
    isCoursDuSoir: boolean;
    heureDebutPersonnalisee?: string | null;
    heureFinPersonnalisee?: string | null;
  },
): AgendaDaySlot[] => {
  const start = new Date(dateDebutISO + 'T00:00:00');
  const end = new Date(dateFinISO + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
  const days: AgendaDaySlot[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const day: AgendaDaySlot = { date: new Date(cur) };
    const dayOfWeek = cur.getDay();
    // Les sessions pratiques ont souvent lieu le samedi : on ne saute le
    // week-end que pour les formations théoriques classiques.
    if (!options.isPratique && (dayOfWeek === 0 || dayOfWeek === 6)) {
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    if (options.isCoursDuSoir) {
      day.matinDebut = '17:00';
      day.matinFin = '18:30';
      day.apremDebut = '18:30';
      day.apremFin = '21:00';
      day.isSoir = true;
    } else if (options.heureDebutPersonnalisee && options.heureFinPersonnalisee) {
      // Une seule plage personnalisée : on l'affiche en matin
      day.matinDebut = options.heureDebutPersonnalisee.slice(0, 5);
      day.matinFin = options.heureFinPersonnalisee.slice(0, 5);
    } else if (options.isPratique) {
      // Sans créneau de planning exploitable, une pratique vaut un seul créneau de 3h.
      day.matinDebut = '09:00';
      day.matinFin = '12:00';
    } else {
      day.matinDebut = '09:00';
      day.matinFin = '12:00';
      day.apremDebut = '13:00';
      day.apremFin = options.isVTC ? '16:00' : '17:00';
    }
    days.push(day);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeISODate = (value?: string | null) => String(value || '').slice(0, 10);

const addDaysToISO = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setDate(date.getDate() + days);
  return formatLocalDateKey(date);
};

const getMinISODate = (dates: string[]) => dates.reduce((min, date) => date < min ? date : min, dates[0]);
const getMaxISODate = (dates: string[]) => dates.reduce((max, date) => date > max ? date : max, dates[0]);

const getPracticalReservationDates = async (apprenantId?: string | null) => {
  if (!apprenantId) return [] as string[];
  const { data, error } = await supabase
    .from('reservations_pratique')
    .select('date_choisie')
    .eq('apprenant_id', apprenantId)
    .order('date_choisie', { ascending: true });

  if (error) {
    console.error('[SessionDetail] Erreur chargement réservations pratique:', error);
    return [] as string[];
  }

  return Array.from(new Set(((data || []) as any[])
    .map((r) => normalizeISODate(r.date_choisie))
    .filter(Boolean)));
};

const applyPratiquePlanningSlots = async (
  days: AgendaDaySlot[],
  apprenantId: string,
  isTaxi: boolean,
) => {
  const { data: reservations } = await supabase
    .from('reservations_pratique' as any)
    .select('date_choisie, creneau')
    .eq('apprenant_id', apprenantId);
  const byDate = new Map(((reservations as any[]) || []).map((row) => [normalizeISODate(row.date_choisie), row]));
  const dates = Array.from(byDate.keys()).filter(Boolean);
  const planningSlots = await fetchPlanningDaySlotsForDates(dates);

  return days.map((day) => {
    const date = formatLocalDateKey(day.date);
    const reservation = byDate.get(date);
    if (!reservation) return day;
    const parts = resolvePratiqueSlotParts(
      planningSlots.get(date),
      isTaxi ? 'taxi' : 'vtc',
      normalizePratiqueCreneau(reservation.creneau),
    );
    const result: AgendaDaySlot = { date: new Date(day.date) };
    for (const part of parts) {
      const start = part.startMinute;
      const end = part.endMinute;
      if (start == null || end == null) continue;
      const toHM = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      if (part.creneau === 'matin') {
        result.matinDebut = toHM(start);
        result.matinFin = toHM(end);
      } else {
        result.apremDebut = toHM(start);
        result.apremFin = toHM(end);
      }
    }
    return result.matinDebut || result.apremDebut ? result : day;
  });
};

const applyFCVTCPersonalizedSchedule = (
  agendaDays: AgendaDaySlot[],
  sessionStart: string,
  sessionEnd: string,
  schedule?: SessionApprenantSchedule,
  isCoursDuSoir = false,
) => {
  const effectiveEnd = schedule?.date_fin_personnalisee || sessionEnd;
  const startDate = new Date(`${sessionStart}T00:00:00`);
  const endDate = new Date(`${effectiveEnd}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return agendaDays;
  }

  const dayMap = new Map<string, AgendaDaySlot>();

  agendaDays
    .filter((day) => {
      const key = formatLocalDateKey(day.date);
      return key >= sessionStart && key <= effectiveEnd;
    })
    .forEach((day) => {
      const key = formatLocalDateKey(day.date);
      dayMap.set(key, { ...day, date: new Date(day.date) });
    });

  const shouldBackfillAllDays = dayMap.size === 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const key = formatLocalDateKey(d);
    const isBeyondSessionEnd = key > sessionEnd;
    const isCustomEndDay = key === schedule?.date_fin_personnalisee;

    if (!dayMap.has(key) && (shouldBackfillAllDays || isBeyondSessionEnd || isCustomEndDay)) {
      dayMap.set(key, buildDefaultFCVTCDay(new Date(d), isCoursDuSoir));
    }
  }

  if (schedule?.date_fin_personnalisee && dayMap.has(schedule.date_fin_personnalisee)) {
    const customDay = dayMap.get(schedule.date_fin_personnalisee)!;

    if (!isCoursDuSoir && schedule.heure_debut_personnalisee && schedule.heure_fin_personnalisee) {
      customDay.matinDebut = undefined;
      customDay.matinFin = undefined;
      customDay.apremDebut = schedule.heure_debut_personnalisee;
      customDay.apremFin = schedule.heure_fin_personnalisee;
    }

    dayMap.set(schedule.date_fin_personnalisee, customDay);
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};

function NotesPopover({ 
  sessionApprenantId, 
  notes, 
  onSave 
}: { 
  sessionApprenantId: string; 
  notes: string; 
  onSave: (notes: string) => void 
}) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onSave(localNotes);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 gap-1 ${notes ? "text-primary" : "text-muted-foreground"}`}
        >
          <StickyNote className="w-4 h-4" />
          {notes ? "Notes" : "Ajouter notes"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <Label>Notes pour cet apprenant</Label>
          <Textarea 
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Ajouter des notes..."
            className="min-h-[100px]"
          />
          <Button onClick={handleSave} size="sm" className="w-full gap-2">
            <Save className="w-4 h-4" />
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PaiementPopover({ 
  apprenantId,
  montantTotal, 
  montantPaye, 
  apprenantNom,
  apprenantPrenom,
  onChanged,
}: { 
  apprenantId: string; 
  montantTotal: number; 
  montantPaye: number; 
  apprenantNom?: string;
  apprenantPrenom?: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loadingPaiements, setLoadingPaiements] = useState(false);
  const [newMontant, setNewMontant] = useState<string>("");
  const [newMoyen, setNewMoyen] = useState<string>("virement");
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const totalPaye = paiements.reduce((s, p) => s + Number(p.montant || 0), 0);
  const resteAPayer = montantTotal - totalPaye;

  const loadPaiements = async () => {
    if (!apprenantId) return;
    setLoadingPaiements(true);
    try {
      const { data, error } = await supabase
        .from("apprenant_paiements")
        .select("*")
        .eq("apprenant_id", apprenantId)
        .order("date_paiement", { ascending: false });
      if (!error && data) setPaiements(data as any[]);
    } finally {
      setLoadingPaiements(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadPaiements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apprenantId]);

  // Recherche de virements reçus correspondant à l'apprenant à l'ouverture
  useEffect(() => {
    if (!open) return;
    const nom = (apprenantNom || "").trim();
    const prenom = (apprenantPrenom || "").trim();
    if (!nom && !prenom) {
      setMatches([]);
      return;
    }
    setLoadingMatches(true);
    (async () => {
      try {
        const orClauses: string[] = [];
        if (nom) orClauses.push(`libelle.ilike.%${nom}%`);
        if (prenom) orClauses.push(`libelle.ilike.%${prenom}%`);
        const { data, error } = await supabase
          .from("transactions_bancaires")
          .select("id,date_operation,libelle,montant,banque")
          .gt("montant", 0)
          .or(orClauses.join(","))
          .order("date_operation", { ascending: false })
          .limit(10);
        if (!error && data) setMatches(data as any[]);
      } catch (e) {
        console.error("[PaiementPopover] match err", e);
      } finally {
        setLoadingMatches(false);
      }
    })();
  }, [open, apprenantNom, apprenantPrenom]);

  const applyMatch = (tx: any) => {
    setNewMontant(String(Number(tx.montant) || 0));
    setNewMoyen("virement");
    setNewDate(tx.date_operation || new Date().toISOString().split("T")[0]);
  };

  const handleAddPaiement = async () => {
    const montant = parseFloat(newMontant);
    if (!montant || montant <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("apprenant_paiements").insert({
        apprenant_id: apprenantId,
        montant,
        moyen_paiement: newMoyen,
        date_paiement: newDate || null,
      });
      if (error) throw error;
      setNewMontant("");
      setNewMoyen("virement");
      setNewDate(new Date().toISOString().split("T")[0]);
      await loadPaiements();
      onChanged();
      toast({ title: "Paiement ajouté" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaiement = async (id: string) => {
    try {
      const { error } = await supabase.from("apprenant_paiements").delete().eq("id", id);
      if (error) throw error;
      await loadPaiements();
      onChanged();
      toast({ title: "Paiement supprimé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const moyenLabel = (m?: string) => {
    switch (m) {
      case "especes": return "Espèces";
      case "cb": return "CB";
      case "cheque": return "Chèque";
      case "virement": return "Virement";
      default: return m || "—";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 gap-1 ${montantPaye > 0 ? "text-green-600" : "text-muted-foreground"}`}
        >
          <Euro className="w-4 h-4" />
          {montantPaye > 0 ? `${montantPaye}€ payé` : "Paiement"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          <h4 className="font-medium">Gestion des paiements</h4>

          <div className="rounded-md border bg-muted/30 p-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total dû:</span>
              <span className="font-medium">{montantTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total payé:</span>
              <span className="font-medium text-green-600">{totalPaye.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Reste:</span>
              <span className={`font-bold ${resteAPayer > 0 ? "text-orange-600" : "text-green-600"}`}>
                {resteAPayer.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Paiements enregistrés</Label>
            {loadingPaiements && <p className="text-xs text-muted-foreground">Chargement…</p>}
            {!loadingPaiements && paiements.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun paiement</p>
            )}
            {paiements.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded border bg-background">
                <div className="flex-1">
                  <div className="font-medium text-green-700">{Number(p.montant).toFixed(2)} €</div>
                  <div className="text-muted-foreground">
                    {p.date_paiement || "—"} • {moyenLabel(p.moyen_paiement)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  onClick={() => handleDeletePaiement(p.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {matches.length > 0 && (
            <div className="space-y-1 rounded-md border bg-muted/30 p-2">
              <Label className="text-xs">Virements reçus correspondants</Label>
              {matches.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => applyMatch(tx)}
                  className="w-full text-left text-xs px-2 py-1 rounded border bg-background hover:bg-accent transition"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-green-700">{Number(tx.montant).toFixed(2)} €</span>
                    <span className="text-muted-foreground">{tx.date_operation}</span>
                  </div>
                  <div className="text-muted-foreground truncate">{tx.libelle}</div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-3">
            <Label className="text-sm font-medium">Ajouter un paiement</Label>
            <div className="space-y-2">
              <Input
                type="number"
                step="0.01"
                value={newMontant}
                onChange={(e) => setNewMontant(e.target.value)}
                placeholder="Montant (€)"
              />
              <Select value={newMoyen} onValueChange={setNewMoyen}>
                <SelectTrigger>
                  <SelectValue placeholder="Moyen de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="cb">Carte bancaire</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <Button onClick={handleAddPaiement} size="sm" className="w-full gap-2" disabled={saving}>
                <Save className="w-4 h-4" />
                Ajouter ce paiement
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SessionDetail({ session, open, onOpenChange, onNavigateToApprenant, asPage, onBack }: SessionDetailProps) {
  const [searchApprenant, setSearchApprenant] = useState("");
  const [showAddApprenant, setShowAddApprenant] = useState(false);
  const [showAddFormateur, setShowAddFormateur] = useState(false);
  const [searchFormateur, setSearchFormateur] = useState("");
  const [showHorsSession, setShowHorsSession] = useState(false);
  const [searchHorsSession, setSearchHorsSession] = useState("");
  const [sendingEmailForApprenant, setSendingEmailForApprenant] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{
    templateId: string;
    apprenant: any;
    subject: string;
    body: string;
    label: string;
  } | null>(null);
  const [emailPreviewEditing, setEmailPreviewEditing] = useState(false);
  const [selectedApprenants, setSelectedApprenants] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkPrintingEmargement, setBulkPrintingEmargement] = useState(false);
  const [bulkDownloadingAttestations, setBulkDownloadingAttestations] = useState(false);
  const [bulkSendingAttestations, setBulkSendingAttestations] = useState(false);
  const [bulkDownloadingFactures, setBulkDownloadingFactures] = useState(false);
  const [bulkSendingFactures, setBulkSendingFactures] = useState(false);
  const [singleFactureLoading, setSingleFactureLoading] = useState<string | null>(null);
  const [bulkValidatingFactures, setBulkValidatingFactures] = useState(false);
  const [selectedFactureApprenants, setSelectedFactureApprenants] = useState<Set<string>>(new Set());
  const [acquittementApprenant, setAcquittementApprenant] = useState<any | null>(null);
  const [acquittementDate, setAcquittementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [acquittementMoyen, setAcquittementMoyen] = useState<string>('virement');
  const [acquittementMontant, setAcquittementMontant] = useState<string>('');
  const [acquittementSaving, setAcquittementSaving] = useState(false);
  const [acquittementDeleting, setAcquittementDeleting] = useState<string | null>(null);
  const [bulkAcquitterOpen, setBulkAcquitterOpen] = useState(false);
  const [bulkAcquitterDate, setBulkAcquitterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bulkAcquitterMoyen, setBulkAcquitterMoyen] = useState<string>('virement');
  const [bulkAcquitterSaving, setBulkAcquitterSaving] = useState(false);
  const [addExtraFactureFor, setAddExtraFactureFor] = useState<any | null>(null);
  const [extraFactureMontant, setExtraFactureMontant] = useState<string>('');
  const [extraFactureLibelle, setExtraFactureLibelle] = useState<string>('');
  const [extraFactureSaving, setExtraFactureSaving] = useState(false);
  const [extraFactureDeleting, setExtraFactureDeleting] = useState<string | null>(null);
  const [bulkPreview, setBulkPreview] = useState<{ template: any; apprenants: any[]; previewBody: string; previewSubject: string; editedBody?: string; editedSubject?: string } | null>(null);
  const [convocationPreview, setConvocationPreview] = useState<{ items: { apprenant: any; subject: string; body: string }[] } | null>(null);
  const [convocationPreviewIndex, setConvocationPreviewIndex] = useState(0);
  const [bulkPreviewEditing, setBulkPreviewEditing] = useState(false);
  const [editingMailType, setEditingMailType] = useState<any | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  // --- Account creation state ---
  const [accountDialogApprenant, setAccountDialogApprenant] = useState<any | null>(null);
  const [selectedFormationForAccount, setSelectedFormationForAccount] = useState("");
  const [accountStartDate, setAccountStartDate] = useState("");
  const [accountEndDate, setAccountEndDate] = useState("");
  const [accountExtraModules, setAccountExtraModules] = useState<number[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingCredentials, setResendingCredentials] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apprenantToDelete, setApprenantToDelete] = useState<{ id: string; nom: string; prenom: string } | null>(null);
  // --- Déplacement d'un apprenant vers une autre session ---
  const [apprenantToMove, setApprenantToMove] = useState<{ id: string; apprenant_id: string; nom: string; prenom: string } | null>(null);
  const [targetSessionId, setTargetSessionId] = useState("");
  const [movingApprenant, setMovingApprenant] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const copyToClipboard = async (text: string | null | undefined, label: string) => {
    const value = (text || '').trim();
    if (!value) {
      toast({ title: `${label} vide`, description: `Aucune valeur à copier pour ce champ.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copié`, description: `"${value}" a été copié dans le presse-papiers.` });
    } catch {
      toast({ title: "Erreur de copie", description: `Impossible de copier ${label.toLowerCase()}.`, variant: "destructive" });
    }
  };

  // Charger les apprenants de cette session depuis la base de données
  const { data: apprenantsInSession = [], isLoading: loadingApprenants, refetch: refetchApprenants } = useQuery({
    queryKey: ['session-apprenants', session?.id, 'no-elearning-v2'],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('session_apprenants')
        .select(`
          id,
          created_at,
          apprenant_id,
          mode_financement,
          date_debut,
          date_fin,
          notes,
          presence_pratique,
          montant_total,
          montant_paye,
          moyen_paiement,
          statut_suivi,
          date_fin_personnalisee,
          heure_debut_personnalisee,
          heure_fin_personnalisee,
          liste_attente,
          apprenant:apprenants (
            id,
            nom,
            prenom,
            email,
            telephone,
            type_apprenant,
            formation_choisie,
            creneau_horaire,
            mode_financement,
            numero_dossier_cma,
            mot_de_passe_cma,
            date_debut_formation,
            date_fin_formation,
            date_examen_theorique,
            date_examen_pratique,
            resultat_examen,
            statut,
            montant_ttc,
            montant_paye,
            moyen_paiement,
            notes,
            civilite,
            adresse,
            code_postal,
            ville,
            auth_user_id,
            date_debut_cours_en_ligne,
            date_fin_cours_en_ligne,
            societe_nom,
            societe_siret,
            organisme_financeur,
            documents_complets
          )
        `)
        .eq('session_id', session.id);
      
      if (error) {
        console.error('[SessionDetail] Erreur chargement apprenants:', error);
        return [];
      }
      // Ne pas filtrer les e-learning : s'ils ont été explicitement ajoutés à une session
      // théorique, ils doivent apparaître (sinon impossible de les gérer / retirer).
      const filtered = data || [];
      console.log('[SessionDetail] apprenantsInSession chargés:', filtered.length);
      return filtered;

    },
    enabled: !!session?.id && open,
  });

  // Charger les infos financeur FC (saisies dans le portail Informations Financeur VTC/TAXI)
  const apprenantIdsForFinanceur = (apprenantsInSession || [])
    .map((sa: any) => sa.apprenant?.id)
    .filter(Boolean);
  const { data: financeursFCMap = {}, refetch: refetchFinanceursFC } = useQuery({
    queryKey: ['session-financeurs-fc', session?.id, apprenantIdsForFinanceur.join(',')],
    queryFn: async () => {
      if (!apprenantIdsForFinanceur.length) return {} as Record<string, any>;
      const { data, error } = await supabase
        .from('financeurs_fc' as any)
        .select('apprenant_id, type_financeur, raison_sociale, siren, siret, numero_tva, adresse, code_postal, ville, contact_nom, contact_telephone, contact_email, email_facturation, organisme_financeur, numero_dossier')
        .in('apprenant_id', apprenantIdsForFinanceur);
      if (error) {
        console.error('[SessionDetail] Erreur chargement financeurs_fc:', error);
        return {} as Record<string, any>;
      }
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.apprenant_id] = row; });
      return map;
    },
    enabled: !!session?.id && open && apprenantIdsForFinanceur.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Realtime: refetch financeurs_fc when any row changes for the session's apprenants
  useEffect(() => {
    if (!open || !session?.id || apprenantIdsForFinanceur.length === 0) return;
    const channel = supabase
      .channel(`financeurs-fc-session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financeurs_fc' }, (payload: any) => {
        const aid = (payload?.new?.apprenant_id || payload?.old?.apprenant_id) as string | undefined;
        if (aid && apprenantIdsForFinanceur.includes(aid)) {
          refetchFinanceursFC();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, session?.id, apprenantIdsForFinanceur.join(','), refetchFinanceursFC]);

  // Charger les factures FC déjà créées pour cette session (brouillons + validées)
  const { data: facturesFCMap = {}, refetch: refetchFacturesFC } = useQuery({
    queryKey: ['session-factures-fc', session?.id],
    queryFn: async () => {
      if (!session?.id) return {} as Record<string, any>;
      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[SessionDetail] Erreur chargement factures session:', error);
        return {} as Record<string, any>;
      }
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        // Exclure les factures "extras" (marquées via numero_convention = EXTRA::...)
        const nc = String(row.numero_convention || '');
        if (nc.startsWith('EXTRA::')) return;
        if (row.apprenant_id && !map[row.apprenant_id]) map[row.apprenant_id] = row;
      });
      return map;
    },
    enabled: !!session?.id && open,
  });

  // Factures additionnelles par apprenant (marquées EXTRA::<libellé>)
  const { data: extraFacturesByApprenantId = {}, refetch: refetchExtraFactures } = useQuery({
    queryKey: ['session-extra-factures', session?.id],
    queryFn: async () => {
      if (!session?.id) return {} as Record<string, any[]>;
      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .eq('session_id', session.id)
        .like('numero_convention', 'EXTRA::%')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('[SessionDetail] Erreur chargement factures extras:', error);
        return {} as Record<string, any[]>;
      }
      const map: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        if (!row.apprenant_id) return;
        (map[row.apprenant_id] = map[row.apprenant_id] || []).push(row);
      });
      return map;
    },
    enabled: !!session?.id && open,
  });

  // Charger tous les paiements pour les factures (principales + extras) de cette session
  const factureIdsForPaiements = [
    ...Object.values(facturesFCMap as Record<string, any>).map((f: any) => f?.id).filter(Boolean),
    ...Object.values(extraFacturesByApprenantId as Record<string, any[]>).flat().map((f: any) => f?.id).filter(Boolean),
  ];
  const { data: paiementsByFactureId = {}, refetch: refetchPaiements } = useQuery({
    queryKey: ['session-facture-paiements', session?.id, factureIdsForPaiements.join(',')],
    queryFn: async () => {
      if (!factureIdsForPaiements.length) return {} as Record<string, any[]>;
      const { data, error } = await supabase
        .from('facture_paiements' as any)
        .select('*')
        .in('facture_id', factureIdsForPaiements)
        .order('date_paiement', { ascending: true });
      if (error) {
        console.error('[SessionDetail] Erreur chargement facture_paiements:', error);
        return {} as Record<string, any[]>;
      }
      const map: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        if (!map[row.facture_id]) map[row.facture_id] = [];
        map[row.facture_id].push(row);
      });
      return map;
    },
    enabled: !!session?.id && open && factureIdsForPaiements.length > 0,
  });

  // Charger les virements reçus (transactions_bancaires) correspondant aux apprenants de la session
  // pour afficher automatiquement date + montant à côté de chaque ligne facture.
  const { data: virementsByApprenantId = {} } = useQuery({
    queryKey: [
      'session-virements-matches',
      session?.id,
      apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(','),
      Object.keys(financeursFCMap as Record<string, any>).join(','),
    ],
    queryFn: async () => {
      const result: Record<string, any[]> = {};
      const apps = (apprenantsInSession || [])
        .map((sa: any) => sa.apprenant)
        .filter((a: any) => a && (a.nom || a.prenom));
      if (apps.length === 0) return result;

      // Construit pour chaque apprenant la liste des "tokens" à chercher :
      // nom, prénom, raison sociale du financeur, société de l'apprenant,
      // local-part de l'email de facturation. On ignore les tokens < 4 chars.
      const STOP = new Set(['sarl','sasu','eurl','sas','sci','auto','entreprise','societe','société','mr','mme','the','and','les','des','pour']);
      const tokenize = (s: string) =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length >= 4 && !STOP.has(t));

      // Tokens "forts" par apprenant : nom de famille + tokens du financeur pro
      // (raison sociale, siret). Le prénom et le local-part email sont trop
      // ambigus (ex: "mohammed" matcherait n'importe quel virement d'un homonyme)
      // → on les IGNORE pour éviter les faux positifs.
      const strongTokensByApp: Record<string, string[]> = {};
      const allTokens = new Set<string>();
      for (const a of apps) {
        const fin = (financeursFCMap as Record<string, any>)[a.id] || {};
        const isPro = fin.type === 'pro' || fin.raison_sociale;
        const raw = [
          a.nom,
          isPro ? fin.raison_sociale : null,
          isPro ? fin.siret : null,
          isPro ? fin.siren : null,
        ].filter(Boolean).join(' ');
        const toks = Array.from(new Set(tokenize(raw)));
        strongTokensByApp[a.id] = toks;
        toks.forEach((t) => allTokens.add(t));
      }

      if (allTokens.size === 0) return result;
      const orClauses = Array.from(allTokens).map((t) => `libelle.ilike.%${t}%`);
      const { data, error } = await supabase
        .from('transactions_bancaires')
        .select('id,date_operation,libelle,montant,banque')
        .gt('montant', 0)
        .or(orClauses.join(','))
        .order('date_operation', { ascending: false })
        .limit(3000);
      if (error || !data) return result;

      for (const a of apps) {
        const toks = strongTokensByApp[a.id] || [];
        if (!toks.length) continue;
        const matches = (data as any[]).filter((tx) => {
          const lib = String(tx.libelle || '')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return toks.some((t) => lib.includes(t));
        });
        // Dédoublonnage : même date + même montant + même libellé + même banque
        // => on considère qu'il s'agit du même virement (doublon d'import).
        // On garde toutes les lignes distinctes sur au moins un de ces critères.
        const seen = new Set<string>();
        const deduped: any[] = [];
        for (const tx of matches) {
          const key = [
            tx.date_operation || '',
            Number(tx.montant || 0).toFixed(2),
            String(tx.libelle || '').trim().toLowerCase(),
            String(tx.banque || '').trim().toLowerCase(),
          ].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(tx);
        }
        if (deduped.length > 0) result[a.id] = deduped.slice(0, 5);
      }
      return result;
    },
    enabled: !!session?.id && open && apprenantsInSession.length > 0,
  });

  // Charger les formateurs de cette session
  const { data: formateursInSession = [], isLoading: loadingFormateurs, refetch: refetchFormateurs } = useQuery({
    queryKey: ['session-formateurs', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      
      const { data, error } = await supabase
        .from('session_formateurs')
        .select(`
          id,
          heures_effectuees,
          presence,
          formateur:formateurs (
            id,
            nom,
            prenom,
            email,
            telephone,
            specialites,
            type,
            civilite
          )
        `)
        .eq('session_id', session.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.id && open,
  });

  // Charger tous les apprenants pour l'ajout
  const { data: allApprenants = [] } = useQuery({
    queryKey: ['all-apprenants'],
    queryFn: async () => {
      const columns = 'id, nom, prenom, email, telephone, adresse, code_postal, ville, civilite, type_apprenant, formation_choisie, mode_financement, numero_dossier_cma, mot_de_passe_cma, date_debut_formation, date_fin_formation, date_examen_theorique, date_examen_pratique, statut';
      const pageSize = 1000;
      let from = 0;
      const rows: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('apprenants')
          .select(columns)
          .is('deleted_at' as any, null)
          .order('nom', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return rows as ApprenantDB[];
    },
    enabled: open,
  });

  // Charger tous les formateurs pour l'ajout
  const { data: allFormateurs = [] } = useQuery({
    queryKey: ['all-formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateurs')
        .select('id, nom, prenom, email, telephone, specialites, type, civilite')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Charger les mails types depuis la base de données
  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('label');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const normalizeEmailSubject = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const convocationSubjectHints = useMemo(() => {
    const hintsFromTemplates = (emailTemplates || [])
      .filter((template: any) => {
        const id = normalizeEmailSubject(template?.id || '');
        const label = normalizeEmailSubject(template?.label || '');
        const subjectTemplate = normalizeEmailSubject(template?.subject_template || '');

        return (
          id.includes('convocation') ||
          label.includes('convocation') ||
          subjectTemplate.includes('convocation') ||
          id.includes('formation-continue')
        );
      })
      .flatMap((template: any) =>
        String(template?.subject_template || '')
          .split(/\{\{\s*[\w.]+\s*\}\}/g)
          .map((fragment) => normalizeEmailSubject(fragment))
          .filter((fragment) => fragment.length >= 8)
      );

    return Array.from(
      new Set([
        ...hintsFromTemplates,
        "confirmation d'inscription formation continue",
      ])
    );
  }, [emailTemplates]);

  const isConvocationSubject = (subject?: string | null) => {
    const normalizedSubject = normalizeEmailSubject(subject || '');
    if (!normalizedSubject) return false;
    if (normalizedSubject.includes('convocation')) return true;

    return convocationSubjectHints.some((hint) => normalizedSubject.includes(hint));
  };

  // Charger les emails envoyés pour les apprenants de cette session puis détecter les convocations
  const { data: sentSessionEmails = [] } = useQuery({
    queryKey: ['convocations-sent', session?.id, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
    queryFn: async () => {
      const apprenantIds = apprenantsInSession
        .map((sa: any) => sa.apprenant?.id)
        .filter(Boolean);
      if (apprenantIds.length === 0) return [];

      const { data, error } = await supabase
        .from('emails')
        .select('apprenant_id, subject, sent_at')
        .in('apprenant_id', apprenantIds)
        .eq('type', 'sent');

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.id && open && apprenantsInSession.length > 0,
  });

  const convocationApprenantIds = useMemo(() => {
    return new Set(
      sentSessionEmails
        .filter((email: any) => isConvocationSubject(email.subject))
        .map((email: any) => email.apprenant_id)
        .filter(Boolean)
    );
  }, [sentSessionEmails, convocationSubjectHints]);

  const hasConvocation = (apprenantId: string) => {
    return convocationApprenantIds.has(apprenantId);
  };

  const normalizeSubj = (s?: string | null) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const bienvenueApprenantIds = useMemo(
    () =>
      new Set(
        sentSessionEmails
          .filter((e: any) => normalizeSubj(e.subject).includes('bienvenue chez ftransport'))
          .map((e: any) => e.apprenant_id)
          .filter(Boolean)
      ),
    [sentSessionEmails]
  );

  const preInfoApprenantIds = useMemo(
    () =>
      new Set(
        sentSessionEmails
          .filter((e: any) => {
            const s = normalizeSubj(e.subject);
            return s.includes('pre-information') || s.includes('pre information') || s.includes('preinformation');
          })
          .map((e: any) => e.apprenant_id)
          .filter(Boolean)
      ),
    [sentSessionEmails]
  );

  const hasBienvenueEmail = (apprenantId: string) => bienvenueApprenantIds.has(apprenantId);
  const hasPreInfoEmail = (apprenantId: string) => preInfoApprenantIds.has(apprenantId);

  const relanceBienvenueApprenantIds = useMemo(
    () =>
      new Set(
        sentSessionEmails
          .filter((e: any) => normalizeSubj(e.subject).includes("dossier d'inscription n'est pas complet"))
          .map((e: any) => e.apprenant_id)
          .filter(Boolean)
      ),
    [sentSessionEmails]
  );
  const hasRelanceBienvenueEmail = (apprenantId: string) => relanceBienvenueApprenantIds.has(apprenantId);


   // Charger les identifiants envoyés pour les apprenants de cette session
    const { data: identifiantsSent = [] } = useQuery({
      queryKey: ['identifiants-sent', session?.id, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
      queryFn: async () => {
        const apprenantIds = apprenantsInSession
          .map((sa: any) => sa.apprenant?.id)
          .filter(Boolean);
        if (apprenantIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from('emails')
          .select('apprenant_id, subject, sent_at')
           .in('apprenant_id', apprenantIds)
           .ilike('subject', '%identifiant%')
           .eq('type', 'sent');
        
        if (error) throw error;
        return data || [];
      },
      enabled: !!session?.id && open && apprenantsInSession.length > 0,
    });

    const hasIdentifiants = (apprenantId: string) => {
      return identifiantsSent.some((c: any) => c.apprenant_id === apprenantId);
    };

    // Dernière date d'envoi des identifiants (codes d'accès) pour un apprenant
    const getIdentifiantsLastDate = (apprenantId: string): string | null => {
      const mails = identifiantsSent
        .filter((c: any) => c.apprenant_id === apprenantId && c.sent_at)
        .sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
      return mails.length > 0 ? mails[0].sent_at : null;
    };

    // Liste récapitulative : apprenants ayant reçu leurs codes d'accès (plus récent en premier)
    const identifiantsRecap = useMemo(() => {
      const rows = apprenantsInSession
        .map((sa: any) => {
          const ap = sa.apprenant;
          if (!ap?.id) return null;
          const date = getIdentifiantsLastDate(ap.id);
          if (!date) return null;
          return { id: ap.id, prenom: ap.prenom, nom: ap.nom, email: ap.email, sentAt: date };
        })
        .filter(Boolean) as { id: string; prenom: string; nom: string; email: string | null; sentAt: string }[];
      return rows.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }, [apprenantsInSession, identifiantsSent]);

    // Présence d'un dossier de bienvenue complété par apprenant
    const { data: dossiersBienvenue = [] } = useQuery({
      queryKey: ['dossiers-bienvenue', session?.id, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
      queryFn: async () => {
        const apprenantIds = apprenantsInSession
          .map((sa: any) => sa.apprenant?.id)
          .filter(Boolean);
        if (apprenantIds.length === 0) return [];
        const { data, error } = await supabase
          .from('apprenant_documents_completes')
          .select('apprenant_id')
          .in('apprenant_id', apprenantIds)
          .eq('type_document', 'dossier-bienvenue');
        if (error) throw error;
        return data || [];
      },
      enabled: !!session?.id && open && apprenantsInSession.length > 0,
    });

    const dossierBienvenueIds = useMemo(() => new Set(dossiersBienvenue.map((d: any) => d.apprenant_id)), [dossiersBienvenue]);
    const hasDossierBienvenue = (apprenantId: string) => dossierBienvenueIds.has(apprenantId);

    // Télécharge le dossier de bienvenue (PDF) d'un apprenant
    const downloadDossierBienvenue = async (apprenant: any) => {
      if (apprenant.documents_complets) {
        toast({
          title: "Possession des documents",
          description: `${apprenant.prenom} ${apprenant.nom} a confirmé posséder tous les documents.`,
        });
        return;
      }
      try {
        const { data, error } = await supabase
          .from("apprenant_documents_completes")
          .select("type_document, donnees, completed_at")
          .eq("apprenant_id", apprenant.id)
          .eq("type_document", "dossier-bienvenue")
          .order("completed_at", { ascending: false })
          .limit(1);
        if (error) throw error;
        const doc = data?.[0];
        if (!doc) {
          toast({
            title: "Aucun dossier de bienvenue",
            description: `${apprenant.prenom} ${apprenant.nom} n'a pas encore complété son dossier de bienvenue.`,
            variant: "destructive",
          });
          return;
        }
        const { generateDocumentIndividuelPdf } = await import("@/lib/pdf/document-individuel");
        await generateDocumentIndividuelPdf(apprenant, {
          type_document: "dossier-bienvenue",
          titre: "Dossier de bienvenue - Inscription CMA",
          donnees: doc.donnees,
          completed_at: doc.completed_at,
        });
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message || "Impossible de générer le PDF", variant: "destructive" });
      }
    };

    // Bascule la "Possession des documents" d'un apprenant (passe le dossier de bienvenue en vert)
    const togglePossessionDocuments = async (apprenant: any) => {
      const next = !apprenant.documents_complets;
      try {
        const { error } = await supabase
          .from("apprenants")
          .update({ documents_complets: next } as any)
          .eq("id", apprenant.id);
        if (error) throw error;
        toast({
          title: next ? "Possession des documents confirmée" : "Possession des documents retirée",
          description: next
            ? `${apprenant.prenom} ${apprenant.nom} possède tous ses documents.`
            : `${apprenant.prenom} ${apprenant.nom} ne possède plus tous ses documents.`,
        });
        queryClient.invalidateQueries({ queryKey: ['session-apprenants'] });
        queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message || "Mise à jour impossible", variant: "destructive" });
      }
    };



  // Détection session du soir (4h/jour, max 40h) vs jour (6h/jour, max 60h)
  const isSessionSoir = (() => {
    const creneaux = Array.isArray((session as any)?.creneaux)
      ? ((session as any).creneaux as any[]).join(' ')
      : String((session as any)?.creneaux || '');
    return isEveningTrainingValue((session as any)?.title, (session as any)?.nom, creneaux, (session as any)?.heure_debut, (session as any)?.heure_fin);
  })();
  const maxHeuresSession = isSessionSoir ? 40 : 60;

  // Charger les émargements pour calculer les heures de présence par apprenant
  // - filtré sur la plage de dates de la session (pas de signature hors formation)
  // - dédupliqué par (date, demi_journee) pour éviter les doublons
  // - plafonné au max théorique de la session
  const { data: emargementsHoursMap = {} } = useQuery({
    queryKey: ['emargements-hours', session?.id, session?.dateDebut, session?.dateFin, isSessionSoir, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
    queryFn: async () => {
      const apprenantIds = apprenantsInSession
        .map((sa: any) => sa.apprenant?.id)
        .filter(Boolean);
      if (apprenantIds.length === 0) return {} as Record<string, number>;

      const dateDebut = session?.dateDebut ? String(session.dateDebut).slice(0, 10) : null;
      const dateFin = session?.dateFin ? String(session.dateFin).slice(0, 10) : null;

      let q = supabase
        .from('emargements_fc')
        .select('apprenant_id, date_emargement, demi_journee')
        .in('apprenant_id', apprenantIds)
        .eq('absent', false);
      if (dateDebut) q = q.gte('date_emargement', dateDebut);
      if (dateFin) q = q.lte('date_emargement', dateFin);

      const { data, error } = await q;
      if (error) throw error;

      const result: Record<string, number> = {};
      apprenantIds.forEach((id: string) => {
        const sa = apprenantsInSession.find((item: any) => item?.apprenant?.id === id);
        const apprenant = sa?.apprenant;
        const learnerIsEvening = isSessionSoir || isEveningTrainingValue(
          apprenant?.creneau_horaire,
          apprenant?.formation_choisie,
          apprenant?.type_apprenant,
        );
        result[id] = computePresenceHours(
          (data || []).filter((row: any) => row.apprenant_id === id),
          {
            isEvening: learnerIsEvening,
            isFormationContinue: isFormationContinueValue(apprenant?.type_apprenant, apprenant?.formation_choisie),
            maxHours: learnerIsEvening ? 40 : maxHeuresSession,
            dateStart: dateDebut,
            dateEnd: dateFin,
          },
        );

      });
      return result;
    },
    enabled: !!session?.id && open && apprenantsInSession.length > 0,
  });

  const getHeuresPresence = (apprenantId: string): number => {
    return (emargementsHoursMap as Record<string, number>)[apprenantId] || 0;
  };

  // Heures effectuées en ligne EN DEHORS des dates de formation (e-learning à la maison)
  const { data: onlineHoursMap = {} } = useQuery({
    queryKey: ['online-hours-out', session?.id, session?.dateDebut, session?.dateFin, apprenantsInSession.map((sa: any) => sa.apprenant?.id).join(',')],
    queryFn: async () => {
      const apprenantIds = apprenantsInSession
        .map((sa: any) => sa.apprenant?.id)
        .filter(Boolean);
      if (apprenantIds.length === 0) return {} as Record<string, number>;

      const dateDebut = session?.dateDebut ? String(session.dateDebut).slice(0, 10) : null;
      const dateFin = session?.dateFin ? String(session.dateFin).slice(0, 10) : null;

      const result: Record<string, number> = {};
      apprenantIds.forEach((id: string) => { result[id] = 0; });

      const PAGE = 1000;
      const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from('apprenant_connexions')
          .select('apprenant_id, started_at, ended_at, last_seen_at')
          .in('apprenant_id', apprenantIds)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        for (const row of rows) {
          if (!row.started_at) continue;
          const day = String(row.started_at).slice(0, 10);
          // En dehors de la période de formation
          if (dateDebut && dateFin && day >= dateDebut && day <= dateFin) continue;
          const start = new Date(row.started_at).getTime();
          const rawEnd = new Date(row.ended_at || row.last_seen_at || row.started_at).getTime();
          const end = Math.min(rawEnd, start + MAX_SESSION_MS);
          const minutes = Math.max(0, (end - start) / 60000);
          result[row.apprenant_id] = (result[row.apprenant_id] || 0) + minutes / 60;
        }
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return result;
    },
    enabled: !!session?.id && open && apprenantsInSession.length > 0,
  });

  const getHeuresEnLigne = (apprenantId: string): number => {
    return (onlineHoursMap as Record<string, number>)[apprenantId] || 0;
  };

  // --- Account creation helpers ---
  const inferAccountFormationId = (apprenant: any): string => {
    const type = (apprenant?.type_apprenant || "").toLowerCase();
    if (type.startsWith("taxi")) return "taxi";
    if (type.startsWith("ta")) return "ta";
    if (type.startsWith("va")) return "va";
    return "vtc";
  };

  const accountBaseModules = useMemo(() => {
    return DEFAULT_MODULES_BY_TYPE[selectedFormationForAccount] || [] as number[];
  }, [selectedFormationForAccount]);

  const accountAdditionalModuleChoices = useMemo(
    () => MODULES_DATA.filter((m) => MANAGED_MODULE_IDS.has(m.id) && !accountBaseModules.includes(m.id)),
    [accountBaseModules]
  );

  const toggleAccountExtraModule = (id: number) => {
    setAccountExtraModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const openAccountDialog = (apprenant: any) => {
    setAccountDialogApprenant(apprenant);
    const inferredId = inferAccountFormationId(apprenant);
    setSelectedFormationForAccount(inferredId);
    setAccountStartDate(apprenant.date_debut_cours_en_ligne || apprenant.date_debut_formation || "");
    setAccountEndDate(apprenant.date_fin_cours_en_ligne || apprenant.date_fin_formation || "");
    setAccountExtraModules([]);
    setGeneratedPassword("");
  };

  const handleCreateAccount = async () => {
    if (!accountDialogApprenant) return;
    setCreatingAccount(true);
    try {
      const mergedModules = Array.from(new Set([...accountBaseModules, ...accountExtraModules]));
      const mappedType = ACCOUNT_FORMATION_TO_TYPE[selectedFormationForAccount] || null;
      const mappedFormation = ACCOUNT_FORMATION_TO_DB_FORMATION[selectedFormationForAccount] || null;
      const appId = accountDialogApprenant.id;

      const { error: updateError } = await supabase
        .from("apprenants")
        .update({
          type_apprenant: mappedType,
          formation_choisie: mappedFormation,
          date_debut_cours_en_ligne: accountStartDate || null,
          date_fin_cours_en_ligne: accountEndDate || null,
          modules_autorises: mergedModules.length > 0 ? mergedModules : null,
        } as any)
        .eq("id", appId);

      if (updateError) throw updateError;

      const hasExisting = Boolean(accountDialogApprenant.auth_user_id);
      if (hasExisting) {
        toast({ title: "Accès cours mis à jour", description: "Les paramètres ont été enregistrés." });
        refetchApprenants();
        setAccountDialogApprenant(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-apprenant-account", {
        body: { apprenant_id: appId, email: accountDialogApprenant.email },
      });

      if (error) throw error;
      setGeneratedPassword(data?.password || "");
      // Log email for identifiants badge
      await supabase.from("emails").insert({
        apprenant_id: appId,
        subject: "Identifiants de connexion - Cours en ligne",
        type: "sent",
        sent_at: new Date().toISOString(),
        recipients: [accountDialogApprenant.email],
        sender_email: "noreply@ftransport.fr",
      });
      toast({ title: "Compte créé avec succès !", description: `Un email a été envoyé à ${accountDialogApprenant.email}.` });
      queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
      refetchApprenants();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Erreur lors de l'opération", variant: "destructive" });
    } finally {
      setCreatingAccount(false);
    }
  };

  // Envoi des identifiants de connexion (e-learning) à un apprenant
  const [sendingCredentialsFor, setSendingCredentialsFor] = useState<string | null>(null);
  const [bulkSendingCredentials, setBulkSendingCredentials] = useState(false);
  const [bulkResendingCredentials, setBulkResendingCredentials] = useState(false);


  const sendCredentialsToApprenant = async (apprenant: any): Promise<boolean> => {
    if (!apprenant?.email) {
      toast({ title: "Email manquant", description: `${apprenant?.prenom || ''} ${apprenant?.nom || ''} n'a pas d'adresse email.`, variant: "destructive" });
      return false;
    }
    const { data, error } = await supabase.functions.invoke("resend-credentials", {
      body: { apprenant_id: apprenant.id, reset_password: false },
    });
    if (error) throw error;
    // La fonction journalise elle-même l'email envoyé : ne rien tracer si l'envoi a échoué,
    // sinon le bouton passe au vert alors que l'apprenant n'a rien reçu.
    if (!(data as any)?.emailSent) {
      throw new Error((data as any)?.message || `L'email n'a pas pu être envoyé à ${apprenant.email}`);
    }
    return true;
  };

  const handleSendCredentials = async (apprenant: any) => {
    setSendingCredentialsFor(apprenant.id);
    try {
      const ok = await sendCredentialsToApprenant(apprenant);
      if (ok) {
        toast({ title: "Identifiants envoyés", description: `Email envoyé à ${apprenant.email}` });
        queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible d'envoyer les identifiants", variant: "destructive" });
    } finally {
      setSendingCredentialsFor(null);
    }
  };

  const handleBulkSendCredentials = async () => {
    const cibles = apprenantsInSession
      .map((sa: any) => sa.apprenant)
      .filter((a: any) => a && selectedApprenants.has(a.id));
    if (cibles.length === 0) return;
    setBulkSendingCredentials(true);
    let ok = 0;
    const echecs: string[] = [];
    for (const a of cibles) {
      try {
        const sent = await sendCredentialsToApprenant(a);
        if (sent) ok++;
        else echecs.push(`${a.nom} ${a.prenom}`);
      } catch (err: any) {
        echecs.push(`${a.nom} ${a.prenom}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
    setBulkSendingCredentials(false);
    toast({
      title: `Identifiants envoyés à ${ok}/${cibles.length} apprenant(s)`,
      description: echecs.length > 0 ? `Échecs : ${echecs.join(', ')}` : undefined,
      variant: echecs.length > 0 ? "destructive" : undefined,
    });
  };

  const handleResendCredentialsAll = async () => {
    const cibles = apprenantsInSession
      .map((sa: any) => sa.apprenant)
      .filter((a: any) => a && a.email);
    if (cibles.length === 0) {
      toast({ title: "Aucun apprenant avec email dans cette session" });
      return;
    }
    if (!window.confirm(`Renvoyer les identifiants de connexion à ${cibles.length} apprenant(s) de la session ?`)) return;
    setBulkResendingCredentials(true);
    let ok = 0;
    const echecs: string[] = [];
    for (const a of cibles) {
      try {
        const sent = await sendCredentialsToApprenant(a);
        if (sent) ok++;
        else echecs.push(`${a.nom} ${a.prenom}`);
      } catch {
        echecs.push(`${a.nom} ${a.prenom}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
    setBulkResendingCredentials(false);
    toast({
      title: `Identifiants renvoyés à ${ok}/${cibles.length} apprenant(s)`,
      description: echecs.length > 0 ? `Échecs : ${echecs.join(', ')}` : undefined,
      variant: echecs.length > 0 ? "destructive" : undefined,
    });
  };




  if (!session) return null;

  const sessionApprenantIds = apprenantsInSession.map((sa: any) => sa.apprenant?.id);
  const apprenantsNotInSession = filterAndSortApprenants(
    allApprenants.filter(a => !sessionApprenantIds.includes(a.id)),
    searchApprenant,
  );

  const sessionFormateurIds = formateursInSession.map((sf: any) => sf.formateur?.id);
  const formateursNotInSession = allFormateurs.filter(f => 
    !sessionFormateurIds.includes(f.id) &&
    (f.nom.toLowerCase().includes(searchFormateur.toLowerCase()) ||
     f.prenom.toLowerCase().includes(searchFormateur.toLowerCase()) ||
     (f.email?.toLowerCase() || "").includes(searchFormateur.toLowerCase()))
  );

  const addApprenant = async (apprenantId: string) => {
    try {
      // Vérifier si l'apprenant est déjà lié à cette session (peut être masqué par le filtre e-learning)
      const { data: existing } = await supabase
        .from('session_apprenants')
        .select('id')
        .eq('session_id', session.id)
        .eq('apprenant_id', apprenantId)
        .maybeSingle();

      if (existing) {
        refetchApprenants();
        setShowAddApprenant(false);
        toast({
          title: "Déjà inscrit",
          description: "Cet apprenant est déjà associé à la session (peut être masqué par un filtre).",
        });
        return;
      }

      const { error } = await supabase
        .from('session_apprenants')
        .insert({
          session_id: session.id,
          apprenant_id: apprenantId,
        });

      if (error) throw error;

      refetchApprenants();
      setShowAddApprenant(false);
      toast({
        title: "Apprenant ajouté",
        description: "L'apprenant a été ajouté à la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout",
        variant: "destructive",
      });
    }
  };

  const removeApprenant = async () => {
    if (!apprenantToDelete) return;
    try {
      const { error } = await supabase
        .from('session_apprenants')
        .delete()
        .eq('id', apprenantToDelete.id);
      
      if (error) throw error;
      
      setApprenantToDelete(null);
      refetchApprenants();
      toast({
        title: "Apprenant retiré",
        description: "L'apprenant a été retiré de la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du retrait",
        variant: "destructive",
      });
    }
  };

  const addFormateur = async (formateurId: string) => {
    try {
      const { error } = await supabase
        .from('session_formateurs')
        .insert({
          session_id: session.id,
          formateur_id: formateurId,
        });
      
      if (error) throw error;
      
      refetchFormateurs();
      setShowAddFormateur(false);
      toast({
        title: "Formateur ajouté",
        description: "Le formateur a été ajouté à la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout",
        variant: "destructive",
      });
    }
  };

  const removeFormateur = async (sessionFormateurId: string) => {
    try {
      const { error } = await supabase
        .from('session_formateurs')
        .delete()
        .eq('id', sessionFormateurId);
      
      if (error) throw error;
      
      refetchFormateurs();
      toast({
        title: "Formateur retiré",
        description: "Le formateur a été retiré de la session.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du retrait",
        variant: "destructive",
      });
    }
  };


  const togglePresenceFormateur = async (sessionFormateurId: string, currentPresence: string) => {
    // Cycle: present → absent → excuse → present
    const next = currentPresence === 'present' ? 'absent' : currentPresence === 'absent' ? 'excuse' : 'present';
    const { error } = await supabase
      .from('session_formateurs')
      .update({ presence: next })
      .eq('id', sessionFormateurId);
    if (!error) refetchFormateurs();
  };


  const sendSatisfactionEmailPratique = async (sessionApprenantId: string) => {
    try {
      const sa = apprenantsInSession.find((x: any) => x.id === sessionApprenantId) as any;
      const apprenant = sa?.apprenant;
      if (!apprenant?.email || !apprenant?.id) return;

      // Anti-doublon : ne pas renvoyer si un questionnaire de satisfaction a déjà été envoyé
      const { data: existing } = await supabase
        .from('emails')
        .select('id')
        .eq('apprenant_id', apprenant.id)
        .eq('type', 'sent')
        .ilike('subject', '%satisfaction%')
        .limit(1);
      if (existing && existing.length > 0) return;

      const { data: tpl } = await supabase
        .from('email_templates')
        .select('subject_template, body_template')
        .eq('id', 'questionnaire-satisfaction-pratique')
        .single();
      if (!tpl) return;

      const formation = apprenant.type_apprenant || 'VTC';
      const subject = tpl.subject_template
        .replace(/\{\{formation\}\}/g, formation)
        .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
        .replace(/\{\{nom\}\}/g, apprenant.nom || '');
      const body = tpl.body_template
        .replace(/\{\{formation\}\}/g, formation)
        .replace(/\{\{prenom\}\}/g, apprenant.prenom || '')
        .replace(/\{\{nom\}\}/g, apprenant.nom || '');
      const htmlBody = body.replace(/\n/g, '<br>');

      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          userEmail: 'contact@ftransport.fr',
          to: apprenant.email,
          subject,
          body: htmlBody,
        },
      });
      if (!error && data?.success) {
        await supabase.from('emails').insert({
          subject,
          body_html: htmlBody,
          body_preview: body.slice(0, 200),
          sender_email: 'contact@ftransport.fr',
          recipients: [apprenant.email],
          type: 'sent',
          is_read: true,
          sent_at: new Date().toISOString(),
          apprenant_id: apprenant.id,
        });
        toast({
          title: "📋 Questionnaire de satisfaction envoyé",
          description: `À ${apprenant.prenom} ${apprenant.nom}`,
        });
      }
    } catch (e) {
      console.error('Erreur envoi satisfaction (pratique):', e);
    }
  };

  const updateSessionApprenant = async (
    sessionApprenantId: string, 
    updates: { notes?: string; presence_pratique?: string | null; statut_suivi?: string | null; date_fin_personnalisee?: string | null; heure_debut_personnalisee?: string | null; heure_fin_personnalisee?: string | null }
  ) => {
    try {
      // Détection transition présence pratique -> present (pour envoi satisfaction)
      const previous = apprenantsInSession.find((x: any) => x.id === sessionApprenantId) as any;
      const wasPresent = (previous?.presence_pratique || 'present') === 'present';
      const willBePresent = updates.presence_pratique === 'present';
      const isPratiqueSession = isPratiqueType(session?.type_session);

      const { error } = await supabase
        .from('session_apprenants')
        .update(updates)
        .eq('id', sessionApprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Notes mises à jour",
        description: "Les notes ont été enregistrées.",
      });

      // Envoi automatique du questionnaire de satisfaction après entraînement pratique
      if (isPratiqueSession && willBePresent && !wasPresent) {
        sendSatisfactionEmailPratique(sessionApprenantId);
      }

      // Extension automatique de +1 mois de l'accès e-learning
      // pour TOUS les apprenants marqués présents en présentiel
      if (willBePresent && !wasPresent) {
        try {
          const app = previous?.apprenant;
          if (app?.id) {
            const baseStr = app.date_fin_cours_en_ligne || null;
            const base = baseStr ? new Date(baseStr) : new Date();
            const extended = new Date(base);
            extended.setMonth(extended.getMonth() + 1);
            const newEndIso = extended.toISOString().slice(0, 10);
            // N'étend que si la nouvelle date est postérieure à l'existante
            if (!baseStr || newEndIso > String(baseStr).slice(0, 10)) {
              const { error: extErr } = await supabase
                .from('apprenants')
                .update({ date_fin_cours_en_ligne: newEndIso })
                .eq('id', app.id);
              if (!extErr) {
                toast({
                  title: '📅 Accès prolongé (+1 mois)',
                  description: `Nouvel accès jusqu'au ${extended.toLocaleDateString('fr-FR')}.`,
                });
              }
            }
          }
        } catch (extErr) {
          console.error('[SessionDetail] Erreur extension accès e-learning:', extErr);
        }
      }

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  // Fonction pour mettre à jour le paiement dans apprenants
  const updateApprenantPaiement = async (
    apprenantId: string, 
    updates: { montant_paye?: number; moyen_paiement?: string; date_paiement?: string | null; notes?: string }
  ) => {
    try {
      const { error } = await supabase
        .from('apprenants')
        .update(updates)
        .eq('id', apprenantId);
      
      if (error) throw error;
      
      refetchApprenants();
      toast({
        title: "Paiement mis à jour",
        description: "Les informations de paiement ont été enregistrées.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  // Fonction pour convertir "20 Jan 2026" en Date
  const parseFrenchDate = (dateStr: string): Date => {
    const months: { [key: string]: number } = {
      "Jan": 0, "Fév": 1, "Mars": 2, "Avr": 3, "Mai": 4, "Juin": 5,
      "Juil": 6, "Août": 7, "Sept": 8, "Oct": 9, "Nov": 10, "Déc": 11,
      "janv.": 0, "févr.": 1, "mars": 2, "avr.": 3, "mai": 4, "juin": 5,
      "juil.": 6, "août": 7, "sept.": 8, "oct.": 9, "nov.": 10, "déc.": 11
    };
    
    const parts = dateStr.split(" ");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]] ?? 0;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const handleDownloadEmargement = () => {
    if (apprenantsInSession.length === 0) {
      toast({
        title: "Aucun apprenant",
        description: "Ajoutez des apprenants à la session pour générer les feuilles d'émargement.",
        variant: "destructive",
      });
      return;
    }

    const dateDebut = session.dateDebut;
    const dateFin = session.dateFin;

    // Récupérer les noms des formateurs assignés
    const formateurNames = formateursInSession.length > 0 
      ? formateursInSession.map((sf: any) => {
          const f = sf.formateur;
          return f ? `${f.prenom} ${f.nom}` : "Non défini";
        })
      : [session.formateur || "GUENICHI Naoufal"];

    const sessionData = {
      title: session.title,
      formation: session.formation,
      dateDebut: dateDebut,
      dateFin: dateFin,
      lieu: session.lieu,
      formateurs: formateurNames,
    };

    const apprenantsList = apprenantsInSession.map((sa: any) => ({
      id: parseInt(sa.apprenant?.id?.slice(-4) || "0", 16) || 1,
      nom: sa.apprenant?.nom || "",
      prenom: sa.apprenant?.prenom || "",
    }));

    generateEmargementPDF(sessionData, apprenantsList);

    toast({
      title: "Feuilles d'émargement générées",
      description: `${apprenantsList.length} feuille(s) d'émargement téléchargée(s).`,
    });
  };

  const buildAttestationDataForApprenant = (apprenant: any, sessionApprenant: any) => {
    const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
    const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
    const fc: any = (financeursFCMap as any)?.[apprenant.id] || {};
    return {
      data: {
        nom: apprenant.nom,
        prenom: apprenant.prenom,
        dateFin: sessionApprenant?.date_fin_personnalisee || session.dateFin || apprenant.date_fin_formation || apprenant.date_debut_formation || new Date().toISOString().split('T')[0],
        dateDebut: sessionApprenant?.date_debut || session.dateDebut || apprenant.date_debut_formation,
        adresse: apprenant.adresse || fc.adresse || '',
        codePostal: apprenant.code_postal || fc.code_postal || '',
        ville: apprenant.ville || fc.ville || '',
        telephone: apprenant.telephone || fc.contact_telephone || '',
        email: apprenant.email || fc.contact_email || fc.email_facturation || '',
        dateNaissance: apprenant.date_naissance || '',
        formation,
      },
      formation,
    };
  };

  const checkApprenantsCompleteness = (): { ok: boolean; missing: string[] } => {
    const missing: string[] = [];
    for (const sa of apprenantsInSession) {
      const a = sa.apprenant;
      if (!a) continue;
      const fc: any = (financeursFCMap as any)?.[a.id] || {};
      const adresse = a.adresse || fc.adresse;
      const cp = a.code_postal || fc.code_postal;
      const ville = a.ville || fc.ville;
      const tel = a.telephone || fc.contact_telephone;
      const email = a.email || fc.contact_email || fc.email_facturation;
      const fields: string[] = [];
      if (!a.nom?.trim()) fields.push('nom');
      if (!a.prenom?.trim()) fields.push('prénom');
      if (!adresse?.trim()) fields.push('adresse');
      if (!cp?.trim()) fields.push('code postal');
      if (!ville?.trim()) fields.push('ville');
      // Téléphone non bloquant pour la génération d'attestation
      if (!email?.trim()) fields.push('email');
      if (fields.length) {
        missing.push(`${a.prenom || ''} ${a.nom || ''} → ${fields.join(', ')}`);
      }
    }
    return { ok: missing.length === 0, missing };
  };

  const handleBulkDownloadAttestations = async () => {
    if (!apprenantsInSession.length) {
      toast({ title: "Aucun apprenant", description: "Cette session ne contient aucun apprenant.", variant: "destructive" });
      return;
    }
    const check = checkApprenantsCompleteness();
    if (!check.ok) {
      toast({
        title: "Informations manquantes",
        description: `Veuillez compléter la fiche apprenant avant de générer :\n${check.missing.join('\n')}`,
        variant: "destructive",
      });
      return;
    }
    setBulkDownloadingAttestations(true);
    try {
      let mergedDoc: any = null;
      let count = 0;
      for (const sa of apprenantsInSession) {
        const apprenant = sa.apprenant;
        if (!apprenant) continue;
        const { data } = buildAttestationDataForApprenant(apprenant, sa);
        const result: any = await generateAttestationFCVTC(data, {
          returnDoc: true,
          existingDoc: mergedDoc ?? undefined,
          addPage: !!mergedDoc,
        });
        if (result?.doc) {
          mergedDoc = result.doc;
          count++;
        }
      }
      if (!mergedDoc || count === 0) {
        toast({ title: "Aucune attestation", description: "Aucune attestation n'a pu être générée.", variant: "destructive" });
        return;
      }
      const safeTitle = (session.title || 'session').replace(/[^a-zA-Z0-9_-]+/g, '_');
      mergedDoc.save(`Attestations_FC_${safeTitle}.pdf`);
      toast({ title: "Attestations téléchargées", description: `${count} attestation(s) regroupée(s) dans un seul PDF.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: err?.message || "Impossible de générer les attestations.", variant: "destructive" });
    } finally {
      setBulkDownloadingAttestations(false);
    }
  };

  const handleBulkSendAttestations = async () => {
    if (!apprenantsInSession.length) {
      toast({ title: "Aucun apprenant", description: "Cette session ne contient aucun apprenant.", variant: "destructive" });
      return;
    }
    const check = checkApprenantsCompleteness();
    if (!check.ok) {
      toast({
        title: "Informations manquantes",
        description: `Veuillez compléter la fiche apprenant avant d'envoyer :\n${check.missing.join('\n')}`,
        variant: "destructive",
      });
      return;
    }
    // Vérifie qu'au moins un apprenant a un email
    const withEmail = apprenantsInSession.filter(sa => sa.apprenant?.email);
    if (withEmail.length === 0) {
      toast({
        title: "Aucun destinataire",
        description: "Aucun apprenant de cette session n'a d'email renseigné.",
        variant: "destructive",
      });
      return;
    }

    // Confirmation : window.confirm est bloqué dans l'iframe de preview Lovable,
    // on ne l'utilise donc qu'en fenêtre principale.
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    if (!inIframe) {
      const confirmed = window.confirm(
        `Envoyer ${withEmail.length} attestation(s) par email ?\n\n` +
        "Elles seront aussi déposées dans l'espace apprenant " +
        "(module « Remboursement formation continue »)."
      );
      if (!confirmed) return;
    }
    setBulkSendingAttestations(true);
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (const sa of apprenantsInSession) {
        const apprenant = sa.apprenant;
        if (!apprenant) continue;
        if (!apprenant.email) { skipped++; continue; }
        try {
          const { data, formation } = buildAttestationDataForApprenant(apprenant, sa);
          const result = await generateAttestationFCVTC(data, { returnBlob: true });
          if (!result?.blob) { failed++; continue; }
          const arrayBuffer = await result.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
          }
          const base64 = btoa(binary);
          const subject = `Votre attestation de formation continue ${formation}`;
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0;">FTRANSPORT</h1>
                <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC & TAXI</p>
              </div>
              <div style="padding: 30px; background-color: #ffffff;">
                <p>Bonjour ${apprenant.prenom} ${apprenant.nom},</p>
                <p>Veuillez trouver ci-joint votre <strong>attestation de formation continue ${formation}</strong> (valable 5 ans).</p>
                <p>Conservez précieusement ce document, il pourra vous être demandé lors d'un contrôle.</p>
                <p>Cordialement,<br/>L'équipe FTRANSPORT</p>
              </div>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280;">
                <p><strong>FTRANSPORT</strong> – 86 Route de Genas, 69003 Lyon</p>
                <p>📞 04 28 29 60 91 | 📧 contact@ftransport.fr</p>
              </div>
            </div>
          `;
          const { error } = await supabase.functions.invoke('send-document-email', {
            body: {
              apprenantId: apprenant.id,
              recipientEmail: apprenant.email,
              recipientName: `${apprenant.prenom} ${apprenant.nom}`,
              subject,
              htmlBody,
              attachmentName: result.fileName,
              attachmentBase64: base64,
              attachmentContentType: 'application/pdf',
            },
          });
          if (error) { failed++; continue; }
          // Dépose l'attestation dans le dossier apprenant pour qu'elle
          // apparaisse dans le module « Remboursement formation continue ».
          try {
            await saveAttestationToCRM({
              apprenantId: apprenant.id,
              fileName: result.fileName,
              blob: result.blob,
              formation,
            });
          } catch (e) {
            console.error('[bulkSendAttestations] saveAttestationToCRM error', e);
          }
          sent++;
        } catch (e) {
          console.error('Erreur envoi attestation', e);
          failed++;
        }
      }
      toast({
        title: "Envoi terminé",
        description: `${sent} envoyée(s)${skipped ? `, ${skipped} sans email` : ''}${failed ? `, ${failed} échec(s)` : ''}.`,
      });
    } finally {
      setBulkSendingAttestations(false);
    }
  };

  // ===== FACTURES FORMATION CONTINUE =====
  const FC_MONTANT_TTC = 200; // Formation continue VTC/TAXI : 200 € (montant par défaut, modifiable)

  // Montant facturé pour un apprenant : facture existante > montant personnalisé de la session > défaut
  const getMontantFactureFor = (apprenant: any, sessionApprenant?: any): number => {
    const facture: any = (facturesFCMap as any)?.[apprenant?.id] || null;
    if (facture?.montant_ttc != null) return Number(facture.montant_ttc);
    const sa = sessionApprenant
      || (apprenantsInSession as any[]).find((s: any) => s.apprenant_id === apprenant?.id);
    if (sa?.montant_total != null && Number(sa.montant_total) > 0) return Number(sa.montant_total);
    return FC_MONTANT_TTC;
  };

  // Édition inline du montant TTC
  const [editMontantFor, setEditMontantFor] = useState<string | null>(null);
  const [editMontantValue, setEditMontantValue] = useState('');
  const [editMontantSaving, setEditMontantSaving] = useState(false);

  const handleSaveMontantFacture = async (apprenant: any, sessionApprenant: any) => {
    const montant = parseFloat(String(editMontantValue).replace(',', '.'));
    if (!Number.isFinite(montant) || montant <= 0) {
      toast({ title: "Montant invalide", description: "Saisir un montant TTC > 0.", variant: "destructive" });
      return;
    }
    try {
      setEditMontantSaving(true);
      if (sessionApprenant?.id) {
        const { error } = await supabase
          .from('session_apprenants')
          .update({ montant_total: montant })
          .eq('id', sessionApprenant.id);
        if (error) throw error;
      }
      const facture: any = (facturesFCMap as any)?.[apprenant.id] || null;
      if (facture?.id) {
        const { error } = await supabase
          .from('factures')
          .update({ montant_ht: montant, montant_tva: 0, tva_taux: 0, montant_ttc: montant })
          .eq('id', facture.id);
        if (error) throw error;
      }
      await Promise.all([refetchApprenants(), refetchFacturesFC()]);
      setEditMontantFor(null);
      toast({ title: "Montant mis à jour", description: `${apprenant.prenom} ${apprenant.nom} — ${montant.toFixed(2)} € TTC` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de modifier le montant.", variant: "destructive" });
    } finally {
      setEditMontantSaving(false);
    }
  };


  // Génère le prochain numéro YYYYMMDD### selon la BDD
  const generateNextNumeroFacture = async (): Promise<string> => {
    const today = new Date();
    const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('factures')
      .select('numero')
      .like('numero', `${yyyymmdd}%`)
      .order('numero', { ascending: false })
      .limit(1);
    if (error) console.warn('numero seq error', error);
    let next = 1;
    if (data && data[0]?.numero) {
      const seq = parseInt(String(data[0].numero).slice(8)) || 0;
      next = seq + 1;
    }
    return `${yyyymmdd}${String(next).padStart(3, '0')}`;
  };

  const buildFactureDataForApprenant = (apprenant: any, sessionApprenant: any, indexInSession: number, overrides?: { numero?: string; dateEmission?: string }) => {
    const fc: any = (financeursFCMap as any)?.[apprenant.id] || null;
    const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
    const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
    const montantTTC = getMontantFactureFor(apprenant, sessionApprenant);
    const tva = 0; // TVA non applicable - art 293 B
    const montantHT = montantTTC / (1 + tva / 100);
    const yyyymmdd = overrides?.dateEmission || new Date().toISOString().split('T')[0];
    const numero = overrides?.numero || `BR-${apprenant.id.slice(0, 6)}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Détermine si la facture est acquittée à partir du statut + paiements
    const facture: any = (facturesFCMap as any)?.[apprenant.id] || null;
    const paiements: any[] = (facture?.id && (paiementsByFactureId as any)?.[facture.id]) || [];
    const totalPaye = paiements.reduce((s: number, p: any) => s + Number(p?.montant || 0), 0);
    const isAcquittee = facture?.statut === 'payee' || (totalPaye + 0.001 >= montantTTC && paiements.length > 0);
    const lastPaiement = paiements.length ? paiements[paiements.length - 1] : null;

    return {
      numero,
      dateEmission: yyyymmdd,
      dateEcheance: dueDate,
      apprenant: {
        nom: apprenant.nom,
        prenom: apprenant.prenom,
        adresse: apprenant.adresse || fc?.adresse,
        code_postal: apprenant.code_postal || fc?.code_postal,
        ville: apprenant.ville || fc?.ville,
        email: apprenant.email,
        telephone: apprenant.telephone,
      },
      financeur: fc,
      formation,
      designation: `Formation Continue Obligatoire ${formation} - 14h`,
      montantHT,
      tvaTaux: tva,
      duree: '14h',
      refDossier: fc?.numero_dossier || apprenant.numero_dossier_cma || undefined,
      acquittee: isAcquittee,
      dateAcquittement: isAcquittee ? (facture?.date_paiement || lastPaiement?.date_paiement || undefined) : undefined,
      moyenPaiement: isAcquittee ? (lastPaiement?.moyen_paiement || undefined) : undefined,
    };
  };

  const getFactureRecipientEmail = (apprenant: any): string | null => {
    const fc: any = (financeursFCMap as any)?.[apprenant.id] || null;
    return (fc?.email_facturation || fc?.contact_email || apprenant.email || '').trim() || null;
  };

  // Créer une facture additionnelle pour un apprenant (montant + libellé libres)
  const handleCreateExtraFacture = async () => {
    if (!addExtraFactureFor) return;
    const apprenant = addExtraFactureFor;
    const montant = parseFloat(extraFactureMontant.replace(',', '.'));
    const libelle = extraFactureLibelle.trim();
    if (!Number.isFinite(montant) || montant <= 0) {
      toast({ title: "Montant invalide", description: "Saisir un montant TTC > 0.", variant: "destructive" });
      return;
    }
    if (!libelle) {
      toast({ title: "Libellé requis", description: "Décrire la prestation facturée.", variant: "destructive" });
      return;
    }
    try {
      setExtraFactureSaving(true);
      const fc: any = (financeursFCMap as any)?.[apprenant.id] || null;
      const isPro = fc?.type_financeur === 'professionnel';
      const numero = await generateNextNumeroFacture();
      // La facture additionnelle est TOUJOURS émise au nom du financeur si présent
      const clientNom = fc
        ? (isPro
            ? (fc?.raison_sociale || fc?.contact_nom || `${apprenant.prenom} ${apprenant.nom}`)
            : (fc?.contact_nom || fc?.raison_sociale || `${apprenant.prenom} ${apprenant.nom}`))
        : `${apprenant.prenom} ${apprenant.nom}`;
      const clientAdresse = fc
        ? [fc?.adresse || '', [fc?.code_postal || '', fc?.ville || ''].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        : [apprenant.adresse || '', [apprenant.code_postal || '', apprenant.ville || ''].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const payload: any = {
        numero,
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type_financement: isPro ? 'professionnel' : 'particulier',
        client_nom: clientNom,
        client_adresse: clientAdresse || null,
        client_siret: isPro ? (fc?.siret || fc?.siren || null) : null,
        montant_ht: montant,
        tva_taux: 0,
        montant_tva: 0,
        montant_ttc: montant,
        statut: 'en_attente',
        session_id: session.id,
        apprenant_id: apprenant.id,
        numero_convention: `EXTRA::${libelle}`,
      };
      const { error } = await supabase.from('factures').insert(payload);
      if (error) throw error;
      await refetchExtraFactures();
      toast({ title: "Facture ajoutée", description: `${libelle} — ${montant.toFixed(2)} € — ${apprenant.prenom} ${apprenant.nom}` });
      setAddExtraFactureFor(null);
      setExtraFactureMontant('');
      setExtraFactureLibelle('');
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible d'ajouter la facture.", variant: "destructive" });
    } finally {
      setExtraFactureSaving(false);
    }
  };

  const handleDeleteExtraFacture = async (factureId: string) => {
    if (!confirm("Supprimer cette facture additionnelle ?")) return;
    try {
      setExtraFactureDeleting(factureId);
      // Supprimer d'abord les paiements liés
      await supabase.from('facture_paiements' as any).delete().eq('facture_id', factureId);
      const { error } = await supabase.from('factures').delete().eq('id', factureId);
      if (error) throw error;
      await Promise.all([refetchExtraFactures(), refetchPaiements()]);
      toast({ title: "Facture supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Suppression impossible.", variant: "destructive" });
    } finally {
      setExtraFactureDeleting(null);
    }
  };

  // Construit les données PDF pour une facture additionnelle (EXTRA::)
  const buildExtraFactureData = (apprenant: any, ef: any) => {
    const fc: any = (financeursFCMap as any)?.[apprenant.id] || null;
    const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
    const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
    const libelle = String(ef.numero_convention || '').replace(/^EXTRA::/, '') || 'Prestation complémentaire';
    const montantTTC = Number(ef.montant_ttc || 0);
    const paiements: any[] = (paiementsByFactureId as any)?.[ef.id] || [];
    const totalPaye = paiements.reduce((s: number, p: any) => s + Number(p?.montant || 0), 0);
    const isAcquittee = ef.statut === 'payee' || (totalPaye + 0.001 >= montantTTC && paiements.length > 0);
    const lastPaiement = paiements.length ? paiements[paiements.length - 1] : null;
    return {
      numero: ef.numero,
      dateEmission: ef.date_emission || new Date().toISOString().split('T')[0],
      dateEcheance: ef.date_echeance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      apprenant: {
        nom: apprenant.nom,
        prenom: apprenant.prenom,
        adresse: apprenant.adresse || fc?.adresse,
        code_postal: apprenant.code_postal || fc?.code_postal,
        ville: apprenant.ville || fc?.ville,
        email: apprenant.email,
        telephone: apprenant.telephone,
      },
      financeur: fc,
      formation,
      designation: libelle,
      montantHT: montantTTC,
      tvaTaux: 0,
      duree: '',
      refDossier: fc?.numero_dossier || apprenant.numero_dossier_cma || undefined,
      acquittee: isAcquittee,
      dateAcquittement: isAcquittee ? (ef.date_paiement || lastPaiement?.date_paiement || undefined) : undefined,
      moyenPaiement: isAcquittee ? (lastPaiement?.moyen_paiement || undefined) : undefined,
    };
  };

  const [extraFactureActionId, setExtraFactureActionId] = useState<string | null>(null);

  const handleDownloadExtraFacture = async (apprenant: any, ef: any) => {
    try {
      setExtraFactureActionId(ef.id);
      const data = buildExtraFactureData(apprenant, ef);
      const result: any = await generateFactureFC(data, { returnBlob: true });
      if (result?.blob && result?.fileName) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url; a.download = result.fileName; a.click();
        URL.revokeObjectURL(url);
        await saveFactureToCRM({
          apprenantId: apprenant.id,
          numero: ef.numero,
          fileName: result.fileName,
          blob: result.blob,
        });
        toast({ title: "Facture téléchargée", description: `${ef.numero} — archivée dans le dossier de formation` });
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de générer la facture.", variant: "destructive" });
    } finally {
      setExtraFactureActionId(null);
    }
  };

  const handleSendExtraFacture = async (apprenant: any, ef: any) => {
    const recipient = getFactureRecipientEmail(apprenant);
    if (!recipient) {
      toast({ title: "Aucun email destinataire", description: "Renseignez l'email du financeur ou de l'apprenant.", variant: "destructive" });
      return;
    }
    try {
      setExtraFactureActionId(ef.id);
      const data = buildExtraFactureData(apprenant, ef);
      const result: any = await generateFactureFC(data, { returnBlob: true });
      if (!result?.blob) throw new Error("PDF non généré");
      const arrayBuffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i2 = 0; i2 < bytes.length; i2 += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i2, i2 + chunkSize)));
      }
      const base64 = btoa(binary);
      const libelle = String(ef.numero_convention || '').replace(/^EXTRA::/, '') || 'Prestation';
      const subject = `Votre facture ${ef.numero} - ${libelle}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint la facture <strong>${ef.numero}</strong> (${libelle}) concernant <strong>${apprenant.prenom} ${apprenant.nom}</strong>.</p>
          <p>Pour tout règlement par virement, merci de nous indiquer le numéro de facture en référence.</p>
          <p>Cordialement,<br/>Services pro Ftransport<br/>contact@ftransport.fr</p>
        </div>`;
      const { data: resp, error } = await supabase.functions.invoke('send-document-email', {
        body: {
          apprenantId: apprenant.id,
          recipientEmail: recipient,
          recipientName: `${apprenant.prenom} ${apprenant.nom}`,
          subject,
          htmlBody,
          attachmentBase64: base64,
          attachmentName: result.fileName,
          attachmentContentType: 'application/pdf',
        },
      });
      if (error || (resp as any)?.error) throw new Error((error as any)?.message || (resp as any)?.error || 'Envoi échoué');
      await saveFactureToCRM({
        apprenantId: apprenant.id,
        numero: ef.numero,
        fileName: result.fileName,
        blob: result.blob,
      });
      toast({ title: "Facture envoyée", description: `${ef.numero} → ${recipient}` });
    } catch (e: any) {
      toast({ title: "Erreur envoi", description: e?.message || "Impossible d'envoyer la facture.", variant: "destructive" });
    } finally {
      setExtraFactureActionId(null);
    }
  };

  // Upsert d'une facture en BDD comme brouillon (créée si absente, sinon retournée)
  const ensureFactureBrouillon = async (apprenant: any, sessionApprenant: any): Promise<any> => {
    const existing = (facturesFCMap as any)?.[apprenant.id];
    if (existing) return existing;
    const fc: any = (financeursFCMap as any)?.[apprenant.id] || null;
    const isPro = fc?.type_financeur === 'professionnel';
    const numero = await generateNextNumeroFacture();
    const clientNom = isPro
      ? (fc?.raison_sociale || `${apprenant.prenom} ${apprenant.nom}`)
      : `${apprenant.prenom} ${apprenant.nom}`;
    const clientAdresse = [
      (apprenant.adresse || fc?.adresse) || '',
      [(apprenant.code_postal || fc?.code_postal) || '', (apprenant.ville || fc?.ville) || ''].filter(Boolean).join(' ')
    ].filter(Boolean).join(', ');
    const payload: any = {
      numero,
      date_emission: new Date().toISOString().split('T')[0],
      date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type_financement: isPro ? 'professionnel' : 'particulier',
      client_nom: clientNom,
      client_adresse: clientAdresse || null,
      client_siret: isPro ? (fc?.siret || fc?.siren || null) : null,
      montant_ht: getMontantFactureFor(apprenant, sessionApprenant),
      tva_taux: 0,
      montant_tva: 0,
      montant_ttc: getMontantFactureFor(apprenant, sessionApprenant),
      statut: 'brouillon',
      session_id: session.id,
      apprenant_id: apprenant.id,
    };
    const { data, error } = await supabase.from('factures').insert(payload).select().single();
    if (error) throw error;
    return data;
  };

  const handleDownloadSingleFacture = async (apprenant: any, sessionApprenant: any, idx: number) => {
    try {
      setSingleFactureLoading(apprenant.id);
      const facture = await ensureFactureBrouillon(apprenant, sessionApprenant);
      const data = buildFactureDataForApprenant(apprenant, sessionApprenant, idx, {
        numero: facture.numero,
        dateEmission: facture.date_emission,
      });
      // Génère le PDF et récupère le blob pour archivage CRM
      const result: any = await generateFactureFC(data, { returnBlob: true });
      if (result?.blob && result?.fileName) {
        // Téléchargement local
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url; a.download = result.fileName; a.click();
        URL.revokeObjectURL(url);
        // Archivage dans le dossier de formation de l'apprenant
        await saveFactureToCRM({
          apprenantId: apprenant.id,
          numero: facture.numero,
          fileName: result.fileName,
          blob: result.blob,
        });
      }
      await refetchFacturesFC();
      toast({ title: "Facture téléchargée", description: `${apprenant.prenom} ${apprenant.nom} (Brouillon ${facture.numero}) — archivée dans le dossier de formation` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de générer la facture.", variant: "destructive" });
    } finally {
      setSingleFactureLoading(null);
    }
  };

  const handleBulkDownloadFactures = async () => {
    const targets = (selectedFactureApprenants.size > 0
      ? nonAbsentApprenants.filter((sa: any) => sa.apprenant && selectedFactureApprenants.has(sa.apprenant.id))
      : nonAbsentApprenants);
    if (!targets.length) {
      toast({ title: "Aucun apprenant sélectionné", variant: "destructive" });
      return;
    }
    setBulkDownloadingFactures(true);
    try {
      let mergedDoc: any = null;
      let count = 0;
      let archived = 0;
      for (let i = 0; i < targets.length; i++) {
        const sa = targets[i];
        if (!sa.apprenant) continue;
        const facture = await ensureFactureBrouillon(sa.apprenant, sa);
        const data = buildFactureDataForApprenant(sa.apprenant, sa, i, {
          numero: facture.numero,
          dateEmission: facture.date_emission,
        });
        // 1) Génère un PDF individuel pour archivage CRM
        try {
          const single: any = await generateFactureFC(data, { returnBlob: true });
          if (single?.blob && single?.fileName) {
            const ok = await saveFactureToCRM({
              apprenantId: sa.apprenant.id,
              numero: facture.numero,
              fileName: single.fileName,
              blob: single.blob,
            });
            if (ok) archived++;
          }
        } catch (archiveErr) {
          console.error('[Factures] Archivage CRM échoué pour', sa.apprenant?.id, archiveErr);
        }
        // 2) Concatène pour le PDF unique de téléchargement
        const result: any = await generateFactureFC(data, {
          returnDoc: true,
          existingDoc: mergedDoc ?? undefined,
          addPage: !!mergedDoc,
        });
        if (result?.doc) { mergedDoc = result.doc; count++; }
      }
      await refetchFacturesFC();
      if (!mergedDoc || !count) {
        toast({ title: "Aucune facture", variant: "destructive" });
        return;
      }
      const safeTitle = (session.title || 'session').replace(/[^a-zA-Z0-9_-]+/g, '_');
      mergedDoc.save(`Factures_FC_${safeTitle}.pdf`);
      toast({ title: "Factures téléchargées", description: `${count} facture(s) regroupée(s) — ${archived} archivée(s) dans les dossiers de formation.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Échec génération factures.", variant: "destructive" });
    } finally {
      setBulkDownloadingFactures(false);
    }
  };

  const handleBulkSendFactures = async () => {
    const targets = (selectedFactureApprenants.size > 0
      ? nonAbsentApprenants.filter((sa: any) => sa.apprenant && selectedFactureApprenants.has(sa.apprenant.id))
      : nonAbsentApprenants);
    if (!targets.length) {
      toast({ title: "Aucun apprenant sélectionné", variant: "destructive" });
      return;
    }

    // Vérifie qu'au moins un destinataire a un email
    const withEmail = targets.filter((sa: any) => sa.apprenant && getFactureRecipientEmail(sa.apprenant));
    if (withEmail.length === 0) {
      toast({
        title: "Aucun email destinataire",
        description: "Renseignez l'email de facturation du financeur ou de l'apprenant.",
        variant: "destructive",
      });
      return;
    }

    // Confirmation via toast simple (pas de window.confirm — bloqué en iframe preview)
    const ok = typeof window !== 'undefined' && window.top === window
      ? window.confirm(`Envoyer ${withEmail.length} facture(s) par email aux financeurs ?`)
      : true;
    if (!ok) return;


    setBulkSendingFactures(true);
    let sent = 0, skipped = 0, failed = 0;
    try {
      for (let i = 0; i < targets.length; i++) {
        const sa = targets[i];
        const apprenant = sa.apprenant;
        if (!apprenant) continue;
        const recipient = getFactureRecipientEmail(apprenant);
        if (!recipient) { skipped++; continue; }
        try {
          const facture = await ensureFactureBrouillon(apprenant, sa);
          const data = buildFactureDataForApprenant(apprenant, sa, i, {
            numero: facture.numero,
            dateEmission: facture.date_emission,
          });
          const result: any = await generateFactureFC(data, { returnBlob: true });
          if (!result?.blob) { failed++; continue; }
          const arrayBuffer = await result.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000;
          for (let i2 = 0; i2 < bytes.length; i2 += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i2, i2 + chunkSize)));
          }
          const base64 = btoa(binary);
          const subject = `Votre facture ${data.numero} - Formation Continue ${data.formation}`;
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Bonjour,</p>
              <p>Veuillez trouver ci-joint la facture <strong>${data.numero}</strong> concernant la formation continue ${data.formation} de <strong>${apprenant.prenom} ${apprenant.nom}</strong>.</p>
              <p>Pour tout règlement par virement, merci de nous indiquer le numéro de facture en référence.</p>
              <p>Cordialement,<br/>Services pro Ftransport<br/>contact@ftransport.fr</p>
            </div>`;
          const { data: resp, error } = await supabase.functions.invoke('send-document-email', {
            body: {
              apprenantId: apprenant.id,
              recipientEmail: recipient,
              recipientName: `${apprenant.prenom} ${apprenant.nom}`,
              subject,
              htmlBody,
              attachmentBase64: base64,
              attachmentName: result.fileName,
              attachmentContentType: 'application/pdf',
            },
          });
          if (error || (resp as any)?.error) {
            console.error('[bulkSendFactures] send error', error || (resp as any)?.error);
          }

          if (error || (resp as any)?.error) { failed++; continue; }
          sent++;

        } catch (e) {
          console.error('Erreur envoi facture', e);
          failed++;
        }
      }
      await refetchFacturesFC();
      toast({
        title: "Envoi terminé",
        description: `${sent} envoyée(s)${skipped ? `, ${skipped} sans email financeur` : ''}${failed ? `, ${failed} échec(s)` : ''}.`,
      });
    } finally {
      setBulkSendingFactures(false);
    }
  };

  // Valider définitivement une facture (brouillon → en_attente)
  const handleValidateFacture = async (apprenant: any, sa: any) => {
    try {
      const facture = await ensureFactureBrouillon(apprenant, sa);
      if (facture.statut !== 'brouillon') {
        toast({ title: "Déjà validée", description: `Statut : ${facture.statut}` });
        return;
      }
      const { error } = await supabase
        .from('factures')
        .update({ statut: 'en_attente' })
        .eq('id', facture.id);
      if (error) throw error;
      await refetchFacturesFC();
      toast({ title: "Facture validée", description: `${facture.numero} • ${apprenant.prenom} ${apprenant.nom}` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Validation impossible", variant: "destructive" });
    }
  };

  // Valider toutes les brouillons en bloc
  const handleBulkValidateFactures = async () => {
    const targets = (selectedFactureApprenants.size > 0
      ? nonAbsentApprenants.filter((sa: any) => sa.apprenant && selectedFactureApprenants.has(sa.apprenant.id))
      : nonAbsentApprenants);
    if (!targets.length) return;
    setBulkValidatingFactures(true);
    let validated = 0, skipped = 0;
    try {
      for (const sa of targets) {
        if (!sa.apprenant) continue;
        const facture = await ensureFactureBrouillon(sa.apprenant, sa);
        if (facture.statut === 'brouillon') {
          const { error } = await supabase
            .from('factures')
            .update({ statut: 'en_attente' })
            .eq('id', facture.id);
          if (!error) validated++; else skipped++;
        } else {
          skipped++;
        }
      }
      await refetchFacturesFC();
      toast({ title: "Validation terminée", description: `${validated} validée(s)${skipped ? `, ${skipped} déjà validée(s)` : ''}.` });
    } finally {
      setBulkValidatingFactures(false);
    }
  };

  // Ajouter un paiement (un même apprenant peut avoir plusieurs paiements)
  const FC_MONTANT_FACTURE = 200;
  const handleSaveAcquittement = async () => {
    if (!acquittementApprenant) return;
    setAcquittementSaving(true);
    try {
      // Si on paye une facture extra, on la retrouve via __extraFactureId
      let facture: any = null;
      const extraId = (acquittementApprenant as any).__extraFactureId as string | undefined;
      if (extraId) {
        const list: any[] = ((extraFacturesByApprenantId as any)?.[acquittementApprenant.id]) || [];
        facture = list.find((f) => f.id === extraId) || null;
      } else {
        facture = (facturesFCMap as any)?.[acquittementApprenant.id];
      }
      if (!facture) {
        toast({ title: "Aucune facture", description: "Téléchargez d'abord la facture pour la créer.", variant: "destructive" });
        return;
      }
      const montantNum = Number((acquittementMontant || '').toString().replace(',', '.'));
      if (!isFinite(montantNum) || montantNum <= 0) {
        toast({ title: "Montant invalide", description: "Saisissez un montant positif.", variant: "destructive" });
        return;
      }
      // Insérer le paiement
      const { error: insErr } = await supabase
        .from('facture_paiements' as any)
        .insert({
          facture_id: facture.id,
          date_paiement: acquittementDate,
          moyen_paiement: acquittementMoyen,
          montant: montantNum,
        });
      if (insErr) throw insErr;

      // Recalculer total payé pour cette facture
      const { data: paiementsRaw } = await supabase
        .from('facture_paiements' as any)
        .select('montant, date_paiement, moyen_paiement')
        .eq('facture_id', facture.id)
        .order('date_paiement', { ascending: true });
      const paiements = (paiementsRaw || []) as any[];
      const total = (paiements || []).reduce((s: number, p: any) => s + Number(p.montant || 0), 0);
      const totalDu = Number(facture.montant_ttc || FC_MONTANT_FACTURE);
      const last = (paiements || [])[paiements!.length - 1];
      const newStatut = total + 0.001 >= totalDu ? 'payee' : 'en_attente';
      await supabase
        .from('factures')
        .update({
          statut: newStatut,
          date_paiement: newStatut === 'payee' ? (last?.date_paiement || acquittementDate) : null,
        })
        .eq('id', facture.id);

      await Promise.all([refetchFacturesFC(), refetchExtraFactures(), refetchPaiements()]);
      toast({ title: "Paiement enregistré", description: `${montantNum.toFixed(2)} € le ${acquittementDate} • ${acquittementMoyen}` });
      // Réinitialiser le formulaire mais garder la modale ouverte pour ajouter un autre paiement
      setAcquittementMontant('');
      setAcquittementDate(new Date().toISOString().split('T')[0]);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Enregistrement impossible", variant: "destructive" });
    } finally {
      setAcquittementSaving(false);
    }
  };

  // Supprimer un paiement
  const handleDeletePaiement = async (paiementId: string, factureId: string, montantTtc: number) => {
    setAcquittementDeleting(paiementId);
    try {
      const { error } = await supabase.from('facture_paiements' as any).delete().eq('id', paiementId);
      if (error) throw error;
      const { data: paiementsRaw } = await supabase
        .from('facture_paiements' as any)
        .select('montant, date_paiement')
        .eq('facture_id', factureId)
        .order('date_paiement', { ascending: true });
      const paiements = (paiementsRaw || []) as any[];
      const total = paiements.reduce((s: number, p: any) => s + Number(p.montant || 0), 0);
      const last = paiements[paiements.length - 1];
      const newStatut = total + 0.001 >= Number(montantTtc || FC_MONTANT_FACTURE) ? 'payee' : 'en_attente';
      await supabase
        .from('factures')
        .update({
          statut: newStatut,
          date_paiement: newStatut === 'payee' ? (last?.date_paiement || null) : null,
        })
        .eq('id', factureId);
      await Promise.all([refetchFacturesFC(), refetchExtraFactures(), refetchPaiements()]);
      toast({ title: "Paiement supprimé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Suppression impossible", variant: "destructive" });
    } finally {
      setAcquittementDeleting(null);
    }
  };

  // Acquitter en bulk : solde restant de toutes les factures non payées de la session
  const handleBulkAcquitter = async () => {
    setBulkAcquitterSaving(true);
    try {
      const nonAbsentIds = new Set(nonAbsentApprenants.map((sa: any) => sa.apprenant?.id).filter(Boolean));
      let factures = Object.values(facturesFCMap as Record<string, any>).filter(Boolean) as any[];
      // Exclure les factures des apprenants absents
      factures = factures.filter((f: any) => f.apprenant_id && nonAbsentIds.has(f.apprenant_id));
      if (selectedFactureApprenants.size > 0) {
        factures = factures.filter((f: any) => f.apprenant_id && selectedFactureApprenants.has(f.apprenant_id));
      }
      if (factures.length === 0) {
        toast({ title: "Aucune facture", description: selectedFactureApprenants.size > 0 ? "Aucune facture pour la sélection." : "Générez d'abord les factures.", variant: "destructive" });
        return;
      }
      let count = 0;
      for (const facture of factures) {
        const paiementsExist = (paiementsByFactureId as any)?.[facture.id] || [];
        const totalPaye = paiementsExist.reduce((s: number, p: any) => s + Number(p.montant || 0), 0);
        const totalDu = Number(facture.montant_ttc || FC_MONTANT_FACTURE);
        const restant = totalDu - totalPaye;
        if (restant <= 0.001) continue;

        const { error: insErr } = await supabase
          .from('facture_paiements' as any)
          .insert({
            facture_id: facture.id,
            date_paiement: bulkAcquitterDate,
            moyen_paiement: bulkAcquitterMoyen,
            montant: restant,
          });
        if (insErr) { console.error('[bulkAcquitter]', insErr); continue; }

        await supabase
          .from('factures')
          .update({ statut: 'payee', date_paiement: bulkAcquitterDate })
          .eq('id', facture.id);
        count++;
      }
      await Promise.all([refetchFacturesFC(), refetchExtraFactures(), refetchPaiements()]);
      toast({ title: "Acquittement effectué", description: `${count} facture(s) acquittée(s) le ${bulkAcquitterDate} • ${bulkAcquitterMoyen}` });
      setBulkAcquitterOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Acquittement impossible", variant: "destructive" });
    } finally {
      setBulkAcquitterSaving(false);
    }
  };


  const normalizedSessionText = `${session.title || ''} ${session.formation || ''}`.toLowerCase();
  const isFormationContinue = normalizedSessionText.includes('continue');

  const getSessionTrainingFlags = (typeApprenant: string | null | undefined) => {
    const type = (typeApprenant || '').toLowerCase();
    const isTA = type === 'ta' || type === 'ta-e';
    const isVA = type === 'va' || type === 'va-e';
    const sessionLooksTaxi = normalizedSessionText.includes('taxi');
    const sessionLooksVTC = normalizedSessionText.includes('vtc');
    const typeLooksTaxi = type.includes('taxi') || isTA;
    const typeLooksVTC = type === 'vtc' || type === 'vtc-e' || type === 'pa vtc' || isVA;
    const hasExplicitLearnerType = typeLooksTaxi || typeLooksVTC;
    const isTaxi = typeLooksTaxi || (!hasExplicitLearnerType && sessionLooksTaxi);
    const isVTC = typeLooksVTC || (!hasExplicitLearnerType && !isTaxi && sessionLooksVTC);

    return { type, isTA, isVA, isTaxi, isVTC };
  };

  const getFormationTypeLocal = (typeApprenant: string | null | undefined): string => {
    const { type } = getSessionTrainingFlags(typeApprenant);
    if (type.includes('ta-e') || type === 'ta') return 'TAXI (mobilité VTC vers TAXI)';
    if (type.includes('va-e') || type === 'va') return 'VTC (mobilité TAXI vers VTC)';
    if (type.includes('taxi')) return 'TAXI';
    if (type.includes('vtc')) return 'VTC';
    return 'TAXI / VTC';
  };

  const formatDateFr = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '[date à compléter]';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const replaceTemplateVars = (template: string, a: any): string => {
    const formation = getFormationTypeLocal(a.type_apprenant);
    // Toujours privilégier les dates de la SESSION (les dates apprenant peuvent
    // couvrir la période e-learning et fausser la convocation)
    const dateDebutRaw = session.dateDebut || a.date_debut_formation || null;
    const dateFinRaw = session.dateFin || a.date_fin_formation || null;
    const dateDebut = formatDateFr(dateDebutRaw);
    const dateFin = formatDateFr(dateFinRaw);
    // L'examen théorique est TOUJOURS la première date qui suit la fin de formation
    // (ex: formation finissant le 27 sept → examen du 29 sept). Le calcul automatique
    // prime sur une éventuelle date manuelle obsolète de l'apprenant.
    const theoriqueAuto = getTheoriqueDateForFormation(dateFinRaw);
    const dateExamenTheorique = theoriqueAuto.date
      || (a.date_examen_theorique ? formatDateFr(a.date_examen_theorique) : '[date à compléter]');
    const lieuExamenTheorique = theoriqueAuto.lieu || '[lieu à compléter]';
    const horaireExamenTheorique = theoriqueAuto.horaire || 'après-midi';
    // Veille de l'examen théorique (J-1) — TA/TAXI : horaires 14h-16h uniquement
    const dateVeilleExamen = theoriqueAuto.dateObj
      ? new Date(theoriqueAuto.dateObj.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '[date à compléter]';
    // Même règle pour le pratique : la période qui suit la fin de formation prime.
    const pratiqueAuto = getPratiqueDatesForFormation(dateFinRaw);
    const dateExamenPratique = pratiqueAuto.examenPratique
      || (a.date_examen_pratique ? formatDateFr(a.date_examen_pratique) : '[date à compléter]');
    const periodeExamenPratique = pratiqueAuto.examenPratique || '[dates à compléter]';
    const periodeEntrainementPratique = pratiqueAuto.entrainementPratique || '[dates à compléter]';
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}`;
    const onboardingUrl = 'https://insight-learn-manage.lovable.app/bienvenue';


    return template
      .replace(/\{\{prenom\}\}/g, a.prenom || '')
      .replace(/\{\{nom\}\}/g, a.nom || '')
      .replace(/\{\{formation\}\}/g, formation)
      .replace(/\{\{date_debut\}\}/g, dateDebut)
      .replace(/\{\{date_fin\}\}/g, dateFin)
      .replace(/\{\{date_examen_theorique\}\}/g, dateExamenTheorique)
      .replace(/\{\{lieu_examen_theorique\}\}/g, lieuExamenTheorique)
      .replace(/\{\{horaire_examen_theorique\}\}/g, horaireExamenTheorique)
      .replace(/\{\{date_veille_examen\}\}/g, dateVeilleExamen)
      .replace(/\{\{date_examen_pratique\}\}/g, dateExamenPratique)
      .replace(/\{\{periode_examen_pratique\}\}/g, periodeExamenPratique)
      .replace(/\{\{periode_entrainement_pratique\}\}/g, periodeEntrainementPratique)
      .replace(/\{\{date_jour\}\}/g, today)

      .replace(/\{\{civilite\}\}/g, a.civilite || '')
      .replace(/\{\{adresse\}\}/g, a.adresse || '')
      .replace(/\{\{code_postal\}\}/g, a.code_postal || '')
      .replace(/\{\{ville\}\}/g, a.ville || '')
      .replace(/\{\{onboarding_url\}\}/g, onboardingUrl)
      .replace(/\{\{booking_url\}\}/g, bookingUrl);
  };


  const getPreInformationTemplateId = (a: any): string => {
    const { isTA, isVA, isTaxi } = getSessionTrainingFlags(a?.type_apprenant);
    const hasDate = Boolean(a?.date_debut_formation || session.dateDebut);
    const base = isTA ? 'pre-information-ta'
      : isVA ? 'pre-information-va'
      : isTaxi ? 'pre-information-taxi'
      : 'pre-information-vtc';
    return hasDate ? base : `${base}-sans-date`;
  };

  // Convocation adaptée à la formation de l'apprenant (VTC / VTC soir / TAXI / TA)
  const getConvocationTemplateId = (a: any): string => {
    const { isTA, isTaxi } = getSessionTrainingFlags(a?.type_apprenant);
    if (isTA) return 'convocation-ta';
    if (isTaxi) return 'convocation-taxi';
    return isSessionSoir ? 'convocation-vtc-soir' : 'convocation-vtc';
  };

  const handlePreviewTemplateEmail = (templateId: string, apprenant: any) => {

    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    if (!apprenant.email) {
      toast({
        title: "Pas d'email",
        description: `${apprenant.prenom} ${apprenant.nom} n'a pas d'adresse email.`,
        variant: "destructive",
      });
      return;
    }

    const subject = replaceTemplateVars(template.subject_template, apprenant);
    const body = replaceTemplateVars(template.body_template, apprenant);

    setEmailPreview({ templateId, apprenant, subject, body, label: template.label });
  };

  // Relance dossier de bienvenue : reprend le modèle "relance-dossier-bienvenue"
  // et ajoute l'avertissement "aucun document reçu" + désinscription + passage au bureau.
  const handlePreviewRelanceBienvenue = (apprenant: any) => {
    if (!apprenant.email) {
      toast({
        title: "Pas d'email",
        description: `${apprenant.prenom} ${apprenant.nom} n'a pas d'adresse email.`,
        variant: "destructive",
      });
      return;
    }
    const template = emailTemplates.find((t: any) => t.id === 'relance-dossier-bienvenue');
    if (!template) {
      toast({ title: "Modèle introuvable", description: "Le mail type « relance-dossier-bienvenue » est introuvable.", variant: "destructive" });
      return;
    }

    const warningBlock = `
      <div style="margin:16px 0;padding:14px 16px;border:2px solid #dc2626;border-radius:8px;background:#fef2f2;color:#991b1b;">
        <p style="margin:0 0 8px 0;font-weight:bold;">⚠️ Nous n'avons reçu aucun document de votre part pour vous inscrire à l'examen.</p>
        <p style="margin:0 0 8px 0;">Si vous ne remplissez pas le dossier de bienvenue, nous ne pourrons pas vous inscrire à l'examen et nous serons contraints de vous désinscrire.</p>
        <p style="margin:0;">Si vous rencontrez des difficultés, vous pouvez passer au bureau <strong>en nous appelant au préalable au 04 28 29 60 91</strong>.</p>
      </div>`;

    const subject = replaceTemplateVars(template.subject_template, apprenant);
    let body = replaceTemplateVars(template.body_template, apprenant);
    // Insérer l'avertissement juste après le premier paragraphe (salutations), sinon en tête
    const firstPEnd = body.indexOf('</p>');
    body = firstPEnd !== -1
      ? body.slice(0, firstPEnd + 4) + warningBlock + body.slice(firstPEnd + 4)
      : warningBlock + body;

    setEmailPreview({ templateId: 'relance-dossier-bienvenue', apprenant, subject, body, label: 'Relance dossier de bienvenue' });
  };

  const handleConfirmSendEmail = async () => {
    if (!emailPreview) return;
    const { apprenant, subject, body } = emailPreview;
    const label = emailPreview.label;

    setSendingEmailForApprenant(apprenant.id);
    setEmailPreview(null);

    try {
      await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: 'contact@ftransport.fr',
          to: apprenant.email,
          subject,
          body,
        },
      });
      toast({
        title: "Email envoyé",
        description: `"${label}" envoyé à ${apprenant.prenom} ${apprenant.nom}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['convocations-sent'] });
    } catch {
      toast({
        title: "Erreur",
        description: `Échec de l'envoi à ${apprenant.prenom} ${apprenant.nom}.`,
        variant: "destructive",
      });
    }

    setSendingEmailForApprenant(null);
  };

  const toggleSelectApprenant = (id: string) => {
    setSelectedApprenants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedApprenants.size === apprenantsInSession.length) {
      setSelectedApprenants(new Set());
    } else {
      setSelectedApprenants(new Set(apprenantsInSession.map((sa: any) => sa.apprenant?.id).filter(Boolean)));
    }
  };

  const handleBulkSendEmail = async (templateId: string) => {
    const template = emailTemplates.find((t: any) => t.id === templateId);
    if (!template) return;

    const selectedList = apprenantsInSession
      .filter((sa: any) => sa.apprenant && selectedApprenants.has(sa.apprenant.id) && sa.apprenant.email)
      .map((sa: any) => sa.apprenant);

    if (selectedList.length === 0) {
      toast({ title: "Aucun apprenant sélectionné", description: "Cochez au moins un apprenant avec une adresse email.", variant: "destructive" });
      return;
    }

    // Show preview with first apprenant as example
    const previewSubject = replaceTemplateVars(template.subject_template, selectedList[0]);
    const previewBody = replaceTemplateVars(template.body_template, selectedList[0]);
    setBulkPreview({ template, apprenants: selectedList, previewSubject, previewBody });
  };

  const handleConfirmBulkSend = async () => {
    if (!bulkPreview) return;
    const { template, apprenants, editedBody, editedSubject } = bulkPreview;
    const useEditedBody = editedBody !== undefined;
    const useEditedSubject = editedSubject !== undefined;
    setBulkPreview(null);
    setBulkPreviewEditing(false);
    setBulkSending(true);
    let sent = 0;
    let failed = 0;

    for (const apprenant of apprenants) {
      const subject = useEditedSubject ? replaceTemplateVars(editedSubject, apprenant) : replaceTemplateVars(template.subject_template, apprenant);
      const body = useEditedBody ? replaceTemplateVars(editedBody, apprenant) : replaceTemplateVars(template.body_template, apprenant);
      try {
        await supabase.functions.invoke('sync-outlook-emails', {
          body: {
            action: 'send',
            apprenantId: apprenant.id,
            userEmail: 'contact@ftransport.fr',
            to: apprenant.email,
            subject,
            body,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    toast({
      title: "Envoi groupé terminé",
      description: `${sent} email(s) envoyé(s)${failed > 0 ? `, ${failed} échec(s)` : ''}.`,
    });
    await queryClient.invalidateQueries({ queryKey: ['convocations-sent'] });
    setBulkSending(false);
    setSelectedApprenants(new Set());
  };

  // Envoi groupé des convocations : chaque apprenant reçoit le modèle adapté à sa formation
  const handleBulkSendConvocations = async () => {
    const selectedList = apprenantsInSession
      .filter((sa: any) => sa.apprenant && selectedApprenants.has(sa.apprenant.id) && sa.apprenant.email)
      .map((sa: any) => sa.apprenant);

    if (selectedList.length === 0) {
      toast({ title: "Aucun apprenant sélectionné", description: "Cochez au moins un apprenant avec une adresse email.", variant: "destructive" });
      return;
    }

    // Préparer l'aperçu personnalisé de chaque convocation avant envoi
    const items = selectedList
      .map((apprenant) => {
        const template = emailTemplates.find((t: any) => t.id === getConvocationTemplateId(apprenant));
        if (!template) return null;
        return {
          apprenant,
          subject: replaceTemplateVars(template.subject_template, apprenant),
          body: replaceTemplateVars(template.body_template, apprenant),
        };
      })
      .filter(Boolean) as { apprenant: any; subject: string; body: string }[];

    if (items.length === 0) {
      toast({ title: "Aucun modèle de convocation trouvé", variant: "destructive" });
      return;
    }

    setConvocationPreviewIndex(0);
    setConvocationPreview({ items });
  };

  const handleConfirmBulkConvocations = async () => {
    if (!convocationPreview) return;
    const items = convocationPreview.items;
    setConvocationPreview(null);
    setBulkSending(true);
    let sent = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await supabase.functions.invoke('sync-outlook-emails', {
          body: {
            action: 'send',
            apprenantId: item.apprenant.id,
            userEmail: 'contact@ftransport.fr',
            to: item.apprenant.email,
            subject: item.subject,
            body: item.body,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    toast({
      title: "Convocations envoyées",
      description: `${sent} convocation(s) envoyée(s)${failed > 0 ? `, ${failed} échec(s)` : ''}.`,
    });
    await queryClient.invalidateQueries({ queryKey: ['convocations-sent'] });
    setBulkSending(false);
    setSelectedApprenants(new Set());
  };




  const handleBulkEmargement = async (isPrint: boolean) => {
    const selectedSAs = apprenantsInSession
      .filter((sa: any) => sa.apprenant && selectedApprenants.has(sa.apprenant.id));
    const selectedList = selectedSAs.map((sa: any) => ({ ...sa.apprenant, _sa: sa }));
    if (selectedList.length === 0) {
      toast({ title: "Aucun apprenant sélectionné", variant: "destructive" });
      return;
    }
    setBulkPrintingEmargement(true);
    let generated = 0;
    let failed = 0;
    for (const apprenant of selectedList) {
      try {
        const { isTA, isVA, isTaxi, isVTC } = getSessionTrainingFlags(apprenant.type_apprenant);
        const isFCVTC = isFormationContinue && isVTC;
        const isPratique = isPratiqueType(session.type_session);

        // FORMATION PRATIQUE : on suit uniquement le planning pratique. Si l'apprenant
        // n'est pas inscrit sur une date du planning (reservations_pratique), on saute
        // sa feuille d'émargement. (Ne s'applique PAS aux autres formations.)
        let practicalReservationDates: string[] = [];
        if (isPratique) {
          practicalReservationDates = await getPracticalReservationDates(apprenant.id);
          // On ne saute plus l'apprenant s'il n'a pas de réservation :
          // on utilisera les blocs agenda ou le fallback basé sur la session.
        }

        const creneauxText = Array.isArray((session as any).creneaux) ? (session as any).creneaux.join(' ') : String((session as any).creneaux || '');
        const isCoursDuSoir = isEveningTrainingValue(session.title, (session as any).nom, creneauxText);
        const formationLabel = isFCVTC ? 'Formation Continue VTC' : isPratique ? (isTaxi ? 'Formation pratique TAXI' : 'Formation pratique VTC') : isTaxi ? 'Formation TAXI' : 'Formation VTC';
        const assignedFormateurNames = (formateursInSession || [])
          .map((sf: any) => (sf?.formateur ? `${sf.formateur.prenom} ${sf.formateur.nom}`.trim() : ''))
          .filter(Boolean);
        const formateurNames = assignedFormateurNames.length > 0
          ? assignedFormateurNames
          : isPratique
            ? (isTaxi ? ["Rim TOUIL"] : ["Naoufal GUENICHI"])
            : isFCVTC
              ? ["Naoufal GUENICHI"]
              : (isTA || isVA)
                ? ["Rim TOUIL"]
                : isVTC
                  ? ["Naoufal GUENICHI"]
                  : ["Naoufal GUENICHI", "Rim TOUIL"];

        const effectiveStartISO = isPratique && practicalReservationDates.length > 0
          ? getMinISODate([session.dateDebut, ...practicalReservationDates])
          : session.dateDebut;
        const effectiveEndISO = isPratique && practicalReservationDates.length > 0
          ? getMaxISODate([session.dateFin, ...practicalReservationDates])
          : session.dateFin;
        const practicalDateSet = new Set(practicalReservationDates);
        const semaineDebutMinStr = addDaysToISO(effectiveStartISO, -6);
        const { data: blocs } = await supabase
          .from('agenda_blocs')
          .select('*')
          .gte('semaine_debut', semaineDebutMinStr)
          .lte('semaine_debut', effectiveEndISO);

        const matchFormation = (f: string) => {
          const fl = f.toLowerCase();
          if (fl.includes('taxi et vtc') || fl.includes('taxi & vtc')) return true;
          if (isTaxi && fl.includes('taxi')) return true;
          if (!isTaxi && fl.includes('vtc')) return true;
          return false;
        };

        const filteredBlocs = (blocs || []).filter((b: any) => matchFormation(b.formation));
        const dayMap = new Map<string, { date: Date; slots: { debut: string; fin: string }[] }>();
        for (const bloc of filteredBlocs) {
          const weekStart = new Date(bloc.semaine_debut + 'T00:00:00');
          const actualDate = new Date(weekStart);
          actualDate.setDate(actualDate.getDate() + bloc.jour);
          const key = formatLocalDateKey(actualDate);
          if (isPratique && practicalDateSet.size > 0) {
            if (!practicalDateSet.has(key)) continue;
          } else if (key < session.dateDebut || key > session.dateFin) {
            continue;
          }
          if (!dayMap.has(key)) {
            dayMap.set(key, { date: actualDate, slots: [] });
          }
          dayMap.get(key)!.slots.push({ debut: bloc.heure_debut, fin: bloc.heure_fin });
        }

        const agendaDays: AgendaDaySlot[] = Array.from(dayMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, val]) => {
            const morningSlots = val.slots.filter(s => s.debut < '12:30');
            const afternoonSlots = val.slots.filter(s => s.debut >= '12:30');
            const result: AgendaDaySlot = { date: val.date };
            if (morningSlots.length > 0) {
              result.matinDebut = morningSlots.reduce((min, s) => s.debut < min ? s.debut : min, morningSlots[0].debut);
              result.matinFin = morningSlots.reduce((max, s) => s.fin > max ? s.fin : max, morningSlots[0].fin);
            }
            if (afternoonSlots.length > 0) {
              result.apremDebut = afternoonSlots.reduce((min, s) => s.debut < min ? s.debut : min, afternoonSlots[0].debut);
              result.apremFin = afternoonSlots.reduce((max, s) => s.fin > max ? s.fin : max, afternoonSlots[0].fin);
            }
            if (isVTC) {
              if (isCoursDuSoir) {
                result.matinDebut = '17:00';
                result.matinFin = '18:30';
                result.apremDebut = '18:30';
                result.apremFin = '21:00';
                result.isSoir = true;
              } else {
                const apremFinHeure = isFCVTC ? '17:00' : '16:00';
                if (result.matinDebut) { result.matinDebut = '09:00'; result.matinFin = '12:00'; }
                if (result.apremDebut) { result.apremDebut = '13:00'; result.apremFin = apremFinHeure; }
              }
            } else if (isTaxi && isPratique) {
              if (result.matinDebut) { result.matinDebut = '09:00'; result.matinFin = '12:00'; }
              if (result.apremDebut) { result.apremDebut = '13:00'; result.apremFin = '17:30'; }
            }
            return result;
          });

        const saForEmargement = apprenant._sa || {};
        const rawAgendaDays = isFCVTC
          ? applyFCVTCPersonalizedSchedule(
              agendaDays,
              session.dateDebut,
              session.dateFin,
              saForEmargement,
              isCoursDuSoir,
            )
          : agendaDays.length === 0
            ? buildFallbackAgendaDays(session.dateDebut, session.dateFin, {
                isPratique,
                isVTC,
                isTaxi,
                isCoursDuSoir,
                heureDebutPersonnalisee: saForEmargement.heure_debut_personnalisee,
                heureFinPersonnalisee: saForEmargement.heure_fin_personnalisee,
              })
            : agendaDays;
        const finalAgendaDays = isPratique
          ? await applyPratiquePlanningSlots(rawAgendaDays, apprenant.id, isTaxi)
          : rawAgendaDays;

        if (finalAgendaDays.length === 0) {
          failed++;
          continue;
        }

        const effectiveDateFinEmargement = saForEmargement.date_fin_personnalisee || session.dateFin;
        const practicalPdfEndDate = isPratique && practicalReservationDates.length > 0
          ? getMaxISODate(practicalReservationDates)
          : effectiveDateFinEmargement;

        const resBulk = generateEmargementIndividuelPDF(
          {
            formation: formationLabel,
            dateDebut: session.dateDebut,
            dateFin: practicalPdfEndDate,
            lieu: session.lieu,
            formateurs: formateurNames,
          },
          { nom: apprenant.nom, prenom: apprenant.prenom, type_apprenant: apprenant.type_apprenant || '', telephone: apprenant.telephone || '' },
          finalAgendaDays,
          { print: isPrint }
        );
        if (resBulk?.blob && apprenant.id) {
          await saveEmargementToCRM({
            apprenantId: apprenant.id,
            fileName: resBulk.fileName,
            blob: resBulk.blob,
            titre: `Feuille d'émargement — ${formationLabel}`,
            dateRef: session.dateDebut,
          });
        }
        generated++;
        // Small delay between downloads to avoid browser blocking
        if (!isPrint) await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Erreur émargement pour ${apprenant.nom}:`, err);
        failed++;
      }
    }
    setBulkPrintingEmargement(false);
    toast({
      title: `${generated} émargement(s) ${isPrint ? 'imprimé(s)' : 'téléchargé(s)'}`,
      description: failed > 0 ? `${failed} erreur(s)` : undefined,
    });
  };

  const isListeAttente = (sa: any) => sa.liste_attente === true;

  const countByType = (type: string) => {
    return apprenantsInSession.filter((sa: any) => {
      if (isListeAttente(sa)) return false;
      const t = sa.apprenant?.type_apprenant?.toLowerCase() || "";
      return t.includes(type.toLowerCase());
    }).length;
  };

  const taxiCount = countByType("taxi");
  const vtcCount = countByType("vtc");
  const totalCount = apprenantsInSession.filter((sa: any) => !isListeAttente(sa)).length;
  const formateursCount = formateursInSession.length;

  // Marquer automatiquement "absent" les apprenants sans AUCUNE feuille d'émargement signée
  // dès lors que la session est terminée (date_fin passée).
  const sessionFinIso = session?.dateFin ? String(session.dateFin).slice(0, 10) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const sessionIsOver = !!sessionFinIso && todayIso >= sessionFinIso;
  const hasNoSignature = (apprenantId?: string | null): boolean => {
    if (!apprenantId) return false;
    const h = (emargementsHoursMap as Record<string, number>)[apprenantId];
    return sessionIsOver && (!h || h <= 0);
  };

  // Exclure les absents (présence pratique, résultat examen, ou aucune signature) pour la facturation FC
  const nonAbsentApprenants = (apprenantsInSession as any[]).filter((sa: any) => {
    const ap = sa.apprenant;
    if (sa.presence_pratique === 'absent' || ap?.resultat_examen === 'absent') return false;
    if (hasNoSignature(ap?.id)) return false;
    return true;
  });


  const renderApprenantCard = (sessionApprenant: any, numero: number, waitlist = false) => {
    const apprenant = sessionApprenant.apprenant ?? allApprenants.find((a) => a.id === sessionApprenant.apprenant_id);
    if (!apprenant) {
      return (
        <div className="block static p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive">Apprenant introuvable (ID: {sessionApprenant.apprenant_id?.slice(0, 8)}…)</p>
        </div>
      );
    }
    return (
                      <div 
                        className={`block static p-3 rounded-xl border bg-card hover:shadow-md transition-shadow ${waitlist ? 'border-orange-300 bg-orange-50/40' : ''}`}
                      >

                        {/* Ligne 1: Checkbox + Avatar + Nom + Badge */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Checkbox 
                            checked={selectedApprenants.has(apprenant.id)}
                            onCheckedChange={() => toggleSelectApprenant(apprenant.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs font-mono text-muted-foreground w-5 text-right select-none">
                            {numero}.
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNavigateToApprenant) {
                                if (!asPage) onOpenChange(false);
                                onNavigateToApprenant(apprenant.id);
                              }
                            }}
                          >
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {apprenant.prenom?.[0] || ""}{apprenant.nom?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm text-foreground group-hover:text-primary group-hover:underline transition-colors">
                              {apprenant.prenom} {apprenant.nom}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(apprenant.nom || '', 'Nom'); }}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Copier le nom de famille"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <Badge className={`text-[10px] shrink-0 ${getTypeBadgeColor(apprenant.type_apprenant)}`}>
                            {apprenant.type_apprenant?.toUpperCase() || "N/A"}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-6 text-[11px] px-2 gap-1",
                              apprenant.documents_complets || hasDossierBienvenue(apprenant.id)
                                ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800"
                                : "border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800"
                            )}
                            onClick={(e) => { e.stopPropagation(); downloadDossierBienvenue(apprenant); }}
                            title={apprenant.documents_complets ? "Possession des documents confirmée" : hasDossierBienvenue(apprenant.id) ? "Dossier présent — télécharger le PDF" : "Dossier absent — cliquer pour vérifier"}
                          >
                            <FileText className="w-3 h-3" />
                            Dossier de bienvenue
                          </Button>
                          {apprenant.mot_de_passe_cma && (
                            <Badge
                              variant="outline"
                              className="h-6 text-[11px] px-2 gap-1 font-mono border-blue-200 text-blue-700 bg-blue-50 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(apprenant.mot_de_passe_cma || '', 'Mot de passe CMA'); }}
                              title="Mot de passe CMA — cliquer pour copier"
                            >
                              🔑 {apprenant.mot_de_passe_cma}
                              <Copy className="w-3 h-3" />
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-6 text-[11px] px-2 gap-1",
                              hasRelanceBienvenueEmail(apprenant.id)
                                ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800"
                                : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:text-orange-800"
                            )}
                            onClick={(e) => { e.stopPropagation(); handlePreviewRelanceBienvenue(apprenant); }}
                            title={hasRelanceBienvenueEmail(apprenant.id) ? "Relance déjà envoyée" : "Relance dossier de bienvenue — aperçu avant envoi"}
                          >
                            <Mail className="w-3 h-3" />
                            {hasRelanceBienvenueEmail(apprenant.id) ? "Relance envoyée" : "Relance"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-6 text-[11px] px-2 gap-1",
                              apprenant.documents_complets
                                ? "border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800"
                                : "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-800"
                            )}
                            onClick={(e) => { e.stopPropagation(); togglePossessionDocuments(apprenant); }}
                            title={apprenant.documents_complets ? "Possession des documents cochée — cliquer pour décocher" : "Marquer la possession des documents"}
                          >
                            {apprenant.documents_complets ? <CheckCircle2 className="w-3 h-3" /> : <FileCheck className="w-3 h-3" />}
                            Possession des documents
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0 ml-auto"
                            onClick={() => setApprenantToDelete({ id: sessionApprenant.id, nom: apprenant.nom || '', prenom: apprenant.prenom || '' })}
                            title="Retirer l'apprenant de la session"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Ligne 2: Coordonnées compactes sur une seule ligne */}
                        <div className="flex items-center gap-x-3 gap-y-1 mb-2 pl-[36px] text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 shrink-0" />
                            {apprenant.numero_dossier_cma || "CMA n/d"}
                          </span>
                          <span className="flex items-center gap-1 group/copy">
                            <Mail className="w-3 h-3 shrink-0" />
                            {apprenant.email || "—"}
                            {apprenant.email && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(apprenant.email, 'Email'); }}
                                className="p-0.5 rounded opacity-0 group-hover/copy:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-opacity"
                                title="Copier l'email"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                          <span className="flex items-center gap-1 group/copy">
                            <Phone className="w-3 h-3 shrink-0" />
                            {apprenant.telephone || "—"}
                            {apprenant.telephone && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(apprenant.telephone, 'Téléphone'); }}
                                className="p-0.5 rounded opacity-0 group-hover/copy:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-opacity"
                                title="Copier le téléphone"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <Calendar className="w-3 h-3 shrink-0" />
                            Inscrit le {sessionApprenant.created_at
                              ? format(new Date(sessionApprenant.created_at), "dd/MM/yyyy 'à' HH'h'mm", { locale: fr })
                              : "—"}
                          </span>
                        </div>


                        {/* Ligne 3: Badges statut */}
                        <div className="flex items-center gap-1.5 mb-3 pl-[52px] flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            hasConvocation(apprenant.id) 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {hasConvocation(apprenant.id) ? '✅ Convoqué' : '❌ Non convoqué'}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            hasIdentifiants(apprenant.id) 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {hasIdentifiants(apprenant.id) ? '🔑 Identifiants' : '🔑 Non envoyés'}
                          </span>
                          <Badge className={`text-[10px] px-2 py-0 ${getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).color}`}>
                            {getFinancementBadge(sessionApprenant.mode_financement || apprenant.mode_financement).label}
                          </Badge>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            ⏱️ {formatPresenceHours(getHeuresPresence(apprenant.id))}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700"
                            title="Heures effectuées en ligne en dehors des dates de formation"
                          >
                            🌐 {formatPresenceHours(getHeuresEnLigne(apprenant.id))} en ligne
                          </span>
                          {sessionApprenant.statut_suivi && (
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              sessionApprenant.statut_suivi === 'inscription_validee' || sessionApprenant.statut_suivi === 'document_complet'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {sessionApprenant.statut_suivi === 'inscription_validee' ? '✅ Validé' :
                               sessionApprenant.statut_suivi === 'document_complet' ? '✅ Dossier complet' :
                               sessionApprenant.statut_suivi === 'manque_document' ? '📄 Manque doc' :
                               sessionApprenant.statut_suivi === 'a_payer' ? '💰 À payer' :
                               sessionApprenant.statut_suivi === 'mdp_change' ? '🔑 MDP changé' :
                               '⚠️ ' + sessionApprenant.statut_suivi}
                            </span>
                          )}
                          {apprenant.resultat_examen === 'oui' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ Théorie réussie</span>
                          )}
                          {apprenant.resultat_examen === 'non' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Théorie échouée</span>
                          )}
                          {apprenant.resultat_examen === 'absent' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🔶 Absent examen</span>
                          )}
                          {hasNoSignature(apprenant.id) && sessionApprenant.presence_pratique !== 'absent' && (
                            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700" title="Aucune feuille d'émargement signée">❌ Absent (aucune signature)</span>
                          )}

                          {sessionApprenant.presence_pratique && sessionApprenant.presence_pratique !== 'present' && (
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              sessionApprenant.presence_pratique === 'absent' ? 'bg-red-100 text-red-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {sessionApprenant.presence_pratique === 'absent' ? '❌ Absent' : '📅 Déplacé'}
                            </span>
                          )}
                        </div>

                        {/* Ligne 3.5: Date de fin personnalisée */}
                        {isFormationContinue && (
                          <div className="flex items-center gap-3 mb-3 pl-[52px] flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Fin perso :</Label>
                              <Input
                                type="date"
                                className="h-7 w-36 text-xs"
                                value={sessionApprenant.date_fin_personnalisee || ''}
                                onChange={(e) => {
                                  updateSessionApprenant(sessionApprenant.id, { date_fin_personnalisee: e.target.value || null });
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
                              <Input
                                type="time"
                                className="h-7 w-24 text-xs"
                                value={sessionApprenant.heure_debut_personnalisee || ''}
                                onChange={(e) => {
                                  updateSessionApprenant(sessionApprenant.id, { heure_debut_personnalisee: e.target.value || null });
                                }}
                              />
                              <Label className="text-xs text-muted-foreground">a</Label>
                              <Input
                                type="time"
                                className="h-7 w-24 text-xs"
                                value={sessionApprenant.heure_fin_personnalisee || ''}
                                onChange={(e) => {
                                  updateSessionApprenant(sessionApprenant.id, { heure_fin_personnalisee: e.target.value || null });
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Ligne 4: Boutons d'action sur ligne séparée */}
                        <div className="flex items-center gap-2 pt-3 border-t flex-wrap pl-[52px]">
                          {[
                            { icon: FileText, title: "Télécharger émargement", print: false },
                            { icon: Printer, title: "Imprimer émargement", print: true },
                          ].map(({ icon: Icon, title, print: isPrint }) => (
                           <Button
                             key={title}
                             size="sm"
                             variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              title={title}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const { isTA, isVA, isTaxi, isVTC } = getSessionTrainingFlags(apprenant.type_apprenant);
                                const isFCVTC = isFormationContinue && isVTC;
                                const isPratique = isPratiqueType(session.type_session);

                                // FORMATION PRATIQUE : ne générer l'émargement QUE si l'apprenant
                                // est inscrit dans le planning pratique (table reservations_pratique).
                                // Si aucune réservation trouvée → pas de feuille (règle ne s'applique
                                // PAS aux autres types de formation).
                                 let practicalReservationDates: string[] = [];
                                 if (isPratique) {
                                   practicalReservationDates = await getPracticalReservationDates(apprenant.id);
                                   // Pas de blocage si aucune réservation : on retombe sur les blocs agenda
                                   // ou sur les dates de session pour toujours pouvoir sortir la feuille.
                                 }

                                const creneauxText = Array.isArray((session as any).creneaux) ? (session as any).creneaux.join(' ') : String((session as any).creneaux || '');
                                const isCoursDuSoir = isEveningTrainingValue(session.title, (session as any).nom, creneauxText);
                                const formationLabel = isFCVTC ? 'Formation Continue VTC' : isPratique ? (isTaxi ? 'Formation pratique TAXI' : 'Formation pratique VTC') : isTaxi ? 'Formation TAXI' : 'Formation VTC';
                                const assignedFormateurNames = (formateursInSession || [])
                                  .map((sf: any) => (sf?.formateur ? `${sf.formateur.prenom} ${sf.formateur.nom}`.trim() : ''))
                                  .filter(Boolean);
                                const formateurNames = assignedFormateurNames.length > 0
                                  ? assignedFormateurNames
                                  : isPratique
                                    ? (isTaxi ? ["Rim TOUIL"] : ["Naoufal GUENICHI"])
                                    : isFCVTC
                                      ? ["Naoufal GUENICHI"]
                                      : (isTA || isVA)
                                        ? ["Rim TOUIL"]
                                        : isVTC
                                          ? ["Naoufal GUENICHI"]
                                          : ["Naoufal GUENICHI", "Rim TOUIL"];

                                const effectiveStartISO = isPratique && practicalReservationDates.length > 0
                                  ? getMinISODate([session.dateDebut, ...practicalReservationDates])
                                  : session.dateDebut;
                                const effectiveEndISO = isPratique && practicalReservationDates.length > 0
                                  ? getMaxISODate([session.dateFin, ...practicalReservationDates])
                                  : session.dateFin;
                                const practicalDateSet = new Set(practicalReservationDates);
                                const dateDebut = new Date(`${effectiveStartISO}T00:00:00`);
                                const dateFin = new Date(`${effectiveEndISO}T00:00:00`);
                                // semaine_debut is the Monday of the week; a session day (e.g. Tue 31/03)
                                // belongs to a week starting up to 6 days earlier, so widen the lower bound.
                                const semaineDebutMinStr = addDaysToISO(effectiveStartISO, -6);
                                const { data: blocs } = await supabase
                                  .from('agenda_blocs')
                                  .select('*')
                                  .gte('semaine_debut', semaineDebutMinStr)
                                  .lte('semaine_debut', effectiveEndISO);

                                const matchFormation = (f: string) => {
                                  const fl = f.toLowerCase();
                                  if (fl.includes('taxi et vtc') || fl.includes('taxi & vtc')) return true;
                                  if (isTaxi && fl.includes('taxi')) return true;
                                  if (!isTaxi && fl.includes('vtc')) return true;
                                  return false;
                                };

                                const relevantBlocs = (blocs || []).filter(b => matchFormation(b.formation));

                                const dayMap = new Map<string, { date: Date; slots: { debut: string; fin: string }[] }>();
                                for (const bloc of relevantBlocs) {
                                  const weekStart = new Date(bloc.semaine_debut);
                                  const actualDate = new Date(weekStart);
                                  actualDate.setDate(weekStart.getDate() + bloc.jour);
                                  const key = formatLocalDateKey(actualDate);
                                  if (isPratique && practicalDateSet.size > 0) {
                                    if (!practicalDateSet.has(key)) continue;
                                  } else if (actualDate < dateDebut || actualDate > dateFin) {
                                    continue;
                                  }
                                  if (!dayMap.has(key)) {
                                    dayMap.set(key, { date: actualDate, slots: [] });
                                  }
                                  dayMap.get(key)!.slots.push({ debut: bloc.heure_debut, fin: bloc.heure_fin });
                                }

                                const agendaDays: AgendaDaySlot[] = Array.from(dayMap.entries())
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([, val]) => {
                                    const morningSlots = val.slots.filter(s => s.debut < '12:30');
                                    const afternoonSlots = val.slots.filter(s => s.debut >= '12:30');
                                    const result: AgendaDaySlot = { date: val.date };
                                    if (morningSlots.length > 0) {
                                      result.matinDebut = morningSlots.reduce((min, s) => s.debut < min ? s.debut : min, morningSlots[0].debut);
                                      result.matinFin = morningSlots.reduce((max, s) => s.fin > max ? s.fin : max, morningSlots[0].fin);
                                    }
                                    if (afternoonSlots.length > 0) {
                                      result.apremDebut = afternoonSlots.reduce((min, s) => s.debut < min ? s.debut : min, afternoonSlots[0].debut);
                                      result.apremFin = afternoonSlots.reduce((max, s) => s.fin > max ? s.fin : max, afternoonSlots[0].fin);
                                    }
                                    // Pour VTC : forcer les horaires selon le créneau
                                    if (isVTC) {
                                      if (isCoursDuSoir) {
                                        result.matinDebut = '17:00';
                                        result.matinFin = '18:30';
                                        result.apremDebut = '18:30';
                                        result.apremFin = '21:00';
                                        result.isSoir = true;
                                      } else {
                                        const apremFinHeure = isFCVTC ? '17:00' : '16:00';
                                        if (result.matinDebut) { result.matinDebut = '09:00'; result.matinFin = '12:00'; }
                                        if (result.apremDebut) { result.apremDebut = '13:00'; result.apremFin = apremFinHeure; }
                                      }
                                    } else if (isTaxi && isPratique) {
                                      if (result.matinDebut) { result.matinDebut = '09:00'; result.matinFin = '12:00'; }
                                      if (result.apremDebut) { result.apremDebut = '13:00'; result.apremFin = '17:30'; }
                                    }
                                    return result;
                                  });

                                const isPratiqueIndiv = isPratiqueType(session.type_session);
                                const rawAgendaDays = isFCVTC
                                  ? applyFCVTCPersonalizedSchedule(
                                      agendaDays,
                                      session.dateDebut,
                                      session.dateFin,
                                      sessionApprenant,
                                      isCoursDuSoir,
                                    )
                                  : agendaDays.length === 0
                                    ? buildFallbackAgendaDays(session.dateDebut, session.dateFin, {
                                        isPratique: isPratiqueIndiv,
                                        isVTC,
                                        isTaxi,
                                        isCoursDuSoir,
                                        heureDebutPersonnalisee: sessionApprenant.heure_debut_personnalisee,
                                        heureFinPersonnalisee: sessionApprenant.heure_fin_personnalisee,
                                      })
                                    : agendaDays;
                                const finalAgendaDays = isPratique
                                  ? await applyPratiquePlanningSlots(rawAgendaDays, apprenant.id, isTaxi)
                                  : rawAgendaDays;

                                if (finalAgendaDays.length === 0) {
                                  toast({ title: "Aucun cours trouvé", description: "Aucun bloc agenda trouvé pour cette session.", variant: "destructive" });
                                  return;
                                }

                                const effectiveDateFinEmargement = sessionApprenant.date_fin_personnalisee || session.dateFin;
                                const practicalPdfEndDate = isPratique && practicalReservationDates.length > 0
                                  ? getMaxISODate(practicalReservationDates)
                                  : effectiveDateFinEmargement;

                                const resIndiv = generateEmargementIndividuelPDF(
                                  {
                                    formation: formationLabel,
                                    dateDebut: session.dateDebut,
                                    dateFin: practicalPdfEndDate,
                                    lieu: session.lieu,
                                    formateurs: formateurNames,
                                  },
                                  { nom: apprenant.nom, prenom: apprenant.prenom, type_apprenant: apprenant.type_apprenant || '', telephone: apprenant.telephone || '' },
                                  finalAgendaDays,
                                  { print: isPrint }
                                );
                                if (resIndiv?.blob && apprenant.id) {
                                  await saveEmargementToCRM({
                                    apprenantId: apprenant.id,
                                    fileName: resIndiv.fileName,
                                    blob: resIndiv.blob,
                                    titre: `Feuille d'émargement — ${formationLabel}`,
                                    dateRef: session.dateDebut,
                                  });
                                }
                                toast({ title: isPrint ? "Impression lancée" : "Emargement individuel genere", description: `Feuille pour ${apprenant.prenom} ${apprenant.nom} ${isPrint ? 'ouverte pour impression.' : 'telechargee et enregistree dans son dossier.'}` });
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </Button>
                          ))}

                          {isFormationContinue && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 text-muted-foreground hover:text-primary"
                              title="Attestation Formation Continue VTC"
                              onClick={() => {
                                const typeApp = `${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''}`.toUpperCase();
                                const formation: 'VTC' | 'TAXI' = typeApp.includes('TAXI') ? 'TAXI' : 'VTC';
                                generateAttestationFCVTC({
                                  nom: apprenant.nom,
                                  prenom: apprenant.prenom,
                                  dateFin: sessionApprenant.date_fin_personnalisee || session.dateFin || apprenant.date_fin_formation || apprenant.date_debut_formation || new Date().toISOString().split('T')[0],
                                  dateDebut: sessionApprenant.date_debut || session.dateDebut || apprenant.date_debut_formation,
                                  adresse: apprenant.adresse || '',
                                  codePostal: apprenant.code_postal || '',
                                  ville: apprenant.ville || '',
                                  telephone: apprenant.telephone || '',
                                  email: apprenant.email || '',
                                  dateNaissance: apprenant.date_naissance || '',
                                  formation,
                                });
                                toast({ title: "Attestation generee", description: `Attestation FC ${formation} pour ${apprenant.prenom} ${apprenant.nom} telechargee.` });
                              }}
                            >
                              <GraduationCap className="w-4 h-4" />
                              <span className="text-xs">Attestation</span>
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-primary"
                                title="Mail type"
                                disabled={sendingEmailForApprenant === apprenant.id}
                              >
                                {sendingEmailForApprenant === apprenant.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                                <span className="text-xs">Mail</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
                              {emailTemplates.map((t: any) => (
                                <div key={t.id} className="flex items-center">
                                  <DropdownMenuItem
                                    onClick={() => handlePreviewTemplateEmail(t.id, apprenant)}
                                    className="cursor-pointer flex-1"
                                  >
                                    <span className="text-sm">{t.label}</span>
                                  </DropdownMenuItem>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingMailType(t);
                                      setEditLabel(t.label);
                                      setEditSubject(t.subject_template);
                                      setEditBody(t.body_template);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              {emailTemplates.length === 0 && (
                                <DropdownMenuItem disabled>Aucun modèle</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1.5 ${hasBienvenueEmail(apprenant.id) ? 'text-green-700 bg-green-100 hover:bg-green-200 hover:text-green-800' : 'text-muted-foreground hover:text-primary'}`}
                            title={hasBienvenueEmail(apprenant.id) ? "Mail dossier de bienvenue déjà envoyé" : "Mail dossier de bienvenue"}
                            disabled={sendingEmailForApprenant === apprenant.id}
                            onClick={() => handlePreviewTemplateEmail('bienvenue', apprenant)}
                          >
                            {hasBienvenueEmail(apprenant.id) ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            <span className="text-xs">📄 Mail dossier de bienvenue</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1.5 ${hasPreInfoEmail(apprenant.id) ? 'text-green-700 bg-green-100 hover:bg-green-200 hover:text-green-800' : 'text-muted-foreground hover:text-primary'}`}
                            title={hasPreInfoEmail(apprenant.id) ? "Mail pré-information déjà envoyé" : "Mail pré-information"}
                            disabled={sendingEmailForApprenant === apprenant.id}
                            onClick={() => handlePreviewTemplateEmail(getPreInformationTemplateId(apprenant), apprenant)}
                          >
                            {hasPreInfoEmail(apprenant.id) ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            <span className="text-xs">📋 Mail pré-information</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1.5 ${hasConvocation(apprenant.id) ? 'text-green-700 bg-green-100 hover:bg-green-200 hover:text-green-800' : 'text-muted-foreground hover:text-primary'}`}
                            title={hasConvocation(apprenant.id) ? "Convocation déjà envoyée — cliquer pour renvoyer" : "Convocation formation (modèle adapté à la formation de l'apprenant)"}
                            disabled={sendingEmailForApprenant === apprenant.id}
                            onClick={() => handlePreviewTemplateEmail(getConvocationTemplateId(apprenant), apprenant)}
                          >
                            {hasConvocation(apprenant.id) ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            <span className="text-xs">📨 Convocation formation</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1.5 ${hasIdentifiants(apprenant.id) ? 'text-green-700 bg-green-100 hover:bg-green-200 hover:text-green-800' : 'text-muted-foreground hover:text-primary'}`}
                            title={hasIdentifiants(apprenant.id) ? `Codes d'accès envoyés le ${format(new Date(getIdentifiantsLastDate(apprenant.id)!), "dd/MM/yyyy 'à' HH:mm", { locale: fr })} — cliquer pour renvoyer` : "Envoyer les identifiants de connexion"}
                            disabled={sendingCredentialsFor === apprenant.id}
                            onClick={() => handleSendCredentials(apprenant)}
                          >
                            {sendingCredentialsFor === apprenant.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : hasIdentifiants(apprenant.id) ? <CheckCircle2 className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                            <span className="text-xs">
                              🔑 Identifiants
                              {hasIdentifiants(apprenant.id) && (
                                <span className="font-semibold"> · {format(new Date(getIdentifiantsLastDate(apprenant.id)!), "dd/MM/yy", { locale: fr })}</span>
                              )}
                            </span>
                          </Button>


                          <NotesPopover 
                            sessionApprenantId={sessionApprenant.id}
                            notes={sessionApprenant.notes || apprenant.notes || ""}
                            onSave={(notes) => updateSessionApprenant(sessionApprenant.id, { notes })}
                          />

                          <Select
                            value={sessionApprenant.statut_suivi || ''}
                            onValueChange={async (val) => {
                              await updateSessionApprenant(sessionApprenant.id, { statut_suivi: val || null });
                            }}
                          >
                            <SelectTrigger className={`h-8 w-auto gap-1 text-xs border ${
                              sessionApprenant.statut_suivi === 'inscription_validee' ? 'border-green-300 text-green-700' :
                              sessionApprenant.statut_suivi === 'document_complet' ? 'border-green-300 text-green-700' :
                              sessionApprenant.statut_suivi ? 'border-orange-300 text-orange-700' : ''
                            }`}>
                              <SelectValue placeholder="⚙️ Statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manque_document">📄 Manque un document</SelectItem>
                              <SelectItem value="manque_piece_identite">📋 Manque pièce d'identité</SelectItem>
                              <SelectItem value="manque_justificatif_domicile">🏠 Manque justificatif domicile</SelectItem>
                              <SelectItem value="manque_permis">🚗 Manque permis</SelectItem>
                              <SelectItem value="manque_signature">✍️ Manque signature</SelectItem>
                              <SelectItem value="manque_photo">📸 Manque photo</SelectItem>
                              <SelectItem value="document_complet">✅ Dossier complet</SelectItem>
                              <SelectItem value="mdp_change">🔑 MDP changé</SelectItem>
                              <SelectItem value="email_non_valide">📧 Email non validé</SelectItem>
                              <SelectItem value="injoignable">📵 Injoignable</SelectItem>
                              <SelectItem value="a_payer">💰 À payer</SelectItem>
                              <SelectItem value="inscription_validee">✅ Inscription validée</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={sessionApprenant.presence_pratique || 'present'}
                            onValueChange={async (val) => {
                              await updateSessionApprenant(sessionApprenant.id, { presence_pratique: val });
                            }}
                          >
                            <SelectTrigger className={`h-8 w-auto text-xs border ${
                              sessionApprenant.presence_pratique === 'absent' ? 'border-red-300 text-red-700' :
                              sessionApprenant.presence_pratique === 'deplace' ? 'border-orange-300 text-orange-700' :
                              'border-green-300 text-green-700'
                            }`}>
                              <SelectValue placeholder="Présence" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">✅ Présent</SelectItem>
                              <SelectItem value="absent">❌ Absent</SelectItem>
                              <SelectItem value="deplace">📅 Déplacé</SelectItem>
                            </SelectContent>
                          </Select>

                          {isPratiqueType(session.type_session) && (
                            <GrilleNotationConduite
                              apprenantId={apprenant.id}
                              apprenantNom={apprenant.nom}
                              apprenantPrenom={apprenant.prenom}
                              formation={`${apprenant.type_apprenant || ''} ${apprenant.formation_choisie || ''} ${(session as any).type_formation || ''}`.toUpperCase().includes('TAXI') ? 'taxi' : 'vtc'}
                              sessionId={session.id}
                            />
                          )}



                          {(sessionApprenant.mode_financement === "personnel" || apprenant.mode_financement === "personnel") && (
                            <PaiementPopover 
                              apprenantId={apprenant.id}
                              montantTotal={apprenant.montant_ttc || 0}
                              montantPaye={apprenant.montant_paye || 0}
                              apprenantNom={apprenant.nom}
                              apprenantPrenom={apprenant.prenom}
                              onChanged={() => refetchApprenants()}
                            />
                          )}

                          <Button
                            size="sm"
                            variant={apprenant.auth_user_id ? "outline" : "default"}
                            className="h-8 gap-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); openAccountDialog(apprenant); }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {apprenant.auth_user_id ? "Configurer l'accès" : "Créer un compte"}
                          </Button>
                        </div>
                      </div>
    );
  };

  const mainContent = (
    <>
        <DialogHeader className={asPage ? "" : "shrink-0"}>

          <div className="flex items-center justify-between">
            {asPage ? (
              <h1 className="flex items-center gap-3 text-lg font-semibold leading-none tracking-tight">
                {session.title}
                {getStatusBadge(session.status)}
              </h1>
            ) : (
              <DialogTitle className="flex items-center gap-3">
                {session.title}
                {getStatusBadge(session.status)}
              </DialogTitle>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(v => !v)}
                className="gap-2"
                title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadEmargement}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Feuilles d'émargement
              </Button>
              {isFormationContinue && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDownloadAttestations}
                    disabled={bulkDownloadingAttestations || apprenantsInSession.length === 0}
                    className="gap-2"
                    title="Télécharger toutes les attestations de formation continue dans un ZIP"
                  >
                    {bulkDownloadingAttestations ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    Toutes les attestations
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkSendAttestations}
                    disabled={bulkSendingAttestations || apprenantsInSession.length === 0}
                    className="gap-2"
                    title="Envoyer l'attestation par email à chaque élève"
                  >
                    {bulkSendingAttestations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer attestations
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Session Info */}
        <div className="shrink-0 flex flex-wrap gap-4 p-4 rounded-xl bg-muted/50 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">{format(new Date(session.dateDebut), "dd MMM yyyy", { locale: fr })} au {format(new Date(session.dateFin), "dd MMM yyyy", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{session.lieu}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{totalCount}/{session.maxParticipants} participants</span>
          </div>
          {formateursInSession.length > 0 && (
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-muted-foreground" />
              <span>
                {formateursInSession.map((sf: any) => {
                  const f = sf.formateur;
                  return f ? `${f.prenom} ${f.nom}` : "";
                }).filter(Boolean).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Récapitulatif des codes d'accès envoyés */}
        <div className="shrink-0 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="w-4 h-4 text-primary" />
            <span>🔑 Codes d'accès envoyés : {identifiantsRecap.length}/{totalCount} apprenant(s)</span>
          </div>
          {identifiantsRecap.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Aucun apprenant n'a encore reçu ses codes d'accès.</p>
          ) : (
            <div className="mt-2 max-h-32 overflow-y-auto divide-y">
              {identifiantsRecap.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1 text-xs">
                  <span className="font-medium truncate">{r.prenom} {r.nom}{r.email ? <span className="text-muted-foreground font-normal"> · {r.email}</span> : null}</span>
                  <Badge variant="secondary" className="ml-2 shrink-0 bg-green-100 text-green-700 hover:bg-green-100">
                    ✓ {format(new Date(r.sentAt), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const absentApprenants = (apprenantsInSession as any[]).filter((sa: any) => {
            const ap = sa.apprenant;
            return sa.presence_pratique === 'absent' || ap?.resultat_examen === 'absent' || hasNoSignature(ap?.id);
          });

          const absentCount = absentApprenants.length;
          const absentIds = new Set(absentApprenants.map((sa: any) => sa.apprenant?.id).filter(Boolean));
          const apprenantsForFactures = (apprenantsInSession as any[]).filter((sa: any) => !absentIds.has(sa.apprenant?.id));
          const facturesCount = apprenantsForFactures.length;
          const tabCount = 2 + (isFormationContinue ? 1 : 0) + 1;
          const gridColsClass = tabCount === 4 ? 'grid-cols-4' : tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2';
          return (
        <Tabs defaultValue="apprenants" className="flex-1 min-h-0 flex flex-col">
          <TabsList className={`shrink-0 grid w-full ${gridColsClass}`}>
            <TabsTrigger value="apprenants" className="gap-2">
              <Users className="w-4 h-4" />
              Apprenants ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="formateurs" className="gap-2">
              <UserCog className="w-4 h-4" />
              Formateurs ({formateursCount})
            </TabsTrigger>
            {isFormationContinue && (
              <TabsTrigger value="factures" className="gap-2">
                <FileText className="w-4 h-4" />
                Factures ({facturesCount})
              </TabsTrigger>
            )}
            <TabsTrigger value="absents" className="gap-2">
              <X className="w-4 h-4" />
              Absents ({absentCount})
            </TabsTrigger>
          </TabsList>

          {/* Apprenants Tab */}
          <TabsContent value="apprenants" className="flex-1 min-h-0 flex flex-col mt-4">
            {/* Barre d'envoi groupé */}
            <div className="shrink-0 flex items-center gap-3 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox 
                checked={apprenantsInSession.length > 0 && selectedApprenants.size === apprenantsInSession.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-foreground">
                {selectedApprenants.size > 0 ? `${selectedApprenants.size} sélectionné(s)` : "Tout sélectionner"}
              </span>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="gap-2"
                    disabled={selectedApprenants.size === 0 || bulkSending}
                  >
                    {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer un mail type ({selectedApprenants.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
                  {emailTemplates.map((t: any) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleBulkSendEmail(t.id)}
                      className="cursor-pointer"
                    >
                      <span className="text-sm">{t.label}</span>
                    </DropdownMenuItem>
                  ))}
                  {emailTemplates.length === 0 && (
                    <DropdownMenuItem disabled>Aucun modèle</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="default"
                className="gap-2 bg-[#F4A227] hover:bg-[#d8901c] text-white"
                disabled={selectedApprenants.size === 0 || bulkSending}
                onClick={handleBulkSendConvocations}
                title="Envoyer à chaque apprenant sélectionné la convocation adaptée à sa formation (VTC / VTC soir / TAXI / TA)"
              >
                {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Convocations ({selectedApprenants.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={selectedApprenants.size === 0 || bulkPrintingEmargement}
                onClick={() => handleBulkEmargement(false)}
              >
                {bulkPrintingEmargement ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Émargements ({selectedApprenants.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={selectedApprenants.size === 0 || bulkPrintingEmargement}
                onClick={() => handleBulkEmargement(true)}
              >
                <Printer className="w-4 h-4" />
                Imprimer ({selectedApprenants.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={selectedApprenants.size === 0 || bulkSendingCredentials}
                onClick={handleBulkSendCredentials}
                title="Envoyer les identifiants de connexion à la plateforme e-learning"
              >
                {bulkSendingCredentials ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Identifiants ({selectedApprenants.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                disabled={bulkResendingCredentials}
                onClick={handleResendCredentialsAll}
                title="Renvoyer les identifiants de connexion à TOUS les apprenants de la session"
              >
                {bulkResendingCredentials ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Renvoyer identifiants (tous)
              </Button>

              <Button 
                size="sm" 
                variant={showAddApprenant ? "secondary" : "outline"}

                onClick={() => setShowAddApprenant(!showAddApprenant)}
                className="gap-1"
              >
                {showAddApprenant ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddApprenant ? "Fermer" : "Ajouter"}
              </Button>
            </div>


            <div className="learners-list flex-1 min-h-0 overflow-y-auto px-2 pb-6">
              {showAddApprenant && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un apprenant..."
                      value={searchApprenant}
                      onChange={(e) => setSearchApprenant(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    {apprenantsNotInSession.slice(0, 10).map((apprenant) => (
                      <div 
                        key={apprenant.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => addApprenant(apprenant.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {apprenant.prenom?.[0]}{apprenant.nom?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{apprenant.prenom} {apprenant.nom}</p>
                            <p className="text-xs text-muted-foreground">{apprenant.email || "Pas d'email"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    ))}
                    {apprenantsNotInSession.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun apprenant disponible
                      </p>
                    )}
                    {apprenantsNotInSession.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        ... et {apprenantsNotInSession.length - 10} autres (affinez votre recherche)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loadingApprenants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3 p-1">
                  {(() => {
                    const resolveA = (sa: any) => sa.apprenant ?? allApprenants.find((a) => a.id === sa.apprenant_id);
                    const isEl = (a: any) => /e-?\s?learning/i.test(`${a?.type_apprenant || ''} ${a?.formation_choisie || ''}`);
                    const byRecent = (a: any, b: any) =>
                      String(b.created_at || '').localeCompare(String(a.created_at || ''));
                    const rows = [...(apprenantsInSession as any[])]
                      .filter((sa) => !isListeAttente(sa))
                      .sort(byRecent);
                    const pres = rows.filter((sa) => !isEl(resolveA(sa)));
                    const elearn = rows.filter((sa) => isEl(resolveA(sa)));
                    return [...pres, ...elearn].map((sa: any) => ({
                      sa,
                      group: isEl(resolveA(sa)) ? 'elearning' : 'presentiel',
                    }));
                  })().map((entry: any, idx: number, arr: any[]) => {
                    const sessionApprenant = entry.sa;
                    const showHeader = idx === 0 || arr[idx - 1].group !== entry.group;
                    const header = showHeader ? (
                      <div key={`h-${entry.group}`} className="flex items-center gap-2 pt-2 pb-1">
                        <Badge variant={entry.group === 'elearning' ? 'outline' : 'secondary'} className="text-[11px]">
                          {entry.group === 'elearning' ? '🌐 E-learning' : '🏫 Présentiel'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {arr.filter((e: any) => e.group === entry.group).length} apprenant(s)
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    ) : null;
                    return (
                      <div key={sessionApprenant.id}>
                        {header}
                        {renderApprenantCard(sessionApprenant, idx + 1)}
                      </div>
                    );

                  })}
                  
                  {apprenantsInSession.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun apprenant dans cette session</p>
                      <p className="text-sm">Cliquez sur "Ajouter" pour en ajouter</p>
                    </div>
                  )}
                </div>
              )}
              {/* Récapitulatif par type de formation */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">🚕 TAXI</Badge>
                    <span className="font-medium">{taxiCount}</span>
                  </div>
                  <span className="text-muted-foreground">+</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">🚗 VTC</Badge>
                    <span className="font-medium">{vtcCount}</span>
                  </div>
                  <span className="text-muted-foreground">=</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`${
                        totalCount > 18 
                          ? "bg-red-100 text-red-700 hover:bg-red-100" 
                          : "bg-primary/10 text-primary hover:bg-primary/10"
                      }`}
                    >
                      📊 TOTAL
                    </Badge>
                    <span className={`font-bold ${totalCount > 18 ? "text-red-600" : ""}`}>
                      {totalCount}
                    </span>
                    <span className="text-muted-foreground">/ 18 max</span>
                  </div>
                </div>
              </div>

              {/* Liste d'attente (au-delà de 18 inscrits) */}
              {(() => {
                const resolveA = (sa: any) => sa.apprenant ?? allApprenants.find((a) => a.id === sa.apprenant_id);
                const byOldest = (a: any, b: any) =>
                  String(a.created_at || '').localeCompare(String(b.created_at || ''));
                const waiting = [...(apprenantsInSession as any[])]
                  .filter((sa: any) => isListeAttente(sa))
                  .sort(byOldest);
                if (waiting.length === 0) return null;

                return (
                  <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">⏳ Liste d'attente</Badge>
                      <span className="text-sm font-medium text-orange-800">
                        {waiting.length} apprenant(s) au-delà des 18 places
                      </span>
                    </div>
                    <div className="space-y-3">
                      {waiting.map((sa: any, i: number) => (
                        <div
                          key={sa.id || sa.apprenant_id || i}
                          className="rounded-xl ring-1 ring-orange-300"
                        >
                          {renderApprenantCard(sa, totalCount + i + 1, true)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>


          </TabsContent>

          {/* Formateurs Tab */}
          <TabsContent value="formateurs" className="flex-1 min-h-0 flex flex-col mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Formateurs assignés</h4>
              <Button 
                size="sm" 
                variant={showAddFormateur ? "secondary" : "default"}
                onClick={() => setShowAddFormateur(!showAddFormateur)}
                className="gap-1"
              >
                {showAddFormateur ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddFormateur ? "Fermer" : "Ajouter"}
              </Button>
            </div>

            {showAddFormateur && (
              <div className="mb-4 p-3 border rounded-lg bg-muted/30">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un formateur..."
                    value={searchFormateur}
                    onChange={(e) => setSearchFormateur(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {formateursNotInSession.map((formateur) => (
                      <div 
                        key={formateur.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => addFormateur(formateur.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                              {formateur.prenom?.[0]}{formateur.nom?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{formateur.civilite ? `${formateur.civilite} ` : ""}{formateur.prenom} {formateur.nom}</p>
                            <p className="text-xs text-muted-foreground">{formateur.specialites || formateur.type || "Pas de spécialité"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    ))}
                    {formateursNotInSession.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun formateur disponible
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {loadingFormateurs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {formateursInSession.map((sessionFormateur: any) => {
                    const formateur = sessionFormateur.formateur;
                    if (!formateur) return null;
                    
                    return (
                      <div 
                        key={sessionFormateur.id}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-accent text-accent-foreground font-medium">
                                {formateur.prenom?.[0] || ""}{formateur.nom?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">
                                  {formateur.civilite ? `${formateur.civilite} ` : ""}{formateur.prenom} {formateur.nom}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {formateur.type === "externe" ? "Externe" : "Interne"}
                                </Badge>
                                {/* Badge présence */}
                                <button
                                  onClick={() => togglePresenceFormateur(sessionFormateur.id, sessionFormateur.presence || 'present')}
                                  title="Cliquer pour changer la présence"
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors cursor-pointer ${
                                    (sessionFormateur.presence || 'present') === 'present'
                                      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                      : (sessionFormateur.presence) === 'absent'
                                      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                                      : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                  }`}
                                >
                                  {(sessionFormateur.presence || 'present') === 'present' ? '✓ Présent' 
                                    : sessionFormateur.presence === 'absent' ? '✗ Absent'
                                    : '~ Excusé'}
                                </button>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {formateur.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {formateur.email}
                                  </span>
                                )}
                                {formateur.telephone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {formateur.telephone}
                                  </span>
                                )}
                              </div>
                              {formateur.specialites && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Spécialités : {formateur.specialites}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            onClick={() => removeFormateur(sessionFormateur.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {formateursInSession.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun formateur assigné</p>
                      <p className="text-sm">Cliquez sur "Ajouter" pour assigner un formateur</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Factures Tab (Formation Continue uniquement) */}
          {isFormationContinue && (
            <TabsContent value="factures" className="flex-1 overflow-auto flex flex-col mt-4">
              <div className="shrink-0 flex flex-wrap items-center gap-3 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm">
                  <div className="font-medium">Factures Formation Continue — 200 € TTC</div>
                  <div className="text-muted-foreground text-xs">
                    Les factures sont créées en <strong>brouillon</strong>. Cochez les apprenants pour cibler les actions, sinon toutes sont prises.
                  </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background border">
                  <Checkbox
                    checked={apprenantsForFactures.length > 0 && selectedFactureApprenants.size === apprenantsForFactures.length}
                    onCheckedChange={(v) => {
                      if (v) setSelectedFactureApprenants(new Set(apprenantsForFactures.map((sa: any) => sa.apprenant?.id).filter(Boolean)));
                      else setSelectedFactureApprenants(new Set());
                    }}
                  />
                  <span className="text-xs font-medium">
                    {selectedFactureApprenants.size > 0 ? `${selectedFactureApprenants.size} sélectionné(s)` : "Tout sélectionner"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDownloadFactures}
                  disabled={bulkDownloadingFactures || apprenantsForFactures.length === 0}
                  className="gap-2"
                >
                  {bulkDownloadingFactures ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Factures PDF{selectedFactureApprenants.size > 0 ? ` (${selectedFactureApprenants.size})` : ''}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleBulkValidateFactures}
                  disabled={bulkValidatingFactures || apprenantsForFactures.length === 0}
                  className="gap-2"
                >
                  {bulkValidatingFactures ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Valider{selectedFactureApprenants.size > 0 ? ` (${selectedFactureApprenants.size})` : ' tout'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBulkAcquitterDate(new Date().toISOString().split('T')[0]);
                    setBulkAcquitterMoyen('virement');
                    setBulkAcquitterOpen(true);
                  }}
                  disabled={apprenantsForFactures.length === 0}
                  className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Acquitter{selectedFactureApprenants.size > 0 ? ` (${selectedFactureApprenants.size})` : ' tout'}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleBulkSendFactures}
                  disabled={bulkSendingFactures || apprenantsForFactures.length === 0}
                  className="gap-2"
                >
                  {bulkSendingFactures ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Envoyer{selectedFactureApprenants.size > 0 ? ` (${selectedFactureApprenants.size})` : ''}
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {apprenantsForFactures.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Aucun apprenant à facturer</p>
                    </div>
                  )}
                  {apprenantsForFactures.map((sa: any, idx: number) => {
                    const a = sa.apprenant;
                    if (!a) return null;
                    const fc: any = (financeursFCMap as any)?.[a.id] || null;
                    const isPro = fc?.type_financeur === 'professionnel';
                    const recipient = getFactureRecipientEmail(a);
                    const facture: any = (facturesFCMap as any)?.[a.id] || null;
                    const statut = facture?.statut || null;
                    const paiements: any[] = (facture?.id ? (paiementsByFactureId as any)?.[facture.id] : []) || [];
                    const totalPaye = paiements.reduce((s, p) => s + Number(p.montant || 0), 0);
                    const montantTtc = getMontantFactureFor(a, sa);
                    const restantDu = Math.max(0, montantTtc - totalPaye);
                    const statutLabel = statut === 'payee' ? 'Acquittée' : statut === 'en_attente' ? (totalPaye > 0 ? 'Partiellement payée' : 'Validée') : statut === 'brouillon' ? 'Brouillon' : 'Non générée';
                    const statutVariant: any = statut === 'payee' ? 'default' : statut === 'en_attente' ? 'secondary' : statut === 'brouillon' ? 'outline' : 'outline';
                    return (
                      <div key={a.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                         <div className="flex items-start gap-3">
                           <Checkbox
                             className="mt-1"
                             checked={selectedFactureApprenants.has(a.id)}
                             onCheckedChange={(v) => {
                               setSelectedFactureApprenants(prev => {
                                 const next = new Set(prev);
                                 if (v) next.add(a.id); else next.delete(a.id);
                                 return next;
                               });
                             }}
                           />
                           <div className="flex-1 min-w-0">
                             {/* Ligne 1 : Nom + Prénom + statut */}
                             <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => onNavigateToApprenant?.(a.id)}
                                  className="font-semibold text-base truncate hover:underline hover:text-primary text-left"
                                  title="Ouvrir la fiche CRM de l'apprenant"
                                >{a.prenom} {a.nom?.toUpperCase()}</button>
                               <Badge variant={statutVariant} className="text-xs">{statutLabel}</Badge>
                               {facture?.numero && <span className="text-xs text-muted-foreground">N° {facture.numero}</span>}
                             </div>

                             {/* Ligne 2 : PAIEMENTS bien visibles juste sous le nom */}
                             {paiements.length > 0 ? (
                               <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                 {paiements.map((p) => (
                                   <span
                                     key={p.id}
                                     className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-medium"
                                   >
                                     <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                                     <span className="font-bold">{Number(p.montant).toFixed(2)} €</span>
                                     <span>•</span>
                                     <span>{formatDateShortFR(p.date_paiement)}</span>
                                     <span>•</span>
                                     <span className="capitalize">{p.moyen_paiement?.replace('_', ' ')}</span>
                                   </span>
                                 ))}
                                 <span className="text-xs font-medium text-emerald-700 ml-1">
                                   Total : {totalPaye.toFixed(2)} € / {montantTtc.toFixed(2)} €
                                   {restantDu > 0 && <span className="text-orange-600"> (reste {restantDu.toFixed(2)} €)</span>}
                                 </span>
                               </div>
                              ) : facture ? (
                                (() => {
                                  const vmatches: any[] = (virementsByApprenantId as any)?.[a.id] || [];
                                  if (vmatches.length === 0) {
                                    return <div className="mt-1.5 text-sm text-muted-foreground italic">Aucun paiement enregistré</div>;
                                  }
                                  return (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                      <span className="text-xs font-medium text-blue-700">Virements reçus correspondants :</span>
                                      {vmatches.map((tx) => (
                                        <span
                                          key={tx.id}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs"
                                          title={tx.libelle}
                                        >
                                          <span className="font-semibold">{Number(tx.montant).toFixed(2)} €</span>
                                          <span>•</span>
                                          <span>{formatDateShortFR(tx.date_operation)}</span>
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()
                              ) : null}

                             {/* Ligne 3 : financeur */}
                             <div className="text-xs text-muted-foreground truncate mt-1">
                               Financeur :{' '}
                               {isPro ? (
                                 <span className="font-medium text-foreground">
                                   {fc.raison_sociale || '(pro sans raison sociale)'}
                                   {fc.siret ? ` — SIRET ${fc.siret}` : fc.siren ? ` — SIREN ${fc.siren}` : ''}
                                 </span>
                               ) : fc ? (
                                 <span>Particulier ({fc.contact_nom || `${a.prenom} ${a.nom}`})</span>
                               ) : (
                                 <span className="text-orange-600">Aucun financeur saisi — facturation à l'apprenant</span>
                               )}
                             </div>
                             <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
                               <span>Email facturation : {recipient || <span className="text-destructive">manquant</span>}</span>
                               <span>{' • '}Tél : {a.telephone ? <a href={`tel:${a.telephone}`} className="text-foreground font-medium hover:underline">{a.telephone}</a> : <span className="text-destructive">manquant</span>}</span>
                               <span>{' • '}Montant TTC :</span>
                               {editMontantFor === a.id ? (
                                 <span className="inline-flex items-center gap-1">
                                   <Input
                                     type="number"
                                     step="0.01"
                                     min="0"
                                     autoFocus
                                     value={editMontantValue}
                                     onChange={(e) => setEditMontantValue(e.target.value)}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') handleSaveMontantFacture(a, sa);
                                       if (e.key === 'Escape') setEditMontantFor(null);
                                     }}
                                     className="h-7 w-24 text-xs"
                                   />
                                   <Button size="sm" className="h-7 px-2" disabled={editMontantSaving} onClick={() => handleSaveMontantFacture(a, sa)}>
                                     {editMontantSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                                   </Button>
                                   <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditMontantFor(null)}>Annuler</Button>
                                 </span>
                               ) : (
                                 <button
                                   type="button"
                                   title="Modifier le montant TTC"
                                   onClick={() => { setEditMontantFor(a.id); setEditMontantValue(montantTtc.toFixed(2)); }}
                                   className="font-medium text-foreground underline decoration-dotted hover:text-primary"
                                 >
                                   {montantTtc.toFixed(2)} € ✏️
                                 </button>
                               )}
                             </div>

                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                             <Button
                               size="sm"
                               variant="outline"
                               className="gap-2"
                               onClick={() => handleDownloadSingleFacture(a, sa, idx)}
                               disabled={singleFactureLoading === a.id}
                             >
                               {singleFactureLoading === a.id ? (
                                 <Loader2 className="w-4 h-4 animate-spin" />
                               ) : (
                                 <Download className="w-4 h-4" />
                               )}
                               PDF
                             </Button>
                             {statut === 'brouillon' && (
                               <Button
                                 size="sm"
                                 variant="secondary"
                                 className="gap-2"
                                 onClick={() => handleValidateFacture(a, sa)}
                               >
                                 <CheckCircle2 className="w-4 h-4" />
                                 Valider
                               </Button>
                             )}
                             {facture && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="gap-2"
                                 onClick={() => {
                                   setAcquittementApprenant(a);
                                   setAcquittementDate(new Date().toISOString().split('T')[0]);
                                   setAcquittementMoyen('virement');
                                   setAcquittementMontant(restantDu > 0 ? restantDu.toFixed(2) : montantTtc.toFixed(2));
                                 }}
                               >
                                 <CheckCircle className="w-4 h-4" />
                                 {totalPaye > 0 ? 'Paiements' : 'Acquitter'}
                               </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                                title="Ajouter une facture supplémentaire pour cet apprenant"
                                onClick={() => {
                                  setAddExtraFactureFor(a);
                                  setExtraFactureMontant('');
                                  setExtraFactureLibelle('');
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                Facture
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                title="Marquer absent et déplacer dans l'onglet Absents"
                                onClick={async () => {
                                  if (!confirm(`Marquer ${a.prenom} ${a.nom} comme absent et le déplacer dans l'onglet Absents ?`)) return;
                                  await updateSessionApprenant(sa.id, { presence_pratique: 'absent' });
                                }}
                              >
                                Absent
                              </Button>
                            </div>
                          </div>

                          {/* Factures additionnelles */}
                          {((extraFacturesByApprenantId as any)?.[a.id] || []).length > 0 && (
                            <div className="mt-1 pl-8 space-y-1.5">
                              {((extraFacturesByApprenantId as any)[a.id] as any[]).map((ef: any) => {
                                const libelle = String(ef.numero_convention || '').replace(/^EXTRA::/, '') || 'Facture additionnelle';
                                const efPaiements: any[] = (paiementsByFactureId as any)?.[ef.id] || [];
                                const efTotalPaye = efPaiements.reduce((s, p) => s + Number(p.montant || 0), 0);
                                const efMontant = Number(ef.montant_ttc || 0);
                                const efRestant = Math.max(0, efMontant - efTotalPaye);
                                const efStatut = ef.statut === 'payee' || (efTotalPaye + 0.001 >= efMontant && efPaiements.length > 0)
                                  ? 'Acquittée' : (efTotalPaye > 0 ? 'Partiellement payée' : 'Non payée');
                                return (
                                  <div key={ef.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/40 text-sm">
                                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium truncate">{libelle}</span>
                                        <Badge variant="outline" className="text-xs">N° {ef.numero}</Badge>
                                        <Badge variant={efStatut === 'Acquittée' ? 'default' : 'secondary'} className="text-xs">{efStatut}</Badge>
                                        <span className="font-semibold">{efMontant.toFixed(2)} €</span>
                                        {efTotalPaye > 0 && (
                                          <span className="text-xs text-emerald-700">
                                            payé {efTotalPaye.toFixed(2)} €{efRestant > 0 ? ` (reste ${efRestant.toFixed(2)} €)` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      disabled={extraFactureActionId === ef.id}
                                      onClick={() => handleDownloadExtraFacture(a, ef)}
                                      title="Voir / télécharger la facture"
                                    >
                                      {extraFactureActionId === ef.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                      Voir
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                                      disabled={extraFactureActionId === ef.id}
                                      onClick={() => handleSendExtraFacture(a, ef)}
                                      title="Envoyer la facture par email au financeur"
                                    >
                                      {extraFactureActionId === ef.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                      Envoyer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      onClick={() => {
                                        setAcquittementApprenant({ ...a, __extraFactureId: ef.id });
                                        setAcquittementDate(new Date().toISOString().split('T')[0]);
                                        setAcquittementMoyen('virement');
                                        setAcquittementMontant(efRestant > 0 ? efRestant.toFixed(2) : efMontant.toFixed(2));
                                      }}
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      {efTotalPaye > 0 ? 'Paiements' : 'Acquitter'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:bg-red-50"
                                      disabled={extraFactureDeleting === ef.id}
                                      onClick={() => handleDeleteExtraFacture(ef.id)}
                                    >
                                      {extraFactureDeleting === ef.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                    );
                  })}
                </div>
              </ScrollArea>
              <div className="mt-4">
                <SmallTransfersTable />
              </div>
            </TabsContent>
          )}

          {/* Absents Tab */}
          <TabsContent value="absents" className="flex-1 min-h-0 overflow-auto mt-4">
            {absentApprenants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <X className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun apprenant absent</p>
              </div>
            ) : (
              <div className="space-y-2 p-1">
                {absentApprenants.map((sa: any) => {
                  const ap = sa.apprenant;
                  if (!ap) return null;
                  const reasons: string[] = [];
                  if (sa.presence_pratique === 'absent') reasons.push('Absent en pratique');
                  if (ap.resultat_examen === 'absent') reasons.push('Absent à l\'examen');
                  return (
                    <div key={sa.id} className="p-3 rounded-xl border bg-card flex items-center gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-red-100 text-red-700 font-semibold text-xs">
                          {ap.prenom?.[0] || ''}{ap.nom?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-semibold text-sm text-foreground hover:text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              if (onNavigateToApprenant) {
                                if (!asPage) onOpenChange(false);
                                onNavigateToApprenant(ap.id);
                              }
                            }}
                          >
                            {ap.prenom} {ap.nom}
                          </span>
                          <Badge className={`text-[10px] ${getTypeBadgeColor(ap.type_apprenant)}`}>
                            {ap.type_apprenant?.toUpperCase() || 'N/A'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {ap.email || '—'} · {ap.telephone || '—'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {reasons.map((r) => (
                          <span key={r} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            ❌ {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
          );
        })()}
    </>
  );

  return (
    <>
    {asPage ? (
      <div className="w-full max-w-[1200px] mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Priorité : vrai retour navigateur (conserve la page précédente et son état)
              const idx = window.history.state?.idx;
              if (typeof idx === "number" && idx > 0) {
                window.history.back();
                return;
              }
              const state = (window.history.state?.usr ?? {}) as { from?: string };
              const from = state?.from;
              if (from && from !== window.location.pathname + window.location.search) {
                window.location.assign(from);
                return;
              }
              window.location.assign("/?section=sessions");
            }}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </Button>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <X className="w-4 h-4" /> Retour
            </Button>
          )}
        </div>

        {mainContent}
      </div>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "!flex !flex-col !gap-0 overflow-hidden",
          isFullscreen
            ? "max-w-none w-screen h-screen sm:max-w-none sm:rounded-none max-h-screen p-6"
            : "sm:max-w-[800px] h-[90vh] max-h-[90vh]"
        )}>
          {mainContent}
        </DialogContent>
      </Dialog>
    )}


    {/* Modale d'ajout d'une facture additionnelle */}
    <Dialog open={!!addExtraFactureFor} onOpenChange={(o) => { if (!o) { setAddExtraFactureFor(null); setExtraFactureLibelle(''); setExtraFactureMontant(''); } }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Ajouter une facture
          </DialogTitle>
        </DialogHeader>
        {addExtraFactureFor && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Apprenant : <span className="font-semibold text-foreground">{addExtraFactureFor.prenom} {addExtraFactureFor.nom}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-libelle">Libellé de la prestation</Label>
              <Input
                id="extra-libelle"
                placeholder="Ex : Formation initiale VTC, frais de dossier, rattrapage examen…"
                value={extraFactureLibelle}
                onChange={(e) => setExtraFactureLibelle(e.target.value)}
                disabled={extraFactureSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-montant">Montant TTC (€)</Label>
              <Input
                id="extra-montant"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={extraFactureMontant}
                onChange={(e) => setExtraFactureMontant(e.target.value)}
                disabled={extraFactureSaving}
              />
              <p className="text-xs text-muted-foreground">TVA non applicable (art. 293 B du CGI).</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddExtraFactureFor(null)} disabled={extraFactureSaving}>Annuler</Button>
          <Button onClick={handleCreateExtraFacture} disabled={extraFactureSaving}>
            {extraFactureSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modale d'acquittement */}

    <Dialog open={!!acquittementApprenant} onOpenChange={(open) => !open && setAcquittementApprenant(null)}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Paiements de la facture
          </DialogTitle>
        </DialogHeader>
        {acquittementApprenant && (() => {
          const _facture: any = (facturesFCMap as any)?.[acquittementApprenant.id];
          const _paiements: any[] = (_facture?.id ? (paiementsByFactureId as any)?.[_facture.id] : []) || [];
          const _totalPaye = _paiements.reduce((s, p) => s + Number(p.montant || 0), 0);
          const _montantTtc = Number(_facture?.montant_ttc || 200);
          const _restant = Math.max(0, _montantTtc - _totalPaye);
          return (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Facture de{' '}
                <span className="font-medium text-foreground">
                  {acquittementApprenant.prenom} {acquittementApprenant.nom}
                </span>{' '}
                ({_facture?.numero || '—'})
              </div>

              <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
                <div className="flex justify-between"><span>Montant TTC</span><span className="font-medium">{_montantTtc.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span>Total payé</span><span className="font-medium text-emerald-600">{_totalPaye.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span>Restant dû</span><span className={`font-medium ${_restant > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{_restant.toFixed(2)} €</span></div>
              </div>

              {_paiements.length > 0 && (
                <div className="space-y-2">
                  <Label>Paiements enregistrés</Label>
                  <div className="space-y-1.5 max-h-40 overflow-auto">
                    {_paiements.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-md border bg-card text-sm">
                        <span className="font-medium">{Number(p.montant).toFixed(2)} €</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">{formatDateFR(p.date_paiement)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="capitalize">{p.moyen_paiement?.replace('_', ' ')}</span>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePaiement(p.id, _facture.id, _montantTtc)}
                          disabled={acquittementDeleting === p.id}
                        >
                          {acquittementDeleting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">Ajouter un paiement</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="acq-date">Date de paiement</Label>
                    <Input
                      id="acq-date"
                      type="date"
                      value={acquittementDate}
                      onChange={(e) => setAcquittementDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acq-montant">Montant (€)</Label>
                    <Input
                      id="acq-montant"
                      type="number"
                      step="0.01"
                      min="0"
                      value={acquittementMontant}
                      onChange={(e) => setAcquittementMontant(e.target.value)}
                      placeholder={_restant.toFixed(2)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acq-moyen">Moyen de paiement</Label>
                  <Select value={acquittementMoyen} onValueChange={setAcquittementMoyen}>
                    <SelectTrigger id="acq-moyen">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="cb">Carte bancaire</SelectItem>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="opco">OPCO</SelectItem>
                      <SelectItem value="france_travail">France Travail</SelectItem>
                      <SelectItem value="virement_especes">Virement et espèces</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAcquittementApprenant(null)}>Fermer</Button>
                <Button onClick={handleSaveAcquittement} disabled={acquittementSaving} className="gap-2">
                  {acquittementSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ajouter le paiement
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Modale Tout acquitter */}
    <Dialog open={bulkAcquitterOpen} onOpenChange={setBulkAcquitterOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Tout acquitter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Le solde restant de toutes les factures non payées de cette session sera acquitté avec la même date et le même moyen de paiement.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bulk-acq-date">Date de paiement</Label>
            <Input
              id="bulk-acq-date"
              type="date"
              value={bulkAcquitterDate}
              onChange={(e) => setBulkAcquitterDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-acq-moyen">Moyen de paiement</Label>
            <Select value={bulkAcquitterMoyen} onValueChange={setBulkAcquitterMoyen}>
              <SelectTrigger id="bulk-acq-moyen">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="cb">Carte bancaire</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="opco">OPCO</SelectItem>
                <SelectItem value="france_travail">France Travail</SelectItem>
                <SelectItem value="virement_especes">Virement et espèces</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkAcquitterOpen(false)} disabled={bulkAcquitterSaving}>
              Annuler
            </Button>
            <Button onClick={handleBulkAcquitter} disabled={bulkAcquitterSaving} className="gap-2">
              {bulkAcquitterSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Tout acquitter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modale d'aperçu email */}
    <Dialog open={!!emailPreview} onOpenChange={(open) => !open && setEmailPreview(null)}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Aperçu du mail
          </DialogTitle>
        </DialogHeader>
        {emailPreview && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-10">À :</span>
                <span className="font-medium">{emailPreview.apprenant.prenom} {emailPreview.apprenant.nom} &lt;{emailPreview.apprenant.email}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-10">Objet :</span>
                {emailPreviewEditing ? (
                  <Input 
                    value={emailPreview.subject} 
                    onChange={(e) => setEmailPreview({...emailPreview, subject: e.target.value})}
                    className="flex-1"
                  />
                ) : (
                  <span className="font-semibold">{emailPreview.subject}</span>
                )}
              </div>
            </div>
            {emailPreviewEditing ? (
              <Textarea 
                value={emailPreview.body}
                onChange={(e) => setEmailPreview({...emailPreview, body: e.target.value})}
                className="min-h-[350px] font-mono text-xs"
              />
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30 overflow-auto max-h-[400px]">
                <div 
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: emailPreview.body }} 
                />
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEmailPreviewEditing(!emailPreviewEditing)} className="gap-2">
                <Pencil className="w-4 h-4" />
                {emailPreviewEditing ? "Aperçu" : "Modifier"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setEmailPreview(null); setEmailPreviewEditing(false); }}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => { setEmailPreviewEditing(false); handleConfirmSendEmail(); }}
                  className="gap-2"
                  disabled={sendingEmailForApprenant === emailPreview.apprenant.id}
                >
                  {sendingEmailForApprenant === emailPreview.apprenant.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Confirmer l'envoi
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog pour modifier un mail type */}
    <Dialog open={!!editingMailType} onOpenChange={(open) => !open && setEditingMailType(null)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Modifier le mail type
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nom du modèle</Label>
            <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          </div>
          <div>
            <Label>Objet de l'email</Label>
            <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          </div>
          <div>
            <Label>Corps de l'email (HTML autorisé)</Label>
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">
              Variables : <code className="bg-muted px-1 rounded">{"{{prenom}}"}</code> <code className="bg-muted px-1 rounded">{"{{nom}}"}</code> <code className="bg-muted px-1 rounded">{"{{formation}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_debut}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_fin}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_examen_theorique}}"}</code> <code className="bg-muted px-1 rounded">{"{{lieu_examen_theorique}}"}</code> <code className="bg-muted px-1 rounded">{"{{horaire_examen_theorique}}"}</code> <code className="bg-muted px-1 rounded">{"{{date_examen_pratique}}"}</code> <code className="bg-muted px-1 rounded">{"{{periode_examen_pratique}}"}</code> <code className="bg-muted px-1 rounded">{"{{periode_entrainement_pratique}}"}</code> <code className="bg-muted px-1 rounded">{"{{civilite}}"}</code>
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingMailType(null)}>
              Annuler
            </Button>
            <Button onClick={async () => {
              if (!editingMailType) return;
              const { error } = await supabase
                .from('email_templates')
                .update({ label: editLabel, subject_template: editSubject, body_template: editBody })
                .eq('id', editingMailType.id);
              if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
              } else {
                toast({ title: "Modèle mis à jour", description: "Le mail type a été enregistré." });
                queryClient.invalidateQueries({ queryKey: ['email_templates'] });
                setEditingMailType(null);
              }
            }} className="gap-2">
              <Save className="w-4 h-4" />
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modale aperçu envoi groupé */}
    <Dialog open={!!bulkPreview} onOpenChange={(open) => !open && setBulkPreview(null)}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Envoi groupé — Aperçu
          </DialogTitle>
        </DialogHeader>
        {bulkPreview && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Destinataires ({bulkPreview.apprenants.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30 max-h-[120px] overflow-y-auto">
                {bulkPreview.apprenants.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="text-xs gap-1">
                    <Mail className="w-3 h-3" />
                    {a.prenom} {a.nom}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Objet</Label>
              {bulkPreviewEditing ? (
                <Input 
                  value={bulkPreview.editedSubject ?? bulkPreview.template.subject_template}
                  onChange={(e) => setBulkPreview({...bulkPreview, editedSubject: e.target.value, previewSubject: replaceTemplateVars(e.target.value, bulkPreview.apprenants[0])})}
                />
              ) : (
                <div className="text-sm font-semibold p-2 rounded border bg-muted/20">{bulkPreview.previewSubject}</div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Contenu (personnalisé pour chaque élève)</Label>
              {bulkPreviewEditing ? (
                <Textarea 
                  value={bulkPreview.editedBody ?? bulkPreview.template.body_template}
                  onChange={(e) => setBulkPreview({...bulkPreview, editedBody: e.target.value, previewBody: replaceTemplateVars(e.target.value, bulkPreview.apprenants[0])})}
                  className="min-h-[300px] font-mono text-xs"
                />
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30 overflow-auto max-h-[300px]">
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: bulkPreview.previewBody }} 
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkPreviewEditing(!bulkPreviewEditing)} className="gap-2">
                <Pencil className="w-4 h-4" />
                {bulkPreviewEditing ? "Aperçu" : "Modifier"}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setBulkPreview(null); setBulkPreviewEditing(false); }}>
                  Annuler
                </Button>
                <Button onClick={() => { setBulkPreviewEditing(false); handleConfirmBulkSend(); }} className="gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer à {bulkPreview.apprenants.length} élève(s)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modale aperçu convocations groupées */}
    <Dialog open={!!convocationPreview} onOpenChange={(open) => !open && setConvocationPreview(null)}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Convocations — Aperçu avant envoi
          </DialogTitle>
        </DialogHeader>
        {convocationPreview && (() => {
          const items = convocationPreview.items;
          const idx = Math.min(convocationPreviewIndex, items.length - 1);
          const current = items[idx];
          return (
            <div className="flex-1 overflow-auto space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Destinataires ({items.length})</Label>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30 max-h-[100px] overflow-y-auto">
                  {items.map((it: any, i: number) => (
                    <Badge
                      key={it.apprenant.id}
                      variant={i === idx ? "default" : "secondary"}
                      className="text-xs gap-1 cursor-pointer"
                      onClick={() => setConvocationPreviewIndex(i)}
                    >
                      <Mail className="w-3 h-3" />
                      {it.apprenant.prenom} {it.apprenant.nom}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => setConvocationPreviewIndex(idx - 1)}>
                  ← Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  {current.apprenant.prenom} {current.apprenant.nom} ({idx + 1}/{items.length})
                </span>
                <Button variant="outline" size="sm" disabled={idx === items.length - 1} onClick={() => setConvocationPreviewIndex(idx + 1)}>
                  Suivant →
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Objet</Label>
                <div className="text-sm font-semibold p-2 rounded border bg-muted/20">{current.subject}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Contenu</Label>
                <div className="border rounded-lg p-4 bg-muted/30 overflow-auto max-h-[300px]">
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ __html: current.body }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setConvocationPreview(null)}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmBulkConvocations} disabled={bulkSending} className="gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer à {items.length} élève(s)
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Account creation/configuration dialog */}
    {accountDialogApprenant && (
      <Dialog open={!!accountDialogApprenant} onOpenChange={(o) => { if (!o) setAccountDialogApprenant(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {accountDialogApprenant.auth_user_id ? "Configurer l'accès cours" : "Créer un compte apprenant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {accountDialogApprenant.auth_user_id
                ? <>Mettez à jour la formation, les dates et les modules de <strong>{accountDialogApprenant.prenom} {accountDialogApprenant.nom}</strong>.</>
                : <>Un compte sera créé pour <strong>{accountDialogApprenant.prenom} {accountDialogApprenant.nom}</strong> ({accountDialogApprenant.email || "email manquant"}).</>}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Formation</label>
                <Select value={selectedFormationForAccount} onValueChange={setSelectedFormationForAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir la formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPTE_FORMATIONS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Date début cours en ligne</label>
                <Input type="date" value={accountStartDate} onChange={(e) => setAccountStartDate(e.target.value)} />
              </div>

              <div className="space-y-1 md:col-start-2">
                <label className="text-sm font-medium">Date fin cours en ligne</label>
                <Input type="date" value={accountEndDate} onChange={(e) => setAccountEndDate(e.target.value)} />
              </div>
            </div>

            {selectedFormationForAccount && ORDERED_FORMATION_MODULES[selectedFormationForAccount] && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Modules de la formation</p>
                <div className="max-h-44 overflow-y-auto border rounded-md p-3 space-y-1 bg-muted/30">
                  {ORDERED_FORMATION_MODULES[selectedFormationForAccount].map((mod: any) => (
                    <div key={mod.id} className="flex items-center gap-2 text-sm px-2 py-1">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Modules supplémentaires</p>
              <div className="max-h-44 overflow-y-auto border rounded-md p-3 space-y-2">
                {accountAdditionalModuleChoices.map((mod: any) => (
                  <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                    <Checkbox
                      checked={accountExtraModules.includes(mod.id)}
                      onCheckedChange={() => toggleAccountExtraModule(mod.id)}
                    />
                    <span className={cn(!accountExtraModules.includes(mod.id) && "text-muted-foreground")}>{mod.nom}</span>
                  </label>
                ))}
              </div>
            </div>

            {generatedPassword && (
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm font-medium">✅ Compte créé — Mot de passe généré :</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded border">{generatedPassword}</code>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast({ title: "Copié !" }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  disabled={resendingCredentials}
                  onClick={async () => {
                    setResendingCredentials(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("resend-credentials", {
                        body: { apprenant_id: accountDialogApprenant.id, reset_password: false },
                      });
                      if (error) throw error;
                      if (!(data as any)?.emailSent) throw new Error((data as any)?.message || "Envoi email impossible");
                      queryClient.invalidateQueries({ queryKey: ['identifiants-sent'] });
                      toast({ title: "Identifiants renvoyés par email" });
                    } catch (e: any) {
                      toast({ title: "Erreur", description: e?.message || "Erreur lors de l'envoi", variant: "destructive" });
                    } finally {
                      setResendingCredentials(false);
                    }
                  }}
                >
                  {resendingCredentials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Renvoyer identifiants par email
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogApprenant(null)}>Annuler</Button>
            <Button
              disabled={creatingAccount || !selectedFormationForAccount || (!accountDialogApprenant.auth_user_id && !accountDialogApprenant.email)}
              onClick={handleCreateAccount}
            >
              {creatingAccount ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              {accountDialogApprenant.auth_user_id ? "Enregistrer" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}

    {/* Dialogue de confirmation de suppression d'un apprenant */}
    <Dialog open={!!apprenantToDelete} onOpenChange={(open) => { if (!open) setApprenantToDelete(null); }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Êtes-vous sûr de vouloir supprimer ?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            L'apprenant <span className="font-semibold text-foreground">{apprenantToDelete?.prenom} {apprenantToDelete?.nom}</span> sera retiré de cette session. Cette action est irréversible.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setApprenantToDelete(null)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={removeApprenant}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
