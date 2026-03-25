import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authCode = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(searchParams.get("error_description") || errorParam);
      return;
    }

    if (authCode) {
      setCode(authCode);
      // Stockage temporaire du code pour l'échange token côté serveur
      try {
        sessionStorage.setItem("revolut_auth_code", authCode);
        sessionStorage.setItem("revolut_auth_timestamp", Date.now().toString());
      } catch (e) {
        console.error("[AuthCallback] sessionStorage write failed", e);
      }
    } else {
      setError("Aucun code d'autorisation reçu.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {code && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h1 className="text-2xl font-bold text-foreground">
                Connexion Revolut réussie
              </h1>
              <p className="text-muted-foreground">
                L'autorisation a été accordée. Vous pouvez fermer cette fenêtre.
              </p>
            </>
          )}
          {error && (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">
                Erreur de connexion
              </h1>
              <p className="text-muted-foreground">{error}</p>
            </>
          )}
          {!code && !error && (
            <p className="text-muted-foreground">Traitement en cours…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
