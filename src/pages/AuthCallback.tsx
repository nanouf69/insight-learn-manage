import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "exchanging" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

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

    // Store code temporarily
    try {
      sessionStorage.setItem("revolut_auth_code", authCode);
      sessionStorage.setItem("revolut_auth_timestamp", Date.now().toString());
    } catch (e) {
      console.error("[AuthCallback] sessionStorage write failed", e);
    }

    // Auto-exchange code for token
    exchangeToken(authCode);
  }, [searchParams]);

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

      // Clean up sessionStorage
      try {
        sessionStorage.removeItem("revolut_auth_code");
        sessionStorage.removeItem("revolut_auth_timestamp");
      } catch {}

      setStatus("success");

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
                Connexion Revolut réussie
              </h1>
              <p className="text-muted-foreground">
                Redirection vers les transactions…
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
