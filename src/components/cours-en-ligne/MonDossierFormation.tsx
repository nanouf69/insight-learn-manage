import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { callOnboardingInvitation } from "@/lib/onboardingInvitation";
import { etatInscriptionExamen, alerteDateLimiteDisponible } from "@/lib/dossierFormation";
import { trouverExamenTheorique } from "@/lib/examDatesConfig";

interface Props {
  apprenantId: string;
  onOpenIntro: () => void;
}

export default function MonDossierFormation({ apprenantId, onOpenIntro }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
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

  const demanderTraitementUrgent = async () => {
    if (envoiEnCours) return;
    setEnvoiEnCours(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await callOnboardingInvitation(
        { action: "demande_urgente_inscription", apprenant_id: apprenantId },
        s.session?.access_token,
      );
      if (res?.ok) {
        toast.success(res.deja_envoyee ? "Votre demande a déjà été transmise au centre." : "Votre demande a été transmise au centre.");
        await queryClient.invalidateQueries({ queryKey: ["mon-dossier-formation", apprenantId] });
      } else {
        toast.error(res?.error || "La demande n'a pas pu être envoyée.");
      }
    } catch {
      toast.error("La demande n'a pas pu être envoyée. Réessayez plus tard.");
    } finally {
      setEnvoiEnCours(false);
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
  const examen = trouverExamenTheorique(data.date_examen_theorique);
  const alerteUrgente = alerteDateLimiteDisponible(examen?.dateLimite, data.statut_suivi);
  const demandeActive = data.demande_urgente_active;
  const pastille = inscription.niveau === "vert" ? "🟢" : inscription.niveau === "orange" ? "🟠" : "🔴";

  return (
    <>
      <Card className="border shadow-sm mb-4 overflow-hidden" data-testid="mon-dossier-formation">
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
            {l.ok && l.okAction && (
              <Button variant="outline" size="sm" onClick={l.okAction}>{l.okActionLabel ?? "Voir"}</Button>
            )}
          </div>
        ))}
        <div className="p-3 rounded-xl bg-muted/30 space-y-2" data-testid="ligne-inscription-examen">
          <p className="font-medium text-sm text-foreground">Inscription à l'examen</p>
          <p className="text-sm">{pastille} {inscription.libelle}</p>
          {inscription.niveau !== "vert" && (
            <div className="text-xs text-muted-foreground space-y-0.5" data-testid="infos-date-examen">
              {examen ? (
                <>
                  <p><span className="font-medium text-foreground">Examen :</span> {examen.date}</p>
                  <p><span className="font-medium text-foreground">Date limite d'inscription :</span> {examen.dateLimiteLibelle ?? "non communiquée"}</p>
                </>
              ) : (
                <p>Date d'examen : à confirmer avec le centre.</p>
              )}
            </div>
          )}
          {alerteUrgente && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2" data-testid="alerte-date-limite">
              <p className="text-sm font-semibold text-destructive">⚠️ Date limite d'inscription proche</p>
              <p className="text-xs text-foreground">Votre inscription à l'examen n'est pas encore indiquée comme validée et la date limite approche.</p>
              {demandeActive ? (
                <p className="text-xs text-muted-foreground">✅ Demande transmise au centre. Nous traitons votre dossier.</p>
              ) : (
                <Button size="sm" variant="destructive" disabled={envoiEnCours} onClick={demanderTraitementUrgent}>
                  {envoiEnCours && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Demander au centre de traiter mon inscription rapidement
                </Button>
              )}
            </div>
          )}
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

      {/* Rappel important – engagements de formation (informatif uniquement) */}
      <div
        className="mt-4 rounded-xl border bg-muted/30 p-4"
        data-testid="rappel-engagements-formation"
      >
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          ⚠️ Rappel important – Respect de vos engagements de formation
        </p>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          En cas d'abandon de la formation, d'absence injustifiée ou de manquement à vos
          engagements, des conséquences peuvent s'appliquer selon votre situation :
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          <li>
            <span className="font-medium text-foreground">CPF :</span> un manquement aux
            engagements souscrits peut entraîner des mesures de la Caisse des dépôts,
            notamment une suspension temporaire de la prise en charge de formations
            (article R.6333-7 du Code du travail).
          </li>
          <li>
            <span className="font-medium text-foreground">
              Absence à l'examen ou aux évaluations sans motif légitime :
            </span>{" "}
            les droits CPF peuvent ne pas pouvoir être mobilisés pour régler la formation
            et les sommes déjà utilisées peuvent, le cas échéant, faire l'objet d'une
            demande de remboursement (article 59 de la loi n° 2026-534 du 25 juin 2026).
          </li>
          <li>
            <span className="font-medium text-foreground">
              Apprenants suivis par France Travail :
            </span>{" "}
            une absence ou un abandon sans motif légitime peut entraîner des sanctions sur
            l'inscription et/ou l'indemnisation, selon la situation et la nature du
            manquement.
          </li>
        </ul>
      </div>
    </>
  );
}
