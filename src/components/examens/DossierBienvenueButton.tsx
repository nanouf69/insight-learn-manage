import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  apprenant: { id: string; nom: string; prenom: string; [key: string]: unknown };
}

/**
 * Bouton « Dossier de bienvenue » de la liste des examens.
 * Au chargement : une seule lecture (SELECT, limite 1) pour savoir si le
 * dossier est rempli → bouton vert. Aucune écriture, aucun PDF généré
 * automatiquement ; le PDF n'est produit qu'au clic volontaire.
 */
export function DossierBienvenueButton({ apprenant }: Props) {
  const { user, loading } = useAuth();
  const owner = useRef(user?.id);
  owner.current = loading ? undefined : user?.id;
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [present, setPresent] = useState(false);

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
        if (!alive || owner.current !== userId || error) return;
        setPresent(!!data && data.length > 0);
      } catch {
        /* sans dossier prouvé, pas d'indication verte */
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
        toast.info("Dossier de bienvenue non déposé dans le CRM.");
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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading || !user || busy}
      className={`mt-1 h-auto min-h-6 w-full gap-1 whitespace-normal px-1 py-1 text-[10px] leading-tight ${
        present ? "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-50" : ""
      }`}
      title={present ? "Dossier de bienvenue rempli — cliquer pour le télécharger" : "Aucun dossier de bienvenue enregistré dans le CRM"}
      onClick={download}
    >
      {busy ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <FileText className="h-3 w-3 shrink-0" />}
      Dossier de bienvenue
    </Button>
  );
}
