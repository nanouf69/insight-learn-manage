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
import { Download, Upload, RefreshCw, Archive, Loader2, AlertTriangle, Trash2, Plus, FileText, Link2, FileStack } from "lucide-react";
import { toast } from "sonner";
import { toPdf, mergePdfs, isPdf } from "@/lib/agrementPdf";
import { estLettrePresentation, fichiersPourExtra, piecesPourDossier, separerLettresPresentation } from "@/lib/agrementOrdre";

/** Obtient le PDF d'un fichier (PDF converti stocké, ou conversion à la volée sans modifier le stockage). */
async function pdfDe(f: { storage_path: string; pdf_storage_path: string | null; nom_fichier: string }): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from("agrements").download(f.pdf_storage_path ?? f.storage_path);
  if (error || !data) throw new Error(f.nom_fichier);
  return f.pdf_storage_path ? data : toPdf(data, f.nom_fichier);
}


/** Téléchargement fiable : saveAs + bouton de secours (l'aperçu intégré bloque parfois le téléchargement automatique). */
function livrer(blob: Blob, nom: string) {
  saveAs(blob, nom);
  const url = URL.createObjectURL(blob);
  toast.success(`${nom} prêt (${(blob.size / 1048576).toFixed(1)} Mo)`, {
    duration: 60000,
    description: "Si le téléchargement n'a pas démarré, cliquez sur « Ouvrir ».",
    action: { label: "Ouvrir", onClick: () => { const a = document.createElement("a"); a.href = url; a.download = nom; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove(); } },
  });
}

type Dossier = "taxi" | "vtc";
type Societe = "services_pro" | "opto";
const SOCIETES: { code: Societe; label: string }[] = [{ code: "services_pro", label: "SERVICES PRO" }, { code: "opto", label: "OPTO" }];
const db = supabase as any;

type Ligne = { sl: string; label: string; nc?: boolean };
type Groupe = { n: number; titre: string; commune: boolean; lignes: Ligne[]; bloc?: "vehicule" | "formateur"; lignesBloc?: Ligne[] };
const GROUPES: Groupe[] = [
  { n: 1, titre: "Identité du représentant légal", commune: true, lignes: [{ sl: "1.1", label: "Pièce d'identité recto" }, { sl: "1.2", label: "Pièce d'identité verso" }] },
  { n: 2, titre: "Kbis", commune: true, lignes: [{ sl: "2.1", label: "Extrait Kbis de moins de 3 mois" }] },
  { n: 3, titre: "Autorisation de travail", commune: true, lignes: [{ sl: "3.1", label: "Autorisation de travail", nc: true }] },
  { n: 4, titre: "Inscription et programme", commune: false, lignes: [
    { sl: "4.1", label: "Conditions d'inscription (devis, fiche d'inscription, CGV)" },
    { sl: "4.2", label: "Programme détaillé et durée des formations" },
    { sl: "4.3", label: "Durée et modalités des examens" }] },
  { n: 5, titre: "Locaux", commune: true, lignes: [
    { sl: "5.1", label: "Bail commercial" }, { sl: "5.2", label: "Avenant au bail" },
    { sl: "5.3", label: "Attestation d'assurance des locaux" }, { sl: "5.4", label: "Conformité ERP et accessibilité" },
    { sl: "5.5", label: "État descriptif des locaux et équipements" }] },
  { n: 6, titre: "Règlement intérieur", commune: true, lignes: [{ sl: "6.1", label: "Règlement intérieur" }] },
  { n: 7, titre: "Véhicules", commune: true, bloc: "vehicule", lignes: [{ sl: "7.1", label: "Liste des véhicules destinés à l'enseignement" }], lignesBloc: [
    { sl: "7.2", label: "Carte grise" }, { sl: "7.3", label: "Attestation d'assurance (usage enseignement)" },
    { sl: "7.4", label: "Contrôle technique (Non concerné si véhicule neuf)", nc: true },
    { sl: "7.5", label: "Contrat de location (Non concerné si véhicule de la société)", nc: true },
    { sl: "7.6", label: "Facture d'installation de la double commande et des rétroviseurs" }] },
  { n: 8, titre: "Formateurs", commune: true, bloc: "formateur", lignes: [{ sl: "8.1", label: "Liste des formateurs et désignation du responsable pédagogique" }], lignesBloc: [
    { sl: "8.2", label: "CV du formateur" }, { sl: "8.3", label: "Diplômes et attestations du formateur" }] },
];

