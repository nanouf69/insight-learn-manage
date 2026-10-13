/**
 * Affichage ADMIN d'un mail archivé, sans déclencher de suivi :
 * - supprime scripts, iframes, formulaires, objets, liens <link>/<meta>/<base>
 * - supprime les attributs on* et les URL javascript:
 * - bloque TOUTES les images distantes (pixel de suivi compris) ; seules les images data: restent
 * - retire les paramètres de suivi des liens ; liens ouverts seulement sur clic, noopener
 * Le résultat est en plus rendu dans un iframe sandbox sans script avec CSP bloquant le réseau.
 */
const TAGS_INTERDITS = ["script", "iframe", "frame", "frameset", "object", "embed", "form", "input", "button", "textarea", "select", "link", "meta", "base", "applet", "audio", "video", "source", "track", "svg", "math", "noscript"];
const PARAMS_SUIVI = /^(utm_|mc_|_hs|fbclid|gclid|mkt_tok|trk|tracking)/i;

export function nettoyerUrlLien(href: string): string | null {
  const v = href.trim();
  if (/^mailto:|^tel:/i.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (/email-track-open/i.test(u.pathname)) return null;
    [...u.searchParams.keys()].forEach((k) => { if (PARAMS_SUIVI.test(k)) u.searchParams.delete(k); });
    return u.toString();
  } catch {
    return null;
  }
}

export function assainirHtmlEmail(html: string): { html: string; imagesBloquees: number } {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  doc.querySelectorAll(TAGS_INTERDITS.join(",")).forEach((n) => n.remove());
  let imagesBloquees = 0;
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on") || n === "srcset" || n === "background" || n === "formaction" || n === "ping" || n === "poster") el.removeAttribute(attr.name);
      else if (n === "style" && /url\s*\(|expression\s*\(/i.test(attr.value)) el.setAttribute("style", attr.value.replace(/url\s*\([^)]*\)|expression\s*\([^)]*\)/gi, "none"));
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") || "";
      if (!/^data:image\//i.test(src)) {
        el.removeAttribute("src");
        const w = Number(el.getAttribute("width") || 0);
        if (w > 0 && w <= 2) { el.remove(); return; } // pixel de suivi : retiré sans le compter
        imagesBloquees++;
        el.replaceWith(Object.assign(doc.createElement("span"), { textContent: `[image non chargée${el.getAttribute("alt") ? ` : ${el.getAttribute("alt")}` : ""}]` }));
        return;
      }
    }
    if (el.tagName === "A") {
      const href = el.getAttribute("href");
      const propre = href ? nettoyerUrlLien(href) : null;
      if (propre) el.setAttribute("href", propre); else el.removeAttribute("href");
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  doc.querySelectorAll("style").forEach((s) => { s.textContent = (s.textContent || "").replace(/@import[^;]*;?|url\s*\([^)]*\)/gi, ""); });
  return { html: doc.body.innerHTML, imagesBloquees };
}

export const CSP_EMAIL = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'";

export function documentIsole(htmlPropre: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP_EMAIL}"><meta name="referrer" content="no-referrer"><style>body{font-family:Arial,sans-serif;font-size:14px;color:#111;background:#fff;margin:12px;word-wrap:break-word}img{max-width:100%}table{max-width:100%}</style></head><body>${htmlPropre}</body></html>`;
}
