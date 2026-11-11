// Accès au VRAI noyau sécurisé en base (aucun serveur simulé).
// Toutes les écritures passent par des fonctions serveur idempotentes.
import { supabase } from "@/integrations/supabase/client";
import { signalerCorrectionEnregistree } from "@/features/surveillance-examens/synchronisationNotes";
import { deciderRattachementCrm } from "@/features/correction-qrc-v2/rattachementCrm";
import { chargerConsultationEb2, estConsultation, lirePassagesEb2Consultation } from "@/features/correction-qrc-v2/eb2Consultation";
import { miroirsV2Prouves, nbQrcEcrites, resultatsAncienCircuit, resultatsMigres } from "@/features/correction-qrc-v2/inventaireCopies";
import { texteSourceExact } from "./menuPassages";

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
  /** Date/heure réelle du passage (affichage uniquement). */
  started_at?: string | null;
  /** Fin enregistrée par le serveur (exam_attempts_v2.finished_at) ; ordre d'affichage seulement. */
  finished_at?: string | null;
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
  /** Texte complet de la fiche élève quand le nouveau moteur n'a gardé qu'un début (défaut du 23/09). Affichage seul. */
  reponseComplete?: string | null;
};

/**
 * ORIGINE D'UNE CORRECTION — affichage uniquement, aucune écriture.
 * « humaine »      : correction réellement effectuée/validée par un formateur.
 * « automatique »  : correction automatique historique importée (jamais requalifiée en humaine).
 * « inconnue »     : trace insuffisante pour trancher — on ne suppose rien.
 * Aucune donnée n'est modifiée : la distinction est déduite de la trace existante.
 */
export type OrigineCorrection = "humaine" | "automatique" | "ia" | "inconnue" | "aucune";

const MARQUEUR_AUTOMATIQUE = "correction historique importée";
/** Correction IA (Gemini) non vérifiée humainement — voir supabase/functions/_shared/qrcIaRegles.ts. */
export const MARQUEUR_IA_PREFIXE = "ia:";

export function origineCorrection(qrc: Pick<QrcReelle, "etat" | "corrige_email">): OrigineCorrection {
  if (qrc.etat !== "corrigee") return "aucune";
  const email = (qrc.corrige_email ?? "").trim().toLowerCase();
  // Trace insuffisante : on n'affirme ni « humaine » ni « automatique ».
  if (!email) return "inconnue";
  if (email.startsWith(MARQUEUR_IA_PREFIXE)) return "ia";
  return email.startsWith(MARQUEUR_AUTOMATIQUE) ? "automatique" : "humaine";
}

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
  /** Circuit de correction à utiliser. EB3 reste toujours dans le circuit historique. */
  circuit?: "v2" | "ancien";
  /** Lignes historiques finalisées autorisées dans le correcteur ancien. */
  legacyResultIds?: string[];
  /** Dates réelles de passage regroupées sous le même numéro d'Examen Blanc (jamais fusionnées entre EB). */
  dates: DatePassage[];
  /** Apprenant de chaque passage (recherche de candidat, affichage seul). */
  apprenantParAttempt?: Record<string, string>;
  /** Autres sessions affichant le même passage EB1-TAXI, sans nouvelle copie ni écriture. */
  inscriptionCroiseeParAttempt?: Record<string, string[]>;
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

/**
 * Tentatives neutralisées (notes 0 techniques : clôture sans aucune réponse serveur).
 * Elles restent en base, intactes, mais ne sont plus affichées ni à corriger.
 */
async function idsNeutralises(): Promise<Set<string>> {
  const data = await lirePagesParalleles<{attempt_id:string}>(de => supabase.from("core_tentatives_neutralisees").select("attempt_id").order("attempt_id").range(de,de+999),1);
  return new Set(data.map(r => r.attempt_id));
}


