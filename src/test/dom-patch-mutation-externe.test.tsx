import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { installDomPatch } from "@/lib/domPatch";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function Bouton({ etat }: { etat: boolean }) {
  return (
    <button>
      {etat && <span>!</span>}
      {"Module "}
      {"8"}
    </button>
  );
}

/** Simule une traduction automatique : chaque nœud texte est remplacé par <font>texte</font>. */
function traduire(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textes: Text[] = [];
  while (walker.nextNode()) textes.push(walker.currentNode as Text);
  for (const t of textes) {
    const font = document.createElement("font");
    font.textContent = t.data;
    t.parentNode!.replaceChild(font, t);
  }
}

function scenario() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Bouton etat={false} />));
  traduire(host);
  // React insère "Reprendre" avant le nœud texte qu'il croit encore présent,
  // puis retire l'ancien : nœud de référence déplacé hors du parent.
  act(() => root.render(<Bouton etat={true} />));
  act(() => root.render(<Bouton etat={false} />));
  act(() => root.unmount());
  host.remove();
}

describe("DOM modifié hors React (traduction) dans un bouton", () => {
  it("sans protection : reproduction de l'erreur NotFoundError", () => {
    expect(scenario).toThrow(/not a child|NotFound|can not be found/i);
  });
  it("avec protection : aucun plantage", () => {
    installDomPatch();
    expect(scenario).not.toThrow();
  });
});
