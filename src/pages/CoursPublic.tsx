import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Target, RotateCcw, ChevronRight, KeyRound, Loader2, AlertTriangle, BookOpen, GraduationCap, TrendingUp, Clock, ArrowRight, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { WelcomeBanner } from "@/components/cours-en-ligne/motivation/WelcomeBanner";
import { XPBar } from "@/components/cours-en-ligne/motivation/XPBar";
import { BadgeGrid } from "@/components/cours-en-ligne/motivation/BadgeGrid";
import { buildBadges, calculateXP } from "@/components/cours-en-ligne/motivation/badges-data";
import { QuizBlock } from "@/components/cours-en-ligne/motivation/QuizBlock";
import { toast } from "sonner";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import ExamensBlancsPage from "@/components/cours-en-ligne/ExamensBlancsPage";
import NotesView from "@/components/cours-en-ligne/NotesView";
import StudentLogin from "@/components/cours-en-ligne/StudentLogin";
import { FORMATIONS, MODULES_DATA, expandModulesAutorises, type FormationId } from "@/components/cours-en-ligne/formations-data";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { safeDateParse } from "@/lib/safeDateParse";
import { useConnexionTracking } from "@/hooks/useConnexionTracking";
import { useInactivityAlert } from "@/hooks/useInactivityAlert";

// Map CRM values to formation IDs (supports lowercase, aliases and multi-selection values like "x + y")
const FORMATION_ALIASES: Record<string, FormationId> = {
  "vtc": "vtc",
  "vtc-exam": "vtc",
  "vtc-e-presentiel": "vtc",
  "vtc-e": "vtc-elearning",
  "vtc-elearning": "vtc-elearning",
  "vtc-elearning-1099": "vtc-elearning",
  "taxi": "taxi",
  "taxi-exam": "taxi",
  "taxi-e-presentiel": "taxi",
  "taxi-e": "taxi-elearning",
  "taxi-elearning": "taxi-elearning",
  "ta": "taxi-pour-vtc",
  "ta-e-presentiel": "taxi-pour-vtc",
  "ta-e": "taxi-pour-vtc-elearning",
  "passerelle-taxi": "taxi-pour-vtc",
  "passerelle-taxi-elearning": "taxi-pour-vtc-elearning",
  "va": "vtc-pour-taxi",
  "va-e-presentiel": "vtc-pour-taxi",
  "va-e": "vtc-pour-taxi",
  "passerelle-vtc": "vtc-pour-taxi",
  "passerelle-vtc-elearning": "vtc-pour-taxi",
  "vtc-s": "vtc-cours-du-soir",
  "vtc-cours-du-soir": "vtc-cours-du-soir",
};

const normalizeFormationKey = (value: string | null | undefined): string =>
  (value || "").split(" + ")[0].trim().toLowerCase().replace(/\s+/g, "-");

const inferFormationFromModules = (modulesAutorises: number[] | null | undefined): FormationId | null => {
  if (!modulesAutorises || modulesAutorises.length === 0) return null;

  const expanded = new Set(expandModulesAutorises(modulesAutorises) || modulesAutorises);
  let best: { id: FormationId; score: number } | null = null;

  for (const formation of FORMATIONS) {
    const formationModuleIds = MODULES_DATA
      .filter((module) => module.formations.includes(formation.id))
      .map((module) => module.id);

    const score = formationModuleIds.reduce((acc, moduleId) => acc + (expanded.has(moduleId) ? 1 : 0), 0);

    if (!best || score > best.score) {
      best = { id: formation.id, score };
    }
  }

  return best && best.score > 0 ? best.id : null;
};

const resolveFormationId = (
  typeApprenant: string | null | undefined,
  formationChoisie: string | null | undefined,
  modulesAutorises: number[] | null | undefined,
): FormationId | null => {
  // Priority: explicit assigned modules (source of truth for learner access)
  const byModules = inferFormationFromModules(modulesAutorises);
  if (byModules) return byModules;

  const byFormation = FORMATION_ALIASES[normalizeFormationKey(formationChoisie)];
  if (byFormation) return byFormation;

  const byType = FORMATION_ALIASES[normalizeFormationKey(typeApprenant)];
  if (byType) return byType;

  return null;
};

