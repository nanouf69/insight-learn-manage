import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Send, FileCheck2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type FactureElectronique = {
  id: string;
  sens: string;
  numero: string | null;
  partenaire_nom: string | null;
  montant_ttc: number | null;
  date_emission: string | null;
  statut: string;
  derniere_erreur: string | null;
  environnement: string;
  pdp_document_id: string | null;
  created_at: string;
};

const STATUT_STYLES: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  deposee: "bg-blue-100 text-blue-700",
  recue: "bg-blue-100 text-blue-700",
  acceptee: "bg-emerald-100 text-emerald-700",
  payee: "bg-emerald-100 text-emerald-700",
  rejetee: "bg-destructive/10 text-destructive",
  erreur: "bg-destructive/10 text-destructive",
};

const formatMontant = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

export function FacturationElectroniqueTab() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [detail, setDetail] = useState<FactureElectronique | null>(null);

  const { data: config } = useQuery({
    queryKey: ["pdp-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("facturation-electronique", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data as { configured: boolean; environnement: string };
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["factures-electroniques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures_electroniques")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FactureElectronique[];
    },
  });

  const { data: evenements } = useQuery({
    queryKey: ["facture-electronique-evenements", detail?.id],
    enabled: !!detail?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facture_electronique_evenements")
        .select("*")
        .eq("facture_electronique_id", detail!.id)
        .order("date_evenement", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: facturesAEmettre } = useQuery({
    queryKey: ["factures-a-emettre", rows?.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("id, numero, client_nom, montant_ttc, date_emission")
        .order("date_emission", { ascending: false })
        .limit(100);
      if (error) throw error;
      const dejaEmises = new Set((rows || []).map((r) => r.numero));
      return (data || []).filter((f: any) => !dejaEmises.has(f.numero));
    },
  });

  const synchroniser = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("facturation-electronique", {
        body: { action: "synchroniser" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        `Synchronisation terminée — ${data.statuts_mis_a_jour} statut(s) mis à jour, ${data.factures_recues} facture(s) reçue(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["factures-electroniques"] });
    } catch (e: any) {
      toast.error(e?.message || "Synchronisation impossible");
    } finally {
      setSyncing(false);
    }
  };

  const emettre = async (factureId: string) => {
    setSending(factureId);
    try {
      const { data, error } = await supabase.functions.invoke("facturation-electronique", {
        body: { action: "emettre", facture_id: factureId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.details || data.error);
      toast.success("Facture déposée sur la plateforme");
      queryClient.invalidateQueries({ queryKey: ["factures-electroniques"] });
    } catch (e: any) {
      toast.error(e?.message || "Dépôt impossible");
    } finally {
      setSending(null);
    }
  };

  const emises = (rows || []).filter((r) => r.sens === "emise");
  const recues = (rows || []).filter((r) => r.sens === "recue");

  const renderTable = (list: FactureElectronique[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numéro</TableHead>
          <TableHead>Partenaire</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Montant TTC</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
              Aucune facture électronique
            </TableCell>
          </TableRow>
        ) : (
          list.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.numero || "—"}</TableCell>
              <TableCell>{r.partenaire_nom || "—"}</TableCell>
              <TableCell>
                {r.date_emission ? format(new Date(r.date_emission), "dd/MM/yyyy", { locale: fr }) : "—"}
              </TableCell>
              <TableCell className="text-right">{formatMontant(r.montant_ttc)}</TableCell>
              <TableCell>
                <Badge className={STATUT_STYLES[r.statut] || "bg-muted text-muted-foreground"}>
                  {r.statut}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => setDetail(r)}>
                  Détails
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      {config && !config.configured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Plateforme non configurée</AlertTitle>
          <AlertDescription>
            Les identifiants de la plateforme de dématérialisation (client_id / client_secret / URL)
            doivent être enregistrés avant de pouvoir émettre ou recevoir des factures électroniques.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Facturation électronique (Factur-X)</h3>
          {config?.environnement && (
            <Badge variant="outline" className="uppercase">{config.environnement}</Badge>
          )}
        </div>
        <Button onClick={synchroniser} disabled={syncing || !config?.configured} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Synchroniser
        </Button>
      </div>

      <Tabs defaultValue="emises">
        <TabsList>
          <TabsTrigger value="emises" className="gap-2">
            <Send className="h-4 w-4" /> Émises ({emises.length})
          </TabsTrigger>
          <TabsTrigger value="recues" className="gap-2">
            <Inbox className="h-4 w-4" /> Reçues ({recues.length})
          </TabsTrigger>
          <TabsTrigger value="a-emettre" className="gap-2">
            À émettre ({facturesAEmettre?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emises">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
              ) : (
                renderTable(emises)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recues">
          <Card>
            <CardContent className="p-0">{renderTable(recues)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="a-emettre">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Factures de ventes non encore transmises</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Montant TTC</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(facturesAEmettre || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Toutes les factures ont été transmises
                      </TableCell>
                    </TableRow>
                  ) : (
                    (facturesAEmettre || []).map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.numero}</TableCell>
                        <TableCell>{f.client_nom}</TableCell>
                        <TableCell className="text-right">{formatMontant(f.montant_ttc)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="gap-2"
                            disabled={sending === f.id || !config?.configured}
                            onClick={() => emettre(f.id)}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sending === f.id ? "Envoi…" : "Émettre"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Facture {detail?.numero || detail?.pdp_document_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Partenaire :</span> {detail?.partenaire_nom || "—"}</p>
            <p><span className="text-muted-foreground">Identifiant plateforme :</span> {detail?.pdp_document_id || "—"}</p>
            <p><span className="text-muted-foreground">Statut :</span> {detail?.statut}</p>
            {detail?.derniere_erreur && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="break-all">{detail.derniere_erreur}</AlertDescription>
              </Alert>
            )}
            <div>
              <p className="font-medium mb-2">Cycle de vie</p>
              {(evenements || []).length === 0 ? (
                <p className="text-muted-foreground">Aucun événement enregistré.</p>
              ) : (
                <ul className="space-y-1">
                  {(evenements || []).map((e: any) => (
                    <li key={e.id} className="flex justify-between gap-3 border-b py-1">
                      <span>{e.statut}{e.libelle ? ` — ${e.libelle}` : ""}</span>
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(e.date_evenement), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
