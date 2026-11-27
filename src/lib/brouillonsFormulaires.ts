/**
 * Brouillons de formulaires apprenant (useAutoSave) avant déconnexion.
 * Clés : autosave_pending_<apprenantId>_<typeDocument> (seules celles du dossier actif sont lues).
 * Un brouillon en attente n'est considéré sauvegardé qu'après relecture serveur identique ;
 * rien n'est jamais supprimé : la copie locale passe seulement à _pending:false.
 */
import { supabase } from "@/integrations/supabase/client";

export const PREFIXE_BROUILLON = "autosave_pending_";
export const META_BROUILLON = "_autosave_meta";
export interface MetaBrouillon { titre: string; moduleId?: number | null }

type Flusher = { apprenantId: string; typeDocument: string; flush: () => Promise<boolean> };
const montes = new Map<string, Flusher>();
/** Formulaire affiché : il peut envoyer lui-même sa saisie en mémoire (même si le stockage local a échoué). */
export function enregistrerFormulaireMonte(f: Flusher): () => void {
  const id = `${f.apprenantId}:${f.typeDocument}:${Math.random()}`;
  montes.set(id, f);
  return () => { montes.delete(id); };
}

export interface KVBrouillons { getItem(k: string): string | null; setItem(k: string, v: string): void; keys(): string[] }
export interface DepsBrouillons {
  kv: KVBrouillons;
  montes: () => Flusher[];
  enregistrer: (a: { apprenantId: string; userId: string; typeDocument: string; titre: string; moduleId: number | null; donnees: Record<string, unknown> }) => Promise<{ error: unknown }>;
  relire: (a: { apprenantId: string; typeDocument: string; titre: string }) => Promise<{ data: { donnees: unknown } | null; error: unknown }>;
}

const canon = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canon((v as any)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
};
export const memesDonnees = (a: unknown, b: unknown) => canon(a) === canon(b);

/** Données à envoyer : sans les marqueurs locaux. */
export function donneesBrouillon(entree: Record<string, unknown>): Record<string, unknown> {
  const { _pending, [META_BROUILLON]: _meta, _non_envoye_apres_validation: _marque, ...reste } = entree;
  return reste;
}

/** Relecture serveur d'un envoi : identique, ou remplacé par une validation déjà enregistrée. */
export async function confirmerParRelecture(
  relire: DepsBrouillons["relire"], a: { apprenantId: string; typeDocument: string; titre: string }, donnees: Record<string, unknown>,
): Promise<boolean> {
  try {
    const r = await relire(a);
    if (r.error || !r.data) return false;
    const serveur = r.data.donnees as Record<string, unknown> | null;
    return memesDonnees(serveur, donnees) || (serveur?._status === "completed" && donnees._status !== "completed");
  } catch { return false; }
}

export type ResultatBrouillons = { ok: boolean; aRouvrir: string[]; nonConfirmes: string[] };

export async function flushBrouillonsFormulaires(
  ctx: { userId: string | null; apprenantId: string | null }, deps: DepsBrouillons = depsBrouillonsNavigateur(),
): Promise<ResultatBrouillons> {
  const aRouvrir: string[] = []; const nonConfirmes: string[] = [];
  if (!ctx.apprenantId) return { ok: true, aRouvrir, nonConfirmes };
  for (const f of deps.montes().filter((m) => m.apprenantId === ctx.apprenantId)) {
    let ok = false; try { ok = await f.flush(); } catch { ok = false; }
    if (!ok) nonConfirmes.push(f.typeDocument);
  }
  const prefixe = `${PREFIXE_BROUILLON}${ctx.apprenantId}_`;
  for (const cle of deps.kv.keys().filter((k) => k.startsWith(prefixe))) {
    const typeDocument = cle.slice(prefixe.length);
    let brut: string | null = null; let entree: Record<string, any> | null = null;
    try { brut = deps.kv.getItem(cle); entree = JSON.parse(brut ?? "null"); } catch { nonConfirmes.push(typeDocument); continue; }
    if (!entree?._pending) continue;
    const meta = entree[META_BROUILLON] as MetaBrouillon | undefined;
    if (!ctx.userId || !meta?.titre) { aRouvrir.push(typeDocument); continue; } // ancien brouillon sans titre : conservé, jamais deviné
    const donnees = donneesBrouillon(entree);
    try {
      const w = await deps.enregistrer({ apprenantId: ctx.apprenantId, userId: ctx.userId, typeDocument, titre: meta.titre, moduleId: meta.moduleId ?? null, donnees });
      if (w.error) { nonConfirmes.push(typeDocument); continue; }
      const r = await deps.relire({ apprenantId: ctx.apprenantId, typeDocument, titre: meta.titre });
      if (r.error || !r.data) { nonConfirmes.push(typeDocument); continue; }
      const serveur = r.data.donnees as Record<string, unknown> | null;
      const remplaceParValidation = serveur?._status === "completed" && donnees._status !== "completed";
      if (!memesDonnees(serveur, donnees) && !remplaceParValidation) { nonConfirmes.push(typeDocument); continue; }
      if (deps.kv.getItem(cle) !== brut) { nonConfirmes.push(typeDocument); continue; } // modifié pendant l'envoi
      deps.kv.setItem(cle, JSON.stringify({ ...entree, _pending: false, ...(remplaceParValidation ? { _non_envoye_apres_validation: true } : {}) }));
    } catch { nonConfirmes.push(typeDocument); }
  }
  return { ok: aRouvrir.length === 0 && nonConfirmes.length === 0, aRouvrir, nonConfirmes };
}

export const depsBrouillonsNavigateur = (): DepsBrouillons => ({
  kv: {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => !!k),
  },
  montes: () => [...montes.values()],
  enregistrer: async (a) => (supabase.from("apprenant_documents_completes" as any).upsert({
    apprenant_id: a.apprenantId, user_id: a.userId, type_document: a.typeDocument, titre: a.titre,
    donnees: a.donnees, module_id: a.moduleId, updated_at: new Date().toISOString(),
  } as any, { onConflict: "apprenant_id,type_document,titre" })) as any,
  relire: async (a) => (supabase.from("apprenant_documents_completes" as any).select("donnees")
    .eq("apprenant_id", a.apprenantId).eq("type_document", a.typeDocument).eq("titre", a.titre).maybeSingle()) as any,
});
