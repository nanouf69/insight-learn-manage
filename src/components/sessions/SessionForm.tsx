import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, eachDayOfInterval, isWeekend, differenceInCalendarDays } from "date-fns";

// Mapping type_session → discipline dans l'agenda (fallback simple)
const SESSION_TYPE_TO_DISCIPLINE: Record<string, { id: string; nom: string; color: string; formation: string }> = {
  "theorique": { id: "17", nom: "Formation VTC", color: "#16263b", formation: "Formation TAXI et VTC (TAXI/VTC)" },
  "pratique":  { id: "24", nom: "Pratique VTC",  color: "#8b5cf6", formation: "Formation VTC (VTC)" },
};

function guessFormation(nom: string | null, typeSession: string): string {
  if (!nom) return SESSION_TYPE_TO_DISCIPLINE[typeSession]?.formation || "Formation TAXI et VTC (TAXI/VTC)";
  const n = nom.toLowerCase();
  if (n.includes("taxi") && n.includes("vtc")) return "Formation TAXI et VTC (TAXI/VTC)";
  if (n.includes("taxi") && (n.includes(" ta") || n.includes("ta "))) return "Formation TAXI et TA (TAXI/TA)";
  if (n.includes("taxi")) return "Formation TAXI (TAXI)";
  if (n.includes("vtc")) return "Formation VTC (VTC)";
  return SESSION_TYPE_TO_DISCIPLINE[typeSession]?.formation || "Formation TAXI et VTC (TAXI/VTC)";
}

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

