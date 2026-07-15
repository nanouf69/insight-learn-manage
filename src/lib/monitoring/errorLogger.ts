import { supabase } from "@/integrations/supabase/client";

/**
 * Monitoring d'erreurs centralisé.
 * - Capture les erreurs JS non gérées (window.onerror)
 * - Capture les promesses rejetées (unhandledrejection)
 * - Wrap console.error pour tout logger
 * - Expose captureError() pour usage manuel (ErrorBoundary, try/catch)
 * Les erreurs sont bufferisées + agrégées côté DB par fingerprint.
 */

type ErrorPayload = {
  message: string;
  level?: "error" | "warning" | "info";
  source?: string;
  stack?: string;
  component_stack?: string;
  context?: Record<string, unknown>;
  fingerprint?: string;
};

const IGNORED_PATTERNS = [
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /Script error\.?$/i,
  /Load failed/i,
  /NetworkError when attempting/i,
  /removeChild.*not a child/i,
  /\[DOM Patch\]/i,
];

const RECENT_FINGERPRINTS = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000; // même erreur = 1 envoi max / 10s côté client

function shouldIgnore(message: string): boolean {
  return IGNORED_PATTERNS.some((r) => r.test(message));
}

function computeFingerprint(msg: string, route: string): string {
  // Un simple hash lisible côté client
  const raw = `${route}|${msg}`.slice(0, 500);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return `c_${h}`;
}

async function currentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return { id: data.user?.id ?? null, email: data.user?.email ?? null };
  } catch {
    return { id: null, email: null };
  }
}

let installed = false;

export async function captureError(payload: ErrorPayload) {
  try {
    const message = (payload.message || "Unknown error").slice(0, 2000);
    if (shouldIgnore(message)) return;

    const route = typeof window !== "undefined" ? window.location.pathname : "";
    const fp = payload.fingerprint || computeFingerprint(message, route);

    const now = Date.now();
    const last = RECENT_FINGERPRINTS.get(fp) ?? 0;
    if (now - last < DEDUP_WINDOW_MS) return;
    RECENT_FINGERPRINTS.set(fp, now);
    // Cleanup
    if (RECENT_FINGERPRINTS.size > 200) {
      for (const [k, t] of RECENT_FINGERPRINTS) {
        if (now - t > DEDUP_WINDOW_MS * 6) RECENT_FINGERPRINTS.delete(k);
      }
    }

    const user = await currentUser();

    await supabase.rpc("log_error", {
      _message: message,
      _level: payload.level ?? "error",
      _source: payload.source ?? "client",
      _stack: payload.stack?.slice(0, 8000) ?? null,
      _component_stack: payload.component_stack?.slice(0, 8000) ?? null,
      _url: typeof window !== "undefined" ? window.location.href : null,
      _route: route,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _user_id: user.id,
      _user_email: user.email,
      _context: (payload.context as never) ?? null,
      _fingerprint: fp,
    });
  } catch {
    // Le monitoring ne doit JAMAIS crasher l'app
  }
}

export function installErrorMonitoring() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    captureError({
      message: event.message || String(event.error ?? "window.error"),
      stack: event.error?.stack,
      source: "window.onerror",
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error ? reason.message : typeof reason === "string" ? reason : JSON.stringify(reason);
    captureError({
      message: `[Unhandled Promise] ${msg}`.slice(0, 500),
      stack: reason instanceof Error ? reason.stack : undefined,
      source: "unhandledrejection",
    });
  });

  // Wrap console.error pour capter aussi les erreurs "logged" manuellement
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    origError(...args);
    try {
      const message = args
        .map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ")
        .slice(0, 500);
      const errArg = args.find((a) => a instanceof Error) as Error | undefined;
      captureError({
        message: `[console.error] ${message}`,
        stack: errArg?.stack,
        source: "console.error",
        level: "error",
      });
    } catch {
      /* noop */
    }
  };
}
