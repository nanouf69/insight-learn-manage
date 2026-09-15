import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, AlertTriangle, Phone } from "lucide-react";
import logoFtransport from "@/assets/logo-ftransport.png";
import { Button } from "@/components/ui/button";
import { callOnboardingInvitation } from "@/lib/onboardingInvitation";

export default function OnboardingInvitation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setError("Lien incomplet. Utilisez le lien reçu par e-mail.");
        return;
      }
      // Le jeton est retiré de l'adresse affichée : il ne reste ni dans l'historique du
      // navigateur, ni dans les journaux techniques, ni dans les référents envoyés.
      try {
        window.history.replaceState({}, "", "/bienvenue/invitation");
      } catch {
        /* ignore */
      }
      try {
        const { dossier, is_fc, session_token } = await callOnboardingInvitation({
          action: "verify",
          token,
        });
        if (cancelled) return;

        localStorage.setItem("onboarding_apprenant_id", dossier.id);
        localStorage.setItem("onboarding_session_token", session_token);
        localStorage.setItem("onboarding_email", dossier.email || "");
        localStorage.setItem("onboarding_telephone", dossier.telephone || "");
        localStorage.setItem("onboarding_adresse", dossier.adresse || "");
        localStorage.setItem("onboarding_code_postal", dossier.code_postal || "");
        localStorage.setItem("onboarding_ville", dossier.ville || "");
        localStorage.setItem("onboarding_found", "true");
        localStorage.setItem("onboarding_nom", dossier.nom || "");
        localStorage.setItem("onboarding_prenom", dossier.prenom || "");
        localStorage.setItem("onboarding_is_fc", is_fc ? "true" : "false");

        navigate("/bienvenue/etape-1", { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ce lien n'est plus valide.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white/5 border border-white/10 rounded-2xl p-8">
        <img src={logoFtransport} alt="FTRANSPORT" className="h-12 mx-auto mb-6" />
        {!error ? (
          <>
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-400" />
            <h1 className="text-xl font-semibold mb-2">Vérification de votre lien personnel…</h1>
            <p className="text-white/60 text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Accès sécurisé à votre dossier
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-amber-400" />
            <h1 className="text-xl font-semibold mb-2">Lien non valide</h1>
            <p className="text-white/70 text-sm mb-6">{error}</p>
            <Button className="w-full" onClick={() => navigate("/bienvenue")}>
              Demander un nouveau lien
            </Button>
            <p className="text-white/40 text-xs mt-6 flex items-center justify-center gap-2">
              <Phone className="w-3 h-3" /> 04 28 29 60 91
            </p>
          </>
        )}
      </div>
    </div>
  );
}
