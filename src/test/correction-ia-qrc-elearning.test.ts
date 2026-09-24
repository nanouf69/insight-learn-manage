import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  admissibilite, cleIdempotence, estElearning, estPauseGlobale, messageUtilisateur, validerResultatIa,
  MARQUEUR_IA, MODELE_IA_QRC,
} from "../../supabase/functions/_shared/qrcIaRegles";
import { celluleCompacte } from "@/features/correction-qrc-v2/celluleCompacte";
import { origineCorrection } from "@/features/correction-qrc-v2/noyauReel";
import { isElearningType } from "@/lib/dossierFormation";

const q = (extra: Record<string, unknown> = {}) => ({
  id: "t3p:1", type: "QRC", matiere: "t3p", enonce: "Qu'est-ce que l'honorabilité ?", reponseQRC: "Casier judiciaire vierge (B2)", points: 2, ...extra,
});
const fonction = readFileSync(join(process.cwd(), "supabase/functions/qrc-ia-correction/index.ts"), "utf8");
const pont = readFileSync(join(process.cwd(), "src/features/noyau-passage/pontV2.ts"), "utf8");
const migDir = join(process.cwd(), "drizzle/migrations");
const migration = readdirSync(migDir).filter((f) => f.includes("qrc_ia_correction_elearning")).map((f) => readFileSync(join(migDir, f), "utf8")).join("\n");

describe("Correction IA QRC e-learning — périmètre", () => {
  it("modèle = Gemini 3.8 Flash, jamais Astra ni Terra", () => {
    expect(MODELE_IA_QRC).toBe("google/gemini-3.8-flash");
    expect(fonction).not.toMatch(/gpt-6-astra|gpt-5\.6-terra/);
  });
  it("e-learning : même règle que le dossier de formation", () => {
    for (const t of ["vtc-e", "taxi-e", "ta-e", "va-e", "VTC-E", "vtc-e-presentiel", "vtc", "taxi", "PA VTC", "", null, "rp-vtc", "continue-vtc"]) {
      expect(estElearning(t as any)).toBe(isElearningType(t as any));
    }
    expect(estElearning("vtc")).toBe(false); // présentiel → aucun appel IA
    expect(estElearning("vtc-e")).toBe(true);
  });
  it("la fonction serveur s'arrête pour un non e-learning, un passage antérieur, un compte test ou un interrupteur éteint", () => {
    expect(fonction).toMatch(/if \(!cfg\?\.actif\) return json\(\{ ok: true, statut: "desactive" \}\)/);
    expect(fonction).toMatch(/non_elearning/);
    expect(fonction).toMatch(/passage_anterieur_activation/);
    expect(fonction).toMatch(/compte_test_exclu/);
  });
});

describe("Correction IA — règles d'exclusion déterministes", () => {
  it("cas admissible", () => expect(admissibilite(q(), "B2 vierge")).toEqual({ admissible: true, bareme: 2 }));
  it("G(T) → aucun appel IA", () => expect(admissibilite(q({ matiere: "reglementation_taxi2" }), "x y z")).toMatchObject({ admissible: false, motif: "matiere_exclue_gt" }));
  it("réponse vide → aucun appel IA", () => {
    expect(admissibilite(q(), "   ")).toMatchObject({ admissible: false, motif: "reponse_vide" });
    expect(admissibilite(q(), null)).toMatchObject({ admissible: false, motif: "reponse_vide" });
  });
  it("corrigé absent → formateur", () => expect(admissibilite(q({ reponseQRC: "" }), "abc")).toMatchObject({ admissible: false, statut: "a_verifier", motif: "corrige_absent" }));
  it("barème absent ou incohérent → formateur", () => {
    for (const p of [null, 0, -1, "abc", 1.3, 50]) expect(admissibilite(q({ points: p }), "abc")).toMatchObject({ admissible: false, motif: "bareme_absent" });
  });
  it("question hors snapshot / corrompue → formateur", () => {
    expect(admissibilite(null, "abc")).toMatchObject({ motif: "question_hors_snapshot" });
    expect(admissibilite(q(), "réponse \uFFFD cassée")).toMatchObject({ motif: "donnees_corrompues" });
  });
  it("la décision n'utilise jamais le champ confiance de l'IA", () => {
    const r = validerResultatIa({ note: 1, justification: "ok", confiance: "faible", ambigu: false }, 2);
    expect(r).toEqual({ valide: true, note: 1, justification: "ok" });
  });
});

