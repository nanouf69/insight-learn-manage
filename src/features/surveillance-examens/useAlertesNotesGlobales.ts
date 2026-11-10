import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lireObservationsNotesGlobales } from "./lectureNotesGlobales";
import { confirmerAlertesNotes, DELAI_CONFIRMATION_NOTE_MS, type AlerteNoteGlobale } from "./noteGlobale";

export function useAlertesNotesGlobales() {
  const [alertes, setAlertes] = useState<AlerteNoteGlobale[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [verification, setVerification] = useState(false);
  useEffect(() => {
    let active = true;
    let running = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let confirmation: ReturnType<typeof setTimeout> | undefined;
    let premieres = new Map<string, { signature: string; observee: number }>();
    const lire = async () => {
      if (!active) return;
      if (running) { dirty = true; return; }
      running = true;
      try {
        const observations = await lireObservationsNotesGlobales();
        if (!active) return;
        const etat = confirmerAlertesNotes(premieres, observations, performance.now());
        // Monotonic elapsed time, wall clock is presentation only.
        const dates = new Map(alertes.map(a => [a.cle, a.heure]));
        setAlertes(etat.alertes.map(a => ({ ...a, heure: dates.get(a.cle) ?? new Date().toISOString() })));
        premieres = etat.prochaines;
        setErreur(null);
        setVerification(etat.aConfirmer);
        if (confirmation) clearTimeout(confirmation);
        confirmation = etat.aConfirmer ? setTimeout(() => { confirmation = undefined; void lire(); }, DELAI_CONFIRMATION_NOTE_MS) : undefined;
      } catch {
        if (active) {
          setErreur("Contrôle des notes globales indisponible : aucune résolution ne peut être confirmée.");
          setVerification(false);
          premieres.clear();
        }
      } finally {
        running = false;
        if (active && dirty) { dirty = false; schedule(); }
      }
    };
    const schedule = () => {
      if (!active || timer || document.visibilityState === "hidden") return;
      timer = setTimeout(() => { timer = undefined; void lire(); }, 400);
    };
    let channel = supabase.channel(`alertes-notes-globales-${Math.random().toString(36).slice(2)}`);
    for (const table of ["exam_attempts_v2", "core_exam_results", "qrc_instances_v2", "apprenant_quiz_results", "qrc_instances", "core_exam_resets", "session_apprenants", "apprenants", "module_editor_state"]) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, schedule);
    }
    channel.subscribe(status => { if (status === "SUBSCRIBED") schedule(); });
    window.addEventListener("focus", schedule);
    window.addEventListener("online", schedule);
    document.addEventListener("visibilitychange", schedule);
    void lire();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (confirmation) clearTimeout(confirmation);
      window.removeEventListener("focus", schedule);
      window.removeEventListener("online", schedule);
      document.removeEventListener("visibilitychange", schedule);
      void supabase.removeChannel(channel);
    };
  }, []);
  return { alertes, erreur, verification };
}