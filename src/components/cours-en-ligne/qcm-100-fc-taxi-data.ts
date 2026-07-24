// QCM 100 QUESTIONS — Formation Continue TAXI
// Sélection de 100 questions au total, réparties en 4 matières :
//   • T3P                           (25 questions)
//   • Sécurité Routière             (25 questions)
//   • Réglementation Nationale      (25 questions)
//   • Développement Commercial      (25 questions)
//
// Les questions proviennent directement des Bilans Exercices et
// des exercices officiels — toute édition admin s'y répercute
// automatiquement puisque nous clonons à l'exécution.

import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { DEV_COMMERCIAL_EXERCICES } from "./exercices/dev-commercial-exercices-data";

const PER_MATIERE = 25;

function pickFirstN<T>(arr: T[], n: number): T[] {
  return (arr || []).slice(0, n);
}

function renumber(questions: any[]) {
  return questions.map((q, i) => ({ ...q, id: i + 1 }));
}

function getBilanQuestions(bilanId: number): any[] {
  const bilan = BILAN_EXERCICES_TAXI.find((b: any) => b.id === bilanId);
  return bilan ? (bilan as any).questions || [] : [];
}

const T3P_Q = pickFirstN(getBilanQuestions(100), PER_MATIERE);
const SECU_Q = pickFirstN(getBilanQuestions(102), PER_MATIERE);
const REGN_Q = pickFirstN(getBilanQuestions(203), PER_MATIERE);
const DEVC_Q = pickFirstN(
  DEV_COMMERCIAL_EXERCICES[0]?.questions || [],
  PER_MATIERE,
);

export const QCM_100_FC_TAXI = [
  {
    id: 95001,
    titre: "📕 T3P",
    sousTitre: `${T3P_Q.length} questions — Transport public particulier de personnes`,
    actif: true,
    questions: renumber(JSON.parse(JSON.stringify(T3P_Q))),
  },
  {
    id: 95002,
    titre: "📕 Sécurité Routière",
    sousTitre: `${SECU_Q.length} questions — Signalisation, vitesses, distances, infractions`,
    actif: true,
    questions: renumber(JSON.parse(JSON.stringify(SECU_Q))),
  },
  {
    id: 95003,
    titre: "📕 Réglementation Nationale",
    sousTitre: `${REGN_Q.length} questions — ADS, Carte pro, Tarification, Sanctions`,
    actif: true,
    questions: renumber(JSON.parse(JSON.stringify(REGN_Q))),
  },
  {
    id: 95004,
    titre: "📕 Développement Commercial",
    sousTitre: `${DEVC_Q.length} questions — Mercatique, SWOT, PESTEL, Fidélisation, Devis & Facture`,
    actif: true,
    questions: renumber(JSON.parse(JSON.stringify(DEVC_Q))),
  },
];

export const QCM_100_FC_TAXI_TOTAL_QUESTIONS =
  QCM_100_FC_TAXI.reduce((acc, ex) => acc + (ex.questions?.length || 0), 0);
