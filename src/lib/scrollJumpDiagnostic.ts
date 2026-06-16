/**
 * Diagnostic global pour identifier ce qui fait remonter la page vers le haut
 * pendant un quiz / exercice.
 *
 * À importer une seule fois dans App.tsx :
 *   import "@/lib/scrollJumpDiagnostic";
 *
 * Active automatiquement le tracing si :
 *   - localStorage.SCROLL_DEBUG === "1", OU
 *   - URL contient ?scrolldebug=1
 *
 * Logs émis :
 *   - 🔴 [ScrollJump] saut vers le haut détecté (delta + stack)
 *   - 🟡 [ScrollJump] window.scrollTo(0) appelé (stack)
 *   - 🟡 [ScrollJump] scrollIntoView() appelé sur un élément (tag, stack)
 *   - 🟡 [ScrollJump] document.documentElement.scrollTop = 0 (stack)
 */

(function installScrollJumpDiagnostic() {
  if (typeof window === "undefined") return;
  if ((window as any).__scrollJumpDiagInstalled) return;

  const params = new URLSearchParams(window.location.search);
  const enabled =
    params.get("scrolldebug") === "1" ||
    (typeof localStorage !== "undefined" && localStorage.getItem("SCROLL_DEBUG") === "1");

  if (!enabled) return;
  (window as any).__scrollJumpDiagInstalled = true;

  // Expose helpers utilitaires
  (window as any).__scrollDebugOn = () => {
    localStorage.setItem("SCROLL_DEBUG", "1");
    console.info("[ScrollJump] activé (rechargez la page)");
  };
  (window as any).__scrollDebugOff = () => {
    localStorage.removeItem("SCROLL_DEBUG");
    console.info("[ScrollJump] désactivé (rechargez la page)");
  };

  console.info(
    "%c[ScrollJump] diagnostic actif",
    "background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold"
  );

  const stack = () => {
    const e = new Error();
    // Coupe les 2 premières lignes (Error + ce helper)
    return (e.stack || "").split("\n").slice(2).join("\n");
  };

  let lastY = window.scrollY;
  let lastT = performance.now();

  // 1) Détection des sauts vers le haut (delta important en peu de temps)
  const onScroll = () => {
    const y = window.scrollY;
    const t = performance.now();
    const dt = t - lastT;
    const dy = y - lastY;

    // Saut vers le haut significatif (>120px) en moins de 200ms
    if (dy < -120 && dt < 200) {
      console.group(
        `%c🔴 [ScrollJump] saut vers le haut: ${Math.round(dy)}px en ${Math.round(dt)}ms`,
        "color:#dc2626;font-weight:bold"
      );
      console.log("from y=", lastY, "→ y=", y);
      console.log("activeElement:", document.activeElement);
      console.log("stack:\n" + stack());
      console.groupEnd();
    }

    lastY = y;
    lastT = t;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // 2) Monkey-patch window.scrollTo
  const origScrollTo = window.scrollTo.bind(window);
  (window as any).scrollTo = function patchedScrollTo(...args: any[]) {
    let targetY: number | undefined;
    if (typeof args[0] === "object" && args[0] !== null) {
      targetY = args[0].top;
    } else if (args.length >= 2) {
      targetY = args[1];
    }
    if (typeof targetY === "number" && targetY < 20 && window.scrollY > 120) {
      console.group(
        `%c🟡 [ScrollJump] window.scrollTo(top=${targetY}) appelé`,
        "color:#ca8a04;font-weight:bold"
      );
      console.log("scrollY actuel:", window.scrollY);
      console.log("stack:\n" + stack());
      console.groupEnd();
    }
    return origScrollTo(...(args as [any]));
  };

  // 3) Monkey-patch Element.prototype.scrollIntoView
  const origScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function patchedScrollIntoView(arg?: any) {
    if (window.scrollY > 120) {
      console.group(
        `%c🟡 [ScrollJump] scrollIntoView() sur <${this.tagName.toLowerCase()}>`,
        "color:#ca8a04;font-weight:bold"
      );
      console.log("element:", this);
      console.log("classes:", (this as Element).className);
      console.log("scrollY actuel:", window.scrollY);
      console.log("stack:\n" + stack());
      console.groupEnd();
    }
    return origScrollIntoView.call(this, arg);
  };

  // 4) Monkey-patch scrollTop setter sur documentElement / body
  const interceptScrollTop = (proto: any, name: string) => {
    const desc = Object.getOwnPropertyDescriptor(proto, "scrollTop");
    if (!desc?.set || !desc.get) return;
    Object.defineProperty(proto, "scrollTop", {
      configurable: true,
      get() {
        return desc.get!.call(this);
      },
      set(v: number) {
        if (v < 20 && desc.get!.call(this) > 120) {
          console.group(
            `%c🟡 [ScrollJump] ${name}.scrollTop = ${v}`,
            "color:#ca8a04;font-weight:bold"
          );
          console.log("scrollY actuel:", window.scrollY);
          console.log("stack:\n" + stack());
          console.groupEnd();
        }
        desc.set!.call(this, v);
      },
    });
  };
  try {
    interceptScrollTop(Element.prototype, "Element");
  } catch {
    /* ignore */
  }
})();

export {};