const FORMATION_DISPLAY_LABELS: Partial<Record<FormationId, Record<number, string>>> = {
  "vtc": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "vtc-cours-du-soir": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "vtc-elearning": {
    26: "1.INTRODUCTION E-LEARNING",
    2: "2.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "taxi": {
    1: "1.INTRODUCTION PRÉSENTIEL",
    10: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
  },
  "taxi-elearning": {
    26: "1.INTRODUCTION E-LEARNING",
    10: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
  },
  "taxi-pour-vtc": {
    31: "1.INTRODUCTION TA",
    40: "2.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    28: "6.BILAN EXAMEN TA",
    37: "7.EXAMENS BLANCS TA",
    6: "8.PRATIQUE TAXI",
  },
  "taxi-pour-vtc-elearning": {
    32: "1.INTRODUCTION TA E-LEARNING",
    40: "2.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    28: "7.BILAN EXAMEN TA",
    37: "8.EXAMENS BLANCS TA",
    6: "9.PRATIQUE TAXI",
  },
  "vtc-pour-taxi": {
    33: "1.INTRODUCTION VA",
    34: "1.INTRODUCTION VA",
    41: "2.COURS ET EXERCICES VA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    29: "5.BILAN EXERCICES VA",
    30: "6.BILAN EXAMEN VA",
    38: "7.EXAMENS BLANCS VA",
    8: "8.PRATIQUE VTC",
  },
};

const FORMATION_DEFAULT_MODULES: Record<FormationId, number[]> = {
  "vtc": [1, 2, 3, 4, 35, 5, 8],
  "vtc-cours-du-soir": [1, 2, 3, 4, 35, 5, 8],
  "vtc-elearning": [26, 2, 3, 4, 35, 5, 8],
  "taxi": [1, 10, 7, 3, 9, 13, 11, 36, 6],
  "taxi-elearning": [26, 10, 7, 3, 9, 13, 11, 36, 6],
  "taxi-pour-vtc": [31, 40, 7, 3, 27, 28, 37, 6],
  "taxi-pour-vtc-elearning": [32, 40, 7, 3, 27, 13, 28, 37, 6],
  "vtc-pour-taxi": [34, 41, 7, 3, 29, 30, 38, 8],
};

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41]);
const GROUPED_PARENT_MODULES: Partial<Record<number, number[]>> = {
  2: [25, 14, 15, 16, 17, 18, 19],
  10: [20, 21, 22, 23, 24],
  40: [24],
  41: [18, 19],
};

const getModuleDisplayName = (formationId: FormationId, moduleId: number, fallback: string) =>
  FORMATION_DISPLAY_LABELS[formationId]?.[moduleId] || fallback;

