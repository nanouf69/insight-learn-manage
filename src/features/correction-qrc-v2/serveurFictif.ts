/**
 * SERVEUR FICTIF — CORRECTION QRC v2 (type Formative)
 * ───────────────────────────────────────────────────
 * Simulation 100 % en mémoire du noyau sécurisé, avec les MÊMES invariants que
 * ceux déjà imposés en base (étapes 1 et 1b) :
 *   - identité définitive d'une QRC : qrc_instance_id = session + apprenant +
 *     tentative + version d'examen + matière + question (jamais reconstruite) ;
 *   - snapshot de tentative immuable (question, réponse officielle, barème) ;
 *   - réponses en journal d'événements + révision (une révision périmée est refusée) ;
 *   - idempotence par operation_id (même opération rejouée = 1 seule opération) ;
 *   - correction formateur = événement séparé, la réponse élève n'est jamais réécrite ;
 *   - publication du résultat atomique (tout ou rien) ;
 *   - temps réel = simple notification « une nouvelle donnée serveur existe ».
 *
 * AUCUNE donnée réelle : ce module ne lit ni n'écrit la base de production.
 */

export type EtatQrc = "en_attente" | "corrigee";
export type StatutResultat = "provisoire" | "definitif";

export interface QuestionSnapshot {
  question_id: string;
  ordre: number;
  type: "QRC" | "QCM";
  enonce: string;
  reponse_officielle: string;
  bareme: number;
}

export interface MatiereSnapshot {
  subject_id: string;
  lettre: string;
  titre: string;
  ordre: number;
  questions: QuestionSnapshot[];
}

export interface Candidat {
  apprenant_id: string;
  nom: string;
  prenom: string;
}

export interface SessionFictive {
  session_id: string;
  date: string; // ISO
  heure: string;
  exam_libelle: string;
  exam_version_id: string;
  matieres: MatiereSnapshot[];
  candidats: Candidat[];
}

export interface QrcInstance {
  qrc_instance_id: string;
  session_id: string;
  apprenant_id: string;
  attempt_id: string;
  exam_version_id: string;
  subject_id: string;
  question_id: string;
  bareme: number;
  enonce: string;
  reponse_officielle: string;
  reponse_eleve: string;
  etat: EtatQrc;
  note: number | null;
  commentaire: string | null;
  revision: number;
  corrige_par: string | null;
  corrige_le: string | null;
}

export interface AnswerEvent {
  response_event_id: number;
  attempt_id: string;
  question_id: string;
  valeur: string;
  revision: number;
  created_at: string;
}

export interface Resultat {
  result_id: string;
  attempt_id: string;
  apprenant_id: string;
  result_revision: number;
  status: StatutResultat;
  score: number | null;
  qrc_restantes: number;
  published_at: string | null;
}

export interface CorrectionEvent {
  correction_event_id: number;
  qrc_instance_id: string;
  etat_precedent: EtatQrc;
  etat_nouveau: EtatQrc;
  note_precedente: number | null;
  note_nouvelle: number;
  corrige_par: string;
  operation_id: string;
  created_at: string;
}

export class ErreurServeur extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const LETTRES = ["A", "B", "C", "D", "E", "F", "G"];

export const MATIERES_EXAMEN: Omit<MatiereSnapshot, "questions">[] = [
  { subject_id: "t3p", lettre: "A", titre: "T3P", ordre: 1 },
  { subject_id: "gestion", lettre: "B", titre: "Gestion", ordre: 2 },
  { subject_id: "securite", lettre: "C", titre: "Sécurité routière", ordre: 3 },
  { subject_id: "francais", lettre: "D", titre: "Français", ordre: 4 },
  { subject_id: "anglais", lettre: "E", titre: "Anglais", ordre: 5 },
  { subject_id: "reglementation_vtc", lettre: "F", titre: "Réglementation VTC", ordre: 6 },
  { subject_id: "reglementation_vtc2", lettre: "G", titre: "Développement commercial", ordre: 7 },
];

