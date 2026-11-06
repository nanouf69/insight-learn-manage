import { describe, it, expect } from "vitest";
import { ordonnerCandidatsParFin } from "@/features/correction-qrc-v2/ordreCandidats";
import { copieVoisine } from "@/features/correction-qrc-v2/navigationCopies";

const t = (id: string, etat: string, started_at: string | null, finished_at: string | null) => ({ attempt_id: id, etat, started_at, finished_at });
const ids = (xs: { attempt_id: string }[]) => xs.map((x) => x.attempt_id);

describe("ordre des candidats par fin de matière", () => {
  it("terminés en haut, fin croissante, puis non terminés par début croissant", () => {
    const r = ordonnerCandidatsParFin([
      t("enCoursTard", "en_cours", "2026-11-06T10:05:00Z", null),
      t("finiTard", "terminee", "2026-11-06T09:00:00Z", "2026-11-06T10:30:00Z"),
      t("enCoursTot", "en_cours", "2026-11-06T09:10:00Z", null),
      t("finiTot", "terminee", "2026-11-06T09:20:00Z", "2026-11-06T09:50:00Z"),
    ]);
    expect(ids(r)).toEqual(["finiTot", "finiTard", "enCoursTot", "enCoursTard"]);
  });
  it("utilise la fin et non le début", () => {
    const r = ordonnerCandidatsParFin([
      t("commenceTotFiniTard", "terminee", "2026-11-06T08:00:00Z", "2026-11-06T11:00:00Z"),
      t("commenceTardFiniTot", "terminee", "2026-11-06T09:30:00Z", "2026-11-06T10:00:00Z"),
    ]);
    expect(ids(r)).toEqual(["commenceTardFiniTot", "commenceTotFiniTard"]);
  });
  it("ex aequo de fin : début croissant puis ordre d'origine", () => {
    const fin = "2026-11-06T10:00:00Z";
    const r = ordonnerCandidatsParFin([
      t("b", "terminee", "2026-11-06T09:10:00Z", fin),
      t("a", "terminee", "2026-11-06T09:00:00Z", fin),
      t("c", "terminee", "2026-11-06T09:00:00Z", fin),
    ]);
    expect(ids(r)).toEqual(["a", "c", "b"]);
  });
  it("terminé sans horodatage de fin : après les fins connues, avant les non terminés, aucune fin inventée", () => {
    const r = ordonnerCandidatsParFin([
      t("enCours", "en_cours", "2026-11-06T08:00:00Z", null),
      t("sansFin", "terminee", "2026-11-06T08:30:00Z", null),
      t("finInvalide", "terminee", "2026-11-06T08:40:00Z", "pas-une-date"),
      t("avecFin", "terminee", "2026-11-06T09:00:00Z", "2026-11-06T12:00:00Z"),
    ]);
    expect(ids(r)).toEqual(["avecFin", "sansFin", "finInvalide", "enCours"]);
  });
  it("abandonnée = non terminée ; début absent en dernier", () => {
    const r = ordonnerCandidatsParFin([
      t("sansDebut", "en_cours", null, null),
      t("abandon", "abandonnee", "2026-11-06T09:00:00Z", "2026-11-06T09:30:00Z"),
    ]);
    expect(ids(r)).toEqual(["abandon", "sansDebut"]);
  });
  it("ne modifie pas la liste d'origine", () => {
    const src = [t("x", "en_cours", "2026-11-06T10:00:00Z", null), t("y", "terminee", "2026-11-06T09:00:00Z", "2026-11-06T09:30:00Z")];
    const copie = JSON.stringify(src);
    ordonnerCandidatsParFin(src);
    expect(JSON.stringify(src)).toBe(copie);
  });
});

describe("flèches du correcteur suivent le même ordre", () => {
  it("Suivant passe au candidat affiché juste en dessous", () => {
    const snap = { matieres: [{ subject_id: "t3p" }], questions: [{ id: "q1", matiere: "t3p", type: "QRC" }] };
    const session = {
      tentatives: [
        { ...t("enCours", "en_cours", "2026-11-06T09:00:00Z", null), snapshot: snap },
        { ...t("finiTard", "terminee", "2026-11-06T09:05:00Z", "2026-11-06T10:00:00Z"), snapshot: snap },
        { ...t("finiTot", "terminee", "2026-11-06T09:10:00Z", "2026-11-06T09:40:00Z"), snapshot: snap },
      ],
      qrc: ["enCours", "finiTard", "finiTot"].map((a) => ({ qrc_instance_id: `i-${a}`, attempt_id: a, question_id: "q1" })),
    } as never;
    expect(copieVoisine(session, "i-finiTot", 1)?.attempt_id).toBe("finiTard");
    expect(copieVoisine(session, "i-finiTard", 1)?.attempt_id).toBe("enCours");
    expect(copieVoisine(session, "i-finiTot", -1)).toBeNull();
  });
});
