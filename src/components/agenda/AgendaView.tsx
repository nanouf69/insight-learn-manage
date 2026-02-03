import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, X, User, Clock, BookOpen } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

interface CourseBlock {
  id: string;
  title: string;
  formateur: string;
  formateurColor: string;
  startHour: number;
  endHour: number;
  date: Date;
  formation: string;
}

const formateursList = [
  { id: "1", nom: "Jean Dupont", color: "bg-blue-500" },
  { id: "2", nom: "Marie Martin", color: "bg-green-500" },
  { id: "3", nom: "Pierre Bernard", color: "bg-purple-500" },
  { id: "4", nom: "Sophie Leroy", color: "bg-orange-500" },
];

const formationsList = [
  "Formation VTC Initiale",
  "Formation Continue VTC",
  "Capacité de Transport",
  "Gestion d'entreprise",
  "Anglais professionnel",
];

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h à 19h

export function AgendaView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courseBlocks, setCourseBlocks] = useState<CourseBlock[]>([
    {
      id: "1",
      title: "Formation VTC - Module 1",
      formateur: "Jean Dupont",
      formateurColor: "bg-blue-500",
      startHour: 9,
      endHour: 12,
      date: new Date(),
      formation: "Formation VTC Initiale",
    },
    {
      id: "2",
      title: "Capacité de Transport",
      formateur: "Marie Martin",
      formateurColor: "bg-green-500",
      startHour: 14,
      endHour: 17,
      date: new Date(),
      formation: "Capacité de Transport",
    },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newBlock, setNewBlock] = useState({
    title: "",
    formateur: "",
    formation: "",
    duration: "2",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setNewBlock({ title: "", formateur: "", formation: "", duration: "2" });
    setIsDialogOpen(true);
  };

  const handleAddBlock = () => {
    if (!selectedSlot || !newBlock.formation || !newBlock.formateur) return;

    const formateurData = formateursList.find((f) => f.id === newBlock.formateur);
    const duration = parseInt(newBlock.duration);

    const block: CourseBlock = {
      id: Date.now().toString(),
      title: newBlock.title || newBlock.formation,
      formateur: formateurData?.nom || "",
      formateurColor: formateurData?.color || "bg-gray-500",
      startHour: selectedSlot.hour,
      endHour: selectedSlot.hour + duration,
      date: selectedSlot.date,
      formation: newBlock.formation,
    };

    setCourseBlocks([...courseBlocks, block]);
    setIsDialogOpen(false);
    setSelectedSlot(null);
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
        {/* Légende des formateurs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {formateursList.map((formateur) => (
            <Badge key={formateur.id} variant="outline" className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-full ${formateur.color}`} />
              {formateur.nom}
            </Badge>
          ))}
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
                            <div className="text-xs opacity-75 mt-0.5">
                              {block.startHour}:00 - {block.endHour}:00
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
                  <Label>Durée</Label>
                  <Select
                    value={newBlock.duration}
                    onValueChange={(value) => setNewBlock({ ...newBlock, duration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 heure</SelectItem>
                      <SelectItem value="2">2 heures</SelectItem>
                      <SelectItem value="3">3 heures</SelectItem>
                      <SelectItem value="4">4 heures</SelectItem>
                      <SelectItem value="5">5 heures</SelectItem>
                      <SelectItem value="6">6 heures</SelectItem>
                      <SelectItem value="7">7 heures (journée)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddBlock}
                    disabled={!newBlock.formation || !newBlock.formateur}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