const NOMS = [
  "DUPONT", "MARTIN", "DURAND", "BERNARD", "PETIT", "ROBERT", "RICHARD", "MOREAU",
  "SIMON", "LAURENT", "LEFEBVRE", "MICHEL", "GARCIA", "DAVID", "BERTRAND", "ROUX",
  "VINCENT", "FOURNIER", "MOREL", "GIRARD",
];
const PRENOMS = [
  "Alice", "Bilal", "Chloé", "David", "Emma", "Farid", "Gina", "Hugo", "Inès", "Jules",
  "Karim", "Léa", "Malik", "Nora", "Omar", "Paul", "Quentin", "Rita", "Samir", "Tina",
];

let _seq = 0;
const uid = (p: string) => `${p}-${(++_seq).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function construireSessionFictive(nbCandidats = 20, qrcParMatiere = 4): SessionFictive {
  const matieres: MatiereSnapshot[] = MATIERES_EXAMEN.map((m) => ({
    ...m,
    questions: Array.from({ length: qrcParMatiere }, (_, i) => ({
      question_id: `${m.subject_id}-q${i + 1}`,
      ordre: i + 1,
      type: "QRC" as const,
      enonce: `[FICTIF] ${m.titre} — question ouverte n°${i + 1} : expliquez le point ${LETTRES[i % 7]}${i + 1}.`,
      reponse_officielle: `[FICTIF] Réponse officielle attendue pour ${m.titre} n°${i + 1}, telle que figée dans le snapshot de la tentative.`,
      bareme: [2, 1.5, 1, 2][i % 4],
    })),
  }));

  return {
    session_id: uid("sess"),
    date: "2026-09-22",
    heure: "14:00",
    exam_libelle: "Examen Blanc VTC N°2 (FICTIF)",
    exam_version_id: uid("ver"),
    matieres,
    candidats: Array.from({ length: nbCandidats }, (_, i) => ({
      apprenant_id: uid("app"),
      nom: NOMS[i % NOMS.length],
      prenom: PRENOMS[i % PRENOMS.length],
    })),
  };
}

interface Reponse {
  attempt_id: string;
  question_id: string;
  valeur: string;
  revision: number;
}

export class ServeurFictif {
  sessions: SessionFictive[] = [];
  qrc = new Map<string, QrcInstance>();
  attempts = new Map<string, { attempt_id: string; apprenant_id: string; session_id: string; statut: "en_cours" | "terminee"; snapshot: MatiereSnapshot[] }>();
  events: AnswerEvent[] = [];
  reponses = new Map<string, Reponse>();
  corrections: CorrectionEvent[] = [];
  resultats = new Map<string, Resultat>();
  operations = new Map<string, unknown>();
  journal: { action: string; cible: string; at: string }[] = [];

  /** Injection de panne : la prochaine écriture correspondante échoue (test de torture). */
  pannePour: { correction?: boolean; finalisation?: boolean; reponse?: boolean } = {};

  private abonnes = new Set<() => void>();
  /** Le temps réel ne transporte AUCUNE vérité métier : simple signal de relecture. */
  souscrire(fn: () => void) {
    this.abonnes.add(fn);
    return () => this.abonnes.delete(fn);
  }
  private notifier() {
    this.abonnes.forEach((f) => f());
  }

  private rejouer<T>(operationId: string): T | undefined {
    return this.operations.get(operationId) as T | undefined;
  }

  chargerSession(session: SessionFictive, taux = 0.35) {
    this.sessions.push(session);
    for (const c of session.candidats) {
      const attempt_id = uid("att");
      this.attempts.set(attempt_id, {
        attempt_id,
        apprenant_id: c.apprenant_id,
        session_id: session.session_id,
        statut: "terminee",
        snapshot: session.matieres,
      });
      for (const m of session.matieres) {
        for (const q of m.questions) {
          const id = `${attempt_id}::${m.subject_id}::${q.question_id}`;
          this.qrc.set(id, {
            qrc_instance_id: id,
            session_id: session.session_id,
            apprenant_id: c.apprenant_id,
            attempt_id,
            exam_version_id: session.exam_version_id,
            subject_id: m.subject_id,
            question_id: q.question_id,
            bareme: q.bareme,
            enonce: q.enonce,
            reponse_officielle: q.reponse_officielle,
            reponse_eleve: `[FICTIF] Réponse de ${c.nom} à ${q.question_id}.`,
            etat: "en_attente",
            note: null,
            commentaire: null,
            revision: 1,
            corrige_par: null,
            corrige_le: null,
          });
        }
      }
      this.resultats.set(attempt_id, {
        result_id: uid("res"),
        attempt_id,
        apprenant_id: c.apprenant_id,
        result_revision: 1,
        status: "provisoire",
        score: null,
        qrc_restantes: session.matieres.reduce((n, m) => n + m.questions.length, 0),
        published_at: null,
      });
    }
    // Quelques corrections déjà faites, pour vérifier qu'elles restent visibles.
    let i = 0;
    for (const inst of this.qrc.values()) {
      if (Math.random() < taux) {
        const notes = [0, 0.5, 1, 1.5, 2].filter((n) => n <= inst.bareme);
        this.corrigerQrcSync(uid("op"), inst.qrc_instance_id, notes[i % notes.length], 1, "formateur.demo@fictif", null);
        i++;
      }
    }
  }

  /** ÉLÈVE — enregistrement d'une réponse : journal d'événements + révision. */
  enregistrerReponse(operationId: string, attemptId: string, questionId: string, valeur: string, revisionAttendue: number) {
    const rejoue = this.rejouer<AnswerEvent>(operationId);
    if (rejoue) return rejoue;
    if (this.pannePour.reponse) {
      this.pannePour.reponse = false;
      throw new ErreurServeur("RESEAU", "Réponse non enregistrée");
    }
    const att = this.attempts.get(attemptId);
    if (!att) throw new ErreurServeur("ATTEMPT_INCONNUE", "Tentative inconnue");
    if (att.statut === "terminee") throw new ErreurServeur("ATTEMPT_TERMINEE", "Tentative terminée : écriture refusée");
    if (!att.snapshot.some((m) => m.questions.some((q) => q.question_id === questionId)))
      throw new ErreurServeur("HORS_SNAPSHOT", "Question absente du snapshot de la tentative");

    const cle = `${attemptId}::${questionId}`;
    const courant = this.reponses.get(cle);
    const revActuelle = courant?.revision ?? 0;
    if (revisionAttendue !== revActuelle)
      throw new ErreurServeur("REVISION_PERIMEE", "Révision périmée : écriture refusée");

    const ev: AnswerEvent = {
      response_event_id: this.events.length + 1,
      attempt_id: attemptId,
      question_id: questionId,
      valeur,
      revision: revActuelle + 1,
      created_at: new Date().toISOString(),
    };
    this.events.push(ev);
    this.reponses.set(cle, { attempt_id: attemptId, question_id: questionId, valeur, revision: ev.revision });
    this.operations.set(operationId, ev);
    this.notifier();
    return ev;
  }

  /** FORMATEUR — correction d'une QRC (événement séparé, réponse élève intouchée). */
  corrigerQrcSync(
    operationId: string,
    qrcInstanceId: string,
    note: number,
    revisionAttendue: number,
    correcteur: string,
    commentaire: string | null,
  ): { instance: QrcInstance; resultat: Resultat } {
    const rejoue = this.rejouer<{ instance: QrcInstance; resultat: Resultat }>(operationId);
    if (rejoue) return rejoue;

    const inst = this.qrc.get(qrcInstanceId);
    if (!inst) throw new ErreurServeur("QRC_INCONNUE", "QRC inconnue");
    if (inst.revision !== revisionAttendue)
      throw new ErreurServeur("CONFLIT", "Cette QRC a déjà été corrigée ou modifiée. Rechargez la dernière version.");
    if (note < 0 || note > inst.bareme) throw new ErreurServeur("BAREME", "Note hors barème");

    if (this.pannePour.correction) {
      this.pannePour.correction = false;
      throw new ErreurServeur("RESEAU", "Correction non enregistrée");
    }

    const reponseAvant = inst.reponse_eleve;
    const etatPrecedent = inst.etat;
    const notePrecedente = inst.note;

    // Transaction : correction + recalcul + éventuelle publication.
    const attempt = this.attempts.get(inst.attempt_id)!;
    const restantesApres = [...this.qrc.values()].filter(
      (q) => q.attempt_id === inst.attempt_id && q.etat === "en_attente" && q.qrc_instance_id !== qrcInstanceId,
    ).length;
    const derniere = restantesApres === 0;
    if (derniere && this.pannePour.finalisation) {
      this.pannePour.finalisation = false;
      // rollback complet : rien n'est appliqué
      throw new ErreurServeur("FINALISATION", "Publication du résultat impossible — aucune modification enregistrée");
    }

    inst.etat = "corrigee";
    inst.note = note;
    inst.commentaire = commentaire;
    inst.revision += 1;
    inst.corrige_par = correcteur;
    inst.corrige_le = new Date().toISOString();
    inst.reponse_eleve = reponseAvant; // jamais réécrite

    this.corrections.push({
      correction_event_id: this.corrections.length + 1,
      qrc_instance_id: qrcInstanceId,
      etat_precedent: etatPrecedent,
      etat_nouveau: "corrigee",
      note_precedente: notePrecedente,
      note_nouvelle: note,
      corrige_par: correcteur,
      operation_id: operationId,
      created_at: new Date().toISOString(),
    });
    this.journal.push({ action: "qrc_corrigee", cible: qrcInstanceId, at: new Date().toISOString() });

    const resultat = this.recalculer(attempt.attempt_id);
    const sortie = { instance: { ...inst }, resultat };
    this.operations.set(operationId, sortie);
    this.notifier();
    return sortie;
  }

  /** Le score est TOUJOURS calculé par le serveur, jamais par le navigateur. */
  private recalculer(attemptId: string): Resultat {
    const instances = [...this.qrc.values()].filter((q) => q.attempt_id === attemptId);
    const restantes = instances.filter((q) => q.etat === "en_attente").length;
    const obtenu = instances.reduce((s, q) => s + (q.note ?? 0), 0);
    const total = instances.reduce((s, q) => s + q.bareme, 0);
    const prec = this.resultats.get(attemptId)!;
    const resultat: Resultat = {
      ...prec,
      result_revision: prec.result_revision + 1,
      qrc_restantes: restantes,
      status: restantes === 0 ? "definitif" : "provisoire",
      score: restantes === 0 ? Math.round((obtenu / total) * 20 * 100) / 100 : Math.round((obtenu / total) * 20 * 100) / 100,
      published_at: restantes === 0 ? new Date().toISOString() : null,
    };
    this.resultats.set(attemptId, resultat);
    return resultat;
  }

  /** Vue Admin = vue apprenant : une seule lecture serveur. */
  lireResultat(attemptId: string): Resultat {
    return { ...this.resultats.get(attemptId)! };
  }

  lireQrcSession(sessionId: string): QrcInstance[] {
    return [...this.qrc.values()].filter((q) => q.session_id === sessionId).map((q) => ({ ...q }));
  }

  attemptDe(sessionId: string, apprenantId: string) {
    return [...this.attempts.values()].find((a) => a.session_id === sessionId && a.apprenant_id === apprenantId)!;
  }
}

/** Instance unique utilisée par la maquette (données fictives uniquement). */
export function creerServeurDemo(nbCandidats = 20) {
  const serveur = new ServeurFictif();
  const session = construireSessionFictive(nbCandidats);
  serveur.chargerSession(session);
  return { serveur, session };
}
