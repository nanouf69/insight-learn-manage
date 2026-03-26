import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "waiting_session" | "exchanging" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    const authCode = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(searchParams.get("error_description") || errorParam);
      setStatus("error");
      return;
    }

    if (!authCode) {
      setError("Aucun code d'autorisation reçu.");
      setStatus("error");
      return;
    }

    // Wait for Supabase session to be restored, then exchange
    setStatus("waiting_session");
    waitForSessionAndExchange(authCode);
  }, [searchParams]);

  const waitForSessionAndExchange = async (code: string) => {
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    // Try to get session immediately
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      await exchangeToken(code);
      return;
    }

    // Wait for auth state change (session restoration after redirect)
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setError("Session expirée. Veuillez vous reconnecter puis réessayer la connexion Revolut.");
        setStatus("error");
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (resolved) return;
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        resolved = true;
        clearTimeout(timeout);
        subscription.unsubscribe();
        await exchangeToken(code);
      }
    });
  };

  const exchangeToken = async (code: string) => {
    setStatus("exchanging");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("revolut-auth", {
        body: { code },
      });

      if (fnError) {
        throw new Error(fnError.message || "Erreur lors de l'échange du token");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setStatus("success");
      toast.success("Connexion Revolut réussie ! Token enregistré.");

      // Redirect to transactions page after 2s
      setTimeout(() => {
        navigate("/revolut/transactions");
      }, 2000);
    } catch (err) {
      console.error("[AuthCallback] Token exchange failed:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-16 w-16 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Traitement en cours…</p>
            </>
          )}
          {status === "waiting_session" && (
            <>
              <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin" />
              <h1 className="text-2xl font-bold text-foreground">
                Restauration de la session…
              </h1>
              <p className="text-muted-foreground">
                Veuillez patienter pendant la restauration de votre session.
              </p>
            </>
          )}
          {status === "exchanging" && (
            <>
              <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin" />
              <h1 className="text-2xl font-bold text-foreground">
                Connexion à Revolut…
              </h1>
              <p className="text-muted-foreground">
                Échange du code d'autorisation en cours.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h1 className="text-2xl font-bold text-foreground">
                Connexion Revolut réussie ✅
              </h1>
              <p className="text-muted-foreground">
                Le token a été enregistré. Redirection vers les transactions…
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">
                Erreur de connexion
              </h1>
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate("/revolut-connect")}>
                  Réessayer
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Retour
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
