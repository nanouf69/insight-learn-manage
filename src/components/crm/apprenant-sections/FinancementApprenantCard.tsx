import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  apprenant: any;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const financeurLabels: Record<string, string> = {
  "cpf-cdc": "CPF (Caisse des Dépôts)",
  "cpf-a": "CPF A",
  cpf: "CPF (Mon Compte Formation)",
  "france-travail": "France Travail",
  france_travail: "France Travail",
  pole_emploi: "France Travail (Pôle Emploi)",
  "metropole-lyon": "Métropole de Lyon",
  mairie: "Mairie",
  "opco-mobilites": "OPCO Mobilités",
  "opco-ep": "OPCO EP",
  fafcea: "FAFCEA",
  opco: "OPCO",
  organisme: "Organisme financeur",
  societe: "Société / Entreprise",
  personnel: "Financement personnel",
  region: "Région",
  autre: "Autre",
};

const modeLabels: Record<string, string> = {
  cpf: "CPF (Mon Compte Formation)",
  "cpf-a": "CPF A",
  personnel: "Personnel (auto-financement)",
  opco: "OPCO",
  france_travail: "France Travail",
  organisme: "Organisme",
  autre: "Autre",
};

const prettify = (code: string) =>
  financeurLabels[code.toLowerCase()] || (code.length > 3 ? code : code.toUpperCase());

export function FinancementApprenantCard({ apprenant }: Props) {
  const [paiements, setPaiements] = useState<any[]>([]);
  const [virements, setVirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const modeCode = String(apprenant?.mode_financement || "").toLowerCase().trim();
  const organismeCode = String(apprenant?.organisme_financeur || "").toLowerCase().trim();
  // "Personnel" only when nothing indicates a third-party funder
  const isPersonnel =
    modeCode === "personnel" && (organismeCode === "" || organismeCode === "personnel");
  const incoherent =
    organismeCode !== "" &&
    organismeCode !== "personnel" &&
    modeCode === "personnel";


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: pData } = await supabase
        .from("apprenant_paiements")
        .select("id, montant, moyen_paiement, date_paiement, notes")
        .eq("apprenant_id", apprenant.id)
        .order("date_paiement", { ascending: false });

      let matched: any[] = [];
      if (isPersonnel) {
        const { data: txData } = await supabase
          .from("transactions_bancaires")
          .select("id, montant, date_operation, libelle")
          .gt("montant", 0)
          .order("date_operation", { ascending: false })
          .limit(3000);
        const nom = norm(apprenant?.nom);
        const prenom = norm(apprenant?.prenom);
        matched = (txData ?? []).filter((t) => {
          const lib = norm(t.libelle);
          if (!lib || !nom || nom.length < 2) return false;
          return lib.includes(nom) && (prenom.length < 2 || lib.includes(prenom));
        });
      }

      if (cancelled) return;
      setPaiements(pData ?? []);
      setVirements(matched);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apprenant?.id, apprenant?.nom, apprenant?.prenom, isPersonnel]);

  const totalPaiements = paiements.reduce((s, p) => s + Number(p.montant || 0), 0);
  const totalVirements = virements.reduce((s, v) => s + Number(v.montant || 0), 0);
  const montantPayeChamp = Number(apprenant?.montant_paye || 0);
  const totalPaye = Math.max(montantPayeChamp, totalPaiements, isPersonnel ? totalVirements : 0);
  const montantTotal = Number(apprenant?.montant_ttc || 0);
  const reste = Math.max(0, montantTotal - totalPaye);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Financement & paiements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Organisme financeur</p>
            <p className="font-medium">
              {organismeCode
                ? prettify(organismeCode)
                : modeCode
                  ? modeLabels[modeCode] || prettify(modeCode)
                  : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mode de financement</p>
            <p className="font-medium">
              {modeCode ? modeLabels[modeCode] || prettify(modeCode) : "-"}
            </p>
          </div>
        </div>

        {incoherent && (
          <p className="text-xs rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-2">
            ⚠️ Incohérence : l'organisme financeur est « {prettify(organismeCode)} » alors que le mode de
            financement est « {modeLabels[modeCode] || modeCode} ». À corriger dans la fiche apprenant.
          </p>
        )}


        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="font-semibold">{fmt(montantTotal)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Déjà payé</p>
            <p className="font-semibold text-green-600">{fmt(totalPaye)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Reste à payer</p>
            <p className={`font-semibold ${reste > 0 ? "text-destructive" : "text-green-600"}`}>{fmt(reste)}</p>
          </div>
        </div>

        {paiements.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">Paiements enregistrés ({paiements.length})</p>
            <div className="space-y-1">
              {paiements.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {p.date_paiement ? format(parseISO(p.date_paiement), "dd MMM yyyy", { locale: fr }) : "-"}
                    {p.moyen_paiement ? ` · ${p.moyen_paiement}` : ""}
                  </span>
                  <span className="font-medium">{fmt(Number(p.montant || 0))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isPersonnel && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-muted-foreground">Virements reçus détectés</p>
              <Badge variant="secondary">
                {virements.length} · {fmt(totalVirements)}
              </Badge>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : virements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun virement identifié au nom de l'apprenant.</p>
            ) : (
              <div className="space-y-1">
                {virements.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground truncate">
                      {v.date_operation ? format(parseISO(v.date_operation), "dd MMM yyyy", { locale: fr }) : "-"} ·{" "}
                      {v.libelle}
                    </span>
                    <span className="font-medium whitespace-nowrap">{fmt(Number(v.montant || 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
