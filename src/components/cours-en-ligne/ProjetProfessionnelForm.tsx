import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Download } from "lucide-react";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { toast } from "sonner";

interface Props {
  apprenantNom?: string;
  apprenantPrenom?: string;
  apprenantEmail?: string;
  apprenantTelephone?: string;
  apprenantAdresse?: string;
  apprenantDateNaissance?: string;
  apprenantType?: string;
  apprenantId?: string;
  onComplete: () => void;
  completed?: boolean;
  isAdmin?: boolean;
}

type RadioAnswer = string | null;

export default function ProjetProfessionnelForm({
  apprenantNom = "",
  apprenantPrenom = "",
  apprenantEmail = "",
  apprenantTelephone = "",
  apprenantAdresse = "",
  apprenantDateNaissance = "",
  apprenantType = "",
  apprenantId = "",
  onComplete,
  completed,
  isAdmin = false,
}: Props) {
  const isTaxi = apprenantType.toUpperCase().includes("TAXI") || apprenantType.toUpperCase() === "TA";
  const formType = isTaxi ? "TAXI" : "VTC";
  const refDoc = isTaxi ? "FT-QPP-TAXI-01" : "FT-QPP-VTC-01";
  const rsCode = isTaxi ? "RS5637" : "RS5635";
  const pdfUrl = isTaxi
    ? "/cours/vtc/01_Questionnaire_Projet_Professionnel_TAXI.pdf"
    : "/cours/vtc/01_Questionnaire_Projet_Professionnel_VTC.pdf";

  // Section 1 - Identification (pre-filled, read-only for student)
  const [dateEntretien, setDateEntretien] = useState(new Date().toISOString().slice(0, 10));
  const [conseiller, setConseiller] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");

  // Section 2 - Situation professionnelle
  const [statutActuel, setStatutActuel] = useState<RadioAnswer>(null);
  const [metierActuel, setMetierActuel] = useState("");
  const [anciennete, setAnciennete] = useState("");
  const [niveauFormation, setNiveauFormation] = useState("");

  // Section 3 - Projet professionnel
  const [motivations, setMotivations] = useState("");
  const [dejaTransport, setDejaTransport] = useState<RadioAnswer>(null);
  const [detailTransport, setDetailTransport] = useState("");
  const [permis3ans, setPermis3ans] = useState<RadioAnswer>(null);
  const [datePermis, setDatePermis] = useState("");

  // VTC specific
  const [modeExercice, setModeExercice] = useState<RadioAnswer>(null);
  const [plateformes, setPlateformes] = useState<Record<string, boolean>>({});
  
  // TAXI specific
  const [diffTaxiVtc, setDiffTaxiVtc] = useState<RadioAnswer>(null);
  const [modeExerciceTaxi, setModeExerciceTaxi] = useState<RadioAnswer>(null);
  const [demandeADS, setDemandeADS] = useState<RadioAnswer>(null);
  const [zoneExercice, setZoneExercice] = useState<RadioAnswer>(null);
  const [zoneAutre, setZoneAutre] = useState("");
  const [activitesCompl, setActivitesCompl] = useState<RadioAnswer>(null);
  
  // Common
  const [demarchesEntreprise, setDemarchesEntreprise] = useState<RadioAnswer>(null);
  const [craintes, setCraintes] = useState("");

  // Section 4 - Connaissance formation / territoire
  const [commentConnu, setCommentConnu] = useState<RadioAnswer>(null);
  const [consulteProgram, setConsulteProgram] = useState<RadioAnswer>(null);
  const [saitExamen, setSaitExamen] = useState<RadioAnswer>(null);
  
  // TAXI territory
  const [connaitZone, setConnaitZone] = useState<RadioAnswer>(null);
  const [conduiteUrbaine, setConduiteUrbaine] = useState<RadioAnswer>(null);
  const [connaitSites, setConnaitSites] = useState<RadioAnswer>(null);

  // Section 5 - Financement
  const [modeFinancement, setModeFinancement] = useState<RadioAnswer>(null);
  const [soldeCPF, setSoldeCPF] = useState("");
  const [disponibilite, setDisponibilite] = useState("");
  const [delaiExamen, setDelaiExamen] = useState("");
  const [contraintes, setContraintes] = useState("");

  // Section 6 - Besoins spécifiques
  const [besoinsAdaptation, setBesoinsAdaptation] = useState<RadioAnswer>(null);
  const [accesOrdinateur, setAccesOrdinateur] = useState<RadioAnswer>(null);
  const [precisionsBesoins, setPrecisionsBesoins] = useState("");

  // Section 7 - Avis conseiller (admin only)
  const [coherenceProjet, setCoherenceProjet] = useState<RadioAnswer>(null);
  const [niveauMotivation, setNiveauMotivation] = useState<RadioAnswer>(null);
  const [observations, setObservations] = useState("");
  const [signatureAdmin, setSignatureAdmin] = useState(false);

  if (completed) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-5 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <p className="font-semibold text-green-800">Questionnaire Projet Professionnel {formType} complété ✓</p>
        </CardContent>
      </Card>
    );
  }

  const RadioGroup = ({ options, value, onChange }: { options: string[]; value: RadioAnswer; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer bg-muted/50 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
          <Checkbox checked={value === opt} onCheckedChange={() => onChange(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );

  const SectionTitle = ({ num, title }: { num: number; title: string }) => (
    <h4 className="font-bold text-sm text-primary border-b pb-2">{num}. {title}</h4>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-5 text-center space-y-1">
          <h3 className="font-bold text-lg">QUESTIONNAIRE PROJET PROFESSIONNEL</h3>
          <p className="text-sm font-medium text-primary">Formation {formType} — {rsCode}</p>
          <p className="text-xs text-muted-foreground">Réf. : {refDoc} | SIRET : 82346156100018 | N° déclaration : 84 69 15114 69</p>
          <p className="text-xs text-muted-foreground mt-2">Ce questionnaire permet d'évaluer la motivation, le projet professionnel et l'adéquation avec la formation.</p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-1" /> Télécharger le PDF
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* 1. Identification */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={1} title="IDENTIFICATION DU CANDIDAT" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input value={apprenantNom} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Prénom</Label>
              <Input value={apprenantPrenom} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date de naissance</Label>
              <Input value={apprenantDateNaissance} disabled className="bg-muted/30" />
            </div>
            {isTaxi && (
              <div>
                <Label className="text-xs text-muted-foreground">Lieu de naissance</Label>
                <Input value={lieuNaissance} onChange={e => setLieuNaissance(e.target.value)} placeholder="Ville de naissance" />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Adresse</Label>
              <Input value={apprenantAdresse} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Téléphone</Label>
              <Input value={apprenantTelephone} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input value={apprenantEmail} disabled className="bg-muted/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date de l'entretien</Label>
              <Input type="date" value={dateEntretien} onChange={e => setDateEntretien(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Conseiller / Formateur</Label>
              <Input value={conseiller} onChange={e => setConseiller(e.target.value)} placeholder="Nom du conseiller" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Situation professionnelle */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={2} title="SITUATION PROFESSIONNELLE ACTUELLE" />
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Statut actuel</Label>
              <RadioGroup options={["Salarié(e)", "Indépendant(e)", "Demandeur d'emploi", "Étudiant(e)"]} value={statutActuel} onChange={setStatutActuel} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Métier / Secteur actuel</Label>
                <Input value={metierActuel} onChange={e => setMetierActuel(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ancienneté dans le poste</Label>
                <Input value={anciennete} onChange={e => setAnciennete(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Niveau de formation</Label>
                <Input value={niveauFormation} onChange={e => setNiveauFormation(e.target.value)} placeholder="Bac, Bac+2, sans diplôme..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Projet professionnel */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={3} title={`PROJET PROFESSIONNEL ${formType}`} />
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pourquoi souhaitez-vous devenir conducteur {formType.toLowerCase()} ? <span className="text-destructive">*</span></Label>
              <Textarea value={motivations} onChange={e => setMotivations(e.target.value)} rows={3} placeholder="J'aime le contact avec la clientèle, j'aime conduire, j'aime me rendre utile, je souhaite travailler avec des malades..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Avez-vous déjà exercé une activité de transport de personnes ? <span className="text-destructive">*</span></Label>
              <RadioGroup options={["Oui", "Non"]} value={dejaTransport} onChange={setDejaTransport} />
              {dejaTransport === "Oui" && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Précisez (type, durée, employeur)</Label>
                  <Textarea value={detailTransport} onChange={e => setDetailTransport(e.target.value)} rows={2} />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Permis de conduire depuis plus de 3 ans ? <span className="text-destructive">*</span></Label>
              <RadioGroup options={["Oui", "Non"]} value={permis3ans} onChange={setPermis3ans} />
              {permis3ans === "Non" && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Date d'obtention du permis</Label>
                  <Input type="date" value={datePermis} onChange={e => setDatePermis(e.target.value)} />
                </div>
              )}
            </div>

            {isTaxi && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Connaissez-vous la différence entre le taxi et le VTC ? <span className="text-destructive">*</span></Label>
                  <RadioGroup options={["Oui – je connais bien", "Partiellement", "Non – besoin d'explications"]} value={diffTaxiVtc} onChange={setDiffTaxiVtc} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Mode d'exercice envisagé après l'obtention de la carte taxi ? <span className="text-destructive">*</span></Label>
                  <RadioGroup options={["Exploitant indépendant", "Locataire d'ADS", "Salarié(e) d'une compagnie", "Pas encore décidé"]} value={modeExerciceTaxi} onChange={setModeExerciceTaxi} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Avez-vous envisagé de demander une ADS ?</Label>
                  <RadioGroup options={["Oui – liste d'attente", "Oui – déjà contactée", "Oui – à faire", "Non – location prévue", "Je ne sais pas"]} value={demandeADS} onChange={setDemandeADS} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Zone d'exercice envisagée ?</Label>
                  <RadioGroup options={["Métropole de Lyon", "Autre", "Pas encore décidé"]} value={zoneExercice} onChange={setZoneExercice} />
                  {zoneExercice === "Autre" && (
                    <div className="mt-2">
                      <Input value={zoneAutre} onChange={e => setZoneAutre(e.target.value)} placeholder="Précisez la zone" />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Activités complémentaires au taxi ?</Label>
                  <RadioGroup options={["Oui – TAP", "Oui – services réguliers", "Non", "Je ne sais pas"]} value={activitesCompl} onChange={setActivitesCompl} />
                </div>
              </>
            )}

            {!isTaxi && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Mode d'exercice envisagé après la certification ?</Label>
                  <RadioGroup options={["Salarié VTC", "Indépendant (SASU/EI)", "Les deux", "Pas encore décidé"]} value={modeExercice} onChange={setModeExercice} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Plateformes envisagées</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Uber", "Bolt", "Heetch", "Autre"].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer bg-muted/50 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Checkbox checked={!!plateformes[p]} onCheckedChange={() => setPlateformes(prev => ({ ...prev, [p]: !prev[p] }))} />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Démarches pour créer votre entreprise ?</Label>
              <RadioGroup options={["Oui – en cours", "Oui – déjà créée", "Non – besoin d'infos", "Non – pas encore"]} value={demarchesEntreprise} onChange={setDemarchesEntreprise} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Principales craintes ou difficultés anticipées</Label>
              <Textarea value={craintes} onChange={e => setCraintes(e.target.value)} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Connaissance formation/territoire */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={4} title={isTaxi ? "CONNAISSANCE DU TERRITOIRE" : "CONNAISSANCE DE LA FORMATION"} />
          <div className="space-y-3">
            {!isTaxi && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Comment avez-vous connu FTRANSPORT ?</Label>
                  <RadioGroup options={["Internet / Site web", "Bouche à oreille", "France Travail", "Réseaux sociaux"]} value={commentConnu} onChange={setCommentConnu} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Avez-vous consulté le programme de formation ?</Label>
                  <RadioGroup options={["Oui – en détail", "Oui – rapidement", "Non"]} value={consulteProgram} onChange={setConsulteProgram} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Savez-vous ce qu'implique l'examen {rsCode} ?</Label>
                  <RadioGroup options={["Oui – bien informé(e)", "Partiellement", "Non – besoin d'explications"]} value={saitExamen} onChange={setSaitExamen} />
                </div>
              </>
            )}
            {isTaxi && (
              <>
                <p className="text-xs text-muted-foreground italic">La connaissance du territoire est une épreuve spécifique à l'examen taxi.</p>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Connaissez-vous bien la zone d'exercice ?</Label>
                  <RadioGroup options={["Très bien", "Correctement", "Peu", "Pas du tout"]} value={connaitZone} onChange={setConnaitZone} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Expérience de conduite en milieu urbain dense ?</Label>
                  <RadioGroup options={["Oui – régulière", "Oui – occasionnelle", "Non"]} value={conduiteUrbaine} onChange={setConduiteUrbaine} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Connaissance des sites et bâtiments publics de Lyon ?</Label>
                  <RadioGroup options={["Bonne connaissance", "Partiellement", "Non – à apprendre"]} value={connaitSites} onChange={setConnaitSites} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Financement et disponibilité */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={5} title="FINANCEMENT ET DISPONIBILITÉ" />
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Mode de financement</Label>
              <RadioGroup options={["CPF", "France Travail", "Financement personnel", "Autre"]} value={modeFinancement} onChange={setModeFinancement} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Solde CPF estimatif (€)</Label>
                <Input value={soldeCPF} onChange={e => setSoldeCPF(e.target.value)} placeholder="Ex: 2500" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Disponibilité</Label>
                <Input value={disponibilite} onChange={e => setDisponibilite(e.target.value)} placeholder="Jours / horaires" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Délai souhaité pour passer l'examen</Label>
                <Input value={delaiExamen} onChange={e => setDelaiExamen(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contraintes particulières</Label>
              <Textarea value={contraintes} onChange={e => setContraintes(e.target.value)} rows={2} placeholder="Emploi actuel, famille..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Besoins spécifiques */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={6} title="BESOINS SPÉCIFIQUES ET ACCESSIBILITÉ" />
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Besoins d'adaptation pédagogique ?</Label>
              <RadioGroup options={["Dyslexie / Troubles DYS", "Handicap (RQTH)", "Soutien renforcé", "Aucun"]} value={besoinsAdaptation} onChange={setBesoinsAdaptation} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Accès à un ordinateur ou tablette pour le e-learning ?</Label>
              <RadioGroup options={["Oui – ordinateur", "Oui – tablette/smartphone", "Non – besoin d'équipement"]} value={accesOrdinateur} onChange={setAccesOrdinateur} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Précisions éventuelles</Label>
              <Textarea value={precisionsBesoins} onChange={e => setPrecisionsBesoins(e.target.value)} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Avis conseiller (admin only) */}
      <Card className={!isAdmin ? "opacity-60" : ""}>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={7} title="AVIS DU CONSEILLER / FORMATEUR" />
          {!isAdmin && (
            <p className="text-xs text-amber-600 font-medium">🔒 Cette section sera complétée par le formateur lors de l'entretien.</p>
          )}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cohérence du projet professionnel</Label>
              <RadioGroup options={["Très cohérent", "Cohérent", "À consolider", "Non adapté"]} value={coherenceProjet} onChange={v => isAdmin && setCoherenceProjet(v)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Niveau de motivation perçu</Label>
              <RadioGroup options={["Très motivé(e)", "Motivé(e)", "Motivé(e) mais hésitant(e)", "Peu motivé(e)"]} value={niveauMotivation} onChange={v => isAdmin && setNiveauMotivation(v)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observations du conseiller</Label>
              <Textarea value={observations} onChange={e => isAdmin && setObservations(e.target.value)} rows={3} disabled={!isAdmin} />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={signatureAdmin} onCheckedChange={(c) => setSignatureAdmin(!!c)} />
                <span className="text-sm font-medium">✍️ Signature du conseiller / formateur</span>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-center">
        <Button
          onClick={async () => {
            if (apprenantId) {
              const saved = await saveFormDocument({
                apprenantId,
                typeDocument: "projet-professionnel",
                titre: `Questionnaire Projet Professionnel ${formType}`,
                donnees: {
                  formType, dateEntretien, conseiller, lieuNaissance,
                  statutActuel, metierActuel, anciennete, niveauFormation,
                  motivations, dejaTransport, detailTransport, permis3ans, datePermis,
                  modeExercice, plateformes, diffTaxiVtc, modeExerciceTaxi,
                  demandeADS, zoneExercice, zoneAutre, activitesCompl,
                  demarchesEntreprise, craintes, commentConnu, consulteProgram,
                  saitExamen, connaitZone, conduiteUrbaine, connaitSites,
                  modeFinancement, soldeCPF, disponibilite, delaiExamen, contraintes,
                  besoinsAdaptation, accesOrdinateur, precisionsBesoins,
                  coherenceProjet, niveauMotivation, observations, signatureAdmin,
                },
              });
              if (saved) toast.success("Questionnaire projet professionnel enregistré !");
            }
            onComplete();
          }}
          className="px-8"
          size="lg"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Valider le questionnaire
        </Button>
      </div>
    </div>
  );
}
