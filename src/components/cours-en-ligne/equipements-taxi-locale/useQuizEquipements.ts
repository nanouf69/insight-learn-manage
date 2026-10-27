import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { freshSessionCall } from "@/lib/sessionRpc";
import { enqueueAnswerSave, flushAnswerSavesAndWait, getPendingAnswers } from "@/lib/answerPersistence";
import { isLearnerPreviewReadOnly } from "@/lib/learnerPreviewGuard";
import { EXERCICE_TYPE_JEU } from "@/lib/jeuxPedagogiques";
import { ID_QUIZ_EQUIPEMENTS, VERSION_QUIZ_EQUIPEMENTS, QUESTIONS_EQUIPEMENTS, type QuestionEquipement, type ReponsesEquipements } from "./donnees";

/** Définition d'une série complémentaire (identité immuable : ID + version). */
export interface SerieEquipements { id: string; version: string; questions: QuestionEquipement[] }
export const SERIE_COMPLEMENT: SerieEquipements = { id: ID_QUIZ_EQUIPEMENTS, version: VERSION_QUIZ_EQUIPEMENTS, questions: QUESTIONS_EQUIPEMENTS };
export const serieComplete = (serie: SerieEquipements, v: ReponsesEquipements) => serie.questions.every((x) => { const n = Number(v[x.id]); return v[x.id] !== undefined && v[x.id] !== "" && Number.isInteger(n) && n >= 0 && n < x.choix.length; });

export interface BrouillonEquipements { valeurs: ReponsesEquipements; revision: string }
export const cleBrouillonEquipements = (compte: string, serie: SerieEquipements = SERIE_COMPLEMENT) => `taxi_equipements_draft:${encodeURIComponent(compte)}:${serie.id}:${serie.version}`;

/** Accusé = même version, même révision, mêmes réponses (et terminé si demandé). Aucune suppression. */
export function accuseEquipementsCorrespond(data: unknown, draft: BrouillonEquipements, termine: boolean, version: string = VERSION_QUIZ_EQUIPEMENTS): boolean {
  const row = data as { completed?: boolean; reponses?: { version?: string; revision?: string; valeurs?: ReponsesEquipements } } | null;
  return !!row && (!termine || row.completed === true) && row.reponses?.version === version && row.reponses?.revision === draft.revision &&
    JSON.stringify(Object.entries(row.reponses?.valeurs ?? {}).sort()) === JSON.stringify(Object.entries(draft.valeurs).sort());
}

export interface TransportEquipements {
  lire(compte: string, serie?: SerieEquipements): Promise<unknown>;
  envoyer(compte: string, draft: BrouillonEquipements, termine: boolean, serie?: SerieEquipements): Promise<boolean>;
}
const transportReel: TransportEquipements = {
  async lire(compte, serie = SERIE_COMPLEMENT) {
    const protection = await freshSessionCall<{ data: unknown; error: unknown }>(() => (supabase as any).rpc("quiz_equipements_taxi_protection_prete"));
    if (protection.error || protection.data !== true) throw new Error("Protection serveur non disponible.");
    const { data, error } = await freshSessionCall(() => supabase.from("reponses_apprenants").select("completed,reponses").eq("apprenant_id", compte).eq("exercice_id", serie.id).maybeSingle());
    if (error) throw error;
    return data;
  },
  async envoyer(compte, draft, termine, serie = SERIE_COMPLEMENT) {
    enqueueAnswerSave({ apprenant_id: compte, module_id: null, exercice_id: serie.id, exercice_type: EXERCICE_TYPE_JEU, reponses: { version: serie.version, ...draft }, completed: termine, score: null });
    return flushAnswerSavesAndWait(compte, serie.id);
  },
};

