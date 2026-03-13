import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { sendAdminNotification } from "@/lib/sendAdminNotification";

interface CGVAcceptanceFormProps {
  apprenantId?: string;
  completed?: boolean;
  onComplete: () => void;
}

const CGV_SECTIONS = [
  {
    titre: "Objet",
    contenu: `Les présentes conditions générales de vente s'appliquent à l'ensemble des prestations de formation engagées par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhésion entière et sans réserve du Client aux présentes conditions générales de vente.`
  },
  {
    titre: "Définitions",
    contenu: `• CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation auprès de FTRANSPORT.
• STAGIAIRE : la personne physique qui participe à une formation.
• CGV : les conditions générales de vente, détaillées ci-dessous.
• OPCO : les opérateurs de compétences chargés de collecter et gérer l'effort de formation des entreprises.`
  },
  {
    titre: "Conditions financières, règlements et modalités de paiement",
    contenu: `Tous les prix sont indiqués en euros, toutes taxes comprises. Le règlement du prix de la formation est prélevé après le délai de rétractation et peut être échelonné dans le temps. Toute somme non payée à échéance entraîne de plein droit et sans mise en demeure préalable l'application de pénalités d'un montant égal à une fois et demie le taux d'intérêt légal.

FTRANSPORT aura la faculté d'obtenir le règlement par voie contentieuse aux frais du Client, sans préjudice des autres dommages et intérêts qui pourraient être dus à FTRANSPORT.

En cas de règlement par l'OPCO dont dépend le Client, il appartient au Client d'effectuer sa demande de prise en charge avant le début de la formation. L'accord de financement doit être communiqué au moment de l'inscription et sur l'exemplaire du devis que le Client retourne dûment renseigné, daté, tamponné, signé et revêtu de la mention « Bon pour accord » à FTRANSPORT.

En cas de prise en charge partielle par l'OPCO, la différence sera directement facturée par FTRANSPORT au Client. Si l'accord de prise en charge ne parvient pas à FTRANSPORT au plus tard un jour ouvrable avant le démarrage de la formation, FTRANSPORT se réserve la possibilité de refuser l'entrée en formation du Stagiaire ou de facturer la totalité des frais de formation au Client.`
  },
  {
    titre: "Dédit et remplacement d'un participant",
    contenu: `En cas de dédit signifié par le Client à FTRANSPORT au moins 7 jours avant le démarrage de la formation, FTRANSPORT offre au Client la possibilité de repousser l'inscription du Stagiaire à une formation ultérieure, dûment programmée par FTRANSPORT et après accord éventuel de l'OPCO.`
  },
  {
    titre: "Annulation, absence ou interruption d'une formation",
    contenu: `Tout module commencé est dû dans son intégralité et fera l'objet d'une facturation au Client par FTRANSPORT. En cas d'absence, d'interruption ou d'annulation, la facturation de FTRANSPORT distinguera le prix correspondant aux journées effectivement suivies par le Stagiaire et les sommes dues au titre des absences ou de l'interruption de la formation.

Les journées d'absence seront remboursées à partir du 8ème jour d'absence si toutefois le stagiaire fournit un justificatif tel qu'un certificat médical attestant les raisons de son absence.

Frais d'annulation (paiement personnel) :
• Annulation dans les 10 jours ouvrables après signature : aucun frais (rétractation par LRAR).
• Annulation après 10 jours ouvrables : frais égaux à 100 % du prix TTC de la formation.
• Ces frais ne s'appliquent pas si le stagiaire fournit un certificat médical.`
  },
  {
    titre: "Horaires et accueil",
    contenu: `Sauf indication contraire, la durée quotidienne des formations est fixée à sept heures. Les formations se déroulent de 9h00 à 12h00 et de 13h00 à 17h00, avec une pause en milieu de chaque demi-journée. Les locaux de FTRANSPORT accueillent les stagiaires de 9h00 à 13h00 et de 14h00 à 18h00.`
  },
  {
    titre: "Effectif et ajournement",
    contenu: `L'effectif de chaque formation est limité. Les inscriptions sont prises en compte dans leur ordre d'arrivée. Seuls les devis dûment renseignés, datés, tamponnés, signés et revêtus de la mention « Bon pour accord », retournés à FTRANSPORT et après encaissement du règlement, ont valeur contractuelle.`
  },
  {
    titre: "Obligations et force majeure",
    contenu: `FTRANSPORT est tenue à une obligation de moyen et non de résultat. En cas d'échec à l'examen théorique, le stagiaire devra s'acquitter des frais d'examen définis par la CMA. Aucun retour en classe ne sera possible, sauf décision du gérant.

En cas d'échec à l'examen pratique : frais d'examen CMA + location du véhicule (environ 200 € TTC).

FTRANSPORT ne pourra être tenue responsable en cas d'inexécution résultant d'un événement fortuit ou de force majeure (maladie, grèves, désastres naturels, etc.).

En cas d'impossibilité totale de réalisation, les élèves ayant financé personnellement seront remboursés au prorata des heures effectuées.`
  },
  {
    titre: "Propriété intellectuelle",
    contenu: `L'ensemble des contenus et supports pédagogiques utilisés par FTRANSPORT constituent des œuvres protégées. Le Client et le Stagiaire s'interdisent d'utiliser, transmettre, reproduire, exploiter ou transformer tout ou partie de ces documents, sans un accord exprès de FTRANSPORT.`
  },
  {
    titre: "Financement CPF — Règles essentielles",
    contenu: `Pour les stagiaires finançant via le CPF, les conditions de Mon Compte Formation s'appliquent :

• Obligation de suivre la formation dès expiration du délai de rétractation (14 jours).
• Annulation tardive (< 7 jours ouvrés avant le début) = perte de 100 % des droits CPF.
• Absence en présentiel = débit de 100 % du coût sur le compte CPF.
• Abandon = perte de 100 % des droits CPF, non remboursables.
• Annulation sans frais : pendant le délai de rétractation (14 jours) ou au moins 7 jours ouvrés avant le début.
• Participation forfaitaire obligatoire depuis le décret du 29 avril 2024 (sauf demandeurs d'emploi).`
  },
  {
    titre: "Descriptifs, objectifs et programme des formations",
    contenu: `La formation de chauffeur Taxi et de VTC a pour but de préparer les élèves aux examens théoriques et pratiques réalisés par la Chambre des métiers et de l'artisanat.

Prérequis : savoir lire et écrire, casier judiciaire B2 vierge.
Moyens pédagogiques : cours en ligne, cours et exercices durant la formation.
Évaluation : contrôles continus, examens blancs et corrections.
Effectif maximum : 21 stagiaires.

Formateurs :
• Madame Touil — 5+ ans d'expérience dans le transport de personnes
• Monsieur Guenichi — 5+ ans d'expérience dans le transport de personnes
• Monsieur Akono — niveau d'anglais supérieur au niveau C`
  },
  {
    titre: "Confidentialité et communication",
    contenu: `FTRANSPORT, le Client et le Stagiaire s'engagent à garder confidentiels les documents et informations accessibles au cours de la prestation. FTRANSPORT s'engage à ne pas communiquer les informations du Client à des tiers (hors partenaires et OPCO). Le Client accepte d'être cité comme client de FTRANSPORT.`
  },
  {
    titre: "Protection des données personnelles",
    contenu: `Conformément à la loi n° 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'accès, de modification et de rectification des données le concernant. Les données seront conservées au maximum 90 ans après la fin de la relation contractuelle. Demande d'effacement : contact@ftransport.fr`
  },
  {
    titre: "Droit applicable et juridiction compétente",
    contenu: `Les présentes CGV sont régies par le droit français. En cas de litige, il sera recherché une solution à l'amiable. À défaut, les tribunaux de Lyon seront seuls compétents.`
  },
];

