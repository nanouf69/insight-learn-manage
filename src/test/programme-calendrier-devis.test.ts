import { describe, expect, it } from "vitest";
import {
  calendrierSession, formationProgramme, joursOuvres, modulesElearning, PLAGES_JOURNEE, PLAGES_SOIREE,
  sessionsPourFormation, type SessionPublique,
} from "@/lib/programmeCalendrierDevis";
import { buildProgrammeCalendrierPDF } from "@/lib/pdf/programme-calendrier-devis";

const taxi4janv: SessionPublique = {
  id: "t", nom: "Session TAXI et TA - Du 4 au 25 janvier 2027", type_session: "theorique",
  date_debut: "2027-01-04", date_fin: "2027-01-25", heure_debut: null, heure_fin: null, heures_total: null,
  lieu: "86 route de Genas 69003 Lyon", types_apprenant: ["TAXI", "TA"], jours: [],
};
const soir: SessionPublique = { ...taxi4janv, id: "s", nom: "Session VTC cours du soir", types_apprenant: ["VTC"], date_debut: "2027-02-01", date_fin: "2027-02-12" };
const examen: SessionPublique = { ...taxi4janv, id: "e", nom: "Session examen — 26 janvier 2027", type_session: "examen", date_debut: "2027-01-26", date_fin: "2027-01-26", heure_debut: "14:00", heure_fin: "16:00", types_apprenant: [] };

describe("totaux du programme e-learning", () => {
  it("TAXI = 96 h", () => expect(modulesElearning("taxi")).toMatchObject({ totalMinutes: 96 * 60, coherent: true }));
  it("VTC = 66 h", () => expect(modulesElearning("vtc")).toMatchObject({ totalMinutes: 66 * 60, coherent: true }));
  it("TA = 36 h", () => expect(modulesElearning("ta")).toMatchObject({ totalMinutes: 36 * 60, coherent: true }));
  it("VA = 36 h", () => expect(modulesElearning("va")).toMatchObject({ totalMinutes: 36 * 60, coherent: true }));
});

describe("calendrier journalier", () => {
  it("TAXI 4 janvier : 16 jours de 6 h = 90 h, publié", () => {
    const jours = joursOuvres("2027-01-04", "2027-01-25").slice(0, 15).map((jour) => ({ jour, plages: PLAGES_JOURNEE, nature: "cours" as const }));
    const c = calendrierSession({ ...taxi4janv, jours }, "taxi");
    expect(c.heuresAttendues).toBe(90);
    expect(c.heuresSaisies).toBe(90);
    expect(c.valide).toBe(true);
  });
  it("16 jours ouvrés = 96 h ≠ 90 h : calendrier bloqué", () => {
    const jours = joursOuvres("2027-01-04", "2027-01-25").map((jour) => ({ jour, plages: PLAGES_JOURNEE, nature: "cours" as const }));
    expect(jours).toHaveLength(16);
    expect(calendrierSession({ ...taxi4janv, jours }, "taxi").valide).toBe(false);
  });
  it("aucun jour saisi : bloqué", () => expect(calendrierSession(taxi4janv, "taxi").valide).toBe(false));
  it("soirée VTC : 10 soirs de 4 h = 40 h", () => {
    const jours = joursOuvres(soir.date_debut, soir.date_fin).map((jour) => ({ jour, plages: PLAGES_SOIREE, nature: "cours" as const }));
    const c = calendrierSession({ ...soir, jours }, "vtc");
    expect(c.heuresAttendues).toBe(40);
    expect(c.valide).toBe(true);
  });
  it("jour hors dates : bloqué", () => {
    const c = calendrierSession({ ...soir, jours: [{ jour: "2027-03-01", plages: PLAGES_SOIREE, nature: "cours" }] }, "vtc");
    expect(c.valide).toBe(false);
  });
});

