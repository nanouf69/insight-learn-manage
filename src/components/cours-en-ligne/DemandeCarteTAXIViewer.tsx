import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, FileText, Stethoscope, IdCard, AlertCircle, Download, HeartPulse } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import attestationHebergement from "@/assets/attestation-hebergement.pdf.asset.json";
import medecins01Ain from "@/assets/medecins/01-ain.pdf.asset.json";
import medecins38Isere from "@/assets/medecins/38-isere.pdf.asset.json";
import medecins69Rhone from "@/assets/medecins/69-rhone.pdf.asset.json";
import medecins73Savoie from "@/assets/medecins/73-savoie.pdf.asset.json";
import medecins74HauteSavoie from "@/assets/medecins/74-haute-savoie.pdf.asset.json";

interface Props {
  completed: boolean;
  onComplete: () => void;
}

const DOCUMENTS_OBLIGATOIRES: string[] = [
  "Copie du RECTO de la pièce d'identité en cours de validité",
  "Copie du VERSO de la pièce d'identité en cours de validité",
  "Copie du RECTO du permis de conduire en cours de validité",
  "Copie du VERSO du permis de conduire en cours de validité",
  "Copie du justificatif de domicile de moins de 3 mois",
  "Copie de la photo d'identité",
  "Copie de la signature",
  "Attestation de suivi de la formation continue TAXI en cours de validité, délivrée par un centre agréé",
  "Copie du certificat médical (CERFA n° 14880*02) délivré par un médecin agréé, avec la mention TAXI cochée et l'aptitude à la conduite de véhicules du « groupe lourd »",
  "Copie RECTO/VERSO de la carte professionnelle TAXI à renouveler",
];

const MEDECINS_AGREES_PAR_DEPARTEMENT: { dept: string; nom: string; url: string }[] = [
  { dept: "01", nom: "Ain", url: medecins01Ain.url },
  { dept: "38", nom: "Isère", url: medecins38Isere.url },
  { dept: "69", nom: "Rhône", url: medecins69Rhone.url },
  { dept: "73", nom: "Savoie", url: medecins73Savoie.url },
  { dept: "74", nom: "Haute-Savoie", url: medecins74HauteSavoie.url },
];

const resolveLinkUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
};

const LinkButton = ({
  url,
  children,
  className,
  variant,
  size,
}: {
  url: string;
  children: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}) => (
  <Button asChild variant={variant} size={size} className={className}>
    <a href={resolveLinkUrl(url)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  </Button>
);

export default function DemandeCarteTAXIViewer({ completed, onComplete }: Props) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <p className="text-sm text-muted-foreground">
        Le renouvellement de la carte professionnelle TAXI s'effectue auprès de la <strong>préfecture</strong>
        {" "}de votre département de résidence (ou de la préfecture de police pour Paris), après votre
        formation continue obligatoire.
      </p>

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
            Démarche officielle de renouvellement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            La demande de renouvellement s'effectue désormais en ligne via <strong>démarches-simplifiées.fr</strong>.
            Vérifiez également le site officiel de votre préfecture pour les modalités locales éventuelles.
          </p>
          <LinkButton
            url="https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-taxi-renouvellement"
            size="lg"
            className="bg-blue-700 hover:bg-blue-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Déposer ma demande sur démarches-simplifiées.fr
          </LinkButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IdCard className="h-5 w-5 text-emerald-700" />
            Documents à fournir
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

      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            Points de vigilance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>Anticipez : déposez votre demande au moins <strong>2 à 3 mois avant l'échéance</strong> de votre carte.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>La formation continue doit être suivie dans les <strong>5 ans</strong> précédant le renouvellement.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>La visite médicale doit dater de <strong>moins de 2 ans</strong> et mentionner la catégorie « groupe lourd » + case TAXI.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-700" />
            Liste des médecins agréés par département
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Le certificat médical doit être délivré par un <strong>médecin agréé par la préfecture</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MEDECINS_AGREES_PAR_DEPARTEMENT.map((d) => (
              <LinkButton key={d.dept} url={d.url} variant="outline" className="justify-start">
                <FileText className="h-4 w-4 mr-2" />
                {d.dept} — {d.nom}
              </LinkButton>
            ))}
          </div>
          <div className="pt-3 border-t border-emerald-200/60">
            <LinkButton url={attestationHebergement.url} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le modèle d'attestation d'hébergement
            </LinkButton>
          </div>
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
