import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { chargerEtatCompletionServeur } from "@/lib/etatCompletionServeur";
import { chargerApprenantTauxRealisation } from "@/hooks/useApprenantTauxRealisation";
import { isElearningType } from "@/lib/dossierFormation";
import { eligibiliteAttestation, libelleMotif } from "@/lib/attestationFinValidee/eligibilite";
import { texteAttestation, champsManquants, empreinteAttestation, referenceAttestation } from "@/lib/attestationFinValidee/modele";

/** Circuit serveur (table + signatures) non installé : aperçu en lecture seule, aucune écriture. */
export const ATTESTATION_FIN_VALIDEE_CIRCUIT_INSTALLE = false;

export function AttestationFinValideePanel({ apprenant }: { apprenant: any }) {
  const [representant, setRepresentant] = useState("");
  const q = useQuery({
    queryKey: ["attestation-fin-validee", apprenant.id],
    queryFn: async () => {
      const [etats, taux] = await Promise.all([chargerEtatCompletionServeur(apprenant.id), chargerApprenantTauxRealisation(apprenant.id, apprenant)]);
      return { etats, taux };
    },
    staleTime: 0,
  });
  const ids: number[] = Array.isArray(apprenant.modules_autorises) ? apprenant.modules_autorises.map(Number) : [];
  const elearning = isElearningType(apprenant.type_apprenant ?? "") || isElearningType(apprenant.formation_choisie ?? "");
  const t = q.data?.taux;
  const elig = eligibiliteAttestation({
    lectureErreur: q.isError ? "suivi pédagogique illisible" : q.isLoading ? "chargement en cours" : null,
    modulesAttribues: ids,
    modules: q.data ? ids.map(id => { const e = q.data!.etats.get(id); return { id, nom: "", statutEffectif: e?.status_effectif ?? null, preuveComplete: e?.preuve_complete ?? null }; }) : null,
    elearning: elearning ? { faites: t ? t.doneElearning : null, minimum: t ? t.reqElearning : null } : null,
    presentiel: !elearning ? { signees: t?.signatures?.signees ?? null, attendues: t?.signatures?.attendues ?? null } : null,
  });
  const champs = {
    representant, nom: apprenant.nom ?? null, prenom: apprenant.prenom ?? null,
    formation: apprenant.formation_choisie ?? apprenant.type_apprenant ?? null, modalite: elearning ? "e-learning" : "présentiel",
    dateDebut: apprenant.date_debut_formation ?? null, dateFin: apprenant.date_fin_formation ?? null,
    dureeHeures: typeof apprenant.heures_totales === "number" ? apprenant.heures_totales : null,
    dateEmission: new Date().toISOString().slice(0, 10),
  };
  const manquants = champsManquants(champs);
  const lignes = elig.eligible ? texteAttestation(champs) : null;
  const emp = useQuery({ queryKey: ["aff-emp", apprenant.id, lignes?.join("|")], enabled: !!lignes, queryFn: () => empreinteAttestation(lignes!, apprenant.id) });

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Attestation de fin de formation validée
          <Badge variant="outline">Aperçu — non publié</Badge>
          <Badge variant={elig.eligible ? "default" : "destructive"}>{elig.eligible ? (manquants.length ? "À vérifier" : "Brouillon") : "Bloquée"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!elig.eligible && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="font-semibold text-destructive flex items-center gap-2"><Lock className="h-4 w-4" /> Attestation bloquée : formation non terminée et validée</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">{elig.motifs.map((m, i) => <li key={i}>{libelleMotif(m)}</li>)}</ul>
            {q.isError && <Button size="sm" variant="outline" className="mt-2 min-h-11" onClick={() => q.refetch()}><RefreshCw className="h-4 w-4 mr-1" />Réessayer</Button>}
          </div>
        )}
        {elig.eligible && (
          <>
            <label className="block space-y-1"><span className="font-medium">Représentant du centre (signataire)</span>
              <Input value={representant} onChange={e => setRepresentant(e.target.value)} placeholder="Nom et prénom du responsable" /></label>
            {manquants.length > 0 && <p className="text-destructive">Champs à compléter : {manquants.join(", ")}</p>}
            {lignes && <div className="rounded-md border bg-muted/30 p-4 space-y-2">
              {lignes.map((l, i) => <p key={i} className={i === 0 ? "text-center font-bold" : ""}>{l}</p>)}
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                <div className="rounded border border-dashed p-3">Signature du responsable du centre<br /><span className="text-muted-foreground">Apposée seulement si autorisée et consentie</span></div>
                <div className="rounded border border-dashed p-3">Signature de l'apprenant<br /><span className="text-muted-foreground">À recueillir par l'apprenant lui-même</span></div>
              </div>
              {emp.data && <p className="text-xs text-muted-foreground">Référence : {referenceAttestation(emp.data, champs.dateEmission)} — empreinte {emp.data.slice(0, 16)}…</p>}
            </div>}
          </>
        )}
        <Button className="min-h-11 w-full sm:w-auto" disabled title="Circuit de signature non installé">
          Envoyer pour signature (non installé)
        </Button>
        {!ATTESTATION_FIN_VALIDEE_CIRCUIT_INSTALLE && <p className="text-xs text-muted-foreground">Aucune signature ni écriture possible tant que le circuit serveur n'est pas validé et installé.</p>}
      </CardContent>
    </Card>
  );
}
