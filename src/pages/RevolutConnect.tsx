import { useState, useEffect } from "react";
import { Loader2, Link as LinkIcon, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RevolutConnect() {
  const [loading, setLoading] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "expired" | "none">("checking");
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    checkTokenStatus();
  }, []);

  const checkTokenStatus = async () => {
    setTokenStatus("checking");
    try {
      const { data, error } = await supabase
        .from("revolut_tokens")
        .select("expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setTokenStatus("none");
        return;
      }

      setTokenExpiresAt(data.expires_at);

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setTokenStatus("expired");
      } else {
        setTokenStatus("valid");
      }
    } catch {
      setTokenStatus("none");
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.functions.invoke("revolut-connect", {
        body: { redirect_uri: redirectUri },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.auth_url) throw new Error("URL d'autorisation non reçue");

      // Redirect to Revolut consent page
      window.location.href = data.auth_url;
    } catch (err) {
      console.error("Revolut connect error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connexion Revolut Business</CardTitle>
          <CardDescription>
            Connectez votre compte Revolut Business pour synchroniser vos transactions automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token status */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Statut de la connexion</span>
              {tokenStatus === "checking" && <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Vérification…</Badge>}
              {tokenStatus === "valid" && <Badge className="bg-green-600 hover:bg-green-700 text-white">✅ Actif</Badge>}
              {tokenStatus === "expired" && <Badge variant="destructive">⚠️ Expiré</Badge>}
              {tokenStatus === "none" && <Badge variant="secondary">❌ Non connecté</Badge>}
            </div>
            {tokenStatus === "valid" && tokenExpiresAt && (
              <p className="text-xs text-muted-foreground">
                Expire le {new Date(tokenExpiresAt).toLocaleDateString("fr-FR")} à {new Date(tokenExpiresAt).toLocaleTimeString("fr-FR")}
              </p>
            )}
            {tokenStatus === "expired" && (
              <p className="text-xs text-destructive">
                Le token a expiré. Veuillez reconnecter votre compte.
              </p>
            )}
            {tokenStatus === "none" && (
              <p className="text-xs text-muted-foreground">
                Aucun token trouvé. Cliquez ci-dessous pour connecter votre compte Revolut.
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Authentification sécurisée par certificat X509</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Synchronisation automatique des transactions</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Aucune donnée bancaire stockée localement</span>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirection en cours…
              </>
            ) : tokenStatus === "valid" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reconnecter Revolut
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connecter Revolut
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={checkTokenStatus}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Vérifier le statut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
