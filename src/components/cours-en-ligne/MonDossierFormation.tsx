import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { callOnboardingInvitation } from "@/lib/onboardingInvitation";
import { etatInscriptionExamen } from "@/lib/dossierFormation";

interface Props {
  apprenantId: string;
  onOpenIntro: () => void;
}

export default function MonDossierFormation({ apprenantId, onOpenIntro }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mon-dossier-formation", apprenantId],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      return callOnboardingInvitation(
        { action: "dossier_formation_self", apprenant_id: apprenantId },
        s.session?.access_token,
      );
    },
    staleTime: 60_000,
  });

  const voirDocument = async () => {
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await callOnboardingInvitation(
        { action: "dossier_bienvenue_pdf", apprenant_id: apprenantId },
        s.session?.access_token,
      );
      if (res?.url && typeof res.url === "string") {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Le document n'est pas disponible pour le moment.");
      }
    } catch {
      toast.error("Le document n'est pas disponible pour le moment.");
    }
  };

  const ouvrirBienvenue = () => {
    const p = data?.parcours;
    if (!p?.session_token || p.dossier?.id !== apprenantId) {
      navigate("/bienvenue");
      return;
    }
    const d = p.dossier;
    localStorage.setItem("onboarding_apprenant_id", d.id);
    localStorage.setItem("onboarding_session_token", p.session_token);
    localStorage.setItem("onboarding_email", d.email || "");
    localStorage.setItem("onboarding_telephone", d.telephone || "");
    localStorage.setItem("onboarding_adresse", d.adresse || "");
    localStorage.setItem("onboarding_code_postal", d.code_postal || "");
    localStorage.setItem("onboarding_ville", d.ville || "");
    localStorage.setItem("onboarding_found", "true");
    localStorage.setItem("onboarding_nom", d.nom || "");
    localStorage.setItem("onboarding_prenom", d.prenom || "");
    localStorage.setItem("onboarding_is_fc", p.is_fc ? "true" : "false");
    navigate("/bienvenue/etape-1");
  };

  if (isLoading) {
    return (
      <Card className="mb-8"><CardContent className="p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </CardContent></Card>
    );
  }
  if (isError || !data) return null;

  const bienvenueOk = !!data.bienvenue_signe;
  const inscription = etatInscriptionExamen(bienvenueOk, data.statut_suivi);
  const lignes: { label: string; ok: boolean; okTxt: string; action: () => void; okAction?: () => void; okActionLabel?: string }[] = [
    { label: "Document de bienvenue complété et signé", ok: bienvenueOk, okTxt: "Complété et signé", action: ouvrirBienvenue, okAction: voirDocument, okActionLabel: "Voir le document" },
    { label: "Projet professionnel", ok: !!data.projet_professionnel, okTxt: "OK", action: onOpenIntro },
    { label: "Analyse des besoins", ok: !!data.analyse_besoin, okTxt: "OK", action: onOpenIntro },
    { label: "Test de compétences avant formation", ok: !!data.test_competences, okTxt: "OK", action: onOpenIntro },
  ];
  const pastille = inscription.niveau === "vert" ? "🟢" : inscription.niveau === "orange" ? "🟠" : "🔴";

  return (
    <Card className="border shadow-sm mb-8 overflow-hidden" data-testid="mon-dossier-formation">
      <div className="bg-muted/40 px-6 py-3 border-b">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="w-4 h-4" /> Mon dossier de formation
        </h3>
      </div>
      <CardContent className="p-4 space-y-2">
        {lignes.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
            <div>
              <p className="font-medium text-sm text-foreground">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.ok ? `✅ ${l.okTxt}` : "❌ À compléter"}</p>
            </div>
            {!l.ok && (
              <Button variant="outline" size="sm" onClick={l.action}>Compléter</Button>
            )}
          </div>
        ))}
        <div className="p-3 rounded-xl bg-muted/30 space-y-2" data-testid="ligne-inscription-examen">
          <p className="font-medium text-sm text-foreground">Inscription à l'examen</p>
          <p className="text-sm">{pastille} {inscription.libelle}</p>
          {inscription.bloque && (
            <>
              <p className="text-xs text-destructive">
                Sans dossier de bienvenue complété et signé, nous ne pouvons pas vous inscrire à l'examen. Merci de compléter votre dossier de bienvenue.
              </p>
              <Button size="sm" onClick={ouvrirBienvenue}>Compléter mon dossier de bienvenue</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
