import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Target, RotateCcw, ChevronRight, KeyRound, Loader2, AlertTriangle, BookOpen, GraduationCap, TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import ExamensBlancsPage from "@/components/cours-en-ligne/ExamensBlancsPage";
import NotesView from "@/components/cours-en-ligne/NotesView";
import StudentLogin from "@/components/cours-en-ligne/StudentLogin";
import { FORMATIONS, MODULES_DATA, type FormationId } from "@/components/cours-en-ligne/formations-data";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { safeDateParse } from "@/lib/safeDateParse";
import { useConnexionTracking } from "@/hooks/useConnexionTracking";
import { useInactivityAlert } from "@/hooks/useInactivityAlert";

// Map type_apprenant from CRM to formation IDs
const TYPE_TO_FORMATION: Record<string, FormationId> = {
  "VTC": "vtc",
  "TAXI": "taxi",
  "TA": "taxi-pour-vtc",
  "VA": "vtc-pour-taxi",
  "VTC-E": "vtc-elearning",
  "TAXI-E": "taxi-elearning",
  "TA-E": "taxi-pour-vtc-elearning",
  "VTC-S": "vtc-cours-du-soir",
};

// Module IDs that should open ExamensBlancsPage (bilans)
const BILAN_MODULE_IDS: Record<number, string> = {
  5: "bilan-vtc",
  11: "bilan-taxi",
};

interface ApprenantInfo {
  id?: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
  modules_autorises: number[] | null;
}

interface CoursPublicProps {
  embedded?: boolean;
  apprenantOverride?: ApprenantInfo | null;
}