export function useQuizEquipements(compte: string | null | undefined, transport: TransportEquipements = transportReel, serie: SerieEquipements = SERIE_COMPLEMENT) {
  const [valeurs, setValeurs] = useState<ReponsesEquipements>({});
  const [statut, setStatut] = useState("Chargement du suivi…");
  const [confirme, setConfirme] = useState(false);
  const [charge, setCharge] = useState(false);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const revision = useRef("");
  const valeursRef = useRef<ReponsesEquipements>({});
  const appliquer = (v: ReponsesEquipements, r: string) => { setValeurs(v); valeursRef.current = v; revision.current = r; };

  const relire = useCallback(async () => {
    const g = ++generation.current;
    setCharge(false); setConfirme(false); setBusy(false); appliquer({}, "");
    if (!compte) { setStatut("Aperçu — aucune sauvegarde élève"); setCharge(true); return; }
    let local: BrouillonEquipements | null = null;
    let erreurLocale = false;
    try {
      const raw = window.localStorage.getItem(cleBrouillonEquipements(compte, serie));
      if (raw) { const d = JSON.parse(raw); if (!d || typeof d.revision !== "string" || !d.valeurs || typeof d.valeurs !== "object") throw new Error(); local = d; }
    } catch { erreurLocale = true; }
    if (local) appliquer(local.valeurs, local.revision);
    try {
      const raw = await transport.lire(compte, serie) as { completed?: boolean; reponses?: { version?: string; valeurs?: ReponsesEquipements; revision?: string } } | null;
      if (g !== generation.current) return;
      if (raw?.reponses && raw.reponses.version !== serie.version) throw new Error("Version incompatible : aucune réponse remplacée.");
      const pending = transport === transportReel ? getPendingAnswers(compte, serie.id) as { valeurs?: ReponsesEquipements; revision?: string } | null : null;
      if (raw?.completed === true) appliquer(raw.reponses?.valeurs ?? {}, raw.reponses?.revision ?? "");
      else if (!local) appliquer(pending?.valeurs ?? raw?.reponses?.valeurs ?? {}, pending?.revision ?? raw?.reponses?.revision ?? "");
      setConfirme(raw?.completed === true);
      setStatut(erreurLocale ? "Lecture locale impossible — anciennes saisies conservées, ne validez pas." : raw?.completed ? "Quiz terminé — preuve serveur" : "Suivi chargé");
      setCharge(!erreurLocale);
    } catch {
      if (g !== generation.current) return;
      setStatut("Suivi indisponible — saisie conservée, réessayez la lecture."); setCharge(false);
    }
  }, [compte, transport, serie]);
  useEffect(() => { void relire(); return () => { generation.current++; }; }, [relire]);

  const modifier = (champ: string, valeur: string) => {
    if (confirme) return;
    const next = { ...valeursRef.current, [champ]: valeur };
    appliquer(next, crypto.randomUUID());
    if (!compte || isLearnerPreviewReadOnly()) return;
    try { window.localStorage.setItem(cleBrouillonEquipements(compte, serie), JSON.stringify({ valeurs: next, revision: revision.current })); setStatut("Réponse conservée sur cet appareil — à enregistrer"); }
    catch { setStatut("Stockage appareil indisponible — gardez cette fenêtre ouverte."); }
  };

  const enregistrer = async (termine = false) => {
    if (!compte || !charge || busy || confirme || isLearnerPreviewReadOnly()) return;
    if (termine && !serieComplete(serie, valeursRef.current)) { setStatut("Répondez à toutes les questions avant de terminer."); return; }
    const g = generation.current;
    const draft = { valeurs: { ...valeursRef.current }, revision: revision.current || crypto.randomUUID() }; revision.current = draft.revision;
    try { window.localStorage.setItem(cleBrouillonEquipements(compte, serie), JSON.stringify(draft)); } catch { setStatut("Stockage appareil indisponible."); return; }
    setBusy(true); setStatut("Enregistrement en cours…");
    try {
      const ok = await transport.envoyer(compte, draft, termine, serie);
      const row = await transport.lire(compte, serie);
      if (g !== generation.current) return;
      if (!ok || !accuseEquipementsCorrespond(row, draft, termine, serie.version)) throw new Error("Accusé non prouvé");
      if (termine) { setConfirme(true); window.dispatchEvent(new Event("activite-registre-confirmee")); }
      setStatut(termine ? "Quiz terminé — confirmé par le serveur" : "Réponses enregistrées — confirmées par le serveur");
    } catch { if (g === generation.current) setStatut("Enregistrement non confirmé — réponses conservées sur cet appareil."); }
    finally { if (g === generation.current) setBusy(false); }
  };
  return { valeurs, modifier, statut, confirme, charge, busy, enregistrer, relire };
}
