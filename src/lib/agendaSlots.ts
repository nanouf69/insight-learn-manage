import { supabase } from "@/integrations/supabase/client";

export type CreneauKey = "matin" | "apres_midi" | "soir";

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
): boolean => {
  const t = (type_apprenant || "").toLowerCase().trim();
  const f = (formation_choisie || "").toLowerCase().trim();
  const value = `${t} ${f}`;

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
 * Récupère les blocs agenda d'aujourd'hui qui correspondent à la formation de l'apprenant.
 * On filtre côté client par mot-clé (TAXI / VTC / TA / VA) car la chaîne `formation`
 * dans agenda_blocs n'est pas un slug strict.
 */
export const getTodayAgendaBlocs = async (
  formationChoisie: string | null | undefined,
): Promise<AgendaBloc[]> => {
  const now = new Date();
  const weekStart = formatISO(startOfWeek(now));
  const dow = todayDow(now);

  const { data, error } = await supabase
    .from("agenda_blocs")
    .select("jour, heure_debut, heure_fin, formation, semaine_debut, publics_cibles" as any)
    .eq("semaine_debut", weekStart)
    .eq("jour", dow);

  if (error || !data) return [];

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
 * - matin : un bloc qui commence avant 12h00
 * - apres_midi : un bloc qui commence entre 12h00 et 17h59
 * - soir : un bloc qui commence à partir de 18h00
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
    if (startMin < 18 * 60) return "apres_midi";
    return "soir";
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
  if (nowMin < 18 * 60) {
    if (blocs.some((b) => {
      const s = timeToMin(b.heure_debut);
      return s >= 12 * 60 && s < 18 * 60;
    })) return "apres_midi";
  }
  if (blocs.some((b) => timeToMin(b.heure_debut) >= 18 * 60)) return "soir";

  return null;
};

export const creneauLabel = (k: CreneauKey): string => {
  switch (k) {
    case "matin": return "Matin";
    case "apres_midi": return "Après-midi";
    case "soir": return "Soir";
  }
};

export const creneauHoraire = (k: CreneauKey): string => {
  switch (k) {
    case "matin": return "08h30 — 12h00";
    case "apres_midi": return "13h00 — 17h00";
    case "soir": return "18h00 — 21h00";
  }
};