interface Fichier {
  id: string; piece_code: string; dossier: string; storage_path: string; nom_fichier: string;
  date_ajout: string; date_expiration: string | null; remplace_par: string | null; masque: boolean; societe: string | null; aussi_autre_dossier?: boolean;
  pdf_storage_path: string | null; sous_ligne: string | null; bloc_id: string | null;
}
interface DossierRow { type: Dossier; date_delivrance: string | null; piece3_non_concerne: boolean }
interface PieceExtra { id: string; societe: string; dossier: string; label: string; ordre: number; masque: boolean }
interface Bloc { id: string; societe: string; type: string; nom: string; ordre: number }
interface Etat { societe: string; dossier: string; sous_ligne: string; bloc_id: string | null; non_concerne: boolean }
interface Item { key: string; sl: string; label: string; bloc_id: string | null; commune: boolean; nc: boolean; groupe: number }
interface Champs { piece_code: string; sous_ligne: string | null; bloc_id: string | null }

const fmt = (d: string | null) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("fr-FR") : "—");
const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
/** Sous-ligne effective d'un fichier (anciens fichiers sans sous-ligne → première ligne de la pièce). */
const slDe = (f: Fichier) => f.sous_ligne ?? (/^p\d$/.test(f.piece_code) ? `${f.piece_code.slice(1)}.1` : null);

export function DossiersAgrement() {
  const [fichiers, setFichiers] = useState<Fichier[]>([]);
  const [dossiers, setDossiers] = useState<Record<Dossier, DossierRow>>({
    taxi: { type: "taxi", date_delivrance: null, piece3_non_concerne: false },
    vtc: { type: "vtc", date_delivrance: null, piece3_non_concerne: false },
  });
  const [loading, setLoading] = useState(true);
  const [societe, setSociete] = useState<Societe>("services_pro");
  const [allDossiers, setAllDossiers] = useState<any[]>([]);
  const [extras, setExtras] = useState<PieceExtra[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [etats, setEtats] = useState<Etat[]>([]);

  const load = async () => {
    const [f, d, x, b, e] = await Promise.all([
      db.from("agrement_pieces_fichiers").select("*").eq("masque", false).order("date_ajout"),
      db.from("agrement_dossiers_societe").select("*"),
      db.from("agrement_pieces_extra").select("*").eq("masque", false).order("ordre"),
      db.from("agrement_blocs").select("*").eq("masque", false).order("ordre"),
      db.from("agrement_sous_lignes_etat").select("*"),
    ]);
    if (f.error || d.error || x.error || b.error || e.error) toast.error("Erreur de chargement des dossiers d'agrément");
    setFichiers(f.data ?? []);
    setAllDossiers(d.data ?? []);
    setExtras(x.data ?? []);
    setBlocs(b.data ?? []);
    setEtats(e.data ?? []);
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
        <DossierColonne key={societe + t} societe={societe} type={t} fichiers={fichiersSociete} dossier={dossiers[t]} onSaveDossier={saveDossier} reload={load}
          extras={piecesPourDossier(extras, societe, t)}
          blocs={blocs.filter((b) => b.societe === societe)} etats={etats.filter((e) => e.societe === societe)} />
      ))}
    </div>
    </div>
  );
}

