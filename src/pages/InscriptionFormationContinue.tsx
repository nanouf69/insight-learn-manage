import { useState, useEffect } from "react";
import { filterFutureByFin } from "@/lib/filterPastDates";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logoFtransport from "@/assets/logo-ftransport.png";

// Dates de formation continue disponibles
const datesFormationContinue = filterFutureByFin([
  { value: "2026-06-29", label: "29 - 30 juin 2026", fin: "2026-06-30" },
  { value: "2026-09-07", label: "7 - 8 septembre 2026", fin: "2026-09-08" },
  { value: "2026-11-02", label: "2 - 3 novembre 2026", fin: "2026-11-03" },
]);

type FormationType = "vtc" | "taxi";

const formationDetails: Record<FormationType, { label: string; prix: number; duree: string }> = {
  vtc: { label: "Formation Continue VTC", prix: 200, duree: "14h en présentiel" },
  taxi: { label: "Formation Continue TAXI", prix: 299, duree: "14h en présentiel" },
};

export default function InscriptionFormationContinue() {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type")?.toLowerCase() as FormationType | null;
  
  const [type, setType] = useState<FormationType>(typeParam === "taxi" ? "taxi" : "vtc");
  const [dateFormation, setDateFormation] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullDates, setFullDates] = useState<Record<string, boolean>>({});
  const [loadingDates, setLoadingDates] = useState(true);

  const MAX_PLACES = 16;

  // Check which dates are full
  useEffect(() => {
    const checkAvailability = async () => {
      setLoadingDates(true);
      const full: Record<string, boolean> = {};
      for (const d of datesFormationContinue) {
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, nom")
          .eq("date_debut", d.value)
          .eq("date_fin", d.fin)
          .eq("type_session", "theorique");

        const matchingSession = sessions?.find(s =>
          s.nom?.toLowerCase().includes("formation continue") &&
          s.nom?.toLowerCase().includes(type)
        );
        if (matchingSession) {
          const { count } = await supabase
            .from("session_apprenants")
            .select("id", { count: "exact", head: true })
            .eq("session_id", matchingSession.id);
          if ((count ?? 0) >= MAX_PLACES) {
            full[d.value] = true;
          }
        }
      }
      setFullDates(full);
      setLoadingDates(false);
      // If currently selected date is now full, deselect
      if (dateFormation && full[dateFormation]) {
        setDateFormation("");
      }
    };
    checkAvailability();
  }, [type]);

  const details = formationDetails[type];

  const canSubmit = prenom.trim() && nom.trim() && adresse.trim() && telephone.trim() && email.trim() && dateFormation && !fullDates[dateFormation];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const selectedDate = datesFormationContinue.find(d => d.value === dateFormation);
      if (!selectedDate) throw new Error("Date invalide");

      const formationChoisie = type === "vtc" ? "formation-continue-vtc" : "formation-continue-taxi";
      const typeApprenant = type === "vtc" ? "PA VTC" : "PA TAXI";

      // 1. Find or create a session FIRST (before creating apprenant)
      const sessionNom = `Formation Continue ${type.toUpperCase()} - ${selectedDate.label}`;

      const { data: existingSessions } = await supabase
        .from("sessions")
        .select("*")
        .eq("date_debut", selectedDate.value)
        .eq("date_fin", selectedDate.fin)
        .eq("type_session", "theorique");

      let sessionId: string;
      const matchingSession = existingSessions?.find(s =>
        s.nom?.toLowerCase().includes("formation continue") &&
        s.nom?.toLowerCase().includes(type)
      );

      if (matchingSession) {
        // Count REAL enrollments instead of trusting the counter
        const { count: realCount } = await supabase
          .from("session_apprenants")
          .select("id", { count: "exact", head: true })
          .eq("session_id", matchingSession.id);

        const actualEnrolled = realCount ?? 0;
        if (actualEnrolled >= MAX_PLACES) {
          throw new Error("Cette session est complète. Veuillez choisir une autre date.");
        }
        sessionId = matchingSession.id;
      } else {
        const { data: newSession, error: createErr } = await supabase
          .from("sessions")
          .insert({
            nom: sessionNom,
            date_debut: selectedDate.value,
            date_fin: selectedDate.fin,
            types_apprenant: [typeApprenant],
            places_disponibles: MAX_PLACES,
            statut: "planifiee",
            type_session: "theorique",
            lieu: "86 route de genas 69003 Lyon",
            heure_debut: "09:00",
            heure_fin: "17:00",
          })
          .select()
          .single();

        if (createErr) throw createErr;
        sessionId = newSession.id;
      }

      // 2. Create apprenant (only after session is confirmed available)
      const { data: apprenant, error: insertErr } = await supabase
        .from("apprenants")
        .insert({
          prenom: prenom.trim(),
          nom: nom.trim().toUpperCase(),
          adresse: adresse.trim(),
          date_naissance: dateNaissance || null,
          code_postal: codePostal.trim(),
          ville: ville.trim(),
          telephone: telephone.trim(),
          email: email.trim().toLowerCase(),
          formation_choisie: formationChoisie,
          type_apprenant: typeApprenant,
          montant_ttc: details.prix,
          montant_paye: 0,
          mode_financement: "personnel",
          statut: "particulier",
          date_debut_formation: selectedDate.value,
          date_fin_formation: selectedDate.fin,
          date_formation_catalogue: selectedDate.label,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 3. Link apprenant to session
      const { error: linkErr } = await supabase
        .from("session_apprenants")
        .insert({
          session_id: sessionId,
          apprenant_id: apprenant.id,
          montant_total: details.prix,
          montant_paye: 0,
          mode_financement: "personnel",
          date_debut: selectedDate.value,
          date_fin: selectedDate.fin,
        });

      if (linkErr) {
        console.error("Erreur liaison session_apprenants:", linkErr);
        throw new Error("Erreur lors de l'inscription à la session. Veuillez réessayer.");
      }

      // 4. Update places_disponibles to reflect real count
      const { count: updatedCount } = await supabase
        .from("session_apprenants")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);

      await supabase
        .from("sessions")
        .update({ places_disponibles: Math.max(0, MAX_PLACES - (updatedCount ?? 0)) })
        .eq("id", sessionId);

      // 5. Verify the link was created
      const { data: verifyLink } = await supabase
        .from("session_apprenants")
        .select("id")
        .eq("session_id", sessionId)
        .eq("apprenant_id", apprenant.id)
        .single();

      if (!verifyLink) {
        throw new Error("L'inscription n'a pas pu être confirmée. Veuillez réessayer.");
      }

      // 6. Save form data as completed document (devis FC)
      try {
        const selectedDateObj = datesFormationContinue.find(d => d.value === dateFormation);
        await supabase.functions.invoke("save-public-form", {
          body: {
            apprenantId: apprenant.id,
            typeDocument: "devis-formation-continue",
            titre: `Devis ${details.label} — ${selectedDateObj?.label || dateFormation}`,
            donnees: {
              type_formation: details.label,
              prix: `${details.prix}€ net de taxe`,
              duree: details.duree,
              date_formation: selectedDateObj?.label || dateFormation,
              lieu: "86 Route de Genas, 69003 Lyon",
              prenom: prenom.trim(),
              nom: nom.trim().toUpperCase(),
              date_naissance: dateNaissance || "Non renseignée",
              adresse: adresse.trim(),
              code_postal: codePostal.trim(),
              ville: ville.trim(),
              telephone: telephone.trim(),
              email: email.trim().toLowerCase(),
              date_inscription: new Date().toLocaleDateString("fr-FR"),
            },
          },
        });
      } catch (e) {
        console.warn("Sauvegarde devis FC dans formulaires échouée:", e);
      }

      console.log("✅ Inscription réussie:", { apprenantId: apprenant.id, sessionId, linkId: verifyLink.id, placesRestantes: Math.max(0, MAX_PLACES - (updatedCount ?? 0)) });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Erreur inscription:", err);
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardContent className="pt-8 text-center space-y-6">
            <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold">Demande d'inscription envoyée !</h1>
            <p className="text-muted-foreground">
              Merci <strong>{prenom}</strong>, votre demande d'inscription à la <strong>{details.label}</strong> a bien été prise en compte.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-left space-y-2">
              <p className="font-semibold text-blue-800">📧 En attente de confirmation</p>
              <p className="text-blue-700">
                Votre inscription ne sera <strong>définitivement validée</strong> qu'après réception d'un <strong>email de confirmation</strong> de notre part. 
                Veuillez vérifier votre boîte mail (et vos spams) dans les prochains jours.
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <p className="font-semibold text-primary">
                {datesFormationContinue.find(d => d.value === dateFormation)?.label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {details.duree} — {details.prix}€ net de taxe
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-left space-y-2">
              <p className="font-semibold text-amber-800">📋 Prochaines étapes :</p>
              <ul className="list-disc pl-5 text-amber-700 space-y-1">
                <li><strong>Attendez l'email de confirmation</strong> pour valider votre place</li>
                <li>Le règlement de <strong>{details.prix}€</strong> est à effectuer par virement bancaire</li>
                <li>Lieu : 86 Route de Genas, 69003 Lyon</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              📞 04.28.29.60.91 — 📧 contact@ftransport.fr
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-[#3b4f7a] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={logoFtransport} alt="Ftransport" className="h-12 bg-white rounded-lg p-1" />
            <div>
              <h1 className="text-xl font-bold">Réservation {details.label}</h1>
              <p className="text-sm opacity-90">Remplissez le formulaire ci-dessous pour réserver votre place</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-[#3b4f7a] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold">Devis et Inscription - {details.label}</h2>
                <p className="text-sm text-muted-foreground">
                  Formation de {details.duree} - {details.prix}€ net de taxe
                </p>
              </div>
            </div>

            {/* Type de formation */}
            <div className="space-y-2">
              <Label className="font-semibold">Type de formation</Label>
              <Select value={type} onValueChange={(v) => setType(v as FormationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vtc">Formation Continue VTC — 200€</SelectItem>
                  <SelectItem value="taxi">Formation Continue TAXI — 299€</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date de formation */}
            <div className="space-y-2">
              <h3 className="font-semibold border-b pb-2">Date de formation</h3>
              <Label>Sélectionnez vos dates <span className="text-red-500">*</span></Label>
              {loadingDates ? (
                <p className="text-sm text-muted-foreground">Chargement des disponibilités...</p>
              ) : (
                <Select value={dateFormation} onValueChange={setDateFormation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une date de formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {datesFormationContinue.map((d) => (
                      <SelectItem key={d.value} value={d.value} disabled={!!fullDates[d.value]}>
                        {d.label}{fullDates[d.value] ? " — 🔴 COMPLET" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Coordonnées du stagiaire */}
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Coordonnées du stagiaire</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prénom <span className="text-red-500">*</span></Label>
                  <Input placeholder="Votre prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Nom <span className="text-red-500">*</span></Label>
                  <Input placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Date de naissance</Label>
                <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Adresse personnelle <span className="text-red-500">*</span></Label>
                <Input placeholder="Votre adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Code postal</Label>
                  <Input placeholder="69000" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Ville</Label>
                  <Input placeholder="Lyon" value={ville} onChange={(e) => setVille(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Téléphone <span className="text-red-500">*</span></Label>
                  <Input type="tel" placeholder="06 00 00 00 00" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full bg-[#3b4f7a] hover:bg-[#2d3d5e] text-white py-6 text-lg"
            >
              {submitting ? "Envoi en cours..." : `Valider mon inscription — ${details.prix}€`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
