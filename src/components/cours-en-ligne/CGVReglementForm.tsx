import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { sendAdminNotification } from "@/lib/sendAdminNotification";

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
    contenu: `Les presentes conditions generales de vente s'appliquent a l'ensemble des prestations de formation engagees par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhesion entiere et sans reserve du Client aux presentes conditions generales de vente. Les presentes conditions generales de vente prevalent sur tout autre document du Client, et en particulier sur toutes les conditions generales d'achat du Client.`
  },
  {
    titre: "Definitions",
    contenu: `- CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation aupres de FTRANSPORT.
- STAGIAIRE : la personne physique qui participe a une formation.
- CGV : les conditions generales de vente, detaillees ci-dessous.
- OPCO : les organismes paritaires collecteurs agrees charges de collecter et gerer l'effort de formation des entreprises.`
  },
  {
    titre: "Conditions financieres, reglements et modalites de paiement",
    contenu: `Tous les prix sont indiques en euros et toutes taxes.

Le reglement du prix de la formation est preleve apres le delai de retractation et peut etre echelonne sur le temps.

Toute somme non payee a echeance entraine de plein droit et sans mise en demeure prealable, l'application de penalites d'un montant egal a une fois et demie le taux d'interet legal.

FTRANSPORT aura la faculte d'obtenir le reglement par voie contentieuse aux frais du Client sans prejudice des autres dommages et interets qui pourraient etre dus a FTRANSPORT.

En cas de reglement par l'OPCO dont depend le Client, il appartient au Client d'effectuer sa demande de prise en charge avant le debut de la formation. L'accord de financement doit etre communique au moment de l'inscription et sur l'exemplaire du devis que le Client retourne dument renseigne, date, tamponne, signe et revetu de la mention « Bon pour accord » a FTRANSPORT.

En cas de prise en charge partielle par l'OPCO, la difference sera directement facturee par FTRANSPORT au Client. Si l'accord de prise en charge du Client ne parvient pas a FTRANSPORT au plus tard un jour ouvrable avant le demarrage de la formation, FTRANSPORT se reserve la possibilite de refuser l'entree en formation du Stagiaire ou de facturer la totalite des frais de formation au Client.

Dans des situations exceptionnelles, il peut etre procede a un paiement echelonne. En tout etat de cause, ses modalites devront avoir ete formalisees avant le demarrage de la formation.`
  },
  {
    titre: "Dedit et remplacement d'un participant",
    contenu: `En cas de dedit signifie par le Client a FTRANSPORT au moins 7 jours avant le demarrage de la formation, FTRANSPORT offre au Client la possibilite :
- de repousser l'inscription du Stagiaire a une formation ulterieure, dument programmee par FTRANSPORT et apres accord eventuel de l'OPCO,
- d'obtenir le remboursement integral des sommes versees, si FTRANSPORT est dans l'impossibilite d'assurer la formation a la date convenue.`
  },
  {
    titre: "Annulation, absence ou interruption d'une formation",
    contenu: `Tout module commence est du dans son integralite et fera l'objet d'une facturation au Client par FTRANSPORT. En cas d'absence, d'interruption ou d'annulation, la facturation de FTRANSPORT distinguera le prix correspondant aux journees effectivement suivies par le Stagiaire et les sommes dues au titre des absences ou de l'interruption de la formation.

Les journees d'absences seront remboursees a partir du 8eme jour d'absence si toutefois le stagiaire fournit une preuve avec justificatif tel qu'un certificat medical attestant les raisons de son absence.

Il est rappele que les sommes dues par le Client a ce titre ne peuvent etre imputees par le Client sur son obligation de participer a la formation professionnelle continue ni faire l'objet d'une demande de prise en charge par un OPCO.

Dans cette hypothese, le Client s'engage a regler les sommes qui resteraient a sa charge directement a FTRANSPORT.

D'autre part, en cas d'annulation de la formation par le Client, FTRANSPORT se reserve le droit de facturer au Client des frais d'annulation calcules comme suit :
- si l'annulation intervient dans un delai de 14 jours calendaires apres avoir signe ces conditions generales de ventes, aucun frais d'annulation ne sera applique. Pour cela, le client devra notifier sa retractation par lettre recommandee avec avis de reception adressee a FTRANSPORT 86 route de Genas 69003 Lyon. Toutefois, conformement a l'article L221-25 du Code de la consommation, si la date de debut de la formation intervient avant l'expiration du delai de retractation de 14 jours, le stagiaire reconnait expressement renoncer a son droit de retractation en acceptant le present devis. Dans ce cas, aucun remboursement ne pourra etre exige au titre du droit de retractation.
- si l'annulation intervient apres 14 jours calendaires apres avoir signe ces conditions generales de ventes : les frais d'annulation sont egaux a 100 % du prix TTC de la formation.

Toutefois ces frais ne seront pas applicables si le futur stagiaire nous en stipule les raisons par le biais d'un certificat medical.

Attention FTRANSPORT n'est pas responsable en cas de non-inscription a l'examen VTC ou Taxi, aucun remboursement ne sera accepte si le candidat n'est pas inscrit a l'examen. Cependant, il pourra participer a une autre session de formation au choix.`
  },
  {
    titre: "Horaires et accueil",
    contenu: `Sauf indication contraire portee sur la fiche de presentation de la formation et la convocation, la duree quotidienne des formations est fixee a sept heures. Sauf indication contraire portee sur la convocation, les formations se deroulent de 09h00 a 12h00 et de 13h00 a 17h00 avec une pause en milieu de chaque demi-journee. Les locaux de FTRANSPORT accueillent les Stagiaires de 09h00 a 12h00 et de 14h00 a 18h00.`
  },
  {
    titre: "Effectif et ajournement",
    contenu: `Pour favoriser les meilleures conditions d'apprentissage, l'effectif de chaque formation est limite. Cet effectif est determine, pour chaque formation, en fonction des objectifs et des methodes pedagogiques.

Les inscriptions sont prises en compte dans leur ordre d'arrivee. L'emission d'un devis ne tient pas lieu d'inscription. Seuls les devis dument renseignes, dates, tamponnes (pour les personnes morales), signes et revetus de la mention « Bon pour accord », retournes a FTRANSPORT et apres que le reglement est encaisse ont valeur contractuelle. Une fois l'effectif atteint, les inscriptions sont closes. FTRANSPORT peut alors proposer au Stagiaire de participer a une nouvelle session ou de figurer sur une liste d'attente.

Dans le cas ou le nombre de participants serait insuffisant pour assurer le bon deroulement d'une formation, FTRANSPORT se reserve la possibilite de reporter la formation a la session suivante.`
  },
  {
    titre: "Obligations et force majeure",
    contenu: `Dans le cadre de ses prestations de formation, FTRANSPORT est tenue a une obligation de moyen et non de resultat vis-a-vis de ses Clients ou de ses Stagiaires.

En cas d'echec a l'epreuve d'admissibilite du stagiaire organisee par la chambre de metiers et de l'artisanat, le candidat devra s'acquitter de la somme de 80 euros pour se reinscrire a l'examen theorique. Le candidat pourra disposer d'une plateforme de cours en e-learning apres l'annonce de son echec et jusqu'a la date du prochain examen theorique uniquement sauf si le candidat a deja realise une formation e-learning comme la formation TAXI et VTC pendant les trois mois.

En cas d'echec a l'epreuve d'admission, le candidat devra s'acquitter de la somme de 50 euros s'il souhaite utiliser le vehicule de FTRANSPORT pour l'epreuve d'admission et uniquement dans ce cadre, il devra le restituer par la suite au local de FTRANSPORT au 86 route de Genas 69003 Lyon.

Ftransport n'est pas responsable de l'inscription du stagiaire a l'examen aupres de la chambre des metiers et de l'artisanat notamment en cas de reinscription a un examen theorique (epreuve d'admissibilite) ou pratique (epreuve d'admission).

La formation pratique peut etre deplacee en dehors des horaires de formation dans ce cas-la, le stagiaire en sera averti. En cas d'absence du stagiaire a un examen theorique (epreuve d'admissibilite) ou pratique (epreuve d'admission), il doit en avertir le centre de formation FTRANSPORT, si ce dernier ne nous en informe pas ou qu'il nous donne plus de signe de contact ecrit dans les 6 mois, Ftransport se donne le droit de lui annuler la formation theorique ou pratique et il n'en sera pas dedommage.

FTRANSPORT ne pourra etre tenue responsable a l'egard de ses Clients ou de ses Stagiaires en cas d'inexecution de ses obligations resultant d'un evenement fortuit ou de force majeure. Sont ici consideres comme cas fortuit ou de force majeure, outre ceux habituellement reconnus par la jurisprudence : la maladie ou l'accident d'un intervenant ou d'un responsable pedagogique, les greves ou conflits sociaux externes a FTRANSPORT, les desastres naturels, les incendies, l'interruption des telecommunications, de l'approvisionnement en energie, ou des transports de tout type, ou toute autre circonstance echappant au controle raisonnable de FTRANSPORT.

Cependant en cas d'absence d'un formateur de moins de 2 jours, le stagiaire aura le choix :
- de rattraper les journees d'absences convenu avec le formateur
- ou de consulter ses cours et ses exercices en ligne sur le site internet : www.gestion.ftransport.fr/cours en saisissant ses identifiants de connexion.

En cas d'impossibilite totale de realisation de la formation ou de rupture de formation definitive, les eleves seront rembourses au prorata du nombre d'heures ou de jours effectues, cela ne concerne que les eleves qui ont finance leur formation personnellement sans passer par un organisme quelconque. Cela correspond au prix de la formation divise par le nombre de jours de formation (theorie et pratique).`
  },
  {
    titre: "Propriete intellectuelle",
    contenu: `L'ensemble des fiches de presentation, contenus et supports pedagogiques quelle qu'en soit la forme (papier, electronique, numerique, orale…) utilises par FTRANSPORT pour assurer les formations ou remis aux Stagiaires constituent des oeuvres.

A ce titre, le Client et le Stagiaire s'interdisent d'utiliser, transmettre, reproduire, exploiter ou transformer tout ou partie de ces documents, sans un accord expres de FTRANSPORT. Cette interdiction porte, en particulier, sur toute utilisation faite par le Client et le Stagiaire en vue de l'organisation ou l'animation de formations.`
  },
  {
    titre: "Descriptifs, objectifs et programme des formations",
    contenu: `Les objectifs de la formation :
La formation VTC a pour but de former les stagiaires au metier de chauffeur VTC et de les preparer au mieux a l'examen VTC (epreuve d'admissibilite et d'admission) organise par un centre d'examen agree.

Les prerequis :
La formation demande en amont de savoir lire et ecrire, avoir le casier judiciaire B2 vierge et avoir plus de 3 ans de permis de conduire ou 2 ans, si le stagiaire a reussi son examen en conduite accompagnee.

Les moyens pedagogiques :
Les stagiaires ont acces aux cours en ligne sur www.gestion.ftransport.fr/cours. Les identifiants de connexion sont transmis automatiquement par email lors de l'inscription. Des cours et des exercices sont donnes aux stagiaires durant la formation. Des livres pedagogiques sont parfois attribues.

Les techniques d'encadrement et de mise en oeuvre :
Les stagiaires ecoutent le cours puis effectuent des exercices en lien par rapport aux cours.

Les modalites d'evaluation des acquis de la formation :
Des controles continus et des examens blancs et des corrections sont effectues durant la formation.

Les contenus des programmes, tels qu'ils figurent sur les fiches de presentation des formations sont sur le site internet : www.gestion.ftransport.fr/cours (les identifiants de connexion sont transmis automatiquement par email lors de l'inscription). Ils sont fournis a titre indicatif pour une duree maximum de trois mois. L'intervenant ou le responsable pedagogique se reservent le droit de les modifier en fonction de l'actualite, du niveau des participants ou de la dynamique du groupe.`
  },
  {
    titre: "Organisation de l'action de formation",
    contenu: `L'action de formation est organisee pour un effectif de maximum 21 stagiaires.

Les diplomes, titres ou references de(s) personne(s) chargee(s) de la formation sont :

Pour le formateur tronc commun et la gestion specifique VTC : BTS, transport, Bachelor en Marketing et Master en Metiers de l'Enseignement de l'Education et de la Formation.

Pour le formateur VTC : Plus de 5 ans d'experiences en tant que chauffeur VTC.`
  },
  {
    titre: "Confidentialite et communication",
    contenu: `FTRANSPORT, le Client et le Stagiaire s'engagent a garder confidentiels les documents et les informations auxquels ils pourraient avoir acces au cours de la prestation de formation ou a l'occasion des echanges intervenus anterieurement a l'inscription, notamment l'ensemble des elements figurant dans la proposition transmise par FTRANSPORT au Client.

FTRANSPORT s'engage a ne pas communiquer a des tiers autres que les partenaires avec lesquels sont organisees les formations et aux OPCO, les informations transmises par le Client y compris les informations concernant les Stagiaires.

Cependant, le Client accepte d'etre cite par FTRANSPORT comme client de ses formations. A cet effet, le Client autorise FTRANSPORT a mentionner son nom ainsi qu'une description objective de la nature des prestations dans ses listes de references et propositions a l'attention de ses prospects et de sa clientele, entretiens avec des tiers, rapports d'activite, ainsi qu'en cas de dispositions legales, reglementaires ou comptables l'exigeant.`
  },
  {
    titre: "Protection et acces aux informations a caractere personnel",
    contenu: `FTRANSPORT s'engage a informer chaque Stagiaire que :

- des donnees a caractere personnel le concernant sont collectees et traitees aux fins de suivi de la validation de la formation et d'amelioration de l'offre de FTRANSPORT
- conformement a la loi n° 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'acces, de modification, de rectification des donnees a caractere personnel le concernant.

Les donnees personnelles collectees seront utilisees pour connaitre le nombre de candidats par session de formation et de realiser des statistiques utiles a l'activite de Services pro. L'execution du contrat, donne l'autorisation a Services pro de traiter ces donnees.

Le dirigeant a acces aux informations collectees, cependant les autres membres de l'entreprise peuvent en avoir acces sur demande du dirigeant pour une finalite precise.

Les donnees personnelles seront conservees au maximum 5 ans apres la fin de la relation contractuelle. Vous pouvez toutefois demander a ce que vos donnees personnelles soient effacees avant ce delai, pour cela il faudra en faire la demande par courriel a l'adresse email suivante : contact@ftransport.fr

Enfin, FTRANSPORT s'engage a effacer a l'issue des exercices toute image qui y aurait ete prise par tout moyen video lors de travaux pratiques ou de simulations.`
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
    titre: "Droit applicable et juridiction competente",
    contenu: `Les conditions generales detaillees dans le present document sont regies par le droit francais. En cas de litige survenant entre le Client et FTRANSPORT a l'occasion de l'interpretation des presentes ou de l'execution du contrat, il sera recherche une solution a l'amiable. A defaut, les Tribunaux de Lyon seront seuls competents pour regler le litige.`
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
        if (data && data.length > 0) {
          setAlreadyCompleted(true);
          onComplete();
        }
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
    sendAdminNotification({
      type_document: "cgv-ri-acceptation",
      nom,
      prenom,
      donnees: {
        cgv_accepted: true,
        ri_accepted: true,
        adresse,
        date_signature: dateSignature,
      },
    });
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
