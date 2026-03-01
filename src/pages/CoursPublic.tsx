import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Target, RotateCcw, ChevronRight, KeyRound, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
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
    <div className={embedded ? "" : "min-h-screen bg-slate-50"}>
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
            <p className="text-sm text-slate-600">
              Nous avons remarqué qu'il n'y a plus eu d'activité depuis <strong>2 heures</strong> sur la plateforme.
            </p>
            <p className="text-sm text-slate-600">
              N'oubliez pas de continuer vos révisions pour bien préparer votre examen ! 💪
            </p>
            <Button className="w-full" onClick={() => setShowInactivityModal(false)}>
              Je suis là, je continue !
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top navbar */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            {(["accueil", "examens", "notes"] as const).map((tab) => (
              <span
                key={tab}
                className={`text-sm cursor-pointer transition-colors ${activeTab === tab ? "font-bold text-white border-b-2 border-white pb-0.5" : "hover:text-primary text-slate-400"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "accueil" ? "Accueil" : tab === "examens" ? "Examens" : "Notes"}
              </span>
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{formation.label}</h1>
          <p className="text-slate-500 text-lg">{studentName}</p>
        </div>

        {/* Notes tab */}
        {activeTab === "notes" && apprenant?.id && (
          <NotesView apprenantId={apprenant.id} studentName={studentName} />
        )}

        {/* Examens tab placeholder */}
        {activeTab === "examens" && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-slate-500">Section Examens — à venir</p>
          </div>
        )}

        {/* Accueil tab */}
        {activeTab === "accueil" && (
          <>
            {/* Dashboard cards */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Bienvenue sur votre tableau de bord</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-xl p-6 flex flex-col items-center justify-center">
                  <h3 className="font-bold text-slate-700 mb-2">Progression générale</h3>
                  <span className="text-4xl font-bold text-slate-900">{globalProgress}%</span>
                  <Progress value={globalProgress} className="mt-3 w-3/4 h-2" />
                </div>
                <div className="border rounded-xl p-6">
                  <h3 className="font-bold text-slate-700 mb-3 text-center">À revoir</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {lowModules.map((mod) => (
                      <div key={mod.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{mod.nom}</span>
                          <span className="text-xs font-semibold text-red-500">0%</span>
                        </div>
                        <Button variant="secondary" size="sm" className="text-xs" onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}>
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Refaire
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-4 mb-6">
              <p className="text-sm text-slate-700">
                <Target className="w-4 h-4 inline mr-1 text-primary" />
                Continue comme ça ! Pense à réviser les modules où ta progression est inférieure à 50%.
              </p>
            </div>

            {/* Modules table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="col-span-2">Nom</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-1 text-center">Taux de réussite</div>
                <div className="col-span-2 text-center">Progression</div>
                <div className="col-span-1 text-center">Statut</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
              {modules.map((mod) => (
                <div key={mod.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors items-center">
                  <div className="md:col-span-2 font-semibold text-slate-800 text-sm">{mod.nom}</div>
                  <div className="md:col-span-4 text-sm text-slate-500 line-clamp-2">{mod.description}</div>
                  <div className="md:col-span-1 text-center"><span className="text-sm text-slate-600">0%</span></div>
                  <div className="md:col-span-2 text-center"><span className="text-sm text-slate-600">0%</span></div>
                  <div className="md:col-span-1 text-center"><span className="text-sm font-semibold text-emerald-500">Actif</span></div>
                  <div className="md:col-span-2 text-center">
                    <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white text-xs" onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}>
                      Consulter <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between md:hidden text-xs text-slate-400 pt-1">
                    <span>Réussite: 0% · Progression: 0%</span>
                    <span className="text-emerald-500 font-semibold">Actif</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoursPublic;