describe("sessions par formation", () => {
  it("TAXI présentiel retrouve la session du 4 janvier, pas l'examen", () => {
    const f = formationProgramme("taxi_presential")!;
    expect(sessionsPourFormation([taxi4janv, examen, soir], f).map((s) => s.id)).toEqual(["t"]);
  });
  it("VTC soir ne propose que les sessions du soir", () => {
    expect(sessionsPourFormation([taxi4janv, soir], formationProgramme("vtc_soir")!).map((s) => s.id)).toEqual(["s"]);
    expect(sessionsPourFormation([soir], formationProgramme("vtc_complet")!)).toEqual([]);
  });
  it("formation continue hors périmètre", () => expect(formationProgramme("fc_taxi")).toBeNull());
});

describe("PDF", () => {
  const formation = { id: "taxi_presential", label: "TAXI", designation: "Formation initiale TAXI en présentiel", agrement: "n°69-18-001" };
  it("sans calendrier : PDF généré et éléments signalés", () => {
    const { doc, manquants } = buildProgrammeCalendrierPDF({ formation, programme: formationProgramme("taxi_presential")!, session: taxi4janv, sessions: [taxi4janv, examen] });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    // 16 jours ouvrés (4–25 janvier) = 96 h ≠ 90 h annoncées : agenda non publié, divergence signalée.
    expect(manquants.some((m) => m.startsWith("Agenda"))).toBe(true);
    // Date de fin connue → pratique le samedi 23 janvier 2027, plus « à confirmer ».
    expect(manquants).not.toContain("Date du stage pratique");
    expect(manquants).not.toContain("Date de la journée pratique");
    expect(manquants).not.toContain("Date d'examen");
  });
  it("erreur de lecture signalée, jamais « aucune session »", () => {
    const { manquants } = buildProgrammeCalendrierPDF({ formation, programme: formationProgramme("taxi_presential")!, session: null, sessions: [], erreurLecture: true });
    expect(manquants).toContain("Lecture des sessions impossible");
  });
});

describe("pratique le samedi et divergence 4 janvier", () => {
  const cours16 = joursOuvres("2027-01-04", "2027-01-25").map((jour) => ({ jour, plages: PLAGES_JOURNEE, nature: "cours" as const }));
  const samedi = { jour: "2027-01-23", plages: PLAGES_JOURNEE, nature: "pratique" as const };
  it("16 jours + 1 samedi = 102 h au lieu de 96 h : divergence signalée, rien corrigé", () => {
    const c = calendrierSession({ ...taxi4janv, jours: [...cours16, samedi] }, "taxi");
    expect(c.heuresSaisies + c.heuresPratique).toBe(102);
    expect(c.valide).toBe(false);
    expect(c.anomalies.join(" ")).toContain("102 h avec la pratique au lieu des 96 h");
  });
  it("15 jours + samedi pratique 6 h = 96 h : publié", () => {
    const c = calendrierSession({ ...taxi4janv, jours: [...cours16.slice(0, 15), samedi] }, "taxi");
    expect(c.heuresPratique).toBe(6);
    expect(c.valide).toBe(true);
  });
  it("pratique hors samedi refusée", () => {
    const c = calendrierSession({ ...taxi4janv, jours: [...cours16.slice(0, 15), { ...samedi, jour: "2027-01-22" }] }, "taxi");
    expect(c.valide).toBe(false);
  });
  it("cours un samedi refusé", () => {
    const c = calendrierSession({ ...taxi4janv, jours: [...cours16.slice(0, 14), { ...samedi, nature: "cours" as const }] }, "taxi");
    expect(c.valide).toBe(false);
  });
});

import { jourFerie as _jf } from "@/lib/programmeCalendrierDevis";
describe("jours fériés", () => {
  it("identifie Pâques, Ascension, Pentecôte 2027 et 11 novembre", () => {
    expect(_jf("2027-03-29")).toBe("Lundi de Pâques");
    expect(_jf("2027-05-06")).toBe("Ascension");
    expect(_jf("2027-05-17")).toBe("Lundi de Pentecôte");
    expect(_jf("2026-11-11")).toBe("Armistice");
    expect(_jf("2027-01-04")).toBeNull();
  });
});

