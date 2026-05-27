import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, FileText, Stethoscope, IdCard, AlertCircle } from "lucide-react";

interface Props {
  completed: boolean;
  onComplete: () => void;
}

const DOCUMENTS_OBLIGATOIRES: string[] = [
  "Copie du RECTO de la pièce d'identité en cours de validité",
  "Copie du VERSO de la pièce d'identité en cours de validité",
  "Copie du RECTO du permis de conduire en cours de validité",
  "Copie du VERSO du permis de conduire en cours de validité",
  "Copie du justificatif de domicile du conducteur dans le département de moins de 3 mois",
  "Copie de la photo d'identité",
  "Copie de la signature",
  "Attestation de suivi de la formation continue de conducteur de VTC en cours de validité (délivrée à l'issue de votre formation)",
];

const DOCUMENTS_FACULTATIFS: string[] = [
  "Copie du RECTO de la carte professionnelle VTC à renouveler",
  "Copie du VERSO de la carte professionnelle VTC à renouveler",
  "En cas de VOL : déclaration de vol de la carte professionnelle délivrée par un commissariat",
  "Si hébergement par tiers : RECTO / VERSO pièce d'identité de l'hébergeant en cours de validité",
  "Si hébergement par tiers : attestation sur l'honneur de l'hébergeant",
  "Si hébergement par tiers : justificatif de domicile de l'hébergeant de moins de 3 mois",
  "Copie du certificat médical (CERFA n° 14880*01 ou 14880*02) délivré par un médecin agréé par la préfecture, depuis moins de 2 ans, mention VTC cochée (et aptitude « groupe lourd » pour le CERFA 14880*02)",
];

export default function DemandeCarteVTCViewer({ completed, onComplete }: Props) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Demande de renouvellement de la carte professionnelle VTC</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Une fois votre formation continue VTC terminée, vous devez transmettre votre demande de renouvellement
          de carte professionnelle directement sur le portail officiel <strong>demarches-simplifiees.fr</strong>.
        </p>
      </div>

      {completed && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">
          <CheckCircle2 className="h-4 w-4" />
          Module marqué comme consulté. Vous pouvez le revoir à tout moment.
        </div>
      )}

      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-700" />
            Portail officiel de renouvellement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            La demande se fait <strong>uniquement en ligne</strong> via le portail officiel du Ministère :
          </p>
          <Button asChild size="lg" className="bg-blue-700 hover:bg-blue-800">
            <a
              href="https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Accéder à la démarche en ligne
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IdCard className="h-5 w-5 text-emerald-700" />
            Documents obligatoires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {DOCUMENTS_OBLIGATOIRES.map((doc, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-700" />
            Documents facultatifs (selon votre situation)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {DOCUMENTS_FACULTATIFS.map((doc, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-700" />
            Liste des médecins agréés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Le certificat médical doit être délivré par un <strong>médecin agréé par la préfecture</strong>.
            Consultez la liste officielle ci-dessous pour trouver un médecin près de chez vous :
          </p>
          <Button asChild variant="outline" size="lg">
            <a
              href="/cours/vtc/Liste_medecins_agrees.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Télécharger la liste des médecins agréés (PDF)
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onComplete} size="lg" disabled={completed}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {completed ? "Module consulté ✓" : "J'ai pris connaissance — Marquer comme terminé"}
        </Button>
      </div>
    </div>
  );
}
