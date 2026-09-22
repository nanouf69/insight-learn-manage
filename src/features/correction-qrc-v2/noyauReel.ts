// Accès au VRAI noyau sécurisé en base (aucun serveur simulé).
// Toutes les écritures passent par des fonctions serveur idempotentes.
import { supabase } from "@/integrations/supabase/client";

export type QuestionSnapshot = {
  id: string;
  matiere: string;
  type: string;
  enonce: string;
  reponseQRC?: string;
  points: number;
};

export type MatiereSnapshot = { subject_id: string; lettre: string; titre: string; ordre: number };

export type SnapshotExamen = {
  exam_id: string;
  exam_libelle?: string;
  matieres: MatiereSnapshot[];
  questions: QuestionSnapshot[];
  session?: { date: string; heure: string };
};

export type TentativeReelle = {
  attempt_id: string;
  apprenant_id: string;
  exam_id: string;
  exam_version_id: string;
  etat: string;
  snapshot: SnapshotExamen;
  snapshot_fingerprint: string;
  candidat: string;
};

export type QrcReelle = {
  qrc_instance_id: string;
  attempt_id: string;
  question_id: string;
  apprenant_id: string;
  reponse: unknown;
  etat: "en_attente" | "corrigee";
  note: number | null;
  corrige_email?: string | null;
  corrige_at?: string | null;
};

export type DatePassage = {
  jour: string;
  date: string;
  heureMin: string;
  heureMax: string;
  attemptIds: string[];
};

export type SessionListee = {
  cle: string;
  exam_id: string;
  date: string;
  jour: string;
  heureMin: string;
  heureMax: string;
  attemptIds: string[];
  /** Dates réelles de passage regroupées sous le même numéro d'Examen Blanc (jamais fusionnées entre EB). */
  dates: DatePassage[];
};

export type ResultatReel = {
  result_id: string;
  attempt_id: string;
  result_revision: number;
  status: "provisoire" | "definitif";
  score: number | null;
  total: number | null;
  qrc_restantes: number;
  published_at: string | null;
};

export type BaremeRestaure = {
  qrc_instance_id: string;
  bareme: number;
  mention: string;
  nb_preuves: number;
};

export type SessionReelle = {
  tentatives: TentativeReelle[];
  qrc: QrcReelle[];
  resultats: ResultatReel[];
  /** Barèmes historiques retrouvés par preuve concordante (jamais devinés, jamais pris sur la version actuelle). */
  baremesRestaures: BaremeRestaure[];
};

const asSnapshot = (v: unknown) => v as SnapshotExamen;

/** Liste des sessions (examen + jour), de la plus récente à la plus ancienne. */
export async function listerSessions(mode: "test" | "migre" = "migre"): Promise<SessionListee[]> {
  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id, exam_id, started_at")
    .eq("is_test", mode === "test")
    .order("started_at", { ascending: false });
  if (error) throw error;

  const par = new Map<string, SessionListee>();
  for (const a of data ?? []) {
    const d = new Date(a.started_at as string);
    const jour = d.toISOString().slice(0, 10);
    const date = d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    const heure = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    const cle = `${a.exam_id}|${jour}`;
    const s = par.get(cle) ?? {
      cle, exam_id: a.exam_id as string, date, jour, heureMin: heure, heureMax: heure, attemptIds: [], dates: [],
    };
    s.attemptIds.push(a.attempt_id as string);
    if (heure < s.heureMin) s.heureMin = heure;
    if (heure > s.heureMax) s.heureMax = heure;
    par.set(cle, s);
  }
  return Array.from(par.values()).sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : 0));
}

export type GroupeSessionCrm = {
  cle: string;
  type: "crm" | "elearning" | "indetermine" | "conflit";
  libelle: string;
  periode: string | null;
  /** Tri : date de début de la session CRM (ou date du passage le plus récent). */
  tri: string;
  nbCandidats: number;
  examens: SessionListee[];
};

const jourFr = (j: string) => j.split("-").reverse().join("/");

/**
 * Regroupement des passages d'Examens Blancs SOUS les sessions réelles du CRM.
 * Lecture seule : aucune session n'est créée ni déduite depuis la date d'un passage.
 * Règle de rattachement : parmi les sessions CRM auxquelles l'apprenant est réellement
 * rattaché, on ne retient que celles dont la période couvre la date du passage.
 *  - exactement une → rattachement certain
 *  - aucune → « Session CRM non déterminée »
 *  - plusieurs qui se chevauchent → « Conflit de sessions CRM » (jamais choisi automatiquement)
 * Les apprenants e-learning (type se terminant par « -e ») forment un regroupement séparé.
 */
