import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveFormDocument } from "@/lib/saveFormDocument";

interface CGVReglementFormProps {
  apprenantId?: string;
  apprenantNom?: string;
  apprenantPrenom?: string;
  apprenantAdresse?: string;
  completed?: boolean;
  onComplete: () => void;
}

// ── CGV ────────────────────────────────────────────────────
const CGV_SECTIONS = [
  {
    titre: "Objet",
    contenu: `Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente.`
  },
  {
    titre: "Definitions",
    contenu: `- CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT.
- STAGIAIRE : la personne physique qui participe a une formation.
- CGV : les conditions generales de vente, detaillees ci-dessous.
- OPCO : les operateurs de competences charges de collecter et gerer l'effort de formation des entreprises.`
  },
  {
    titre: "Conditions financieres, reglements et modalites de paiement",
    contenu: `Tous les prix sont indiques en euros, toutes taxes comprises. Le reglement du prix de la formation est preleve apres le delai de retractation et peut etre echelonne dans le temps. Toute somme non payee a echeance entraine de plein droit l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal.

En cas de reglement par l'OPCO dont depend le Client, il appartient au Client d'effectuer sa demande de prise en charge avant le debut de la formation. L'accord de financement doit etre communique au moment de l'inscription.

En cas de prise en charge partielle par l'OPCO, la difference sera directement facturee par FTRANSPORT au Client.`
  },
  {
    titre: "Dedit et remplacement d'un participant",
    contenu: `En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite de repousser l'inscription du Stagiaire a une formation ulterieure.`
  },
  {
    titre: "Annulation, absence ou interruption",
    contenu: `Tout module commence est du dans son integralite. Les journees d'absence seront remboursees a partir du 8eme jour d'absence avec justificatif medical.

Frais d'annulation (paiement personnel) :
- Annulation dans les 10 jours ouvrables apres signature : aucun frais (retractation par LRAR).
- Annulation apres 10 jours ouvrables : frais egaux a 100 % du prix TTC.
- Non applicable si le stagiaire fournit un certificat medical.`
  },
  {
    titre: "Horaires et accueil",
    contenu: `Duree quotidienne : 7 heures. Horaires : 9h00-12h00 et 13h00-17h00, avec pause en milieu de chaque demi-journee. Accueil : 9h00-13h00 et 14h00-18h00.`
  },
  {
    titre: "Obligations et force majeure",
    contenu: `FTRANSPORT est tenue a une obligation de moyen et non de resultat. En cas d'echec a l'examen theorique : frais d'examen CMA a la charge de l'eleve (environ 240 EUR). En cas d'echec a l'examen pratique : frais d'examen CMA + location vehicule (environ 200 EUR TTC).`
  },
  {
    titre: "Propriete intellectuelle",
    contenu: `L'ensemble des contenus et supports pedagogiques constituent des oeuvres protegees. Le Client et le Stagiaire s'interdisent d'utiliser, transmettre, reproduire ou exploiter ces documents sans accord expres de FTRANSPORT.`
  },
  {
    titre: "Financement CPF",
    contenu: `Pour les stagiaires financant via le CPF, les conditions de Mon Compte Formation s'appliquent :
- Obligation de suivre la formation des expiration du delai de retractation (14 jours).
- Annulation tardive (< 7 jours ouvres) = perte de 100 % des droits CPF.
- Absence en presentiel = debit de 100 % du cout sur le compte CPF.
- Abandon = perte de 100 % des droits CPF, non remboursables.
- Participation forfaitaire obligatoire depuis le decret du 29 avril 2024.`
  },
  {
    titre: "Protection des donnees personnelles",
    contenu: `Conformement a la loi n 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de modification et de rectification des donnees le concernant. Demande d'effacement : contact@ftransport.fr`
  },
  {
    titre: "Droit applicable",
    contenu: `Les presentes CGV sont regies par le droit francais. En cas de litige, les tribunaux de Lyon seront seuls competents.`
  },
];

