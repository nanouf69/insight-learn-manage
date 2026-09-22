/**
 * ÉTAPE 4 — JOURNAL PERSISTANT HORS PROCESSUS (préparation, TEST uniquement).
 *
 * Leçon de l'incident : le redémarrage a effacé les traces permettant de
 * comprendre la cause. Les journaux critiques doivent donc survivre au
 * redémarrage du service applicatif ET à celui de la base.
 *
 * Le journal est écrit dans un stockage EXTERNE injecté (fichier, stockage
 * objet, service de logs). Il est APPEND-ONLY : on n'efface jamais une ligne.
 */

export type CategorieLog =
  | "cycle_de_vie"
  | "base"
  | "auth"
  | "api"
  | "erreur_5xx"
  | "timeout"
  | "sauvegarde"
  | "finalisation"
  | "connexions_db"
  | "saturation"
  | "deploiement"
  | "configuration"
  | "health_check";

export type EntreeLog = {
  at: string;
  categorie: CategorieLog;
  message: string;
  /** Suivi d'une opération du navigateur jusqu'au serveur. */
  correlationId?: string;
  contexte?: Record<string, unknown>;
};

/** Stockage externe : seules l'écriture et la relecture sont nécessaires. */
export type StockageExterne = {
  ajouter: (ligne: string) => Promise<void> | void;
  lire: () => Promise<string[]> | string[];
};

/** Identifiant de corrélation stable, transmis dans l'en-tête des requêtes. */
export function nouveauCorrelationId(seed?: string): string {
  const base = seed ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `req_${base}`.slice(0, 48);
}

export class JournalPersistant {
  constructor(
    private stockage: StockageExterne,
    private maintenant: () => Date = () => new Date(),
  ) {}

  async ecrire(
    categorie: CategorieLog,
    message: string,
    options: { correlationId?: string; contexte?: Record<string, unknown> } = {},
  ): Promise<EntreeLog> {
    const entree: EntreeLog = {
      at: this.maintenant().toISOString(),
      categorie,
      message,
      correlationId: options.correlationId,
      contexte: options.contexte,
    };
    await this.stockage.ajouter(JSON.stringify(entree));
    return entree;
  }

  /** Relecture complète : ce qui a été écrit avant un redémarrage reste lisible. */
  async lire(filtre?: { categorie?: CategorieLog; correlationId?: string }): Promise<EntreeLog[]> {
    const lignes = await this.stockage.lire();
    const entrees = lignes
      .map((l) => {
        try {
          return JSON.parse(l) as EntreeLog;
        } catch {
          return null;
        }
      })
      .filter((e): e is EntreeLog => !!e);
    return entrees.filter(
      (e) =>
        (!filtre?.categorie || e.categorie === filtre.categorie) &&
        (!filtre?.correlationId || e.correlationId === filtre.correlationId),
    );
  }

  /** Suit une opération de bout en bout grâce à son identifiant de corrélation. */
  async tracer(correlationId: string): Promise<EntreeLog[]> {
    return this.lire({ correlationId });
  }
}
