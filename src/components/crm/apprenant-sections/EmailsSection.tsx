import { useState, useRef, type ChangeEvent } from "react";
import { Mail, Send, Inbox, Clock, Plus, Search, RefreshCw, Loader2, FileText, Forward, Paperclip, X, RotateCcw, Download, Phone, Trash2, Copy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface EmailsSectionProps {
  apprenant: any;
}

interface EmailRecord {
  id: string;
  outlook_message_id: string | null;
  subject: string;
  body_preview: string | null;
  body_html: string | null;
  sender_email: string | null;
  sender_name: string | null;
  recipients: string[] | null;
  type: 'sent' | 'received';
  is_read: boolean;
  has_attachments: boolean;
  received_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface AttachmentFile {
  file: File;
  name: string;
  contentType: string;
  contentBytes: string;
}

// Email de l'organisme pour la synchronisation Outlook
const ORGANISME_EMAIL = "contact@ftransport.fr";
const ONBOARDING_URL = "https://insight-learn-manage.lovable.app/bienvenue";

function getFormationType(typeApprenant: string | null | undefined): string {
  const type = (typeApprenant || '').toLowerCase();
  if (type.includes('ta-e') || type === 'ta') return 'TAXI (mobilité VTC vers TAXI)';
  if (type.includes('va-e') || type === 'va') return 'VTC (mobilité TAXI vers VTC)';
  if (type.includes('taxi')) return 'TAXI';
  if (type.includes('vtc')) return 'VTC';
  return 'TAXI / VTC';
}

interface EmailTemplate {
  id: string;
  label: string;
  icon: string;
  getSubject: (apprenant: any) => string;
  getBody: (apprenant: any) => string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'bienvenue',
    label: '📄 Document de bienvenue',
    icon: '📄',
    getSubject: (a) => `Bienvenue chez Ftransport - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom} ${a.nom},

Nous avons le plaisir de vous confirmer votre inscription à la formation ${formation}.

⚠️ IMPORTANT : Afin de valider définitivement votre inscription à l'examen, merci de cliquer sur le lien ci-dessous et de suivre les étapes. Sans cela, vous ne serez pas inscrit à l'examen.

👉 CLIQUEZ ICI POUR VOUS INSCRIRE : ${ONBOARDING_URL}

Pour toute question, contactez-nous :
📞 Tél : 04 28 29 60 91
📧 Email : contact@ftransport.fr

Cordialement,
L'équipe Ftransport
86 Route de Genas, 69003 Lyon`;
    },
  },
  {
    id: 'rappel-documents',
    label: '📋 Rappel documents manquants',
    icon: '📋',
    getSubject: (a) => `Rappel : Documents manquants - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous vous rappelons que certains documents nécessaires à la finalisation de votre dossier d'inscription sont encore manquants.

Merci de nous transmettre les pièces manquantes dans les plus brefs délais afin que nous puissions procéder à votre inscription à l'examen.

Vous pouvez compléter votre dossier en ligne : ${ONBOARDING_URL}

N'hésitez pas à nous contacter si vous avez des questions.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91`,
  },
  {
    id: 'convocation-examen',
    label: '🎓 Convocation examen',
    icon: '🎓',
    getSubject: (a) => `Convocation à l'examen - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous avons le plaisir de vous informer que votre inscription à l'examen a bien été validée.

📅 Date de l'examen : [À compléter]
📍 Lieu : [À compléter]
🕐 Heure de convocation : [À compléter]

Documents à apporter le jour de l'examen :
- Pièce d'identité en cours de validité
- Convocation (ce mail)

Nous vous souhaitons bonne chance !

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91`,
  },
  {
    id: 'confirmation-inscription',
    label: '✅ Confirmation d\'inscription',
    icon: '✅',
    getSubject: (a) => `Confirmation d'inscription - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom},

Nous vous confirmons que votre inscription à la formation ${formation} est bien enregistrée et votre dossier est complet.

Votre formation débutera prochainement. Nous vous transmettrons les informations pratiques (dates, horaires, lieu) par email.

En attendant, n'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91
📧 contact@ftransport.fr`;
    },
  },
  {
    id: 'repassage-examen',
    label: '🔄 Repassage examen théorique',
    icon: '🔄',
    getSubject: (a) => `Réinscription à l'examen théorique T3P - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom},<br><br>Suite à votre précédent examen théorique ${formation}, vous devez procéder à une nouvelle inscription pour repasser l'examen théorique.<br><br>📌 <strong>ÉTAPES À SUIVRE :</strong><br><br><strong>1️⃣ Rendez-vous sur le site :</strong><br>👉 <a href="https://www.exament3p.fr" target="_blank">www.exament3p.fr</a><br><br><strong>2️⃣ Connectez-vous avec :</strong><br>• Login : votre adresse email<br>• Mot de passe : cliquez sur "Mot de passe oublié" pour en créer un nouveau<br><br><strong>3️⃣ Une fois connecté(e), procédez à votre réinscription à l'examen théorique</strong> en suivant les instructions du site.<br><br>⚠️ <strong>IMPORTANT — Département 69 obligatoire :</strong><br><span style="color: red; font-size: 16px; font-weight: bold;">🔴 ATTENTION : Lors de votre réinscription, vous devez IMPÉRATIVEMENT sélectionner le département 69 (Rhône), même si vous résidez dans un autre département. Si vous choisissez un autre département, nous ne pourrons pas vous former ni vous louer un véhicule pour l'examen pratique.</span><br><br>⚠️ <strong>IMPORTANT :</strong> Une fois votre réinscription effectuée sur le site, merci de nous recontacter immédiatement afin que nous puissions finaliser votre dossier et vous accompagner pour la suite.<br><br>📞 Tél : <strong>04 28 29 60 91</strong><br>📧 Email : contact@ftransport.fr<br><br>N'hésitez pas à nous contacter si vous rencontrez des difficultés lors de votre réinscription.<br><br>Cordialement,<br><strong>L'équipe Ftransport</strong><br>86 Route de Genas, 69003 Lyon`;
    },
  },
  {
    id: 'felicitations-vtc-pratique',
    label: '🎉 Félicitations VTC - Choix date pratique',
    icon: '🎉',
    getSubject: (a) => `Félicitations - Choix de votre date de formation pratique VTC - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}`;

      return `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (de 9h à 17h).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique VTC" : Quizz Lyon et Questions à apprendre.<br>Ou cliquez sur le lien suivant : <a href="https://app.formative.com/join/DNFDZS">https://app.formative.com/join/DNFDZS</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>⏰ <strong>Convocation : merci d'être présent(e) 15 minutes avant le début de la formation.</strong><br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
    },
  },
  {
    id: 'felicitations-taxi-pratique',
    label: '🎉 Félicitations TAXI - Choix date pratique',
    icon: '🎉',
    getSubject: (a) => `Félicitations - Choix de votre date de formation pratique TAXI - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const bookingUrl = `https://insight-learn-manage.lovable.app/reservation-pratique?id=${a.id}`;

      return `Bonjour ${a.prenom},<br><br>Félicitations, vous venez de réussir votre épreuve d'admissibilité, face à l'épreuve d'admission.<br><br>Vous devrez choisir une journée complète d'entraînement pratique (jusqu'à 17h au maximum).<br><br>👉 <a href="${bookingUrl}">CHOISISSEZ VOTRE DATE ICI</a><br><br>⚠️ Attention : vous ne pouvez choisir qu'UNE SEULE date. Tout créneau choisi ne pourra pas être modifié.<br><br>📚 Merci de bien réviser le cours sur la pratique et d'effectuer les exercices.<br><br>Notamment les exercices suivants dans "Formation Pratique TAXI" : QCM Taximètre, Cas pratique, Quizz Lyon et Questions à apprendre.<br>Ou cliquez ici : <a href="https://app.formative.com/join/ZT924H">https://app.formative.com/join/ZT924H</a><br><br>⚠️ Attention, si vous n'effectuez pas les exercices et que vous n'apprenez pas les éléments de la ville, vous risquez fortement d'échouer votre examen pratique.<br><br>🍽️ Vous aurez une pause à Confluences aux alentours de 12h jusqu'à 13h.<br><br>📍 RDV au 86 Route de Genas 69003 Lyon à la date que vous aurez choisie.<br><br>⏰ <strong>Convocation : merci d'être présent(e) 15 minutes avant le début de la formation.</strong><br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>De 9h à 17h sur rendez-vous`;
    },
  },
  {
    id: 'echec-theorique',
    label: '❌ Échec examen théorique',
    icon: '❌',
    getSubject: (a) => `Suite à votre examen T3P - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      return `Bonjour ${a.prenom},<br><br>Nous avons bien pris connaissance des résultats de votre examen théorique ${formation} et nous tenons d'abord à vous encourager : <strong>l'échec n'est qu'une étape, pas une fin</strong>. Beaucoup de candidats ont dû repasser plusieurs fois avant de décrocher leur certification. La persévérance paie toujours.<br><br>Voici les étapes à suivre pour vous réinscrire à l'examen :<br><br><strong>1️⃣ Rendez-vous sur le site officiel :</strong><br>👉 <a href="http://www.exament3p.fr">www.exament3p.fr</a><br><br><strong>2️⃣ Connectez-vous à votre espace :</strong><br>Cliquez sur <em>"Mot de passe oublié"</em> pour accéder à votre compte (votre login est votre adresse email).<br><br><strong>3️⃣ Procédez à votre réinscription</strong> en suivant les instructions du site et réglez les frais d'examen en ligne.<br><br>⚠️ <strong>IMPORTANT — Département 69 obligatoire :</strong><br><span style="color: red; font-size: 16px; font-weight: bold;">🔴 ATTENTION : Lors de votre réinscription, vous devez IMPÉRATIVEMENT sélectionner le département 69 (Rhône), même si vous résidez dans un autre département. Si vous choisissez un autre département, je ne pourrai pas vous former ni vous louer un véhicule pour l'examen pratique.</span><br><br><strong>📅 Attention aux dates !</strong><br>Les places partent vite. Inscrivez-vous dès que possible pour ne pas manquer les prochaines sessions disponibles.<br><br>✅ <strong>Une fois votre réinscription effectuée et le paiement des frais d'examen validé</strong>, merci de nous contacter par téléphone le jour même des résultats de l'examen théorique afin que nous puissions organiser la suite de votre formation.<br><br>📞 <strong>04 28 29 60 91</strong><br>📧 contact@ftransport.fr<br>🕐 Du lundi au vendredi, 9h – 17h<br><br>Ne baissez pas les bras — vous êtes capable de réussir. Nous sommes là pour vous accompagner à chaque étape.<br><br>Cordialement,<br><br><strong>FTRANSPORT</strong><br>Centre de formation VTC & TAXI<br>86 Route de Genas, 69003 Lyon`;
    },
  },
  {
    id: 'relance-paiement',
    label: '💰 Relance paiement',
    icon: '💰',
    getSubject: (a) => `Relance paiement - ${a.prenom} ${a.nom}`,
    getBody: (a) => `Bonjour ${a.prenom},

Nous vous contactons au sujet du règlement de votre formation. À ce jour, nous n'avons pas encore reçu votre paiement.

Merci de procéder au règlement dans les meilleurs délais ou de nous contacter pour convenir d'un échéancier.

Cordialement,
L'équipe Ftransport
📞 04 28 29 60 91
📧 contact@ftransport.fr`,
  },
  {
    id: 'confirmation-formation-continue',
    label: '📩 Confirmation formation continue',
    icon: '📩',
    getSubject: (a) => `Confirmation d'inscription formation continue - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      const dateDebut = a.date_debut_formation || '[date a completer]';
      const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      return `${a.civilite || ''} ${a.prenom} ${a.nom}<br><br>${a.adresse || ''}<br>${a.code_postal || ''} ${a.ville || ''}<br><br><br><br><br>Lyon, le ${today}<br><br>Bonjour,<br><br>Nous avons le plaisir de vous convier pour la formation :<br><br><strong>${formation}</strong><br><br>Le <strong>${dateDebut}</strong><br><br>Horaires : de 8h45 a 12h et de 13h a 17h<br><br>Adresse : 86 route de Genas 69003 Lyon<br><br><br>A l'issue des quatorze heures de formation, une attestation de formation continue vous sera delivree et vous pourrez effectuer votre demande de renouvellement de carte professionnelle aupres de la prefecture.<br><br>Le reste des informations vous sera communique ce mardi.<br><br>Attention, si vous venez en voiture, merci de venir en avance, actuellement, il y a de nombreux travaux sur la route de Genas. Nous vous conseillons de vous garer sur l'avenue des Acacias a Lyon et de rejoindre le centre a pied.<br><br>Rappel, pour la formation vous devez :<br>- savoir lire et ecrire le francais<br>- avoir un permis de conduire plus de 3 ans en cours de validite<br>- avoir le casier judiciaire B2 vierge<br><br><span style="color: red; font-size: 18px; font-weight: bold;">⚠️ IMPORTANT : Nous vous rappelons que votre présence est obligatoire. En cas d'absence et/ou de retard, l'attestation de formation continue ne vous sera pas remise. Il est inutile de négocier ou de trouver des raisons : vous serez reporté(e) à la session suivante.</span><br><br>Pour les personnes qui n'ont pas réglé leur formation, merci de préparer l'appoint. Les chèques et la carte bleue ne seront pas acceptés le jour de l'entrée en formation. Pour les personnes qui souhaiteraient payer par virement, vous trouverez ci-joint le RIB du centre de formation. Une facture vous sera bien sûr remise pour les paiements effectués.<br><br>Nous vous souhaitons une excellente formation et esperons qu'elle repondra pleinement a vos attentes.<br><br><strong>RIB - SASU SERVICES PRO F TRANSPORT</strong><br><br>Destinataire : SERVICES PRO<br>Adresse : 86 ROUTE DE GENAS, 69003, LYON, France<br>IBAN : FR76 2823 3000 0185 7527 9099 426<br>BIC : REVOFRP2<br><br>SERVICES PRO 86 ROUTE DE GENAS 69003, LYON 3EME - FR`;
    },
  },
  {
    id: 'consultation-copies',
    label: '📝 Demande consultation copies examen',
    icon: '📝',
    getSubject: (a) => `Demande de consultation des copies examen - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const typeExamen = (a.type_apprenant || '').toLowerCase().includes('taxi') ? 'TAXI' : 'VTC';
      const dateExamen = a.date_examen_theorique || '[date à compléter]';
      const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      return `${a.prenom} ${a.nom}<br><br>${a.adresse || '[adresse]'}<br>${a.code_postal || '[code postal]'} ${a.ville || '[ville]'}<br>${a.telephone || '[téléphone]'}<br>${a.email || '[email]'}<br><br>A l'attention du président de la chambre des métiers et de l'artisanat de Lyon<br>10 rue Paul Montrochet, 69002 Lyon<br><br>A Lyon, le ${today}<br><br><strong>Objet : demande de consultation des copies examen Taxi/VTC</strong><br><br>Madame, Monsieur,<br><br>Je me permets de vous contacter car je souhaiterais consulter mes copies de l'examen <strong>${typeExamen}</strong> qui a eu lieu le <strong>${dateExamen}</strong>.<br><br>Merci de me communiquer un rendez-vous pour que je puisse répondre à cette requête.<br><br>Je vous prie de bien vouloir agréer, Madame, Monsieur, l'assurance de mes salutations distinguées.`;
    },
  },
  {
    id: 'relance-paiement-fc',
    label: '💸 Relance paiement Formation Continue',
    icon: '💸',
    getSubject: (a) => `URGENT – Inscription non validée sans paiement - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      const dateDebut = a.date_debut_formation || "à définir";
      const dateFin = a.date_fin_formation || "à définir";
      return "Bonjour " + a.prenom + ",<br><br>Nous faisons suite à votre demande d'inscription à la <strong>Formation Continue " + formation + "</strong>" + (dateDebut !== "à définir" ? " du <strong>" + dateDebut + "</strong> au <strong>" + dateFin + "</strong>" : "") + ".<br><br><span style=\"color: red; font-size: 16px; font-weight: bold;\">⚠️ ATTENTION : À ce jour, nous n'avons reçu aucun règlement de votre part. Votre inscription n'est donc PAS validée et vous ne pourrez PAS accéder à la Formation Continue.</span><br><br>Si vous souhaitez confirmer votre inscription à la <strong>Formation Continue " + formation + "</strong>, vous devez effectuer un <strong>virement bancaire immédiat</strong> aux coordonnées suivantes :<br><br><strong>RIB - SASU SERVICES PRO F TRANSPORT</strong><br><br>Destinataire : SERVICES PRO<br>Adresse : 86 ROUTE DE GENAS, 69003, LYON, France<br>IBAN : FR76 2823 3000 0185 7527 9099 426<br>BIC : REVOFRP2<br><br>Sans réception du virement, votre place sera automatiquement libérée et attribuée à un autre candidat.<br><br><strong>Si vous avez déjà effectué le virement</strong>, merci de nous envoyer immédiatement la <strong>preuve de virement</strong> (capture d'écran ou justificatif bancaire) par retour de mail à <strong>contact@ftransport.fr</strong> afin que nous puissions valider votre inscription dans les plus brefs délais.<br><br>Cordialement,<br><br>FTRANSPORT<br>Centre de formation<br>86 Route de Genas 69003 Lyon<br>📞 04.28.29.60.91<br>📧 contact@ftransport.fr";
    },
  },
  {
    id: 'devis-personnel',
    label: '📝 Devis personnel à compléter',
    icon: '📝',
    getSubject: (a) => `Votre devis de formation - ${a.prenom} ${a.nom}`,
    getBody: (a) => {
      const formation = getFormationType(a.type_apprenant);
      const typeParam = a.type_apprenant ? `?type=${encodeURIComponent(a.type_apprenant)}` : '';
      const devisUrl = `https://gestion.ftransport.fr/devis-personnel${typeParam}`;
      return `Bonjour ${a.prenom},<br><br>Nous faisons suite à notre échange concernant votre inscription à la formation <strong>${formation}</strong>.<br><br>Afin de finaliser votre inscription, merci de compléter et signer votre devis en ligne en cliquant sur le lien ci-dessous :<br><br>👉 <a href="${devisUrl}" style="font-size: 16px; font-weight: bold;">CLIQUEZ ICI POUR COMPLÉTER VOTRE DEVIS</a><br><br>📌 <strong>Étapes à suivre :</strong><br>1️⃣ Remplissez vos coordonnées<br>2️⃣ Signez le devis<br>3️⃣ Téléchargez le document<br>4️⃣ Effectuez le premier virement aux coordonnées bancaires indiquées sur le devis<br>5️⃣ Recontactez-nous au <strong>04 28 29 60 91</strong> après avoir effectué le virement<br><br>⚠️ <strong>IMPORTANT :</strong> Votre inscription ne sera prise en compte qu'après réception du premier virement.<br><br>Pour toute question, n'hésitez pas à nous contacter.<br><br>Cordialement,<br><br><strong>FTRANSPORT</strong><br>Centre de formation VTC & TAXI<br>86 Route de Genas, 69003 Lyon<br>📞 04.28.29.60.91<br>📧 contact@ftransport.fr`;
    },
  },
];