// ── REGLEMENT INTERIEUR ────────────────────────────────────
const RI_ARTICLES = [
  { num: 1, titre: "Personnes concernees", contenu: "Le present reglement s'applique a toutes les personnes inscrites a une action de formation organisee par FTRANSPORT - Services Pro." },
  { num: 2, titre: "Conditions generales", contenu: "Toute personne en stage doit respecter le present reglement pour toutes les questions relatives a l'hygiene et securite, aux regles generales et permanentes et aux dispositions relatives aux droits de la defense du stagiaire." },
  { num: 3, titre: "Regles generales d'hygiene et de securite", contenu: "Chaque stagiaire doit veiller a sa securite personnelle et a celle des autres en respectant les consignes generales et particulieres de securite et d'hygiene en vigueur sur les lieux de stage." },
  { num: 4, titre: "Produits illicites et boissons alcoolisees", contenu: "Il est interdit de penetrer dans les locaux de formation avec des produits illicites ou des boissons alcoolisees, ou de sejourner en etat d'ivresse dans l'etablissement." },
  { num: 5, titre: "Consignes d'incendie", contenu: "Les consignes d'incendie et un plan de localisation des extincteurs et des issues de secours sont affiches dans les locaux. Tout stagiaire est tenu de respecter scrupuleusement les consignes relatives a la prevention des incendies." },
  { num: 6, titre: "Interdiction de fumer", contenu: "Il est strictement interdit de fumer dans les lieux affectes a un usage collectif ainsi que dans les salles de formation." },
  { num: 7, titre: "Tenue et comportement", contenu: "Les stagiaires sont invites a se presenter en tenue decente et a avoir un comportement correct. Il est formellement interdit de bavarder durant les heures de cours. L'usage du telephone portable est strictement interdit dans les salles de formation, sauf cas exceptionnel." },
  { num: 8, titre: "Horaires, absences et retards", contenu: "Les stagiaires doivent respecter les horaires de stage. En cas d'absence ou de retard, les stagiaires doivent avertir le formateur. Les stagiaires sont tenus de signer obligatoirement l'attestation de presence." },
  { num: 9, titre: "Entrees, sorties et deplacements", contenu: "Les stagiaires n'ont acces aux locaux que pour le deroulement des seances de formation. Sauf autorisation expresse, ils ne peuvent entrer ou demeurer dans l'etablissement a d'autres fins." },
  { num: 10, titre: "Usage du materiel et connexion internet", contenu: "Chaque stagiaire a l'obligation de conserver en bon etat le materiel qui lui est confie. L'utilisation du materiel ou d'une connexion internet a des fins personnelles est interdite." },
  { num: 11, titre: "Enregistrement et videosurveillance", contenu: "Il est formellement interdit d'enregistrer ou de filmer les seances de formation. L'etablissement est place sous videosurveillance pour la securite des personnes et des biens." },
  { num: 12, titre: "Methode pedagogique et documentation", contenu: "Les methodes pedagogiques et la documentation diffusees sont protegees au titre des droits d'auteur et ne peuvent etre reutilisees que pour un strict usage personnel." },
  { num: 13, titre: "Accident", contenu: "Tout accident ou incident survenu a l'occasion ou en cours de formation doit etre immediatement declare par le stagiaire accidente ou les temoins au responsable de la formation." },
  { num: 14, titre: "Information", contenu: "La publicite commerciale, la propagande politique, syndicale ou religieuse sont interdites dans l'enceinte de l'organisme." },
  { num: 15, titre: "Responsabilite en cas de vol", contenu: "L'organisme decline toute responsabilite en cas de perte, vol ou deterioration des objets personnels deposes par les stagiaires dans son enceinte." },
  { num: 16, titre: "Sanctions", contenu: "Tout manquement aux prescriptions du present reglement pourra faire l'objet d'une sanction : avertissement oral, exclusion temporaire ou exclusion definitive. L'exclusion ne pourra en aucun cas donner lieu au remboursement des sommes payees." },
  { num: 17, titre: "Procedure disciplinaire", contenu: "Aucune sanction ne peut etre infligee a un stagiaire sans que celui-ci ait ete informe au prealable des griefs retenus contre lui." },
  { num: 18, titre: "Representation des stagiaires", contenu: "Dans les stages d'une duree superieure a 200 heures, il est procede a l'election d'un delegue titulaire et d'un delegue suppleant au scrutin uninominal a deux tours." },
  { num: 19, titre: "Role des delegues", contenu: "Les delegues font toute suggestion pour ameliorer le deroulement des stages et les conditions de vie des stagiaires." },
  { num: 20, titre: "Entree en application", contenu: "Du gel hydroalcoolique est mis a disposition. Le present reglement interieur entre en application a compter du premier jour de formation." },
];

