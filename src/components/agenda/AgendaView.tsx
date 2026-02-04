import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, X, User, Clock, BookOpen, Layers } from "lucide-react";
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
  formateurColor: string;
  startHour: number;
  endHour: number;
  date: Date;
  formation: string;
  discipline?: string;
  disciplineColor?: string;
}

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
  { id: "5", nom: "Développement commercial Réglementation spécifique VTC", color: "#f8a53d" },
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
];

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h à 19h

export function AgendaView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [disciplines, setDisciplines] = useState<Discipline[]>(defaultDisciplines);
  const [formateursList, setFormateursList] = useState<Formateur[]>([]);
  const [courseBlocks, setCourseBlocks] = useState<CourseBlock[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: "",
    formateur: "",
    formation: "",
    endHour: "",
    discipline: "",
  });
  const [newDiscipline, setNewDiscipline] = useState({
    nom: "",
    color: "#6366f1",
  });

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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setNewBlock({ title: "", formateur: "", formation: "", endHour: "", discipline: "" });
    setIsDialogOpen(true);
  };

  const handleAddBlock = () => {
    if (!selectedSlot || !newBlock.formation || !newBlock.formateur || !newBlock.endHour) return;

    const formateurData = formateursList.find((f) => f.id === newBlock.formateur);
    const disciplineData = disciplines.find((d) => d.id === newBlock.discipline);
    const [endH, endM] = newBlock.endHour.split(':').map(Number);
    const endHourDecimal = endH + (endM / 60);

    const block: CourseBlock = {
      id: Date.now().toString(),
      title: newBlock.title || newBlock.formation,
      formateur: formateurData?.nom || "",
      formateurColor: formateurData?.color || "bg-gray-500",
      startHour: selectedSlot.hour,
      endHour: endHourDecimal,
      date: selectedSlot.date,
      formation: newBlock.formation,
      discipline: disciplineData?.nom,
      disciplineColor: disciplineData?.color,
    };

    setCourseBlocks([...courseBlocks, block]);
    setIsDialogOpen(false);
    setSelectedSlot(null);
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

  const handleRemoveBlock = (blockId: string) => {
    setCourseBlocks(courseBlocks.filter((b) => b.id !== blockId));
  };

  const getBlocksForSlot = (date: Date, hour: number) => {
    return courseBlocks.filter(
      (block) =>
        isSameDay(block.date, date) &&
        hour >= block.startHour &&
        hour < block.endHour
    );
  };

  const isBlockStart = (block: CourseBlock, hour: number) => {
    return block.startHour === hour;
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agenda des cours
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
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-1">
                {/* Colonne heure */}
                <div className="p-2 text-center text-sm text-muted-foreground border-r">
                  {hour}:00
                </div>
                {/* Cellules par jour */}
                {weekDays.map((day, dayIndex) => {
                  const blocks = getBlocksForSlot(day, hour);
                  const hasBlock = blocks.length > 0;

                  return (
                    <div
                      key={dayIndex}
                      className={`relative min-h-[60px] border border-border/50 rounded-sm transition-colors ${
                        !hasBlock ? "hover:bg-muted/50 cursor-pointer" : ""
                      }`}
                      onClick={() => !hasBlock && handleSlotClick(day, hour)}
                    >
                      {blocks.map((block) =>
                        isBlockStart(block, hour) ? (
                          <div
                            key={block.id}
                            className={`absolute inset-x-1 top-1 ${block.formateurColor} text-white rounded-md p-2 shadow-sm z-10`}
                            style={{
                              height: `${(block.endHour - block.startHour) * 60 - 8}px`,
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
                              {block.startHour}:00 - {Math.floor(block.endHour)}:{block.endHour % 1 === 0 ? '00' : '30'}
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
                  </strong>{" "}
                  à partir de <strong>{selectedSlot.hour}:00</strong>
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

                <div className="space-y-2">
                  <Label>Jusqu'à *</Label>
                  <Select
                    value={newBlock.endHour}
                    onValueChange={(value) => setNewBlock({ ...newBlock, endHour: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Heure de fin" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSlot && Array.from({ length: (19 - selectedSlot.hour) * 2 }, (_, i) => {
                        const totalMinutes = (selectedSlot.hour * 60 + 30) + (i * 30);
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