export default function CGVAcceptanceForm({ apprenantId, completed, onComplete }: CGVAcceptanceFormProps) {
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(completed || false);

  useEffect(() => {
    if (!apprenantId) return;
    supabase
      .from("apprenant_documents_completes" as any)
      .select("id")
      .eq("apprenant_id", apprenantId)
      .eq("type_document", "cgv-acceptation")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAlreadyCompleted(true);
          onComplete();
        }
      });
  }, [apprenantId]);

  const handleSubmit = async () => {
    if (!accepted) {
      toast.error("Vous devez cocher la case pour accepter les CGV avant de continuer.");
      return;
    }
    setSaving(true);
    if (apprenantId) {
      const ok = await saveFormDocument({
        apprenantId,
        typeDocument: "cgv-acceptation",
        titre: "Conditions Générales de Vente — Acceptation",
        donnees: { accepted: true, accepted_at: new Date().toISOString() },
      });
      if (!ok) {
        toast.error("Erreur lors de l'enregistrement.");
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setAlreadyCompleted(true);
    toast.success("✅ CGV acceptées avec succès !");
    onComplete();
  };

  if (alreadyCompleted || completed) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-6 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <p className="font-semibold text-green-800">Conditions Générales de Vente acceptées ✅</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-xl font-bold text-center">📋 Conditions Générales de Vente</h3>
          <p className="text-sm text-muted-foreground text-center">
            FTRANSPORT — Organisme de formation professionnelle<br />
            86 route de Genas, 69003 Lyon — SIRET : 82346156100018
          </p>
          <p className="text-xs text-muted-foreground text-center italic">
            Les conditions ci-dessous s'appliquent aux stagiaires dont le financement est effectué hors CPF. Pour le CPF, les conditions de Mon Compte Formation s'appliquent (voir section dédiée).
          </p>

          <div className="max-h-[500px] overflow-y-auto border rounded-lg p-4 bg-muted/30 space-y-5">
            {CGV_SECTIONS.map((section, idx) => (
              <div key={idx}>
                <h4 className="font-bold text-sm mb-1">■ {section.titre}</h4>
                <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">
                  {section.contenu}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox
                id="cgv-accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="cgv-accept" className="text-sm cursor-pointer leading-relaxed">
                <span className="font-semibold">Je déclare avoir lu et accepté</span> les Conditions Générales de Vente de FTRANSPORT.
                J'ai pris connaissance des conditions d'annulation, de rétractation et des modalités de paiement.
              </label>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving || !accepted}
            className="w-full"
            size="lg"
          >
            {saving ? "Enregistrement…" : "✅ Valider et continuer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