export async function listerGroupesCrm(mode: "test" | "migre" = "migre"): Promise<GroupeSessionCrm[]> {
  // Lecture paginée : au-delà de 1000 lignes, une lecture simple serait tronquée.
  const attempts: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("exam_attempts_v2")
      .select("attempt_id, apprenant_id, exam_id, started_at")
      .eq("is_test", mode === "test")
      .order("started_at", { ascending: false })
      .range(de, de + 999);
    if (error) throw error;
    attempts.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }

  const apprenantIds = Array.from(new Set((attempts ?? []).map((a) => a.apprenant_id as string)));
  const { data: apprenants } = apprenantIds.length
    ? await supabase.from("apprenants").select("id, type_apprenant").in("id", apprenantIds)
    : { data: [] as { id: string; type_apprenant: string | null }[] };
  const estElearning = new Map(
    (apprenants ?? []).map((a) => [a.id, /-e$/.test((a.type_apprenant ?? "").trim().toLowerCase())]),
  );

  const { data: liens } = apprenantIds.length
    ? await supabase
        .from("session_apprenants")
        .select("apprenant_id, session_id, date_debut, date_fin")
        .in("apprenant_id", apprenantIds)
        .range(0, 4999)
    : { data: [] as any[] };

  const sessionIds = Array.from(new Set((liens ?? []).map((l: any) => l.session_id as string)));
  const { data: sessionsCrm } = sessionIds.length
    ? await supabase.from("sessions").select("id, nom, date_debut, date_fin").in("id", sessionIds)
    : { data: [] as any[] };
  const sessionDe = new Map((sessionsCrm ?? []).map((s: any) => [s.id as string, s]));

  const liensDe = new Map<string, Array<{ session: any; debut: string; fin: string }>>();
  for (const l of (liens ?? []) as any[]) {
    const s = sessionDe.get(l.session_id);
    if (!s) continue;
    const debut = (l.date_debut ?? s.date_debut) as string;
    const fin = (l.date_fin ?? s.date_fin) as string;
    if (!debut || !fin) continue;
    const arr = liensDe.get(l.apprenant_id) ?? [];
    arr.push({ session: s, debut, fin });
    liensDe.set(l.apprenant_id, arr);
  }

  const groupes = new Map<string, GroupeSessionCrm & { candidats: Set<string> }>();
  const ajouter = (
    cle: string,
    base: Omit<GroupeSessionCrm, "cle" | "examens" | "nbCandidats">,
    a: any,
  ) => {
    const d = new Date(a.started_at as string);
    const jour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
    const heure = d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
    const g =
      groupes.get(cle) ??
      ({ cle, ...base, examens: [], nbCandidats: 0, candidats: new Set<string>() } as GroupeSessionCrm & {
        candidats: Set<string>;
      });
    g.candidats.add(a.apprenant_id as string);
    const cleEb = `${cle}::${a.exam_id}|${jour}`;
    let eb = g.examens.find((e) => e.cle === cleEb);
    if (!eb) {
      eb = {
        cle: cleEb,
        exam_id: a.exam_id as string,
        date: jourFr(jour),
        jour,
        heureMin: heure,
        heureMax: heure,
        attemptIds: [],
      };
      g.examens.push(eb);
    }
    eb.attemptIds.push(a.attempt_id as string);
    if (heure < eb.heureMin) eb.heureMin = heure;
    if (heure > eb.heureMax) eb.heureMax = heure;
    if (base.type !== "crm" && jour > g.tri) g.tri = jour;
    groupes.set(cle, g);
  };

  for (const a of (attempts ?? []) as any[]) {
    const jour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(
      new Date(a.started_at as string),
    );
    if (estElearning.get(a.apprenant_id)) {
      ajouter("elearning", {
        type: "elearning",
        libelle: "E-learning — toutes sessions confondues",
        periode: null,
        tri: "0000-00-00",
      }, a);
      continue;
    }
    const couvrantes = (liensDe.get(a.apprenant_id) ?? []).filter((l) => jour >= l.debut && jour <= l.fin);
    const uniques = Array.from(new Map(couvrantes.map((l) => [l.session.id, l])).values());
    if (uniques.length === 1) {
      const s = uniques[0].session;
      ajouter(`crm:${s.id}`, {
        type: "crm",
        libelle: s.nom ?? "Session sans nom",
        periode: `${jourFr(s.date_debut)} → ${jourFr(s.date_fin)}`,
        tri: s.date_debut as string,
      }, a);
    } else if (uniques.length === 0) {
      ajouter("indetermine", {
        type: "indetermine",
        libelle: "⚠️ Session CRM non déterminée",
        periode: null,
        tri: "0000-00-00",
      }, a);
    } else {
      ajouter("conflit", {
        type: "conflit",
        libelle: "⚠️ Conflit de sessions CRM (plusieurs sessions se chevauchent)",
        periode: null,
        tri: "0000-00-00",
      }, a);
    }
  }

  const rang = { crm: 0, elearning: 1, indetermine: 2, conflit: 3 } as const;
  return Array.from(groupes.values())
    .map((g) => {
      g.nbCandidats = g.candidats.size;
      g.examens.sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : a.exam_id.localeCompare(b.exam_id)));
      return g as GroupeSessionCrm;
    })
    .sort((a, b) => rang[a.type] - rang[b.type] || (a.tri < b.tri ? 1 : a.tri > b.tri ? -1 : 0));
}

