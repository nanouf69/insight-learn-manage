import { useEffect, useRef, useState } from "react";
import { savePublicFormDocument } from "@/lib/savePublicFormDocument";
import { supabase } from "@/integrations/supabase/client";

/**
 * Liste de toutes les clés localStorage utilisées par les 12 étapes du parcours d'inscription.
 * Toute clé ajoutée ici sera automatiquement persistée en BDD et restaurée au chargement
 * (même si l'apprenant se déconnecte ou change d'appareil).
 */
const ONBOARDING_KEYS = [
  // Identité (Step 1) — déjà persistées dans la table apprenants, mais on garde une copie pour restauration rapide
  "onboarding_nom",
  "onboarding_prenom",
  "onboarding_email",
  "onboarding_telephone",
  "onboarding_adresse",
  "onboarding_code_postal",
  "onboarding_ville",
  "onboarding_session_id",
  "onboarding_apprenant_id",

  // Step 1 — confirmations & questions
  "onboarding_step1_identity",
  "onboarding_step1_mois_justificatif",
  "onboarding_step1_answers",

  // Steps 2-10 — confirmations
  "onboarding_step2_confirmed",
  "onboarding_step3_confirmed",
  "onboarding_step4_confirmed",
  "onboarding_step5_examId",
  "onboarding_step5_confirmed",
  "onboarding_step6_confirmed",
  "onboarding_step7_confirmed",
  "onboarding_step8_confirmed",
  "onboarding_step9_confirmed",
  "onboarding_step10_confirmed",

  // Step 7 — mot de passe CMA
  "onboarding_mot_de_passe_cma",

  // Step 11 — dossier & examen
  "onboarding_numero_dossier",
  "onboarding_date_examen",
  "onboarding_type_examen",

  // Step 12 — signature & B2
  "onboarding_signature",
  "onboarding_b2_vierge",
];

const TYPE_DOCUMENT = "onboarding_state";
const TITRE = "État du parcours d'inscription (11 étapes)";
const DEBOUNCE_MS = 1500;

function snapshotLocalStorage(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const key of ONBOARDING_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

function restoreToLocalStorage(snapshot: Record<string, string>) {
  let restoredCount = 0;
  for (const [key, value] of Object.entries(snapshot)) {
    // Ne pas écraser une valeur locale déjà saisie sur cet appareil
    if (localStorage.getItem(key) === null && typeof value === "string") {
      localStorage.setItem(key, value);
      restoredCount++;
    }
  }
  return restoredCount;
}

/**
 * Hook qui :
 *  1. Au montage, charge l'état précédent depuis la BDD et restaure les clés manquantes du localStorage.
 *  2. Surveille les changements du localStorage et sauvegarde en BDD (debouncé).
 *  3. Sauvegarde aussi avant fermeture de l'onglet (beforeunload).
 */
export function useOnboardingPersistence(apprenantId: string | null | undefined) {
  const [isLoaded, setIsLoaded] = useState(false);
  const lastSavedHashRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1️⃣ Restauration au chargement
  useEffect(() => {
    if (!apprenantId) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("apprenant_documents_completes" as any)
          .select("donnees")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", TYPE_DOCUMENT)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (!error && data && (data as any).donnees) {
          const donnees = (data as any).donnees as Record<string, string>;
          const restored = restoreToLocalStorage(donnees);
          if (restored > 0) {
            console.log(`[OnboardingPersistence] ✅ Restauré ${restored} valeur(s) depuis la BDD`);
            // Émettre un event pour que les composants puissent éventuellement se re-render
            window.dispatchEvent(new Event("onboarding:restored"));
          }
          lastSavedHashRef.current = JSON.stringify(donnees);
        }
      } catch (err) {
        console.warn("[OnboardingPersistence] Échec restauration:", err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apprenantId]);

  // 2️⃣ Sauvegarde périodique (debouncée) lorsque le localStorage change
  useEffect(() => {
    if (!apprenantId || !isLoaded) return;

    const scheduleSave = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const snapshot = snapshotLocalStorage();
        const hash = JSON.stringify(snapshot);
        if (hash === lastSavedHashRef.current) return;

        const ok = await savePublicFormDocument({
          apprenantId,
          typeDocument: TYPE_DOCUMENT,
          titre: TITRE,
          donnees: snapshot,
        });

        if (ok) {
          lastSavedHashRef.current = hash;
          console.log("[OnboardingPersistence] ✅ État synchronisé en BDD");
        }
      }, DEBOUNCE_MS);
    };

    // Surveille les modifications du localStorage (autres onglets)
    const onStorage = (e: StorageEvent) => {
      if (e.key && ONBOARDING_KEYS.includes(e.key)) scheduleSave();
    };
    window.addEventListener("storage", onStorage);

    // Patch setItem/removeItem pour détecter les modifications dans le même onglet
    const origSetItem = localStorage.setItem.bind(localStorage);
    const origRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (key: string, value: string) {
      origSetItem(key, value);
      if (ONBOARDING_KEYS.includes(key)) scheduleSave();
    };
    localStorage.removeItem = function (key: string) {
      origRemoveItem(key);
      if (ONBOARDING_KEYS.includes(key)) scheduleSave();
    };

    // Sauvegarde initiale (au cas où des données auraient été saisies avant le chargement BDD)
    scheduleSave();

    // Polling de secours toutes les 15 s (ceinture + bretelles si un autre script écrit sans passer par setItem)
    const intervalId = setInterval(scheduleSave, 15000);

    // Sauvegarde avant fermeture
    const onBeforeUnload = () => {
      const snapshot = snapshotLocalStorage();
      const hash = JSON.stringify(snapshot);
      if (hash === lastSavedHashRef.current) return;
      // sendBeacon-like: utilise fetch keepalive (pas d'attente nécessaire)
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (baseUrl && apikey) {
          fetch(`${baseUrl}/functions/v1/save-public-form`, {
            method: "POST",
            keepalive: true,
            headers: { apikey, "Content-Type": "application/json" },
            body: JSON.stringify({
              apprenantId,
              typeDocument: TYPE_DOCUMENT,
              titre: TITRE,
              donnees: snapshot,
            }),
          });
        }
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
      localStorage.setItem = origSetItem;
      localStorage.removeItem = origRemoveItem;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(intervalId);
    };
  }, [apprenantId, isLoaded]);

  return { isLoaded };
}
