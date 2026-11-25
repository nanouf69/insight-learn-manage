import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { afficherPdfDansOnglet, ouvrirOngletPdf } from "@/lib/ouvrirPdfPrive";
import type { PreuveFichier } from "@/lib/qualiopi/data";

export interface CertificatPrestatairePreuve {
  titre: string;
  description: string | null;
  ce_que_demontre: string | null;
  date_preuve: string | null;
  valide_du: string | null;
  valide_au: string | null;
  fichiers: PreuveFichier[];
}

export function ndaDepuisCertificat(preuve: Pick<CertificatPrestatairePreuve, "ce_que_demontre"> | null | undefined): string | null {
  return preuve?.ce_que_demontre?.match(/\bNDA\s+(\d{11})\b/i)?.[1] ?? null;
}

function dateFr(iso: string | null): string {
  return iso ? iso.split("-").reverse().join("/") : "—";
}

function rappelJ90(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 90);
  return date.toISOString().slice(0, 10);
}

export function CertificatQualiopiPrestataire({ preuve }: { preuve: CertificatPrestatairePreuve }) {
  const [erreur, setErreur] = useState("");
  const fichier = preuve.fichiers?.[0];
  const nda = ndaDepuisCertificat(preuve);
  const rappel = rappelJ90(preuve.valide_au);

  const ouvrir = async () => {
    if (!fichier) return;
    const onglet = ouvrirOngletPdf();
    setErreur("");
    try {
      const { data, error } = await supabase.storage.from("qualiopi-preuves").createSignedUrl(fichier.path, 3600);
      if (error || !data?.signedUrl) throw new Error("Lien privé indisponible");
      await afficherPdfDansOnglet(onglet, data.signedUrl);
    } catch {
      onglet?.close();
      setErreur("Le certificat privé ne peut pas être ouvert. Aucun document n’a été modifié.");
    }
  };

  return <div className="space-y-3 rounded-md border border-primary/40 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Certificat Qualiopi du prestataire</h3>
      <Badge variant="outline">{fichier ? "Original vérifié — 2 pages" : "Référence enregistrée"}</Badge>
    </div>
    <p className="text-sm font-medium">{preuve.titre}</p>
    {preuve.description && <p className="whitespace-pre-wrap text-sm">{preuve.description}</p>}
    <p className="text-sm"><strong>NDA vérifié :</strong> {nda ?? "non lisible"}</p>
    <p className="text-sm"><strong>Validité :</strong> {dateFr(preuve.valide_du)} au {dateFr(preuve.valide_au)}, sous réserve de surveillance CERTIFOPAC.</p>
    <p className="text-xs text-muted-foreground">Preuve reçue le {dateFr(preuve.date_preuve)}. Original archivé en privé. Rappel d’expiration à J-90{rappel ? ` : ${dateFr(rappel)}` : ""}. Cette pièce ne suffit pas à déclarer I27 conforme.</p>
    {fichier && <Button size="sm" variant="outline" onClick={ouvrir}>Relire le certificat original</Button>}
    {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
  </div>;
}
