/**
 * BASE D'AUDIT DES PAGES / SUPPORTS — séparée des questions.
 * Les pages (diapositives, pages PDF, fiches) ne sont PAS recomptées
 * automatiquement : ce sont les volumes relevés à l'audit du 11–12/10/2026.
 * `empreinte` = empreinte des supports enregistrés au moment de l'audit
 * (null = aucun support enregistré, contenu par défaut du code). Si un
 * support est remplacé dans l'éditeur, l'empreinte change et la carte
 * signale « pages à recompter » au lieu de prétendre une mise à jour.
 * Bilans et examens blancs : 0 page (questions seulement).
 */
export interface BasePages { pages: number; empreinte: string | null; alias?: number }

export const BASE_PAGES_AUDIT: Record<number, BasePages> = {
  26: { pages: 12, empreinte: null },
  32: { pages: 9, empreinte: "9:11cdf6a8" },
  34: { pages: 9, empreinte: null },
  2: { pages: 377, empreinte: "15:c0e64c2c" },
  10: { pages: 386, empreinte: "18:dba10a7c" },
  40: { pages: 72, empreinte: "5:f597372e" },
  41: { pages: 60, empreinte: "2:19a85433" },
  8: { pages: 39, empreinte: "7:b034c080" },
  6: { pages: 10, empreinte: "10:69ffb726" },
  3: { pages: 15, empreinte: null },
  60: { pages: 5, empreinte: null },
  61: { pages: 7, empreinte: null },
  62: { pages: 4, empreinte: null },
  63: { pages: 3, empreinte: null },
  7: { pages: 118, empreinte: "17:3be52227" },
  64: { pages: 11, empreinte: null },
  12: { pages: 1, empreinte: "1:bcde7fb" },
  13: { pages: 1, empreinte: "1:bbbcf7a" },
  70: { pages: 89, empreinte: null },
  71: { pages: 107, empreinte: null },
  72: { pages: 43, empreinte: null },
  73: { pages: 29, empreinte: null },
  4: { pages: 0, empreinte: "0:1505" }, 5: { pages: 0, empreinte: "0:1505" },
  9: { pages: 0, empreinte: "0:1505" }, 11: { pages: 0, empreinte: "0:1505" },
  27: { pages: 0, empreinte: "0:1505" }, 28: { pages: 0, empreinte: "0:1505" },
  29: { pages: 0, empreinte: "0:1505" }, 30: { pages: 0, empreinte: "0:1505" },
  35: { pages: 0, empreinte: "0:1505" }, 36: { pages: 0, empreinte: null },
  37: { pages: 0, empreinte: null }, 38: { pages: 0, empreinte: null },
  // Introductions présentiel : pages non auditées, base de l'intro e-learning équivalente (limite signalée).
  1: { pages: 12, empreinte: "14:ddc83c68", alias: 26 },
  31: { pages: 9, empreinte: null, alias: 32 },
  33: { pages: 9, empreinte: null, alias: 34 },
};
