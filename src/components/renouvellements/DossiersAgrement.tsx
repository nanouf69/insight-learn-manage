import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Upload, RefreshCw, Archive, Loader2, AlertTriangle, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Dossier = "taxi" | "vtc";
type Societe = "services_pro" | "opto";
const SOCIETES: { code: Societe; label: string }[] = [{ code: "services_pro", label: "SERVICES PRO" }, { code: "opto", label: "OPTO" }];
const db = supabase as any;

const PIECES = [
  { code: "p1", label: "Pièce d'identité du représentant légal", commune: true },
  { code: "p2", label: "Extrait Kbis de moins de 3 mois", commune: true },
  { code: "p3", label: "Autorisation de travail (si étranger, facultatif)", commune: true, facultative: true },
  { code: "p4", label: "Conditions d'inscription + programme détaillé et durée des formations et examens" },
  { code: "p5", label: "Locaux : titre d'occupation, attestation d'assurance des locaux, conformité ERP", commune: true },
  { code: "p6", label: "Règlement intérieur" },
  { code: "p7", label: "Véhicules : liste, cartes grises, attestations d'assurance, contrôles techniques" },
  { code: "p8", label: "Liste des formateurs + diplômes/attestations + nom du responsable pédagogique" },
] as const;

interface Fichier {
  id: string; piece_code: string; dossier: string; storage_path: string; nom_fichier: string;
  date_ajout: string; date_expiration: string | null; remplace_par: string | null; masque: boolean; societe: string | null;
}
interface DossierRow { type: Dossier; date_delivrance: string | null; piece3_non_concerne: boolean }

const fmt = (d: string | null) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("fr-FR") : "—");
const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

