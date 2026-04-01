import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DevisPublic() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [devis, setDevis] = useState<any>(null);
  const [apprenant, setApprenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Lien invalide — aucun token trouvé.");
      setLoading(false);
      return;
    }
    loadDevis();
  }, [token]);

  const loadDevis = async () => {
    const { data, error: err } = await supabase
      .from("devis_envois")
      .select("*, apprenants(nom, prenom, email, formation_choisie)")
      .eq("token", token!)
      .single();

    if (err || !data) {
      setError("Ce lien de devis est invalide ou a expiré.");
      setLoading(false);
      return;
    }

    setDevis(data);
    setApprenant((data as any).apprenants);
    if (data.devis_signe_url) setUploaded(true);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("token", token!);
      formData.append("file", file);

      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${baseUrl}/functions/v1/upload-devis-signe`, {
        method: "POST",
        headers: { apikey: apiKey },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur");

      setUploaded(true);
      toast.success("Devis signé envoyé avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contactez-nous : contact@ftransport.fr — 04.28.29.60.91
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full shadow-lg">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">Votre Devis — FTRANSPORT</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Centre de formation VTC & TAXI — 86 Route de Genas, 69003 Lyon
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <p><strong>Nom :</strong> {apprenant?.prenom} {apprenant?.nom}</p>
            <p><strong>Formation :</strong> {devis.formation || devis.modele}</p>
            <p><strong>Montant :</strong> {devis.montant}</p>
          </div>

          {/* Step 1: Download */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
              Téléchargez votre devis
            </h3>
            <p className="text-sm text-muted-foreground">
              Téléchargez le document, complétez les informations manquantes, signez-le.
            </p>
            <Button asChild className="w-full">
              <a href={devis.fichier_url} download>
                <Download className="h-4 w-4 mr-2" />
                Télécharger le devis
              </a>
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
              Renvoyez le devis signé
            </h3>
            <p className="text-sm text-muted-foreground">
              Scannez ou photographiez le devis signé, puis envoyez-le ci-dessous.
            </p>

            {uploaded ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-800">Devis signé reçu !</p>
                <p className="text-sm text-green-600 mt-1">
                  Merci, nous avons bien reçu votre devis signé.
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="devis-file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 h-20"
                  onClick={() => document.getElementById("devis-file")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Cliquez pour envoyer le devis signé</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Formats acceptés : PDF, JPG, PNG — Max 10 Mo
                </p>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            📧 contact@ftransport.fr — 📞 04.28.29.60.91
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
