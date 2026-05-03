import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const PUBLICS_CIBLES = ["TAXI", "TA", "VTC", "VA"] as const;
type PublicCible = typeof PUBLICS_CIBLES[number];
import { ChevronLeft, ChevronRight, Plus, X, User, Clock, BookOpen, Layers, Loader2, Upload } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Discipline {
  id: string;
  nom: string;
  color: string;
}

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  color: string;
}

interface CourseBlock {
  id: string;
  title: string;
  formateur: string;
  formateurId: string;
  formateurColor: string;
  startHour: number;
  endHour: number;
  date: Date;
  formation: string;
  discipline?: string;
  disciplineId?: string;
  disciplineColor?: string;
  publicsCibles?: string[];
}

// Helper pour parser une date sans décalage de timezone
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Couleurs pour les formateurs
const formateurColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const formationsList = [
  "Formation TAXI et VTC (TAXI/VTC)",
  "Formation TAXI (TAXI)",
  "Formation VTC (VTC)",
  "Formation TAXI et TA (TAXI/TA)",
];

// Liste complète des matières avec leurs couleurs
const defaultDisciplines: Discipline[] = [
  { id: "1", nom: "Anglais", color: "#6d7bf4" },
  { id: "2", nom: "Bilan QCM Examen", color: "#f2ef0c" },
  { id: "3", nom: "Bilan QRC Examen", color: "#ec9060" },
  { id: "4", nom: "Correction Bilan Examen", color: "#29acf0" },
  { id: "5", nom: "Développement commercial", color: "#f8a53d" },
  { id: "6", nom: "Examen blanc 1", color: "#3f4494" },
  { id: "7", nom: "Examen Blanc 1 correction", color: "#4ca8a0" },
  { id: "8", nom: "Examen Blanc 2", color: "#3beeff" },
  { id: "9", nom: "Examen blanc 2 Correction", color: "#eedfee" },
  { id: "10", nom: "Examen blanc 3", color: "#749459" },
  { id: "11", nom: "Examen blanc 3 Correction", color: "#ea67dd" },
  { id: "12", nom: "Examen blanc 4", color: "#7612ec" },
  { id: "13", nom: "Examen blanc 4 Correction", color: "#8db32e" },
  { id: "14", nom: "Examen blanc 5", color: "#59e379" },
  { id: "15", nom: "Examen blanc 5 Correction", color: "#464c04" },
  { id: "16", nom: "Examen Blanc 6", color: "#c15050" },
  { id: "17", nom: "Formation VTC", color: "#16263b" },
  { id: "18", nom: "Formation continue VTC", color: "#2563eb" },
  { id: "19", nom: "Formation TAXI", color: "#f59e0b" },
  { id: "20", nom: "Gestion 1/2", color: "#10b981" },
  { id: "21", nom: "Gestion 2/3", color: "#14b8a6" },
  { id: "22", nom: "Gestion 3/3", color: "#06b6d4" },
  { id: "23", nom: "Pratique TAXI", color: "#f97316" },
  { id: "24", nom: "Pratique VTC", color: "#8b5cf6" },
  { id: "25", nom: "Présentation", color: "#ec4899" },
  { id: "26", nom: "Réglementation locale 1/2", color: "#ef4444" },
  { id: "27", nom: "Réglementation locale 2/2", color: "#dc2626" },
  { id: "28", nom: "Réglementation nationale 1/2", color: "#b91c1c" },
  { id: "29", nom: "Réglementation nationale 2/2", color: "#991b1b" },
  { id: "30", nom: "Révision", color: "#a855f7" },
  { id: "31", nom: "Sécurité routière 1/3", color: "#facc15" },
  { id: "32", nom: "Sécurité routière 2/3", color: "#eab308" },
  { id: "33", nom: "Sécurité routière 3/3", color: "#ca8a04" },
  { id: "34", nom: "T3P 1/2", color: "#22d3d1" },
  { id: "35", nom: "T3P 2/2", color: "#0891b2" },
  // Nouvelles disciplines TAXI/TA
  { id: "36", nom: "Topographie Cartographie", color: "#7c3aed" },
  { id: "37", nom: "Examens blancs TAXI/TA", color: "#0d9488" },
  { id: "38", nom: "Correction examens blancs TAXI/TA", color: "#059669" },
  { id: "39", nom: "Bilan exercices TAXI/TA", color: "#d97706" },
  { id: "40", nom: "Correction bilan exercices TAXI/TA", color: "#b45309" },
  { id: "41", nom: "Bilan examen TAXI/TA", color: "#be185d" },
  { id: "42", nom: "Correction bilan examen TAXI/TA", color: "#9d174d" },
  { id: "43", nom: "Contrôles de connaissances", color: "#4338ca" },
  { id: "44", nom: "Correction contrôle de connaissances", color: "#3730a3" },
  { id: "45", nom: "Réglementation spécifique VTC", color: "#e11d48" },
];

