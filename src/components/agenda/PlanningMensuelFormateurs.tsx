import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, User, Clock, BookOpen, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
}

interface AgendaBloc {
  id: string;
  discipline_nom: string;
  discipline_color: string;
  formation: string;
  heure_debut: string;
  heure_fin: string;
  semaine_debut: string;
  jour: number;
  formateur_id: string | null;
  formateur_nom?: string;
}

interface PlanningMensuelFormateursProps {
  open: boolean;
  onClose: () => void;
}

const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const getDateFromBloc = (semaineDebut: string, jour: number): Date => {
  const [year, month, day] = semaineDebut.split("-").map(Number);
  const lundi = new Date(year, month - 1, day);
  const date = new Date(lundi);
  date.setDate(lundi.getDate() + jour);
  return date;
};

const calcDuree = (debut: string, fin: string): number => {
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return (h2 * 60 + m2 - h1 * 60 - m1) / 60;
};

export default function PlanningMensuelFormateurs({ open, onClose }: PlanningMensuelFormateursProps) {
  const [moisActuel, setMoisActuel] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [blocs, setBlocs] = useState<AgendaBloc[]>([]);
  const [selectedFormateur, setSelectedFormateur] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFormateurs();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchBlocs();
    }
  }, [open, moisActuel]);

  const fetchFormateurs = async () => {
    const { data } = await supabase.from("formateurs").select("id, nom, prenom").order("nom");
    if (data) setFormateurs(data);
  };

  const fetchBlocs = async () => {
    setLoading(true);
    const debut = format(startOfMonth(moisActuel), "yyyy-MM-dd");
    const fin = format(endOfMonth(moisActuel), "yyyy-MM-dd");

    // On fetch les blocs dont la semaine_debut est dans le mois ou le mois précédent (pour couvrir les semaines qui chevauchent)
    const semaineMin = format(new Date(moisActuel.getFullYear(), moisActuel.getMonth() - 1, 24), "yyyy-MM-dd");
    const semaineMax = fin;

    const { data } = await supabase
      .from("agenda_blocs")
      .select("*, formateurs(nom, prenom)")
      .gte("semaine_debut", semaineMin)
      .lte("semaine_debut", semaineMax)
      .order("semaine_debut")
      .order("jour")
      .order("heure_debut");

    if (data) {
      const mapped = data.map((b: any) => ({
        ...b,
        formateur_nom: b.formateurs ? `${b.formateurs.prenom} ${b.formateurs.nom}` : null,
      }));
      // Filtrer pour ne garder que les blocs dont la date calculée est dans le mois
      const filtered = mapped.filter((b) => {
        const date = getDateFromBloc(b.semaine_debut, b.jour);
        return date >= startOfMonth(moisActuel) && date <= endOfMonth(moisActuel);
      });
      setBlocs(filtered);
    }
    setLoading(false);
  };

  const moisPrecedent = () => setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() - 1, 1));
  const moisSuivant = () => setMoisActuel(new Date(moisActuel.getFullYear(), moisActuel.getMonth() + 1, 1));

  // Grouper les blocs par formateur puis par date
  const blocsFiltered = selectedFormateur === "all" 
    ? blocs 
    : blocs.filter(b => b.formateur_id === selectedFormateur);

  // Stats par formateur
  const statsParFormateur = formateurs.map(f => {
    const blocsF = blocs.filter(b => b.formateur_id === f.id);
    const heures = blocsF.reduce((acc, b) => acc + calcDuree(b.heure_debut, b.heure_fin), 0);
    const jours = new Set(blocsF.map(b => `${b.semaine_debut}-${b.jour}`)).size;
    const disciplines = new Set(blocsF.map(b => b.discipline_nom)).size;
    return { formateur: f, heures, jours, disciplines, blocs: blocsF.length };
  }).filter(s => s.blocs > 0);

  // Jours ouvrés du mois
  const joursOuvres = eachDayOfInterval({
    start: startOfMonth(moisActuel),
    end: endOfMonth(moisActuel),
  }).filter(d => !isWeekend(d));

  // Helper : convertit "9:00" ou "13:30" en minutes pour tri numérique
  const heureEnMinutes = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };

  // Pour la vue calendrier : grouper blocs par date (triés chronologiquement)
  const blocsParDate = new Map<string, AgendaBloc[]>();
  blocsFiltered.forEach(b => {
    const date = getDateFromBloc(b.semaine_debut, b.jour);
    const key = format(date, "yyyy-MM-dd");
    if (!blocsParDate.has(key)) blocsParDate.set(key, []);
    blocsParDate.get(key)!.push(b);
  });
  // Trier chaque jour chronologiquement
  blocsParDate.forEach((blocs, key) => {
    blocsParDate.set(key, blocs.sort((a, b) => heureEnMinutes(a.heure_debut) - heureEnMinutes(b.heure_debut)));
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Planning mensuel des formateurs
          </DialogTitle>
        </DialogHeader>

        {/* Navigation mois + filtre formateur */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={moisPrecedent}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg capitalize min-w-[200px] text-center">
              {format(moisActuel, "MMMM yyyy", { locale: fr })}
            </span>
            <Button variant="outline" size="icon" onClick={moisSuivant}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={selectedFormateur} onValueChange={setSelectedFormateur}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tous les formateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formateurs</SelectItem>
              {formateurs.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.prenom} {f.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Chargement du planning...
          </div>
        ) : (
          <>
            {/* Récapitulatif par formateur */}
            {statsParFormateur.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {statsParFormateur.map(({ formateur, heures, jours, blocs: nb }) => (
                  <div
                    key={formateur.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedFormateur === formateur.id 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "hover:border-muted-foreground/40"
                    }`}
                    onClick={() => setSelectedFormateur(selectedFormateur === formateur.id ? "all" : formateur.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{formateur.prenom} {formateur.nom}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <strong className="text-foreground">{heures}h</strong>
                      </span>
                      <span>{jours} jour{jours > 1 ? "s" : ""}</span>
                      <span>{nb} cours</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vue calendrier par semaine */}
            {blocsFiltered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun cours planifié pour {format(moisActuel, "MMMM yyyy", { locale: fr })}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grouper les jours ouvrés par semaine */}
                {(() => {
                  // Construire les semaines
                  const semaines: Date[][] = [];
                  let semaineCourante: Date[] = [];
                  joursOuvres.forEach((jour, i) => {
                    if (i === 0) {
                      semaineCourante.push(jour);
                    } else {
                      const prev = joursOuvres[i - 1];
                      const diff = (jour.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
                      if (diff > 3) {
                        semaines.push(semaineCourante);
                        semaineCourante = [jour];
                      } else {
                        semaineCourante.push(jour);
                      }
                    }
                  });
                  if (semaineCourante.length) semaines.push(semaineCourante);

                  return semaines.map((semaine, si) => {
                    const hasCours = semaine.some(d => blocsParDate.has(format(d, "yyyy-MM-dd")));
                    if (!hasCours) return null;
                    return (
                      <div key={si} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 font-medium text-sm">
                          Semaine du {format(semaine[0], "d")} au {format(semaine[semaine.length - 1], "d MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="grid grid-cols-5 divide-x">
                          {semaine.map(jour => {
                            const key = format(jour, "yyyy-MM-dd");
                            const coursJour = blocsParDate.get(key) || [];
                            return (
                              <div key={key} className="min-h-[120px] p-2">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                                  {format(jour, "EEE d", { locale: fr })}
                                </div>
                                <div className="space-y-1">
                                  {coursJour.map(c => (
                                    <div
                                      key={c.id}
                                      className="rounded px-1.5 py-1 text-white text-[10px] leading-tight"
                                      style={{ backgroundColor: c.discipline_color || "#6366f1" }}
                                    >
                                      <div className="font-semibold truncate">{c.discipline_nom}</div>
                                      <div className="opacity-90">{c.heure_debut}–{c.heure_fin}</div>
                                      {c.formateur_nom && (
                                        <div className="opacity-80 truncate">{c.formateur_nom}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {/* Remplir les jours manquants si semaine incomplète */}
                          {semaine.length < 5 && Array.from({ length: 5 - semaine.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[120px] p-2 bg-muted/30" />
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Tableau récapitulatif détaillé */}
            {blocsFiltered.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3">Détail des cours</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left p-2 border">Date</th>
                        <th className="text-left p-2 border">Formateur</th>
                        <th className="text-left p-2 border">Matière</th>
                        <th className="text-left p-2 border">Formation</th>
                        <th className="text-left p-2 border">Horaires</th>
                        <th className="text-left p-2 border">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocsFiltered
                        .sort((a, b) => {
                          const da = getDateFromBloc(a.semaine_debut, a.jour);
                          const db = getDateFromBloc(b.semaine_debut, b.jour);
                          if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
                          return heureEnMinutes(a.heure_debut) - heureEnMinutes(b.heure_debut);
                        })
                        .map(c => {
                          const date = getDateFromBloc(c.semaine_debut, c.jour);
                          const duree = calcDuree(c.heure_debut, c.heure_fin);
                          return (
                            <tr key={c.id} className="hover:bg-muted/30 border-b">
                              <td className="p-2 border capitalize">
                                {format(date, "EEE d MMM", { locale: fr })}
                              </td>
                              <td className="p-2 border">
                                {c.formateur_nom || <span className="text-muted-foreground italic">Non assigné</span>}
                              </td>
                              <td className="p-2 border">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: c.discipline_color || "#6366f1" }}
                                  />
                                  {c.discipline_nom}
                                </span>
                              </td>
                              <td className="p-2 border text-xs text-muted-foreground">{c.formation}</td>
                              <td className="p-2 border">
                                {c.heure_debut} – {c.heure_fin}
                              </td>
                              <td className="p-2 border font-medium">{duree}h</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted font-semibold">
                        <td colSpan={5} className="p-2 border text-right">Total heures</td>
                        <td className="p-2 border">
                          {blocsFiltered.reduce((acc, b) => acc + calcDuree(b.heure_debut, b.heure_fin), 0)}h
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
