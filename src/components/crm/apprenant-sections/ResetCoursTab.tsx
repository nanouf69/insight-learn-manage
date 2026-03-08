import { useState } from "react";
import { RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MODULES_DATA } from "@/components/cours-en-ligne/formations-data";

interface ResetCoursTabProps {
  apprenant: any;
  queryClient: QueryClient;
}

const MANAGED_MODULE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 50, 51, 52, 53, 60, 61, 62, 63, 64]);

const DEFAULT_MODULES_BY_TYPE: Record<string, number[]> = {
  "vtc": [1, 2, 3, 4, 35, 5, 8, 60, 50],
  "vtc-e-presentiel": [1, 2, 3, 4, 35, 5, 8, 60, 50],
  "vtc-e": [26, 2, 3, 4, 35, 5, 8, 60, 50],
  "taxi": [1, 10, 7, 3, 9, 13, 11, 36, 6, 12, 64, 61, 51],
  "taxi-e-presentiel": [1, 10, 7, 3, 9, 13, 11, 36, 6, 12, 64, 61, 51],
  "taxi-e": [26, 10, 7, 3, 9, 13, 11, 36, 6, 12, 64, 61, 51],
  "ta": [31, 40, 7, 3, 27, 28, 37, 6, 64, 62, 52],
  "ta-e-presentiel": [31, 40, 7, 3, 27, 28, 37, 6, 64, 62, 52],
  "ta-e": [32, 40, 7, 3, 27, 13, 28, 37, 6, 64, 62, 52],
  "va": [34, 41, 3, 29, 30, 38, 8, 63, 53],
  "va-e-presentiel": [34, 41, 3, 29, 30, 38, 8, 63, 53],
  "va-e": [34, 41, 3, 29, 30, 38, 8, 63, 53],
};

const FORMATION_TO_TYPE: Record<string, string> = {
  "vtc": "vtc",
  "vtc-exam": "vtc",
  "vtc-elearning-1099": "vtc-e",
  "vtc-elearning": "vtc-e",
  "taxi": "taxi",
  "taxi-exam": "taxi",
  "taxi-elearning": "taxi-e",
  "passerelle-taxi": "ta",
  "passerelle-taxi-elearning": "ta-e",
  "passerelle-vtc-elearning": "va-e",
  "vtc-e-presentiel": "vtc-e-presentiel",
  "taxi-e-presentiel": "taxi-e-presentiel",
  "ta-e-presentiel": "ta-e-presentiel",
};

const normalizeTypeApprenant = (rawType: string | null | undefined): string => {
  if (!rawType) return "";

  const normalized = rawType.trim().toLowerCase();
  if (!normalized) return "";

  const dashed = normalized.replace(/\s+/g, "-");

  const aliases: Record<string, string> = {
    "vtc-e": "vtc-e",
    "taxi-e": "taxi-e",
    "ta-e": "ta-e",
    "va-e": "va-e",
    "vtc-e-presentiel": "vtc-e-presentiel",
    "taxi-e-presentiel": "taxi-e-presentiel",
    "ta-e-presentiel": "ta-e-presentiel",
    "va-e-presentiel": "va-e-presentiel",
  };

  return aliases[normalized] || aliases[dashed] || dashed;
};