describe("Correction IA — validation du résultat", () => {
  it("hors barème → refus", () => {
    expect(validerResultatIa({ note: 3, justification: "x" }, 2)).toEqual({ valide: false, motif: "hors_bareme" });
    expect(validerResultatIa({ note: -0.5, justification: "x" }, 2)).toEqual({ valide: false, motif: "hors_bareme" });
    expect(validerResultatIa({ note: 1.25, justification: "x" }, 2)).toEqual({ valide: false, motif: "hors_bareme" });
  });
  it("résultat invalide → refus (jamais de note inventée)", () => {
    expect(validerResultatIa("pas du json", 2)).toMatchObject({ valide: false });
    expect(validerResultatIa({ note: "beaucoup", justification: "x" }, 2)).toMatchObject({ valide: false });
    expect(validerResultatIa({ note: 1 }, 2)).toMatchObject({ valide: false });
  });
  it("accepte un JSON entouré de texte", () => {
    expect(validerResultatIa('```json\n{"note": 1.5, "justification": "Bien"}\n```', 2)).toEqual({ valide: true, note: 1.5, justification: "Bien" });
  });
});

describe("Correction IA — anonymat et source de vérité", () => {
  it("l'IA ne reçoit que question + corrigé + barème + réponse", () => {
    const m = messageUtilisateur(q(), 2, "B2 vierge");
    expect(m).toContain("Qu'est-ce que l'honorabilité");
    expect(m).toContain("Casier judiciaire vierge");
    expect(m).toContain("BARÈME : 2 points");
    expect(m).toContain("B2 vierge");
    expect(fonction).not.toMatch(/select\("[^"]*(nom|prenom|email|telephone)/);
  });
  it("la question vient du snapshot de la tentative, jamais du contenu actuel", () => {
    expect(fonction).toMatch(/att\.snapshot\?\.questions/);
    expect(fonction).not.toMatch(/exam_content_versions|module_editor_state/);
  });
});

describe("Correction IA — anti-double facturation et pannes", () => {
  it("clé d'idempotence stable (F5, double clic, reconnexion = même clé)", () => {
    const p = { apprenantId: "a", examId: "EB2", matiere: "t3p", attemptId: "t", questionId: "t3p:1", reponseHash: "h" };
    expect(cleIdempotence(p)).toBe(cleIdempotence({ ...p }));
    expect(cleIdempotence(p)).not.toBe(cleIdempotence({ ...p, reponseHash: "h2" }));
  });
  it("réservation atomique en base avant tout appel payant, clé unique", () => {
    expect(migration).toMatch(/cle_idempotence text NOT NULL UNIQUE/);
    expect(fonction).toMatch(/onConflict: "cle_idempotence", ignoreDuplicates: true/);
    expect(fonction.indexOf('statut: "en_cours"')).toBeLessThan(fonction.indexOf("generateText({"));
    expect(fonction).toMatch(/deja_traitee/);
  });
  it("aucune boucle d'appels payants ; crédits épuisés / accès refusé = pause globale", () => {
    expect(fonction).toMatch(/maxRetries: 0/);
    expect(estPauseGlobale(402)).toBe(true);
    expect(estPauseGlobale(403)).toBe(true);
    expect(estPauseGlobale(500)).toBe(false);
    expect(fonction).toMatch(/pause_depuis/);
  });
  it("la demande de correction côté élève n'est jamais bloquante", () => {
    expect(pont).toMatch(/demanderCorrectionIa\(params\.attemptId\)/);
    expect(pont).toMatch(/\.catch\(\(\) => undefined\)/);
  });
  it("la note IA passe par le même circuit de note que le formateur (core_correct_qrc_publish)", () => {
    expect(fonction).toMatch(/core_correct_qrc_publish/);
    expect(fonction).toMatch(/p_corrige_email: MARQUEUR_IA/);
  });
});