export function DossiersAgrement() {
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [dossiers, setDossiers] = useState<Record<Dossier, DossierRow>>({
    taxi: { type: "taxi", date_delivrance: null, piece3_non_concerne: false },
    vtc: { type: "vtc", date_delivrance: null, piece3_non_concerne: false },
  });
  const [loading, setLoading] = useState(true);
  const [societe, setSociete] = useState<Societe>("services_pro");
  const [allDossiers, setAllDossiers] = useState<any[]>([]);

  const load = async () => {
    const [f, d] = await Promise.all([
      db.from("agrement_pieces_fichiers").select("*").eq("masque", false).order("date_ajout"),
      db.from("agrement_dossiers_societe").select("*"),
    ]);
    if (f.error || d.error) toast.error("Erreur de chargement des dossiers d'agrément");
    setFichiers(f.data ?? []);
    setAllDossiers(d.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const next: Record<Dossier, DossierRow> = {
      taxi: { type: "taxi", date_delivrance: null, piece3_non_concerne: false },
      vtc: { type: "vtc", date_delivrance: null, piece3_non_concerne: false },
    };
    for (const r of allDossiers) if (r.societe === societe) next[r.type as Dossier] = r;
    setDossiers(next);
  }, [allDossiers, societe]);
  const fichiersSociete = fichiers.filter((f) => f.societe === societe || (f.societe === null && f.piece_code === "p5"));

  const saveDossier = async (type: Dossier, patch: Partial<DossierRow>) => {
    const row = { ...dossiers[type], ...patch, societe, type, updated_at: new Date().toISOString() };
    setDossiers((p) => ({ ...p, [type]: row }));
    const { error } = await db.from("agrement_dossiers_societe").upsert(row, { onConflict: "societe,type" });
    if (error) toast.error("Enregistrement refusé : " + error.message); else load();
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-4 space-y-3">
    <div className="flex gap-2">
      {SOCIETES.map((x) => (
        <Button key={x.code} size="sm" variant={societe === x.code ? "default" : "outline"} onClick={() => setSociete(x.code)}>{x.label}</Button>
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {(["taxi", "vtc"] as Dossier[]).map((t) => (
        <DossierColonne key={societe + t} societe={societe} type={t} fichiers={fichiersSociete} dossier={dossiers[t]} onSaveDossier={saveDossier} reload={load} />
      ))}
    </div>
    </div>
  );
}

function DossierColonne({ societe, type, fichiers, dossier, onSaveDossier, reload }: {
  societe: Societe; type: Dossier; fichiers: Fichier[]; dossier: DossierRow;
  onSaveDossier: (t: Dossier, p: Partial<DossierRow>) => void; reload: () => void;
}) {
  const [zipping, setZipping] = useState(false);
  const actifsPour = (code: string, commune?: boolean) =>
    fichiers.filter((f) => f.piece_code === code && !f.remplace_par && (commune ? f.dossier === "commun" : f.dossier === type));
  const remplacesPour = (code: string, commune?: boolean) =>
    fichiers.filter((f) => f.piece_code === code && f.remplace_par && (commune ? f.dossier === "commun" : f.dossier === type));

  const fournies = PIECES.filter((p) => actifsPour(p.code, (p as any).commune).length > 0 || ((p as any).facultative && dossier.piece3_non_concerne)).length;

  const echeance = useMemo(() => {
    if (!dossier.date_delivrance) return null;
    const d = new Date(dossier.date_delivrance + "T00:00:00"); d.setFullYear(d.getFullYear() + 5); return d;
  }, [dossier.date_delivrance]);
  const alerte = (() => {
    if (!echeance) return null;
    const limite = new Date(echeance); limite.setMonth(limite.getMonth() - 2);
    if (today() > echeance) return "expire";
    if (today() >= limite) return "bientot";
    return null;
  })();

  const telechargerTout = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const p of PIECES) {
        const list = actifsPour(p.code, (p as any).commune);
        for (const f of list) {
          const { data, error } = await supabase.storage.from("agrements").download(f.storage_path);
          if (error || !data) throw new Error(f.nom_fichier);
          zip.folder(`${p.code.replace("p", "")}_${p.label.slice(0, 40).replace(/[^\w\- ]+/g, "")}`)!.file(f.nom_fichier, data);
        }
      }
      saveAs(await zip.generateAsync({ type: "blob" }), `Dossier_agrement_${societe.toUpperCase()}_${type.toUpperCase()}.zip`);
    } catch (e: any) {
      toast.error("Téléchargement impossible : " + e.message);
    } finally { setZipping(false); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">Dossier agrément {type.toUpperCase()}</h4>
        <Button size="sm" variant="outline" className="gap-1" onClick={telechargerTout} disabled={zipping || fournies === 0}>
          {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Télécharger tout le dossier
        </Button>
      </div>
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Pièces fournies</span><span>{fournies}/8</span></div>
        <Progress value={(fournies / 8) * 100} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Délivré le</span>
        <Input type="date" className="h-8 w-40" value={dossier.date_delivrance ?? ""} onChange={(e) => onSaveDossier(type, { date_delivrance: e.target.value || null })} />
        {echeance && <span>Échéance (5 ans) : <strong>{echeance.toLocaleDateString("fr-FR")}</strong></span>}
      </div>
      {alerte && (
        <div className={`flex items-center gap-2 rounded-md p-2 text-sm ${alerte === "expire" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
          <AlertTriangle className="h-4 w-4" />
          {alerte === "expire" ? "Agrément expiré : renouvellement urgent." : "Renouvellement à préparer : échéance dans moins de 2 mois."}
        </div>
      )}
      <div className="space-y-2">
        {PIECES.map((p, i) => (
          <PieceLigne key={p.code} societe={societe} index={i + 1} piece={p} dossierCible={(p as any).commune ? "commun" : type}
            actifs={actifsPour(p.code, (p as any).commune)} remplaces={remplacesPour(p.code, (p as any).commune)}
            nonConcerne={(p as any).facultative ? dossier.piece3_non_concerne : undefined}
            onNonConcerne={(v) => onSaveDossier(type, { piece3_non_concerne: v })} reload={reload} />
        ))}
      </div>
    </Card>
  );
}

function PieceLigne({ societe, index, piece, dossierCible, actifs, remplaces, nonConcerne, onNonConcerne, reload }: {
  societe: Societe; index: number; piece: (typeof PIECES)[number]; dossierCible: string; actifs: Fichier[]; remplaces: Fichier[];
  nonConcerne?: boolean; onNonConcerne: (v: boolean) => void; reload: () => void;
}) {
  const addRef = useRef<HTMLInputElement>(null);
  const replRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [partage, setPartage] = useState(false);
  const fourni = actifs.length > 0 || !!nonConcerne;
  const expire = actifs.some((f) => f.date_expiration && new Date(f.date_expiration + "T00:00:00") < today());

  const upload = async (files: FileList | null, remplaceId?: string | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { toast.error(`${file.name} : PDF, JPG ou PNG uniquement`); continue; }
        const remplacé = remplaceId ? actifs.find((a) => a.id === remplaceId) : null;
        const soc = remplacé ? remplacé.societe : (piece.code === "p5" && partage ? null : societe);
        const path = `${soc ?? "partage"}/${dossierCible}/${piece.code}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("agrements").upload(path, file);
        if (up.error) throw up.error;
        const ins = await db.from("agrement_pieces_fichiers")
          .insert({ piece_code: piece.code, dossier: dossierCible, storage_path: path, nom_fichier: file.name, societe: soc })
          .select("id").single();
        if (ins.error) throw ins.error;
        if (remplaceId) {
          const u = await db.from("agrement_pieces_fichiers").update({ remplace_par: ins.data.id }).eq("id", remplaceId);
          if (u.error) throw u.error;
        }
      }
      toast.success("Fichier enregistré");
      reload();
    } catch (e: any) {
      toast.error("Envoi refusé : " + (e.message ?? e));
    } finally { setBusy(false); setReplaceId(null); }
  };

  const telecharger = async (f: Fichier) => {
    const { data, error } = await supabase.storage.from("agrements").createSignedUrl(f.storage_path, 300, { download: f.nom_fichier });
    if (error || !data) return toast.error("Lien indisponible");
    window.open(data.signedUrl, "_blank");
  };

  const setExpiration = async (f: Fichier, v: string) => {
    const { error } = await db.from("agrement_pieces_fichiers").update({ date_expiration: v || null }).eq("id", f.id);
    if (error) toast.error("Enregistrement refusé : " + error.message); else reload();
  };

  return (
    <div className="rounded-md border p-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="font-medium w-5">{index}.</span>
        <div className="flex-1">
          <div>{piece.label} {(piece as any).commune && <span className="text-xs text-muted-foreground">(commune TAXI/VTC)</span>}</div>
          {nonConcerne !== undefined && (
            <label className="flex items-center gap-1 text-xs mt-1">
              <Checkbox checked={nonConcerne} onCheckedChange={(v) => onNonConcerne(!!v)} /> Non concerné
            </label>
          )}
          {piece.code === "p5" && (
            <label className="flex items-center gap-1 text-xs mt-1">
              <Checkbox checked={partage} onCheckedChange={(v) => setPartage(!!v)} /> Commun aux deux sociétés (prochain ajout)
            </label>
          )}
        </div>
        {expire ? <Badge variant="destructive">Expiré</Badge> : fourni ? <Badge>Fourni</Badge> : <Badge variant="outline">Manquant</Badge>}
        <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={busy} onClick={() => addRef.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Ajouter
        </Button>
      </div>
      <input ref={addRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={replRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { upload(e.target.files, replaceId); e.target.value = ""; }} />
      {actifs.length > 0 && (
        <ul className="mt-2 space-y-1 pl-7">
          {actifs.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2">
              <span className="truncate max-w-[12rem]" title={f.nom_fichier}>{f.nom_fichier}</span>
              {f.societe === null && <Badge variant="secondary">Partagé</Badge>}
              <span className="text-xs text-muted-foreground">ajouté le {fmt(f.date_ajout)}</span>
              <span className="text-xs text-muted-foreground">expire :</span>
              <Input type="date" className="h-7 w-36 text-xs" value={f.date_expiration ?? ""} onChange={(e) => setExpiration(f, e.target.value)} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Télécharger" onClick={() => telecharger(f)}><Download className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Remplacer" onClick={() => { setReplaceId(f.id); replRef.current?.click(); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      )}
      {remplaces.length > 0 && (
        <details className="mt-1 pl-7 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Anciennes versions ({remplaces.length})</summary>
          {remplaces.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <span>{f.nom_fichier} — {fmt(f.date_ajout)} (remplacé)</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => telecharger(f)}><Download className="h-3 w-3" /></Button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