/**
 * Charge une session depuis la base réelle.
 * - "test"  : tentatives fictives marquées is_test
 * - "migre" : passages réels copiés depuis l'ancien système (pilote contrôlé)
 */
export async function chargerSessionTest(
  mode: "test" | "migre" = "test",
  attemptIdsFiltre?: string[],
): Promise<SessionReelle> {
  let requete = supabase
    .from("exam_attempts_v2")
    .select("attempt_id, apprenant_id, exam_id, exam_version_id, etat, snapshot, snapshot_fingerprint")
    .eq("is_test", mode === "test");
  if (attemptIdsFiltre?.length) requete = requete.in("attempt_id", attemptIdsFiltre);
  const { data: attempts, error } = await requete.order("started_at", { ascending: true });
  if (error) throw error;

  const ids = (attempts ?? []).map((a) => a.apprenant_id);
  const { data: apprenants } = ids.length
    ? await supabase.from("apprenants").select("id, nom, prenom").in("id", ids)
    : { data: [] as { id: string; nom: string; prenom: string }[] };
  const nomDe = new Map((apprenants ?? []).map((a) => [a.id, `${a.nom} ${a.prenom}`]));

  const attemptIds = (attempts ?? []).map((a) => a.attempt_id);
  const { data: qrc } = attemptIds.length
    ? await supabase
        .from("qrc_instances_v2")
        .select("qrc_instance_id, attempt_id, question_id, apprenant_id, reponse, etat, note, corrige_email, corrige_at")
        .in("attempt_id", attemptIds)
    : { data: [] as QrcReelle[] };

  const { data: resultats } = attemptIds.length
    ? await supabase
        .from("core_exam_results")
        .select("result_id, attempt_id, result_revision, status, score, total, qrc_restantes, published_at")
        .in("attempt_id", attemptIds)
    : { data: [] as ResultatReel[] };

  const qrcIds = (qrc ?? []).map((q) => q.qrc_instance_id);
  const { data: baremes } = qrcIds.length
    ? await supabase
        .from("qrc_bareme_restaure")
        .select("qrc_instance_id, bareme, mention, nb_preuves")
        .in("qrc_instance_id", qrcIds)
    : { data: [] as BaremeRestaure[] };

  return {
    tentatives: (attempts ?? []).map((a) => ({
      ...a,
      snapshot: asSnapshot(a.snapshot),
      candidat: nomDe.get(a.apprenant_id) ?? "(apprenant)",
    })),
    qrc: (qrc ?? []) as QrcReelle[],
    resultats: (resultats ?? []) as ResultatReel[],
    baremesRestaures: (baremes ?? []) as BaremeRestaure[],
  };
}

/** Correction formateur : événement séparé, recalcul et publication côté serveur. */
export async function corrigerQrc(params: {
  operationId: string;
  qrcInstanceId: string;
  note: number;
  commentaire?: string;
  email?: string;
}) {
  const { data, error } = await supabase.rpc("core_correct_qrc_publish", {
    p_operation_id: params.operationId,
    p_qrc_instance_id: params.qrcInstanceId,
    p_note: params.note,
    p_commentaire: params.commentaire ?? null,
    p_corrige_email: params.email ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Réponse apprenant : journal d'événements + révision, confirmée par le serveur. */
export async function enregistrerReponse(params: {
  operationId: string;
  attemptId: string;
  questionId: string;
  valeur: string;
  revisionAttendue: number;
}) {
  const { data, error } = await supabase.rpc("core_save_answer", {
    p_operation_id: params.operationId,
    p_attempt_id: params.attemptId,
    p_question_id: params.questionId,
    p_valeur: JSON.stringify(params.valeur) as unknown as never,
    p_expected_revision: params.revisionAttendue,
    p_session_origine: "pilote-test",
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function finaliserTentative(params: {
  operationId: string;
  attemptId: string;
  questionsQrc: string[];
}) {
  const { data, error } = await supabase.rpc("core_finalize_attempt", {
    p_operation_id: params.operationId,
    p_attempt_id: params.attemptId,
    p_qrc_questions: params.questionsQrc,
    p_resultat: {} as unknown as never,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function lireResultat(attemptId: string): Promise<ResultatReel | null> {
  const { data } = await supabase
    .from("core_exam_results")
    .select("result_id, attempt_id, result_revision, status, score, total, qrc_restantes, published_at")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  return (data as ResultatReel) ?? null;
}

/** Temps réel : simple signal « une nouvelle donnée serveur existe », aucune vérité métier. */
export function souscrireSignal(canal: string, table: "qrc_instances_v2" | "core_exam_results", onSignal: () => void) {
  const ch = supabase
    .channel(canal)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => onSignal())
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
