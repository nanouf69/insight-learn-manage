import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { doitDemanderChangementMdp, verifierNouveauMdp, type EtatChangementMdp } from "@/lib/changementMotDePasse";

/**
 * Demande de changement de mot de passe (étape 2 — préparée, inactive tant
 * qu'aucune demande n'est enregistrée). Affichée uniquement sur le tableau de
 * bord, jamais pendant un examen blanc. Le mot de passe va directement au
 * service de connexion : il n'est ni stocké, ni journalisé.
 */
export function ChangementMotDePasseObligatoire({ surTableauDeBord, apercu }: { surTableauDeBord: boolean; apercu: boolean }) {
  const [etat, setEtat] = useState<EtatChangementMdp>(null);
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    if (apercu || !surTableauDeBord) return;
    let actif = true;
    (supabase.rpc as any)("mon_changement_mdp_requis").then(({ data, error }: any) => {
      if (!actif || error || !data) return; // en cas d'erreur : aucun blocage
      setEtat({ requis: !!data.requis, examen_en_cours: !!data.examen_en_cours });
    });
    return () => { actif = false; };
  }, [surTableauDeBord, apercu]);

  const ouvert = !termine && doitDemanderChangementMdp(etat, { surTableauDeBord, apercu });

  const valider = async () => {
    const v = verifierNouveauMdp(mdp, confirmation);
    if (v.ok === false) { setErreur(v.raison); return; }
    setEnvoi(true); setErreur(null);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    if (error) {
      setEnvoi(false);
      setErreur("Le changement n'a pas pu être enregistré. Réessayez.");
      return;
    }
    await (supabase.rpc as any)("confirmer_changement_mdp_effectue");
    setMdp(""); setConfirmation(""); setEnvoi(false); setTermine(true);
  };

  if (!ouvert) return null;
  return (
    <Dialog open>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Choisissez un nouveau mot de passe</DialogTitle>
          <DialogDescription>
            Pour sécuriser votre compte, merci de définir un nouveau mot de passe. Vos cours, votre progression et vos résultats ne changent pas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="nv-mdp">Nouveau mot de passe</Label>
            <Input id="nv-mdp" type="password" autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="nv-mdp2">Confirmer le mot de passe</Label>
            <Input id="nv-mdp2" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button onClick={valider} disabled={envoi} className="w-full">
            {envoi ? "Enregistrement…" : "Enregistrer mon nouveau mot de passe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
