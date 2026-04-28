import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Loader2, Save, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  apprenantId?: string;
  apprenantNom?: string;
  apprenantPrenom?: string;
  apprenantEmail?: string;
  apprenantTelephone?: string;
  apprenantAdresse?: string;
  apprenantCodePostal?: string;
  apprenantVille?: string;
  completed: boolean;
  onComplete: () => void;
}

type TypeFinanceur = "particulier" | "professionnel";

export default function FinanceurFCForm({
  apprenantId,
  apprenantNom = "",
  apprenantPrenom = "",
  apprenantEmail = "",
  apprenantTelephone = "",
  apprenantAdresse = "",
  apprenantCodePostal = "",
  apprenantVille = "",
  completed,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [typeFinanceur, setTypeFinanceur] = useState<TypeFinanceur>("particulier");
  const [raisonSociale, setRaisonSociale] = useState("");
  const [siren, setSiren] = useState("");
  const [siret, setSiret] = useState("");
  const [numeroTva, setNumeroTva] = useState("");
  const [adresse, setAdresse] = useState(apprenantAdresse);
  const [codePostal, setCodePostal] = useState(apprenantCodePostal);
  const [ville, setVille] = useState(apprenantVille);
  const [contactNom, setContactNom] = useState(`${apprenantPrenom} ${apprenantNom}`.trim());
  const [contactEmail, setContactEmail] = useState(apprenantEmail);
  const [contactTelephone, setContactTelephone] = useState(apprenantTelephone);
  const [organismeFinanceur, setOrganismeFinanceur] = useState("");
  const [numeroDossier, setNumeroDossier] = useState("");
  const [emailFacturation, setEmailFacturation] = useState(apprenantEmail);
  const [notes, setNotes] = useState("");

  // Charger les données existantes
  useEffect(() => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("financeurs_fc" as any)
        .select("*")
        .eq("apprenant_id", apprenantId)
        .maybeSingle();
      if (!error && data) {
        const r: any = data;
        setRecordId(r.id);
        setTypeFinanceur((r.type_financeur as TypeFinanceur) || "particulier");
        setRaisonSociale(r.raison_sociale ?? "");
        setSiren(r.siren ?? "");
        setSiret(r.siret ?? "");
        setNumeroTva(r.numero_tva ?? "");
        setAdresse(r.adresse ?? apprenantAdresse);
        setCodePostal(r.code_postal ?? apprenantCodePostal);
        setVille(r.ville ?? apprenantVille);
        setContactNom(r.contact_nom ?? `${apprenantPrenom} ${apprenantNom}`.trim());
        setContactEmail(r.contact_email ?? apprenantEmail);
        setContactTelephone(r.contact_telephone ?? apprenantTelephone);
        setOrganismeFinanceur(r.organisme_financeur ?? "");
        setNumeroDossier(r.numero_dossier ?? "");
        setEmailFacturation(r.email_facturation ?? apprenantEmail);
        setNotes(r.notes ?? "");
      }
      setLoading(false);
    })();
  }, [apprenantId]);

  const isPro = typeFinanceur === "professionnel";

  const validate = (): string | null => {
    if (!contactNom.trim()) return "Le nom du contact est obligatoire.";
    if (!contactEmail.trim()) return "L'email du contact est obligatoire.";
    if (!adresse.trim() || !codePostal.trim() || !ville.trim()) return "L'adresse complète est obligatoire.";
    if (isPro) {
      if (!raisonSociale.trim()) return "La raison sociale est obligatoire pour un professionnel.";
      if (!siret.trim() && !siren.trim()) return "Le SIREN ou SIRET est obligatoire pour un professionnel.";
    }
    return null;
  };

  const handleSave = async () => {
    if (!apprenantId) {
      toast.error("Apprenant introuvable");
      return;
    }
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Non authentifié");

      const payload: any = {
        apprenant_id: apprenantId,
        user_id: uid,
        type_financeur: typeFinanceur,
        raison_sociale: isPro ? raisonSociale.trim() : null,
        siren: isPro ? siren.trim() || null : null,
        siret: isPro ? siret.trim() || null : null,
        numero_tva: isPro ? numeroTva.trim() || null : null,
        adresse: adresse.trim(),
        code_postal: codePostal.trim(),
        ville: ville.trim(),
        contact_nom: contactNom.trim(),
        contact_email: contactEmail.trim(),
        contact_telephone: contactTelephone.trim() || null,
        organisme_financeur: isPro ? organismeFinanceur.trim() || null : null,
        numero_dossier: numeroDossier.trim() || null,
        email_facturation: emailFacturation.trim() || contactEmail.trim(),
        notes: notes.trim() || null,
      };

      const { data, error } = await supabase
        .from("financeurs_fc" as any)
        .upsert(payload, { onConflict: "apprenant_id" })
        .select()
        .single();

      if (error) throw error;
      setRecordId((data as any)?.id ?? recordId);
      toast.success("Informations financeur enregistrées ✓");
      onComplete();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Informations du financeur</h2>
        <p className="text-sm text-muted-foreground">
          Renseignez les informations de facturation. Elles seront utilisées pour générer votre facture.
        </p>
      </div>

      {completed && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">
          <CheckCircle2 className="h-4 w-4" />
          Vos informations ont été enregistrées. Vous pouvez les modifier à tout moment.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type de financeur</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={typeFinanceur}
            onValueChange={(v) => setTypeFinanceur(v as TypeFinanceur)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <label
              htmlFor="fin-part"
              className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer ${
                typeFinanceur === "particulier" ? "border-primary bg-primary/5" : ""
              }`}
            >
              <RadioGroupItem value="particulier" id="fin-part" className="mt-1" />
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Particulier
                </div>
                <div className="text-sm text-muted-foreground">
                  Personne physique finançant à titre personnel
                </div>
              </div>
            </label>
            <label
              htmlFor="fin-pro"
              className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer ${
                typeFinanceur === "professionnel" ? "border-primary bg-primary/5" : ""
              }`}
            >
              <RadioGroupItem value="professionnel" id="fin-pro" className="mt-1" />
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Professionnel
                </div>
                <div className="text-sm text-muted-foreground">
                  Entreprise, OPCO, organisme financeur
                </div>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {isPro && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Raison sociale *</Label>
              <Input value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SIREN</Label>
                <Input value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="9 chiffres" />
              </div>
              <div className="space-y-2">
                <Label>SIRET</Label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="14 chiffres" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>N° TVA Intracommunautaire</Label>
              <Input value={numeroTva} onChange={(e) => setNumeroTva(e.target.value)} placeholder="FRXX999999999" />
            </div>
            <div className="space-y-2">
              <Label>Organisme financeur (OPCO, etc.)</Label>
              <Input
                value={organismeFinanceur}
                onChange={(e) => setOrganismeFinanceur(e.target.value)}
                placeholder="Ex : OPCO Mobilités, AKTO, FAFTT…"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adresse de facturation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adresse *</Label>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code postal *</Label>
              <Input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ville *</Label>
              <Input value={ville} onChange={(e) => setVille(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact pour la facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du contact *</Label>
            <Input value={contactNom} onChange={(e) => setContactNom(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email du contact *</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={contactTelephone} onChange={(e) => setContactTelephone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email pour réception de la facture</Label>
            <Input
              type="email"
              value={emailFacturation}
              onChange={(e) => setEmailFacturation(e.target.value)}
              placeholder="Si différent de l'email du contact"
            />
          </div>
          <div className="space-y-2">
            <Label>N° de dossier (si applicable)</Label>
            <Input value={numeroDossier} onChange={(e) => setNumeroDossier(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes / Précisions</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer les informations
        </Button>
      </div>
    </div>
  );
}
