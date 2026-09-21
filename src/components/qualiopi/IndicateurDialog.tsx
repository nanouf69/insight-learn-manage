import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Download, Eye, Link2, Loader2, Plus, RotateCcw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STATUT_LABELS, type QualiopiIndicateur, type QualiopiStatut } from "@/lib/qualiopi/referentiel";
import {
  archivePreuve, createPreuve, linkPreuve, openPreuveFichier, saveEtat, unlinkPreuve,
  type QualiopiEtat, type QualiopiPreuve,
} from "@/lib/qualiopi/data";
import { sourcesForIndicateur, type CrmSourceItem } from "@/lib/qualiopi/crm-sources";
import { PreuveFormDialog } from "./PreuveFormDialog";

interface Props {
  indicateur: QualiopiIndicateur | null;
  etat: QualiopiEtat | null;
  preuves: QualiopiPreuve[];
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}

export function IndicateurDialog({ indicateur, etat, preuves, onOpenChange, onChanged }: Props) {
  const [local, setLocal] = useState<QualiopiEtat | null>(etat);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, CrmSourceItem[]>>({});
  const [loadingSug, setLoadingSug] = useState(false);

  useEffect(() => { setLocal(etat); }, [etat, indicateur?.numero]);

  const loadSuggestions = async () => {
    if (!indicateur) return;
    setLoadingSug(true);
    const sources = sourcesForIndicateur(indicateur.numero);
    const out: Record<string, CrmSourceItem[]> = {};
    for (const s of sources) out[s.key] = await s.load();
    setSuggestions(out);
    setLoadingSug(false);
  };

  useEffect(() => { setSuggestions({}); }, [indicateur?.numero]);

  if (!indicateur || !local) return null;

  const actives = preuves.filter((p) => !p.archivee);
  const archivees = preuves.filter((p) => p.archivee);

  const handleSaveEtat = async () => {
    setSaving(true);
    try {
      await saveEtat(local);
      toast.success("Indicateur mis à jour");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handleAttach = async (sourceKey: string, table: string, item: CrmSourceItem, sourceLabel: string) => {
    try {
      const id = await createPreuve({
        titre: `${sourceLabel} — ${item.label}`,
        description: `Élément déjà présent dans le CRM (${table}). Référencé comme preuve, donnée d'origine inchangée.`,
        date_preuve: item.date ? String(item.date).slice(0, 10) : null,
        lien_url: item.url ?? null,
        source_type: "crm",
        source_table: table,
        source_id: item.id,
      });
      await linkPreuve(id, indicateur.numero);
      toast.success("Preuve rattachée depuis le CRM");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Rattachement impossible");
    }
  };

  return (
    <>
      <Dialog open={!!indicateur} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">
              <Badge variant="outline" className="mr-2">Indicateur {indicateur.numero}</Badge>
              <span className="font-semibold">{indicateur.intitule}</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="a">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="a">A — Exigence</TabsTrigger>
              <TabsTrigger value="b">B — Exemples</TabsTrigger>
              <TabsTrigger value="c">C — Nos preuves ({actives.length})</TabsTrigger>
              <TabsTrigger value="d">Depuis le CRM</TabsTrigger>
            </TabsList>

            <TabsContent value="a" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ce que demande Qualiopi</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-line">
                  {indicateur.niveauAttendu}
                  {indicateur.obligations && (
                    <p className="mt-3 text-foreground font-medium">Obligation spécifique : {indicateur.obligations}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="b" className="space-y-3 pt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Exemples de preuves du guide</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {indicateur.exemplesPreuves.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Ces exemples ne sont ni exhaustifs ni obligatoires : toute autre preuve pertinente est recevable.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="c" className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Preuves réellement disponibles dans notre organisme</p>
                <Button size="sm" className="gap-2" onClick={() => { setReplaceId(null); setAddOpen(true); }}>
                  <Plus className="w-4 h-4" /> Ajouter une preuve
                </Button>
              </div>

              {actives.length === 0 && <p className="text-sm text-muted-foreground border rounded-lg p-4">Aucune preuve rattachée.</p>}

              {actives.map((p) => (
                <div key={p.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.titre}</p>
                      {p.ce_que_demontre && <p className="text-xs mt-0.5"><span className="font-medium">Ce que démontre la preuve : </span>{p.ce_que_demontre}</p>}
                      {p.description && p.description !== p.ce_que_demontre && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      {p.emplacement && <p className="text-xs text-muted-foreground mt-0.5">Emplacement : {p.emplacement}</p>}
                      {p.source_libelle && <p className="text-xs text-muted-foreground">Source : {p.source_libelle}</p>}
                      {p.remarque_interne && <p className="text-xs text-muted-foreground italic">Remarque interne : {p.remarque_interne}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.date_preuve ? `Date : ${p.date_preuve}` : "Sans date"}
                        {p.valide_au ? ` — valide jusqu'au ${p.valide_au}` : ""}
                        {p.indicateurs.length > 1 ? ` — rattachée à ${p.indicateurs.length} indicateurs` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {p.lien_url && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(p.lien_url!, "_blank")}><Link2 className="w-4 h-4" /></Button>
                      )}
                      <Button size="sm" variant="ghost" title="Remplacer" onClick={() => { setReplaceId(p.id); setAddOpen(true); }}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Archiver" onClick={async () => { await archivePreuve(p.id, true); toast.success("Preuve archivée (conservée)"); onChanged(); }}>
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Détacher de cet indicateur" onClick={async () => { await unlinkPreuve(p.id, indicateur.numero); onChanged(); }}>
                        <Link2 className="w-4 h-4 rotate-45" />
                      </Button>
                    </div>
                  </div>
                  {p.fichiers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {p.fichiers.map((f, i) => (
                        <Button key={i} size="sm" variant="outline" className="gap-2 h-7 text-xs"
                          onClick={() => openPreuveFichier(f).catch(() => toast.error("Ouverture impossible"))}>
                          <Eye className="w-3 h-3" /> {f.nom}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {archivees.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Historique — preuves archivées ({archivees.length})</p>
                  {archivees.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border rounded-lg p-2 mb-1 opacity-70">
                      <span className="text-xs truncate">{p.titre}{p.archivee_le ? ` — archivée le ${p.archivee_le.slice(0, 10)}` : ""}</span>
                      <div className="flex gap-1">
                        {p.fichiers.map((f, i) => (
                          <Button key={i} size="sm" variant="ghost" onClick={() => openPreuveFichier(f).catch(() => toast.error("Ouverture impossible"))}>
                            <Download className="w-3 h-3" />
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={async () => { await archivePreuve(p.id, false); onChanged(); }}>Restaurer</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="d" className="space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Éléments déjà présents dans le CRM pouvant servir de preuve (lecture seule).</p>
                <Button size="sm" variant="outline" className="gap-2" onClick={loadSuggestions} disabled={loadingSug}>
                  {loadingSug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Rechercher
                </Button>
              </div>
              {sourcesForIndicateur(indicateur.numero).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune source CRM automatique pour cet indicateur : ajoutez une preuve manuellement.</p>
              )}
              {sourcesForIndicateur(indicateur.numero).map((s) => (
                <Card key={s.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {(suggestions[s.key] || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">{loadingSug ? "Recherche…" : "Cliquez sur « Rechercher » pour afficher les éléments."}</p>
                    ) : (
                      (suggestions[s.key] || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
                          <span className="text-xs truncate">{item.label}</span>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleAttach(s.key, s.table, item, s.label)}>
                            Rattacher
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Commentaire / justification pour l'auditeur</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                value={local.commentaire_auditeur ?? ""}
                onChange={(e) => setLocal({ ...local, commentaire_auditeur: e.target.value })}
                placeholder="Expliquez comment les preuves présentées démontrent le respect de l'indicateur."
              />
              <div className="space-y-1.5">
                <Label>Script de présentation à l'auditeur</Label>
                <Textarea
                  rows={5}
                  value={local.script_auditeur ?? ""}
                  onChange={(e) => setLocal({ ...local, script_auditeur: e.target.value })}
                  placeholder="Phrase de présentation à dire à l'auditeur pour cet indicateur."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Points de vigilance</Label>
                <Textarea
                  rows={3}
                  value={local.points_vigilance ?? ""}
                  onChange={(e) => setLocal({ ...local, points_vigilance: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Remarques</Label>
                <Textarea
                  rows={3}
                  value={local.remarques ?? ""}
                  onChange={(e) => setLocal({ ...local, remarques: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Statut (décision humaine)</Label>
                <Select value={local.applicable ? local.statut : "non_applicable"}
                  onValueChange={(v) => setLocal({ ...local, statut: v as QualiopiStatut, applicable: v !== "non_applicable" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUT_LABELS) as QualiopiStatut[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  La présence de preuves ne vaut jamais conformité : le statut reste choisi manuellement.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Input value={local.responsable ?? ""} onChange={(e) => setLocal({ ...local, responsable: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de dernière vérification</Label>
                <Input type="date" value={local.date_verification ?? ""} onChange={(e) => setLocal({ ...local, date_verification: e.target.value || null })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={local.maj_annuelle} onChange={(e) => setLocal({ ...local, maj_annuelle: e.target.checked })} />
                Cet indicateur nécessite une mise à jour annuelle
              </label>
              <Button onClick={handleSaveEtat} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <PreuveFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        indicateur={indicateur.numero}
        remplacePreuveId={replaceId}
        onSaved={async () => {
          if (replaceId) { await archivePreuve(replaceId, true); setReplaceId(null); }
          onChanged();
        }}
      />
    </>
  );
}
