import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, LogIn, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentLoginProps {
  onLogin: () => void;
}

const StudentLogin = ({ onLogin }: StudentLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "change-password">("login");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sécurité: purge toute session locale existante avant une nouvelle connexion élève
      await supabase.auth.signOut({ scope: "local" });

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        await supabase.auth.signOut({ scope: "local" });
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect",
          variant: "destructive",
        });
      } else {
        onLogin();
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le nouveau mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Sécurité: purge session locale avant de vérifier les identifiants
      await supabase.auth.signOut({ scope: "local" });

      // First sign in with current credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        await supabase.auth.signOut({ scope: "local" });
        toast({ title: "Erreur", description: "Email ou mot de passe actuel incorrect", variant: "destructive" });
        setLoading(false);
        return;
      }
      // Then update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast({ title: "Erreur", description: "Impossible de modifier le mot de passe", variant: "destructive" });
      } else {
        toast({ title: "✅ Mot de passe modifié", description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe" });
        setMode("login");
        setPassword(newPassword);
        setNewPassword("");
        setConfirmPassword("");
        // Sign out so user logs in fresh
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
              Entrez vos identifiants actuels puis choisissez un nouveau mot de passe
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cp-email">Email</Label>
                <Input id="cp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-current">Mot de passe actuel</Label>
                <Input id="cp-current" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-new">Nouveau mot de passe</Label>
                <Input id="cp-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min. 6 caractères" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-confirm">Confirmer le nouveau mot de passe</Label>
                <Input id="cp-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Modifier le mot de passe
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Se connecter
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode("change-password")}
            >
              Modifier mon mot de passe
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
