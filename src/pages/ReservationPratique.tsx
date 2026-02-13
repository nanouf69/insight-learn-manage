import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Calendar, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoFtransport from "@/assets/logo-ftransport.png";

interface ApprenantInfo {
  id: string;
  prenom: string;
  nom: string;
  type_apprenant: string | null;
}

interface ReservationExistante {
  date_choisie: string;
}

interface DateSlot {
  date: Date;
  capacity: number;
  reserved: number;
  remaining: number;
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function generatePlanningDates(type: 'vtc' | 'taxi'): { date: Date; capacity: number }[] {
  const start = new Date(2026, 1, 16); // Feb 16, 2026
  const end = new Date(2026, 2, 7);    // March 7
  const allWeekdays: Date[] = [];
  let current = new Date(start);
  while (current < end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      allWeekdays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  if (type === 'vtc') {
    // VTC: first days, 4/day except Tue Feb 17 = 5
    // Show enough days to cover potential VTC candidates (up to ~6 days)
    const vtcDays: { date: Date; capacity: number }[] = [];
    for (let i = 0; i < Math.min(7, allWeekdays.length); i++) {
      const d = allWeekdays[i];
      const isTueFeb17 = d.getDay() === 2 && d.getDate() === 17 && d.getMonth() === 1;
      vtcDays.push({ date: d, capacity: isTueFeb17 ? 5 : 4 });
    }
    return vtcDays;
  } else {
    // TAXI: starts from Feb 25, 4/day
    const taxiStartIdx = allWeekdays.findIndex(d => d.getDate() === 25 && d.getMonth() === 1);
    const startIdx = taxiStartIdx >= 0 ? taxiStartIdx : 7;
    const taxiDays: { date: Date; capacity: number }[] = [];
    for (let i = startIdx; i < allWeekdays.length; i++) {
      taxiDays.push({ date: allWeekdays[i], capacity: 4 });
    }
    return taxiDays;
  }
}

export default function ReservationPratique() {
  const [searchParams] = useSearchParams();
  const apprenantId = searchParams.get("id");
  const typeParam = searchParams.get("type")?.toLowerCase() as 'vtc' | 'taxi' | null;

  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [existingReservation, setExistingReservation] = useState<ReservationExistante | null>(null);
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = typeParam || 'vtc';
  const isVTC = type === 'vtc';

  // Fetch apprenant info and existing reservations
  useEffect(() => {
    async function load() {
      if (!apprenantId) {
        setError("Lien invalide. Contactez Ftransport.");
        setLoading(false);
        return;
      }

      // Fetch apprenant
      const { data: appData, error: appErr } = await supabase
        .from("apprenants")
        .select("id, prenom, nom, type_apprenant")
        .eq("id", apprenantId)
        .single();

      if (appErr || !appData) {
        setError("Apprenant non trouvé. Contactez Ftransport.");
        setLoading(false);
        return;
      }
      setApprenant(appData);

      // Check existing reservation
      const { data: existingRes } = await supabase
        .from("reservations_pratique")
        .select("date_choisie")
        .eq("apprenant_id", apprenantId)
        .maybeSingle();

      if (existingRes) {
        setExistingReservation(existingRes);
      }

      // Count reservations per date for this type
      const { data: allRes } = await supabase
        .from("reservations_pratique")
        .select("date_choisie")
        .eq("type_formation", type);

      const counts: Record<string, number> = {};
      (allRes || []).forEach(r => {
        counts[r.date_choisie] = (counts[r.date_choisie] || 0) + 1;
      });
      setReservationCounts(counts);
      setLoading(false);
    }
    load();
  }, [apprenantId, type]);

  const planningDates = useMemo(() => generatePlanningDates(type), [type]);

  const dateSlots: DateSlot[] = useMemo(() => {
    return planningDates.map(d => {
      const key = d.date.toISOString().slice(0, 10);
      const reserved = reservationCounts[key] || 0;
      return {
        date: d.date,
        capacity: d.capacity,
        reserved,
        remaining: Math.max(0, d.capacity - reserved),
      };
    });
  }, [planningDates, reservationCounts]);

  const handleConfirm = async () => {
    if (!selectedDate || !apprenantId) return;
    setSubmitting(true);

    const { error: insertErr } = await supabase
      .from("reservations_pratique")
      .insert({
        apprenant_id: apprenantId,
        date_choisie: selectedDate,
        type_formation: type,
      });

    if (insertErr) {
      if (insertErr.message.includes("unique")) {
        setError("Vous avez déjà réservé une date. Contactez Ftransport pour toute modification.");
      } else {
        setError("Erreur lors de la réservation. Veuillez réessayer.");
      }
      setSubmitting(false);
      return;
    }

    // Update apprenant's date_examen_pratique
    await supabase
      .from("apprenants")
      .update({ date_examen_pratique: selectedDate })
      .eq("id", apprenantId);

    setConfirmed(true);
    setSubmitting(false);
  };

  const formatDate = (d: Date) => {
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} 2026`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-destructive">Erreur</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">
              📞 04.28.29.60.91 — 📧 contact@ftransport.fr
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already has a reservation
  if (existingReservation) {
    const resDate = new Date(existingReservation.date_choisie + 'T00:00:00');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Réservation déjà effectuée</h2>
            <p className="text-muted-foreground">
              {apprenant?.prenom}, vous avez déjà réservé votre date de formation pratique :
            </p>
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-lg font-bold text-primary">{formatDate(resDate)}</p>
              <p className="text-sm text-muted-foreground">de 9h à 17h</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📍 86 Route de Genas 69003 Lyon</p>
              <p>Aucune modification possible. Contactez Ftransport si besoin.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmed state
  if (confirmed && selectedDate) {
    const confDate = new Date(selectedDate + 'T00:00:00');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardContent className="pt-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-emerald-100 animate-ping opacity-30"></div>
              </div>
              <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto relative z-10" />
            </div>
            <h1 className="text-2xl font-bold">Réservation confirmée !</h1>
            <p className="text-muted-foreground">
              {apprenant?.prenom}, votre date de formation pratique {isVTC ? 'VTC' : 'TAXI'} est :
            </p>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
              <p className="text-2xl font-bold text-primary">{formatDate(confDate)}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 9h - 17h</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Lyon 3e</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm space-y-2">
              <p className="font-semibold text-amber-800">⚠️ Rappels importants :</p>
              <ul className="list-disc pl-5 text-amber-700 space-y-1">
                <li>Ce créneau <strong>ne pourra pas être modifié</strong></li>
                <li>Vous ne recevrez <strong>aucune confirmation</strong> supplémentaire</li>
                <li>Pause déjeuner à Confluences (12h-13h)</li>
                {isVTC ? (
                  <li>Révisez : <a href="https://app.formative.com/join/DNFDZS" className="underline text-primary" target="_blank">Formation Pratique VTC</a></li>
                ) : (
                  <li>Révisez : <a href="https://app.formative.com/join/ZT924H" className="underline text-primary" target="_blank">Formation Pratique TAXI</a></li>
                )}
              </ul>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>📍 86 Route de Genas, 69003 Lyon</p>
              <p>📞 04.28.29.60.91</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main booking view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className={`${isVTC ? 'bg-blue-600' : 'bg-amber-600'} text-white`}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={logoFtransport} alt="Ftransport" className="h-12 bg-white rounded-lg p-1" />
            <div>
              <h1 className="text-xl font-bold">Formation Pratique {isVTC ? 'VTC' : 'TAXI'}</h1>
              <p className="text-sm opacity-90">Choisissez votre date d'entraînement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">
              Bonjour {apprenant?.prenom} 👋
            </h2>
            <p className="text-muted-foreground text-sm">
              Félicitations pour votre réussite à l'épreuve d'admissibilité ! 
              Choisissez ci-dessous <strong>une seule journée</strong> d'entraînement pratique.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> 9h - 17h</Badge>
              <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> 86 Route de Genas, Lyon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Date selection */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates disponibles
            </h3>
            <div className="grid gap-3">
              {dateSlots.map(slot => {
                const key = slot.date.toISOString().slice(0, 10);
                const isFull = slot.remaining <= 0;
                const isSelected = selectedDate === key;

                return (
                  <button
                    key={key}
                    disabled={isFull}
                    onClick={() => setSelectedDate(isSelected ? null : key)}
                    className={`
                      w-full text-left rounded-xl border-2 p-4 transition-all
                      ${isFull 
                        ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed' 
                        : isSelected 
                          ? `${isVTC ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'}` 
                          : 'border-border hover:border-primary/50 hover:shadow-md cursor-pointer bg-background'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${isSelected ? (isVTC ? 'text-blue-700' : 'text-amber-700') : ''}`}>
                          {formatDate(slot.date)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">9h00 - 17h00 • Pause 12h-13h à Confluences</p>
                      </div>
                      <div className="text-right">
                        {isFull ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">Complet</Badge>
                        ) : (
                          <Badge variant={isSelected ? "default" : "outline"} className={isSelected ? (isVTC ? 'bg-blue-600' : 'bg-amber-600') : ''}>
                            {slot.remaining} place{slot.remaining > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`mt-2 pt-2 border-t text-xs ${isVTC ? 'text-blue-600 border-blue-200' : 'text-amber-600 border-amber-200'}`}>
                        ✓ Date sélectionnée
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Warning + Confirm */}
        {selectedDate && (
          <Card className="border-amber-300 bg-amber-50/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-amber-800">Attention — Choix définitif</p>
                  <p className="text-amber-700">
                    Tout créneau choisi <strong>ne pourra pas être modifié</strong> et vous ne recevrez <strong>aucune confirmation</strong>.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={submitting}
                className={`w-full text-lg py-6 ${isVTC ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {submitting ? "Réservation en cours..." : `Confirmer le ${formatDate(new Date(selectedDate + 'T00:00:00'))}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-6 space-y-1">
          <p>FTRANSPORT — Centre de formation</p>
          <p>86 Route de Genas 69003 Lyon • 📞 04.28.29.60.91</p>
        </div>
      </div>
    </div>
  );
}
