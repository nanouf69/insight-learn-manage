/**
 * Onglet resté ouvert après une mise en ligne (31/10) : un élève connecté depuis
 * le matin gardait l'ancienne version (boucle de rechargement du module déjà
 * corrigée en ligne). Rien ne le prévenait : le contrôle de version existant ne
 * concerne que l'admin et la garde « chunk » n'agit que sur une erreur 404.
 *
 * Ici : relecture légère de la page d'accueil publiée (sans cache) au retour sur
 * l'onglet et toutes les 5 minutes ; si le script principal a changé, on affiche
 * la notification persistante existante avec le bouton « Recharger ».
 * JAMAIS de rechargement automatique ; aucune donnée locale touchée.
 */
import { notifierChunkObsolete } from "@/lib/chunkVersionGuard";

const INTERVALLE_MS = 5 * 60 * 1000;

/** Script principal d'une page HTML Vite publiée (`/assets/index-XXXX.js`), sinon null. */
export function scriptPrincipal(html: string): string | null {
  const m = html.match(/<script[^>]*type="module"[^>]*src="([^"]*\/assets\/index-[^"]+\.js)"/i)
    ?? html.match(/<script[^>]*src="([^"]*\/assets\/index-[^"]+\.js)"[^>]*type="module"/i);
  return m ? new URL(m[1], "https://x").pathname : null;
}

/** Vrai seulement si les deux versions sont connues et différentes (lecture ratée = rien). */
export function versionDifferente(actuelle: string | null, publiee: string | null): boolean {
  return !!actuelle && !!publiee && actuelle !== publiee;
}

function scriptCourant(doc: Document): string | null {
  const el = doc.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return el ? new URL(el.src, "https://x").pathname : null;
}

let installe = false;

export function installDeployedVersionWatch(win: Window = window, fetcher: typeof fetch = fetch): void {
  if (installe) return;
  const actuelle = scriptCourant(win.document);
  if (!actuelle) return; // aperçu de développement : pas de fichier versionné
  installe = true;
  let enCours = false;
  let signale = false;
  const verifier = async () => {
    if (enCours || signale || win.document.visibilityState === "hidden") return;
    enCours = true;
    try {
      const res = await fetcher(`/?_v=${Date.now()}`, { cache: "no-store", credentials: "omit" });
      if (!res.ok) return;
      if (versionDifferente(actuelle, scriptPrincipal(await res.text()))) {
        signale = true;
        notifierChunkObsolete();
      }
    } catch { /* réseau absent : on réessaiera plus tard */ } finally { enCours = false; }
  };
  win.addEventListener("focus", () => { void verifier(); });
  win.addEventListener("pageshow", () => { void verifier(); });
  win.document.addEventListener("visibilitychange", () => { if (win.document.visibilityState === "visible") void verifier(); });
  win.setInterval(() => { void verifier(); }, INTERVALLE_MS);
  void verifier();
}
