/**
 * ÉTAPE 4 — CANAL D'ALERTE HORS BASE (préparation, TEST uniquement).
 *
 * Une alerte critique doit pouvoir sortir MÊME si la base est totalement
 * inaccessible : le canal principal est un envoi direct (webhook/e-mail
 * technique), la table d'alertes n'est qu'un canal secondaire d'archivage.
 *
 * Deux protections : regroupement/déduplication (pas des centaines d'alertes
 * identiques) et alerte de rétablissement quand l'incident disparaît.
 */
import type { Incident } from "./externalMonitor";

export type AlerteSortante = {
  code: string;
  gravite: "critique" | "avertissement" | "retablissement";
  message: string;
  occurrences: number;
  premiereAt: number;
  derniereAt: number;
};

export type Transport = {
  nom: string;
  /** Envoi réel ; doit rejeter si le canal est inutilisable. */
  envoyer: (alerte: AlerteSortante) => Promise<void>;
  /** true si ce canal dépend de la base surveillée. */
  dependDeLaBase?: boolean;
};

export type OptionsCanal = {
  transports: Transport[];
  /** Fenêtre de regroupement : une même alerte n'est renvoyée qu'après ce délai. */
  fenetreDedupMs?: number;
  maintenant?: () => number;
  /** Mémoire tampon si AUCUN canal n'a fonctionné (rejouée plus tard). */
  fileLocale?: AlerteSortante[];
};

export type ResultatEnvoi = {
  envoyee: boolean;
  regroupee: boolean;
  canauxOk: string[];
  canauxEchoues: string[];
  enAttente: number;
};

export class CanalAlertes {
  private etats = new Map<string, { occurrences: number; premiereAt: number; derniereEnvoiAt: number; actif: boolean }>();
  private file: AlerteSortante[];
  private opts: Required<Pick<OptionsCanal, "fenetreDedupMs" | "maintenant">> & OptionsCanal;

  constructor(opts: OptionsCanal) {
    this.opts = { fenetreDedupMs: 5 * 60_000, maintenant: () => Date.now(), ...opts };
    this.file = opts.fileLocale ?? [];
  }

  /** Alertes non transmises, conservées en mémoire (jamais perdues). */
  get enAttente(): AlerteSortante[] {
    return [...this.file];
  }

  /** Signale un incident. Renvoie l'issue de l'envoi. */
  async signaler(incident: Incident): Promise<ResultatEnvoi> {
    const now = this.opts.maintenant();
    const etat = this.etats.get(incident.code) ?? { occurrences: 0, premiereAt: now, derniereEnvoiAt: 0, actif: false };
    etat.occurrences += 1;
    etat.actif = true;
    this.etats.set(incident.code, etat);

    const dejaSignale = etat.derniereEnvoiAt > 0;
    if (dejaSignale && now - etat.derniereEnvoiAt < this.opts.fenetreDedupMs!) {
      return { envoyee: false, regroupee: true, canauxOk: [], canauxEchoues: [], enAttente: this.file.length };
    }

    const alerte: AlerteSortante = {
      code: incident.code,
      gravite: incident.gravite,
      message: incident.message,
      occurrences: etat.occurrences,
      premiereAt: etat.premiereAt,
      derniereAt: now,
    };
    const res = await this.diffuser(alerte);
    if (res.envoyee) etat.derniereEnvoiAt = now;
    return res;
  }

  /** L'incident a disparu : une alerte de rétablissement est émise une seule fois. */
  async signalerRetablissement(code: string, message?: string): Promise<ResultatEnvoi | null> {
    const etat = this.etats.get(code);
    if (!etat || !etat.actif) return null;
    etat.actif = false;
    const now = this.opts.maintenant();
    const alerte: AlerteSortante = {
      code: `${code}_RETABLI`,
      gravite: "retablissement",
      message: message ?? `Rétablissement : ${code}`,
      occurrences: etat.occurrences,
      premiereAt: etat.premiereAt,
      derniereAt: now,
    };
    etat.occurrences = 0;
    etat.derniereEnvoiAt = 0;
    return this.diffuser(alerte);
  }

  /** Rejoue les alertes restées en attente (retour du réseau ou d'un canal). */
  async viderFile(): Promise<{ restantes: number }> {
    while (this.file.length > 0) {
      const res = await this.diffuser(this.file[0], false);
      if (!res.envoyee) break;
      this.file.shift();
    }
    return { restantes: this.file.length };
  }

  private async diffuser(alerte: AlerteSortante, mettreEnFile = true): Promise<ResultatEnvoi> {
    const canauxOk: string[] = [];
    const canauxEchoues: string[] = [];
    // Les canaux indépendants de la base passent en premier.
    const ordonnes = [...this.opts.transports].sort(
      (a, b) => Number(a.dependDeLaBase ?? false) - Number(b.dependDeLaBase ?? false),
    );
    for (const t of ordonnes) {
      try {
        await t.envoyer(alerte);
        canauxOk.push(t.nom);
      } catch {
        canauxEchoues.push(t.nom);
      }
    }
    const envoyee = canauxOk.length > 0;
    if (!envoyee && mettreEnFile) this.file.push(alerte);
    return { envoyee, regroupee: false, canauxOk, canauxEchoues, enAttente: this.file.length };
  }
}
