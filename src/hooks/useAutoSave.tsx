import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { savePublicFormDocument } from "@/lib/savePublicFormDocument";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveParams {
  apprenantId: string;
  typeDocument: string;
  titre: string;
  moduleId?: number;
  /** Interval in ms for periodic save (default 30000 = 30s) */
  interval?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  status: SaveStatus;
  lastSavedAt: Date | null;
  triggerSave: (data: Record<string, any>) => Promise<boolean>;
  /** Call this on every field change to queue a debounced save */
  queueSave: (data: Record<string, any>) => void;
  StatusIndicator: () => JSX.Element | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function saveWithRetry(
  params: {
    apprenantId: string;
    typeDocument: string;
    titre: string;
    donnees: Record<string, any>;
    moduleId?: number;
  },
  retries = MAX_RETRIES
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[AutoSave] No authenticated user, fallback to backend save-public-form");
    const backendSaved = await savePublicFormDocument({
      apprenantId: params.apprenantId,
      typeDocument: params.typeDocument,
      titre: params.titre,
      donnees: { ...params.donnees, module_id: params.moduleId || null },
    });

    if (backendSaved) {
      return true;
    }

    // Last-resort fallback to localStorage
    try {
      localStorage.setItem(
        `autosave_${params.apprenantId}_${params.typeDocument}`,
        JSON.stringify({ ...params.donnees, _savedAt: new Date().toISOString() })
      );
      console.log(`[AutoSave] Saved to localStorage fallback: ${params.typeDocument}`);
      return true;
    } catch {
      return false;
    }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try upsert: check if draft exists
      const { data: existing } = await supabase
        .from("apprenant_documents_completes" as any)
        .select("id")
        .eq("apprenant_id", params.apprenantId)
        .eq("type_document", params.typeDocument)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      let error;
      if (existing && (existing as any[]).length > 0) {
        // Update existing
        const result = await supabase
          .from("apprenant_documents_completes" as any)
          .update({
            donnees: params.donnees,
            titre: params.titre,
            module_id: params.moduleId || null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", (existing as any[])[0].id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("apprenant_documents_completes" as any)
          .insert({
            apprenant_id: params.apprenantId,
            user_id: user.id,
            type_document: params.typeDocument,
            titre: params.titre,
            donnees: params.donnees,
            module_id: params.moduleId || null,
          } as any);

        if (result.error) {
          console.error("[AutoSave] Supabase INSERT failed on apprenant_documents_completes", {
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
            hint: result.error.hint,
            apprenantId: params.apprenantId,
            typeDocument: params.typeDocument,
            userId: user.id,
          });
        }

        error = result.error;
      }

      if (error) {
        console.error(`[AutoSave] Attempt ${attempt}/${retries} failed:`, error);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }

        const fallbackSaved = await savePublicFormDocument({
          apprenantId: params.apprenantId,
          typeDocument: params.typeDocument,
          titre: params.titre,
          donnees: { ...params.donnees, module_id: params.moduleId || null },
        });

        return fallbackSaved;
      }

      // Also save to localStorage as backup
      try {
        localStorage.setItem(
          `autosave_${params.apprenantId}_${params.typeDocument}`,
          JSON.stringify({ ...params.donnees, _savedAt: new Date().toISOString() })
        );
      } catch {}

      console.log(`[AutoSave] ✅ Saved ${params.typeDocument} (attempt ${attempt})`);
      return true;
    } catch (err) {
      console.error(`[AutoSave] Attempt ${attempt}/${retries} exception:`, err);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }
  return false;
}

export function loadSavedDraft(apprenantId: string, typeDocument: string): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(`autosave_${apprenantId}_${typeDocument}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log(`[AutoSave] Loaded draft from localStorage: ${typeDocument}`);
      return parsed;
    }
  } catch {}
  return null;
}

/** Load draft from Supabase first, fallback to localStorage */
export async function loadDraftFromSupabase(
  apprenantId: string,
  typeDocument: string
): Promise<Record<string, any> | null> {
  if (!apprenantId) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("apprenant_documents_completes" as any)
        .select("donnees")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", typeDocument)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!error && data && (data as any[]).length > 0) {
        const donnees = (data as any[])[0].donnees;
        if (donnees && typeof donnees === "object") {
          console.log(`[AutoSave] ✅ Loaded draft from Supabase: ${typeDocument}`);
          // Also update localStorage as cache
          try {
            localStorage.setItem(
              `autosave_${apprenantId}_${typeDocument}`,
              JSON.stringify({ ...donnees, _savedAt: new Date().toISOString() })
            );
          } catch {}
          return donnees as Record<string, any>;
        }
      }
    }
  } catch (err) {
    console.warn(`[AutoSave] Supabase load failed for ${typeDocument}:`, err);
  }

  // Fallback to localStorage
  return loadSavedDraft(apprenantId, typeDocument);
}

/** React hook to load a draft on mount from Supabase, then localStorage */
export function useLoadDraft(
  apprenantId: string,
  typeDocument: string,
  onLoaded: (data: Record<string, any>) => void,
  enabled = true
) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !apprenantId || loadedRef.current) return;
    loadedRef.current = true;

    loadDraftFromSupabase(apprenantId, typeDocument).then((draft) => {
      if (draft) {
        console.log(`[AutoSave] Restoring draft for ${typeDocument}:`, Object.keys(draft).length, "keys");
        onLoaded(draft);
      }
    });
  }, [apprenantId, typeDocument, enabled]);
}

export function useAutoSave({
  apprenantId,
  typeDocument,
  titre,
  moduleId,
  interval = 30000,
  enabled = true,
}: UseAutoSaveParams): UseAutoSaveReturn {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const pendingDataRef = useRef<Record<string, any> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  const triggerSave = useCallback(async (data: Record<string, any>): Promise<boolean> => {
    if (!apprenantId || !enabled) return false;
    if (isSavingRef.current) return false;

    isSavingRef.current = true;
    setStatus("saving");

    const success = await saveWithRetry({
      apprenantId,
      typeDocument,
      titre,
      donnees: data,
      moduleId,
    });

    if (success) {
      setStatus("saved");
      setLastSavedAt(new Date());
      pendingDataRef.current = null;
      // Reset status after 3s
      setTimeout(() => setStatus(prev => prev === "saved" ? "idle" : prev), 3000);
    } else {
      setStatus("error");
      // Reset error after 5s
      setTimeout(() => setStatus(prev => prev === "error" ? "idle" : prev), 5000);
    }

    isSavingRef.current = false;
    return success;
  }, [apprenantId, typeDocument, titre, moduleId, enabled]);

  const queueSave = useCallback((data: Record<string, any>) => {
    pendingDataRef.current = data;
    // Debounce: save 2s after last change
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        triggerSave(pendingDataRef.current);
      }
    }, 2000);
  }, [triggerSave]);

  // Periodic save every 30s
  useEffect(() => {
    if (!enabled || !apprenantId) return;
    intervalRef.current = setInterval(() => {
      if (pendingDataRef.current && !isSavingRef.current) {
        console.log(`[AutoSave] Periodic save triggered for ${typeDocument}`);
        triggerSave(pendingDataRef.current);
      }
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, apprenantId, interval, triggerSave, typeDocument]);

  // beforeunload protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingDataRef.current || isSavingRef.current) {
        e.preventDefault();
        e.returnValue = "Des données n'ont pas encore été sauvegardées. Voulez-vous vraiment quitter ?";
        // Last-ditch localStorage save
        if (pendingDataRef.current && apprenantId) {
          try {
            localStorage.setItem(
              `autosave_${apprenantId}_${typeDocument}`,
              JSON.stringify({ ...pendingDataRef.current, _savedAt: new Date().toISOString() })
            );
          } catch {}
        }
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [apprenantId, typeDocument]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const StatusIndicator = useCallback(() => {
    if (status === "idle") return null;
    if (status === "saving") {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Sauvegarde en cours...
        </div>
      );
    }
    if (status === "saved") {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          ✅ Sauvegardé {lastSavedAt ? `à ${lastSavedAt.toLocaleTimeString("fr-FR")}` : ""}
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          ⚠️ Erreur de sauvegarde – Réessai en cours...
        </div>
      );
    }
    return null;
  }, [status, lastSavedAt]);

  return { status, lastSavedAt, triggerSave, queueSave, StatusIndicator };
}
