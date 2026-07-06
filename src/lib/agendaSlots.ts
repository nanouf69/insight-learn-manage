import { supabase } from "@/integrations/supabase/client";

export type CreneauKey = "matin" | "apres_midi" | "soir" | "soir_1" | "soir_2";

export interface AgendaBloc {
  jour: number;          // 0 = lundi
  heure_debut: string;   // "HH:mm"
  heure_fin: string;     // "HH:mm"
  formation: string;
  semaine_debut: string; // "YYYY-MM-DD"
}

const timeToMin = (t: string) => {
  const [h, m] = (t || "0:0").split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
};

const isEveningCreneau = (creneau: CreneauKey) => creneau === "soir" || creneau === "soir_1" || creneau === "soir_2";

const isEveningText = (value?: string | null): boolean => {
  const v = (value || "").toLowerCase();
  if (/soir/.test(v) || /vtc-s|cours-du-soir/.test(v)) return true;
  const m = v.match(/(\d{1,2})\s*[h:]/);
  if (m) {
    const h = parseInt(m[1], 10);
    if (!isNaN(h) && h >= 17) return true;
  }
  return false;
};

const splitEveningCreneau = (now: Date = new Date()): CreneauKey => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin < 18 * 60 + 30 ? "soir_1" : "soir_2";
};

const isCreneauDue = (iso: string, creneau: CreneauKey, todayISO: string, nowMin: number) => {
  if (iso < todayISO) return true;
  if (iso > todayISO) return false;
  switch (creneau) {
    case "matin": return nowMin >= 8 * 60 + 30;
    case "apres_midi": return nowMin >= 12 * 60 + 30;
    case "soir":
    case "soir_1": return nowMin >= 17 * 60;
    case "soir_2": return nowMin >= 18 * 60 + 30;
  }
};

// Lundi = 0, Mardi = 1, … Dimanche = 6 (cohérent avec agenda_blocs.jour)
const todayDow = (d = new Date()) => {
  const js = d.getDay(); // 0 = Sunday
  return js === 0 ? 6 : js - 1;
};

