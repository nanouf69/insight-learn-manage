import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  apprenant: { id: string; nom: string; prenom: string; [key: string]: unknown };
  /** Statut de suivi (session_apprenants.statut_suivi ou apprenants.statut_suivi). */
  statutSuivi?: string | null;
}

/** Statuts qui prouvent que le dossier est en règle : vert même sans dépôt CRM du dossier. */
const STATUTS_VERTS = new Set(["paye", "document_complet"]);

/**
 * Bouton « Dossier de bienvenue » de la liste des examens.
 * Au chargement : une seule lecture (SELECT, limite 1) pour savoir si le
 * dossier est rempli. Vert si le dossier est déposé OU si le statut de
 * l'apprenant est « Payé » ou « Dossier complet » ; rouge seulement quand
 * le dossier n'est pas déposé ET que le statut ne prouve rien.
 * Une lecture impossible laisse le bouton neutre : aucune couleur affirmée.
 * Aucune écriture, aucun PDF généré automatiquement ; le PDF n'est produit
 * qu'au clic volontaire.
 */
export function DossierBienvenueButton({ apprenant, statutSuivi }: Props) {
  const { user, loading } = useAuth();
  const owner = useRef(user?.id);
  owner.current = loading ? undefined : user?.id;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  // « inconnu » = lecture pas encore faite ou échouée : aucune couleur affirmée.
  const [etat, setEtat] = useState<"inconnu" | "rempli" | "absent">("inconnu");

  const statutVert = !!statutSuivi && STATUTS_VERTS.has(statutSuivi.toLowerCase().trim());

  // Présence du dossier (lecture seule, silencieuse en cas d'erreur).
  useEffect(() => {
    const userId = owner.current;
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("apprenant_documents_completes")
          .select("completed_at")
          .eq("apprenant_id", apprenant.id)
          .eq("type_document", "dossier-bienvenue")
          .order("completed_at", { ascending: false })
          .limit(1);
        if (!alive || owner.current !== userId) return;
        // Une erreur de lecture laisse l'état « inconnu » : jamais de rouge affirmé.
        if (error) return;
        setEtat(data && data.length > 0 ? "rempli" : "absent");
      } catch {
        /* lecture impossible : ni vert, ni rouge */
      }
    })();
    return () => { alive = false; };
  }, [apprenant.id, user?.id, loading]);

  const download = async () => {
    const userId = owner.current;
    if (!userId || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("apprenant_documents_completes")
        .select("type_document, titre, donnees, completed_at")
        .eq("apprenant_id", apprenant.id)
        .eq("type_document", "dossier-bienvenue")
        .order("completed_at", { ascending: false })
        .limit(1);
      if (owner.current !== userId) return;
      if (error) throw error;
      const document = data?.[0];
      if (!document) {
        toast.info(
          statutVert
            ? "Statut « Payé / Dossier complet » mais dossier de bienvenue non déposé dans le CRM."
            : "Dossier de bienvenue non déposé dans le CRM.",
        );
        return;
      }
      const { generateDocumentIndividuelPdf } = await import("@/lib/pdf/document-individuel");
      const { data: auth } = await supabase.auth.getSession();
      if (owner.current !== userId || auth.session?.user.id !== userId) return;
      generateDocumentIndividuelPdf(apprenant, {
        type_document: document.type_document,
        titre: document.titre || "Dossier de bienvenue - Inscription CMA",
        donnees: document.donnees,
        completed_at: document.completed_at,
      });
    } catch {
      if (owner.current === userId) toast.error("Impossible de charger le dossier de bienvenue. Réessayez.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const vert = statutVert || etat === "rempli";
  const rouge = !vert && etat === "absent";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading || !user || busy}
      className={`mt-1 h-auto min-h-6 w-full gap-1 whitespace-normal px-1 py-1 text-[10px] leading-tight ${
        vert
          ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-50"
          : rouge
            ? "border-red-500 text-red-700 bg-red-50 hover:bg-red-50"
            : ""
      }`}
      title={
        vert
          ? statutVert && etat !== "rempli"
            ? "Statut Payé / Dossier complet — cliquer pour télécharger le dossier de bienvenue s'il est déposé"
            : "Dossier de bienvenue rempli — cliquer pour le télécharger"
          : rouge
            ? "Dossier de bienvenue non rempli"
            : "Aucun dossier de bienvenue enregistré dans le CRM"
      }
      onClick={download}
    >
      {busy ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <FileText className="h-3 w-3 shrink-0" />}
      Dossier de bienvenue
    </Button>
  );
}
