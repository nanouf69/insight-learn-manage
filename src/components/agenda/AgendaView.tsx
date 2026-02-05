import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, X, User, Clock, BookOpen, Layers, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  "Formation TAXI et VTC",
  "Formation TAXI",
  "Formation VTC",
  "Formation TAXI et TA",
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

// Créneaux de 30 minutes de 8h à 19h
const timeSlots = Array.from({ length: 22 }, (_, i) => 8 + i * 0.5); // 8:00, 8:30, 9:00, ... 18:30

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: "",
    formateur: "",
    formation: "",
    startHour: "",
    endHour: "",
    discipline: "",
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
      const blocks: CourseBlock[] = data.map((bloc) => {
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
    setNewBlock({ title: "", formateur: "", formation: "", startHour: timeStr, endHour: "", discipline: "" });
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
        heure_debut: newBlock.startHour,
        heure_fin: newBlock.endHour,
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

  const isBlockStart = (block: CourseBlock, slot: number) => {
    // Comparer avec une tolérance pour éviter les erreurs de précision flottante
    return Math.abs(block.startHour - slot) < 0.01;
  };

  // Helper pour formater l'heure d'un slot
  const formatSlotTime = (slot: number): string => {
    const h = Math.floor(slot);
    const m = (slot % 1) * 60;
    return `${h}:${m === 0 ? '00' : '30'}`;
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agenda des cours
            {(isLoading || isSaving) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDisciplineDialogOpen(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Disciplines
            </Button>
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
        <p className="text-sm text-muted-foreground">
          Semaine du {format(weekStart, "d MMMM yyyy", { locale: fr })}
        </p>
      </CardHeader>
      <CardContent>
        {/* Légende des formateurs et disciplines */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium mr-1">Formateurs:</span>
            {formateursList.map((formateur) => (
              <Badge key={formateur.id} variant="outline" className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-full ${formateur.color}`} />
                {formateur.nom}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium mr-1">Disciplines:</span>
            {disciplines.slice(0, 10).map((discipline) => (
              <Badge key={discipline.id} variant="secondary" className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: discipline.color }} />
                {discipline.nom}
              </Badge>
            ))}
            {disciplines.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{disciplines.length - 10} autres
              </Badge>
            )}
          </div>
        </div>

        {/* Grille horaire */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-center font-medium text-muted-foreground text-sm">
                Heures
              </div>
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-2 text-center rounded-lg ${
                    isSameDay(day, new Date())
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="font-medium text-sm">
                    {format(day, "EEEE", { locale: fr })}
                  </div>
                  <div className="text-xs">
                    {format(day, "d MMM", { locale: fr })}
                  </div>
                </div>
              ))}
            </div>

            {/* Lignes horaires */}
            {timeSlots.map((slot) => (
              <div key={slot} className="grid grid-cols-8 gap-1">
                {/* Colonne heure */}
                <div className="p-2 text-center text-sm text-muted-foreground border-r">
                  {formatSlotTime(slot)}
                </div>
                {/* Cellules par jour */}
                {weekDays.map((day, dayIndex) => {
                  const blocks = getBlocksForSlot(day, slot);
                  const hasBlock = blocks.length > 0;

                  return (
                    <div
                      key={dayIndex}
                      className={`relative min-h-[30px] border border-border/50 rounded-sm transition-colors ${
                        !hasBlock ? "hover:bg-muted/50 cursor-pointer" : ""
                      }`}
                      onClick={() => !hasBlock && handleSlotClick(day, slot)}
                    >
                      {blocks.map((block) =>
                        isBlockStart(block, slot) ? (
                          <div
                            key={block.id}
                            className={`absolute inset-x-1 top-1 ${block.formateurColor} text-white rounded-md p-2 shadow-sm z-10`}
                            style={{
                              height: `${(block.endHour - block.startHour) * 2 * 30 - 8}px`,
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="text-xs font-medium truncate flex-1">
                                {block.title}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBlock(block.id);
                                }}
                                className="ml-1 hover:bg-white/20 rounded p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs opacity-90 truncate">
                                {block.formateur}
                              </span>
                            </div>
                            {block.discipline && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Layers className="h-3 w-3" />
                                <span className="text-xs opacity-90 truncate">
                                  {block.discipline}
                                </span>
                              </div>
                            )}
                            <div className="text-xs opacity-75 mt-0.5">
                              {formatSlotTime(block.startHour)} - {formatSlotTime(block.endHour)}
                            </div>
                          </div>
                        ) : null
                      )}
                      {!hasBlock && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
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
                        {Array.from({ length: 22 }, (_, i) => {
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
                          const endMinutes = 19 * 60;
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
      </CardContent>
    </Card>
  );
}
