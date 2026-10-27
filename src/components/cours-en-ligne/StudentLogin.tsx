import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, LogIn, Loader2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentLoginProps {
  onLogin: () => void;
}

// Saisie gardée en mémoire (jamais stockée) : un mauvais mot de passe ou un
// réaffichage de la page ne vide pas les champs.
const saisieMemoire = { email: "", password: "" };

const StudentLogin = ({ onLogin }: StudentLoginProps) => {
  const [email, setEmailState] = useState(saisieMemoire.email);
  const [password, setPasswordState] = useState(saisieMemoire.password);
  const setEmail = (v: string) => { saisieMemoire.email = v; setEmailState(v); };
  const setPassword = (v: string) => { saisieMemoire.password = v; setPasswordState(v); };
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "change-password" | "forgot-password">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect",
          variant: "destructive",
        });
        return;
      }

      saisieMemoire.password = "";
      onLogin();
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Modification du mot de passe : jamais de demande de l'ancien. Un lien
  // sécurisé est envoyé par email ; l'élève choisit son nouveau mot de passe
  // via ce lien (écran /reset-password).
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "📧 Email envoyé",
        description: "Cliquez sur le lien reçu pour choisir votre nouveau mot de passe",
      });
      setMode("login");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "📧 Email envoyé",
        description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
      });
      setMode("login");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot-password") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez votre email, vous recevrez un lien pour réinitialiser votre mot de passe
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder="votre@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Envoyer le lien
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "change-password") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Modifier le mot de passe</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez votre email : vous recevrez un lien pour choisir votre nouveau mot de passe. L'ancien mot de passe n'est jamais demandé.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cp-email">Email</Label>
                <Input id="cp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Envoyer le lien
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la connexion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Espace Apprenant</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez-vous pour accéder à vos cours
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Se connecter
            </Button>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                className="w-full text-sm text-primary hover:underline transition-colors font-medium"
                onClick={() => setMode("forgot-password")}
              >
                Mot de passe oublié ?
              </button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMode("change-password")}
              >
                Modifier mon mot de passe
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
