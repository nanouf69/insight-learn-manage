import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "exchanging" | "success" | "error">("loading");
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

    if (!exchangeAttempted.current) {
      exchangeAttempted.current = true;
      exchangeToken(authCode);
    }
  }, [searchParams]);

  const exchangeToken = async (code: string) => {
    setStatus("exchanging");
    try {
      // Call edge function directly via fetch — no session needed
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/revolut-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || data?.details?.error_description || `Erreur ${response.status}`);
      }

      setStatus("success");
      toast.success("Connexion Revolut réussie ! Token enregistré.");

      setTimeout(() => {
        navigate("/revolut-connect");
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
                Connexion Revolut réussie ✅
              </h1>
              <p className="text-muted-foreground">
                Le token a été enregistré. Redirection…
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
