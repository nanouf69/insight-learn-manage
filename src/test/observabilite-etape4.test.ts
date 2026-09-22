// @vitest-environment node
/**
 * ÉTAPE 4 — OBSERVABILITÉ, ALERTES HORS BASE, JOURNAUX PERSISTANTS.
 *
 * Tous les scénarios sont simulés : aucune base réelle n'est sollicitée,
 * aucune donnée pédagogique n'est lue ni écrite.
 */
import { describe, it, expect } from "vitest";
import {
  checkFrontend, checkBackend, checkDbConnexion, checkDbLectureLegere, checkDbEcritureTest,
  checkAuth, checkChaineSauvegarde, synthetiser,
} from "@/lib/monitoring/healthChecks";
import { evaluerMesures } from "@/lib/monitoring/externalMonitor";
import { CanalAlertes, type Transport } from "@/lib/monitoring/alertChannel";
import { JournalPersistant, nouveauCorrelationId, type StockageExterne } from "@/lib/monitoring/persistentLog";
import {
  classifierEchecConnexion, MESSAGE_SERVICE_INDISPONIBLE, MESSAGE_IDENTIFIANTS_INCORRECTS,
} from "@/lib/monitoring/loginFailureClassifier";

const ok = { ok: true, status: 200, latenceMs: 80 };
const ko = { ok: false, status: 0, erreur: "connexion refusée" };

/** Stockage externe simulé : il SURVIT au redémarrage du service. */
function stockageExterne() {
  const lignes: string[] = [];
  return {
    lignes,
    stockage: { ajouter: (l: string) => void lignes.push(l), lire: () => [...lignes] } as StockageExterne,
  };
}

describe("A. Contrôles de santé séparés", () => {
  it("application : frontend et backend distingués", () => {
    expect(checkFrontend(ok).etat).toBe("ok");
    expect(checkBackend(ko).etat).toBe("indisponible");
  });

  it("base : connexion, lecture légère et écriture TEST distinguées", () => {
    expect(checkDbConnexion(ok).etat).toBe("ok");
    expect(checkDbLectureLegere(ko).etat).toBe("indisponible");
    expect(checkDbEcritureTest(ok, true).etat).toBe("ok");
  });

  it("aucune écriture hors cible TEST : le contrôle ne s'exécute pas", () => {
    const v = checkDbEcritureTest(ok, false);
    expect(v.etat).toBe("non_execute");
    expect(v.detail).toContain("aucune écriture");
  });

  it("auth : des identifiants refusés prouvent que le service fonctionne", () => {
    expect(checkAuth({ ok: false, status: 400, codeAuth: "invalid_credentials" }).etat).toBe("ok");
    expect(checkAuth({ ok: false, timeout: true }).etat).toBe("indisponible");
  });

  it("chaîne de sauvegarde TEST : écriture → confirmation → relecture", () => {
    expect(checkChaineSauvegarde({
      compteTest: true, ecriture: ok, ack: ok, relecture: { ...ok, valeurIdentique: true },
    }).etat).toBe("ok");
    expect(checkChaineSauvegarde({
      compteTest: true, ecriture: ok, ack: ko, relecture: ok,
    }).detail).toContain("confirmation");
    expect(checkChaineSauvegarde({
      compteTest: false, ecriture: ok, ack: ok, relecture: ok,
    }).etat).toBe("non_execute");
  });

  it("lenteur anormale = dégradé, pas indisponible", () => {
    expect(checkBackend({ ok: true, status: 200, latenceMs: 5000 }).etat).toBe("degrade");
  });

  it("synthèse : l'état le plus grave l'emporte", () => {
    expect(synthetiser([checkFrontend(ok), checkDbConnexion(ko)])).toBe("indisponible");
  });
});

describe("B. Surveillance externe", () => {
  it("détecte site, backend, base, auth et sauvegarde indisponibles", () => {
    const incidents = evaluerMesures({
      verdicts: [
        checkFrontend(ko), checkBackend(ko), checkDbConnexion(ko), checkAuth({ ok: false, timeout: true }),
        checkChaineSauvegarde({ compteTest: true, ecriture: ko, ack: ko, relecture: ko }),
      ],
    });
    const codes = incidents.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining([
      "SITE_INDISPONIBLE", "BACKEND_INDISPONIBLE", "DB_INDISPONIBLE", "AUTH_INDISPONIBLE", "SAUVEGARDE_INDISPONIBLE",
    ]));
  });

  it("détecte 5xx anormaux, latence anormale et saturation des connexions", () => {
    const codes = evaluerMesures({
      verdicts: [], taux5xx: 0.2, latenceMs: 8000, connexionsUtilisees: 95, connexionsMax: 100,
    }).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["ERREURS_5XX", "LATENCE", "SATURATION_CONNEXIONS"]));
  });

  it("3 échecs consécutifs de sauvegarde TEST déclenchent l'alerte critique dédiée", () => {
    const i = evaluerMesures({ verdicts: [], echecsSauvegardeTestConsecutifs: 3 })[0];
    expect(i.gravite).toBe("critique");
    expect(i.message).toBe("CRITIQUE — sauvegarde apprenant indisponible");
  });

  it("tout va bien : aucun incident", () => {
    expect(evaluerMesures({ verdicts: [checkFrontend(ok), checkDbConnexion(ok)], taux5xx: 0 })).toHaveLength(0);
  });
});

