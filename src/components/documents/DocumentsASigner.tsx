import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Upload,
  Trash2,
  Send,
  Save,
  PenTool,
  Type,
  Hash,
  Copy,
  Loader2,
  FileSignature,
  CheckCircle2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CHAMP_COLORS,
  CHAMP_LABELS,
  ChampDocument,
  ChampType,
  defaultTaille,
  newChampId,
} from "@/lib/documentsASigner";
import { genererPdfRempli, telechargerPdf } from "@/lib/documentSigneDownload";


if (typeof (Promise as any).withResolvers === "undefined") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

try {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
} catch {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

interface DocRow {
  id: string;
  nom: string;
  file_path: string;
  champs: ChampDocument[];
  destinataire_nom: string | null;
  destinataire_email: string | null;
  token: string;
  statut: string;
  reponses: Record<string, string> | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
}


const PAGE_WIDTH = 720;

export function DocumentsASigner() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [selected, setSelected] = useState<DocRow | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [champs, setChamps] = useState<ChampDocument[]>([]);
  const [outil, setOutil] = useState<ChampType>("signature");
  const [email, setEmail] = useState("");
  const [nomDest, setNomDest] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const telechargerDocument = useCallback(
    async (doc: DocRow) => {
      setDownloadingId(doc.id);
      try {
        const { data, error } = await supabase.storage
          .from("documents-a-signer")
          .createSignedUrl(doc.file_path, 600);
        if (error || !data?.signedUrl) throw new Error(error?.message || "Document introuvable");

        const champsDoc = Array.isArray(doc.champs) ? doc.champs : [];
        const reponsesDoc = (doc.reponses || {}) as Record<string, string>;
        const bytes = await genererPdfRempli(data.signedUrl, champsDoc, reponsesDoc);
        const suffixe = doc.statut === "signe" ? "signe" : "vierge";
        telechargerPdf(bytes, `${doc.nom}_${suffixe}.pdf`);
      } catch (e: any) {
        toast({ title: "Téléchargement impossible", description: e.message, variant: "destructive" });
      } finally {
        setDownloadingId(null);
      }
    },
    [toast],
  );



  const chargerDocs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents_a_signer")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
    }
    setDocs(((data as any[]) || []) as DocRow[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    chargerDocs();
  }, [chargerDocs]);

  const ouvrirDoc = async (doc: DocRow) => {
    setSelected(doc);
    setChamps(Array.isArray(doc.champs) ? doc.champs : []);
    setEmail(doc.destinataire_email || "");
    setNomDest(doc.destinataire_nom || "");
    setCurrentPage(1);
    setFileUrl(null);
    const { data } = await supabase.storage
      .from("documents-a-signer")
      .createSignedUrl(doc.file_path, 3600);
    setFileUrl(data?.signedUrl || null);
  };

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Format non supporté", description: "Merci d'importer un fichier PDF.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("documents-a-signer")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("documents_a_signer")
        .insert({ nom: file.name.replace(/\.pdf$/i, ""), file_path: path, champs: [] })
        .select()
        .single();
      if (error) throw error;

      await chargerDocs();
      await ouvrirDoc(data as unknown as DocRow);
      toast({ title: "Document importé", description: "Placez maintenant les zones à remplir ou à signer." });
    } catch (e: any) {
      toast({ title: "Import impossible", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ajouterChamp = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-champ]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { w, h } = defaultTaille(outil);
    setChamps((prev) => [
      ...prev,
      {
        id: newChampId(),
        page: currentPage,
        x: Math.max(0, Math.min(100 - w, x - w / 2)),
        y: Math.max(0, Math.min(100 - h, y - h / 2)),
        w,
        h,
        type: outil,
        label: CHAMP_LABELS[outil],
        requis: true,
      },
    ]);
  };

  const deplacerChamp = (champ: ChampDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const wrap = pageWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = champ.x;
    const origY = champ.y;

    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      setChamps((prev) =>
        prev.map((c) =>
          c.id === champ.id
            ? {
                ...c,
                x: Math.max(0, Math.min(100 - c.w, origX + dx)),
                y: Math.max(0, Math.min(100 - c.h, origY + dy)),
              }
            : c,
        ),
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const enregistrer = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("documents_a_signer")
      .update({
        champs: champs as any,
        destinataire_email: email || null,
        destinataire_nom: nomDest || null,
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zones enregistrées" });
    chargerDocs();
  };

  const lienSignature = (token: string) => `${window.location.origin}/document-a-signer/${token}`;

  const envoyer = async () => {
    if (!selected) return;
    if (!email.trim()) {
      toast({ title: "Adresse email manquante", variant: "destructive" });
      return;
    }
    if (champs.length === 0) {
      toast({ title: "Aucune zone définie", description: "Ajoutez au moins une zone à remplir ou à signer.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error: upErr } = await supabase
        .from("documents_a_signer")
        .update({
          champs: champs as any,
          destinataire_email: email.trim(),
          destinataire_nom: nomDest || null,
          statut: "envoye",
          sent_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (upErr) throw upErr;

      const lien = lienSignature(selected.token);
      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          recipientEmail: email.trim(),
          recipientName: nomDest || email.trim(),
          subject: `Document à compléter et signer : ${selected.nom}`,
          htmlBody: `Bonjour ${nomDest || ""},<br><br>Merci de compléter et signer le document <strong>${selected.nom}</strong> en cliquant sur le lien sécurisé ci-dessous :<br><br><a href="${lien}">${lien}</a><br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91`,
        },
      });
      if (error) throw error;

      toast({ title: "Document envoyé", description: `Lien de signature envoyé à ${email}` });
      chargerDocs();
    } catch (e: any) {
      toast({ title: "Envoi impossible", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const supprimer = async (doc: DocRow) => {
    if (!window.confirm(`Supprimer « ${doc.nom} » ?`)) return;
    await supabase.storage.from("documents-a-signer").remove([doc.file_path]);
    await supabase.from("documents_a_signer").delete().eq("id", doc.id);
    if (selected?.id === doc.id) {
      setSelected(null);
      setFileUrl(null);
    }
    chargerDocs();
  };

  const champsPage = champs.filter((c) => c.page === currentPage);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Liste des documents */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <Button className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importer un PDF
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document. Importez un PDF pour commencer.</p>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => ouvrirDoc(doc)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selected?.id === doc.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {(Array.isArray(doc.champs) ? doc.champs.length : 0)} zone(s)
                    {doc.destinataire_email ? ` · ${doc.destinataire_email}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Télécharger le document (rempli et signé si disponible)"
                    disabled={downloadingId === doc.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      telechargerDocument(doc);
                    }}
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      supprimer(doc);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-2">
                {doc.statut === "signe" ? (
                  <Badge className="bg-success/15 text-success gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Signé
                  </Badge>
                ) : doc.statut === "envoye" ? (
                  <Badge variant="outline" className="text-warning border-warning">En attente de signature</Badge>
                ) : (
                  <Badge variant="secondary">Brouillon</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Éditeur */}
      {!selected ? (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-xl p-12 text-center text-muted-foreground">
          <FileSignature className="h-10 w-10 mb-3 opacity-50" />
          <p>Sélectionnez ou importez un document pour définir les zones à remplir et à signer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/40">
            <span className="text-sm font-medium mr-2">Zone à placer :</span>
            <Button variant={outil === "signature" ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setOutil("signature")}>
              <PenTool className="h-3.5 w-3.5" /> Signature
            </Button>
            <Button variant={outil === "texte" ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setOutil("texte")}>
              <Type className="h-3.5 w-3.5" /> Texte
            </Button>
            <Button variant={outil === "nombre" ? "default" : "outline"} size="sm" className="gap-1" onClick={() => setOutil("nombre")}>
              <Hash className="h-3.5 w-3.5" /> Chiffre
            </Button>
            <span className="text-xs text-muted-foreground ml-2">Cliquez sur le document pour poser la zone, glissez pour la déplacer.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="border rounded-lg overflow-auto bg-muted/30 p-4">
              {fileUrl ? (
                <Document
                  file={fileUrl}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  loading={<p className="text-sm text-muted-foreground">Chargement du PDF...</p>}
                >
                  <div ref={pageWrapRef} className="relative inline-block cursor-crosshair" onClick={ajouterChamp}>
                    <Page pageNumber={currentPage} width={PAGE_WIDTH} renderTextLayer={false} renderAnnotationLayer={false} />
                    {champsPage.map((c) => (
                      <div
                        key={c.id}
                        data-champ
                        onMouseDown={(e) => deplacerChamp(c, e)}
                        style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}
                        className={`absolute border-2 border-dashed rounded flex items-center justify-center text-[10px] font-medium cursor-move ${CHAMP_COLORS[c.type]}`}
                      >
                        {c.label}
                      </div>
                    ))}
                  </div>
                </Document>
              ) : (
                <p className="text-sm text-muted-foreground">Chargement du document...</p>
              )}

              {numPages > 1 && (
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    Précédent
                  </Button>
                  <span className="text-sm">Page {currentPage} / {numPages}</span>
                  <Button size="sm" variant="outline" disabled={currentPage >= numPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    Suivant
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Zones définies ({champs.length})</Label>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {champs.length === 0 && <p className="text-xs text-muted-foreground">Aucune zone pour le moment.</p>}
                  {champs.map((c) => (
                    <div key={c.id} className="p-2 rounded border text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{CHAMP_LABELS[c.type]} · p.{c.page}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setChamps((prev) => prev.filter((x) => x.id !== c.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        className="h-7 text-xs"
                        value={c.label}
                        onChange={(e) =>
                          setChamps((prev) => prev.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dest-nom">Nom du destinataire</Label>
                <Input id="dest-nom" value={nomDest} onChange={(e) => setNomDest(e.target.value)} placeholder="Nom Prénom" />
                <Label htmlFor="dest-email">Adresse email</Label>
                <Input id="dest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@email.com" />
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" className="gap-2" onClick={enregistrer} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
                </Button>
                <Button className="gap-2" onClick={envoyer} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer par email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(lienSignature(selected.token));
                    toast({ title: "Lien copié" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copier le lien de signature
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