describe("Correction IA — couleurs et origine", () => {
  const base = { etat: "corrigee" as const };
  it("IA = violet, humaine = vert, jamais confondues", () => {
    expect(origineCorrection({ ...base, corrige_email: MARQUEUR_IA })).toBe("ia");
    expect(origineCorrection({ ...base, corrige_email: "formateur@ftransport.fr" })).toBe("humaine");
    expect(celluleCompacte({ corrigee: true, origine: "ia", note: 1.5, points: 2, vide: false })).toMatchObject({ couleur: "violet", libelle: "🤖 1,5/2" });
    expect(celluleCompacte({ corrigee: true, origine: "ia", note: 1.5, points: 2, vide: false }).detail).toContain("Correction IA — Gemini 3.8 Flash");
    expect(celluleCompacte({ corrigee: true, origine: "humaine", note: 1.5, points: 2, vide: false }).couleur).toBe("vert");
  });
  it("vérification demandée par l'élève = signalée en priorité", () => {
    const c = celluleCompacte({ corrigee: true, origine: "ia", note: 1, points: 2, vide: false, verificationDemandee: true });
    expect(c.libelle).toContain("⚠️");
    expect(c.detail).toContain("Vérification demandée par l'élève");
  });
  it("aucune transformation automatique violet → vert : seule une correction avec e-mail humain clôt une demande", () => {
    expect(migration).toMatch(/NEW\.corrige_email NOT LIKE 'ia:%'/);
  });
});

describe("Correction IA — interrupteur, historique, demande de vérification", () => {
  it("interrupteur créé DÉSACTIVÉ", () => {
    expect(migration).toMatch(/INSERT INTO public\.qrc_ia_config \(id, actif\) VALUES \(true, false\)/);
  });
  it("historique IA append-only (jamais supprimé)", () => {
    expect(migration).toMatch(/QRC_IA_APPEND_ONLY: suppression interdite/);
    expect(migration).toMatch(/une correction IA terminée est définitive/);
  });
  it("demande de vérification : propriétaire uniquement, une seule active, ne modifie jamais la note", () => {
    const fn = migration.slice(migration.indexOf("FUNCTION public.qrc_demander_verification"), migration.indexOf("REVOKE ALL ON FUNCTION public.qrc_demander_verification"));
    expect(fn).toMatch(/core_est_proprietaire/);
    expect(fn).not.toMatch(/UPDATE public\.qrc_instances_v2/);
    expect(migration).toMatch(/uniq_qrc_verification_active .* WHERE statut = 'a_traiter'/);
  });
});

describe("Correction IA — espace élève (sans sollicitation du formateur)", () => {
  const eleve = readFileSync(join(process.cwd(), "src/components/cours-en-ligne/CorrectionsIaEleve.tsx"), "utf8");
  const jsx = eleve.slice(eleve.indexOf("return ("));
  it("aucun bouton ni texte pour solliciter le formateur ou le centre", () => {
    expect(eleve).not.toMatch(/demanderVerification|qrc_verification_demandes|Demander une vérification/);
    expect(jsx).not.toMatch(/formateur|centre de formation|contacte/i);
  });
  it("ordre : réponse → corrigé officiel → note IA → explication → avertissement", () => {
    const ordre = ["bloc-reponse", "bloc-corrige-officiel", "bloc-note-ia", "bloc-explication-ia", "avertissement-ia"].map((t) => jsx.indexOf(t));
    expect(ordre.every((i) => i > 0)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
  });
  it("corrigé officiel mis au premier plan (grand encadré, gros titre, texte agrandi, éléments attendus)", () => {
    expect(jsx).toMatch(/border-4 border-success/);
    expect(jsx).toMatch(/text-xl font-extrabold text-success">✅ CORRIGÉ OFFICIEL/);
    expect(jsx).toMatch(/text-lg font-medium/);
    expect(jsx).toMatch(/Éléments attendus/);
    expect(jsx).toContain("Comparez votre réponse avec le corrigé officiel ci-dessus.");
  });
});
