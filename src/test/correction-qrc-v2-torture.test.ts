import { describe, it, expect, beforeEach } from 'vitest';
import {
  ServeurFictif,
  construireSessionFictive,
  ErreurServeur,
  type SessionFictive,
} from '@/features/correction-qrc-v2/serveurFictif';

/**
 * TEST DE TORTURE — correction QRC v2, 100 % données fictives.
 * Aucune donnée réelle n'est lue ni écrite.
 */
let s: ServeurFictif;
let session: SessionFictive;

beforeEach(() => {
  s = new ServeurFictif();
  session = construireSessionFictive(20, 4);
  s.chargerSession(session, 0); // aucune correction préremplie : état de départ maîtrisé
});

const uneQrc = () => [...s.qrc.values()][0];

describe('Torture — identité et intégrité des QRC', () => {
  it('20 candidats × 7 matières × 4 QRC = 560 instances uniques, aucun doublon', () => {
    const ids = [...s.qrc.keys()];
    expect(ids).toHaveLength(20 * 7 * 4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque QRC est rattachée définitivement à session + apprenant + tentative + version + matière + question', () => {
    for (const q of s.qrc.values()) {
      expect(q.session_id).toBe(session.session_id);
      expect(q.exam_version_id).toBe(session.exam_version_id);
      expect(q.qrc_instance_id).toBe(`${q.attempt_id}::${q.subject_id}::${q.question_id}`);
    }
  });

  it('deux tentatives du même apprenant ne partagent aucune instance QRC', () => {
    const avant = new Set(s.qrc.keys());
    s.chargerSession(construireSessionFictive(1, 2), 0);
    expect([...s.qrc.keys()].filter((k) => avant.has(k))).toHaveLength(avant.size);
    expect(new Set(s.qrc.keys()).size).toBe(s.qrc.size);
  });

  it('la réponse officielle vient du snapshot de la tentative, pas de la version courante', () => {
    const q = uneQrc();
    session.matieres[0].questions[0].reponse_officielle = 'CONTENU MODIFIÉ APRÈS COUP';
    const apres = s.qrc.get(q.qrc_instance_id)!;
    expect(apres.reponse_officielle).toBe(q.reponse_officielle);
  });
});

describe('Torture — réponses apprenant', () => {
  it('conserve A puis C puis B dans le journal, réponse courante = B', () => {
    const att = [...s.attempts.values()][0];
    att.statut = 'en_cours';
    const qid = att.snapshot[0].questions[0].question_id;
    s.enregistrerReponse('op-1', att.attempt_id, qid, 'A', 0);
    s.enregistrerReponse('op-2', att.attempt_id, qid, 'C', 1);
    s.enregistrerReponse('op-3', att.attempt_id, qid, 'B', 2);
    expect(s.events.map((e) => e.valeur)).toEqual(['A', 'C', 'B']);
    expect(s.reponses.get(`${att.attempt_id}::${qid}`)!.valeur).toBe('B');
  });

  it('refuse une révision périmée sans perdre l\'historique', () => {
    const att = [...s.attempts.values()][0];
    att.statut = 'en_cours';
    const qid = att.snapshot[0].questions[0].question_id;
    s.enregistrerReponse('op-1', att.attempt_id, qid, 'A', 0);
    s.enregistrerReponse('op-2', att.attempt_id, qid, 'C', 1);
    expect(() => s.enregistrerReponse('op-3', att.attempt_id, qid, 'PERIME', 1)).toThrow(ErreurServeur);
    expect(s.reponses.get(`${att.attempt_id}::${qid}`)!.valeur).toBe('C');
    expect(s.events).toHaveLength(2);
  });

  it('refuse une question hors snapshot et une écriture après la fin', () => {
    const att = [...s.attempts.values()][0];
    att.statut = 'en_cours';
    expect(() => s.enregistrerReponse('x1', att.attempt_id, 'question-eb1', 'A', 0)).toThrow(/snapshot/i);
    att.statut = 'terminee';
    const qid = att.snapshot[0].questions[0].question_id;
    expect(() => s.enregistrerReponse('x2', att.attempt_id, qid, 'A', 0)).toThrow(/terminée/i);
  });

  it('double-clic / F5 / retry : le même operation_id 10 fois = 1 seul événement', () => {
    const att = [...s.attempts.values()][0];
    att.statut = 'en_cours';
    const qid = att.snapshot[0].questions[0].question_id;
    for (let i = 0; i < 10; i++) s.enregistrerReponse('op-idem', att.attempt_id, qid, 'A', 0);
    expect(s.events).toHaveLength(1);
  });

  it('une panne réseau ne crée aucun événement partiel', () => {
    const att = [...s.attempts.values()][0];
    att.statut = 'en_cours';
    const qid = att.snapshot[0].questions[0].question_id;
    s.pannePour.reponse = true;
    expect(() => s.enregistrerReponse('op-ko', att.attempt_id, qid, 'A', 0)).toThrow();
    expect(s.events).toHaveLength(0);
    s.enregistrerReponse('op-ok', att.attempt_id, qid, 'A', 0); // retry
    expect(s.events).toHaveLength(1);
  });
});

describe('Torture — corrections formateur', () => {
  it('enregistre une correction et ne réécrit jamais la réponse élève', () => {
    const q = uneQrc();
    const avant = q.reponse_eleve;
    s.corrigerQrcSync('c1', q.qrc_instance_id, 1.5, 1, 'form@fictif', 'ok');
    const apres = s.qrc.get(q.qrc_instance_id)!;
    expect([apres.etat, apres.note, apres.reponse_eleve]).toEqual(['corrigee', 1.5, avant]);
    expect(s.corrections).toHaveLength(1);
  });

  it('une QRC notée 0 est bien CORRIGÉE (verte), pas en attente', () => {
    const q = uneQrc();
    s.corrigerQrcSync('c0', q.qrc_instance_id, 0, 1, 'form@fictif', null);
    expect(s.qrc.get(q.qrc_instance_id)!.etat).toBe('corrigee');
  });

  it('deux formateurs simultanés : la seconde correction est refusée, la première conservée', () => {
    const q = uneQrc();
    s.corrigerQrcSync('c1', q.qrc_instance_id, 2, 1, 'form-a@fictif', null);
    expect(() => s.corrigerQrcSync('c2', q.qrc_instance_id, 0, 1, 'form-b@fictif', null)).toThrow(/déjà été corrigée/i);
    expect(s.qrc.get(q.qrc_instance_id)!.note).toBe(2);
    expect(s.corrections).toHaveLength(1);
  });

  it('même operation_id envoyé 10 fois = 1 seule correction', () => {
    const q = uneQrc();
    for (let i = 0; i < 10; i++) s.corrigerQrcSync('c-idem', q.qrc_instance_id, 1, 1, 'form@fictif', null);
    expect(s.corrections).toHaveLength(1);
  });

  it('un échec serveur pendant la correction ne laisse aucune trace', () => {
    const q = uneQrc();
    s.pannePour.correction = true;
    expect(() => s.corrigerQrcSync('c-ko', q.qrc_instance_id, 2, 1, 'form@fictif', null)).toThrow();
    const apres = s.qrc.get(q.qrc_instance_id)!;
    expect([apres.etat, apres.note, apres.revision, s.corrections.length]).toEqual(['en_attente', null, 1, 0]);
  });

  it('refuse une note hors barème', () => {
    const q = [...s.qrc.values()].find((x) => x.bareme === 1)!;
    expect(() => s.corrigerQrcSync('c-b', q.qrc_instance_id, 2, 1, 'form@fictif', null)).toThrow(/barème/i);
  });
});

describe('Torture — résultat serveur', () => {
  const corrigerTout = (attemptId: string, sauf = 0) => {
    const list = [...s.qrc.values()].filter((q) => q.attempt_id === attemptId);
    list.slice(0, list.length - sauf).forEach((q, i) =>
      s.corrigerQrcSync(`r${attemptId}-${i}`, q.qrc_instance_id, q.bareme, q.revision, 'form@fictif', null),
    );
    return list;
  };

  it('reste PROVISOIRE tant qu\'il reste une QRC, et n\'est jamais publié trop tôt', () => {
    const att = [...s.attempts.values()][0];
    corrigerTout(att.attempt_id, 1);
    const r = s.lireResultat(att.attempt_id);
    expect([r.status, r.qrc_restantes > 0, r.published_at]).toEqual(['provisoire', true, null]);
  });

  it('la dernière QRC publie le résultat définitif dans la même opération', () => {
    const att = [...s.attempts.values()][0];
    corrigerTout(att.attempt_id);
    const r = s.lireResultat(att.attempt_id);
    expect([r.status, r.qrc_restantes, r.score]).toEqual(['definitif', 0, 20]);
    expect(r.published_at).not.toBeNull();
  });

  it('un échec au moment de la publication annule tout (aucun état partiel)', () => {
    const att = [...s.attempts.values()][0];
    const list = corrigerTout(att.attempt_id, 1);
    const derniere = list[list.length - 1];
    s.pannePour.finalisation = true;
    expect(() => s.corrigerQrcSync('fin-ko', derniere.qrc_instance_id, 2, derniere.revision, 'form@fictif', null)).toThrow();
    const r = s.lireResultat(att.attempt_id);
    expect([r.status, s.qrc.get(derniere.qrc_instance_id)!.etat]).toEqual(['provisoire', 'en_attente']);
    // reprise possible après l'erreur
    s.corrigerQrcSync('fin-ok', derniere.qrc_instance_id, 2, derniere.revision, 'form@fictif', null);
    expect(s.lireResultat(att.attempt_id).status).toBe('definitif');
  });

  it('Admin et apprenant lisent exactement le même résultat serveur', () => {
    const att = [...s.attempts.values()][0];
    corrigerTout(att.attempt_id);
    expect(s.lireResultat(att.attempt_id)).toEqual(s.lireResultat(att.attempt_id));
  });

  it('le temps réel ne transporte aucune donnée : il ne fait que signaler', () => {
    const recus: unknown[] = [];
    s.souscrire(() => recus.push(undefined));
    const q = uneQrc();
    s.corrigerQrcSync('rt', q.qrc_instance_id, 1, 1, 'form@fictif', null);
    expect(recus).toEqual([undefined]);
  });
});
