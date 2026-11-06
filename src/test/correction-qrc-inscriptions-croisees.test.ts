import { describe, expect, it } from "vitest";
import { deciderRattachementCrm, nombrePassagesCroises, type LienSessionCrm } from "@/features/correction-qrc-v2/rattachementCrm";

const TAXI_TA: LienSessionCrm = {
  session: { id: "82b3a426-39d1-44f9-bfaa-d750c4575e8d", nom: "Session TAXI et TA - Du 26 octobre au 16 novembre 2026", date_debut: "2026-10-26", date_fin: "2026-11-16" },
  debut: "2026-10-26",
  fin: "2026-11-16",
};
const VTC_TAXI: LienSessionCrm = {
  session: { id: "91f00853-2ac2-4da6-996b-4832fc132b6b", nom: "Session VTC et TAXI - Du 2 au 13 novembre 2026", date_debut: "2026-11-02", date_fin: "2026-11-13" },
  debut: "2026-11-02",
  fin: "2026-11-13",
};
const ELEVES = [
  ["BENKHELIL", "b9058e7e-a81e-4741-adba-6da88238cc84"],
  ["CHEMOUN", "2be4ac7b-32a6-4a0f-9a12-267381c6779b"],
  ["HAMDI", "26b14f51-4a57-44a3-93d9-bd9f5d462f91"],
  ["MEMDOUH", "7dac2ec5-46f4-46f9-9573-2bf245041601"],
  ["SARKISIAN", "144ca7f4-6623-4063-861b-e139a4a0108b"],
  ["HADDOU", "c41a5034-8fa2-4fe5-a5d0-ad3f590d7fbe"],
] as const;

describe("Correction QRC V2 — inscriptions croisées EB1-TAXI", () => {
  it.each(ELEVES)("%s est visible dans les deux sessions réellement couvrantes, sans session principale", (_nom, id) => {
    const decision = deciderRattachementCrm({
      jour: "2026-11-06",
      examId: "EB1-TAXI",
      typeApprenant: "taxi",
      liens: [TAXI_TA, VTC_TAXI],
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(decision.type).toBe("croisee");
    expect(decision.sessions.map((lien) => lien.session.id)).toEqual([TAXI_TA.session.id, VTC_TAXI.session.id]);
  });

  it.each(["2026-11-02", "2026-11-06", "2026-11-13"])("retient les deux sessions le %s, bornes incluses", (jour) => {
    const decision = deciderRattachementCrm({ jour, examId: "EB1-TAXI", typeApprenant: "taxi", liens: [TAXI_TA, VTC_TAXI] });
    expect(decision.type).toBe("croisee");
  });

  it.each([
    ["2026-11-01", TAXI_TA.session.id],
    ["2026-11-14", TAXI_TA.session.id],
  ])("ne retient que la session réellement couvrante le %s", (jour, sessionId) => {
    const decision = deciderRattachementCrm({ jour, examId: "EB1-TAXI", typeApprenant: "taxi", liens: [TAXI_TA, VTC_TAXI] });
    expect(decision.type).toBe("unique");
    expect(decision.sessions[0]?.session.id).toBe(sessionId);
  });

  it("conserve EB1 VTC distinct et un vrai chevauchement VTC en conflit", () => {
    const decision = deciderRattachementCrm({ jour: "2026-11-06", examId: "EB1", typeApprenant: "vtc", liens: [TAXI_TA, VTC_TAXI] });
    expect(decision.type).toBe("conflit");
  });

  it("n'étend la règle ni à un autre examen TAXI ni à trois sessions", () => {
    expect(deciderRattachementCrm({ jour: "2026-11-06", examId: "EB2-TAXI", typeApprenant: "taxi", liens: [TAXI_TA, VTC_TAXI] }).type).toBe("conflit");
    const troisieme = { ...TAXI_TA, session: { ...TAXI_TA.session, id: "00000000-0000-0000-0000-000000000003", nom: "Troisième" } };
    expect(deciderRattachementCrm({ jour: "2026-11-06", examId: "EB1-TAXI", typeApprenant: "taxi", liens: [TAXI_TA, VTC_TAXI, troisieme] }).type).toBe("conflit");
  });

  it("dédoublonne les liens techniques et ne fabrique pas une inscription croisée", () => {
    const decision = deciderRattachementCrm({ jour: "2026-11-06", examId: "EB1-TAXI", typeApprenant: "taxi", liens: [VTC_TAXI, VTC_TAXI] });
    expect(decision.type).toBe("unique");
  });

  it("compte 30 passages croisés une seule fois même si leurs identifiants sont projetés deux fois", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `attempt-${i}`);
    const marquages = Object.fromEntries(ids.map((id) => [id, [TAXI_TA.session.nom!]]));
    expect(nombrePassagesCroises([...ids, ...ids], marquages)).toBe(30);
    expect(nombrePassagesCroises(ids, {})).toBe(0);
  });
});
