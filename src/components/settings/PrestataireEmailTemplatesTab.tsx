import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { loadTemplates, saveTemplate } from "@/lib/prestataires/data";
import { DEFAULT_ENTREPRISE, VARIABLES, type EntrepriseInfos, type TemplateDef } from "@/lib/prestataires/templates";

const ONGLETS: { id: string; label: string }[] = [
  { id: "demande", label: "Premier mail" },
  { id: "relance1", label: "Relance 1" },
  { id: "relance2", label: "Relance 2" },
  { id: "mise_en_demeure", label: "Mise en demeure" },
];

export function PrestataireEmailTemplatesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Record<string, TemplateDef>>({});
  const [signature, setSignature] = useState("");
  const [entreprise, setEntreprise] = useState<EntrepriseInfos>(DEFAULT_ENTREPRISE);

  useEffect(() => {
    loadTemplates()
      .then((b) => {
        setTemplates(b.templates);
        setSignature(b.signature);
        setEntreprise(b.entreprise);
      })
      .catch(() => toast.error("Chargement des modèles impossible"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const o of ONGLETS) {
        const t = templates[o.id];
        if (t) await saveTemplate(o.id, t.objet, t.corps);
      }
      await saveTemplate("signature", "", signature);
      await saveTemplate("entreprise", "", JSON.stringify(entreprise));
      toast.success("Modèles enregistrés");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nos coordonnées (utilisées dans les e-mails)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ["raison_sociale", "Raison sociale"],
              ["responsable", "Nom du responsable"],
              ["siren", "SIREN"],
              ["telephone", "Téléphone"],
              ["email", "E-mail"],
              ["adresse", "Adresse"],
            ] as [keyof EntrepriseInfos, string][]
          ).map(([k, label]) => (
            <div key={k} className="space-y-2">
              <Label>{label}</Label>
              <Input value={entreprise[k]} onChange={(e) => setEntreprise({ ...entreprise, [k]: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modèles d'e-mails prestataires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="demande">
            <TabsList className="flex-wrap h-auto">
              {ONGLETS.map((o) => (
                <TabsTrigger key={o.id} value={o.id}>{o.label}</TabsTrigger>
              ))}
              <TabsTrigger value="signature">Signature</TabsTrigger>
            </TabsList>
            {ONGLETS.map((o) => (
              <TabsContent key={o.id} value={o.id} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Objet</Label>
                  <Input
                    value={templates[o.id]?.objet ?? ""}
                    onChange={(e) =>
                      setTemplates({ ...templates, [o.id]: { ...templates[o.id], objet: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texte</Label>
                  <Textarea
                    rows={16}
                    className="font-mono text-xs"
                    value={templates[o.id]?.corps ?? ""}
                    onChange={(e) =>
                      setTemplates({ ...templates, [o.id]: { ...templates[o.id], corps: e.target.value } })
                    }
                  />
                </div>
              </TabsContent>
            ))}
            <TabsContent value="signature" className="space-y-2 pt-4">
              <Label>Signature (insérée via {"{{signature}}"})</Label>
              <Textarea rows={10} className="font-mono text-xs" value={signature} onChange={(e) => setSignature(e.target.value)} />
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium mb-2">Variables disponibles</p>
            <div className="flex flex-wrap gap-1.5">
              {[...VARIABLES, "signature"].map((v) => (
                <code key={v} className="text-[11px] bg-background border rounded px-1.5 py-0.5">{`{{${v}}}`}</code>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Une ligne dont les informations sont absentes est automatiquement supprimée du message.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les modèles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
