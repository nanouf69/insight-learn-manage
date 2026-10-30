/**
 * Relecture de confirmation avec reprises BORNÉES.
 *
 * Constat 29/10 : 20 échecs « relecture » (10 élèves) en deux semaines ; une
 * seule lecture en erreur passagère (pool de connexions saturé PGRST003, cache
 * de schéma PGRST002, délai SQL 57014, réseau) annonçait un échec à l'élève
 * alors que ses réponses étaient déjà reçues par le serveur. On relit donc au
 * plus `essais` fois, uniquement pour une erreur passagère, avec une courte
 * attente aléatoire. Une DIFFÉRENCE de contenu n'est jamais réessayée ici :
 * elle reste un échec explicite. Aucune écriture n'est faite.
 */

export interface ErreurLecture {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}

const CODES_TRANSITOIRES = new Set([
  "PGRST000", "PGRST001", "PGRST002", "PGRST003",
  "57014", "57P01", "57P03", "53300", "53400", "40001", "40P01", "55P03",
]);

export function estJetonExpire(err: ErreurLecture | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST301" || err.code === "PGRST303" || /jwt\s*(expired|malformed)|invalid jwt/i.test(String(err.message ?? ""));
}

export function estErreurLectureTransitoire(err: ErreurLecture | null | undefined): boolean {
  if (!err) return false;
  const code = String(err.code ?? "");
  if (CODES_TRANSITOIRES.has(code) || /^08/.test(code)) return true;
  const status = Number(err.status ?? 0);
  if (status === 408 || status === 429 || status >= 500) return true;
  return /failed to fetch|network|timeout|timed out|load failed|fetch failed/i.test(String(err.message ?? ""));
}

/** Code court et sûr pour la télémétrie (aucune donnée élève). */
export function codeErreurSur(err: ErreurLecture | null | undefined): string {
  if (!err) return "inconnu";
  const brut = String(err.code ?? (err.status ? `http${err.status}` : "") ?? "");
  const propre = brut.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return propre || "reseau";
}

export async function relireAvecReprisesBornees<T>(
  lire: () => PromiseLike<{ data: T; error: ErreurLecture | null }>,
  opts: {
    essais?: number;
    delaisMs?: number[];
    renouvelerSession?: () => Promise<unknown>;
    attendre?: (ms: number) => Promise<void>;
    random?: () => number;
  } = {},
): Promise<{ data: T | null; error: ErreurLecture | null; essais: number }> {
  const essaisMax = Math.max(1, Math.min(opts.essais ?? 3, 5));
  const delais = opts.delaisMs ?? [400, 1200, 2500];
  const attendre = opts.attendre ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const random = opts.random ?? Math.random;
  let sessionRenouvelee = false;
  let dernier: { data: T | null; error: ErreurLecture | null } = { data: null, error: null };
  let faits = 0;
  for (let essai = 1; essai <= essaisMax; essai += 1) {
    faits = essai;
    try {
      const r = await lire();
      dernier = { data: r.data ?? null, error: r.error ?? null };
    } catch (e) {
      dernier = { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
    if (!dernier.error) return { ...dernier, essais: essai };
    if (essai === essaisMax) break;
    if (estJetonExpire(dernier.error) && !sessionRenouvelee && opts.renouvelerSession) {
      sessionRenouvelee = true;
      await opts.renouvelerSession();
      continue;
    }
    if (!estErreurLectureTransitoire(dernier.error)) break;
    const base = delais[Math.min(essai - 1, delais.length - 1)] ?? 1000;
    await attendre(Math.round(base * (0.75 + random() * 0.5)));
  }
  return { ...dernier, essais: faits };
}