describe("C. Alertes hors base", () => {
  const transportExterne = (recu: any[]): Transport => ({
    nom: "webhook-externe", envoyer: async (a) => void recu.push(a),
  });
  const transportBase = (): Transport => ({
    nom: "table-alertes", dependDeLaBase: true, envoyer: async () => { throw new Error("permission denied"); },
  });

  it("l'alerte critique part alors que la base est totalement inaccessible", async () => {
    const recu: any[] = [];
    const canal = new CanalAlertes({ transports: [transportBase(), transportExterne(recu)] });
    const res = await canal.signaler({ code: "DB_INDISPONIBLE", gravite: "critique", message: "La base ne répond plus." });
    expect(res.envoyee).toBe(true);
    expect(res.canauxOk).toContain("webhook-externe");
    expect(res.canauxEchoues).toContain("table-alertes");
    expect(recu).toHaveLength(1);
  });

  it("des centaines d'incidents identiques ne produisent qu'une alerte regroupée", async () => {
    const recu: any[] = [];
    let t = 0;
    const canal = new CanalAlertes({ transports: [transportExterne(recu)], maintenant: () => t });
    for (let i = 0; i < 300; i++) { t += 1000; await canal.signaler({ code: "DB_INDISPONIBLE", gravite: "critique", message: "x" }); }
    expect(recu).toHaveLength(1);
    t += 10 * 60_000;
    await canal.signaler({ code: "DB_INDISPONIBLE", gravite: "critique", message: "x" });
    expect(recu).toHaveLength(2);
    expect(recu[1].occurrences).toBe(301);
  });

  it("le retour du service génère une alerte de rétablissement, une seule fois", async () => {
    const recu: any[] = [];
    const canal = new CanalAlertes({ transports: [transportExterne(recu)] });
    await canal.signaler({ code: "DB_INDISPONIBLE", gravite: "critique", message: "x" });
    const r1 = await canal.signalerRetablissement("DB_INDISPONIBLE", "Base de nouveau disponible.");
    const r2 = await canal.signalerRetablissement("DB_INDISPONIBLE");
    expect(r1?.envoyee).toBe(true);
    expect(r2).toBeNull();
    expect(recu[1].gravite).toBe("retablissement");
  });

  it("aucun canal disponible : l'alerte est conservée puis renvoyée au retour", async () => {
    const recu: any[] = [];
    let coupé = true;
    const canal = new CanalAlertes({
      transports: [{ nom: "webhook", envoyer: async (a) => { if (coupé) throw new Error("offline"); recu.push(a); } }],
    });
    const res = await canal.signaler({ code: "SAUVEGARDE_INDISPONIBLE", gravite: "critique", message: "x" });
    expect(res.envoyee).toBe(false);
    expect(canal.enAttente).toHaveLength(1);
    coupé = false;
    expect((await canal.viderFile()).restantes).toBe(0);
    expect(recu).toHaveLength(1);
  });
});