const ChangePasswordDialog = () => {
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Mot de passe modifié avec succès !");
        setOpen(false);
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } catch {
      toast.error("Erreur lors du changement de mot de passe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="text-xs">
          <KeyRound className="w-3.5 h-3.5 mr-1" />
          Changer le mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer votre mot de passe</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Nouveau mot de passe</label>
            <Input type="password" placeholder="Minimum 6 caractères" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Confirmer le mot de passe</label>
            <Input type="password" placeholder="Retapez le mot de passe" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleChange} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CoursPublic = ({ embedded, apprenantOverride }: CoursPublicProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!embedded);
  const [apprenantLoading, setApprenantLoading] = useState(false);
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [selectedModule, setSelectedModule] = useState<{ id: number; nom: string } | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<FormationId | null>(null);
  const [activeTab, setActiveTab] = useState<"accueil" | "examens" | "notes">("accueil");

  // Tracking connexion élève (only for real student sessions, not admin preview)
  const { trackModuleActivity } = useConnexionTracking({
    apprenantId: !embedded && apprenant?.id ? apprenant.id : null,
    userId: user?.id || null,
    enabled: !embedded && !!user && !!apprenant?.id,
  });

  // Inactivity alert after 2h
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const handleInactive = useCallback(() => {
    setShowInactivityModal(true);
  }, []);
  useInactivityAlert({
    enabled: !embedded && !!user && !!apprenant?.id,
    onInactive: handleInactive,
  });

  useEffect(() => {
    if (embedded) return; // skip auth in admin preview

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [embedded]);

  // Fetch apprenant info when user is logged in
  useEffect(() => {
    if (!user || embedded) return;

    setApprenantLoading(true);
    const fetchApprenant = async () => {
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (data) {
        setApprenant(data as any);
        const formationId = TYPE_TO_FORMATION[data.type_apprenant || ""] || (data.formation_choisie as FormationId) || null;
        setSelectedFormation(formationId);
      } else {
        // User has no apprenant record — sign them out so they see the login
        await supabase.auth.signOut();
        setUser(null);
      }
      setApprenantLoading(false);
    };
    fetchApprenant();
  }, [user, embedded]);

  // Use apprenantOverride when provided (admin preview of specific student)
  useEffect(() => {
    if (!apprenantOverride) return;
    setApprenant(apprenantOverride);
    const formationId = TYPE_TO_FORMATION[apprenantOverride.type_apprenant || ""] || (apprenantOverride.formation_choisie as FormationId) || null;
    setSelectedFormation(formationId);
  }, [apprenantOverride]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setApprenant(null);
    setSelectedFormation(null);
  };

  // Loading state
  if (loading || apprenantLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Auth required (unless embedded in admin)
  if (!embedded && !user) {
    return <StudentLogin onLogin={() => {}} />;
  }

  // Check course access dates
  if (!embedded && user && apprenant) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const debut = apprenant.date_debut_cours_en_ligne ? safeDateParse(apprenant.date_debut_cours_en_ligne) : null;
    const fin = apprenant.date_fin_cours_en_ligne ? safeDateParse(apprenant.date_fin_cours_en_ligne) : null;

    if (!debut || !fin || now < debut || now > fin) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès non disponible</h1>
            <p className="text-slate-500 mb-4">
              {!debut || !fin
                ? "Votre accès aux cours en ligne n'a pas encore été configuré. Contactez votre centre de formation."
                : now < debut
                  ? `Votre accès sera disponible à partir du ${debut.toLocaleDateString('fr-FR')}.`
                  : `Votre accès a expiré le ${fin.toLocaleDateString('fr-FR')}. Contactez votre centre de formation.`
              }
            </p>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Déconnexion
            </Button>
          </div>
        </div>
      );
    }
  }

  // Module detail view
  if (selectedModule) {
    const bilanId = BILAN_MODULE_IDS[selectedModule.id];
    if (bilanId) {
      // Bilan modules open ExamensBlancsPage directly
      return (
        <div className="min-h-screen bg-background p-4">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedModule(null)}>
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Retour
          </Button>
          <ExamensBlancsPage
            defaultBilanId={bilanId}
            apprenantId={apprenant?.id || null}
            userId={user?.id || null}
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <ModuleDetailView
          module={selectedModule}
          onBack={() => setSelectedModule(null)}
          studentOnly
        />
      </div>
    );
  }

  // If embedded (admin preview) and no formation selected, show formation picker
  // If student has no formation mapped, also show picker
  if (!selectedFormation) {
    return (
      <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 flex items-center justify-center p-4"}>
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              {embedded ? "Aperçu apprenant" : `Bienvenue ${apprenant?.prenom || ""}`}
            </h1>
            <p className="text-slate-500">Sélectionnez une formation pour voir les cours</p>
          </div>
          <div className="grid gap-3">
            {FORMATIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormation(f.id)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <h2 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">
                    {f.label}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {MODULES_DATA.filter((m) => m.formations.includes(f.id)).length} modules
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  const formation = FORMATIONS.find((f) => f.id === selectedFormation)!;
  const allModules = MODULES_DATA.filter((m) => m.formations.includes(selectedFormation));
  // Filter by authorized modules if set (admin-side), otherwise show all
  const authorizedIds = apprenant?.modules_autorises;
  const modules = !embedded && authorizedIds && authorizedIds.length > 0
    ? allModules.filter((m) => authorizedIds.includes(m.id))
    : allModules;
  const globalProgress = 7;
  const lowModules = modules.filter((_, i) => i === 0 || i === 2).slice(0, 3);
  const studentName = apprenant ? `${apprenant.prenom} ${apprenant.nom}` : "Apprenant";

  return (
    <div className={embedded ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"}>
      {/* Inactivity modal */}
      <Dialog open={showInactivityModal} onOpenChange={setShowInactivityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Êtes-vous encore là ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Nous avons remarqué qu'il n'y a plus eu d'activité depuis <strong>2 heures</strong> sur la plateforme.
            </p>
            <p className="text-sm text-muted-foreground">
              N'oubliez pas de continuer vos révisions pour bien préparer votre examen ! 💪
            </p>
            <Button className="w-full" onClick={() => setShowInactivityModal(false)}>
              Je suis là, je continue !
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top navbar */}
      <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            {(["accueil", "examens", "notes"] as const).map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm rounded-lg transition-all ${activeTab === tab ? "font-bold text-white bg-white/15 shadow-inner" : "hover:bg-white/10 text-slate-400 hover:text-white"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "accueil" ? "🏠 Accueil" : tab === "examens" ? "📝 Examens" : "📊 Notes"}
              </button>
            ))}
          </div>
          {!embedded && (
            <div className="flex items-center gap-2">
              <ChangePasswordDialog />
              <Button variant="destructive" size="sm" className="text-xs" onClick={handleLogout}>
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Déconnexion
              </Button>
            </div>
          )}
          {embedded && (
            <Button variant="secondary" size="sm" className="text-xs" onClick={() => setSelectedFormation(null)}>
              Changer de formation
            </Button>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notes tab */}
        {activeTab === "notes" && apprenant?.id && (
          <NotesView apprenantId={apprenant.id} studentName={studentName} />
        )}

        {/* Examens tab placeholder */}
        {activeTab === "examens" && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Section Examens — à venir</p>
          </Card>
        )}

        {/* Accueil tab */}
        {activeTab === "accueil" && (
          <>
            {/* Hero welcome section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-8 mb-8 text-white shadow-xl">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">
                      <Sparkles className="w-4 h-4 inline mr-1" />
                      {formation.label}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      Bonjour, {apprenant?.prenom || "Apprenant"} 👋
                    </h1>
                    <p className="text-blue-200/80 text-base">
                      Continue tes efforts, chaque module te rapproche de la réussite !
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                    <div className="text-center">
                      <p className="text-4xl font-black">{globalProgress}%</p>
                      <p className="text-xs text-blue-200 mt-0.5">Progression</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6 max-w-xl">
                  <div className="flex justify-between text-xs text-blue-200 mb-1.5">
                    <span>{modules.length} modules</span>
                    <span>{globalProgress}% complété</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700 ease-out"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: BookOpen, label: "Modules", value: modules.length.toString(), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { icon: GraduationCap, label: "Complétés", value: "0", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { icon: TrendingUp, label: "Progression", value: `${globalProgress}%`, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
                { icon: Clock, label: "À revoir", value: lowModules.length.toString(), color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
              ].map((stat) => (
                <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Modules à revoir */}
            {lowModules.length > 0 && (
              <Card className="border-0 shadow-sm mb-8 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 px-6 py-3 border-b">
                  <h3 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Modules à réviser en priorité
                  </h3>
                </div>
                <CardContent className="p-4 space-y-2">
                  {lowModules.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-sm">
                          {mod.id}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{mod.nom}</p>
                          <p className="text-xs text-muted-foreground">Progression : 0%</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                        onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Réviser
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Modules list as cards */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Tous les modules
              </h2>
              <div className="grid gap-3">
                {modules.map((mod, idx) => (
                  <Card
                    key={mod.id}
                    className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
                    onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 p-5">
                        {/* Module number badge */}
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                          <span className="text-lg font-bold text-primary">{idx + 1}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {mod.nom}
                            </h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                              Actif
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                          
                          {/* Mini progress bar */}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden max-w-[200px]">
                              <div className="h-full rounded-full bg-primary/40 transition-all" style={{ width: "0%" }} />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">0%</span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="shrink-0">
                          <div className="w-9 h-9 rounded-full bg-primary/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                            <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoursPublic;
