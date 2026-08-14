import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendInscriptionEmails } from "@/lib/sendInscriptionEmails";

interface ParsedRow {
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut: string | null;
  date_fin: string | null;
  montant_ttc: number | null;
}

interface RowResult extends ParsedRow {
  status: "ok" | "doublon" | "erreur";
  message?: string;
  emails?: string;
}

const norm = (s: string) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const pick = (row: Record<string, unknown>, keys: string[]): string => {
  for (const k of Object.keys(row)) {
    if (keys.includes(norm(k))) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
};

// Convertit une date Excel (série ou texte) en YYYY-MM-DD
const toIsoDate = (value: string): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const frMatch = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const serial = Number(value);
  if (!Number.isNaN(serial) && serial > 20000 && serial < 60000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }
  const dt = new Date(value);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
  return null;
};

export function ImportApprenantsExcel({ onImported }: { onImported?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResults([]);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const parsed: ParsedRow[] = raw
      .map((r) => {
        const montant = pick(r, ["montant", "montant_ttc", "montant ttc", "prix", "tarif"]);
        return {
          prenom: pick(r, ["prenom", "first name", "firstname", "prénom"]),
          nom: pick(r, ["nom", "last name", "lastname", "nom de famille"]),
          email: pick(r, ["email", "e-mail", "mail", "adresse email"]).toLowerCase(),
          telephone: pick(r, ["telephone", "tel", "tél", "phone", "portable", "mobile"]) || null,
          adresse: pick(r, ["adresse", "address", "rue"]) || null,
          code_postal: pick(r, ["code postal", "code_postal", "cp", "zip"]) || null,
          ville: pick(r, ["ville", "city"]) || null,
          type_apprenant: (pick(r, ["type", "type apprenant", "type_apprenant", "profil"]) || "").toLowerCase() || null,
          formation_choisie: pick(r, ["formation", "formation choisie", "formation_choisie"]) || null,
          date_debut: toIsoDate(pick(r, ["date debut", "date_debut", "debut", "date de debut", "date début"])),
          date_fin: toIsoDate(pick(r, ["date fin", "date_fin", "fin", "date de fin"])),
          montant_ttc: montant ? Number(montant.replace(",", ".").replace(/[^\d.]/g, "")) || null : null,
        };
      })
      .filter((r) => r.nom && r.prenom);

    setRows(parsed);
  };

  const handleImport = async () => {
    setImporting(true);
    const out: RowResult[] = [];
    const today = new Date().toISOString().split("T")[0];
    let needCredentials = false;

    for (const row of rows) {
      try {
        // Anti-doublon strict (nom + prénom)
        const { data: existing } = await supabase
          .from("apprenants")
          .select("id")
          .ilike("nom", row.nom)
          .ilike("prenom", row.prenom)
          .is("deleted_at", null)
          .maybeSingle();

        if (existing) {
          out.push({ ...row, status: "doublon", message: "Déjà présent dans le CRM" });
          setResults([...out]);
          continue;
        }

        const { data: created, error } = await supabase
          .from("apprenants")
          .insert({
            prenom: row.prenom,
            nom: row.nom.toUpperCase(),
            email: row.email || null,
            telephone: row.telephone,
            adresse: row.adresse,
            code_postal: row.code_postal,
            ville: row.ville,
            type_apprenant: row.type_apprenant,
            formation_choisie: row.formation_choisie,
            montant_ttc: row.montant_ttc,
            statut: "inscrit",
            source_inscription: "import_excel",
            date_debut_formation: row.date_debut,
            date_fin_formation: row.date_fin,
            // Accès e-learning exactement sur les dates inscrites dans le tableur
            date_debut_cours_en_ligne: row.date_debut,
            date_fin_cours_en_ligne: row.date_fin,
          })
          .select()
          .single();

        if (error) throw error;

        // Mêmes emails que pour une inscription manuelle
        let emailsInfo = "Aucun email (email manquant)";
        if (row.email) {
          const mails = await sendInscriptionEmails({
            apprenantId: created.id,
            prenom: row.prenom,
            nom: row.nom.toUpperCase(),
            email: row.email,
            typeApprenant: row.type_apprenant,
            formationChoisie: row.formation_choisie,
            dateDebutFormation: row.date_debut,
          });
          const parts: string[] = [];
          if (mails.preInfoSent) parts.push("Pré-information");
          if (mails.bienvenueSent) parts.push("Bienvenue");
          emailsInfo = parts.length ? parts.join(" + ") : "Échec envoi";
        }

        if (row.date_debut && row.date_debut <= today) needCredentials = true;

        out.push({ ...row, status: "ok", emails: emailsInfo });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        out.push({ ...row, status: "erreur", message: msg });
      }
      setResults([...out]);
    }

    // Les accès e-learning déjà démarrés partent tout de suite,
    // les autres seront envoyés automatiquement à la date d'inscription.
    if (needCredentials) {
      try {
        await supabase.functions.invoke("auto-send-credentials", { body: {} });
      } catch (err) {
        console.error("Erreur envoi identifiants cours en ligne:", err);
      }
    }

    setImporting(false);
    const okCount = out.filter((r) => r.status === "ok").length;
    toast({
      title: "Import terminé",
      description: `${okCount}/${rows.length} apprenant(s) importé(s) — emails pré-information + bienvenue envoyés, accès cours en ligne programmés aux dates inscrites.`,
    });
    onImported?.();
  };

  const reset = () => {
    setRows([]);
    setResults([]);
    setFileName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!importing) {
          setOpen(v);
          if (!v) reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Importer un tableur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import d'apprenants (Excel / CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Colonnes reconnues : nom, prénom, email, téléphone, adresse, code postal, ville, type, formation, date début,
            date fin, montant. Chaque apprenant importé reçoit la <strong>lettre de pré-information</strong> et le{" "}
            <strong>dossier de bienvenue</strong>, et ses accès aux cours en ligne sont ouverts aux dates inscrites.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            disabled={importing}
          />

          {rows.length > 0 && (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
                <span className="font-medium">
                  {fileName} — {rows.length} ligne(s)
                </span>
                {results.length > 0 && (
                  <span className="text-muted-foreground">{results.length}/{rows.length} traitée(s)</span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y">
                {rows.map((r, i) => {
                  const res = results[i];
                  return (
                    <div key={`${r.nom}-${r.prenom}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {r.prenom} {r.nom.toUpperCase()}
                          {r.type_apprenant && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              {r.type_apprenant}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.email || "sans email"}
                          {r.date_debut ? ` · ${r.date_debut} → ${r.date_fin || "?"}` : " · dates manquantes"}
                          {res?.emails ? ` · ✉️ ${res.emails}` : ""}
                          {res?.message ? ` · ${res.message}` : ""}
                        </p>
                      </div>
                      {res ? (
                        res.status === "ok" ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )
                      ) : importing ? (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Fermer
            </Button>
            <Button onClick={handleImport} disabled={importing || rows.length === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Import en cours..." : `Importer ${rows.length} apprenant(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