const FORMATION_LABELS: Record<string, Record<number, string>> = {
  "vtc": {
    1: "1.INTRODUCTION FORMATION EN PRÉSENTIEL",
    2: "2.COURS ET EXERCICES VTC",
    25: "2a.COURS ET EXERCICES VTC",
    14: "2b.COURS ET EXERCICES VTC",
    15: "2c.COURS ET EXERCICES VTC",
    16: "2d.COURS ET EXERCICES VTC",
    17: "2e.COURS ET EXERCICES VTC",
    18: "2f.COURS ET EXERCICES VTC",
    19: "2g.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "vtc-e": {
    26: "1.INTRODUCTION E-LEARNING",
    2: "2.COURS ET EXERCICES VTC",
    25: "2a.COURS ET EXERCICES VTC",
    14: "2b.COURS ET EXERCICES VTC",
    15: "2c.COURS ET EXERCICES VTC",
    16: "2d.COURS ET EXERCICES VTC",
    17: "2e.COURS ET EXERCICES VTC",
    18: "2f.COURS ET EXERCICES VTC",
    19: "2g.COURS ET EXERCICES VTC",
    3: "3.FORMULES",
    4: "4.BILAN EXERCICES VTC",
    35: "5.EXAMENS BLANCS VTC",
    5: "6.BILAN EXAMEN VTC",
    8: "7.PRATIQUE VTC",
  },
  "taxi": {
    1: "1.INTRODUCTION FORMATION EN PRÉSENTIEL",
    10: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
    12: "10.CAS PRATIQUE TAXI",
  },
  "taxi-e": {
    26: "1.INTRODUCTION E-LEARNING",
    10: "2.COURS ET EXERCICES TAXI",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    9: "5.BILAN EXERCICES TAXI",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    11: "7.BILAN EXAMEN TAXI",
    36: "8.EXAMENS BLANCS TAXI",
    6: "9.PRATIQUE TAXI",
    12: "10.CAS PRATIQUE TAXI",
  },
  "ta": {
    31: "1.INTRODUCTION TA",
    40: "2.COURS ET EXERCICES TA",
    24: "2a.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    28: "6.BILAN EXAMEN TA",
    37: "7.EXAMENS BLANCS TA",
    6: "8.PRATIQUE TAXI",
  },
  "ta-e": {
    32: "1.INTRODUCTION TA E-LEARNING",
    40: "2.COURS ET EXERCICES TA",
    24: "2a.COURS ET EXERCICES TA",
    7: "3.CONNAISSANCES DE LA VILLE TAXI",
    3: "4.FORMULES",
    27: "5.BILAN EXERCICES TA",
    13: "6.CONTRÔLE DE CONNAISSANCES TAXI",
    28: "7.BILAN EXAMEN TA",
    37: "8.EXAMENS BLANCS TA",
    6: "9.PRATIQUE TAXI",
  },
  "va": {
    33: "1.INTRODUCTION VA",
    41: "2.COURS ET EXERCICES VA",
    18: "2a.COURS ET EXERCICES VA",
    19: "2b.COURS ET EXERCICES VA",
    3: "3.FORMULES",
    29: "4.BILAN EXERCICES VA",
    30: "5.BILAN EXAMEN VA",
    38: "6.EXAMENS BLANCS VA",
    8: "7.PRATIQUE VTC",
  },
  "va-e": {
    34: "1.INTRODUCTION VA E-LEARNING",
    41: "2.COURS ET EXERCICES VA",
    18: "2a.COURS ET EXERCICES VA",
    19: "2b.COURS ET EXERCICES VA",
    3: "3.FORMULES",
    29: "4.BILAN EXERCICES VA",
    30: "5.BILAN EXAMEN VA",
    38: "6.EXAMENS BLANCS VA",
    8: "7.PRATIQUE VTC",
  },
};

["vtc-e-presentiel", "taxi-e-presentiel", "ta-e-presentiel", "va-e-presentiel", "va-e"].forEach((k) => {
  const base = k.replace("-e-presentiel", "").replace("-e", "");
  if (!FORMATION_LABELS[k] && FORMATION_LABELS[base]) {
    FORMATION_LABELS[k] = FORMATION_LABELS[base];
  }
});