// Heures de 8h à 18h (affichage par heure complète)
const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8, 9, 10, ... 21

// Hauteur d'une heure en pixels
const HOUR_HEIGHT = 60;

// Helper pour normaliser une heure au format HH:MM (évite "9:00" → force "09:00")
const normalizeHeure = (time: string): string => {
  const [h, m] = time.split(':');
  return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
};

// Helper pour convertir l'heure texte en décimal
const timeToDecimal = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h + (m / 60);
};

// Helper pour convertir décimal en heure texte
const decimalToTime = (decimal: number): string => {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export function AgendaView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [disciplines, setDisciplines] = useState<Discipline[]>(defaultDisciplines);
  const [formateursList, setFormateursList] = useState<Formateur[]>([]);
  const [courseBlocks, setCourseBlocks] = useState<CourseBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPlanning, setUploadingPlanning] = useState(false);
  const [analyzingPlanning, setAnalyzingPlanning] = useState(false);
  const planningFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [editingBlock, setEditingBlock] = useState<CourseBlock | null>(null);
  const [editBlock, setEditBlock] = useState({
    formateur: "",
    formation: "",
    startHour: "",
    endHour: "",
    discipline: "",
    publicsCibles: [] as string[],
  });
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: "",
    formateur: "",
    formation: "",
    startHour: "",
    endHour: "",
    discipline: "",
    publicsCibles: [] as string[],
  });
  const [newDiscipline, setNewDiscipline] = useState({
    nom: "",
    color: "#6366f1",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Charger les formateurs depuis la base de données
  useEffect(() => {
    const fetchFormateurs = async () => {
      const { data, error } = await supabase
        .from('formateurs')
        .select('id, nom, prenom')
        .order('nom');

      if (error) {
        console.error('Erreur chargement formateurs:', error);
        return;
      }

      if (data) {
        const formateursWithColors = data.map((f, index) => ({
          id: f.id,
          nom: `${f.prenom} ${f.nom}`,
          prenom: f.prenom,
          color: formateurColors[index % formateurColors.length],
        }));
        setFormateursList(formateursWithColors);
      }
    };

    fetchFormateurs();
  }, []);

  // Charger les blocs de cours depuis la base de données
  const loadBlocks = useCallback(async () => {
    setIsLoading(true);
    const weekStartDate = format(weekStart, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('agenda_blocs')
      .select('*')
      .eq('semaine_debut', weekStartDate);

    if (error) {
      console.error('Erreur chargement blocs:', error);
      setIsLoading(false);
      return;
    }

    if (data && formateursList.length > 0) {
      // Filtrer pour exclure les examens individuels (CMA / pratique) — on garde uniquement les COURS
      const isCoursBloc = (b: any) => {
        const d = (b.discipline_nom ?? '').trim().toLowerCase();
        const f = (b.formation ?? '').trim().toLowerCase();
        const text = `${d} ${f}`;
        if (/examen\s+blanc/i.test(text)) return true;
        if (/examen/i.test(text)) return false;
        return true;
      };
      const filtered = data.filter(isCoursBloc);

      const blocks: CourseBlock[] = filtered.map((bloc) => {
        const formateur = formateursList.find(f => f.id === bloc.formateur_id);
        return {
          id: bloc.id,
          title: bloc.discipline_nom,
          formateur: formateur?.nom || 'Inconnu',
          formateurId: bloc.formateur_id || '',
          formateurColor: formateur?.color || 'bg-gray-500',
          startHour: timeToDecimal(bloc.heure_debut),
          endHour: timeToDecimal(bloc.heure_fin),
          date: addDays(parseDateString(bloc.semaine_debut), bloc.jour),
          formation: bloc.formation,
          discipline: bloc.discipline_nom,
          disciplineId: bloc.discipline_id,
          disciplineColor: bloc.discipline_color,
          publicsCibles: ((bloc as any).publics_cibles as string[] | null) ?? [],
        };
      });
      setCourseBlocks(blocks);
    }
    setIsLoading(false);
  }, [weekStart, formateursList]);

  // Charger les blocs quand la semaine change ou que les formateurs sont chargés
  useEffect(() => {
    if (formateursList.length > 0) {
      loadBlocks();
    }
  }, [loadBlocks, formateursList]);

  // Souscrire aux changements en temps réel
  useEffect(() => {
    const weekStartDate = format(weekStart, 'yyyy-MM-dd');
    
    const channel = supabase
      .channel(`agenda:${weekStartDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_blocs',
          filter: `semaine_debut=eq.${weekStartDate}`,
        },
        () => {
          // Recharger les blocs quand il y a des changements
          loadBlocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weekStart, loadBlocks]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  const handleSlotClick = (date: Date, slot: number) => {
    setSelectedSlot({ date, hour: slot });
    const h = Math.floor(slot);
    const m = (slot % 1) * 60;
    const timeStr = `${h}:${m === 0 ? '00' : '30'}`;
    setNewBlock({ title: "", formateur: "", formation: "", startHour: timeStr, endHour: "", discipline: "", publicsCibles: [] });
    setIsDialogOpen(true);
  };

  const handleAddBlock = async () => {
    // Éviter les doubles soumissions
    if (isSaving) return;
    if (!selectedSlot || !newBlock.formation || !newBlock.formateur || !newBlock.endHour || !newBlock.startHour) return;

    const formateurData = formateursList.find((f) => f.id === newBlock.formateur);
    const disciplineData = disciplines.find((d) => d.id === newBlock.discipline);
    const [startH, startM] = newBlock.startHour.split(':').map(Number);
    const startHourDecimal = startH + (startM / 60);
    const [endH, endM] = newBlock.endHour.split(':').map(Number);
    const endHourDecimal = endH + (endM / 60);

    // Calculer le jour de la semaine (0 = Lundi)
    const dayOfWeek = weekDays.findIndex(d => isSameDay(d, selectedSlot.date));
    const weekStartDate = format(weekStart, 'yyyy-MM-dd');

    setIsSaving(true);
    // Fermer le dialogue immédiatement pour éviter les doubles clics
    setIsDialogOpen(false);

    // Sauvegarder en base de données
    const { data, error } = await supabase
      .from('agenda_blocs')
      .insert({
        formateur_id: newBlock.formateur,
        discipline_id: disciplineData?.id || '',
        discipline_nom: disciplineData?.nom || newBlock.formation,
        discipline_color: disciplineData?.color || '#6366f1',
        formation: newBlock.formation,
        jour: dayOfWeek,
        heure_debut: normalizeHeure(newBlock.startHour),
        heure_fin: normalizeHeure(newBlock.endHour),
        semaine_debut: weekStartDate,
      })
      .select()
      .single();

    setIsSaving(false);
    setSelectedSlot(null);

    if (error) {
      console.error('Erreur sauvegarde bloc:', error);
      toast.error("Erreur lors de la sauvegarde du cours");
      return;
    }

    // Ajouter le bloc localement avec l'ID de la base
    const block: CourseBlock = {
      id: data.id,
      title: disciplineData?.nom || newBlock.formation,
      formateur: formateurData?.nom || "",
      formateurId: newBlock.formateur,
      formateurColor: formateurData?.color || "bg-gray-500",
      startHour: startHourDecimal,
      endHour: endHourDecimal,
      date: selectedSlot.date,
      formation: newBlock.formation,
      discipline: disciplineData?.nom,
      disciplineId: disciplineData?.id,
      disciplineColor: disciplineData?.color,
    };

    setCourseBlocks(prev => [...prev, block]);
    toast.success("Cours enregistré");
  };

  const handleAddDiscipline = () => {
    if (!newDiscipline.nom.trim()) return;

    const discipline: Discipline = {
      id: Date.now().toString(),
      nom: newDiscipline.nom.trim(),
      color: newDiscipline.color,
    };

    setDisciplines([...disciplines, discipline]);
    setNewDiscipline({ nom: "", color: "bg-red-500" });
    setIsDisciplineDialogOpen(false);
    toast.success("Discipline ajoutée avec succès");
  };

  const handleRemoveDiscipline = (id: string) => {
    setDisciplines(disciplines.filter((d) => d.id !== id));
    toast.success("Discipline supprimée");
  };

  const handleRemoveBlock = async (blockId: string) => {
    // Supprimer de la base de données
    const { error } = await supabase
      .from('agenda_blocs')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('Erreur suppression bloc:', error);
      toast.error("Erreur lors de la suppression du cours");
      return;
    }

    setCourseBlocks(courseBlocks.filter((b) => b.id !== blockId));
    toast.success("Cours supprimé");
  };

  const getBlocksForSlot = (date: Date, hour: number) => {
    return courseBlocks.filter(
      (block) =>
        isSameDay(block.date, date) &&
        hour >= block.startHour &&
        hour < block.endHour
    );
  };

  const handleEditBlock = (block: CourseBlock) => {
    setEditingBlock(block);
    setEditBlock({
      formateur: block.formateurId,
      formation: block.formation,
      startHour: decimalToTime(block.startHour),
      endHour: decimalToTime(block.endHour),
      discipline: block.disciplineId || '',
      publicsCibles: block.publicsCibles || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBlock = async () => {
    if (!editingBlock || !editBlock.formation || !editBlock.formateur || !editBlock.endHour || !editBlock.startHour) return;

    const disciplineData = disciplines.find((d) => d.id === editBlock.discipline);
    const formateurData = formateursList.find((f) => f.id === editBlock.formateur);
    const [startH, startM] = editBlock.startHour.split(':').map(Number);
    const startHourDecimal = startH + (startM / 60);
    const [endH, endM] = editBlock.endHour.split(':').map(Number);
    const endHourDecimal = endH + (endM / 60);

    const { error } = await supabase
      .from('agenda_blocs')
      .update({
        formateur_id: editBlock.formateur,
        discipline_id: disciplineData?.id || editingBlock.disciplineId || '',
        discipline_nom: disciplineData?.nom || editingBlock.title,
        discipline_color: disciplineData?.color || editingBlock.disciplineColor || '#6366f1',
        formation: editBlock.formation,
        heure_debut: normalizeHeure(editBlock.startHour),
        heure_fin: normalizeHeure(editBlock.endHour),
      })
      .eq('id', editingBlock.id);

    if (error) {
      console.error('Erreur mise à jour bloc:', error);
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    setCourseBlocks(prev => prev.map(b => b.id === editingBlock.id ? {
      ...b,
      title: disciplineData?.nom || b.title,
      formateur: formateurData?.nom || b.formateur,
      formateurId: editBlock.formateur,
      formateurColor: formateurData?.color || b.formateurColor,
      startHour: startHourDecimal,
      endHour: endHourDecimal,
      formation: editBlock.formation,
      discipline: disciplineData?.nom || b.discipline,
      disciplineId: disciplineData?.id || b.disciplineId,
      disciplineColor: disciplineData?.color || b.disciplineColor,
    } : b));

    setIsEditDialogOpen(false);
    setEditingBlock(null);
    toast.success("Cours modifié");
  };

  // Récupérer tous les blocs d'une journée, triés par heure de début
  const getBlocksForDay = (date: Date) => {
    return courseBlocks
      .filter((block) => isSameDay(block.date, date))
      .sort((a, b) => a.startHour - b.startHour);
  };

  // Helper pour formater l'heure d'un slot
  const formatSlotTime = (slot: number): string => {
    const h = Math.floor(slot);
    const m = (slot % 1) * 60;
    return `${h}:${m === 0 ? '00' : '30'}`;
  };

  const handlePlanningUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 4 Mo)");
      return;
    }
    setUploadingPlanning(true);
    try {
      const fileName = `planning-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("exam-results")
        .upload(fileName, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      setUploadingPlanning(false);
      setAnalyzingPlanning(true);
      const { data, error } = await supabase.functions.invoke("parse-exam-planning", {
        body: { fileName },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(
          `${data.totalUpdated} candidat(s) mis à jour • ${data.agendaInserted || 0} bloc(s) ajouté(s) à l'agenda${data.totalNotFound > 0 ? ` • ${data.totalNotFound} non trouvé(s)` : ''}`,
          { duration: 8000 }
        );
        queryClient.invalidateQueries({ queryKey: ['apprenants'] });
        queryClient.invalidateQueries({ queryKey: ['all-apprenants'] });
        // Reload agenda blocks
        loadBlocks();
      } else {
        toast.error(data?.error || "Erreur lors de l'analyse");
      }
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Échec de l'analyse"));
    } finally {
      setUploadingPlanning(false);
      setAnalyzingPlanning(false);
      if (planningFileInputRef.current) planningFileInputRef.current.value = '';
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agenda des cours
            {(isLoading || isSaving) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>

          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              type="file"
              ref={planningFileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={handlePlanningUpload}
            />

            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              disabled={uploadingPlanning || analyzingPlanning}
              onClick={() => planningFileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {uploadingPlanning ? 'Upload...' : analyzingPlanning ? 'Analyse IA...' : 'Importer planning CMA (PDF)'}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setIsDisciplineDialogOpen(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Disciplines
            </Button>

            <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
              <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Semaine du {format(weekStart, "d MMMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent>
        {/* Grille horaire */}
        <div className="overflow-x-auto border border-border rounded-xl bg-card shadow-sm">
          <div className="min-w-[760px] lg:min-w-[900px]">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/40">
              <div className="p-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide border-r border-border">
                Journée
              </div>
              {weekDays.map((day, index) => {
                const dayBlks = courseBlocks.filter((b) => isSameDay(b.date, day));
                const dayTotalMins = dayBlks.reduce((sum, b) => sum + (b.endHour - b.startHour) * 60, 0);
                const dayTotalH = Math.round(dayTotalMins / 60 * 10) / 10;
                return (
                <div
                  key={index}
                  className={`p-3 text-center border-r border-border last:border-r-0 ${
                    isSameDay(day, new Date())
                      ? "bg-primary/10"
                      : ""
                  }`}
                >
                  <div className={`font-semibold text-sm ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>
                    {format(day, "EEE", { locale: fr })}. {format(day, "dd/MM", { locale: fr })}
                  </div>
                  {dayTotalH > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dayTotalH}h
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Corps de la grille */}
            <div className="grid grid-cols-8">
              {/* Colonne des heures */}
              <div className="border-r border-border bg-muted/20">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] flex items-start justify-end pr-3 pt-1 text-xs font-medium text-muted-foreground border-b border-border/50"
                  >
                    {hour} h
                  </div>
                ))}
              </div>

              {/* Colonnes des jours */}
              {weekDays.map((day, dayIndex) => {
                const dayBlocks = getBlocksForDay(day);
                
                return (
                  <div
                    key={dayIndex}
                    className="relative border-r border-border last:border-r-0"
                    style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
                  >
                    {/* Lignes de grille horaires */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full h-[60px] border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                        style={{ top: `${(hour - 8) * HOUR_HEIGHT}px` }}
                        onClick={() => handleSlotClick(day, hour)}
                      />
                    ))}

                    {/* Blocs de cours */}
                    {dayBlocks.map((block) => {
                      const topOffset = (block.startHour - 8) * HOUR_HEIGHT;
                      const blockHeight = (block.endHour - block.startHour) * HOUR_HEIGHT - 4;
                      
                      return (
                        <div
                          key={block.id}
                          className="absolute left-1 right-1 rounded-lg shadow-sm overflow-hidden z-10 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleEditBlock(block)}
                          style={{
                            top: `${topOffset + 2}px`,
                            height: `${blockHeight}px`,
                            backgroundColor: block.disciplineColor ? `${block.disciplineColor}20` : '#10b98120',
                            borderLeft: `4px solid ${block.disciplineColor || '#10b981'}`,
                          }}
                        >
                          <div className="p-2 h-full flex flex-col">
                            <div className="flex justify-between items-start">
                              <div 
                                className="text-xs font-semibold truncate flex-1"
                                style={{ color: block.disciplineColor || '#10b981' }}
                              >
                                {block.title}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBlock(block.id);
                                }}
                                className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5 text-muted-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {block.formateur}
                              </span>
                            </div>
                            {block.discipline && block.discipline !== block.title && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Layers className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {block.discipline}
                                </span>
                              </div>
                            )}
                            <div 
                              className="text-xs font-medium mt-auto"
                              style={{ color: block.disciplineColor || '#10b981' }}
                            >
                              {formatSlotTime(block.startHour)} - {formatSlotTime(block.endHour)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dialog pour ajouter un bloc */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ajouter un cours
              </DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <strong>
                    {format(selectedSlot.date, "EEEE d MMMM yyyy", { locale: fr })}
                  </strong>
                </div>

                <div className="space-y-2">
                  <Label>Formation *</Label>
                  <Select
                    value={newBlock.formation}
                    onValueChange={(value) =>
                      setNewBlock({ ...newBlock, formation: value, title: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une formation" />
                    </SelectTrigger>
                    <SelectContent>
                      {formationsList.map((formation) => (
                        <SelectItem key={formation} value={formation}>
                          {formation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Titre du cours (optionnel)</Label>
                  <Input
                    value={newBlock.title}
                    onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                    placeholder="Ex: Module 1 - Réglementation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Formateur *</Label>
                  <Select
                    value={newBlock.formateur}
                    onValueChange={(value) => setNewBlock({ ...newBlock, formateur: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un formateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {formateursList.map((formateur) => (
                        <SelectItem key={formateur.id} value={formateur.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${formateur.color}`} />
                            {formateur.nom}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discipline / Bloc de compétences</Label>
                  <Select
                    value={newBlock.discipline}
                    onValueChange={(value) => setNewBlock({ ...newBlock, discipline: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une discipline" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {disciplines.map((discipline) => (
                        <SelectItem key={discipline.id} value={discipline.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: discipline.color }} />
                            <span className="truncate">{discipline.nom}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>De *</Label>
                    <Select
                      value={newBlock.startHour}
                      onValueChange={(value) => setNewBlock({ ...newBlock, startHour: value, endHour: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Heure de début" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 26 }, (_, i) => {
                          const totalMinutes = 8 * 60 + (i * 30);
                          const hour = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          const timeValue = `${hour}:${minutes.toString().padStart(2, '0')}`;
                          return (
                            <SelectItem key={timeValue} value={timeValue}>
                              {timeValue}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jusqu'à *</Label>
                    <Select
                      value={newBlock.endHour}
                      onValueChange={(value) => setNewBlock({ ...newBlock, endHour: value })}
                      disabled={!newBlock.startHour}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Heure de fin" />
                      </SelectTrigger>
                      <SelectContent>
                        {newBlock.startHour && (() => {
                          const [startH, startM] = newBlock.startHour.split(':').map(Number);
                          const startMinutes = startH * 60 + startM;
                          const endMinutes = 21 * 60;
                          const slots = Math.floor((endMinutes - startMinutes - 30) / 30) + 1;
                          return Array.from({ length: Math.max(slots, 1) }, (_, i) => {
                            const totalMinutes = startMinutes + 30 + (i * 30);
                            const hour = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            const timeValue = `${hour}:${minutes.toString().padStart(2, '0')}`;
                            return (
                              <SelectItem key={timeValue} value={timeValue}>
                                {timeValue}
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddBlock}
                    disabled={!newBlock.formation || !newBlock.formateur || !newBlock.endHour}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog pour gérer les disciplines */}
        <Dialog open={isDisciplineDialogOpen} onOpenChange={setIsDisciplineDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Gérer les disciplines / Blocs de compétences
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Liste des disciplines existantes */}
              <div className="space-y-2">
                <Label>Disciplines existantes</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {disciplines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune discipline créée</p>
                  ) : (
                    disciplines.map((discipline) => (
                      <div
                        key={discipline.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: discipline.color }} />
                          <span className="text-sm font-medium truncate">{discipline.nom}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDiscipline(discipline.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ajouter une nouvelle discipline */}
              <div className="border-t pt-4 space-y-3">
                <Label>Ajouter une discipline</Label>
                <Input
                  value={newDiscipline.nom}
                  onChange={(e) => setNewDiscipline({ ...newDiscipline, nom: e.target.value })}
                  placeholder="Nom de la discipline"
                />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Couleur</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newDiscipline.color}
                      onChange={(e) => setNewDiscipline({ ...newDiscipline, color: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={newDiscipline.color}
                      onChange={(e) => setNewDiscipline({ ...newDiscipline, color: e.target.value })}
                      placeholder="#6366f1"
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddDiscipline}
                  disabled={!newDiscipline.nom.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter la discipline
                </Button>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setIsDisciplineDialogOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog pour modifier un bloc */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier le cours</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Formation *</Label>
                <Select value={editBlock.formation} onValueChange={(value) => setEditBlock({ ...editBlock, formation: value })}>
                  <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
                  <SelectContent>
                    {formationsList.map((formation) => (
                      <SelectItem key={formation} value={formation}>{formation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formateur *</Label>
                <Select value={editBlock.formateur} onValueChange={(value) => setEditBlock({ ...editBlock, formateur: value })}>
                  <SelectTrigger><SelectValue placeholder="Choisir un formateur" /></SelectTrigger>
                  <SelectContent>
                    {formateursList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discipline</Label>
                <Select value={editBlock.discipline} onValueChange={(value) => setEditBlock({ ...editBlock, discipline: value })}>
                  <SelectTrigger><SelectValue placeholder="Choisir une discipline" /></SelectTrigger>
                  <SelectContent>
                    {disciplines.map((discipline) => (
                      <SelectItem key={discipline.id} value={discipline.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: discipline.color }} />
                          <span>{discipline.nom}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De *</Label>
                  <Select value={editBlock.startHour} onValueChange={(value) => setEditBlock({ ...editBlock, startHour: value, endHour: "" })}>
                    <SelectTrigger><SelectValue placeholder="Heure de début" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 26 }, (_, i) => {
                        const totalMinutes = 8 * 60 + (i * 30);
                        const hour = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        const timeValue = `${hour}:${minutes.toString().padStart(2, '0')}`;
                        return <SelectItem key={timeValue} value={timeValue}>{timeValue}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jusqu'à *</Label>
                  <Select value={editBlock.endHour} onValueChange={(value) => setEditBlock({ ...editBlock, endHour: value })} disabled={!editBlock.startHour}>
                    <SelectTrigger><SelectValue placeholder="Heure de fin" /></SelectTrigger>
                    <SelectContent>
                      {editBlock.startHour && (() => {
                        const [startH, startM] = editBlock.startHour.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const slots = Math.floor((21 * 60 - startMinutes - 30) / 30) + 1;
                        return Array.from({ length: Math.max(slots, 1) }, (_, i) => {
                          const totalMinutes = startMinutes + 30 + (i * 30);
                          const hour = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          const timeValue = `${hour}:${minutes.toString().padStart(2, '0')}`;
                          return <SelectItem key={timeValue} value={timeValue}>{timeValue}</SelectItem>;
                        });
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleUpdateBlock} disabled={!editBlock.formation || !editBlock.formateur || !editBlock.endHour}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


      </CardContent>
    </Card>
  );
}

