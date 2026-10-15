import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHOIX, OBJET_MAIL, SUITE_PRATIQUE, INTRO_PRATIQUE, texteFige, estChoixValide, estCandidatVtc,
  estEligibleMailEchecVtc, construireMailEchecVtc, echeancesDepuisEnvoi, empreinteTexte,
} from "@/lib/modeles/entrainementPratiqueVtc";
import { genererPreuveChoixPdf } from "@/lib/modeles/preuveChoixPdf";

const edge = readFileSync("supabase/functions/document-signature-public/index.ts", "utf8");
const migration = readFileSync("drizzle/migrations/0166_documents_a_signer_modele_choix.sql", "utf8");
const dialog = readFileSync("src/components/examens/EnvoiEchecVtcDialog.tsx", "utf8");
const form = readFileSync("src/components/documents/ChoixPratiqueForm.tsx", "utf8");
const page = readFileSync("src/components/examens/ExamenReussitePage.tsx", "utf8");

describe("Texte fourni repris fidèlement", () => {
  it("exactement 3 choix, mots exacts", () => {
    expect(CHOIX.map((c) => c.label)).toEqual([
      "Je souhaite faire l'entraînement pratique dès maintenant (nous vous proposerons une date rapidement).",
      "Je souhaite faire l'entraînement pratique plus tard, après avoir réussi l'examen théorique, lors d'une prochaine session.",
      "Je ne souhaite pas faire l'entraînement pratique et je renonce à cette partie de la formation.",
    ]);
  });
  it("délais et avertissement CDC/France Travail présents", () => {
    const t = SUITE_PRATIQUE.join(" ");
    expect(t).toContain("pendant 6 mois à compter de ce message");
    expect(t).toContain("Caisse des Dépôts (Mon Compte Formation)");
    expect(t).toContain("France Travail");
    expect(t).toContain("dans un délai de 5 jours à compter de la réception de ce message");
  });
});

describe("Choix unique", () => {
  it("valide seulement les 3 codes", () => {
    expect(CHOIX.every((c) => estChoixValide(c.code))).toBe(true);
    for (const v of ["", "tous", null, undefined, ["maintenant"], "maintenant,renonce"]) expect(estChoixValide(v)).toBe(false);
  });
  it("formulaire : radiogroup, aucun pré-coché, signature obligatoire, anti double clic", () => {
    expect(form).toContain('role="radiogroup"');
    expect(form).toContain("useState<string | null>(null)");
    expect(form).toContain("disabled={envoi || !choix || !signature}");
    expect(form).toContain("verrou.current");
  });
});

describe("Ciblage VTC en échec seulement", () => {
  it("VTC oui ; TAXI/TA/VA non", () => {
    expect(estCandidatVtc("vtc")).toBe(true);
    expect(estCandidatVtc("VTC-E")).toBe(true);
    for (const t of ["taxi", "ta", "ta-e", "TA-I", "va", "taxi + vtc", "", null]) expect(estCandidatVtc(t as any)).toBe(false);
  });
  it("réussite ou absence d'email exclue", () => {
    expect(estEligibleMailEchecVtc({ resultat_examen: "non", type_apprenant: "vtc", email: "x@y.fr" })).toBe(true);
    expect(estEligibleMailEchecVtc({ resultat_examen: "oui", type_apprenant: "vtc", email: "x@y.fr" })).toBe(false);
    expect(estEligibleMailEchecVtc({ resultat_examen: "non", type_apprenant: "taxi", email: "x@y.fr" })).toBe(false);
    expect(estEligibleMailEchecVtc({ resultat_examen: "non", type_apprenant: "vtc", email: "" })).toBe(false);
  });
  it("ancien mail de repassage garde TAXI/TA, exclut VTC", () => {
    expect(page).toContain("!estCandidatVtc(a.type_apprenant)) || [];");
    expect(page).toContain("<EnvoiEchecVtcDialog candidats={nonReussis as any} />");
  });
});

