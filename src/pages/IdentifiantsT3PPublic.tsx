import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, KeyRound, AlertCircle } from "lucide-react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/identifiants-t3p-public`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const call = async (body: Record<string, unknown>) => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Une erreur est survenue");
  return data;
};

export default function IdentifiantsT3PPublic() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [prenom, setPrenom] = useState<string | null>(null);
  const [dejaRecu, setDejaRecu] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Transmettre mes identifiants Examen T3P | FTRANSPORT";
    if (!token) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    call({ action: "get", token })
      .then((d) => {
        setPrenom(d.prenom ?? null);
        setDejaRecu(!!d.deja_recu);
        if (d.nouvel_email) setEmail(d.nouvel_email);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await call({ action: "submit", token, email: email.trim(), motDePasse });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Mes identifiants Examen T3P</CardTitle>
          <p className="text-sm text-muted-foreground">
            Transmettez à FTRANSPORT l'adresse e-mail et le mot de passe que vous utilisez sur
            examenT3P.fr
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invalid ? (
            <div className="text-center space-y-2 py-4">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">
                Ce lien n'est pas valide. Merci de contacter FTRANSPORT au 04 28 29 60 91.
              </p>
            </div>
          ) : sent ? (
            <div className="text-center space-y-2 py-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
              <p className="font-medium">Merci{prenom ? ` ${prenom}` : ""} !</p>
              <p className="text-sm text-muted-foreground">
                Vos nouveaux identifiants ont bien été transmis à notre équipe.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {prenom && (
                <p className="text-sm">
                  Bonjour <strong>{prenom}</strong>, merci de compléter les deux champs ci-dessous.
                </p>
              )}
              {dejaRecu && (
                <p className="text-xs text-muted-foreground">
                  Des identifiants ont déjà été transmis. Vous pouvez les corriger ci-dessous.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="t3p-email">📧 Nouvelle adresse e-mail Examen T3P</Label>
                <Input
                  id="t3p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t3p-password">🔑 Nouveau mot de passe Examen T3P</Label>
                <Input
                  id="t3p-password"
                  type="text"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Transmettre mes identifiants
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
