import { useState, useEffect, useMemo } from "react";
import { safeDateParse } from "@/lib/safeDateParse";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Calendar, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoFtransport from "@/assets/logo-ftransport.png";
import { ALL_DATES_EXAMEN_REUSSITE, ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT } from "@/lib/examDatesConfig";

interface ApprenantInfo {
  id: string;
  prenom: string;
  nom: string;
  type_apprenant: string | null;
  date_examen_theorique: string | null;
}

interface PlanningApprenant {
  id: string;
  prenom: string;
  nom: string;
  type_apprenant: string | null;
  date_examen_theorique: string | null;
  resultat_examen: string | null;
  resultat_examen_pratique: string | null;
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

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTH_NAMES = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const TAXI_TYPES = ["taxi", "taxi-e", "taxi-e-presentiel", "ta", "ta-e", "ta-e-presentiel", "pa-taxi", "rp-taxi"];
const VTC_TYPES = ["vtc", "vtc-e", "vtc-e-presentiel", "va", "va-e", "va-e-presentiel", "pa-vtc", "rp-vtc"];
const PA_TYPES = ["pa-vtc", "pa-taxi"];
const RP_TYPES = ["rp-vtc", "rp-taxi"];

function detectFormationType(typeApprenant: string | null): "vtc" | "taxi" {
  if (!typeApprenant) return "vtc";
  return TAXI_TYPES.includes(typeApprenant.toLowerCase()) ? "taxi" : "vtc";
}

function isVTCType(typeApprenant: string | null) {
  return !!typeApprenant && VTC_TYPES.includes(typeApprenant.toLowerCase());
}

function isTAXIType(typeApprenant: string | null) {
  return !!typeApprenant && TAXI_TYPES.includes(typeApprenant.toLowerCase());
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectPlanningExamDate(rawDate: string | null) {
  const normalizedRaw = normalizeText(rawDate);
  if (!normalizedRaw) return null;

  const match = ALL_DATES_EXAMEN_REUSSITE.find((item) => normalizedRaw.includes(normalizeText(item.date)));
  return match?.date || null;
}

function getPratiqueDateFromExam(examDate: string | null) {
  if (!examDate) return null;
  const exam = ALL_DATES_EXAMEN_REUSSITE.find((item) => item.date === examDate);
  if (!exam) return null;
  return ALL_DATES_EXAMEN_PRATIQUE_NO_ACCENT[exam.pratiqueIndex] || null;
}

function toLocalDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildFallbackPlanningDates(type: "vtc" | "taxi"): { date: Date; capacity: number }[] {
  return [];
}

function getTrainingBadgeText(type: "vtc" | "taxi") {
  return type === "vtc" ? "9h - 12h • 13h - 16h" : "9h - 17h";
}

function getTrainingSlotText(type: "vtc" | "taxi") {
  return type === "vtc"
    ? "9h00 - 12h00 • 13h00 - 16h00 • Pause 12h-13h à Confluences"
    : "9h00 - 17h00 • Pause 12h-13h à Confluences";
}

function getDaySlotText(daySlots: { matin?: string; apresmidi?: string } | undefined, type: "vtc" | "taxi") {
  if (!daySlots || (!daySlots.matin && !daySlots.apresmidi)) {
    return getTrainingSlotText(type);
  }
  const parts: string[] = [];
  if (daySlots.matin) parts.push(daySlots.matin.replace(/-/g, " - "));
  if (daySlots.apresmidi) parts.push(daySlots.apresmidi.replace(/-/g, " - "));
  return parts.join(" • ") + " • Pause 12h-13h à Confluences";
}

function getDayBadgeText(daySlots: { matin?: string; apresmidi?: string } | undefined, type: "vtc" | "taxi") {
  if (!daySlots || (!daySlots.matin && !daySlots.apresmidi)) {
    return getTrainingBadgeText(type);
  }
  const parts: string[] = [];
  if (daySlots.matin) parts.push(daySlots.matin.replace(/-/g, " - "));
  if (daySlots.apresmidi) parts.push(daySlots.apresmidi.replace(/-/g, " - "));
  return parts.join(" • ");
}

function getTrainingEmailText(type: "vtc" | "taxi") {
  return type === "vtc" ? "9h00 - 12h00 puis 13h00 - 16h00" : "9h00 - 17h00";
}

export default function ReservationPratique() {
  const [searchParams] = useSearchParams();
  const apprenantId = searchParams.get("id");
  const examParam = searchParams.get("exam");
  const pratiqueParam = searchParams.get("pratique");

  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [existingReservation, setExistingReservation] = useState<ReservationExistante | null>(null);
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<"vtc" | "taxi">("vtc");
  const [resolvedExamDate, setResolvedExamDate] = useState<string | null>(null);
  const [resolvedPratiqueDate, setResolvedPratiqueDate] = useState<string | null>(null);
  const [planningStartDate, setPlanningStartDate] = useState<string | null>(null);
  const [planningEndDate, setPlanningEndDate] = useState<string | null>(null);
  const [excludedDays, setExcludedDays] = useState<string[]>([]);
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [extraCandidats, setExtraCandidats] = useState<string[]>([]);
  const [occupiedDays, setOccupiedDays] = useState<string[]>([]);
  const [allApprenants, setAllApprenants] = useState<PlanningApprenant[]>([]);
  const [examApprenants, setExamApprenants] = useState<PlanningApprenant[]>([]);
  const [maxPerDayMap, setMaxPerDayMap] = useState<Record<string, number>>({});
  const [dayTimeSlots, setDayTimeSlots] = useState<Record<string, { matin?: string; apresmidi?: string }>>({});
  const [deplacesIds, setDeplacesIds] = useState<string[]>([]);
  const [dejaFormesIds, setDejaFormesIds] = useState<string[]>([]);

  const type = detectedType;
  const isVTC = type === "vtc";

  useEffect(() => {
    async function load() {
      if (!apprenantId) {
        setError("Lien invalide. Contactez Ftransport.");
        setLoading(false);
        return;
      }

      try {
        // Use edge function with service_role to bypass RLS on public page
        const { data: loadResult, error: loadErr } = await supabase.functions.invoke(
          "confirm-reservation-pratique",
          { body: { mode: "load", apprenantId, examDate: examParam, pratiqueDate: pratiqueParam } }
        );

        if (loadErr || !loadResult?.apprenant) {
          setError("Apprenant non trouvé. Contactez Ftransport.");
          setLoading(false);
          return;
        }

        const appData = loadResult.apprenant;
        const existingRes = loadResult.existingReservation;
        const allRes = loadResult.allReservations || [];

        setApprenant(appData);
        setExistingReservation(existingRes || null);

        const correctType = detectFormationType(appData.type_apprenant);
        setDetectedType(correctType);

        const counts: Record<string, number> = {};
        (allRes || [])
          .filter((reservation) => reservation.type_formation?.toLowerCase() === correctType)
          .forEach((reservation) => {
            counts[reservation.date_choisie] = (counts[reservation.date_choisie] || 0) + 1;
          });
        setReservationCounts(counts);

        const inferredExamDate = loadResult.resolvedExamDate || examParam || detectPlanningExamDate(appData.date_examen_theorique);

        setResolvedExamDate(inferredExamDate);

        if (inferredExamDate) {
          const config = loadResult.config;

          setResolvedPratiqueDate(config?.date_pratique || pratiqueParam || getPratiqueDateFromExam(inferredExamDate));

          if (config) {
            setPlanningStartDate(config.planning_start_date);
            setPlanningEndDate(config.planning_end_date);
            setExcludedDays(config.excluded_days || []);
            setExtraDays(config.extra_days || []);
            setExtraCandidats(config.extra_candidats || []);
            setMaxPerDayMap(config.max_per_day_map || {});
            // Parse day_time_slots - handle both new {matin,apresmidi} and legacy string format
            const rawSlots = config.day_time_slots || {};
            const parsedSlots: Record<string, { matin?: string; apresmidi?: string }> = {};
            Object.entries(rawSlots).forEach(([k, v]) => {
              if (typeof v === 'string') {
                parsedSlots[k] = { matin: v };
              } else if (v && typeof v === 'object') {
                parsedSlots[k] = v as { matin?: string; apresmidi?: string };
              }
            });
            setDayTimeSlots(parsedSlots);

            setAllApprenants((loadResult.allApprenants || []) as PlanningApprenant[]);
            setExamApprenants((loadResult.examApprenants || []) as PlanningApprenant[]);
            setDeplacesIds(
              [...new Set([
                ...((loadResult.deplacesSession || []).map((item: any) => item.apprenant_id as string)),
                ...((loadResult.deplacesApprenants || []).map((item: any) => item.id as string)),
              ])] as string[]
            );
            setDejaFormesIds(
              [...new Set((loadResult.dejaFormes || []).map((item: any) => item.apprenant_id as string))] as string[]
            );

            const occupied = new Set<string>();
            (loadResult.existingSessions || []).forEach((session: any) => {
              const start = new Date(session.date_debut + "T00:00:00");
              const end = new Date(session.date_fin + "T00:00:00");
              let current = new Date(start);

              while (current <= end) {
                if (current.getDay() !== 0 && current.getDay() !== 6) {
                  occupied.add(toLocalDateKey(current));
                }
                current.setDate(current.getDate() + 1);
              }
            });

            setOccupiedDays([...occupied]);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les dates du calendrier. Contactez Ftransport.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [apprenantId, examParam, pratiqueParam]);

  const planningDates = useMemo(() => {
    if (!planningStartDate || !planningEndDate || !resolvedExamDate) {
      return buildFallbackPlanningDates(type);
    }

    const dejaFormesSet = new Set(dejaFormesIds);

    const reussisFormation = examApprenants.filter(
      (a) => a.resultat_examen === "oui" && !RP_TYPES.includes((a.type_apprenant || "").toLowerCase()) && !dejaFormesSet.has(a.id)
    );

    const paFormation = allApprenants.filter(
      (a) =>
        PA_TYPES.includes((a.type_apprenant || "").toLowerCase()) &&
        a.date_examen_theorique?.includes(resolvedExamDate) &&
        a.resultat_examen === "oui" &&
        !reussisFormation.some((r) => r.id === a.id) &&
        !dejaFormesSet.has(a.id)
    );

    const deplacesFormation = allApprenants.filter(
      (a) =>
        deplacesIds.includes(a.id) &&
        !reussisFormation.some((r) => r.id === a.id) &&
        !paFormation.some((r) => r.id === a.id) &&
        !dejaFormesSet.has(a.id)
    );

    const echouesPratiqueFormation = allApprenants.filter(
      (a) =>
        a.resultat_examen_pratique === "non" &&
        !reussisFormation.some((r) => r.id === a.id) &&
        !paFormation.some((r) => r.id === a.id) &&
        !deplacesFormation.some((r) => r.id === a.id) &&
        !dejaFormesSet.has(a.id)
    );

    const extraFormation = allApprenants.filter(
      (a) =>
        extraCandidats.includes(a.id) &&
        !reussisFormation.some((r) => r.id === a.id) &&
        !paFormation.some((r) => r.id === a.id) &&
        !deplacesFormation.some((r) => r.id === a.id) &&
        !echouesPratiqueFormation.some((r) => r.id === a.id) &&
        !dejaFormesSet.has(a.id)
    );

    const tousPlanning = [
      ...reussisFormation,
      ...paFormation,
      ...deplacesFormation,
      ...echouesPratiqueFormation,
      ...extraFormation,
    ];

    const totalVTC = tousPlanning.filter((a) => isVTCType(a.type_apprenant)).length;
    const totalTAXI = tousPlanning.filter((a) => isTAXIType(a.type_apprenant)).length;

    const weekdays: Date[] = [];
    const occupiedSet = new Set(occupiedDays);
    const start = new Date(planningStartDate + "T00:00:00");
    const end = new Date(planningEndDate + "T00:00:00");
    let current = new Date(start);

    while (current <= end) {
      const key = toLocalDateKey(current);
      if (current.getDay() !== 0 && current.getDay() !== 6 && !excludedDays.includes(key) && !occupiedSet.has(key)) {
        weekdays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (weekdays.length === 0) {
      current = new Date(start);
      while (current <= end) {
        const key = toLocalDateKey(current);
        if (current.getDay() !== 0 && current.getDay() !== 6 && !excludedDays.includes(key)) {
          weekdays.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }

    extraDays.forEach((dayKey) => {
      if (!weekdays.some((date) => toLocalDateKey(date) === dayKey) && !excludedDays.includes(dayKey)) {
        weekdays.push(new Date(dayKey + "T00:00:00"));
      }
    });

    weekdays.sort((a, b) => a.getTime() - b.getTime());

    const vtcDaysNeeded = Math.ceil(totalVTC / 3);
    const taxiDaysNeeded = Math.ceil(totalTAXI / 3);
    const dayTypeMap: Record<string, "vtc" | "taxi" | "libre"> = {};

    weekdays.forEach((date, index) => {
      const key = toLocalDateKey(date);
      if (index < vtcDaysNeeded) {
        dayTypeMap[key] = "vtc";
      } else if (index < vtcDaysNeeded + taxiDaysNeeded) {
        dayTypeMap[key] = "taxi";
      } else {
        dayTypeMap[key] = "libre";
      }
    });

    return weekdays
      .filter((date) => dayTypeMap[toLocalDateKey(date)] === type)
      .map((date) => {
        const key = toLocalDateKey(date);
        const capacity = maxPerDayMap[key] != null ? Number(maxPerDayMap[key]) : 3;
        return { date, capacity };
      });
  }, [
    type,
    planningStartDate,
    planningEndDate,
    resolvedExamDate,
    examApprenants,
    allApprenants,
    deplacesIds,
    dejaFormesIds,
    extraCandidats,
    excludedDays,
    extraDays,
    occupiedDays,
    maxPerDayMap,
  ]);

  const dateSlots: DateSlot[] = useMemo(() => {
    return planningDates.map((d) => {
      const key = toLocalDateKey(d.date);
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

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("confirm-reservation-pratique", {
        body: {
          apprenantId,
          selectedDate,
          type,
          isModification: !!existingReservation,
        },
      });

      if (fnErr) {
        setError("Erreur lors de la réservation. Veuillez réessayer.");
        setSubmitting(false);
        return;
      }
    } catch (err) {
      setError("Erreur lors de la réservation. Veuillez réessayer.");
      setSubmitting(false);
      return;
    }

    setConfirmed(true);
    setSubmitting(false);
  };

  const handleModifyConfirm = async () => {
    await handleConfirm();
    if (selectedDate && !error) {
      setExistingReservation({ date_choisie: selectedDate });
      setModifying(false);
      setSelectedDate(null);
    }
  };

  const formatDate = (d: Date) => {
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
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
            <p className="text-sm text-muted-foreground">📞 04.28.29.60.91 — 📧 contact@ftransport.fr</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingReservation && !modifying) {
    const resDate = safeDateParse(existingReservation.date_choisie);
    const hasAvailableSlots = dateSlots.some((s) => s.remaining > 0 && toLocalDateKey(s.date) !== existingReservation.date_choisie);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Réservation effectuée</h2>
            <p className="text-muted-foreground">{apprenant?.prenom}, vous avez réservé votre date de formation pratique :</p>
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-lg font-bold text-primary">{formatDate(resDate)}</p>
              <p className="text-sm text-muted-foreground">{getTrainingBadgeText(type)}</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📍 86 Route de Genas 69003 Lyon</p>
            </div>
            {hasAvailableSlots && (
              <Button
                variant="outline"
                onClick={() => setModifying(true)}
                className="mt-2"
              >
                Modifier ma date
              </Button>
            )}
            {!hasAvailableSlots && (
              <p className="text-xs text-muted-foreground">Aucune autre date disponible pour modifier votre réservation.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed && selectedDate) {
    const confDate = safeDateParse(selectedDate);
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
            <p className="text-muted-foreground">{apprenant?.prenom}, votre date de formation pratique {isVTC ? "VTC" : "TAXI"} est :</p>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6">
              <p className="text-2xl font-bold text-primary">{formatDate(confDate)}</p>
              <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {getTrainingBadgeText(type)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Lyon 3e</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left text-sm space-y-2">
               <p className="font-semibold text-amber-800">⚠️ Rappels importants :</p>
               <ul className="list-disc pl-5 text-amber-700 space-y-1">
                 <li>Vous ne pouvez choisir qu'<strong>UNE SEULE date</strong> (modifiable si des places restent disponibles)</li>
                 <li>Vous recevrez un <strong>email de confirmation</strong> après votre choix</li>
                 <li>Pause déjeuner à Confluences (12h-13h)</li>
                {isVTC ? (
                  <li>Révisez : <a href="https://app.formative.com/join/DNFDZS" className="underline text-primary" target="_blank" rel="noreferrer">Formation Pratique VTC</a></li>
                ) : (
                  <li>Révisez : <a href="https://app.formative.com/join/ZT924H" className="underline text-primary" target="_blank" rel="noreferrer">Formation Pratique TAXI</a></li>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className={`${isVTC ? "bg-blue-600" : "bg-amber-600"} text-white`}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={logoFtransport} alt="Ftransport" className="h-12 bg-white rounded-lg p-1" />
            <div>
              <h1 className="text-xl font-bold">Formation Pratique {isVTC ? "VTC" : "TAXI"}</h1>
              <p className="text-sm opacity-90">Choisissez votre date d'entraînement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Bonjour {apprenant?.prenom} 👋</h2>
            <p className="text-muted-foreground text-sm">
              {modifying ? (
                <>Vous modifiez votre réservation. Votre date actuelle : <strong>{formatDate(safeDateParse(existingReservation!.date_choisie))}</strong>. Choisissez une nouvelle date ci-dessous.</>
              ) : (
                <>Félicitations pour votre réussite à l'épreuve d'admissibilité ! Choisissez ci-dessous <strong>une seule journée</strong> d'entraînement pratique.</>
              )}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-3">
              <p className="font-semibold text-amber-800">⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date.</p>

              <div className="text-amber-700 space-y-2">
                <p>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.</p>
                {isVTC ? (
                  <>
                    <p>Notamment les exercices suivants dans <strong>"Formation Pratique VTC"</strong> : Quizz Lyon et Questions à apprendre.</p>
                    <p>Ou cliquez sur le lien suivant : <a href="https://app.formative.com/join/DNFDZS" target="_blank" rel="noopener noreferrer" className="underline text-primary font-medium">https://app.formative.com/join/DNFDZS</a></p>
                  </>
                ) : (
                  <>
                    <p>Notamment les exercices suivants dans <strong>"Formation Pratique TAXI"</strong> : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre.</p>
                    <p>Ou cliquez ici : <a href="https://app.formative.com/join/ZT924H" target="_blank" rel="noopener noreferrer" className="underline text-primary font-medium">https://app.formative.com/join/ZT924H</a></p>
                  </>
                )}
                <p className="font-semibold">⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.</p>
                <p>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.</p>
                <p className="font-semibold">📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {getTrainingBadgeText(type)}</Badge>
              <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> 86 Route de Genas, 69003 Lyon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates disponibles
            </h3>
            <div className="grid gap-3">
              {dateSlots.map((slot) => {
                const key = toLocalDateKey(slot.date);
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
                        ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                        : isSelected
                          ? `${isVTC ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-amber-500 bg-amber-50 ring-2 ring-amber-200"}`
                          : "border-border hover:border-primary/50 hover:shadow-md cursor-pointer bg-background"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${isSelected ? (isVTC ? "text-blue-700" : "text-amber-700") : ""}`}>
                          {formatDate(slot.date)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{getDaySlotText(dayTimeSlots[key], type)}</p>
                      </div>
                      <div className="text-right">
                        {isFull ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">Complet</Badge>
                        ) : (
                          <Badge variant={isSelected ? "default" : "outline"} className={isSelected ? (isVTC ? "bg-blue-600" : "bg-amber-600") : ""}>
                            {slot.remaining} place{slot.remaining > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`mt-2 pt-2 border-t text-xs ${isVTC ? "text-blue-600 border-blue-200" : "text-amber-600 border-amber-200"}`}>
                        ✓ Date sélectionnée
                      </div>
                    )}
                  </button>
                );
              })}

              {dateSlots.length === 0 && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Aucune date n'est disponible pour le moment sur ce calendrier.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <Card className="border-amber-300 bg-amber-50/50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                   <p className="font-semibold text-amber-800">Attention — Confirmation</p>
                   <p className="text-amber-700">
                     Un <strong>email de confirmation</strong> vous sera envoyé. Vous pourrez modifier votre date si des places restent disponibles.
                   </p>
                </div>
              </div>
              <Button
                onClick={modifying ? handleModifyConfirm : handleConfirm}
                disabled={submitting}
                className={`w-full text-lg py-6 ${isVTC ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}`}
              >
                {submitting ? "Réservation en cours..." : `${modifying ? "Modifier pour" : "Confirmer"} le ${formatDate(safeDateParse(selectedDate))}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {modifying && (
          <div className="text-center">
            <Button variant="ghost" onClick={() => { setModifying(false); setSelectedDate(null); }}>
              ← Annuler la modification
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pb-6 space-y-1">
          <p>FTRANSPORT — Centre de formation</p>
          <p>86 Route de Genas 69003 Lyon • 📞 04.28.29.60.91</p>
        </div>
      </div>
    </div>
  );
}