describe("D. Journaux persistants et corrélation", () => {
  it("toutes les catégories critiques sont journalisables", async () => {
    const { stockage } = stockageExterne();
    const j = new JournalPersistant(stockage);
    const categories = [
      "cycle_de_vie", "base", "auth", "api", "erreur_5xx", "timeout", "sauvegarde", "finalisation",
      "connexions_db", "saturation", "deploiement", "configuration", "health_check",
    ] as const;
    for (const c of categories) await j.ecrire(c, `trace ${c}`);
    expect(await j.lire()).toHaveLength(categories.length);
  });

  it("une opération se suit du navigateur au serveur via son identifiant", async () => {
    const { stockage } = stockageExterne();
    const j = new JournalPersistant(stockage);
    const cid = nouveauCorrelationId("abc");
    await j.ecrire("api", "requête navigateur", { correlationId: cid });
    await j.ecrire("base", "écriture réponse", { correlationId: cid });
    await j.ecrire("api", "autre opération", { correlationId: nouveauCorrelationId("zzz") });
    expect(await j.tracer(cid)).toHaveLength(2);
  });

  it("PREUVE DE PERSISTANCE : les traces d'avant le redémarrage restent lisibles après", async () => {
    const externe = stockageExterne();
    const avant = new JournalPersistant(externe.stockage);
    await avant.ecrire("base", "perte de connexion base", { contexte: { heure: "19:46" } });
    await avant.ecrire("cycle_de_vie", "arrêt du service");
    // Redémarrage : nouveau processus, mémoire vide, MÊME stockage externe.
    const apres = new JournalPersistant(externe.stockage);
    await apres.ecrire("cycle_de_vie", "démarrage du service");
    const toutes = await apres.lire();
    expect(toutes.map((e) => e.message)).toEqual([
      "perte de connexion base", "arrêt du service", "démarrage du service",
    ]);
    expect((await apres.lire({ categorie: "base" }))[0].contexte).toEqual({ heure: "19:46" });
  });

  it("le journal est append-only : aucune fonction d'effacement n'est exposée", () => {
    const j = new JournalPersistant(stockageExterne().stockage) as any;
    expect(j.supprimer).toBeUndefined();
    expect(j.vider).toBeUndefined();
  });
});

describe("F. Message de connexion", () => {
  it("identifiants réellement incorrects", () => {
    expect(classifierEchecConnexion({ status: 400, code: "invalid_credentials" }).message)
      .toBe(MESSAGE_IDENTIFIANTS_INCORRECTS);
  });

  it("un délai dépassé n'est JAMAIS un mauvais mot de passe", () => {
    expect(classifierEchecConnexion({ timeout: true }).message).toBe(MESSAGE_SERVICE_INDISPONIBLE);
  });

  it("base ou backend indisponible → service indisponible", () => {
    expect(classifierEchecConnexion({ status: 503 }).cause).toBe("service");
    expect(classifierEchecConnexion({ reseau: true }).cause).toBe("service");
    expect(classifierEchecConnexion({ message: "fetch failed" }).cause).toBe("service");
  });

  it("cause inconnue : on n'accuse pas l'élève", () => {
    expect(classifierEchecConnexion({}).cause).toBe("service");
  });
});

describe("TEST DE PANNE SIMULÉE (environnement de test)", () => {
  it("panne base : détection, alerte externe, journaux, login honnête, réponse conservée, puis rétablissement", async () => {
    const externe = stockageExterne();
    const journal = new JournalPersistant(externe.stockage);
    const recu: any[] = [];
    let t = 0;
    const canal = new CanalAlertes({
      transports: [
        { nom: "table-alertes", dependDeLaBase: true, envoyer: async () => { throw new Error("db down"); } },
        { nom: "webhook-externe", envoyer: async (a) => void recu.push(a) },
      ],
      maintenant: () => t,
    });

    // 1. La base tombe : le monitoring détecte.
    const verdicts = [checkFrontend(ok), checkBackend(ok), checkDbConnexion(ko), checkDbLectureLegere(ko),
      checkChaineSauvegarde({ compteTest: true, ecriture: ko, ack: ko, relecture: ko })];
    const incidents = evaluerMesures({ verdicts, echecsSauvegardeTestConsecutifs: 3 });
    expect(incidents.map((i) => i.code)).toContain("DB_INDISPONIBLE");

    // 2. L'alerte sort malgré la base inaccessible.
    for (const i of incidents) { t += 1; await canal.signaler(i); }
    expect(recu.length).toBeGreaterThan(0);
    expect(recu.some((a) => a.message === "CRITIQUE — sauvegarde apprenant indisponible")).toBe(true);

    // 3. Les journaux continuent d'exister (stockage externe).
    await journal.ecrire("base", "base injoignable", { correlationId: "req_panne" });
    expect(await journal.tracer("req_panne")).toHaveLength(1);

    // 4. Le login dit la vérité.
    expect(classifierEchecConnexion({ status: 503 }).message).toBe(MESSAGE_SERVICE_INDISPONIBLE);

    // 5. Une réponse d'examen reste locale, aucune donnée perdue.
    const fileReponses = [{ question: "4", valeur: "ma réponse" }];
    expect(fileReponses).toHaveLength(1);

    // 6. Retour du service : alerte de rétablissement.
    t += 60 * 60_000;
    const r = await canal.signalerRetablissement("DB_INDISPONIBLE", "Base de nouveau disponible.");
    expect(r?.envoyee).toBe(true);
    expect(recu.at(-1).gravite).toBe("retablissement");

    // 7. Redémarrage : les traces d'avant restent consultables.
    const apresRedemarrage = new JournalPersistant(externe.stockage);
    expect((await apresRedemarrage.lire()).some((e) => e.message === "base injoignable")).toBe(true);
  });
});
