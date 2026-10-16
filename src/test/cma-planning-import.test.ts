import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  analyserPlanning, segmentsDepuisTexte, construireApercu, rapprocher,
  type FicheApprenant, type LignePlanningPdf,
} from "@/lib/cmaPlanningImport";

// Transcription du PDF de novembre 2026 (50 candidats, 5 pages) mise en page comme pdftotext.
const texte = readFileSync(join(__dirname, "fixtures-cma-planning-novembre.txt"), "utf8");
const analyse = () => analyserPlanning(texte.split("\n").map((l) => ({ segments: segmentsDepuisTexte(l) })));

// Fiches fictives reprenant l'orthographe des fiches (identifiants fictifs).
let n = 0;
const f = (prenom: string, nom: string, extra: Partial<FicheApprenant> = {}): FicheApprenant => ({ id: `id-${++n}`, prenom, nom, ...extra });
const fiches: FicheApprenant[] = [
  f("Lotefi", "ACHIOU", { date_examen_pratique: "2026-11-03", heure_examen_pratique: "08:30" }),
  f("THIERNO", "BAH"), f("Thierno", "Diallo"), f("Kamel", "BOUDJORF DOUBAA"),
  f("Flomardo", "Moukoko"), f("Salim-Neill", "ZEKKOUR-FERHAT"), f("Salim", "ZEKKOUR"),
  f("Abdelbaset", "naffati"), f("ISAM", "OUERFELLI"), f("Isam", "Ouerfelli"),
  f("Rafik", "MESBAHI"), f("Kawtar", "MESBAHI"), f("Mohamed", "BEN TOURKIA"), f("Mohamed", "BEN ACHOUR"),
  f("Léa", "CATANIA"), f("Lea", "VALENTIN"), f("Mehdi", "KEBBAB"), f("Emmanuel", "KEKA"),
];
const ligne = (prenom: string, nom: string): LignePlanningPdf => ({ date: "2026-11-03", jury: null, numero: 1, heure: "08:30", prenom, nom, filiere: "VTC" });

describe("import planning CMA", () => {
  it("extrait les 50 candidats, sans les émargements, avec noms reportés", () => {
    const r = analyse();
    expect(r.candidats).toHaveLength(50);
    expect(r.erreurs).toHaveLength(0);
    expect(r.candidats.filter((c) => c.heure === "10:00")).toHaveLength(0);
    const kebbab = r.candidats.find((c) => c.nom === "KEBBAB")!;
    expect([kebbab.prenom, kebbab.date, kebbab.heure]).toEqual(["Mehdi", "2026-11-04", "15:15"]);
    expect(r.candidats.find((c) => c.nom === "NAYFER")!.prenom).toBe("Yassine");
  });

  it("conserve prénoms et noms composés intégraux", () => {
    const r = analyse().candidats;
    expect(r.find((c) => c.nom === "DESCOLAS")!.prenom).toBe("Baptiste Claude Serge");
    expect(r.find((c) => c.prenom === "Flomardo Dieu-Le-Veuth")!.nom).toBe("MOUKOKO");
    expect(r.find((c) => c.nom === "PANDA GBIANIMBI")!.prenom).toBe("Auguste lionel");
  });

  it("la colonne organisme (TAXI) prime sur l'en-tête VTC de la page 5", () => {
    const r = analyse().candidats.filter((c) => c.date === "2026-11-10");
    expect(r).toHaveLength(10);
    expect(r.every((c) => c.filiere === "TAXI")).toBe(true);
    expect(analyse().candidats.filter((c) => c.filiere === "VTC")).toHaveLength(40);
  });

  it("prénom complémentaire compatible => lié, accents/casse ignorés", () => {
    expect(rapprocher(ligne("Thierno Madjou", "BAH"), fiches).apprenantId).toBe(fiches[1].id);
    expect(rapprocher(ligne("Thierno saidou", "DIALLO"), fiches).apprenantId).toBe(fiches[2].id);
    expect(rapprocher(ligne("Lea", "CATANIA"), fiches).statut).toBe("lie");
    expect(rapprocher(ligne("Flomardo Dieu-Le-Veuth", "MOUKOKO"), fiches).apprenantId).toBe(fiches[4].id);
  });

  it("homonymes distincts : deux MESBAHI, deux Thierno", () => {
    expect(rapprocher(ligne("Rafik", "MESBAHI"), fiches).apprenantId).toBe(fiches[10].id);
    const cerine = rapprocher(ligne("Cérine", "MESBAHI"), fiches);
    expect(cerine.apprenantId).toBeNull();
    expect(cerine.statut).not.toBe("lie");
  });

  it("deux fiches identiques => ambigu, jamais la première", () => {
    const r = rapprocher(ligne("Isam", "OUERFELLI"), fiches);
    expect(r.statut).toBe("ambigu");
    expect(r.apprenantId).toBeNull();
    expect(r.candidats).toHaveLength(2);
  });

  it("orthographe voisine => à vérifier ; absent => inconnu", () => {
    expect(rapprocher(ligne("Abdelbasset", "NAFFATI"), fiches).statut).toBe("a_verifier");
    expect(rapprocher(ligne("Baptiste Claude Serge", "DESCOLAS"), fiches).statut).toBe("inconnu");
  });

  it("nom composé exact préféré, nom partiel seul jamais lié automatiquement", () => {
    expect(rapprocher(ligne("Salim neill", "ZEKKOUR FERHAT"), fiches).apprenantId).toBe(fiches[5].id);
    expect(rapprocher(ligne("Kamel", "BOUDJORF"), fiches).statut).toBe("a_verifier");
    expect(rapprocher(ligne("Mohamed", "BEN TOURKIA"), fiches).apprenantId).toBe(fiches[12].id);
  });

  it("idempotence et conflits : déjà présent, puis en attente si autre heure", () => {
    const l = analyse().candidats;
    const a1 = construireApercu(l, fiches, []);
    expect(a1).toHaveLength(50);
    expect(a1.find((r) => r.ligne.nom === "ACHIOU")!.import).toBe("deja_present");
    const kebbab = a1.find((r) => r.ligne.nom === "KEBBAB")!;
    expect(kebbab.import).toBe("a_ajouter");
    const deja = a1.filter((r) => r.import === "a_ajouter").map((r) => ({ apprenant_id: r.apprenantId!, date_examen: r.ligne.date, heure: r.ligne.heure, filiere: r.ligne.filiere }));
    const a2 = construireApercu(l, fiches, deja);
    expect(a2.filter((r) => r.import === "a_ajouter")).toHaveLength(0);
    const autreHeure = [{ ...deja.find((d) => d.apprenant_id === kebbab.apprenantId)!, heure: "08:30" }];
    expect(construireApercu(l, fiches, autreHeure).find((r) => r.ligne.nom === "KEBBAB")!.import).toBe("conflit");
  });

  it("aucune ligne ne disparaît : chaque ligne a un statut", () => {
    const a = construireApercu(analyse().candidats, fiches, []);
    expect(a.every((r) => r.statut && r.import && r.raison)).toBe(true);
  });
});
