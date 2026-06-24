import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, FileText, Stethoscope, IdCard, AlertCircle, Stamp, Download } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import medecinsAin from "@/assets/medecins/01-ain.pdf.asset.json";
import medecinsIsere from "@/assets/medecins/38-isere.pdf.asset.json";
import medecinsRhone from "@/assets/medecins/69-rhone.pdf.asset.json";
import medecinsSavoie from "@/assets/medecins/73-savoie.pdf.asset.json";
import medecinsHauteSavoie from "@/assets/medecins/74-haute-savoie.pdf.asset.json";
import attestationHebergement from "@/assets/attestation-hebergement.pdf.asset.json";

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
  "Si vous êtes entré dans la profession depuis plus de 5 ans : attestation de suivi de la formation continue de conducteur de VTC en cours de validité, dispensée au sein d'un centre de formation agréé",
];

const DOCUMENTS_FACULTATIFS: string[] = [
  "Copie du RECTO de la carte professionnelle VTC à renouveler",
  "Copie du VERSO de la carte professionnelle VTC à renouveler",
  "Si VOL : déclaration de vol de la carte professionnelle délivrée par un commissariat",
  "Si hébergement par tiers : copie du RECTO de la pièce d'identité de l'hébergeant en cours de validité",
  "Si hébergement par tiers : copie du VERSO de la pièce d'identité de l'hébergeant en cours de validité",
  "Si hébergement par tiers : copie de l'attestation sur l'honneur de l'hébergeant",
  "Si hébergement par tiers : justificatif de domicile de l'hébergeant de moins de 3 mois",
  "Copie du certificat médical (CERFA n° 14880*01 ou 14880*02) établi depuis moins de 2 ans, délivré par un médecin agréé par une préfecture, avec la mention VTC cochée, ainsi que l'aptitude à la conduite de véhicules du « groupe lourd » pour le CERFA n° 14880*02",
];

// Liens directs vers les démarches de demande de carte VTC par département
const DEMANDES_CARTE_PAR_DEPARTEMENT: { dept: string; nom: string; url: string }[] = [
  {
    dept: "69",
    nom: "Rhône",
    url: "https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement",
  },
  {
    dept: "38",
    nom: "Isère",
    url: "https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement",
  },
  {
    dept: "42",
    nom: "Loire",
    url: "https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement",
  },
  {
    dept: "74",
    nom: "Haute-Savoie",
    url: "https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement",
  },
];

const resolveLinkUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
};

const openLink = (url: string) => {
  const finalUrl = resolveLinkUrl(url);
  const opened = window.open(finalUrl, "_blank");
  if (opened) {
    opened.opener = null;
  }
  if (!opened) {
    window.location.assign(finalUrl);
  }
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
  <Button
    type="button"
    variant={variant}
    size={size}
    className={className}
    onClick={() => openLink(url)}
  >
    {children}
  </Button>
);

export default function DemandeCarteVTCViewer({ completed, onComplete }: Props) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <p className="text-sm text-muted-foreground">
        Une fois votre formation continue VTC terminée, vous devez transmettre votre demande de renouvellement
        de carte professionnelle directement sur le portail officiel <strong>demarches-simplifiees.fr</strong>.
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
            Portail officiel de renouvellement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            La demande se fait <strong>uniquement en ligne</strong> via le portail officiel du Ministère :
          </p>
          <LinkButton
            url="https://www.demarches-simplifiees.fr/commencer/demande-de-carte-pro-de-vtc-renouvellement"
            size="lg"
            className="bg-blue-700 hover:bg-blue-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Accéder à la démarche en ligne
          </LinkButton>

          <div className="pt-2 space-y-2">
            <p className="text-sm font-medium">Liens directs par département :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMANDES_CARTE_PAR_DEPARTEMENT.map((d) => (
                <LinkButton key={d.dept} url={d.url} variant="outline" className="justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Cliquez ICI — {d.dept} {d.nom}
                </LinkButton>
              ))}
            </div>
          </div>
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

      <Card className="border-rose-200 bg-rose-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Stamp className="h-5 w-5 text-rose-700" />
            ⚠️ Spécifique département du Rhône (69)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Si vous habitez dans le <strong>Rhône (69)</strong>, une fois votre nouvelle carte professionnelle VTC
            reçue, vous devez faire <strong>tamponner votre certificat médical</strong> en passant par la démarche
            officielle dédiée :
          </p>
          <LinkButton
            url="https://www.demarches-simplifiees.fr/commencer/obligations-visite-medicale-ou-formation-continue-rhone"
            className="bg-rose-700 hover:bg-rose-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Faire tamponner mon certificat médical (Rhône)
          </LinkButton>
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
            Sélectionnez votre département pour consulter la liste officielle :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { dept: "01", nom: "Ain", url: medecinsAin.url },
              { dept: "38", nom: "Isère", url: medecinsIsere.url },
              { dept: "69", nom: "Rhône", url: medecinsRhone.url },
              { dept: "73", nom: "Savoie", url: medecinsSavoie.url },
              { dept: "74", nom: "Haute-Savoie", url: medecinsHauteSavoie.url },
            ].map((d) => (
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
          <p className="text-xs text-muted-foreground">
            Votre département ne figure pas dans la liste ? Contactez la préfecture de votre département
            pour obtenir la liste des médecins agréés.
          </p>
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