describe("Mail unique", () => {
  const m = construireMailEchecVtc({ prenom: "Fictif<script>", lien: "https://gestion.ftransport.fr/document-a-signer/abc" });
  it("objet unique résultat + choix 5 jours", () => {
    expect(m.subject).toBe(OBJET_MAIL);
    expect(m.subject).toMatch(/théorique VTC.*pratique.*5 jours/);
  });
  it("garde les infos de réexamen existantes puis le bloc pratique et le bouton à la fin", () => {
    const h = m.html;
    expect(h).toContain("www.exament3p.fr");
    expect(h).toContain("département 69");
    expect(h).toContain("04 28 29 60 91");
    expect(h.indexOf("exament3p")).toBeLessThan(h.indexOf("Choisir et signer"));
    expect(h).toContain("Naoufal Guenichi");
    expect(h).toContain("06 12 32 20 50");
  });
  it("aucune case cochable dans le mail, prénom échappé", () => {
    expect(m.html).not.toMatch(/<input|<form|☐/);
    expect(m.html).not.toContain("<script>");
  });
});

describe("Délais depuis l'envoi réel", () => {
  it("rien sans date d'envoi réelle", () => {
    expect(echeancesDepuisEnvoi(null)).toBeNull();
    expect(echeancesDepuisEnvoi("pas une date")).toBeNull();
  });
  it("5 jours et 6 mois depuis envoye_le", () => {
    const e = echeancesDepuisEnvoi("2026-10-15T10:00:00Z")!;
    expect(e.reponseAttendue.toISOString()).toBe("2026-10-20T10:00:00.000Z");
    expect(e.finDisponibilite.toISOString().slice(0, 10)).toBe("2027-04-15");
  });
  it("envoye_le écrit seulement après succès d'envoi, une seule fois", () => {
    const i = dialog.indexOf("sync-outlook-emails");
    expect(dialog.indexOf("envoye_le: now")).toBeGreaterThan(i);
    expect(dialog).toContain('.is("envoye_le", null)');
    expect(dialog).toContain("new Set()");
  });
});

describe("Serveur : jetons, idempotence, immuabilité", () => {
  it("lien préparé non envoyé = introuvable ; pas d'email ni d'info sur jeton inconnu", () => {
    expect(edge).toContain("if (!doc.envoye_le && doc.statut !== \"signe\")");
    expect(edge).toContain("Document introuvable ou lien expiré");
    expect(edge).not.toMatch(/destinataire_email/);
  });
  it("double validation renvoie la preuve existante sans écraser", () => {
    expect(edge).toContain("deja_signe: true");
    expect(edge).toContain('.neq("statut", "signe")');
  });
  it("vérifie empreinte, choix et signature", () => {
    expect(edge).toContain("CHOIX_CODES.includes(choix)");
    expect(edge).toContain("data:image/png;base64,");
    expect(edge).toContain("texte_empreinte");
  });
  it("trigger : signé immuable, aucune suppression, texte/destinataire figés", () => {
    expect(migration).toContain("Preuve signée immuable");
    expect(migration).toContain("suppression interdite");
    expect(migration).toContain("NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id");
    expect(migration).not.toMatch(/DROP COLUMN|DELETE FROM/);
  });
  it("aucune action automatique CDC/France Travail/abandon/statut", () => {
    for (const src of [edge, dialog]) expect(src).not.toMatch(/apprenants"\)\.update|statut_formation|abandon\s*=|france_travail/i);
  });
});

describe("Preuve PDF", () => {
  it("empreinte stable", async () => {
    const t = JSON.stringify(texteFige());
    expect(await empreinteTexte(t)).toBe(await empreinteTexte(t));
    expect(await empreinteTexte(t)).toHaveLength(64);
  });
  it("génère un PDF avec texte figé", async () => {
    const bytes = await genererPreuveChoixPdf({
      texte: texteFige(), version: "v1", empreinte: "x", nom: "FICTIF", prenom: "Test", choix: "plus_tard",
      signature: null, signeLeParis: "jeudi 15 octobre 2026 21:00:00", signedAt: "2026-10-15T19:00:00Z", envoyeLe: null,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(INTRO_PRATIQUE).toHaveLength(2);
  });
});
