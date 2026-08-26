import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, Download, Loader2, Save, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Grille de notation conduite (module pratique TAXI / VTC).
 * Chaque critère coché = élément NON assimilé par l'apprenant.
 * Le formateur conclut par un avis : favorable ou défavorable.
 */

type Formation = "vtc" | "taxi";

interface Critere {
  id: string;
  label: string;
  only?: Formation;
}

interface Theme {
  id: string;
  titre: string;
  criteres: Critere[];
}

const THEMES: Theme[] = [
  {
    id: "preparation",
    titre: "1. Préparation du poste de conduite",
    criteres: [
      { id: "reglages", label: "Ne fait pas ses réglages dans la voiture" },
      { id: "ceinture", label: "Ne demande pas aux passagers d'attacher leur ceinture" },
      { id: "gps", label: "Ne sait pas utiliser un GPS" },
    ],
  },
  {
    id: "maitrise",
    titre: "2. Maîtrise du véhicule",
    criteres: [
      { id: "clignotants", label: "Ne met pas les clignotants" },
      { id: "clignotant_direction", label: "Pas de clignotant lors des changements de direction" },
      { id: "volant", label: "Ne garde pas deux mains sur le volant" },
      { id: "trajectoire", label: "A une mauvaise trajectoire" },
      { id: "distances", label: "Ne respecte pas les distances de sécurité" },
      { id: "hesitation", label: "Hésitation ou ralentissement injustifié" },
      { id: "voie_droite", label: "Ne prend pas la voie de droite" },
    ],
  },
  {
    id: "reglementation",
    titre: "3. Respect de la réglementation et sécurité",
    criteres: [
      { id: "signalisation", label: "Ne respecte pas la signalisation" },
      { id: "stop", label: "Ne respecte pas le STOP ou STOP pas assez long" },
      { id: "ligne_continue", label: "Franchissement de la ligne continue" },
      { id: "vitesse", label: "Ne respecte pas la vitesse" },
      { id: "priorite_droite", label: "Ne respecte pas la priorité à droite" },
      { id: "pietons", label: "Ne laisse pas la priorité aux piétons" },
      { id: "angle_mort", label: "Ne regarde pas l'angle mort lors des changements de direction" },
      { id: "velos", label: "Ne fait pas attention aux vélos" },
    ],
  },
  {
    id: "ville",
    titre: "4. Connaissance de la ville",
    criteres: [
      { id: "ville", label: "Ne connaît pas suffisamment la ville" },
    ],
  },
  {
    id: "client",
    titre: "5. Relation client",
    criteres: [
      { id: "confort", label: "Ne se soucie pas du confort des clients" },
      { id: "reponses", label: "N'a pas une bonne qualité des réponses" },
      { id: "conges", label: "Ne dit pas la prise de congés" },
    ],
  },
  {
    id: "gestion",
    titre: "6. Gestion / administratif",
    criteres: [
      { id: "devis", label: "Ne remplit pas tout le devis (VTC)", only: "vtc" },
      { id: "tva", label: "Ne sait pas calculer la TVA" },
      { id: "taximetre", label: "Ne sait pas utiliser le taximètre (TAXI)", only: "taxi" },
      { id: "attente", label: "Ne sait pas calculer un temps d'attente (TAXI)", only: "taxi" },
    ],
  },
];

interface Props {
  apprenantId: string;
  apprenantNom: string;
  apprenantPrenom: string;
  formation: Formation;
  sessionId?: string;
  datePassage?: string;
  /** Lecture seule (vue apprenant) : aucune case cochable, aucun enregistrement. */
  readOnly?: boolean;
}

