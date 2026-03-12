import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ClipboardList, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { getCompetencesForFormation, type CompetencesData } from "@/components/cours-en-ligne/competences-checklist-data";

interface ApprenantInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  type_apprenant: string | null;
  date_naissance: string | null;
  formation_choisie: string | null;
}

type FormStep = "analyse" | "projet" | "competences";

function getFormationLabel(type: string | null): string {
  if (!type) return "Formation";
  const t = type.toUpperCase();
  if (t === "TA" || t.includes("TA")) return "Passerelle TA (VTC → TAXI)";
  if (t === "VA" || t.includes("VA")) return "Passerelle VA (TAXI → VTC)";
  if (t.includes("TAXI")) return "TAXI";
  if (t.includes("VTC")) return "VTC";
  return "Formation";
}

function isTaxiType(type: string | null): boolean {
  if (!type) return false;
  const t = type.toUpperCase();
  return t.includes("TAXI") || t === "TA";
}

export default function PreInformationPublic() {
  const [searchParams] = useSearchParams();
  const apprenantId = searchParams.get("id");
  const formationType = searchParams.get("type"); // taxi, vtc, ta, va
  
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("analyse");
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set());
  const [saving, setSaving] = useState(false);

  // Analyse du besoin state
  const [analyseData, setAnalyseData] = useState({
    situation_actuelle: "",
    experience_transport: "",
    motivation: "",
    disponibilite: "",
    financement: "",
    besoins_specifiques: "",
    comment_connu: "",
    attentes: "",
  });

  // Projet professionnel state
  const [projetData, setProjetData] = useState({
    objectif_court_terme: "",
    objectif_moyen_terme: "",
    type_activite: "",
    zone_geographique: "",
    statut_juridique: "",
    vehicule_prevu: "",
    budget_investissement: "",
    date_debut_souhaitee: "",
  });

  // Test de compétences state
  const [competencesAnswers, setCompetencesAnswers] = useState<Record<string, "oui" | "non">>({});

  const [signature, setSignature] = useState("");
  const [signatureDate] = useState(new Date().toLocaleDateString("fr-FR"));

  useEffect(() => {
    if (!apprenantId) {
      setError("Lien invalide — identifiant manquant");
      setLoading(false);
      return;
    }
    loadApprenant();
  }, [apprenantId]);

  const loadApprenant = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("save-public-form", {
        method: "GET",
        body: undefined,
        headers: { "Content-Type": "application/json" },
      });
      
      // Use fetch directly for GET with query params
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${baseUrl}/functions/v1/save-public-form?id=${apprenantId}`,
        {
          method: "GET",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!res.ok) {
        setError("Apprenant non trouvé. Vérifiez votre lien.");
        setLoading(false);
        return;
      }
      
      const appData = await res.json();
      setApprenant(appData);
    } catch (err) {
      setError("Erreur de chargement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const saveForm = async (typeDocument: string, titre: string, donnees: Record<string, any>) => {
    setSaving(true);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/save-public-form`, {
        method: "POST",
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apprenantId,
          typeDocument,
          titre,
          donnees: { ...donnees, _status: "completed", _signed_by: signature, _signed_at: new Date().toISOString() },
        }),
      });

      if (!res.ok) throw new Error("Erreur de sauvegarde");
      return true;
    } catch {
      toast.error("Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const effectiveType = formationType || apprenant?.type_apprenant || "vtc";
  const formationLabel = getFormationLabel(effectiveType);
  const competencesData = getCompetencesForFormation(effectiveType);
  const totalCompetences = competencesData.sections.reduce((acc, s) => acc + s.items.length, 0);
  const answeredCompetences = Object.keys(competencesAnswers).length;

  const handleSubmitAnalyse = async () => {
    if (!signature.trim()) {
      toast.error("Veuillez signer le document (nom et prénom)");
      return;
    }
    const saved = await saveForm("analyse-besoin", `Analyse du besoin – ${formationLabel}`, {
      ...analyseData,
      apprenant_nom: apprenant?.nom,
      apprenant_prenom: apprenant?.prenom,
      formation: formationLabel,
    });
    if (saved) {
      toast.success("Analyse du besoin enregistrée !");
      setCompletedSteps(prev => new Set([...prev, "analyse"]));
      setCurrentStep("projet");
      setSignature("");
    }
  };

  const handleSubmitProjet = async () => {
    if (!signature.trim()) {
      toast.error("Veuillez signer le document (nom et prénom)");
      return;
    }
    const saved = await saveForm("projet-professionnel", `Projet professionnel – ${formationLabel}`, {
      ...projetData,
      apprenant_nom: apprenant?.nom,
      apprenant_prenom: apprenant?.prenom,
      formation: formationLabel,
    });
    if (saved) {
      toast.success("Projet professionnel enregistré !");
      setCompletedSteps(prev => new Set([...prev, "projet"]));
      setCurrentStep("competences");
      setSignature("");
    }
  };

  const handleSubmitCompetences = async () => {
    if (answeredCompetences < totalCompetences) {
      toast.error(`Veuillez répondre à toutes les compétences (${answeredCompetences}/${totalCompetences})`);
      return;
    }
    if (!signature.trim()) {
      toast.error("Veuillez signer le document (nom et prénom)");
      return;
    }
    const saved = await saveForm("test-competences", `Test de compétences – ${formationLabel}`, {
      answers: competencesAnswers,
      sections: competencesData.sections.map(s => s.titre),
      formationLabel: competencesData.formationLabel,
    });
    if (saved) {
      toast.success("Test de compétences enregistré !");
      setCompletedSteps(prev => new Set([...prev, "competences"]));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !apprenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-medium">{error || "Erreur de chargement"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDone = completedSteps.size === 3;

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800">Documents complétés !</h2>
            <p className="text-muted-foreground">
              Merci {apprenant.prenom}, vos 3 documents de pré-information ont été enregistrés avec succès.
              Notre équipe les examinera dans les plus brefs délais.
            </p>
            <div className="pt-4 text-sm text-muted-foreground">
              <p>FTRANSPORT — Centre de formation</p>
              <p>86 Route de Genas, 69003 Lyon</p>
              <p>📞 04 28 29 60 91</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
    { key: "analyse", label: "Analyse du besoin", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "projet", label: "Projet professionnel", icon: <Target className="w-4 h-4" /> },
    { key: "competences", label: "Test de compétences", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <Sonner />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-5 text-center space-y-2">
            <h1 className="text-xl font-bold">PRÉ-INFORMATION — {formationLabel.toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">
              FTRANSPORT — NDA : 84 69 1511469 | SIRET : 82346156100018 | Qualiopi ✓
            </p>
            <p className="text-sm">
              Bonjour <strong>{apprenant.prenom} {apprenant.nom}</strong>, merci de compléter les 3 documents ci-dessous.
            </p>
          </CardContent>
        </Card>

        {/* Stepper */}
        <div className="flex gap-2">
          {steps.map((step, i) => (
            <button
              key={step.key}
              onClick={() => !completedSteps.has(step.key) ? setCurrentStep(step.key) : null}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                completedSteps.has(step.key)
                  ? "bg-green-50 border-green-300 text-green-700"
                  : currentStep === step.key
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              {completedSteps.has(step.key) ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                step.icon
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Step 1: Analyse du besoin */}
        {currentStep === "analyse" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                ANALYSE DU BESOIN — {formationLabel}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Quelle est votre situation actuelle ? *</label>
                  <Textarea value={analyseData.situation_actuelle} onChange={e => setAnalyseData(p => ({ ...p, situation_actuelle: e.target.value }))} placeholder="Salarié, demandeur d'emploi, indépendant..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Avez-vous une expérience dans le transport de personnes ?</label>
                  <Textarea value={analyseData.experience_transport} onChange={e => setAnalyseData(p => ({ ...p, experience_transport: e.target.value }))} placeholder="Décrivez votre expérience..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quelle est votre motivation pour cette formation ? *</label>
                  <Textarea value={analyseData.motivation} onChange={e => setAnalyseData(p => ({ ...p, motivation: e.target.value }))} placeholder="Pourquoi souhaitez-vous suivre cette formation ?" />
                </div>
                <div>
                  <label className="text-sm font-medium">Quelles sont vos disponibilités ? *</label>
                  <Textarea value={analyseData.disponibilite} onChange={e => setAnalyseData(p => ({ ...p, disponibilite: e.target.value }))} placeholder="Temps plein, temps partiel, contraintes horaires..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quel mode de financement envisagez-vous ?</label>
                  <Input value={analyseData.financement} onChange={e => setAnalyseData(p => ({ ...p, financement: e.target.value }))} placeholder="CPF, personnel, France Travail, OPCO..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Avez-vous des besoins spécifiques ? (handicap, aménagement...)</label>
                  <Textarea value={analyseData.besoins_specifiques} onChange={e => setAnalyseData(p => ({ ...p, besoins_specifiques: e.target.value }))} placeholder="Précisez vos besoins..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Comment avez-vous connu Ftransport ?</label>
                  <Input value={analyseData.comment_connu} onChange={e => setAnalyseData(p => ({ ...p, comment_connu: e.target.value }))} placeholder="Internet, bouche-à-oreille, ancien élève..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quelles sont vos attentes principales ?</label>
                  <Textarea value={analyseData.attentes} onChange={e => setAnalyseData(p => ({ ...p, attentes: e.target.value }))} placeholder="Ce que vous attendez de la formation..." />
                </div>
              </div>

              {/* Signature */}
              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitAnalyse} disabled={saving || !analyseData.situation_actuelle || !analyseData.motivation || !analyseData.disponibilite}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider l'analyse du besoin"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Projet professionnel */}
        {currentStep === "projet" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5" />
                PROJET PROFESSIONNEL — {formationLabel}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Quel est votre objectif à court terme (6 mois) ? *</label>
                  <Textarea value={projetData.objectif_court_terme} onChange={e => setProjetData(p => ({ ...p, objectif_court_terme: e.target.value }))} placeholder="Obtenir la carte professionnelle, démarrer l'activité..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quel est votre objectif à moyen terme (1-3 ans) ? *</label>
                  <Textarea value={projetData.objectif_moyen_terme} onChange={e => setProjetData(p => ({ ...p, objectif_moyen_terme: e.target.value }))} placeholder="Développer votre clientèle, créer votre société..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quel type d'activité envisagez-vous ? *</label>
                  <Input value={projetData.type_activite} onChange={e => setProjetData(p => ({ ...p, type_activite: e.target.value }))} placeholder="Salarié, indépendant, locataire de licence..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Dans quelle zone géographique souhaitez-vous exercer ?</label>
                  <Input value={projetData.zone_geographique} onChange={e => setProjetData(p => ({ ...p, zone_geographique: e.target.value }))} placeholder="Lyon, Rhône, Île-de-France..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quel statut juridique envisagez-vous ?</label>
                  <Input value={projetData.statut_juridique} onChange={e => setProjetData(p => ({ ...p, statut_juridique: e.target.value }))} placeholder="Auto-entrepreneur, SASU, SARL..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Avez-vous prévu un véhicule ? Lequel ?</label>
                  <Textarea value={projetData.vehicule_prevu} onChange={e => setProjetData(p => ({ ...p, vehicule_prevu: e.target.value }))} placeholder="Marque, modèle, achat ou location..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quel est votre budget d'investissement estimé ?</label>
                  <Input value={projetData.budget_investissement} onChange={e => setProjetData(p => ({ ...p, budget_investissement: e.target.value }))} placeholder="Budget approximatif..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Quand souhaitez-vous démarrer votre activité ?</label>
                  <Input value={projetData.date_debut_souhaitee} onChange={e => setProjetData(p => ({ ...p, date_debut_souhaitee: e.target.value }))} placeholder="Dans 3 mois, après l'examen..." />
                </div>
              </div>

              {/* Signature */}
              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitProjet} disabled={saving || !projetData.objectif_court_terme || !projetData.objectif_moyen_terme || !projetData.type_activite}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider le projet professionnel"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Test de compétences */}
        {currentStep === "competences" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                TEST DE COMPÉTENCES — {formationLabel}
              </h2>
              <p className="text-sm text-muted-foreground">
                Pour chaque compétence ci-dessous, indiquez si vous la maîtrisez déjà (Oui) ou non (Non).
              </p>
              <Badge variant="outline">{answeredCompetences}/{totalCompetences} répondues</Badge>

              <div className="space-y-6">
                {competencesData.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <h3 className="font-semibold text-sm border-b pb-1">{section.titre}</h3>
                    {section.items.map((item, iIdx) => {
                      const key = `${sIdx}-${iIdx}`;
                      return (
                        <div key={key} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                          <p className="text-xs flex-1">{item}</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setCompetencesAnswers(p => ({ ...p, [key]: "oui" }))}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                competencesAnswers[key] === "oui"
                                  ? "bg-green-100 border-green-400 text-green-700"
                                  : "bg-background border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setCompetencesAnswers(p => ({ ...p, [key]: "non" }))}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                competencesAnswers[key] === "non"
                                  ? "bg-red-100 border-red-400 text-red-700"
                                  : "bg-background border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Signature */}
              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitCompetences} disabled={saving || answeredCompetences < totalCompetences}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider le test de compétences"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>FTRANSPORT — 86 Route de Genas, 69003 Lyon — 📞 04 28 29 60 91</p>
        </div>
      </div>
    </div>
  );
}