// Score de similarité entre deux noms (mots communs après normalisation)
function similarityScore(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 3 && !/^\d{4}$/.test(w) && !["session","formation","janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre","du","au","de","la","le","les"].includes(w));
  const wa = new Set(norm(a));
  const wb = new Set(norm(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  return common / Math.max(wa.size, wb.size);
}

// Cherche la session précédente la plus similaire (même type, nom proche), antérieure à date_debut
async function findPreviousSimilarSession(params: {
  nom: string | null;
  type_session: string;
  date_debut: string;
}): Promise<{ id: string; date_debut: string; date_fin: string; nom: string | null } | null> {
  const { nom, type_session, date_debut } = params;
  const { data, error } = await supabase
    .from("sessions")
    .select("id, nom, date_debut, date_fin, type_session")
    .eq("type_session", type_session)
    .lt("date_debut", date_debut)
    .order("date_debut", { ascending: false })
    .limit(20);
  if (error || !data || data.length === 0) return null;

  // Si pas de nom fourni, retourne la plus récente du même type
  if (!nom || !nom.trim()) return data[0] as any;

  // Sinon score de similarité
  let best: any = null;
  let bestScore = 0;
  for (const s of data) {
    const score = similarityScore(nom, s.nom || "");
    if (score > bestScore) { bestScore = score; best = s; }
  }
  // seuil minimum, sinon fallback sur la plus récente
  return (best && bestScore >= 0.2) ? best : (data[0] as any);
}

// Reconstruit les blocs d'une session source en réalignant les dates sur la nouvelle session
async function copyBlocsFromSession(sourceSessionId: string, source: { date_debut: string; date_fin: string }, target: { date_debut: string; date_fin: string }) {
  // Récupère tous les blocs des semaines couvertes par la source
  const srcStart = new Date(source.date_debut + "T00:00:00");
  const srcEnd = new Date(source.date_fin + "T00:00:00");
  const srcWeekStart = startOfWeek(srcStart, { weekStartsOn: 1 });
  const srcWeekEnd = startOfWeek(srcEnd, { weekStartsOn: 1 });

  const { data: srcBlocs, error } = await supabase
    .from("agenda_blocs")
    .select("*")
    .gte("semaine_debut", format(srcWeekStart, "yyyy-MM-dd"))
    .lte("semaine_debut", format(srcWeekEnd, "yyyy-MM-dd"));

  if (error || !srcBlocs || srcBlocs.length === 0) return 0;

  // Filtrer les examens individuels (réservations pratiques par apprenant)
  const filtered = srcBlocs.filter((b: any) => !/^Examen /i.test(b.discipline_nom || ""));
  if (filtered.length === 0) return 0;

  const tgtStart = new Date(target.date_debut + "T00:00:00");
  const tgtWeekStart = startOfWeek(tgtStart, { weekStartsOn: 1 });

  // Décalage en semaines entre source et target
  const weekShiftDays = differenceInCalendarDays(tgtWeekStart, srcWeekStart);

  // Nombre de semaines de la nouvelle session
  const tgtEnd = new Date(target.date_fin + "T00:00:00");
  const tgtWeekEnd = startOfWeek(tgtEnd, { weekStartsOn: 1 });
  const targetWeeksCount = Math.round(differenceInCalendarDays(tgtWeekEnd, tgtWeekStart) / 7) + 1;
  const sourceWeeksCount = Math.round(differenceInCalendarDays(srcWeekEnd, srcWeekStart) / 7) + 1;

  const inserts = filtered.map((b: any) => {
    const srcWeek = new Date(b.semaine_debut + "T00:00:00");
    // Index relatif de la semaine dans la source
    const weekIndex = Math.round(differenceInCalendarDays(srcWeek, srcWeekStart) / 7);
    // Si la source est plus longue, on ne garde que les semaines qui rentrent
    if (weekIndex >= targetWeeksCount) return null;
    const newWeek = addDays(srcWeek, weekShiftDays);
    return {
      semaine_debut: format(newWeek, "yyyy-MM-dd"),
      jour: b.jour,
      heure_debut: b.heure_debut,
      heure_fin: b.heure_fin,
      discipline_id: b.discipline_id,
      discipline_nom: b.discipline_nom,
      discipline_color: b.discipline_color,
      formation: b.formation,
      formateur_id: b.formateur_id,
    };
  }).filter(Boolean);

  if (inserts.length === 0) return 0;

  // upsert pour éviter les conflits avec la contrainte unique
  const { error: insErr } = await supabase
    .from("agenda_blocs")
    .upsert(inserts as any, { onConflict: "semaine_debut,jour,heure_debut,heure_fin,discipline_nom,formation,formateur_id" });
  if (insErr) {
    console.warn("Erreur copie blocs agenda:", insErr);
    return 0;
  }
  return inserts.length;
}

// Crée les blocs agenda : copie depuis la session précédente similaire si disponible, sinon fallback simple
async function createAgendaBlocs(sessionData: {
  date_debut: string;
  date_fin: string;
  nom: string | null;
  type_session: string;
  heure_debut: string;
  heure_fin: string;
}): Promise<{ copied: number; source: string | null }> {
  const { date_debut, date_fin, nom, type_session, heure_debut, heure_fin } = sessionData;

  // 1) Tentative de copie depuis la session précédente similaire
  const previous = await findPreviousSimilarSession({ nom, type_session, date_debut });
  if (previous) {
    const copied = await copyBlocsFromSession(previous.id, previous, { date_debut, date_fin });
    if (copied > 0) {
      return { copied, source: previous.nom || `Session du ${previous.date_debut}` };
    }
  }

  // 2) Fallback : un bloc générique par jour ouvré
  const start = new Date(date_debut + "T00:00:00");
  const end = new Date(date_fin + "T00:00:00");
  const allDays = eachDayOfInterval({ start, end }).filter(d => !isWeekend(d));
  const discipline = guessDiscipline(nom, type_session);
  const formation = guessFormation(nom, type_session);

  const blocsByWeek: Record<string, { jour: number }[]> = {};
  for (const day of allDays) {
    const weekStart = startOfWeek(day, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const dayOfWeek = (day.getDay() + 6) % 7;
    if (!blocsByWeek[weekKey]) blocsByWeek[weekKey] = [];
    blocsByWeek[weekKey].push({ jour: dayOfWeek });
  }

  const inserts: any[] = [];
  for (const [semaine_debut, jours] of Object.entries(blocsByWeek)) {
    for (const { jour } of jours) {
      inserts.push({
        semaine_debut, jour, heure_debut, heure_fin,
        discipline_id: discipline.id,
        discipline_nom: discipline.nom,
        discipline_color: discipline.color,
        formation,
        formateur_id: null,
      });
    }
  }
  if (inserts.length > 0) {
    await supabase.from("agenda_blocs").upsert(inserts, { onConflict: "semaine_debut,jour,heure_debut,heure_fin,discipline_nom,formation,formateur_id" });
  }
  return { copied: inserts.length, source: null };
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

      // Créer les blocs agenda automatiquement (copie depuis session précédente similaire si possible)
      const result = await createAgendaBlocs({
        date_debut: dateDebut,
        date_fin: dateFin,
        nom: nom || null,
        type_session: typeSession,
        heure_debut: heureDebut,
        heure_fin: heureFin,
      });

      toast({
        title: "Session créée",
        description: result.source
          ? `Agenda rempli avec ${result.copied} blocs copiés depuis « ${result.source} ».`
          : `Agenda rempli avec ${result.copied} blocs génériques.`,
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