export default function CGVReglementForm({
  apprenantId,
  apprenantNom,
  apprenantPrenom,
  apprenantAdresse,
  completed,
  onComplete,
}: CGVReglementFormProps) {
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [riAccepted, setRiAccepted] = useState(false);
  const [nom, setNom] = useState(apprenantNom || "");
  const [prenom, setPrenom] = useState(apprenantPrenom || "");
  const [adresse, setAdresse] = useState(apprenantAdresse || "");
  const [dateSignature, setDateSignature] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(completed || false);

  useEffect(() => {
    if (!apprenantId) return;
    supabase
      .from("apprenant_documents_completes" as any)
      .select("id")
      .eq("apprenant_id", apprenantId)
      .eq("type_document", "cgv-ri-acceptation")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setAlreadyCompleted(true);
      });
  }, [apprenantId]);

  useEffect(() => {
    if (apprenantNom) setNom(apprenantNom);
    if (apprenantPrenom) setPrenom(apprenantPrenom);
    if (apprenantAdresse) setAdresse(apprenantAdresse);
  }, [apprenantNom, apprenantPrenom, apprenantAdresse]);

  const handleSubmit = async () => {
    if (!cgvAccepted || !riAccepted) {
      toast.error("Vous devez cocher les deux cases (CGV et Reglement interieur) pour continuer.");
      return;
    }
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Veuillez renseigner votre nom et prenom.");
      return;
    }
    setSaving(true);
    if (apprenantId) {
      const ok = await saveFormDocument({
        apprenantId,
        typeDocument: "cgv-ri-acceptation",
        titre: "CGV et Reglement Interieur - Signature",
        donnees: {
          cgv_accepted: true,
          ri_accepted: true,
          nom,
          prenom,
          adresse,
          date_signature: dateSignature,
          signed_at: new Date().toISOString(),
        },
      });
      if (!ok) {
        toast.error("Erreur lors de l'enregistrement.");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setAlreadyCompleted(true);
    toast.success("CGV et Reglement interieur signes avec succes !");
    onComplete();
  };

  if (alreadyCompleted || completed) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-6 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <p className="font-semibold text-green-800">CGV et Reglement Interieur signes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── CGV ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-xl font-bold text-center">Conditions Generales de Vente</h3>
          <p className="text-sm text-muted-foreground text-center">
            FTRANSPORT — 86 route de Genas, 69003 Lyon — SIRET : 82346156100018
          </p>
          <p className="text-xs text-muted-foreground text-center italic">
            Les conditions ci-dessous s'appliquent aux stagiaires dont le financement est effectue hors CPF.
          </p>

          <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-muted/30 space-y-4">
            {CGV_SECTIONS.map((s, i) => (
              <div key={i}>
                <h4 className="font-bold text-sm mb-1">{s.titre}</h4>
                <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">{s.contenu}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox
              id="cgv-accept"
              checked={cgvAccepted}
              onCheckedChange={(v) => setCgvAccepted(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="cgv-accept" className="text-sm cursor-pointer leading-relaxed">
              <span className="font-semibold">Je declare avoir lu et accepte</span> les Conditions Generales de Vente de FTRANSPORT.
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ── REGLEMENT INTERIEUR ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-xl font-bold text-center">Reglement Interieur</h3>
          <p className="text-xs text-muted-foreground text-center italic">
            Etabli conformement aux articles L.6352-3 a L.6352-5 et R.6352-1 a R.6352-15 du Code du travail.
          </p>

          <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-muted/30 space-y-3">
            {RI_ARTICLES.map((a) => (
              <div key={a.num}>
                <h4 className="font-bold text-sm mb-0.5">Article {a.num} — {a.titre}</h4>
                <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">{a.contenu}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Checkbox
              id="ri-accept"
              checked={riAccepted}
              onCheckedChange={(v) => setRiAccepted(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="ri-accept" className="text-sm cursor-pointer leading-relaxed">
              <span className="font-semibold">Je declare avoir lu et approuve</span> le Reglement Interieur de FTRANSPORT.
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ── SIGNATURE ── */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-bold">Signature</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Prenom</label>
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Adresse</label>
              <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={dateSignature} onChange={(e) => setDateSignature(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving || !cgvAccepted || !riAccepted}
            className="w-full"
            size="lg"
          >
            {saving ? "Enregistrement..." : "Signer et valider (Lu et approuve)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
