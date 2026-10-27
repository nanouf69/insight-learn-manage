import { isPratiqueType } from "@/lib/sessionTypes";

export interface SessionHeuresSource {
  type_session?: string | null;
  nom?: string | null;
  heure_debut?: string | null;
  types_apprenant?: string[] | null;
}

/** Display-only distinction for shared daytime theory sessions; never changes saved hours. */
export function libelleHeuresSessionMixte(s: SessionHeuresSource): string | null {
  if (isPratiqueType(s.type_session)) return null;
  const nom = (s.nom || "").toLowerCase();
  if (/continue|mobilit|examen|soir/.test(nom) || /continue|mobilit|examen/.test(s.type_session || "")) return null;
  if (/^(1[7-9]|2[0-3])[:h]/.test((s.heure_debut || "").trim())) return null;
  const types = (s.types_apprenant || []).map((t) => String(t).toUpperCase());
  const hasTaxi = types.includes("TAXI") || /taxi/.test(nom);
  const hasVtc = types.includes("VTC") || /vtc/.test(nom);
  const hasTA = types.includes("TA") || /\bta\b/.test(nom);
  if (hasTaxi && hasVtc) return "VTC : 60 h · TAXI : 90 h";
  // Session commune TAXI + TA : le TA suit 30 h par défaut, le TAXI 90 h.
  if (hasTaxi && hasTA) return "TAXI : 90 h · TA : 30 h";
  return null;
}

/**
 * Volume horaire total affiché par défaut pour une session quand
 * `sessions.heures_total` n'est pas renseigné :
 * - session pratique (VTC/TAXI/TA) : 6 h
 * - session présentiel TA (sans TAXI) ou VA (sans VTC) : 30 h
 * - TAXI : 90 h
 * - VTC cours du soir : 40 h
 * - VTC journée : 60 h
 * Retourne null si le type ne permet pas de déterminer un défaut.
 */
export function heuresSessionDefaut(s: SessionHeuresSource): number | null {
  if (isPratiqueType(s.type_session)) return 6;
  const nom = (s.nom || "").toLowerCase();
  const types = (s.types_apprenant || []).map((t) => String(t).toUpperCase());
  const hasTaxi = types.includes("TAXI") || /taxi/.test(nom);
  const hasTA = types.includes("TA") || /\bta\b/.test(nom);
  if (hasTA && !hasTaxi) return 30;
  if (hasTaxi) return 90;
  const hasVA = types.includes("VA") || /\bva\b/.test(nom);
  const hasVtcType = types.includes("VTC") || /vtc/.test(nom);
  if (hasVA && !hasVtcType) return 30;
  const isSoir =
    /soir/.test(nom) || /^(1[7-9]|2[0-3])[:h]/.test((s.heure_debut || "").trim());
  const hasVtc = types.includes("VTC") || /vtc/.test(nom);
  if (hasVtc) return isSoir ? 40 : 60;
  if (isSoir) return 40;
  return null;
}

/** Total effectif : valeur enregistrée si présente, sinon le défaut calculé. */
export function heuresSessionAffichees(
  s: SessionHeuresSource & { heures_total?: number | null }
): number | null {
  const v = Number(s.heures_total);
  if (Number.isFinite(v) && v > 0) return v;
  return heuresSessionDefaut(s);
}

/** Shared theory denominator follows the learner, without rewriting session hours. */
export function heuresSessionPourApprenant(s: SessionHeuresSource & { heures_total?: number | null }, filiere?: string | null): number | null {
  if (libelleHeuresSessionMixte(s)) {
    if (filiere === "vtc") return 60;
    if (filiere === "taxi") return 90;
    if (filiere === "ta" || filiere === "va") return 30;
  }
  return heuresSessionAffichees(s);
}

/** Read-only denominator: overlapping shared-track enrollments are one training period. */
export function heuresTheorieInscrites(inscriptions: any[], filiere?: string | null): number {
  const sessionsVues = new Set<string>();
  const periodes: { debut: string; fin: string; heures: number; partagee: boolean }[] = [];
  for (const row of inscriptions) {
    const s = row.sessions;
    if (!s || row.liste_attente === true || row.emargements_exclus === true || /annul/i.test(String(s.statut ?? "")) || !/theorique/i.test(s.type_session ?? "")) continue;
    const id = s.id ?? row.session_id;
    if (id && sessionsVues.has(id)) continue;
    if (id) sessionsVues.add(id);
    const debut = [s.date_debut, row.date_debut].filter(Boolean).map(v => String(v).slice(0, 10)).sort().at(-1) ?? "";
    const fin = [s.date_fin || s.date_debut, row.date_fin_personnalisee || row.date_fin].filter(Boolean).map(v => String(v).slice(0, 10)).sort()[0] ?? "";
    // Cours du soir VTC (horaire de session ou horaire personnalisé de l'élève) : toujours 40 h.
    const soir = /soir/i.test(s.nom || "") || /^(1[7-9]|2[0-3])[:h]/.test(String(row.heure_debut_personnalisee || s.heure_debut || "").trim());
    const heures = soir && filiere !== "taxi" && filiere !== "ta" ? 40 : heuresSessionPourApprenant(s, filiere) ?? 0;
    periodes.push({ debut, fin, heures, partagee: !!filiere && !!libelleHeuresSessionMixte(s) && !!debut && !!fin });
  }
  periodes.sort((a, b) => a.debut.localeCompare(b.debut));
  const groupes: typeof periodes = [];
  for (const p of periodes) {
    const groupe = p.partagee ? groupes.find(g => g.partagee && p.debut <= g.fin && p.fin >= g.debut) : undefined;
    if (groupe) {
      groupe.fin = groupe.fin > p.fin ? groupe.fin : p.fin;
      groupe.heures = Math.max(groupe.heures, p.heures);
    } else groupes.push({ ...p });
  }
  return groupes.reduce((total, p) => total + p.heures, 0);
}
