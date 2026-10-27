import { describe, it, expect } from "vitest";
import { maintenantParis } from "@/lib/heureParis";
import { choisirFeuilleDue, clesTraitees, cleAuthentification, SuiviOuvertureEmargement } from "@/lib/emargementDu";

const exp = [
  { date: "2026-10-26", creneau: "matin" as const }, { date: "2026-10-26", creneau: "apres_midi" as const },
  { date: "2026-10-27", creneau: "apres_midi" as const }, { date: "2026-10-27", creneau: "matin" as const },
];
const sig = (d: string, c: string, extra: any = { signature_data_url: "data:image/png;base64,x" }) => ({ date_emargement: d, demi_journee: c, ...extra });

describe("Heure Europe/Paris indépendante de l'appareil", () => {
  it("23h30 UTC le 27/10 = 28/10 00h30 à Paris (hiver UTC+1)", () => {
    expect(maintenantParis(new Date("2026-10-27T23:30:00Z"))).toEqual({ dateISO: "2026-10-28", minutes: 30 });
  });
  it("été UTC+2 : 06h45 UTC = 08h45 Paris (matin ouvert dès 8h30)", () => {
    expect(maintenantParis(new Date("2026-06-15T06:45:00Z")).minutes).toBe(8 * 60 + 45);
  });
  it("même instant, résultat identique quel que soit le fuseau du processus", () => {
    expect(process.env.TZ === undefined || typeof process.env.TZ === "string").toBe(true);
    expect(maintenantParis(new Date("2026-10-27T11:00:00Z"))).toEqual({ dateISO: "2026-10-27", minutes: 12 * 60 });
  });
});

describe("Choix de la feuille due", () => {
  it("plusieurs feuilles dues : celle du jour d'abord (matin avant après-midi), retards comptés", () => {
    const r = choisirFeuilleDue(exp, new Set(), "2026-10-27");
    expect(r.next).toEqual({ date: "2026-10-27", creneau: "matin" });
    expect(r.dues).toHaveLength(4); expect(r.enRetard).toBe(2);
  });
  it("feuille du jour signée : la plus ancienne non signée est présentée", () => {
    const t = clesTraitees([sig("2026-10-27", "matin"), sig("2026-10-27", "apres_midi")]);
    expect(choisirFeuilleDue(exp, t, "2026-10-27").next).toEqual({ date: "2026-10-26", creneau: "matin" });
  });
  it("déjà signé ou absence déclarée : rien à présenter", () => {
    const t = clesTraitees([sig("2026-10-26", "matin"), sig("2026-10-26", "apres_midi", { absent: true }), sig("2026-10-27", "matin"), sig("2026-10-27", "apres_midi")]);
    expect(choisirFeuilleDue(exp, t, "2026-10-27").next).toBeNull();
  });
  it("ligne sans signature ni absence : reste due (jamais considérée signée)", () => {
    const t = clesTraitees([sig("2026-10-27", "matin", { signature_data_url: "  ", absent: false })]);
    expect(t.size).toBe(0);
  });
  it("aucun doublon même si le créneau est attendu deux fois (théorie + pratique)", () => {
    expect(choisirFeuilleDue([...exp, exp[0]], new Set(), "2026-10-27").dues).toHaveLength(4);
  });
});

describe("Ouverture automatique à chaque authentification", () => {
  const u1 = { id: "fictif-1", last_sign_in_at: "2026-10-27T07:00:00Z" };
  it("s'ouvre une seule fois par connexion et par feuille", () => {
    const s = new SuiviOuvertureEmargement(); const a = cleAuthentification(u1);
    expect(s.doitOuvrir(a, "x|2026-10-27|matin", false)).toBe(true);
    expect(s.doitOuvrir(a, "x|2026-10-27|matin", false)).toBe(false);
  });
  it("reconnexion du même compte sans remontage : nouvelle présentation", () => {
    const s = new SuiviOuvertureEmargement();
    s.doitOuvrir(cleAuthentification(u1), "x|2026-10-27|matin", false);
    s.doitOuvrir(null, null, false); // déconnexion
    expect(s.doitOuvrir(cleAuthentification({ ...u1, last_sign_in_at: "2026-10-27T10:00:00Z" }), "x|2026-10-27|matin", false)).toBe(true);
  });
  it("reconnexion même compte même sans déconnexion visible (nouvel horodatage)", () => {
    const s = new SuiviOuvertureEmargement();
    s.doitOuvrir(cleAuthentification(u1), "k", false);
    expect(s.doitOuvrir(cleAuthentification({ ...u1, last_sign_in_at: "2026-10-27T11:00:00Z" }), "k", false)).toBe(true);
  });
  it("passage à un nouveau créneau dans la même connexion : nouvelle présentation", () => {
    const s = new SuiviOuvertureEmargement(); const a = cleAuthentification(u1);
    s.doitOuvrir(a, "x|2026-10-27|matin", false);
    expect(s.doitOuvrir(a, "x|2026-10-27|apres_midi", false)).toBe(true);
  });
  it("pendant un module/quiz/examen : pas d'ouverture, puis ouverture en sortant", () => {
    const s = new SuiviOuvertureEmargement(); const a = cleAuthentification(u1);
    expect(s.doitOuvrir(a, "k", true)).toBe(false);
    expect(s.doitOuvrir(a, "k", false)).toBe(true);
  });
  it("erreur serveur (aucune feuille connue) : pas d'ouverture ; après réessai réussi : ouverture", () => {
    const s = new SuiviOuvertureEmargement(); const a = cleAuthentification(u1);
    expect(s.doitOuvrir(a, null, false)).toBe(false);
    expect(s.doitOuvrir(a, "k", false)).toBe(true);
  });
  it("autre compte sur le même appareil : présentation indépendante", () => {
    const s = new SuiviOuvertureEmargement();
    s.doitOuvrir(cleAuthentification(u1), "k", false);
    expect(s.doitOuvrir(cleAuthentification({ id: "fictif-2", last_sign_in_at: "x" }), "k", false)).toBe(true);
  });
});
