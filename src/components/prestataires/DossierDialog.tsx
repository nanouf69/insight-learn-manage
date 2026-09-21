import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ExternalLink, FileText, Loader2, Mail, Save, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getPieceUrl,
  loadEnvois,
  loadHistorique,
  loadPieces,
  logHistorique,
  saveDossier,
  uploadPiece,
} from "@/lib/prestataires/data";
import { exportDossierJustificatif } from "@/lib/prestataires/export";
import { htmlToText } from "@/lib/prestataires/templates";
import {
  MODES_PAIEMENT,
  STATUT_ENVOI_LABELS,
  STATUT_LABELS,
  STATUT_ORDER,
  TYPES_PIECE,
  TYPE_ENVOI_LABELS,
  type PrestataireDossier,
  type PrestataireEnvoi,
  type PrestataireHistorique,
  type PrestatairePiece,
  type PrestataireStatut,
  type TypeEnvoi,
} from "@/lib/prestataires/types";
import { EnvoiDialog } from "./EnvoiDialog";
import { FactureRecueDialog } from "./FactureRecueDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dossier: PrestataireDossier | null;
  onSaved: (d: PrestataireDossier) => void;
}

const empty: Partial<PrestataireDossier> = { statut: "facture_manquante", est_test: false };

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function DossierDialog({ open, onOpenChange, dossier, onSaved }: Props) {
  const [form, setForm] = useState<Partial<PrestataireDossier>>(empty);
  const [saving, setSaving] = useState(false);
  const [envois, setEnvois] = useState<PrestataireEnvoi[]>([]);
  const [pieces, setPieces] = useState<PrestatairePiece[]>([]);
  const [historique, setHistorique] = useState<PrestataireHistorique[]>([]);
  const [typePiece, setTypePiece] = useState("devis");
  const [uploading, setUploading] = useState(false);
  const [envoiType, setEnvoiType] = useState<TypeEnvoi | null>(null);
  const [factureOpen, setFactureOpen] = useState(false);
  const [envoiDetail, setEnvoiDetail] = useState<PrestataireEnvoi | null>(null);

  const current = dossier;

  const refresh = useCallback(async () => {
    if (!current) {
      setEnvois([]);
      setPieces([]);
      setHistorique([]);
      return;
    }
    const [e, p, h] = await Promise.all([
      loadEnvois(current.id),
      loadPieces(current.id),
      loadHistorique(current.id),
    ]);
    setEnvois(e);
    setPieces(p);
    setHistorique(h);
  }, [current]);

  useEffect(() => {
    if (!open) return;
    setForm(dossier ? { ...dossier } : { ...empty });
    void refresh();
  }, [open, dossier, refresh]);

  const set = (k: keyof PrestataireDossier, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<PrestataireDossier> = {
        ...form,
        montant_ht: typeof form.montant_ht === "string" ? num(form.montant_ht) : form.montant_ht ?? null,
        tva: typeof form.tva === "string" ? num(form.tva) : form.tva ?? null,
        montant_ttc: typeof form.montant_ttc === "string" ? num(form.montant_ttc) : form.montant_ttc ?? null,
        montant_paye: typeof form.montant_paye === "string" ? num(form.montant_paye) : form.montant_paye ?? null,
      };
      delete (payload as Record<string, unknown>).id;
      delete (payload as Record<string, unknown>).created_at;
      delete (payload as Record<string, unknown>).updated_at;
      const saved = await saveDossier(payload, current?.id);
      toast.success(current ? "Dossier enregistré" : "Dossier créé");
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !current) return;
    setUploading(true);
    try {
      await uploadPiece(current.id, file, typePiece);
      toast.success("Justificatif ajouté");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de dépôt du fichier");
    } finally {
      setUploading(false);
    }
  };

  const openPiece = async (p: PrestatairePiece) => {
    const url = await getPieceUrl(p.chemin);
    if (url) window.open(url, "_blank");
    else toast.error("Fichier indisponible");
  };

  const cloturer = async () => {
    if (!current) return;
    await saveDossier({ statut: "cloture", derniere_action_le: new Date().toISOString() }, current.id);
    await logHistorique(current.id, "Dossier clôturé", {});
    toast.success("Dossier clôturé");
    onSaved({ ...current, statut: "cloture" });
    await refresh();
  };

  const field = (label: string, key: keyof PrestataireDossier, type = "text") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={str(form[key])} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {current ? "Fiche facture prestataire manquante" : "Nouveau dossier"}
              {current && <Badge variant="secondary">{STATUT_LABELS[current.statut]}</Badge>}
              {current?.est_test && <Badge variant="outline">Dossier test</Badge>}
            </DialogTitle>
            <DialogDescription>
              {current?.derniere_action_le
                ? `Dernière action : ${format(new Date(current.derniere_action_le), "dd/MM/yyyy 'à' HH:mm")}`
                : "Aucune action enregistrée pour le moment."}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="prestataire">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="prestataire">Prestataire</TabsTrigger>
              <TabsTrigger value="prestation">Prestation</TabsTrigger>
              <TabsTrigger value="paiement">Paiement</TabsTrigger>
              <TabsTrigger value="justificatifs" disabled={!current}>Justificatifs</TabsTrigger>
              <TabsTrigger value="historique" disabled={!current}>Demandes &amp; preuves</TabsTrigger>
            </TabsList>

            <TabsContent value="prestataire" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("Nom", "prestataire_nom")}
                {field("Prénom", "prestataire_prenom")}
                {field("Raison sociale", "raison_sociale")}
                {field("SIREN", "siren")}
                {field("SIRET", "siret")}
                {field("Téléphone", "telephone")}
                {field("Adresse e-mail", "email")}
                {field("Référence interne", "reference")}
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Textarea value={str(form.adresse)} onChange={(e) => set("adresse", e.target.value)} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="est-test"
                  checked={!!form.est_test}
                  onCheckedChange={(v) => set("est_test", v === true)}
                />
                <Label htmlFor="est-test" className="font-normal">
                  Prestataire de test (dossier d'essai, non comptable)
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="prestation" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Description de la prestation</Label>
                <Textarea
                  value={str(form.description_prestation)}
                  onChange={(e) => set("description_prestation", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("Date de la prestation", "date_prestation", "date")}
                {field("Numéro de devis / contrat / commande", "numero_commande")}
                {field("Début de période", "periode_debut", "date")}
                {field("Fin de période", "periode_fin", "date")}
                {field("Montant HT", "montant_ht")}
                {field("TVA", "tva")}
                {field("Montant TTC", "montant_ttc")}
              </div>
              <div className="space-y-2">
                <Label>Commentaire interne</Label>
                <Textarea
                  value={str(form.commentaire_interne)}
                  onChange={(e) => set("commentaire_interne", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="paiement" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {field("Date du paiement", "date_paiement", "date")}
                {field("Montant payé", "montant_paye")}
                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select value={str(form.mode_paiement) || undefined} onValueChange={(v) => set("mode_paiement", v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {MODES_PAIEMENT.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field("Référence du paiement", "reference_paiement")}
                <div className="space-y-2">
                  <Label>Statut du dossier</Label>
                  <Select
                    value={str(form.statut) || "facture_manquante"}
                    onValueChange={(v) => set("statut", v as PrestataireStatut)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUT_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Le justificatif de paiement s'ajoute dans l'onglet « Justificatifs ».
              </p>
            </TabsContent>

            <TabsContent value="justificatifs" className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-2 flex-1">
                  <Label>Type de justificatif</Label>
                  <Select value={typePiece} onValueChange={setTypePiece}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES_PIECE.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Fichier</Label>
                  <Input type="file" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0] ?? null)} />
                </div>
                {uploading && <Loader2 className="h-4 w-4 animate-spin mb-3" />}
              </div>
              <div className="space-y-2">
                {pieces.length === 0 && <p className="text-sm text-muted-foreground">Aucun justificatif enregistré.</p>}
                {pieces.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.titre || p.nom_fichier}</p>
                        <p className="text-xs text-muted-foreground">
                          {TYPES_PIECE.find((t) => t.value === p.type_piece)?.label ?? p.type_piece} —{" "}
                          {format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openPiece(p)} className="gap-1 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="historique" className="space-y-4 pt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Chronologie des demandes</h4>
                {envois.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande envoyée.</p>}
                {envois.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {TYPE_ENVOI_LABELS[e.type_envoi] ?? e.type_envoi} :{" "}
                        {format(new Date(e.envoye_le ?? e.created_at), "dd/MM/yyyy 'à' HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.destinataire_email} — {e.objet}
                      </p>
                      {e.erreur && <p className="text-xs text-destructive">Erreur : {e.erreur}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={e.statut === "envoye" ? "secondary" : e.statut === "echec" ? "destructive" : "outline"}
                      >
                        {STATUT_ENVOI_LABELS[e.statut] ?? e.statut}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setEnvoiDetail(e)}>Voir</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Historique du dossier</h4>
                {historique.map((h) => (
                  <p key={h.id} className="text-xs text-muted-foreground">
                    {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")} — {h.action}
                    {h.utilisateur_email ? ` (${h.utilisateur_email})` : ""}
                  </p>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {current && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEnvoiType("demande")}>
                <Mail className="h-3.5 w-3.5" /> Demander la facture
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEnvoiType("relance1")}>Relancer</Button>
              <Button variant="outline" size="sm" onClick={() => setEnvoiType("relance2")}>2e relance</Button>
              <Button variant="outline" size="sm" onClick={() => setEnvoiType("mise_en_demeure")}>Mise en demeure</Button>
              <Button variant="outline" size="sm" onClick={() => setFactureOpen(true)}>Facture reçue</Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => exportDossierJustificatif(current, envois, pieces, historique)}
              >
                <Download className="h-3.5 w-3.5" /> Exporter le dossier justificatif
              </Button>
              {current.statut !== "cloture" && (
                <Button variant="ghost" size="sm" onClick={cloturer}>Clôturer le dossier</Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {current && envoiType && (
        <EnvoiDialog
          open={!!envoiType}
          onOpenChange={(v) => !v && setEnvoiType(null)}
          dossier={current}
          typeEnvoi={envoiType}
          onSent={() => {
            void refresh();
            onSaved(current);
          }}
        />
      )}

      {current && (
        <FactureRecueDialog
          open={factureOpen}
          onOpenChange={setFactureOpen}
          dossier={current}
          onSaved={() => {
            void refresh();
            onSaved(current);
          }}
        />
      )}

      <Dialog open={!!envoiDetail} onOpenChange={(v) => !v && setEnvoiDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preuve d'envoi</DialogTitle>
            <DialogDescription>Contenu exact du message tel qu'il a été envoyé.</DialogDescription>
          </DialogHeader>
          {envoiDetail && (
            <div className="space-y-3 text-sm">
              <p><strong>Type :</strong> {TYPE_ENVOI_LABELS[envoiDetail.type_envoi] ?? envoiDetail.type_envoi}</p>
              <p><strong>Destinataire :</strong> {envoiDetail.destinataire_nom} — {envoiDetail.destinataire_email}</p>
              <p><strong>Objet :</strong> {envoiDetail.objet}</p>
              <p>
                <strong>Date et heure :</strong>{" "}
                {format(new Date(envoiDetail.envoye_le ?? envoiDetail.created_at), "dd/MM/yyyy 'à' HH:mm:ss")}
              </p>
              <p><strong>Statut :</strong> {STATUT_ENVOI_LABELS[envoiDetail.statut] ?? envoiDetail.statut}</p>
              {envoiDetail.erreur && <p className="text-destructive"><strong>Erreur :</strong> {envoiDetail.erreur}</p>}
              {envoiDetail.provider_message_id && (
                <p><strong>Identifiant technique :</strong> {envoiDetail.provider_message_id}</p>
              )}
              <p><strong>Déclenché par :</strong> {envoiDetail.declenche_par_email ?? "—"}</p>
              <pre className="whitespace-pre-wrap bg-muted p-3 rounded-lg text-xs">
                {htmlToText(envoiDetail.corps_html)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
