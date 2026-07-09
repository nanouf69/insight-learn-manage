import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Database, HardDrive, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FileMeta = { path: string; size: number | null };
type Manifest = {
  version: string;
  exported_at: string;
  exported_by?: string;
  tables: Record<string, unknown[]>;
  storage: Record<string, FileMeta[]>;
  buckets: string[];
};

const BACKUP_VERSION = "1.0.0";

/** Onglet Sauvegarde & Restauration (admin only côté serveur). */
export function BackupTab() {
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState<string[]>([]);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);

  // ---------- EXPORT ----------
  const runExport = async () => {
    setExporting(true);
    setProgress(0);
    setReport([]);
    setStatus("Récupération des données…");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      // 1) Manifest (toutes les tables + listing storage)
      const { data, error } = await supabase.functions.invoke("backup-export?mode=tables", {
        method: "POST",
      });
      if (error) throw error;
      const manifest = data as Manifest;
      setProgress(15);
      setStatus("Construction du ZIP…");

      const zip = new JSZip();

      // 2) Dossier database/
      const dbDir = zip.folder("Sauvegarde_ERP/database")!;
      for (const [table, rows] of Object.entries(manifest.tables)) {
        dbDir.file(`${table}.json`, JSON.stringify(rows, null, 2));
      }
      setProgress(25);

      // 3) Dossier metadata/
      const metaDir = zip.folder("Sauvegarde_ERP/metadata")!;
      metaDir.file("date_sauvegarde.json", JSON.stringify({ exported_at: manifest.exported_at, exported_by: manifest.exported_by }, null, 2));
      metaDir.file("version.json", JSON.stringify({ version: BACKUP_VERSION, buckets: manifest.buckets }, null, 2));
      metaDir.file("schema.txt", "Tables incluses:\n" + Object.keys(manifest.tables).join("\n"));

      // 4) Dossier storage/ — télécharger chaque fichier via URL signée (par batches)
      const storageDir = zip.folder("Sauvegarde_ERP/storage")!;
      const allFiles: { bucket: string; path: string }[] = [];
      for (const [bucket, files] of Object.entries(manifest.storage)) {
        for (const f of files) allFiles.push({ bucket, path: f.path });
      }
      const totalFiles = allFiles.length;
      setStatus(`Téléchargement de ${totalFiles} fichier(s) Storage…`);

      const BATCH = 50;
      let done = 0;
      const byBucket: Record<string, string[]> = {};
      for (const f of allFiles) (byBucket[f.bucket] ||= []).push(f.path);

      for (const [bucket, paths] of Object.entries(byBucket)) {
        const bucketDir = storageDir.folder(bucket)!;
        for (let i = 0; i < paths.length; i += BATCH) {
          const slice = paths.slice(i, i + BATCH);
          const { data: signRes, error: sErr } = await supabase.functions.invoke(
            `backup-export?mode=bucket&bucket=${encodeURIComponent(bucket)}`,
            { method: "POST", body: { paths: slice } },
          );
          if (sErr) {
            setReport((r) => [...r, `⚠️ Signature échouée pour ${bucket}: ${sErr.message}`]);
            continue;
          }
          const files = (signRes?.files ?? []) as { path: string; signedUrl: string; error?: string }[];
          await Promise.all(files.map(async (f) => {
            if (!f.signedUrl) {
              setReport((r) => [...r, `⚠️ Pas d'URL pour ${bucket}/${f.path}`]);
              return;
            }
            try {
              const resp = await fetch(f.signedUrl);
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
              const blob = await resp.blob();
              bucketDir.file(f.path, blob);
            } catch (e: any) {
              setReport((r) => [...r, `⚠️ ${bucket}/${f.path}: ${e.message}`]);
            } finally {
              done++;
              setProgress(25 + Math.floor((done / Math.max(1, totalFiles)) * 65));
            }
          }));
        }
      }

      setStatus("Compression finale…");
      setProgress(92);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (m) => {
        setProgress(92 + Math.floor(m.percent * 0.08));
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      saveAs(blob, `Sauvegarde_ERP_${stamp}.zip`);
      setProgress(100);
      setStatus(`✅ Sauvegarde générée (${(blob.size / 1024 / 1024).toFixed(1)} Mo)`);
      toast.success("Sauvegarde téléchargée");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur export: " + e.message);
      setStatus("❌ " + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ---------- RESTORE ----------
  const runRestore = async () => {
    if (!fileToRestore) return;
    setRestoring(true);
    setProgress(0);
    setReport([]);
    setStatus("Lecture du ZIP…");

    try {
      const zip = await JSZip.loadAsync(fileToRestore);

      // Vérif version
      const versionFile = zip.file("Sauvegarde_ERP/metadata/version.json");
      if (!versionFile) throw new Error("Fichier version.json manquant — sauvegarde invalide");
      const versionMeta = JSON.parse(await versionFile.async("string")) as { version: string };
      if (versionMeta.version.split(".")[0] !== BACKUP_VERSION.split(".")[0]) {
        throw new Error(`Version incompatible: ${versionMeta.version} vs ${BACKUP_VERSION}`);
      }
      setReport((r) => [...r, `✅ Version ${versionMeta.version} compatible`]);

      // Ordre de restauration
      const { data: orderRes } = await supabase.functions.invoke("backup-restore?mode=order", { method: "POST" });
      const order: string[] = orderRes?.order ?? [];

      // Charger toutes les tables
      const dbFiles = Object.keys(zip.files).filter((n) => n.startsWith("Sauvegarde_ERP/database/") && n.endsWith(".json"));
      const tablesData: Record<string, any[]> = {};
      for (const name of dbFiles) {
        const t = name.replace("Sauvegarde_ERP/database/", "").replace(".json", "");
        tablesData[t] = JSON.parse(await zip.file(name)!.async("string"));
      }

      const ordered = [...order.filter((t) => tablesData[t]), ...Object.keys(tablesData).filter((t) => !order.includes(t))];
      let step = 0;
      const totalSteps = ordered.length + Object.keys(zip.files).filter((n) => n.startsWith("Sauvegarde_ERP/storage/") && !zip.files[n].dir).length;

      setStatus("Restauration des tables…");
      for (const table of ordered) {
        const rows = tablesData[table];
        if (!rows?.length) { step++; continue; }
        // Upsert par batches de 200
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const { data: res, error } = await supabase.functions.invoke("backup-restore?mode=table", {
            method: "POST", body: { table, rows: chunk },
          });
          if (error || res?.ok === false) {
            setReport((r) => [...r, `⚠️ ${table} [${i}-${i + chunk.length}]: ${error?.message || res?.error}`]);
          }
        }
        setReport((r) => [...r, `✅ ${table}: ${rows.length} ligne(s)`]);
        step++;
        setProgress(Math.floor((step / totalSteps) * 60));
      }

      // Restaurer les fichiers Storage
      setStatus("Restauration des fichiers Storage…");
      const storageFiles = Object.keys(zip.files).filter((n) => n.startsWith("Sauvegarde_ERP/storage/") && !zip.files[n].dir);
      for (const name of storageFiles) {
        const rel = name.replace("Sauvegarde_ERP/storage/", "");
        const [bucket, ...pathParts] = rel.split("/");
        const path = pathParts.join("/");
        if (!bucket || !path) { step++; continue; }
        const blob = await zip.file(name)!.async("blob");
        const buf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const { data: res, error } = await supabase.functions.invoke("backup-restore?mode=file", {
          method: "POST",
          body: { bucket, path, base64, contentType: blob.type },
        });
        if (error || res?.ok === false) {
          setReport((r) => [...r, `⚠️ ${bucket}/${path}: ${error?.message || res?.error}`]);
        }
        step++;
        setProgress(60 + Math.floor((step / totalSteps) * 40));
      }

      setProgress(100);
      setStatus("✅ Restauration terminée");
      toast.success("Restauration terminée");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur restauration: " + e.message);
      setStatus("❌ " + e.message);
    } finally {
      setRestoring(false);
    }
  };

  const busy = exporting || restoring;

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Database className="w-5 h-5" /> Sauvegarde complète
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Exporte toutes les tables (apprenants, formations, sessions, factures, examens, paramètres…)
          et tous les fichiers du Storage dans un unique ZIP téléchargé sur votre ordinateur.
        </p>
        <Button onClick={runExport} disabled={busy} className="gap-2">
          <Download className="w-4 h-4" />
          {exporting ? "Sauvegarde en cours…" : "Lancer la sauvegarde complète"}
        </Button>
      </div>

      {/* Restore */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <HardDrive className="w-5 h-5" /> Restaurer une sauvegarde
        </h3>
        <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>Opération sensible : les enregistrements existants portant le même identifiant seront écrasés (upsert). Effectuez d'abord une nouvelle sauvegarde.</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFileToRestore(e.target.files?.[0] ?? null)}
            disabled={busy}
            className="text-sm"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy || !fileToRestore} className="gap-2">
                <Upload className="w-4 h-4" />
                Restaurer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la restauration ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action va écraser les données existantes ({fileToRestore?.name}).
                  Assurez-vous d'avoir une sauvegarde récente avant de continuer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={runRestore}>Confirmer la restauration</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Progression + rapport */}
      {(busy || progress > 0 || report.length > 0) && (
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-3">Progression</h3>
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-muted-foreground mb-3">{status || `${progress}%`}</p>
          {report.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs font-mono space-y-1">
              {report.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