// Module IDs that should open ExamensBlancsPage (bilans)
const BILAN_MODULE_IDS: Record<number, string> = {
  28: "bilan-ta",
  30: "bilan-va",
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
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<number>>(new Set());
  const [moduleScores, setModuleScores] = useState<Record<number, { score_obtenu: number | null; score_max: number | null }>>({});
  const [moduleCompletionsForNotes, setModuleCompletionsForNotes] = useState<Array<{ id: string; module_id: number; score_obtenu: number | null; score_max: number | null; completed_at: string; details: any }>>([]);

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
        const formationId = resolveFormationId(data.type_apprenant, data.formation_choisie, data.modules_autorises);
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

    const applyApprenant = (value: ApprenantInfo) => {
      setApprenant(value);
      const formationId = resolveFormationId(value.type_apprenant, value.formation_choisie, value.modules_autorises);
      setSelectedFormation(formationId);
    };

    applyApprenant(apprenantOverride);

    // In embedded preview, force-refresh latest DB state to avoid stale search result snapshot
    if (!embedded || !apprenantOverride.id) return;

    let cancelled = false;
    const refreshApprenant = async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises")
        .eq("id", apprenantOverride.id)
        .maybeSingle();

      if (cancelled || error || !data) return;
      applyApprenant(data as ApprenantInfo);
    };

    void refreshApprenant();

    return () => {
      cancelled = true;
    };
  }, [apprenantOverride, embedded]);

  // Fetch completed modules
  useEffect(() => {
    if (!apprenant?.id) return;
    const fetchCompletions = async () => {
      const { data } = await supabase
        .from("apprenant_module_completion")
        .select("id, module_id, score_obtenu, score_max, completed_at, details")
        .eq("apprenant_id", apprenant.id!);

      if (data) {
        setCompletedModuleIds(new Set((data as any[]).map((d: any) => d.module_id)));
        const scores: Record<number, { score_obtenu: number | null; score_max: number | null }> = {};
        (data as any[]).forEach((d: any) => {
          scores[d.module_id] = { score_obtenu: d.score_obtenu, score_max: d.score_max };
        });
        setModuleScores(scores);
        setModuleCompletionsForNotes(data as any);
      }
    };
    fetchCompletions();
  }, [apprenant?.id]);

  const handleModuleCompleted = (moduleId: number) => {
    setCompletedModuleIds(prev => new Set([...prev, moduleId]));
  };

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
            apprenantType={apprenant?.type_apprenant || null}
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
          apprenantId={apprenant?.id || null}
          onModuleCompleted={handleModuleCompleted}
          apprenantType={apprenant?.type_apprenant || null}
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

  // Keep learner list aligned with CRM order and module selection (no auto-expansion in UI list)
  const authorizedIds = Array.isArray(apprenant?.modules_autorises)
    ? Array.from(new Set(apprenant.modules_autorises.map((id) => Number(id)).filter((id) => Number.isFinite(id))))
    : [];

  const orderedAuthorizedModules = authorizedIds
    .map((id) => allModules.find((module) => module.id === id))
    .filter((module): module is (typeof MODULES_DATA)[number] => !!module);

  const sourceModules = !embedded && orderedAuthorizedModules.length > 0
    ? orderedAuthorizedModules
    : allModules;

  const modules = sourceModules.map((module) => ({
    ...module,
    nom: getModuleDisplayName(selectedFormation, module.id, module.nom),
  }));

  const completedCount = modules.filter((m) => completedModuleIds.has(m.id)).length;
  const globalProgress = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
  const remainingModules = modules.filter((m) => !completedModuleIds.has(m.id));
  const doneModules = modules.filter((m) => completedModuleIds.has(m.id));
  const lowModules = remainingModules.slice(0, 3);
  const studentName = apprenant ? `${apprenant.prenom} ${apprenant.nom}` : "Apprenant";

  // E-learning sequential order enforcement
  const ELEARNING_FORMATION_IDS: FormationId[] = ["vtc-elearning", "taxi-elearning", "taxi-pour-vtc-elearning"];
  const isElearning = ELEARNING_FORMATION_IDS.includes(selectedFormation);

  // Build a set of unlocked module IDs for e-learning
  const unlockedModuleIds = new Set<number>();
  if (isElearning) {
    for (let i = 0; i < modules.length; i++) {
      if (i === 0) {
        // First module is always unlocked
        unlockedModuleIds.add(modules[i].id);
      } else if (completedModuleIds.has(modules[i - 1].id)) {
        // Unlock if previous module is completed
        unlockedModuleIds.add(modules[i].id);
      }
    }
    // Completed modules are always accessible (for review)
    modules.forEach(m => { if (completedModuleIds.has(m.id)) unlockedModuleIds.add(m.id); });
  }

  const isModuleLocked = (modId: number) => isElearning && !unlockedModuleIds.has(modId) && !completedModuleIds.has(modId);

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
          <NotesView apprenantId={apprenant.id} studentName={studentName} moduleCompletionsSeed={moduleCompletionsForNotes} />
        )}

        {/* Examens tab - Examens Blancs */}
        {activeTab === "examens" && (
          <ExamensBlancsPage
            apprenantId={apprenant?.id || null}
            userId={user?.id || null}
            apprenantType={apprenant?.type_apprenant || null}
          />
        )}

        {/* Accueil tab */}
        {activeTab === "accueil" && (
          <>
            {/* Gamification: Welcome Banner + XP + Badges + Quiz */}
            {(() => {
              const xp = calculateXP(completedModuleIds, moduleScores);
              const badges = buildBadges(completedModuleIds, modules.length, moduleScores);
              // Estimate streak (simplified: always show 1 if user is active today)
              const streak = completedCount > 0 ? Math.min(completedCount, 7) : 0;
              return (
                <>
                  <WelcomeBanner
                    prenom={apprenant?.prenom || "Apprenant"}
                    formationLabel={formation.label}
                    xp={xp}
                    xpToday={0}
                    streak={streak}
                    completedCount={completedCount}
                    totalModules={modules.length}
                    globalProgress={globalProgress}
                  />
                  <XPBar xp={xp} />
                  <BadgeGrid badges={badges} />
                  <QuizBlock />
                </>
              );
            })()}

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
                  {lowModules.map((mod) => {
                    const locked = isModuleLocked(mod.id);
                    return (
                    <div key={mod.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${locked ? "bg-muted/20 opacity-60" : "bg-muted/30 hover:bg-muted/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${locked ? "bg-muted text-muted-foreground" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
                          {locked ? <Lock className="w-4 h-4" /> : mod.id}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{mod.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {locked ? "🔒 Terminez le module précédent" : "Progression : 0%"}
                          </p>
                        </div>
                      </div>
                      {!locked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                        onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Réviser
                      </Button>
                      )}
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Modules grid: À faire + Réalisés */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* À faire */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  À faire ({remainingModules.length})
                </h2>
                <div className="grid gap-3">
                  {remainingModules.length === 0 && (
                    <Card className="border-0 shadow-sm p-8 text-center">
                      <p className="text-muted-foreground text-sm">🎉 Tous les modules sont terminés !</p>
                    </Card>
                  )}
                  {remainingModules.map((mod, idx) => {
                    const locked = isModuleLocked(mod.id);
                    return (
                    <Card
                      key={mod.id}
                      className={`border-0 shadow-sm transition-all duration-300 overflow-hidden ${locked ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg cursor-pointer group"}`}
                      onClick={() => { if (!locked) { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); } }}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${locked ? "bg-muted border-muted" : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10 group-hover:from-primary/20 group-hover:to-primary/10"}`}>
                            {locked
                              ? <Lock className="w-4 h-4 text-muted-foreground" />
                              : <span className="text-sm font-bold text-primary">{idx + 1}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm transition-colors ${locked ? "text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                              {mod.nom}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {locked ? "🔒 Terminez le module précédent pour débloquer" : mod.description}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {locked ? (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                                <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>

              {/* Réalisés */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Réalisés ({doneModules.length})
                </h2>
                <div className="grid gap-3">
                  {doneModules.length === 0 && (
                    <Card className="border-0 shadow-sm p-8 text-center">
                      <p className="text-muted-foreground text-sm">Aucun module terminé pour l'instant</p>
                    </Card>
                  )}
                  {doneModules.map((mod) => (
                    <Card
                      key={mod.id}
                      className="border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden border-l-4 border-l-emerald-400"
                      onClick={() => { trackModuleActivity(mod.id, mod.nom); setSelectedModule(mod); }}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
                              {mod.nom}
                            </h3>
                            <p className="text-xs text-emerald-600">
                              ✅ Terminé
                              {moduleScores[mod.id]?.score_obtenu != null && moduleScores[mod.id]?.score_max != null && (
                                <span className="ml-2 font-semibold">
                                  — Score : {moduleScores[mod.id].score_obtenu}/{moduleScores[mod.id].score_max} ({Math.round((moduleScores[mod.id].score_obtenu! / moduleScores[mod.id].score_max!) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                              Revoir
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoursPublic;