const GrilleNotationConduite = ({
  apprenantId,
  apprenantNom,
  apprenantPrenom,
  formation,
  sessionId,
  datePassage,
  readOnly = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [grilleId, setGrilleId] = useState<string | null>(null);
  const [coches, setCoches] = useState<Record<string, boolean>>({});
  const [passage, setPassage] = useState("");
  const [date, setDate] = useState(datePassage || new Date().toISOString().slice(0, 10));
  const [observations, setObservations] = useState("");
  const [evaluateur, setEvaluateur] = useState("");
  const [hasGrille, setHasGrille] = useState(false);
  const [grillesCount, setGrillesCount] = useState(0);
  const [avis, setAvis] = useState<"favorable" | "defavorable" | null>(null);
  const [tempsPreparation, setTempsPreparation] = useState("");
  const [formateurs, setFormateurs] = useState<{ id: string; nom: string; prenom: string }[]>([]);

  const themes = useMemo(
    () =>
      THEMES.map(t => ({
        ...t,
        criteres: t.criteres.filter(c => !c.only || c.only === formation),
      })).filter(t => t.criteres.length > 0),
    [formation]
  );

  const statsThemes = useMemo(() => {
    const result: Record<string, { nonAcquis: number; total: number }> = {};
    themes.forEach(t => {
      result[t.id] = {
        total: t.criteres.length,
        nonAcquis: t.criteres.filter(c => coches[c.id]).length,
      };
    });
    return result;
  }, [themes, coches]);


  const loadGrille = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("grilles_notation_conduite" as any)
        .select("*")
        .eq("apprenant_id", apprenantId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (sessionId) query = query.eq("session_id", sessionId);

      const { data, error } = await query;
      if (error) throw error;
      const row: any = data?.[0];
      if (row) {
        setGrilleId(row.id);
        setCoches((row.criteres as Record<string, boolean>) || {});
        setPassage(row.passage || "");
        setDate(row.date_passage || date);
        setObservations(row.observations || "");
        setEvaluateur(row.evaluateur || "");
        setAvis(row.avis === "favorable" || row.avis === "defavorable" ? row.avis : null);
        setHasGrille(true);
      }
    } catch (e) {
      console.error("[GrilleNotation] load error", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshCount = async () => {
    const { count } = await supabase
      .from("grilles_notation_conduite" as any)
      .select("id", { count: "exact", head: true })
      .eq("apprenant_id", apprenantId);
    setGrillesCount(count || 0);
    setHasGrille((count || 0) > 0);
  };

  useEffect(() => {
    refreshCount();
  }, [apprenantId]);

  // Liste des formateurs déjà inscrits (menu déroulant Évaluateur)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("formateurs")
        .select("id, nom, prenom")
        .order("nom");
      if (data) setFormateurs(data as any);
    };
    load();
  }, []);

  useEffect(() => {
    if (open) loadGrille();
  }, [open]);

  const saveGrille = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      apprenant_id: apprenantId,
      session_id: sessionId || null,
      date_passage: date,
      passage: passage || null,
      type_formation: formation,
      criteres: coches,
      notes_themes: statsThemes,
      avis: avis,
      observations: observations || null,
      evaluateur: evaluateur || null,
      created_by: user?.id || null,
    };

    if (grilleId) {
      const { error } = await supabase
        .from("grilles_notation_conduite" as any)
        .update(payload)
        .eq("id", grilleId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("grilles_notation_conduite" as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      setGrilleId((data as any)?.id || null);
    }
    await refreshCount();
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGrille();
      toast.success("Grille de notation enregistrée");
    } catch (e: any) {
      console.error("[GrilleNotation] save error", e);
      toast.error(`Erreur d'enregistrement : ${e?.message || "inconnue"}`);
    } finally {
      setSaving(false);
    }
  };

  /** Remet le formulaire à zéro pour saisir un nouveau passage. */
  const resetForm = () => {
    setGrilleId(null);
    setCoches({});
    setPassage("");
    setObservations("");
    setAvis(null);
    setDate(datePassage || new Date().toISOString().slice(0, 10));
  };

  const handleValiderEtEnvoyer = async () => {
    if (!avis) {
      toast.error("Indiquez d'abord l'avis final (favorable ou défavorable)");
      return;
    }
    setSending(true);
    try {
      await saveGrille();

      const { data: appr } = await supabase
        .from("apprenants")
        .select("email")
        .eq("id", apprenantId)
        .maybeSingle();
      const email = (appr as any)?.email;
      if (!email) {
        toast.error("Aucune adresse email pour cet apprenant");
        return;
      }

      const doc = await buildPdf();
      const b64 = doc.output("datauristring").split(",")[1];

      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          apprenantId,
          recipientEmail: email,
          recipientName: `${apprenantPrenom} ${apprenantNom}`,
          subject: `Grille d'évaluation pratique ${formation.toUpperCase()} — ${passage || "passage"}`,
          htmlBody: `<p>Bonjour ${apprenantPrenom} ${apprenantNom},</p><p>Veuillez trouver ci-joint votre grille d'évaluation de conduite du ${date}.</p><p>Avis du formateur : <strong>${avis === "favorable" ? "FAVORABLE" : "DÉFAVORABLE"}</strong>.</p><p>Cordialement,<br/>FTRANSPORT</p>`,
          attachmentName: `grille-notation-${apprenantNom}-${apprenantPrenom}.pdf`,
          attachmentBase64: b64,
          attachmentContentType: "application/pdf",
        },
      });
      if (error) throw error;

      toast.success(`Grille validée et envoyée à ${email}`);
      resetForm();
    } catch (e: any) {
      console.error("[GrilleNotation] send error", e);
      toast.error(`Erreur d'envoi : ${e?.message || "inconnue"}`);
    } finally {
      setSending(false);
    }
  };

  const buildPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 18;
    doc.setFontSize(16);
    doc.text("Grille de notation - Conduite", 105, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Candidat : ${apprenantPrenom} ${apprenantNom}`, 15, y);
    doc.text(`Formation : ${formation.toUpperCase()}`, 150, y);
    y += 6;
    doc.text(`Passage : ${passage || "-"}`, 15, y);
    doc.text(`Date : ${date}`, 150, y);
    y += 8;

    themes.forEach(t => {
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(t.titre, 15, y);
      doc.setFont("helvetica", "normal");
      y += 5.5;
      t.criteres.forEach(c => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`${coches[c.id] ? "[X]" : "[ ]"} ${c.label}`, 20, y);
        y += 5;
      });
      y += 2;
    });

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text(`Avis : ${avis === "favorable" ? "FAVORABLE" : avis === "defavorable" ? "DEFAVORABLE" : "-"}`, 15, y);
    doc.setFont("helvetica", "normal");
    y += 7;
    if (observations) {
      doc.text("Observations :", 15, y);
      y += 5;
      doc.text(doc.splitTextToSize(observations, 175), 20, y);
      y += 12;
    }
    doc.text(`Formateur : ${evaluateur || "-"}`, 15, y);
    y += 10;

    // --- Synthèse en rouge : éléments non assimilés ---
    const criteresNonAcquis = themes.flatMap(t =>
      t.criteres.filter(c => coches[c.id]).map(c => ({ theme: t.titre, label: c.label }))
    );

    if (y > 230) { doc.addPage(); y = 20; }
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Synthèse - Éléments non assimilés", 15, y);
    y += 7;
    doc.setFontSize(10);

    if (criteresNonAcquis.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("Aucun élément signalé comme non assimilé.", 15, y);
      y += 6;
    } else {
      doc.setFont("helvetica", "normal");
      doc.text(`${criteresNonAcquis.length} élément(s) non assimilé(s) :`, 15, y);
      y += 6;
      criteresNonAcquis.forEach(({ theme, label }) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const themeShort = theme.replace(/^\d+\.\s*/, "");
        const line = `- ${themeShort} : ${label}`;
        const split = doc.splitTextToSize(line, 175);
        doc.text(split, 20, y);
        y += 5 * split.length;
      });
    }

    y += 6;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
      `Avis final : ${avis === "favorable" ? "FAVORABLE" : avis === "defavorable" ? "DÉFAVORABLE" : "Non renseigné"}`,
      15,
      y
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    return doc;
  };

  const handlePdf = async () => {
    const doc = await buildPdf();
    doc.save(`grille-notation-${apprenantNom}-${apprenantPrenom}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 gap-1 text-xs ${hasGrille ? "border-emerald-400 text-emerald-700" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          Grille conduite
          {grillesCount > 0 && (
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {grillesCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            Grille de notation - Conduite ({formation.toUpperCase()})
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {grillesCount === 0
              ? "Aucune grille d'évaluation remplie pour cet apprenant"
              : `${grillesCount} grille${grillesCount > 1 ? "s" : ""} d'évaluation remplie${grillesCount > 1 ? "s" : ""}`}
          </p>
        </DialogHeader>


        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Candidat</Label>
                <Input value={`${apprenantPrenom} ${apprenantNom}`} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grille-passage">Passage</Label>
                <Select value={passage} onValueChange={setPassage} disabled={readOnly}>
                  <SelectTrigger id="grille-passage">
                    <SelectValue placeholder="Sélectionner le passage" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((p) => (
                      <SelectItem key={p} value={p}>Passage {p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grille-date">Date</Label>
                <Input id="grille-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} readOnly={readOnly} disabled={readOnly} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grille-evaluateur">Formateur</Label>
                <Select value={evaluateur} onValueChange={setEvaluateur} disabled={readOnly}>
                  <SelectTrigger id="grille-evaluateur">
                    <SelectValue placeholder="Choisir un formateur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formateurs.map((f) => (
                      <SelectItem key={f.id} value={`${f.prenom} ${f.nom}`}>
                        {f.prenom} {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {readOnly
                ? "Grille remplie par le formateur : les éléments cochés sont ceux non assimilés. Consultation uniquement."
                : "Cochez les éléments non assimilés par l'apprenant, puis indiquez votre avis final."}
            </p>

            {themes.map(theme => {
              const n = statsThemes[theme.id];
              return (
                <div key={theme.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <h3 className="font-semibold text-sm">{theme.titre}</h3>
                  </div>
                  <div className="space-y-2">
                    {theme.criteres.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`crit-${c.id}`}
                          checked={!!coches[c.id]}
                          onCheckedChange={(v) => setCoches(prev => ({ ...prev, [c.id]: !!v }))}
                          disabled={readOnly}
                        />
                        <Label htmlFor={`crit-${c.id}`} className="text-sm font-normal cursor-pointer leading-snug">
                          {c.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {n.nonAcquis > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {n.nonAcquis} élément(s) non assimilé(s) sur {n.total}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="space-y-1.5">
              <Label htmlFor="grille-obs">Observations</Label>
              <Textarea
                id="grille-obs"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                placeholder="Points à travailler, remarques du formateur..."
                readOnly={readOnly}
                disabled={readOnly}
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <span className="font-semibold text-sm">Avis final</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant={avis === "favorable" ? "default" : "outline"}
                  className={`flex-1 gap-2 ${avis === "favorable" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => !readOnly && setAvis("favorable")}
                  disabled={readOnly}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Favorable
                </Button>
                <Button
                  type="button"
                  variant={avis === "defavorable" ? "destructive" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => !readOnly && setAvis("defavorable")}
                  disabled={readOnly}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Défavorable
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {!readOnly && (
                <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer la grille
                </Button>
              )}
              <Button variant="outline" className="flex-1 gap-2" onClick={handlePdf}>
                <Download className="w-4 h-4" />
                Télécharger en PDF
              </Button>
            </div>

            {!readOnly && (
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleValiderEtEnvoyer}
                disabled={sending || saving}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Valider et envoyer à l'élève (puis remise à zéro)
              </Button>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GrilleNotationConduite;
