import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Download } from "lucide-react";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { toast } from "sonner";
import { useAutoSave, loadSavedDraft } from "@/hooks/useAutoSave";

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

  // Section 1
  const [dateEntretien, setDateEntretien] = useState(new Date().toISOString().slice(0, 10));
  const [conseiller, setConseiller] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");

  // Section 2
  const [statutActuel, setStatutActuel] = useState<RadioAnswer>(null);
  const [metierActuel, setMetierActuel] = useState("");
  const [anciennete, setAnciennete] = useState("");
  const [niveauFormation, setNiveauFormation] = useState("");

  // Section 3
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

  // Section 4
  const [commentConnu, setCommentConnu] = useState<RadioAnswer>(null);
  const [consulteProgram, setConsulteProgram] = useState<RadioAnswer>(null);
  const [saitExamen, setSaitExamen] = useState<RadioAnswer>(null);
  
  // TAXI territory
  const [connaitZone, setConnaitZone] = useState<RadioAnswer>(null);
  const [conduiteUrbaine, setConduiteUrbaine] = useState<RadioAnswer>(null);
  const [connaitSites, setConnaitSites] = useState<RadioAnswer>(null);

  // Section 5 - Besoins spécifiques
  const [besoinsAdaptation, setBesoinsAdaptation] = useState<RadioAnswer>(null);
  const [accesOrdinateur, setAccesOrdinateur] = useState<RadioAnswer>(null);
  const [precisionsBesoins, setPrecisionsBesoins] = useState("");

  // Section 6 - Avis conseiller (admin only)
  const [coherenceProjet, setCoherenceProjet] = useState<RadioAnswer>(null);
  const [niveauMotivation, setNiveauMotivation] = useState<RadioAnswer>(null);
  const [observations, setObservations] = useState("");
  const [signatureAdmin, setSignatureAdmin] = useState(false);

  // Validation state: set of field keys that are invalid
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  // Auto-save
  const { queueSave, triggerSave: autoTrigger, StatusIndicator } = useAutoSave({
    apprenantId,
    typeDocument: "projet-professionnel",
    titre: `Questionnaire Projet Professionnel ${formType}`,
    enabled: !!apprenantId && !completed,
  });

  const collectData = () => ({
    formType, dateEntretien, conseiller, lieuNaissance,
    statutActuel, metierActuel, anciennete, niveauFormation,
    motivations, dejaTransport, detailTransport, permis3ans, datePermis,
    modeExercice, plateformes, diffTaxiVtc, modeExerciceTaxi,
    demandeADS, zoneExercice, zoneAutre, activitesCompl,
    demarchesEntreprise, craintes, commentConnu, consulteProgram,
    saitExamen, connaitZone, conduiteUrbaine, connaitSites,
    besoinsAdaptation, accesOrdinateur, precisionsBesoins,
    coherenceProjet, niveauMotivation, observations, signatureAdmin,
  });

  useEffect(() => {
    queueSave(collectData());
  }, [dateEntretien, conseiller, lieuNaissance, statutActuel, metierActuel, anciennete,
    niveauFormation, motivations, dejaTransport, detailTransport, permis3ans, datePermis,
    modeExercice, diffTaxiVtc, modeExerciceTaxi, demandeADS, zoneExercice, zoneAutre,
    activitesCompl, demarchesEntreprise, craintes, commentConnu, consulteProgram,
    saitExamen, connaitZone, conduiteUrbaine, connaitSites, besoinsAdaptation,
    accesOrdinateur, precisionsBesoins, coherenceProjet, niveauMotivation, observations, signatureAdmin]);

  // Refs for scrolling to first invalid field
  const fieldRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    motivations: useRef<HTMLDivElement>(null!),
    statutActuel: useRef<HTMLDivElement>(null!),
    dejaTransport: useRef<HTMLDivElement>(null!),
    permis3ans: useRef<HTMLDivElement>(null!),
    demarchesEntreprise: useRef<HTMLDivElement>(null!),
    besoinsAdaptation: useRef<HTMLDivElement>(null!),
    accesOrdinateur: useRef<HTMLDivElement>(null!),
    diffTaxiVtc: useRef<HTMLDivElement>(null!),
    modeExerciceTaxi: useRef<HTMLDivElement>(null!),
    demandeADS: useRef<HTMLDivElement>(null!),
    zoneExercice: useRef<HTMLDivElement>(null!),
    activitesCompl: useRef<HTMLDivElement>(null!),
    modeExercice: useRef<HTMLDivElement>(null!),
    commentConnu: useRef<HTMLDivElement>(null!),
    consulteProgram: useRef<HTMLDivElement>(null!),
    saitExamen: useRef<HTMLDivElement>(null!),
    connaitZone: useRef<HTMLDivElement>(null!),
    conduiteUrbaine: useRef<HTMLDivElement>(null!),
    connaitSites: useRef<HTMLDivElement>(null!),
  };

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

  const errorBorder = (fieldKey: string) =>
    invalidFields.has(fieldKey) ? "ring-2 ring-destructive/60 border-destructive" : "";

  const RadioGroup = ({ options, value, onChange, fieldKey }: { options: string[]; value: RadioAnswer; onChange: (v: string) => void; fieldKey?: string }) => (
    <div className={`flex flex-wrap gap-2 rounded-lg p-1 ${fieldKey && invalidFields.has(fieldKey) ? "ring-2 ring-destructive/60 bg-destructive/5" : ""}`}>
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer bg-muted/50 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors">
          <Checkbox checked={value === opt} onCheckedChange={() => { onChange(opt); if (fieldKey) setInvalidFields(prev => { const n = new Set(prev); n.delete(fieldKey); return n; }); }} />
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
            <div ref={fieldRefs.statutActuel}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("statutActuel") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Statut actuel <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Salarié(e)", "Indépendant(e)", "Demandeur d'emploi", "Étudiant(e)"]} value={statutActuel} onChange={setStatutActuel} fieldKey="statutActuel" />
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
            <div ref={fieldRefs.motivations}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("motivations") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Pourquoi souhaitez-vous devenir conducteur {formType.toLowerCase()} ? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={motivations}
                onChange={e => { setMotivations(e.target.value); setInvalidFields(prev => { const n = new Set(prev); n.delete("motivations"); return n; }); }}
                rows={3}
                placeholder="J'aime le contact avec la clientèle, j'aime conduire, j'aime me rendre utile, je souhaite travailler avec des applications..."
                className={errorBorder("motivations")}
              />
            </div>
            <div ref={fieldRefs.dejaTransport}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("dejaTransport") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Avez-vous déjà exercé une activité de transport de personnes ? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Oui", "Non"]} value={dejaTransport} onChange={setDejaTransport} fieldKey="dejaTransport" />
              {dejaTransport === "Oui" && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Précisez (type, durée, employeur)</Label>
                  <Textarea value={detailTransport} onChange={e => setDetailTransport(e.target.value)} rows={2} />
                </div>
              )}
            </div>
            <div ref={fieldRefs.permis3ans}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("permis3ans") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Permis de conduire depuis plus de 3 ans ? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Oui", "Non"]} value={permis3ans} onChange={setPermis3ans} fieldKey="permis3ans" />
              {permis3ans === "Non" && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Date d'obtention du permis</Label>
                  <Input type="date" value={datePermis} onChange={e => setDatePermis(e.target.value)} />
                </div>
              )}
            </div>

            {isTaxi && (
              <>
                <div ref={fieldRefs.diffTaxiVtc}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("diffTaxiVtc") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Connaissez-vous la différence entre le taxi et le VTC ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – je connais bien", "Partiellement", "Non – besoin d'explications"]} value={diffTaxiVtc} onChange={setDiffTaxiVtc} fieldKey="diffTaxiVtc" />
                </div>
                <div ref={fieldRefs.modeExerciceTaxi}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("modeExerciceTaxi") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Mode d'exercice envisagé après l'obtention de la carte taxi ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Exploitant indépendant", "Locataire d'ADS", "Salarié(e) d'une compagnie", "Pas encore décidé"]} value={modeExerciceTaxi} onChange={setModeExerciceTaxi} fieldKey="modeExerciceTaxi" />
                </div>
                <div ref={fieldRefs.demandeADS}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("demandeADS") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Avez-vous envisagé de demander une ADS ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – liste d'attente", "Oui – déjà contactée", "Oui – à faire", "Non – location prévue", "Je ne sais pas"]} value={demandeADS} onChange={setDemandeADS} fieldKey="demandeADS" />
                </div>
                <div ref={fieldRefs.zoneExercice}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("zoneExercice") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Zone d'exercice envisagée ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Métropole de Lyon", "Autre", "Pas encore décidé"]} value={zoneExercice} onChange={setZoneExercice} fieldKey="zoneExercice" />
                  {zoneExercice === "Autre" && (
                    <div className="mt-2">
                      <Input value={zoneAutre} onChange={e => setZoneAutre(e.target.value)} placeholder="Précisez la zone" />
                    </div>
                  )}
                </div>
                <div ref={fieldRefs.activitesCompl}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("activitesCompl") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Activités complémentaires au taxi ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – TAP", "Oui – services réguliers", "Non", "Je ne sais pas"]} value={activitesCompl} onChange={setActivitesCompl} fieldKey="activitesCompl" />
                </div>
              </>
            )}

            {!isTaxi && (
              <>
                <div ref={fieldRefs.modeExercice}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("modeExercice") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Mode d'exercice envisagé après la certification ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Salarié VTC", "Indépendant (SASU/EI)", "Les deux", "Pas encore décidé"]} value={modeExercice} onChange={setModeExercice} fieldKey="modeExercice" />
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

            <div ref={fieldRefs.demarchesEntreprise}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("demarchesEntreprise") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Démarches pour créer votre entreprise ? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Oui – en cours", "Oui – déjà créée", "Non – besoin d'infos", "Non – pas encore"]} value={demarchesEntreprise} onChange={setDemarchesEntreprise} fieldKey="demarchesEntreprise" />
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
                <div ref={fieldRefs.commentConnu}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("commentConnu") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Comment avez-vous connu FTRANSPORT ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Internet / Site web", "Bouche à oreille", "France Travail", "Réseaux sociaux"]} value={commentConnu} onChange={setCommentConnu} fieldKey="commentConnu" />
                </div>
                <div ref={fieldRefs.consulteProgram}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("consulteProgram") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Avez-vous consulté le programme de formation ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – en détail", "Oui – rapidement", "Non"]} value={consulteProgram} onChange={setConsulteProgram} fieldKey="consulteProgram" />
                </div>
                <div ref={fieldRefs.saitExamen}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("saitExamen") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Savez-vous ce qu'implique l'examen {rsCode} ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – bien informé(e)", "Partiellement", "Non – besoin d'explications"]} value={saitExamen} onChange={setSaitExamen} fieldKey="saitExamen" />
                </div>
              </>
            )}
            {isTaxi && (
              <>
                <p className="text-xs text-muted-foreground italic">La connaissance du territoire est une épreuve spécifique à l'examen taxi.</p>
                <div ref={fieldRefs.connaitZone}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("connaitZone") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Connaissez-vous bien la zone d'exercice ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Très bien", "Correctement", "Peu", "Pas du tout"]} value={connaitZone} onChange={setConnaitZone} fieldKey="connaitZone" />
                </div>
                <div ref={fieldRefs.conduiteUrbaine}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("conduiteUrbaine") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Expérience de conduite en milieu urbain dense ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Oui – régulière", "Oui – occasionnelle", "Non"]} value={conduiteUrbaine} onChange={setConduiteUrbaine} fieldKey="conduiteUrbaine" />
                </div>
                <div ref={fieldRefs.connaitSites}>
                  <Label className={`text-xs mb-1 block ${invalidFields.has("connaitSites") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    Connaissance des sites et bâtiments publics de Lyon ? <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup options={["Bonne connaissance", "Partiellement", "Non – à apprendre"]} value={connaitSites} onChange={setConnaitSites} fieldKey="connaitSites" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Besoins spécifiques */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={5} title="BESOINS SPÉCIFIQUES ET ACCESSIBILITÉ" />
          <div className="space-y-3">
            <div ref={fieldRefs.besoinsAdaptation}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("besoinsAdaptation") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Besoins d'adaptation pédagogique ? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Dyslexie / Troubles DYS", "Handicap (RQTH)", "Soutien renforcé", "Aucun"]} value={besoinsAdaptation} onChange={setBesoinsAdaptation} fieldKey="besoinsAdaptation" />
            </div>
            <div ref={fieldRefs.accesOrdinateur}>
              <Label className={`text-xs mb-1 block ${invalidFields.has("accesOrdinateur") ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Accès à un ordinateur ou tablette pour le e-learning ? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup options={["Oui – ordinateur", "Oui – tablette/smartphone", "Non – besoin d'équipement"]} value={accesOrdinateur} onChange={setAccesOrdinateur} fieldKey="accesOrdinateur" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Précisions éventuelles</Label>
              <Textarea value={precisionsBesoins} onChange={e => setPrecisionsBesoins(e.target.value)} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Avis conseiller (admin only) */}
      <Card className={!isAdmin ? "opacity-60" : ""}>
        <CardContent className="p-4 space-y-3">
          <SectionTitle num={6} title="AVIS DU CONSEILLER / FORMATEUR" />
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
            // Validation des champs obligatoires
            const missing: { key: string; label: string }[] = [];
            if (!statutActuel) missing.push({ key: "statutActuel", label: "Statut actuel" });
            if (!motivations.trim()) missing.push({ key: "motivations", label: "Motivations" });
            if (!dejaTransport) missing.push({ key: "dejaTransport", label: "Activité de transport" });
            if (!permis3ans) missing.push({ key: "permis3ans", label: "Permis de conduire" });
            if (!demarchesEntreprise) missing.push({ key: "demarchesEntreprise", label: "Démarches entreprise" });
            if (!besoinsAdaptation) missing.push({ key: "besoinsAdaptation", label: "Besoins d'adaptation" });
            if (!accesOrdinateur) missing.push({ key: "accesOrdinateur", label: "Accès ordinateur" });
            if (isTaxi) {
              if (!diffTaxiVtc) missing.push({ key: "diffTaxiVtc", label: "Différence taxi/VTC" });
              if (!modeExerciceTaxi) missing.push({ key: "modeExerciceTaxi", label: "Mode d'exercice taxi" });
              if (!demandeADS) missing.push({ key: "demandeADS", label: "Demande ADS" });
              if (!zoneExercice) missing.push({ key: "zoneExercice", label: "Zone d'exercice" });
              if (!activitesCompl) missing.push({ key: "activitesCompl", label: "Activités complémentaires" });
              if (!connaitZone) missing.push({ key: "connaitZone", label: "Connaissance zone" });
              if (!conduiteUrbaine) missing.push({ key: "conduiteUrbaine", label: "Conduite urbaine" });
              if (!connaitSites) missing.push({ key: "connaitSites", label: "Connaissance sites" });
            } else {
              if (!modeExercice) missing.push({ key: "modeExercice", label: "Mode d'exercice VTC" });
              if (!commentConnu) missing.push({ key: "commentConnu", label: "Comment connu FTRANSPORT" });
              if (!consulteProgram) missing.push({ key: "consulteProgram", label: "Programme consulté" });
              if (!saitExamen) missing.push({ key: "saitExamen", label: "Connaissance examen" });
            }

            if (missing.length > 0) {
              setInvalidFields(new Set(missing.map(m => m.key)));
              toast.error(`Veuillez remplir les champs obligatoires : ${missing.map(m => m.label).join(", ")}`);
              // Scroll to first missing field
              const firstKey = missing[0].key;
              const ref = fieldRefs[firstKey];
              if (ref?.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              return;
            }

            setInvalidFields(new Set());

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