export function EmailsSection({ apprenant }: EmailsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received' | 'calls'>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailBody, setNewEmailBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [forwardTo, setForwardTo] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callDate, setCallDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [callSujet, setCallSujet] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const [callDirection, setCallDirection] = useState<'sortant' | 'entrant'>('sortant');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load DB email templates
  const { data: dbTemplates = [] } = useQuery({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('label');
      if (error) throw error;
      return data || [];
    },
  });

  // Merge hardcoded + DB templates
  const allTemplates = [
    ...EMAIL_TEMPLATES,
    ...dbTemplates
      .filter(t => !EMAIL_TEMPLATES.some(et => et.id === t.id))
      .map(t => ({
        id: t.id,
        label: `${t.icon} ${t.label}`,
        icon: t.icon,
        getSubject: (a: any) => t.subject_template
          .replace(/\{\{prenom\}\}/g, a.prenom || '')
          .replace(/\{\{nom\}\}/g, a.nom || '')
          .replace(/\{\{email\}\}/g, a.email || ''),
        getBody: (a: any) => t.body_template
          .replace(/\{\{prenom\}\}/g, a.prenom || '')
          .replace(/\{\{nom\}\}/g, a.nom || '')
          .replace(/\{\{email\}\}/g, a.email || '')
          .replace(/\{\{apprenant_id\}\}/g, a.id || '')
          .replace(/\{\{formation\}\}/g, getFormationType(a.type_apprenant))
          .replace(/\{\{date_debut\}\}/g, a.date_debut_formation || '[à compléter]'),
      })),
  ];

  // Fetch emails from database
  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['emails', apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('apprenant_id', apprenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EmailRecord[];
    },
    enabled: !!apprenant.id,
  });

  interface AppelRecord {
    id: string;
    apprenant_id: string;
    date_appel: string;
    sujet: string;
    notes: string | null;
    direction: string;
    created_at: string;
  }

  const { data: appels = [], isLoading: isLoadingAppels } = useQuery({
    queryKey: ['apprenant_appels', apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenant_appels' as any)
        .select('*')
        .eq('apprenant_id', apprenant.id)
        .order('date_appel', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AppelRecord[];
    },
    enabled: !!apprenant.id,
  });

  const addAppelMutation = useMutation({
    mutationFn: async () => {
      if (!callSujet.trim()) throw new Error("Sujet de l'appel obligatoire");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('apprenant_appels' as any).insert({
        apprenant_id: apprenant.id,
        date_appel: new Date(callDate).toISOString(),
        sujet: callSujet.trim(),
        notes: callNotes.trim() || null,
        direction: callDirection,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apprenant_appels', apprenant.id] });
      setIsCallOpen(false);
      setCallSujet("");
      setCallNotes("");
      setCallDirection('sortant');
      toast({ title: "Appel enregistré", description: "La trace de l'appel a été ajoutée." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteAppelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('apprenant_appels' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apprenant_appels', apprenant.id] });
      toast({ title: "Appel supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });


  // Sync emails mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!apprenant.email) {
        throw new Error("L'apprenant n'a pas d'adresse email");
      }

      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'sync',
          apprenantId: apprenant.id,
          apprenantEmail: apprenant.email,
          userEmail: ORGANISME_EMAIL,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
      toast({
        title: "Synchronisation réussie",
        description: `${data.synced} email(s) synchronisé(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de synchronisation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetComposeState = () => {
    setSelectedTemplate("");
    setNewEmailSubject("");
    setNewEmailBody("");
    setIsForwarding(false);
    setForwardTo("");
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '';
        resolve(result);
      };
      reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleAddAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse 10 Mo.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    try {
      const nextAttachments = await Promise.all(
        validFiles.map(async (file) => ({
          file,
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBytes: await readFileAsBase64(file),
        })),
      );

      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (error: any) {
      toast({
        title: "Erreur de lecture",
        description: error.message || "Impossible d'ajouter la pièce jointe",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async ({ subject, body, attachments }: { subject: string; body: string; attachments: AttachmentFile[] }) => {
      if (!apprenant.email) {
        throw new Error("L'apprenant n'a pas d'adresse email");
      }

      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: ORGANISME_EMAIL,
          to: apprenant.email,
          subject,
          body,
          attachments: attachments.map((attachment) => ({
            name: attachment.name,
            contentType: attachment.contentType,
            contentBytes: attachment.contentBytes,
          })),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
      setIsComposeOpen(false);
      resetComposeState();
      toast({
        title: "Email envoyé",
        description: `Email envoyé à ${apprenant.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'envoi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Renvoyer un email déjà envoyé à l'adresse actuelle de l'apprenant
  const resendMutation = useMutation({
    mutationFn: async (email: EmailRecord) => {
      if (!apprenant.email) {
        throw new Error("L'apprenant n'a pas d'adresse email — veuillez d'abord la renseigner");
      }

      const body = email.body_html || email.body_preview || '';
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: ORGANISME_EMAIL,
          to: apprenant.email,
          subject: email.subject,
          body,
          attachments: [],
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
      setSelectedEmail(null);
      toast({
        title: "Email renvoyé",
        description: `Email renvoyé à ${apprenant.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de renvoi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Normalise le sujet pour regrouper original + renvois
  const normalizeSubject = (s: string | null | undefined) =>
    (s || '').replace(/^(?:re|fwd|tr|fw)\s*:\s*/gi, '').trim().toLowerCase();

  // Historique des envois par sujet (uniquement type='sent') : liste des timestamps triés ascendants
  const sendHistoryBySubject = new Map<string, number[]>();
  emails.forEach((e) => {
    if (e.type !== 'sent') return;
    const key = normalizeSubject(e.subject);
    if (!key) return;
    const ts = new Date(e.sent_at || e.created_at).getTime();
    const arr = sendHistoryBySubject.get(key) || [];
    arr.push(ts);
    sendHistoryBySubject.set(key, arr);
  });
  sendHistoryBySubject.forEach((arr) => arr.sort((a, b) => a - b));

  const filteredEmails = emails
    .filter(email => {
      if (activeTab === 'sent') return email.type === 'sent';
      if (activeTab === 'received') return email.type === 'received';
      return true;
    })
    .filter(email => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        email.subject?.toLowerCase().includes(query) ||
        email.body_preview?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.sent_at || a.received_at || a.created_at).getTime();
      const dateB = new Date(b.sent_at || b.received_at || b.created_at).getTime();
      return dateB - dateA;
    });

  const ordinalSend = (n: number) => {
    if (n === 1) return '1er envoi';
    return `${n}e envoi`;
  };

  const sentCount = emails.filter(e => e.type === 'sent').length;
  const receivedCount = emails.filter(e => e.type === 'received').length;

  const handleSendEmail = () => {
    if (!newEmailSubject.trim() || !newEmailBody.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le sujet et le contenu de l'email",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate({ subject: newEmailSubject, body: newEmailBody, attachments });
  };

  const fetchPdfAsAttachment = async (url: string, name: string): Promise<AttachmentFile | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], name, { type: 'application/pdf' });
      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const contentBytes = btoa(binary);
      return { file, name, contentType: 'application/pdf', contentBytes };
    } catch (e) {
      console.error('[fetchPdfAsAttachment] error:', e);
      return null;
    }
  };

  const buildPdfFromHtml = async (html: string, filename: string): Promise<AttachmentFile | null> => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 20;
      const marginY = 20;
      const maxWidth = pageWidth - marginX * 2;
      let y = marginY;

      const normalized = html
        .replace(/<br\s*\/?>(\s*)/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '');

      const parts: { text: string; bold: boolean }[] = [];
      const re = /<strong[^>]*>(.*?)<\/strong>/gi;
      let lastIdx = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(normalized)) !== null) {
        if (m.index > lastIdx) parts.push({ text: normalized.slice(lastIdx, m.index), bold: false });
        parts.push({ text: m[1], bold: true });
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < normalized.length) parts.push({ text: normalized.slice(lastIdx), bold: false });

      const clean = (s: string) => s
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');

      const fullText = parts.map(p => clean(p.text)).join('');
      const boldMap: boolean[] = [];
      parts.forEach(p => {
        const t = clean(p.text);
        for (let i = 0; i < t.length; i++) boldMap.push(p.bold);
      });

      doc.setFontSize(11);
      const lines = fullText.split('\n');
      let charIdx = 0;
      for (const line of lines) {
        if (line.trim() === '') {
          y += 5;
          charIdx += 1;
          if (y > pageHeight - marginY) { doc.addPage(); y = marginY; }
          continue;
        }
        let hasBold = false;
        for (let i = 0; i < line.length; i++) if (boldMap[charIdx + i]) { hasBold = true; break; }
        doc.setFont('helvetica', hasBold ? 'bold' : 'normal');
        const wrapped = doc.splitTextToSize(line, maxWidth);
        for (const w of wrapped) {
          if (y > pageHeight - marginY) { doc.addPage(); y = marginY; }
          doc.text(w, marginX, y);
          y += 6;
        }
        charIdx += line.length + 1;
      }

      const blob = doc.output('blob');
      const buf = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const contentBytes = btoa(binary);
      const file = new File([blob], filename, { type: 'application/pdf' });
      return { file, name: filename, contentType: 'application/pdf', contentBytes };
    } catch (e) {
      console.error('[buildPdfFromHtml] error:', e);
      return null;
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setNewEmailSubject(template.getSubject(apprenant));
      setNewEmailBody(template.getBody(apprenant));
    }

    // Auto-attache les PDFs pour le template "Modèles devis & facture - Examen VTC"
    if (templateId === 'modeles-devis-facture-examen-vtc') {
      const [devis, facture] = await Promise.all([
        fetchPdfAsAttachment('/templates/Modele_Devis_Examen_VTC.pdf', 'Modele_Devis_Examen_VTC.pdf'),
        fetchPdfAsAttachment('/templates/Modele_Facture_Examen_VTC.pdf', 'Modele_Facture_Examen_VTC.pdf'),
      ]);
      const newOnes = [devis, facture].filter(Boolean) as AttachmentFile[];
      setAttachments((prev) => {
        const existingNames = new Set(prev.map((a) => a.name));
        return [...prev, ...newOnes.filter((a) => !existingNames.has(a.name))];
      });
      if (newOnes.length < 2) {
        toast({ title: 'Pièces jointes', description: 'Certaines pièces jointes n\'ont pas pu être chargées.', variant: 'destructive' });
      }
    }

    // Auto-attache la lettre PDF (même contenu) pour la demande de consultation des copies
    if (templateId === 'consultation-copies' && template) {
      const body = template.getBody(apprenant);
      const safeName = `${apprenant.prenom || ''}_${apprenant.nom || ''}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Demande_consultation_copies_${safeName}.pdf`;
      const pdf = await buildPdfFromHtml(body, filename);
      if (pdf) {
        setAttachments((prev) => {
          const existingNames = new Set(prev.map((a) => a.name));
          return existingNames.has(pdf.name) ? prev : [...prev, pdf];
        });
      } else {
        toast({ title: 'Pièce jointe', description: "Impossible de générer le PDF de la demande.", variant: 'destructive' });
      }
    }
  };

  const handleForwardEmail = (email: EmailRecord) => {
    setIsForwarding(true);
    setForwardTo("");
    const fwdSubject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    const dateStr = email.sent_at || email.received_at || email.created_at;
    const formattedDate = dateStr ? format(new Date(dateStr), "dd MMMM yyyy 'à' HH:mm", { locale: fr }) : '';
    const originalHeader = `<br><br>---------- Message transféré ----------<br>De : ${email.sender_name || email.sender_email || ORGANISME_EMAIL}<br>Date : ${formattedDate}<br>Objet : ${email.subject}<br>À : ${email.recipients?.join(', ') || apprenant.email}<br><br>`;
    const originalBody = email.body_html || email.body_preview?.replace(/\n/g, '<br>') || '';
    setNewEmailSubject(fwdSubject);
    setNewEmailBody(originalHeader + originalBody);
    setSelectedEmail(null);
    setIsComposeOpen(true);
  };

  const handleSendForward = async () => {
    if (!forwardTo.trim() || !newEmailSubject.trim()) {
      toast({ title: "Champs requis", description: "Veuillez renseigner le destinataire et l'objet", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('sync-outlook-emails', {
        body: {
          action: 'send',
          apprenantId: apprenant.id,
          userEmail: ORGANISME_EMAIL,
          to: forwardTo.trim(),
          subject: newEmailSubject,
          body: newEmailBody,
          attachments: attachments.map((attachment) => ({
            name: attachment.name,
            contentType: attachment.contentType,
            contentBytes: attachment.contentBytes,
          })),
        },
      });
      if (error) throw error;
      await supabase.from('emails').insert({
        subject: newEmailSubject,
        body_html: newEmailBody,
        body_preview: newEmailBody.replace(/<[^>]*>/g, '').slice(0, 200),
        sender_email: ORGANISME_EMAIL,
        recipients: [forwardTo.trim()],
        type: 'sent',
        is_read: true,
        has_attachments: attachments.length > 0,
        sent_at: new Date().toISOString(),
        apprenant_id: apprenant.id,
      });
      toast({ title: "Email transféré", description: `Email transféré à ${forwardTo}` });
      setIsComposeOpen(false);
      resetComposeState();
      queryClient.invalidateQueries({ queryKey: ['emails', apprenant.id] });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const getEmailDate = (email: EmailRecord) => {
    const dateStr = email.type === 'sent' ? email.sent_at : email.received_at;
    return dateStr ? new Date(dateStr) : new Date(email.created_at);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const today = format(new Date(), "dd/MM/yyyy", { locale: fr });
    const tabLabel = activeTab === "sent" ? "Envoyés" : activeTab === "received" ? "Reçus" : "Tous";

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relevé des emails", pw / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${apprenant.prenom || ""} ${apprenant.nom || ""}${apprenant.email ? " — " + apprenant.email : ""}`, pw / 2, 22, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Filtre : ${tabLabel} • ${filteredEmails.length} email(s) • Généré le ${today}`, pw / 2, 28, { align: "center" });
    doc.setTextColor(0);

    const body = filteredEmails.map((e) => {
      const d = e.type === "sent" ? e.sent_at : e.received_at;
      const dateStr = d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }) : "";
      const from = e.sender_name || e.sender_email || "";
      const to = (e.recipients || []).join(", ");
      const preview = (e.body_preview || "").replace(/\s+/g, " ").slice(0, 220);
      return [
        dateStr,
        e.type === "sent" ? "Envoyé" : "Reçu",
        e.subject || "(sans objet)",
        e.type === "sent" ? to : from,
        preview,
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: [["Date", "Type", "Objet", "De / À", "Aperçu"]],
      body,
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [0, 102, 51], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 15 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: "auto" },
      },
      margin: { left: 10, right: 10 },
    });

    doc.save(`emails_${apprenant.nom || "apprenant"}_${apprenant.prenom || ""}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Emails &amp; contacts
          </CardTitle>
          {apprenant.email ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{apprenant.email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(apprenant.email);
                  toast({ title: "Adresse email copiée" });
                }}
                title="Copier l'adresse email"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-destructive">Aucune adresse email renseignée</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={filteredEmails.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !apprenant.email}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Synchroniser
          </Button>
          <Dialog open={isCallOpen} onOpenChange={setIsCallOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Phone className="w-4 h-4 mr-2" />
                Nouvel appel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Enregistrer un appel avec {apprenant.prenom} {apprenant.nom}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date &amp; heure</Label>
                    <Input type="datetime-local" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Direction</Label>
                    <Select value={callDirection} onValueChange={(v) => setCallDirection(v as 'sortant' | 'entrant')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sortant">📞 Appel sortant</SelectItem>
                        <SelectItem value="entrant">📲 Appel entrant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Sujet *</Label>
                  <Input value={callSujet} onChange={(e) => setCallSujet(e.target.value)} placeholder="Objet de l'appel (ex : relance dossier, confirmation examen...)" />
                </div>
                <div>
                  <Label>Notes / compte-rendu</Label>
                  <Textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)} rows={5} placeholder="Détails de l'échange, prochaines étapes..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCallOpen(false)}>Annuler</Button>
                <Button onClick={() => addAppelMutation.mutate()} disabled={!callSujet.trim() || addAppelMutation.isPending}>
                  {addAppelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
                  Enregistrer l'appel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isComposeOpen} onOpenChange={(open) => {
            setIsComposeOpen(open);
            if (!open) {
              resetComposeState();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!apprenant.email}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau mail
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isForwarding ? 'Transférer un email' : `Nouveau mail à ${apprenant.prenom} ${apprenant.nom}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Template selector - hidden when forwarding */}
                {!isForwarding && (
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Modèle d'email
                    </Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un modèle d'email..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Destinataire */}
                <div>
                  <Label>Destinataire</Label>
                  {isForwarding ? (
                    <Input 
                      value={forwardTo} 
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="Adresse email du destinataire..."
                      type="email"
                    />
                  ) : (
                    <Input value={apprenant.email || "Pas d'email"} disabled />
                  )}
                </div>
                <div>
                  <Label>Sujet</Label>
                  <Input 
                    value={newEmailSubject} 
                    onChange={(e) => setNewEmailSubject(e.target.value)}
                    placeholder="Sujet de l'email..."
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <div 
                    className="border rounded-md p-3 min-h-[200px] max-h-[400px] overflow-y-auto text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: newEmailBody }}
                    onBlur={(e) => setNewEmailBody(e.currentTarget.innerHTML)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pièces jointes</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleAddAttachment}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                    Ajouter une pièce jointe
                  </Button>
                  <p className="text-xs text-muted-foreground">Maximum 10 Mo par fichier.</p>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((attachment, index) => (
                        <div key={`${attachment.name}-${index}`} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[220px] truncate">{attachment.name}</span>
                          <span className="text-muted-foreground">({Math.max(1, Math.round(attachment.file.size / 1024))} Ko)</span>
                          <button type="button" onClick={() => handleRemoveAttachment(index)} className="text-muted-foreground transition-colors hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsComposeOpen(false); resetComposeState(); }}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={isForwarding ? handleSendForward : handleSendEmail} 
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isForwarding ? (
                      <Forward className="w-4 h-4 mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isForwarding ? 'Transférer' : 'Envoyer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{emails.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
            <p className="text-xs text-muted-foreground">Envoyés</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{receivedCount}</p>
            <p className="text-xs text-muted-foreground">Reçus</p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher dans les emails..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="w-3 h-3" />
              Envoyés
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="w-3 h-3" />
              Reçus
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <Phone className="w-3 h-3" />
              Appels {appels.length > 0 && <span className="text-xs opacity-70">({appels.length})</span>}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'calls' ? (
            <div>
              {isLoadingAppels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : appels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun appel enregistré</p>
                  <Button variant="link" className="mt-2" onClick={() => setIsCallOpen(true)}>
                    Enregistrer un premier appel
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {appels.map((a) => (
                    <div key={a.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${a.direction === 'entrant' ? 'bg-purple-100' : 'bg-orange-100'}`}>
                        <Phone className={`w-4 h-4 ${a.direction === 'entrant' ? 'text-purple-600' : 'text-orange-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium truncate">{a.sujet}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {a.direction === 'entrant' ? 'Entrant' : 'Sortant'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(a.date_appel), "dd MMM yyyy 'à' HH'h'mm", { locale: fr })}
                          </span>
                        </div>
                        {a.notes && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Supprimer cette trace d'appel ?")) deleteAppelMutation.mutate(a.id);
                        }}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <TabsContent value={activeTab}>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun email trouvé</p>
                {apprenant.email && (
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => syncMutation.mutate()}
                  >
                    Synchroniser les emails depuis Outlook
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmails.map((email) => (
                  <div 
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                      !email.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500 border-blue-200 shadow-sm' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      email.type === 'sent' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {email.type === 'sent' ? (
                        <Send className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Inbox className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`truncate ${!email.is_read ? 'font-bold text-foreground' : 'font-medium'}`}>
                          {!email.is_read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                          {email.subject}
                        </h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {email.type === 'sent' ? 'Envoyé' : 'Reçu'}
                        </Badge>
                        {email.has_attachments && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            📎
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm truncate ${!email.is_read ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
                        {email.body_preview}
                      </p>
                      {email.type === 'sent' && (() => {
                        const history = sendHistoryBySubject.get(normalizeSubject(email.subject)) || [];
                        if (history.length < 2) return null;
                        const currentTs = new Date(email.sent_at || email.created_at).getTime();
                        const currentIdx = history.findIndex((t) => t === currentTs);
                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <Badge variant="secondary" className="text-[10px] py-0 h-5">
                              🔁 {history.length} envois
                            </Badge>
                            {history.map((t, i) => (
                              <span
                                key={t}
                                className={`px-1.5 py-0.5 rounded border ${
                                  i === currentIdx
                                    ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                                    : 'bg-muted/50 border-border text-muted-foreground'
                                }`}
                              >
                                {ordinalSend(i + 1)} : {format(new Date(t), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {email.type === 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={resendMutation.isPending || !apprenant.email}
                          onClick={() => resendMutation.mutate(email)}
                          title={apprenant.email ? `Renvoyer à ${apprenant.email}` : "Aucune adresse email"}
                        >
                          {resendMutation.isPending && resendMutation.variables?.id === email.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Renvoyer
                        </Button>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(getEmailDate(email), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          )}
        </Tabs>


        {/* Info */}
        {!apprenant.email && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note :</strong> Ajoutez une adresse email à cet apprenant pour 
              pouvoir synchroniser et envoyer des emails.
            </p>
          </div>
        )}
      </CardContent>

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEmail.type === 'sent' ? (
                    <Send className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Inbox className="w-5 h-5 text-green-600" />
                  )}
                  {selectedEmail.subject}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
                  {selectedEmail.type === 'sent' ? (
                    <span><strong>À :</strong> {selectedEmail.recipients?.join(', ') || apprenant.email}</span>
                  ) : (
                    <span><strong>De :</strong> {selectedEmail.sender_name || selectedEmail.sender_email}</span>
                  )}
                  <span className="ml-auto">
                    {format(getEmailDate(selectedEmail), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                {selectedEmail.body_html ? (
                  <div 
                    className="prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }} 
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm font-sans"
                    dangerouslySetInnerHTML={{ 
                      __html: (selectedEmail.body_preview || '').replace(
                        /(https?:\/\/[^\s<]+)/g, 
                        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline cursor-pointer">$1</a>'
                      )
                    }} 
                  />
                )}
                <div className="flex justify-end gap-2 pt-2 border-t">
                  {selectedEmail.type === 'sent' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendMutation.mutate(selectedEmail)}
                      disabled={resendMutation.isPending || !apprenant.email}
                      className="gap-2"
                      title={!apprenant.email ? "Renseignez d'abord l'adresse email de l'apprenant" : `Renvoyer à ${apprenant.email}`}
                    >
                      {resendMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      Renvoyer à l'adresse actuelle
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleForwardEmail(selectedEmail)} className="gap-2">
                    <Forward className="w-4 h-4" />
                    Transférer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