/** Liste des sessions (examen + jour), de la plus récente à la plus ancienne. */
export async function listerSessions(mode: "test" | "migre" = "migre"): Promise<SessionListee[]> {
  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id, exam_id, started_at")
    .eq("is_test", mode === "test")
    .order("started_at", { ascending: false });
  if (error) throw error;
  const neutralises = await idsNeutralises();

  const par = new Map<string, SessionListee>();
  for (const a of (data ?? []).filter((a: any) => !neutralises.has(a.attempt_id as string))) {
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
  /** Dates de la session CRM (brutes ISO) — servent à la mise en évidence « EN COURS ». */
  debut: string | null;
  fin: string | null;
  /** Tri : date de début de la session CRM (ou date du passage le plus récent). */
  tri: string;
  nbCandidats: number;
  examens: SessionListee[];
};

const jourFr = (j: string) => j.split("-").reverse().join("/");

/** Numéro d'Examen Blanc lu dans l'identifiant (EB1, eb2-ta, EB3-TAXI…). Sert uniquement au tri. */
const numeroEb = (examId: string) => {
  const m = /^eb(\d+)/i.exec(examId.trim());
  return m ? Number(m[1]) : 999;
};

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
/** Pagination complète (ordre stable) par vagues de pages parallèles ; erreur = erreur. */
export async function lirePagesParalleles<T>(lirePage: (de: number) => PromiseLike<{ data: T[] | null; error: unknown }>, vague = 4): Promise<T[]> {
  const out: T[] = [];
  for (let base = 0; ; base += vague * 1000) {
    const pages = await Promise.all(Array.from({ length: vague }, (_, k) => lirePage(base + k * 1000)));
    for (const p of pages) {
      if (p.error) throw p.error;
      const d = p.data ?? [];
      out.push(...d);
      if (d.length < 1000) return out;
    }
  }
}

/** Lots d'identifiants traités 4 par 4 en parallèle, ordre des résultats conservé. */
async function parLotsParalleles<T>(ids: string[], taille: number, lire: (lot: string[]) => Promise<T[]>): Promise<T[]> {
  const lots: string[][] = [];
  for (let k = 0; k < ids.length; k += taille) lots.push(ids.slice(k, k + taille));
  const out: T[] = [];
  for (let k = 0; k < lots.length; k += 4) for (const r of await Promise.all(lots.slice(k, k + 4).map(lire))) out.push(...r);
  return out;
}

// Dernière liste lue (mémoire de l'onglet seulement, jamais stockée) et lecture en cours partagée :
// la réouverture de l'onglet affiche immédiatement la liste précédente pendant l'actualisation serveur.
const derniereListe = new Map<string, GroupeSessionCrm[]>();
const lectureEnCours = new Map<string, Promise<GroupeSessionCrm[]>>();
export function listeGroupesEnMemoire(mode: "test" | "migre" = "migre"): GroupeSessionCrm[] | null {
  return derniereListe.get(mode) ?? null;
}
export function listerGroupesCrm(mode: "test" | "migre" = "migre"): Promise<GroupeSessionCrm[]> {
  const enCours = lectureEnCours.get(mode);
  if (enCours) return enCours;
  const p = listerGroupesCrmServeur(mode)
    .then((l) => { derniereListe.set(mode, l); return l; })
    .finally(() => lectureEnCours.delete(mode));
  lectureEnCours.set(mode, p);
  return p;
}

async function listerGroupesCrmServeur(mode: "test" | "migre"): Promise<GroupeSessionCrm[]> {
  // Lectures indépendantes lancées en parallèle (auparavant ~30 pages lues l'une après l'autre).
  const db = supabase as any;
  const pAttempts = lirePagesParalleles<any>((de) => db
      .from("exam_attempts_v2")
      .select("attempt_id, apprenant_id, exam_id, started_at, finished_at, etat, matiere:snapshot->>matiere, rid:snapshot->source_historique->>result_id")
      .eq("is_test", mode === "test")
      .eq("etat", "terminee")
      .order("started_at", { ascending: false })
      .order("attempt_id", { ascending: true })
      .range(de, de + 999));
  const pQrcV2 = mode === "migre" ? lirePagesParalleles<any>((de) => db.from("qrc_instances_v2")
      .select("qrc_instance_id, attempt_id, reponse").order("qrc_instance_id", { ascending: true }).range(de, de + 999)) : Promise.resolve([] as any[]);
  const pBruts = mode === "migre" ? lirePagesParalleles<any>((de) => db
        .from("apprenant_quiz_results")
        .select("id, apprenant_id, quiz_id, matiere_id, completed_at, rep:details->reponses")
        .eq("quiz_type", "examen_blanc")
        .ilike("quiz_id", "eb%")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .order("id", { ascending: true })
        .range(de, de + 999), 1) : Promise.resolve([] as any[]);
  const pConsultation = mode === "migre" ? lirePassagesEb2Consultation() : Promise.resolve([] as any[]);
  const [attempts, qrcV2Lu, brutsLus, consultationLue, neutralisesLus] = await Promise.all([pAttempts, pQrcV2, pBruts, pConsultation, idsNeutralises()]);

  // Toutes les copies historiques d'EB (EB1…EB6, VTC/TAXI/TA/VA) non migrées vers V2 et
  // hors EB2 VTC (consultation V2) sont listées dans le même menu, sans copie ni migration.
  // Les copies déjà migrées sont exclues ici : elles apparaissent une seule fois, côté V2.
  const legacyResults: any[] = [];
  if (mode === "migre") {
    const migres = resultatsMigres(attempts as any);
    const qrcV2 = qrcV2Lu;
    const bruts = brutsLus;
    // Miroirs prouvés d'un passage V2 natif (mêmes réponses QRC exactes) : affichés une seule fois, côté V2.
    for (const m of miroirsV2Prouves(bruts, attempts as any, qrcV2)) migres.add(m);
    {
      // Toutes les copies remises restent consultables, même sans QRC écrite.
      const anciens = resultatsAncienCircuit(bruts, migres)
        .map(({ rep: _rep, ...r }: any) => r);
      legacyResults.push(...anciens.map((r: any) => ({
        ...r,
        attempt_id: `ancien:${r.id}`,
        exam_id: r.quiz_id,
        started_at: r.completed_at,
        circuit: "ancien" as const,
      })));
    }
  }

  // EB2 VTC : copies enregistrées sans fiche V2, affichées dans la même grille V2 en consultation.
  const consultationEb2: any[] = [];
  if (mode === "migre") {
    for (const r of consultationLue) {
      consultationEb2.push({ ...r, attempt_id: `consultation:${r.id}`, exam_id: "EB2", started_at: r.completed_at, circuit: "v2" as const });
    }
  }

  const neutralises = neutralisesLus;
  const passages = [
    ...attempts.filter((a) => !neutralises.has(a.attempt_id as string)).map((a) => ({ ...a, started_at: a.finished_at ?? a.started_at, circuit: "v2" as const })),
    ...consultationEb2,
    ...legacyResults,
  ];

  const apprenantIds = Array.from(new Set(passages.map((a) => a.apprenant_id as string)));
  // Lectures par lots de 150 : une liste d'identifiants trop longue dans l'URL échouerait
  // et ferait basculer silencieusement des candidats (dont cours du soir) hors de leur session.
  const parLot = await parLotsParalleles(apprenantIds, 150, async (lot) => {
    const [{ data: a, error: ea }, l] = await Promise.all([
      supabase.from("apprenants").select("id, type_apprenant").in("id", lot),
      lirePagesParalleles<any>((de) => supabase
        .from("session_apprenants")
        .select("id, apprenant_id, session_id, date_debut, date_fin")
        .in("apprenant_id", lot)
        .order("id", { ascending: true })
        .range(de, de + 999) as any, 1),
    ]);
    if (ea) throw ea;
    return [{ a: (a ?? []) as any[], l }];
  });
  const apprenants: { id: string; type_apprenant: string | null }[] = parLot.flatMap((x) => x.a);
  const liens: any[] = parLot.flatMap((x) => x.l);
  const typesApprenant = new Map(
    (apprenants ?? []).map((a) => [a.id, (a.type_apprenant ?? "").trim().toLowerCase()]),
  );
  const estElearning = new Map(
    (apprenants ?? []).map((a) => [a.id, /-e$/.test((a.type_apprenant ?? "").trim().toLowerCase())]),
  );

  const sessionIds = Array.from(new Set(liens.map((l: any) => l.session_id as string)));
  const sessionsCrm: any[] = await parLotsParalleles(sessionIds, 150, async (lot) => {
    const { data: sx, error: es } = await supabase.from("sessions").select("id, nom, date_debut, date_fin").in("id", lot);
    if (es) throw es;
    return (sx ?? []) as any[];
  });
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
    autresSessionsCroisees?: string[],
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
    // Un seul bloc par numéro d'Examen Blanc dans la session CRM ; les dates réelles
    // de passage sont conservées à l'intérieur (jamais de fusion entre EB différents).
    const ancien = a.circuit === "ancien";
    const cleEb = `${cle}::${a.exam_id}${ancien ? "::ancien" : ""}`;
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
        circuit: ancien ? "ancien" : "v2",
        legacyResultIds: ancien ? [] : undefined,
        dates: [],
      };
      g.examens.push(eb);
    }
    eb.attemptIds.push(a.attempt_id as string);
    (eb.apprenantParAttempt ??= {})[a.attempt_id as string] = a.apprenant_id as string;
    if (autresSessionsCroisees?.length) {
      (eb.inscriptionCroiseeParAttempt ??= {})[a.attempt_id as string] = autresSessionsCroisees;
    }
    if (ancien && a.id) eb.legacyResultIds?.push(a.id as string);
    let dt = eb.dates.find((x) => x.jour === jour);
    if (!dt) {
      dt = { jour, date: jourFr(jour), heureMin: heure, heureMax: heure, attemptIds: [] };
      eb.dates.push(dt);
    }
    dt.attemptIds.push(a.attempt_id as string);
    if (heure < dt.heureMin) dt.heureMin = heure;
    if (heure > dt.heureMax) dt.heureMax = heure;
    if (jour < eb.jour) { eb.jour = jour; eb.date = jourFr(jour); }
    if (heure < eb.heureMin) eb.heureMin = heure;
    if (heure > eb.heureMax) eb.heureMax = heure;
    if (base.type !== "crm" && jour > g.tri) g.tri = jour;
    groupes.set(cle, g);
  };

  for (const a of passages as any[]) {
    const jour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(
      new Date(a.started_at as string),
    );
    if (estElearning.get(a.apprenant_id)) {
      ajouter("elearning", {
        type: "elearning",
        libelle: "E-learning — toutes sessions confondues",
        periode: null,
        debut: null,
        fin: null,
        tri: "0000-00-00",
      }, a);
      continue;
    }
    const decision = deciderRattachementCrm({
      jour,
      examId: a.exam_id as string,
      typeApprenant: typesApprenant.get(a.apprenant_id) ?? "",
      liens: liensDe.get(a.apprenant_id) ?? [],
    });
    if (decision.type === "unique" || decision.type === "croisee") {
      for (const lien of decision.sessions) {
        const s = lien.session;
        const autresSessions = decision.type === "croisee"
          ? decision.sessions.filter((autre) => autre.session.id !== s.id).map((autre) => autre.session.nom ?? "Session sans nom")
          : undefined;
        ajouter(`crm:${s.id}`, {
          type: "crm",
          libelle: s.nom ?? "Session sans nom",
          periode: `${jourFr(s.date_debut)} → ${jourFr(s.date_fin)}`,
          debut: (s.date_debut as string) ?? null,
          fin: (s.date_fin as string) ?? null,
          tri: s.date_debut as string,
        }, a, autresSessions);
      }
    } else if (decision.type === "indetermine") {
      ajouter("indetermine", {
        type: "indetermine",
        libelle: "⚠️ Session CRM non déterminée",
        periode: null,
        debut: null,
        fin: null,
        tri: "0000-00-00",
      }, a);
    } else {
      ajouter("conflit", {
        type: "conflit",
        libelle: "⚠️ Conflit de sessions CRM (plusieurs sessions se chevauchent)",
        periode: null,
        debut: null,
        fin: null,
        tri: "0000-00-00",
      }, a);
    }
  }

  const rang = { crm: 0, elearning: 1, indetermine: 2, conflit: 3 } as const;
  return Array.from(groupes.values())
    .map((g) => {
      g.nbCandidats = g.candidats.size;
      // EB1 → EB2 → … puis, à type d'examen égal, ordre alphabétique de la filière (VTC, TAXI, TA, VA).
      g.examens.sort(
        (a, b) => numeroEb(a.exam_id) - numeroEb(b.exam_id) || a.exam_id.toUpperCase().localeCompare(b.exam_id.toUpperCase()),
      );
      // À l'intérieur d'un EB : dates de la plus ancienne à la plus récente.
      for (const e of g.examens) e.dates.sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
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
  // Un EB peut regrouper plusieurs dates : les listes d'identifiants sont lues par lots.
  const parLots = async <T,>(ids: string[], lire: (lot: string[]) => Promise<T[]>): Promise<T[]> => {
    const out: T[] = [];
    for (let i = 0; i < ids.length; i += 150) out.push(...(await lire(ids.slice(i, i + 150))));
    return out;
  };

  // Copies EB2 en consultation : lues à part (identifiant non V2), jamais envoyées au moteur V2.
  const consultation = mode === "migre" && attemptIdsFiltre?.some(estConsultation)
    ? await chargerConsultationEb2(attemptIdsFiltre)
    : null;
  if (attemptIdsFiltre) attemptIdsFiltre = attemptIdsFiltre.filter((a) => !estConsultation(a));
  if (consultation && attemptIdsFiltre && attemptIdsFiltre.length === 0) return consultation;

  const colonnes = "attempt_id, apprenant_id, exam_id, exam_version_id, etat, snapshot, snapshot_fingerprint, started_at, finished_at";
  let attempts: any[] = [];
  if (attemptIdsFiltre?.length) {
    attempts = await parLots(attemptIdsFiltre, async (lot) => {
      const { data, error } = await supabase
        .from("exam_attempts_v2")
        .select(colonnes)
        .eq("is_test", mode === "test")
        .in("attempt_id", lot)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    });
    attempts.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
  } else {
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase
        .from("exam_attempts_v2")
        .select(colonnes)
        .eq("is_test", mode === "test")
        .order("attempt_id", { ascending: true })
        .range(de, de + 999);
      if (error) throw error;
      attempts.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
  }

  const neutralises = await idsNeutralises();
  attempts = attempts.filter((a) => !neutralises.has(a.attempt_id as string));



  const ids = Array.from(new Set(attempts.map((a) => a.apprenant_id as string)));
  const apprenants = await parLots(ids, async (lot) => {
      const { data, error } = await supabase.from("apprenants").select("id, nom, prenom").in("id", lot);
      if (error) throw error;
    return (data ?? []) as { id: string; nom: string; prenom: string }[];
  });
  const nomDe = new Map(apprenants.map((a) => [a.id, `${a.nom} ${a.prenom}`]));

  const attemptIds = attempts.map((a) => a.attempt_id as string);
  const qrc = await parLots(attemptIds, async (lot) => {
    return lirePagesParalleles<QrcReelle>(async (de) => {
      const {data,error} = await supabase
      .from("qrc_instances_v2")
      .select("qrc_instance_id, attempt_id, question_id, apprenant_id, reponse, etat, note, corrige_email, corrige_at")
      .in("attempt_id", lot)
      .order("qrc_instance_id", { ascending: true })
      .range(de, de + 999);
      return {data:data as QrcReelle[] | null,error};
    }, 1);
  });

  // Aucune dernière fiche d'une autre tentative ne remplace la copie sélectionnée.
  const parAttempt = new Map(attempts.map(a => [a.attempt_id, a]));
  for (const q of qrc) {
    const exact = texteSourceExact(parAttempt.get(q.attempt_id)?.snapshot, q.question_id);
    if (exact && exact !== q.reponse) q.reponseComplete = exact;
  }

  const resultats = await parLots(attemptIds, async (lot) => {
    const { data, error } = await supabase
      .from("core_exam_results")
      .select("result_id, attempt_id, result_revision, status, score, total, qrc_restantes, published_at")
      .in("attempt_id", lot);
    if (error) throw error;
    return (data ?? []) as ResultatReel[];
  });

  const qrcIds = qrc.map((q) => q.qrc_instance_id);
  const baremes = await parLots(qrcIds, async (lot) => {
    const { data, error } = await supabase
      .from("qrc_bareme_restaure")
      .select("qrc_instance_id, bareme, mention, nb_preuves")
      .in("qrc_instance_id", lot);
    if (error) throw error;
    return (data ?? []) as BaremeRestaure[];
  });

  return {
    tentatives: [...attempts.map((a) => ({
      ...a,
      snapshot: asSnapshot(a.snapshot),
      candidat: nomDe.get(a.apprenant_id) ?? "(apprenant)",
    })) as TentativeReelle[], ...(consultation?.tentatives ?? [])],
    qrc: [...qrc, ...(consultation?.qrc ?? [])],
    resultats,
    baremesRestaures: baremes,
  };
}

/**
 * Identifiant d'opération déterministe (UUID) construit à partir d'une clé stable.
 * Le serveur attend un uuid : la même clé produit toujours le même identifiant,
 * donc un double-clic ou 10 envois réseau ne créent qu'une seule écriture.
 */
export function uuidDeterministe(cle: string): string {
  let h1 = 0x9e3779b1, h2 = 0x85ebca6b, h3 = 0xc2b2ae35, h4 = 0x27d4eb2f;
  for (let i = 0; i < cle.length; i++) {
    const c = cle.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
    h3 = Math.imul(h3 ^ (c + i), 2246822519);
    h4 = Math.imul(h4 ^ (c + h1), 3266489917);
  }
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** Correction formateur : événement séparé, recalcul et publication côté serveur. */
export async function corrigerQrc(params: {
  operationId: string;
  qrcInstanceId: string;
  /** Copie corrigée : relue par le panneau « Actualiser les notes » après l'écriture. */
  attemptId?: string;
  note: number;
  commentaire?: string;
  email?: string;
}) {
  const { data, error } = await supabase.rpc("core_correct_qrc_publish", {
    p_operation_id: uuidDeterministe(params.operationId),
    p_qrc_instance_id: params.qrcInstanceId,
    p_note: params.note,
    p_commentaire: params.commentaire ?? null,
    p_corrige_email: params.email ?? null,
  });
  if (error) throw error;
  signalerCorrectionEnregistree((data as Record<string, unknown> | null)?.attempt_id as string | undefined ?? params.attemptId);
  return data as Record<string, unknown>;
}

/**
 * Révision volontaire d'une correction déjà validée.
 * L'ancienne correction n'est jamais effacée : elle reste dans l'historique
 * (qrc_correction_events) et dans le journal d'audit.
 */
export async function reviserQrc(params: {
  operationId: string;
  qrcInstanceId: string;
  /** Copie corrigée : relue par le panneau « Actualiser les notes » après l'écriture. */
  attemptId?: string;
  note: number;
  noteAttendue: number;
  commentaire?: string;
  email?: string;
}) {
  const { data, error } = await supabase.rpc("core_revise_qrc_publish", {
    p_operation_id: uuidDeterministe(params.operationId),
    p_qrc_instance_id: params.qrcInstanceId,
    p_note: params.note,
    p_note_attendue: params.noteAttendue,
    p_commentaire: params.commentaire ?? null,
    p_corrige_email: params.email ?? null,
  });
  if (error) throw error;
  signalerCorrectionEnregistree((data as Record<string, unknown> | null)?.attempt_id as string | undefined ?? params.attemptId);
  return data as Record<string, unknown>;
}

/**
 * Commentaire seul sur une QRC V2 déjà corrigée : nouvel événement append-only, même note.
 * CAS sur la note et le dernier événement relu ; même opération = rejeu sans nouvelle écriture.
 */
export async function commenterQrc(params: {
  operationId: string;
  qrcInstanceId: string;
  noteAttendue: number;
  dernierEvenementAttendu: number | null;
  commentaire: string;
  email?: string;
}) {
  const { data, error } = await (supabase as any).rpc("core_commenter_qrc", {
    p_operation_id: uuidDeterministe(params.operationId),
    p_qrc_instance_id: params.qrcInstanceId,
    p_note_attendue: params.noteAttendue,
    p_dernier_evenement_attendu: params.dernierEvenementAttendu,
    p_commentaire: params.commentaire,
    p_corrige_email: params.email ?? null,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export type EvenementCorrection = {
  /** V2 : identité de l'événement (version CAS du commentaire seul). */
  correction_event_id?: number | null;
  /** Ancien circuit : numéro de révision du journal (version CAS). */
  revision?: number | null;
  etat_precedent: string | null;
  etat_nouveau: string | null;
  note_precedente: number | null;
  note_nouvelle: number | null;
  corrige_email: string | null;
  created_at: string;
  commentaire?: string | null;
};

/** Historique complet des corrections d'une QRC (lecture seule). */
export async function lireHistoriqueQrc(qrcInstanceId: string): Promise<EvenementCorrection[]> {
  const { data, error } = await supabase
    .from("qrc_correction_events")
    .select("correction_event_id, etat_precedent, etat_nouveau, note_precedente, note_nouvelle, corrige_email, created_at, commentaire")
    .eq("qrc_instance_id", qrcInstanceId)
    .order("created_at", { ascending: true })
    .order("correction_event_id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EvenementCorrection[];
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
export function souscrireSignal(canal: string, table: "qrc_instances_v2" | "core_exam_results" | "exam_attempts_v2" | "apprenant_quiz_results", onSignal: () => void, filter?: string) {
  const ch = supabase
    .channel(canal)
    .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, () => onSignal())
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