function DossierColonne({ societe, type, fichiers, dossier, onSaveDossier, reload, extras, blocs, etats }: {
  societe: Societe; type: Dossier; fichiers: Fichier[]; dossier: DossierRow;
  onSaveDossier: (t: Dossier, p: Partial<DossierRow>) => void; reload: () => void; extras: PieceExtra[]; blocs: Bloc[]; etats: Etat[];
}) {
  const [zipping, setZipping] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const { lettres, autres } = useMemo(() => separerLettresPresentation(extras), [extras]);
  const indexAffiche = (sl: string) => sl.replace(/^\d+/, (n) => String(Number(n) + lettres.length));

  const items: Item[] = useMemo(() => GROUPES.flatMap((g) => [
    ...g.lignes.map((l) => ({ key: l.sl, sl: l.sl, label: l.label, bloc_id: null, commune: g.commune, nc: true, groupe: g.n })),
    ...(g.bloc ? blocs.filter((b) => b.type === g.bloc).flatMap((b) => g.lignesBloc!.map((l) => ({
      key: `${l.sl}:${b.id}`, sl: l.sl, label: l.label, bloc_id: b.id, commune: g.commune, nc: true, groupe: g.n,
    }))) : []),
  ]), [blocs]);

  const cote = (f: Fichier, commune: boolean) => commune ? f.dossier === "commun" : (f.dossier === type || (!!f.aussi_autre_dossier && f.dossier !== "commun"));
  const pourItem = (it: Item, remplace: boolean) => fichiers.filter((f) => slDe(f) === it.sl && (f.bloc_id ?? null) === it.bloc_id
    && !!f.remplace_par === remplace && cote(f, it.commune));
  const pourExtra = (x: PieceExtra, remplace: boolean) => fichiersPourExtra(fichiers, x, type, remplace);
  const dossierEtat = (it: Item) => (it.commune ? "commun" : type);
  const ncDe = (it: Item) => {
    if (!it.nc) return undefined;
    const e = etats.find((x) => x.dossier === dossierEtat(it) && x.sous_ligne === it.sl && (x.bloc_id ?? null) === it.bloc_id);
    if (e) return e.non_concerne;
    return it.sl === "3.1" ? dossier.piece3_non_concerne : false;
  };
  const setNc = async (it: Item, v: boolean) => {
    const ex = etats.find((x) => x.dossier === dossierEtat(it) && x.sous_ligne === it.sl && (x.bloc_id ?? null) === it.bloc_id) as any;
    const r = ex
      ? await db.from("agrement_sous_lignes_etat").update({ non_concerne: v, updated_at: new Date().toISOString() }).eq("id", ex.id)
      : await db.from("agrement_sous_lignes_etat").insert({ societe, dossier: dossierEtat(it), sous_ligne: it.sl, bloc_id: it.bloc_id, non_concerne: v });
    if (r.error) toast.error("Enregistrement refusé : " + r.error.message); else reload();
  };
  const ncExtra = (x: PieceExtra) => {
    const cible = estLettrePresentation(x.label) ? "commun" : type;
    const e = etats.find((y) => y.dossier === cible && y.sous_ligne === `extra:${x.id}` && !y.bloc_id)
      ?? (estLettrePresentation(x.label) ? etats.find((y) => y.dossier === x.dossier && y.sous_ligne === `extra:${x.id}` && !y.bloc_id) : undefined);
    return !!e?.non_concerne;
  };
  const setNcExtra = async (x: PieceExtra, v: boolean) => {
    const cible = estLettrePresentation(x.label) ? "commun" : type;
    const ex = etats.find((y) => y.dossier === cible && y.sous_ligne === `extra:${x.id}` && !y.bloc_id) as any;
    const r = ex
      ? await db.from("agrement_sous_lignes_etat").update({ non_concerne: v, updated_at: new Date().toISOString() }).eq("id", ex.id)
      : await db.from("agrement_sous_lignes_etat").insert({ societe, dossier: cible, sous_ligne: `extra:${x.id}`, bloc_id: null, non_concerne: v });
    if (r.error) toast.error("Enregistrement refusé : " + r.error.message); else reload();
  };

  const total = items.length;
  const fournies = items.filter((it) => pourItem(it, false).length > 0 || !!ncDe(it)).length;

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

  const nomBloc = (id: string | null) => blocs.find((b) => b.id === id)?.nom ?? "";
  const ordonnes = () => [
    ...lettres.map((x, i) => ({ dossierZip: `${String(i + 1).padStart(2, "0")}_${x.label.slice(0, 30)}`, list: pourExtra(x, false) })),
    ...items.map((it) => ({ dossierZip: `${indexAffiche(it.sl).replace(/^\d+/, (n) => n.padStart(2, "0"))}${it.bloc_id ? "_" + nomBloc(it.bloc_id) : ""}_${it.label.slice(0, 30)}`, list: pourItem(it, false) })),
    ...autres.map((x, i) => ({ dossierZip: `${String(lettres.length + GROUPES.length + i + 1).padStart(2, "0")}_${x.label.slice(0, 30)}`, list: pourExtra(x, false) })),
  ];

  const telechargerTout = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const tous = ordonnes(); const n = tous.reduce((a, g) => a + g.list.length, 0); let k = 0;
      const tid = toast.loading(`Préparation du dossier… 0/${n}`);
      try { for (const g of tous) for (const f of g.list) {
        toast.loading(`Préparation du dossier… ${++k}/${n}`, { id: tid });
        const { data, error } = await supabase.storage.from("agrements").download(f.storage_path);
        if (error || !data) throw new Error(f.nom_fichier);
        zip.folder(g.dossierZip.replace(/[^\w\-. ]+/g, ""))!.file(f.nom_fichier, data);
      }
      toast.loading("Compression du ZIP…", { id: tid });
      livrer(await zip.generateAsync({ type: "blob" }), `Dossier_agrement_${societe.toUpperCase()}_${type.toUpperCase()}.zip`);
      } finally { toast.dismiss(tid); }
    } catch (e: any) {
      toast.error("Téléchargement impossible : " + e.message);
    } finally { setZipping(false); }
  };

  const [merging, setMerging] = useState(false);
  const pdfComplet = async () => {
    setMerging(true);
    try {
      const parts: Blob[] = []; const ignores: string[] = [];
      const liste = ordonnes().flatMap((g) => g.list); let k = 0;
      const tid = toast.loading(`Assemblage du PDF… 0/${liste.length}`);
      try { for (const f of liste) {
        toast.loading(`Assemblage du PDF… ${++k}/${liste.length}`, { id: tid });
        const pdf = await pdfDe(f);
        if (pdf) parts.push(pdf); else ignores.push(f.nom_fichier);
      }
      if (!parts.length) throw new Error("aucun PDF");
      toast.loading("Fusion des pages…", { id: tid });
      livrer(await mergePdfs(parts), `Dossier_agrement_${societe.toUpperCase()}_${type.toUpperCase()}.pdf`);
      } finally { toast.dismiss(tid); }
      if (ignores.length) toast.warning(`Non inclus (non convertible) : ${ignores.join(", ")}`);
    } catch (e: any) {
      toast.error("PDF complet impossible : " + e.message);
    } finally { setMerging(false); }
  };

  const ajouterBloc = async (t: "vehicule" | "formateur") => {
    const nom = window.prompt(t === "vehicule" ? "Nom du véhicule (ex. marque, immatriculation)" : "Nom du formateur");
    if (!nom?.trim()) return;
    const { error } = await db.from("agrement_blocs").insert({ societe, type: t, nom: nom.trim(), ordre: blocs.filter((b) => b.type === t).length + 1 });
    if (error) toast.error("Refusé : " + error.message); else reload();
  };
  const renommerBloc = async (b: Bloc, nom: string) => {
    if (!nom.trim() || nom === b.nom) return;
    const { error } = await db.from("agrement_blocs").update({ nom: nom.trim() }).eq("id", b.id);
    if (error) toast.error("Refusé : " + error.message); else reload();
  };
  const masquerBloc = async (b: Bloc) => {
    if (!window.confirm(`Retirer « ${b.nom} » ? Il sera masqué avec ses fichiers, jamais supprimé.`)) return;
    const { error } = await db.from("agrement_blocs").update({ masque: true }).eq("id", b.id);
    if (error) toast.error("Refusé : " + error.message); else reload();
  };

  const rendreItem = (it: Item) => (
    <PieceLigne key={it.key} societe={societe} index={indexAffiche(it.sl)} piece={{ code: `p${it.groupe}`, label: it.label, commune: it.commune } as any}
      champs={{ piece_code: `p${it.groupe}`, sous_ligne: it.sl, bloc_id: it.bloc_id }}
      dossierCible={it.commune ? "commun" : type} actifs={pourItem(it, false)} remplaces={pourItem(it, true)}
      nonConcerne={ncDe(it)} onNonConcerne={(v) => setNc(it, v)} reload={reload} kbis={it.sl === "2.1"} />
  );

  const rendreExtra = (x: PieceExtra, index: number) => (
    <PieceLigne key={x.id} societe={societe} index={String(index)}
      piece={{ code: `extra:${x.id}`, label: x.label, commune: estLettrePresentation(x.label) }} dossierCible={estLettrePresentation(x.label) ? "commun" : type}
      champs={{ piece_code: `extra:${x.id}`, sous_ligne: null, bloc_id: null }}
      actifs={pourExtra(x, false)} remplaces={pourExtra(x, true)}
      nonConcerne={ncExtra(x)} onNonConcerne={(v) => setNcExtra(x, v)}
      reload={reload}
      onRetirerPiece={async () => {
        if (!window.confirm(`Retirer la pièce « ${x.label} » ? Elle sera masquée, jamais supprimée.`)) return;
        const { error } = await db.from("agrement_pieces_extra").update({ masque: true }).eq("id", x.id);
        if (error) toast.error("Refusé : " + error.message); else { toast.success("Pièce masquée"); reload(); }
      }} />
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">Dossier agrément {type.toUpperCase()}</h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={pdfComplet} disabled={merging || fournies === 0}>
            {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />} PDF complet du dossier
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={telechargerTout} disabled={zipping || fournies === 0}>
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Télécharger tout le dossier
          </Button>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Documents fournis</span><span>{fournies}/{total}</span></div>
        <Progress value={total ? (fournies / total) * 100 : 0} />
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
      <div className="space-y-3">
        {lettres.map((x, i) => rendreExtra(x, i + 1))}
        {GROUPES.map((g) => (
          <div key={g.n} className="space-y-1">
            <div className="font-semibold text-sm">{g.n + lettres.length}. {g.titre} {g.commune && <span className="text-xs font-normal text-muted-foreground">(commun TAXI/VTC)</span>}</div>
            {items.filter((it) => it.groupe === g.n && !it.bloc_id).map(rendreItem)}
            {g.bloc && blocs.filter((b) => b.type === g.bloc).map((b) => (
              <div key={b.id} className="ml-3 space-y-1 border-l-2 pl-2">
                <div className="flex items-center gap-2">
                  <Input className="h-7 w-56 text-sm font-medium" defaultValue={b.nom} onBlur={(e) => renommerBloc(b, e.target.value)} />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="Retirer" onClick={() => masquerBloc(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                {items.filter((it) => it.bloc_id === b.id).map(rendreItem)}
              </div>
            ))}
            {g.bloc && (
              <Button size="sm" variant="outline" className="h-7 gap-1 ml-3" onClick={() => ajouterBloc(g.bloc!)}>
                <Plus className="h-3.5 w-3.5" /> Ajouter un {g.bloc === "vehicule" ? "véhicule" : "formateur"}
              </Button>
            )}
          </div>
        ))}
        {autres.map((x, i) => rendreExtra(x, lettres.length + GROUPES.length + i + 1))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Input className="h-8 flex-1 text-sm" placeholder="Nom de la pièce à ajouter…" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <Button size="sm" variant="outline" className="h-8 gap-1" disabled={adding || !newLabel.trim()}
          onClick={async () => {
            setAdding(true);
            const { error } = await db.from("agrement_pieces_extra").insert({ societe, dossier: type, label: newLabel.trim(), ordre: 100 + extras.length });
            setAdding(false);
            if (error) toast.error("Refusé : " + error.message); else { setNewLabel(""); toast.success("Pièce ajoutée"); reload(); }
          }}>
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Ajouter une pièce
        </Button>
      </div>
    </Card>
  );
}

function PieceLigne({ societe, index, piece, champs, dossierCible, actifs, remplaces, nonConcerne, onNonConcerne, reload, onRetirerPiece, kbis }: {
  societe: Societe; index: string; piece: { code: string; label: string; commune?: boolean }; champs: Champs; dossierCible: string; actifs: Fichier[]; remplaces: Fichier[];
  nonConcerne?: boolean; onNonConcerne?: (v: boolean) => void; reload: () => void; onRetirerPiece?: () => void; kbis?: boolean;
}) {
  const addRef = useRef<HTMLInputElement>(null);
  const replRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [partage, setPartage] = useState(false);
  const fourni = actifs.length > 0 || !!nonConcerne;
  const kbisVieux = !!kbis && actifs.length > 0 && actifs.every((f) => { const d = new Date(f.date_ajout); d.setMonth(d.getMonth() + 3); return d < today(); });
  const expire = actifs.some((f) => f.date_expiration && new Date(f.date_expiration + "T00:00:00") < today());

  const upload = async (files: FileList | null, remplaceId?: string | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const remplacé = remplaceId ? actifs.find((a) => a.id === remplaceId) : null;
        const soc = remplacé ? remplacé.societe : (champs.piece_code === "p5" && partage ? null : societe);
        const path = `${soc ?? "partage"}/${dossierCible}/${(champs.sous_ligne ?? piece.code)}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("agrements").upload(path, file);
        if (up.error) throw up.error;
        let pdfPath: string | null = null;
        if (!isPdf(file.name)) {
          try {
            const pdf = await toPdf(file, file.name);
            if (pdf) {
              const p = path.replace(/\.[^.]+$/, "") + ".pdf";
              const upPdf = await supabase.storage.from("agrements").upload(p, pdf, { contentType: "application/pdf" });
              if (!upPdf.error) pdfPath = p;
            }
          } catch { toast.warning(`${file.name} : conversion PDF impossible, l'original est conservé`); }
        }
        const ins = await db.from("agrement_pieces_fichiers")
          .insert({ ...champs, bloc_id: remplacé ? remplacé.bloc_id : champs.bloc_id, piece_code: remplacé ? remplacé.piece_code : champs.piece_code, sous_ligne: remplacé ? (remplacé.sous_ligne ?? champs.sous_ligne) : champs.sous_ligne, dossier: remplacé?.dossier ?? dossierCible, aussi_autre_dossier: !!remplacé?.aussi_autre_dossier, storage_path: path, nom_fichier: file.name, societe: soc, pdf_storage_path: pdfPath })
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

  const masquerFichier = async (f: Fichier) => {
    if (!window.confirm(`Retirer « ${f.nom_fichier} » ? Il sera masqué, jamais supprimé (conservé en base).`)) return;
    const { error } = await db.from("agrement_pieces_fichiers").update({ masque: true }).eq("id", f.id);
    if (error) toast.error("Refusé : " + error.message); else { toast.success("Document masqué"); reload(); }
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

  const ouvrirPdf = async (f: Fichier) => {
    try {
      if (f.pdf_storage_path || isPdf(f.nom_fichier)) {
        const { data } = await supabase.storage.from("agrements").createSignedUrl(f.pdf_storage_path ?? f.storage_path, 300);
        if (!data) throw new Error();
        window.location.href = data.signedUrl;
      } else {
        const pdf = await pdfDe(f);
        if (!pdf) throw new Error();
        window.location.href = URL.createObjectURL(pdf);
      }
    } catch { toast.error("PDF indisponible pour " + f.nom_fichier); }
  };

  const copierLien = async (f: Fichier) => {
    await navigator.clipboard.writeText(`${window.location.origin}/agrement-document/${f.id}`);
    toast.success("Lien copié (réservé aux comptes connectés)");
  };

  return (
    <div className={`rounded-md border p-2 text-sm ${fourni ? "" : "border-destructive/50 bg-destructive/5"}`}>
      <div className="flex items-start gap-2">
        <span className="font-medium w-8">{index}</span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className={fourni ? "" : "text-destructive font-medium"}>{piece.label}</span>
            {piece.commune && <span className="text-xs text-muted-foreground">(commun TAXI/VTC)</span>}
            {actifs.length === 0 ? (
              <span className={`inline-flex items-center gap-0.5 text-xs ${fourni ? "text-muted-foreground opacity-60" : "text-destructive font-medium"}`}><FileText className="h-4 w-4" /> Manquant</span>
            ) : actifs.map((f) => (
              <span key={f.id} className="inline-flex items-center">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title={`Ouvrir en PDF : ${f.nom_fichier}`} onClick={() => ouvrirPdf(f)}><FileText className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Copier le lien" onClick={() => copierLien(f)}><Link2 className="h-3.5 w-3.5" /></Button>
              </span>
            ))}
          </div>
          {nonConcerne !== undefined && (
            <label className="flex items-center gap-1 text-xs mt-1">
              <Checkbox checked={nonConcerne} onCheckedChange={(v) => onNonConcerne(!!v)} /> Non concerné
            </label>
          )}
          {champs.piece_code === "p5" && (
            <label className="flex items-center gap-1 text-xs mt-1">
              <Checkbox checked={partage} onCheckedChange={(v) => setPartage(!!v)} /> Commun aux deux sociétés (prochain ajout)
            </label>
          )}
        </div>
        {kbisVieux && <Badge variant="destructive">Kbis de plus de 3 mois</Badge>}
        {expire ? <Badge variant="destructive">Expiré</Badge> : nonConcerne && actifs.length === 0 ? <Badge variant="secondary">Non concerné</Badge> : fourni ? <Badge>Fourni</Badge> : <Badge variant="destructive">Manquant</Badge>}
        <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={busy} onClick={() => addRef.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Ajouter
        </Button>
        {onRetirerPiece && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Retirer cette pièce" onClick={onRetirerPiece}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <input ref={addRef} type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={replRef} type="file" className="hidden" onChange={(e) => { upload(e.target.files, replaceId); e.target.value = ""; }} />
      {actifs.length > 0 && (
        <ul className="mt-2 space-y-1 pl-7">
          {actifs.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2">
              <span className="truncate max-w-[12rem]" title={f.nom_fichier}>{f.nom_fichier}</span>
              {f.societe === null && <Badge variant="secondary">Partagé</Badge>}
              {f.dossier === "commun" && <Badge variant="outline">commun TAXI/VTC</Badge>}
              {champs.piece_code === "p4" && (
                <>
                  {f.aussi_autre_dossier && <Badge variant="outline">commun TAXI/VTC</Badge>}
                  {f.dossier === dossierCible && (
                    <label className="flex items-center gap-1 text-xs">
                      <Checkbox checked={!!f.aussi_autre_dossier} onCheckedChange={async (v) => {
                        const { error } = await db.from("agrement_pieces_fichiers").update({ aussi_autre_dossier: !!v }).eq("id", f.id);
                        if (error) toast.error("Refusé : " + error.message); else reload();
                      }} /> Aussi pour {dossierCible === "taxi" ? "VTC" : "TAXI"}
                    </label>
                  )}
                </>
              )}
              <span className="text-xs text-muted-foreground">ajouté le {fmt(f.date_ajout)}</span>
              <span className="text-xs text-muted-foreground">expire :</span>
              <Input type="date" className="h-7 w-36 text-xs" value={f.date_expiration ?? ""} onChange={(e) => setExpiration(f, e.target.value)} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Télécharger" onClick={() => telecharger(f)}><Download className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Remplacer" onClick={() => { setReplaceId(f.id); replRef.current?.click(); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="Retirer ce document" onClick={() => masquerFichier(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