const startOfWeek = (d: Date) => {
  const dow = todayDow(d);
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatISO = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Détermine si une formation_choisie correspond à une formation présentielle
 * (i.e. l'apprenant a réellement des cours sur place).
 */
export const isPresentielType = (
  type_apprenant?: string | null,
  formation_choisie?: string | null,
  creneau_horaire?: string | null,
): boolean => {
  const t = (type_apprenant || "").toLowerCase().trim();
  const f = (formation_choisie || "").toLowerCase().trim();
  const c = (creneau_horaire || "").toLowerCase().trim();
  const value = `${t} ${f}`;

  // Si le créneau CRM indique explicitement une formation en ligne,
  // l'apprenant ne doit jamais être bloqué par l'émargement présentiel.
  if (/en[-\s]?ligne|e[-\s]?learning|online|distanciel/.test(c)) return false;

  // 1. Les slugs e-learning purs (suffixe "-e" non suivi de "-presentiel") ne sont JAMAIS présentiels.
  //    Ex: "vtc-e", "taxi-e", "ta-e", "va-e" → e-learning pur, pas de signature.
  const isPureElearning = /(^|\s)(vtc|taxi|ta|va)-e(\s|$)/.test(value)
    && !/-e-pr[eé]sentiel/.test(value);
  if (isPureElearning) return false;

  // 2. Sinon : présentiel si mention explicite "présentiel" ou type CRM présentiel
  //    (vtc, taxi, ta, va, pa-*, rp-*, continue-*, *-e-presentiel)
  return /pr[eé]sentiel/.test(value)
    || /\b(vtc|taxi|ta|va)(-exam)?\b/.test(t)
    || /^(pa|rp|continue)[\s-]/.test(t);
};

/**
 * Détecte si une session est un cours du soir, à partir de son nom
 * et de son tableau `creneaux`.
 */
const isEveningSession = (
  session: { nom?: string | null; creneaux?: string[] | null } | null | undefined,
): boolean => {
  if (!session) return false;
  if (isEveningText(session.nom)) return true;
  const cren = Array.isArray(session.creneaux) ? session.creneaux : [];
  return cren.some((c) => isEveningText(c));
};

/**
 * Récupère les blocs agenda d'aujourd'hui qui correspondent à la formation de l'apprenant.
 * On filtre côté client par mot-clé (TAXI / VTC / TA / VA) car la chaîne `formation`
 * dans agenda_blocs n'est pas un slug strict.
 *
 * Si `apprenantId` est fourni, on filtre AUSSI par le profil de la session active
 * (cours du jour vs cours du soir) afin d'éviter qu'un apprenant inscrit en session
 * de jour ne soit poussé à signer un créneau du soir (et inversement).
 */
export const getTodayAgendaBlocs = async (
  formationChoisie: string | null | undefined,
  apprenantId?: string | null,
): Promise<AgendaBloc[]> => {
  const now = new Date();
  const weekStart = formatISO(startOfWeek(now));
  const dow = todayDow(now);
  const todayISOStr = formatISO(now);

  const blocsPromise = supabase
    .from("agenda_blocs")
    .select("jour, heure_debut, heure_fin, formation, semaine_debut, publics_cibles" as any)
    .eq("semaine_debut", weekStart)
    .eq("jour", dow);

  // Détecte la session active de l'apprenant (couvrant aujourd'hui).
  const sessionPromise = apprenantId
    ? supabase
        .from("session_apprenants")
        .select("session_id, sessions:session_id(nom, creneaux, date_debut, date_fin)" as any)
        .eq("apprenant_id", apprenantId)
    : (Promise.resolve({ data: null, error: null }) as any);

  const [blocsRes, sessionRes] = await Promise.all([blocsPromise, sessionPromise]);
  if (blocsRes.error || !blocsRes.data) return [];
  const data = blocsRes.data;

  let activeSession: { nom?: string | null; creneaux?: string[] | null } | null = null;
  const sessRows = (sessionRes as any)?.data as any[] | null;
  if (Array.isArray(sessRows)) {
    for (const row of sessRows) {
      const s = row?.sessions;
      if (!s) continue;
      const debut = s.date_debut as string | undefined;
      const fin = s.date_fin as string | undefined;
      if (debut && fin && todayISOStr >= debut && todayISOStr <= fin) {
        activeSession = s;
        break;
      }
    }
  }
  const hasActiveSession = !!activeSession;
  const wantEvening = isEveningSession(activeSession);

  const fLower = (formationChoisie || "").toLowerCase();
  // Détecter le public de l'apprenant à partir de formation_choisie
  const wantTaxi = /taxi/.test(fLower) && !/passerelle/.test(fLower);
  const wantVtc = /vtc/.test(fLower) && !/passerelle/.test(fLower);
  const wantTa = /\bta\b|passerelle\s*-?\s*ta(?!xi)|passerelle-taxi/.test(fLower);
  const wantVa = /\bva\b|passerelle\s*-?\s*va|passerelle-vtc/.test(fLower);

  const apprenantPublics: string[] = [];
  if (wantTaxi) apprenantPublics.push("TAXI");
  if (wantVtc) apprenantPublics.push("VTC");
  if (wantTa) apprenantPublics.push("TA");
  if (wantVa) apprenantPublics.push("VA");

  return (data as any[]).filter((bloc) => {
    // Filtrage jour/soir selon la session active (priorité absolue)
    if (hasActiveSession) {
      const startMin = timeToMin(bloc.heure_debut);
      const isEveningBloc = startMin >= 17 * 60;
      if (wantEvening && !isEveningBloc) return false;
      if (!wantEvening && isEveningBloc) return false;
    }

    const cibles: string[] = Array.isArray(bloc.publics_cibles) ? bloc.publics_cibles : [];

    // Nouveau système : si publics_cibles renseigné → matching strict
    if (cibles.length > 0) {
      return apprenantPublics.some((p) => cibles.includes(p));
    }

    // Fallback legacy : matching par mot-clé sur le champ formation
    const bf = (bloc.formation || "").toLowerCase();
    if (wantTaxi && /taxi/.test(bf)) return true;
    if (wantVtc && /vtc/.test(bf)) return true;
    if (wantTa && /\bta\b/.test(bf)) return true;
    if (wantVa && /\bva\b/.test(bf)) return true;
    if (apprenantPublics.length === 0) return true;
    return false;
  }) as AgendaBloc[];
};

/**
 * Détermine le créneau (matin/apres_midi/soir) en cours selon l'heure courante
 * ET les horaires des blocs agenda du jour.
 *
 * Horaires officiels :
 *  - matin       : 09h00 — 12h00 (bloc qui commence avant 12h)
 *  - apres_midi  : 13h00 — 16h00 (bloc qui commence entre 12h et 17h)
  *  - soir_1      : 17h00 — 18h30
  *  - soir_2      : 18h30 — 21h00
 *
 * Renvoie null si aucun cours présentiel n'est prévu aujourd'hui.
 */
export const getCurrentCreneau = (
  blocs: AgendaBloc[],
  now: Date = new Date(),
): CreneauKey | null => {
  if (!blocs || blocs.length === 0) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // On considère qu'un créneau est "actif" entre son heure de début (-30 min)
  // et son heure de fin (+15 min) pour permettre d'émarger un peu avant/après.
  const TOL_BEFORE = 30;
  const TOL_AFTER = 15;

  const classify = (startMin: number): CreneauKey => {
    if (startMin < 12 * 60) return "matin";
    if (startMin < 17 * 60) return "apres_midi";
    return splitEveningCreneau(now);
  };

  // 1. Bloc actuellement en cours (avec tolérance) → priorité
  const active = blocs.find((b) => {
    const s = timeToMin(b.heure_debut);
    const e = timeToMin(b.heure_fin);
    return nowMin >= s - TOL_BEFORE && nowMin <= e + TOL_AFTER;
  });
  if (active) return classify(timeToMin(active.heure_debut));

  // 2. Sinon, fallback : créneau qui correspond à l'heure courante
  if (nowMin < 12 * 60) {
    if (blocs.some((b) => timeToMin(b.heure_debut) < 12 * 60)) return "matin";
  }
  if (nowMin < 17 * 60) {
    if (blocs.some((b) => {
      const s = timeToMin(b.heure_debut);
      return s >= 12 * 60 && s < 17 * 60;
    })) return "apres_midi";
  }
  if (blocs.some((b) => timeToMin(b.heure_debut) >= 17 * 60)) return splitEveningCreneau(now);

  return null;
};


export const creneauLabel = (k: CreneauKey): string => {
  switch (k) {
    case "matin": return "Matin";
    case "apres_midi": return "Après-midi";
    case "soir": return "Soir";
    case "soir_1": return "Soir 1";
    case "soir_2": return "Soir 2";
  }
};

export const creneauHoraire = (k: CreneauKey): string => {
  switch (k) {
    case "matin": return "09h00 — 12h00";
    case "apres_midi": return "13h00 — 16h00";
    case "soir": return "17h00 — 21h00";
    case "soir_1": return "17h00 — 18h30";
    case "soir_2": return "18h30 — 21h00";
  }
};

/**
 * Calcule la liste ordonnée des créneaux d'émargement attendus entre `startDate` et `endDate`
 * (inclus) pour un apprenant donné. Renvoie une liste `[{ date: "YYYY-MM-DD", creneau }]`
 * triée chronologiquement.
 *
 * - FC : matin + après-midi du lundi au vendredi.
 * - Présentiel : créneaux standards matin + après-midi sur les jours ouvrés
 *   compris entre les dates de début/fin de formation. L'agenda ne bloque pas
 *   l'émargement apprenant : la sécurité serveur vérifie seulement la période.
 *
 * Borne max : 90 jours en arrière pour limiter la charge.
 */
export const getExpectedEmargements = async (params: {
  mode: "fc" | "presentiel";
  formationChoisie?: string | null;
  creneauHoraire?: string | null;
  typeApprenant?: string | null;
  apprenantId?: string | null;
  startDate: Date;
  endDate: Date;
}): Promise<Array<{ date: string; creneau: CreneauKey }>> => {
  const { mode, startDate, endDate, apprenantId } = params;

  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  if (end < start) return [];

  const MAX_LOOKBACK_DAYS = 90;
  const earliest = new Date(end);
  earliest.setDate(end.getDate() - MAX_LOOKBACK_DAYS);
  const effectiveStart = start < earliest ? earliest : start;

  // Détection cours du soir : formation_choisie, creneau_horaire OU type_apprenant
  let wantEvening =
    isEveningText(params.formationChoisie) ||
    isEveningText(params.creneauHoraire) ||
    isEveningText(params.typeApprenant);

  if (apprenantId) {
    const startISO = formatISO(effectiveStart);
    const endISO = formatISO(end);
    const { data: sessionRows } = await supabase
      .from("session_apprenants")
      .select("sessions:session_id(nom, creneaux, date_debut, date_fin)")
      .eq("apprenant_id", apprenantId);
    const matchingSession = ((sessionRows as any[]) || []).map((row) => row?.sessions).find((s) => {
      if (!s) return false;
      const debut = String(s.date_debut || "").slice(0, 10);
      const fin = String(s.date_fin || debut).slice(0, 10);
      return debut <= endISO && fin >= startISO;
    });
    if (matchingSession && isEveningSession(matchingSession)) wantEvening = true;
  }

  if (mode === "fc") {
    const out: Array<{ date: string; creneau: CreneauKey }> = [];
    const cur = new Date(effectiveStart);
    while (cur <= end) {
      const dow = todayDow(cur);
      if (dow <= 4) {
        const iso = formatISO(cur);
        const candidates: CreneauKey[] = wantEvening ? ["soir_1", "soir_2"] : ["matin", "apres_midi"];
        for (const creneau of candidates) {
          if (isCreneauDue(iso, creneau, formatISO(new Date()), new Date().getHours() * 60 + new Date().getMinutes())) out.push({ date: iso, creneau });
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  const out: Array<{ date: string; creneau: CreneauKey }> = [];
  const cur2 = new Date(effectiveStart);
  while (cur2 <= end) {
    const iso = formatISO(cur2);
    const dow = todayDow(cur2);
    if (dow <= 4) {
      const candidates: CreneauKey[] = wantEvening ? ["soir_1", "soir_2"] : ["matin", "apres_midi"];
      const today = formatISO(new Date());
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (const creneau of candidates) {
        if (isCreneauDue(iso, creneau, today, nowMin)) out.push({ date: iso, creneau });
      }
    }
    cur2.setDate(cur2.getDate() + 1);
  }
  return out;
};
