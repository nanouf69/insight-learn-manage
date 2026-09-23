/**
 * INCIDENTS TECHNIQUES DES EXAMENS BLANCS — LECTURE SEULE
 * =======================================================
 * Ce hook DÉTECTE et AFFICHE uniquement. Il n'écrit jamais dans les réponses,
 * les notes, les tentatives ou les résultats. La seule écriture possible est le
 * marquage « incident résolu » dans une table de suivi dédiée.
 *
 * Il complète (et ne remplace pas) les alertes externes e-mail / webhook
 * produites par la fonction de surveillance.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GraviteIncident = "critique" | "avertissement";

export type IncidentExamen = {
  cle: string;
  code: string;
  libelle: string;
  gravite: GraviteIncident;
  apprenantId: string | null;
  apprenantNom: string;
  examen: string;
  matiere: string;
  heure: string;
  etat: string;
  reponsesServeur: number;
  reponsesAttendues: number;
  attemptId: string;
};

const FENETRE_HEURES = 72;

const LIBELLES: Record<string, { libelle: string; gravite: GraviteIncident }> = {
  TENTATIVE_VIDE: { libelle: "Tentative vide (aucune question chargée)", gravite: "critique" },
  RESULTAT_SANS_REPONSE_SERVEUR: { libelle: "Risque de 0 technique : aucune réponse côté serveur", gravite: "critique" },
  MAUVAIS_NOMBRE_DE_QUESTIONS: { libelle: "Mauvais nombre de questions par rapport à l'instantané", gravite: "critique" },
  RESULTATS_MULTIPLES: { libelle: "Finalisation impossible : plusieurs résultats pour la même tentative", gravite: "critique" },
  SAUVEGARDE_BLOQUEE: { libelle: "Sauvegarde impossible : matière ouverte sans aucune réponse enregistrée", gravite: "critique" },
  FINALISATION_EN_ATTENTE: { libelle: "Finalisation en attente : matière terminée, résultat manquant", gravite: "avertissement" },
};

type Tentative = {
  attempt_id: string;
  apprenant_id: string | null;
  exam_id: string | null;
  etat: string | null;
  started_at: string | null;
  snapshot: any;
};

const matiereDe = (snapshot: any): string => {
  const m = snapshot?.matiere ?? snapshot?.matiere_id ?? snapshot?.matiereId;
  return typeof m === "string" && m.length > 0 ? m : "—";
};

const nbQuestions = (snapshot: any): number =>
  Array.isArray(snapshot?.questions) ? snapshot.questions.length : 0;

export function useIncidentsExamens() {
  const [incidents, setIncidents] = useState<IncidentExamen[]>([]);
  const [historique, setHistorique] = useState<IncidentExamen[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    try {
      const depuis = new Date(Date.now() - FENETRE_HEURES * 3600_000).toISOString();
      const { data: tentatives } = await supabase
        .from("exam_attempts_v2")
        .select("attempt_id, apprenant_id, exam_id, etat, started_at, snapshot")
        .eq("is_test", false)
        .gte("started_at", depuis)
        .order("started_at", { ascending: false })
        .limit(500);

      const lignes = (tentatives ?? []) as unknown as Tentative[];
      if (lignes.length === 0) {
        setIncidents([]);
        setLoading(false);
        return;
      }
      const ids = lignes.map((t) => t.attempt_id);

      const [{ data: reponses }, { data: resultats }, { data: neutralisees }, { data: statuts }] = await Promise.all([
        supabase.from("answer_state").select("attempt_id, question_id").in("attempt_id", ids).limit(20000),
        supabase.from("core_exam_results").select("attempt_id, result_id").in("attempt_id", ids).limit(2000),
        supabase.from("core_tentatives_neutralisees").select("attempt_id"),
        supabase.from("incidents_examens_statut").select("incident_cle, resolu, resolu_le"),
      ]);

      const neutres = new Set((neutralisees ?? []).map((n: any) => n.attempt_id));
      const resolus = new Map(
        (statuts ?? []).filter((s: any) => s.resolu).map((s: any) => [s.incident_cle, s.resolu_le as string]),
      );

      const parTentative = new Map<string, Set<string>>();
      for (const r of (reponses ?? []) as any[]) {
        if (!parTentative.has(r.attempt_id)) parTentative.set(r.attempt_id, new Set());
        parTentative.get(r.attempt_id)!.add(r.question_id);
      }
      const nbResultats = new Map<string, number>();
      for (const r of (resultats ?? []) as any[]) {
        nbResultats.set(r.attempt_id, (nbResultats.get(r.attempt_id) ?? 0) + 1);
      }

      const apprenantIds = Array.from(new Set(lignes.map((t) => t.apprenant_id).filter(Boolean))) as string[];
      const { data: apprenants } = apprenantIds.length
        ? await supabase.from("apprenants").select("id, nom, prenom").in("id", apprenantIds)
        : { data: [] as any[] };
      const noms = new Map(
        (apprenants ?? []).map((a: any) => [a.id, `${a.nom ?? ""} ${a.prenom ?? ""}`.trim() || "Apprenant"]),
      );

      const detectes: IncidentExamen[] = [];
      const pousser = (t: Tentative, code: string, obtenues: number, attendues: number) => {
        const meta = LIBELLES[code];
        detectes.push({
          cle: `${code}:${t.attempt_id}`,
          code,
          libelle: meta.libelle,
          gravite: meta.gravite,
          apprenantId: t.apprenant_id,
          apprenantNom: noms.get(t.apprenant_id ?? "") ?? "Apprenant",
          examen: t.exam_id ?? "—",
          matiere: matiereDe(t.snapshot),
          heure: t.started_at ?? "",
          etat: t.etat === "terminee" ? "Matière terminée" : "Matière en cours",
          reponsesServeur: obtenues,
          reponsesAttendues: attendues,
          attemptId: t.attempt_id,
        });
      };

      const limiteOuverture = Date.now() - 2 * 3600_000;
      for (const t of lignes) {
        if (neutres.has(t.attempt_id)) continue;
        const attendues = nbQuestions(t.snapshot);
        const obtenues = parTentative.get(t.attempt_id)?.size ?? 0;
        const termine = t.etat === "terminee";
        const debut = t.started_at ? new Date(t.started_at).getTime() : Date.now();

        if (termine && attendues === 0) pousser(t, "TENTATIVE_VIDE", obtenues, attendues);
        else if (termine && obtenues === 0) pousser(t, "RESULTAT_SANS_REPONSE_SERVEUR", obtenues, attendues);
        else if (termine && obtenues !== attendues) pousser(t, "MAUVAIS_NOMBRE_DE_QUESTIONS", obtenues, attendues);

        if ((nbResultats.get(t.attempt_id) ?? 0) > 1) pousser(t, "RESULTATS_MULTIPLES", obtenues, attendues);
        if (termine && (nbResultats.get(t.attempt_id) ?? 0) === 0) pousser(t, "FINALISATION_EN_ATTENTE", obtenues, attendues);
        if (!termine && obtenues === 0 && debut < limiteOuverture) pousser(t, "SAUVEGARDE_BLOQUEE", obtenues, attendues);
      }

      setIncidents(detectes.filter((i) => !resolus.has(i.cle)));
      setHistorique(detectes.filter((i) => resolus.has(i.cle)));
    } catch (e) {
      console.error("[IncidentsExamens] lecture impossible", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
    // Mise à jour automatique : aucune actualisation manuelle nécessaire.
    const canal = supabase
      .channel("incidents-examens-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_attempts_v2" }, () => void charger())
      .on("postgres_changes", { event: "*", schema: "public", table: "core_exam_results" }, () => void charger())
      .subscribe();
    const intervalle = setInterval(() => void charger(), 120_000);
    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalle);
    };
  }, [charger]);

  const marquerResolu = useCallback(
    async (incident: IncidentExamen) => {
      const { data: session } = await supabase.auth.getSession();
      await supabase.from("incidents_examens_statut").upsert(
        {
          incident_cle: incident.cle,
          code: incident.code,
          attempt_id: incident.attemptId,
          apprenant_id: incident.apprenantId,
          exam_id: incident.examen,
          matiere: incident.matiere,
          resolu: true,
          resolu_par: session?.session?.user?.id ?? null,
        } as any,
        { onConflict: "incident_cle" },
      );
      await charger();
    },
    [charger],
  );

  const critiques = useMemo(() => incidents.filter((i) => i.gravite === "critique").length, [incidents]);

  return { incidents, historique, loading, critiques, recharger: charger, marquerResolu };
}
