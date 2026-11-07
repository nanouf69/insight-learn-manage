/**
 * Conservation EXACTE des saisies contenant U+0000 (refus PostgreSQL 22P05).
 *
 * PostgreSQL ne peut stocker U+0000 ni en jsonb ni en text. Solution retenue
 * (la plus simple sans perte, sans toucher U+2400 ni aucun autre caractère) :
 *   - la colonne habituelle reçoit une PROJECTION : la même valeur sans les
 *     U+0000 (caractère invisible ; tous les lecteurs existants affichent donc
 *     exactement le même texte visible) ;
 *   - l'original exact est conservé à côté, par question, dans un marqueur
 *     versionné { v, b64, projection } (UTF-8 du JSON original en base64).
 * Un lecteur n'utilise l'original QUE si le marqueur porte la version connue et
 * que sa projection est identique à la valeur stockée (sinon : marqueur périmé,
 * jamais appliqué). Une valeur sans marqueur (ancienne) n'est jamais décodée.
 *
 * COPIE IDENTIQUE : supabase/functions/upsert-reponse-apprenant/originauxExacts.ts
 * (vérifié par test). Ne modifier que les deux ensemble.
 */
export const ORIGINAL_VERSION = "nul-b64-v1";
const NUL = "\u0000";

export interface MarqueurOriginal {
  v: string;
  b64: string;
  projection: unknown;
  /** Posé par le serveur : numéro d'écriture de la question (reponses_meta.seq). */
  seq?: number;
}

export function contientNul(value: unknown): boolean {
  if (typeof value === "string") return value.includes(NUL);
  if (Array.isArray(value)) return value.some(contientNul);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => k.includes(NUL) || contientNul(v));
  }
  return false;
}

/** Une clé d'objet contenant U+0000 n'a pas de projection sûre (collision possible). */
export function cleAvecNul(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(cleAvecNul);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => k.includes(NUL) || cleAvecNul(v));
  }
  return false;
}

export function projeterSansNul(value: unknown): unknown {
  if (typeof value === "string") return value.split(NUL).join("");
  if (Array.isArray(value)) return value.map(projeterSansNul);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = projeterSansNul(v);
    return out;
  }
  return value;
}

/** JSON canonique (clés triées) : jsonb réordonne les clés des objets. */
export function canonique(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonique).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonique(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function versBase64(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let bin = "";
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

function depuisBase64(b64: string): string {
  const bin = atob(b64);
  const octets = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: true }).decode(octets);
}

export function marqueurOriginal(original: unknown): MarqueurOriginal {
  return { v: ORIGINAL_VERSION, b64: versBase64(JSON.stringify(original ?? null)), projection: projeterSansNul(original ?? null) };
}

export type StatutOriginal = "sans_marqueur" | "exact" | "marqueur_perime" | "version_inconnue" | "marqueur_invalide";

/**
 * Lecture d'une valeur stockée. Ne restitue l'original que s'il est prouvé
 * cohérent avec la valeur stockée ; sinon renvoie la valeur stockée telle quelle
 * avec un statut explicite (jamais de décodage deviné).
 */
export function lireOriginal(valeurStockee: unknown, marqueur: unknown, seqStockee?: unknown): { statut: StatutOriginal; valeur: unknown } {
  if (marqueur == null) return { statut: "sans_marqueur", valeur: valeurStockee };
  const m = marqueur as Partial<MarqueurOriginal>;
  if (typeof m !== "object" || m.v !== ORIGINAL_VERSION) return { statut: "version_inconnue", valeur: valeurStockee };
  if (canonique(m.projection) !== canonique(valeurStockee)) return { statut: "marqueur_perime", valeur: valeurStockee };
  // Une écriture ultérieure par un autre chemin (même texte visible) invalide le marqueur.
  if (seqStockee !== undefined && (m.seq == null || Number(m.seq) !== Number(seqStockee))) return { statut: "marqueur_perime", valeur: valeurStockee };
  try {
    const original = JSON.parse(depuisBase64(String(m.b64 ?? "")));
    if (canonique(projeterSansNul(original)) !== canonique(valeurStockee)) return { statut: "marqueur_invalide", valeur: valeurStockee };
    return { statut: "exact", valeur: original };
  } catch {
    return { statut: "marqueur_invalide", valeur: valeurStockee };
  }
}

/** Restitue toutes les réponses d'une ligne `reponses_apprenants`. */
export function lireReponsesExactes(
  reponses: Record<string, unknown> | null | undefined,
  originaux: Record<string, unknown> | null | undefined,
  meta: Record<string, { seq?: unknown } | null | undefined> | null | undefined,
): { reponses: Record<string, unknown>; anomalies: Record<string, StatutOriginal> } {
  const out: Record<string, unknown> = {};
  const anomalies: Record<string, StatutOriginal> = {};
  for (const [k, v] of Object.entries(reponses ?? {})) {
    const r = lireOriginal(v, originaux?.[k], originaux?.[k] == null ? undefined : meta?.[k]?.seq ?? null);
    out[k] = r.valeur;
    if (r.statut !== "sans_marqueur" && r.statut !== "exact") anomalies[k] = r.statut;
  }
  return { reponses: out, anomalies };
}

export interface LotPrepare {
  reponses: Record<string, unknown>;
  events: unknown[];
  originaux: Record<string, MarqueurOriginal>;
}

/** Prépare un lot : projection + marqueurs uniquement pour les valeurs contenant U+0000. */
export function preparerLotSansNul(reponses: Record<string, unknown>, events: unknown[]): LotPrepare {
  const originaux: Record<string, MarqueurOriginal> = {};
  const rep: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(reponses)) {
    if (contientNul(v)) {
      originaux[k] = marqueurOriginal(v);
      rep[k] = originaux[k].projection;
    } else {
      rep[k] = v;
    }
  }
  const evs = events.map((e) => {
    if (!e || typeof e !== "object") return e;
    const ev = e as Record<string, unknown>;
    if (!contientNul(ev.valeur)) return projeterSansNul(ev);
    const m = marqueurOriginal(ev.valeur);
    return { ...(projeterSansNul(ev) as Record<string, unknown>), valeur: m.projection, valeur_originale: m };
  });
  return { reponses: rep, events: evs, originaux };
}