import { heuresSessionDefaut as __defautVA } from "@/lib/sessionHeures";
import { dureeDevisElearning as __dureeVA } from "@/lib/devisDureesElearning";
describe("VA 36 h (27/10/2026)", () => {
  it("session VA présentiel = 30 h de cours (+6 h pratique = 36 h)", () => {
    expect(__defautVA({ nom: "Session VA", type_session: "theorique", types_apprenant: ["VA"], heure_debut: "09:00" } as any)).toBe(30);
  });
  it("devis e-learning : VA 36, TA 36, TAXI 96, VTC 66", () => {
    expect(__dureeVA("va_elearning")).toBe("36 heures");
    expect(__dureeVA("ta_elearning")).toBe("36 heures");
    expect(__dureeVA("taxi_elearning")).toBe("96 heures");
    expect(__dureeVA("vtc_elearning")).toBe("66 heures");
  });
});

import { samediPratique } from "@/lib/programmeCalendrierDevis";
describe("pratique automatique : dernier samedi de la session", () => {
  const cours = (d: string, f: string, n: number, plages = PLAGES_JOURNEE) => joursOuvres(d, f).slice(0, n).map((jour) => ({ jour, plages, nature: "cours" as const }));
  it("TAXI fin lundi 25 janvier 2027 → samedi 23 janvier, 90 + 6 = 96 h", () => {
    const c = calendrierSession({ ...taxi4janv, jours: cours("2027-01-04", "2027-01-22", 15) }, "taxi");
    expect(c.pratique.map((j) => [j.jour, j.plages])).toEqual([["2027-01-23", PLAGES_JOURNEE]]);
    expect(c.heuresSaisies + c.heuresPratique).toBe(96);
    expect(c.valide).toBe(true);
  });
  it("fin un samedi → ce samedi", () => expect(samediPratique({ date_debut: "2027-01-04", date_fin: "2027-01-16", jours: [] }).jour).toBe("2027-01-16"));
  it("VTC jour fin vendredi 13 novembre 2026 → samedi 7, 60 + 6 = 66 h", () => {
    const s = { ...taxi4janv, types_apprenant: ["VTC"], date_debut: "2026-11-02", date_fin: "2026-11-13", jours: cours("2026-11-02", "2026-11-13", 10) };
    const c = calendrierSession(s, "vtc");
    expect(c.pratique[0].jour).toBe("2026-11-07");
    expect(c.heuresSaisies + c.heuresPratique).toBe(66);
  });
  it("VTC soir 40 + 6 = 46 h", () => {
    const c = calendrierSession({ ...soir, jours: cours(soir.date_debut, soir.date_fin, 10, PLAGES_SOIREE) }, "vtc");
    expect(c.pratique[0].jour).toBe("2027-02-06");
    expect(c.heuresSaisies + c.heuresPratique).toBe(46);
  });
  it("session courte sans samedi : pas de date inventée", () => {
    const r = samediPratique({ date_debut: "2027-02-01", date_fin: "2027-02-05", jours: [] });
    expect(r.jour).toBeNull(); expect(r.anomalie).toMatch(/trop courte/);
  });
  it("samedi férié (14 juillet 2029) : pratique maintenue, le centre travaille les jours fériés", () => {
    const r = samediPratique({ date_debut: "2029-07-09", date_fin: "2029-07-16", jours: [] });
    expect(r.jour).toBe("2029-07-14"); expect(r.anomalie).toBeNull();
  });
  it("collision avec un jour de cours : à confirmer", () => {
    const r = samediPratique({ date_debut: "2027-01-04", date_fin: "2027-01-25", jours: [{ jour: "2027-01-23", plages: PLAGES_JOURNEE, nature: "cours" }] });
    expect(r.jour).toBeNull();
  });
  it("pratique saisie différente : signalée", () => {
    const c = calendrierSession({ ...taxi4janv, jours: [...cours("2027-01-04", "2027-01-22", 15), { jour: "2027-01-16", plages: PLAGES_JOURNEE, nature: "pratique" }] }, "taxi");
    expect(c.valide).toBe(false); expect(c.anomalies.join(" ")).toMatch(/dernier samedi/);
  });
});
