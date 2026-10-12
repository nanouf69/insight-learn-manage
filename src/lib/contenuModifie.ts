/** Signal local (même onglet + autres onglets) après un enregistrement réussi de l'éditeur. Aucune donnée transmise hormis l'id du module. */
export const CONTENU_MODIFIE_EVENT = "contenu-module-modifie";
export function signalerContenuModifie(moduleId: number) {
  try { window.dispatchEvent(new CustomEvent(CONTENU_MODIFIE_EVENT, { detail: { moduleId } })); } catch { /* hors navigateur */ }
  try { const bc = new BroadcastChannel(CONTENU_MODIFIE_EVENT); bc.postMessage({ moduleId }); bc.close(); } catch { /* non supporté */ }
}
export function ecouterContenuModifie(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(CONTENU_MODIFIE_EVENT, h);
  let bc: BroadcastChannel | null = null;
  try { bc = new BroadcastChannel(CONTENU_MODIFIE_EVENT); bc.onmessage = h; } catch { bc = null; }
  return () => { window.removeEventListener(CONTENU_MODIFIE_EVENT, h); bc?.close(); };
}