export function ResetCoursTab({ apprenant, queryClient }: ResetCoursTabProps) {
  const [resettingModule, setResettingModule] = useState<number | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const hasAccount = !!apprenant.auth_user_id;

  const authorizedModuleIds: number[] = Array.isArray(apprenant.modules_autorises)
    ? apprenant.modules_autorises
        .map((id: any) => Number(id))
        .filter((id: number) => Number.isFinite(id))
    : [];

  const managedAuthorizedModuleIds = Array.from(new Set(authorizedModuleIds)).filter((id) => MANAGED_MODULE_IDS.has(id));

  const inferTypeFromModules = (moduleIds: number[]): string => {
    for (const [type, defaults] of Object.entries(DEFAULT_MODULES_BY_TYPE)) {
      const uniqueDefaults = Array.from(new Set(defaults));
      const containsAllDefaults = uniqueDefaults.every((id) => moduleIds.includes(id));
      if (containsAllDefaults) return type;
    }
    return "";
  };

  const primaryType = normalizeTypeApprenant((apprenant.type_apprenant || "").split(" + ")[0]);
  const formationKey = (apprenant.formation_choisie || "").split(" + ")[0];
  const fallbackType = normalizeTypeApprenant(FORMATION_TO_TYPE[formationKey]);
  const inferredTypeFromModules = inferTypeFromModules(managedAuthorizedModuleIds);
  const resolvedType = inferredTypeFromModules || primaryType || fallbackType;
  const labelsForType = FORMATION_LABELS[resolvedType] || {};

  // Fetch completions for this learner
  const { data: completions = [] } = useQuery({
    queryKey: ["reset-completions", apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("apprenant_module_completion")
        .select("module_id, score_obtenu, score_max")
        .eq("apprenant_id", apprenant.id);
      return data || [];
    },
    enabled: hasAccount,
  });

  // Fetch quiz results count per module
  const { data: quizResults = [] } = useQuery({
    queryKey: ["reset-quiz-results", apprenant.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("apprenant_quiz_results")
        .select("quiz_id, matiere_id")
        .eq("apprenant_id", apprenant.id);
      return data || [];
    },
    enabled: hasAccount,
  });

  // If no course account exists, show empty state
  if (!hasAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="w-5 h-5" />
            Remise à zéro des modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            Aucun compte cours actif. Créez un compte cours pour accéder à la remise à zéro des modules.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formationModuleIds = DEFAULT_MODULES_BY_TYPE[resolvedType] || [];
  const orderedVisibleModuleIds = [
    ...formationModuleIds.filter((id) => managedAuthorizedModuleIds.includes(id)),
    ...managedAuthorizedModuleIds.filter((id) => !formationModuleIds.includes(id)),
  ];

  const visibleModules = orderedVisibleModuleIds
    .map((id) => MODULES_DATA.find((m) => m.id === id))
    .filter((m): m is typeof MODULES_DATA[number] => !!m);

  const getDisplayLabel = (moduleId: number, fallbackName: string) => labelsForType[moduleId] || fallbackName;

  const getModuleCompletion = (moduleId: number) => {
    return completions.find((c: any) => c.module_id === moduleId);
  };

  const resetModule = async (moduleId: number) => {
    const mod = MODULES_DATA.find((m) => m.id === moduleId);
    const moduleLabel = getDisplayLabel(moduleId, mod?.nom || "Module");
    const confirmed = window.confirm(
      `Remettre à zéro le module "${moduleLabel}" pour ${apprenant.prenom} ${apprenant.nom} ?`
    );
    if (!confirmed) return;

    setResettingModule(moduleId);
    try {
      const { error: err1 } = await supabase
        .from("apprenant_module_completion")
        .delete()
        .eq("apprenant_id", apprenant.id)
        .eq("module_id", moduleId);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("apprenant_module_activites")
        .delete()
        .eq("apprenant_id", apprenant.id)
        .eq("module_id", moduleId);
      if (err2) throw err2;

      queryClient.invalidateQueries({ queryKey: ["reset-completions"] });
      queryClient.invalidateQueries({ queryKey: ["reset-quiz-results"] });
      toast.success(`Module "${moduleLabel}" remis à zéro`);
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setResettingModule(null);
    }
  };

  const resetAll = async () => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir remettre à zéro TOUS les cours de ${apprenant.prenom} ${apprenant.nom} ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setResettingAll(true);
    try {
      const { error: err1 } = await supabase
        .from("apprenant_module_completion")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("apprenant_quiz_results")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err2) throw err2;

      const { error: err3 } = await supabase
        .from("apprenant_module_activites")
        .delete()
        .eq("apprenant_id", apprenant.id);
      if (err3) throw err3;

      queryClient.invalidateQueries({ queryKey: ["reset-completions"] });
      queryClient.invalidateQueries({ queryKey: ["reset-quiz-results"] });
      toast.success(`Tous les cours remis à zéro pour ${apprenant.prenom} ${apprenant.nom}`);
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="w-5 h-5" />
            Remise à zéro des modules
          </CardTitle>
          <Button
            variant="destructive"
            onClick={resetAll}
            disabled={resettingAll}
          >
            {resettingAll ? (
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            Tout remettre à zéro
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="text-center">Progression</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun module autorisé pour cet apprenant
                  </TableCell>
                </TableRow>
              ) : (
                visibleModules.map((mod) => {
                  const completion = getModuleCompletion(mod.id);
                  const isCompleted = !!completion;
                  const score = completion
                    ? `${completion.score_obtenu ?? 0}/${completion.score_max ?? "?"}`
                    : "—";

                  return (
                    <TableRow key={mod.id}>
                      <TableCell className="font-medium text-primary">
                        {getDisplayLabel(mod.id, mod.nom)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleted ? score : "0%"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isCompleted ? (
                          <Badge variant="default" className="bg-green-600">Complété</Badge>
                        ) : (
                          <Badge variant="outline">Non fait</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!isCompleted || resettingModule === mod.id}
                          onClick={() => resetModule(mod.id)}
                        >
                          {resettingModule === mod.id ? (
                            <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
