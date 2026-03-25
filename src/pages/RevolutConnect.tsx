import { useState } from "react";
import { Loader2, Link as LinkIcon, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RevolutConnect() {
  const [loading, setLoading] = useState(false);

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
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connecter Revolut
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
