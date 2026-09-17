import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

interface AuthStatus {
  found: boolean;
  email?: string | null;
  last_sign_in_at?: string | null;
  banned?: boolean;
}

interface Props {
  apprenant: any;
}

/**
 * Affichage seul : aucun compte, e-mail, mot de passe, module, date ou donnée
 * pédagogique n'est modifié ici. Le statut est calculé à partir des données existantes.
 */
export function CompteStatutBadge({ apprenant }: Props) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [lastConnexion, setLastConnexion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const authUserId: string | null = apprenant?.auth_user_id ?? null;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      if (!authUserId) {
        if (active) {
          setAuthStatus(null);
          setLastConnexion(null);
          setLoading(false);
        }
        return;
      }
      const [{ data: statusData }, { data: connexionData }] = await Promise.all([
        supabase.functions.invoke("apprenant-auth-status", { body: { auth_user_id: authUserId } }),
        supabase
          .from("apprenant_connexions")
          .select("started_at")
          .eq("apprenant_id", apprenant.id)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);
      if (!active) return;
      setAuthStatus((statusData as AuthStatus) ?? null);
      setLastConnexion((connexionData as any)?.[0]?.started_at ?? null);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [authUserId, apprenant?.id]);

  if (loading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Vérification du compte…
      </Badge>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateFin = apprenant?.date_fin_cours_en_ligne ? new Date(apprenant.date_fin_cours_en_ligne) : null;
  const dateDebut = apprenant?.date_debut_cours_en_ligne ? new Date(apprenant.date_debut_cours_en_ligne) : null;
  const modules: number[] = Array.isArray(apprenant?.modules_autorises) ? apprenant.modules_autorises : [];

  const ficheEmail = (apprenant?.email || "").trim().toLowerCase();
  const authEmail = (authStatus?.email || "").trim().toLowerCase();
  const emailDivergent = !!authEmail && !!ficheEmail && authEmail !== ficheEmail;
  const jamaisConnecte = !!authUserId && !authStatus?.last_sign_in_at && !lastConnexion;

  // Ordre de priorité des statuts (affichage seul)
  let statut: { label: string; className: string; icon: JSX.Element };
  if (!authUserId || authStatus?.found === false) {
    statut = {
      label: "Compte inactif",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: <XCircle className="w-3 h-3" />,
    };
  } else if (authStatus?.banned) {
    statut = {
      label: "Compte inactif (bloqué)",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: <XCircle className="w-3 h-3" />,
    };
  } else if (jamaisConnecte) {
    statut = {
      label: "Activation nécessaire / jamais connecté",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  } else if (dateFin && dateFin < today) {
    statut = {
      label: "Accès e-learning expiré",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <Clock className="w-3 h-3" />,
    };
  } else if (modules.length === 0) {
    statut = {
      label: "Aucun module autorisé",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  } else if (dateDebut && dateDebut > today) {
    statut = {
      label: "Accès pas encore commencé",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      icon: <Clock className="w-3 h-3" />,
    };
  } else {
    statut = {
      label: "Compte actif",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  }

  const derniereConnexion = authStatus?.last_sign_in_at || lastConnexion;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`gap-1 ${statut.className}`}>
          {statut.icon}
          {statut.label}
        </Badge>
        {emailDivergent && (
          <Badge variant="outline" className="gap-1 bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="w-3 h-3" />
            E-mail de connexion différent de la fiche
          </Badge>
        )}
      </div>
      {authUserId && (
        <p className="text-xs text-muted-foreground">
          Connexion : {authStatus?.email || "inconnue"} ·{" "}
          {derniereConnexion
            ? `dernière connexion réussie le ${format(new Date(derniereConnexion), "dd/MM/yyyy à HH:mm", { locale: fr })}`
            : "aucune connexion réussie à ce jour"}
        </p>
      )}
    </div>
  );
}
