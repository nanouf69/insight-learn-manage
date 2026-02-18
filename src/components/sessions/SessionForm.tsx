import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, eachDayOfInterval, isWeekend } from "date-fns";

// Mapping type_session → discipline dans l'agenda
const SESSION_TYPE_TO_DISCIPLINE: Record<string, { id: string; nom: string; color: string; formation: string }> = {
  "theorique": { id: "17", nom: "Formation VTC", color: "#16263b", formation: "Formation TAXI et VTC (TAXI/VTC)" },
  "pratique":  { id: "24", nom: "Pratique VTC",  color: "#8b5cf6", formation: "Formation VTC (VTC)" },
};

// Déduit la formation selon le nom de session
function guessFormation(nom: string | null, typeSession: string): string {
  if (!nom) return SESSION_TYPE_TO_DISCIPLINE[typeSession]?.formation || "Formation TAXI et VTC (TAXI/VTC)";
  const n = nom.toLowerCase();
  if (n.includes("taxi") && n.includes("vtc")) return "Formation TAXI et VTC (TAXI/VTC)";
  if (n.includes("taxi") && (n.includes(" ta") || n.includes("ta "))) return "Formation TAXI et TA (TAXI/TA)";
  if (n.includes("taxi")) return "Formation TAXI (TAXI)";
  if (n.includes("vtc")) return "Formation VTC (VTC)";
  return SESSION_TYPE_TO_DISCIPLINE[typeSession]?.formation || "Formation TAXI et VTC (TAXI/VTC)";
}

// Déduit la discipline selon le nom et type
function guessDiscipline(nom: string | null, typeSession: string) {
  if (!nom) return SESSION_TYPE_TO_DISCIPLINE[typeSession];
  const n = nom.toLowerCase();
  if (typeSession === "pratique") {
    if (n.includes("taxi")) return { id: "23", nom: "Pratique TAXI", color: "#f97316", formation: "Formation TAXI (TAXI)" };
    return { id: "24", nom: "Pratique VTC", color: "#8b5cf6", formation: "Formation VTC (VTC)" };
  }
  if (n.includes("continue")) return { id: "18", nom: "Formation continue VTC", color: "#2563eb", formation: "Formation VTC (VTC)" };
  if (n.includes("taxi") && !n.includes("vtc")) return { id: "19", nom: "Formation TAXI", color: "#f59e0b", formation: "Formation TAXI (TAXI)" };
  return { id: "17", nom: "Formation VTC", color: "#16263b", formation: "Formation TAXI et VTC (TAXI/VTC)" };
}

async function createAgendaBlocs(sessionData: {
  date_debut: string;
  date_fin: string;
  nom: string | null;
  type_session: string;
  heure_debut: string;
  heure_fin: string;
}) {
  const { date_debut, date_fin, nom, type_session, heure_debut, heure_fin } = sessionData;

  const start = new Date(date_debut + "T00:00:00");
  const end = new Date(date_fin + "T00:00:00");

  // Tous les jours ouvrés (lun-ven) dans l'intervalle
  const allDays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));

  const discipline = guessDiscipline(nom, type_session);
  const formation = guessFormation(nom, type_session);

  // Regrouper par semaine
  const blocsByWeek: Record<string, { jour: number }[]> = {};
  for (const day of allDays) {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const dayOfWeek = (day.getDay() + 6) % 7; // 0=Lun, 4=Ven
    if (!blocsByWeek[weekKey]) blocsByWeek[weekKey] = [];
    blocsByWeek[weekKey].push({ jour: dayOfWeek });
  }

  // Insérer un bloc par jour
  const inserts = [];
  for (const [semaine_debut, jours] of Object.entries(blocsByWeek)) {
    for (const { jour } of jours) {
      inserts.push({
        semaine_debut,
        jour,
        heure_debut,
        heure_fin,
        discipline_id: discipline.id,
        discipline_nom: discipline.nom,
        discipline_color: discipline.color,
        formation,
        formateur_id: null,
      });
    }
  }

  if (inserts.length > 0) {
    await supabase.from("agenda_blocs").insert(inserts);
  }
}

export function SessionForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [nom, setNom] = useState("");
  const [typeSession, setTypeSession] = useState("theorique");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [lieu, setLieu] = useState("");
  const [places, setPlaces] = useState("18");
  const [heureDebut, setHeureDebut] = useState("08:00");
  const [heureFin, setHeureFin] = useState("17:00");

  const resetForm = () => {
    setNom("");
    setTypeSession("theorique");
    setDateDebut("");
    setDateFin("");
    setLieu("");
    setPlaces("18");
    setHeureDebut("08:00");
    setHeureFin("17:00");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('sessions')
        .insert({
          nom: nom || null,
          type_session: typeSession,
          date_debut: dateDebut,
          date_fin: dateFin,
          heure_debut: heureDebut || null,
          heure_fin: heureFin || null,
          lieu,
          places_disponibles: parseInt(places) || (typeSession === 'pratique' ? 4 : 18),
          statut: 'planifiee',
        });

      if (error) throw error;

      // Créer les blocs agenda automatiquement
      await createAgendaBlocs({
        date_debut: dateDebut,
        date_fin: dateFin,
        nom: nom || null,
        type_session: typeSession,
        heure_debut: heureDebut,
        heure_fin: heureFin,
      });

      toast({
        title: "Session créée",
        description: "La session et les blocs agenda ont été créés avec succès.",
      });
      resetForm();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de la session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Type de session *</Label>
            <Select value={typeSession} onValueChange={(v) => {
              setTypeSession(v);
              if (v === 'pratique') setPlaces("4");
              else setPlaces("18");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theorique">📚 Formation théorique</SelectItem>
                <SelectItem value="pratique">🚗 Formation pratique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la session</Label>
            <Input id="nom" placeholder={typeSession === 'pratique' ? "Ex: Formation pratique VTC Février 2026" : "Ex: Session Janvier 2026"} value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateDebut">Date de début *</Label>
              <Input id="dateDebut" type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFin">Date de fin *</Label>
              <Input id="dateFin" type="date" required value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heureDebut">Heure de début</Label>
              <Input id="heureDebut" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heureFin">Heure de fin</Label>
              <Input id="heureFin" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu</Label>
              <Input id="lieu" placeholder="86 route de genas 69003 Lyon" value={lieu} onChange={(e) => setLieu(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Places disponibles</Label>
              <Input id="places" type="number" placeholder={typeSession === 'pratique' ? "4" : "18"} value={places} onChange={(e) => setPlaces(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
