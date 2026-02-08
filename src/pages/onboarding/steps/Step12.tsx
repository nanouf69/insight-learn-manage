import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CheckCircle, Clock, AlertTriangle, User, FileText, Calendar, GraduationCap, Shield, Edit2, Send, Download } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateRecapitulatifPDF } from "@/lib/pdf/recapitulatif-inscription";

// Dates des examens théoriques 2026
const datesExamenTheorique = [
  { value: "27 janvier 2026", label: "27 janvier 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
  { value: "24 février 2026", label: "24 février 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
  { value: "31 mars 2026", label: "31 mars 2026 (après-midi)", lieu: "Puy-de-Dôme – Polydome, Place du 1er mai, 63100 Clermont-Ferrand" },
  { value: "26 mai 2026", label: "26 mai 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
  { value: "21 juillet 2026", label: "21 juillet 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
  { value: "29 septembre 2026", label: "29 septembre 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
  { value: "17 novembre 2026", label: "17 novembre 2026 (après-midi)", lieu: "Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne" },
];

// Types d'examens disponibles
const typesExamen = [
  { value: "vtc_complet", label: "VTC examen complet" },
  { value: "vtc_mobilite", label: "VTC mobilité" },
  { value: "taxi_complet", label: "Taxi examen complet" },
  { value: "taxi_mobilite", label: "Taxi mobilité" },
];

interface EditDialogProps {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditDialog({ title, children, onSave, open, onOpenChange }: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {children}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(); onOpenChange(false); }}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Step12() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Data from localStorage
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [numeroDossier, setNumeroDossier] = useState('');
  const [dateExamen, setDateExamen] = useState('');
  const [typeExamen, setTypeExamen] = useState('');
  const [b2Vierge, setB2Vierge] = useState(false);
  
  // Edit dialogs state
  const [editCoordonneesOpen, setEditCoordonneesOpen] = useState(false);
  const [editDossierOpen, setEditDossierOpen] = useState(false);
  const [editExamenOpen, setEditExamenOpen] = useState(false);
  const [editDateOpen, setEditDateOpen] = useState(false);
  
  // Temp edit values
  const [tempNom, setTempNom] = useState('');
  const [tempPrenom, setTempPrenom] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempTelephone, setTempTelephone] = useState('');
  const [tempNumeroDossier, setTempNumeroDossier] = useState('');
  const [tempTypeExamen, setTempTypeExamen] = useState('');
  const [tempDateExamen, setTempDateExamen] = useState('');

  // Load saved values on mount
  useEffect(() => {
    const profile = localStorage.getItem('onboarding_profile');
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        setNom(parsed.nom || '');
        setPrenom(parsed.prenom || '');
        setEmail(parsed.email || '');
        setTelephone(parsed.telephone || '');
      } catch (e) {
        console.error('Error parsing profile:', e);
      }
    }
    
    const savedNumeroDossier = localStorage.getItem('onboarding_numero_dossier');
    const savedDateExamen = localStorage.getItem('onboarding_date_examen');
    const savedTypeExamen = localStorage.getItem('onboarding_type_examen');
    
    if (savedNumeroDossier) setNumeroDossier(savedNumeroDossier);
    if (savedDateExamen) setDateExamen(savedDateExamen);
    if (savedTypeExamen) setTypeExamen(savedTypeExamen);
  }, []);

  const getTypeExamenLabel = (value: string) => {
    const type = typesExamen.find(t => t.value === value);
    return type ? type.label : value;
  };

  const handleSubmit = async () => {
    if (!b2Vierge) {
      toast.error("Veuillez confirmer que votre B2 est vierge");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission - in real app, save to database
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("Votre dossier a été envoyé avec succès !");
  };

  const openEditCoordonnees = () => {
    setTempNom(nom);
    setTempPrenom(prenom);
    setTempEmail(email);
    setTempTelephone(telephone);
    setEditCoordonneesOpen(true);
  };

  const saveCoordonnees = () => {
    setNom(tempNom);
    setPrenom(tempPrenom);
    setEmail(tempEmail);
    setTelephone(tempTelephone);
    
    // Update localStorage
    const profile = JSON.parse(localStorage.getItem('onboarding_profile') || '{}');
    profile.nom = tempNom;
    profile.prenom = tempPrenom;
    profile.email = tempEmail;
    profile.telephone = tempTelephone;
    localStorage.setItem('onboarding_profile', JSON.stringify(profile));
    
    toast.success("Coordonnées mises à jour");
  };

  const openEditDossier = () => {
    setTempNumeroDossier(numeroDossier);
    setEditDossierOpen(true);
  };

  const saveDossier = () => {
    setNumeroDossier(tempNumeroDossier);
    localStorage.setItem('onboarding_numero_dossier', tempNumeroDossier);
    toast.success("Numéro de dossier mis à jour");
  };

  const openEditExamen = () => {
    setTempTypeExamen(typeExamen);
    setEditExamenOpen(true);
  };

  const saveExamen = () => {
    setTypeExamen(tempTypeExamen);
    localStorage.setItem('onboarding_type_examen', tempTypeExamen);
    toast.success("Type d'examen mis à jour");
  };

  const openEditDate = () => {
    setTempDateExamen(dateExamen);
    setEditDateOpen(true);
  };

  const saveDate = () => {
    setDateExamen(tempDateExamen);
    localStorage.setItem('onboarding_date_examen', tempDateExamen);
    toast.success("Date d'examen mise à jour");
  };

  const handleDownloadRecap = () => {
    const selectedExam = datesExamenTheorique.find(e => e.value === dateExamen);
    
    generateRecapitulatifPDF({
      nom,
      prenom,
      email,
      telephone,
      numeroDossier,
      typeExamen: getTypeExamenLabel(typeExamen),
      dateExamen,
      lieuExamen: selectedExam?.lieu,
      b2Vierge,
    });
    
    toast.success("Récapitulatif téléchargé !");
  };

  return (
    <OnboardingLayout currentStep={12} totalSteps={12} title="Confirmation de votre dossier">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700">
              <strong>Dernière étape !</strong> Vérifiez les informations ci-dessous et confirmez pour finaliser votre dossier.
            </p>
          </div>

          {/* Récapitulatif des coordonnées */}
          <div className="border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Vos coordonnées</h3>
              </div>
              <button
                onClick={openEditCoordonnees}
                disabled={isSubmitted}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Nom :</span>
                <span className="ml-2 font-medium text-gray-900">{nom || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Prénom :</span>
                <span className="ml-2 font-medium text-gray-900">{prenom || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Email :</span>
                <span className="ml-2 font-medium text-gray-900">{email || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Téléphone :</span>
                <span className="ml-2 font-medium text-gray-900">{telephone || '-'}</span>
              </div>
            </div>
          </div>

          {/* Numéro de dossier */}
          <div className="border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Numéro de dossier CMA</h3>
              </div>
              <button
                onClick={openEditDossier}
                disabled={isSubmitted}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
            <p className="text-lg font-mono font-semibold text-gray-900">{numeroDossier || '-'}</p>
          </div>

          {/* Type d'examen */}
          <div className="border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Type d'examen</h3>
              </div>
              <button
                onClick={openEditExamen}
                disabled={isSubmitted}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
            <p className="text-lg font-semibold text-gray-900">{getTypeExamenLabel(typeExamen) || '-'}</p>
          </div>

          {/* Date d'examen */}
          <div className="border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Date d'examen théorique</h3>
              </div>
              <button
                onClick={openEditDate}
                disabled={isSubmitted}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
            <p className="text-lg font-semibold text-gray-900">{dateExamen || '-'}</p>
          </div>

          {/* Confirmation B2 vierge */}
          <div className={`border rounded-xl p-5 mb-6 ${!b2Vierge && isSubmitted === false ? 'border-gray-200 bg-amber-50' : b2Vierge ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Confirmation casier judiciaire</h3>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="b2-vierge"
                checked={b2Vierge}
                onCheckedChange={(checked) => setB2Vierge(checked === true)}
                disabled={isSubmitted}
                className="mt-0.5"
              />
              <Label htmlFor="b2-vierge" className="text-gray-700 cursor-pointer leading-relaxed">
                Je confirme que mon casier judiciaire (B2) est <strong>vierge</strong> et ne comporte aucune condamnation incompatible avec l'exercice de la profession de conducteur VTC/Taxi.
              </Label>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isSubmitted || !b2Vierge}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-medium text-lg transition-colors ${
                isSubmitted 
                  ? "bg-green-500 text-white cursor-default" 
                  : b2Vierge
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isSubmitted ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Dossier envoyé avec succès
                </>
              ) : isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Confirmer et envoyer mon dossier
                </>
              )}
            </button>
            
            <button
              onClick={handleDownloadRecap}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium text-base bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Télécharger le récapitulatif
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-blue-700 text-sm">
                <strong>En cas de réussite à l'épreuve d'admissibilité :</strong> Merci de nous contacter dans les 48h après la réception des résultats 
                pour garantir un véhicule pour le passage à l'épreuve pratique.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-600 text-sm">
                Si dans les 2 mois qui suivent ce mail nous n'avons pas reçu les documents demandés, 
                le centre se réserve le droit de ne plus payer les frais d'examens si vous y aviez droit.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 lg:p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Nous reprendrons contact très prochainement</h3>
          <p className="text-gray-600 mb-6">Cordialement, l'équipe FTRANSPORT</p>
          
          <div className="flex items-center justify-center gap-3 text-xl">
            <Phone className="w-6 h-6 text-blue-500" />
            <a href="tel:0428296091" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              04.28.29.60.91
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            86 Route de Genas, 69003 Lyon • De 9h à 17h sur rendez-vous
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-11"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {isSubmitted && (
            <Link
              to="/bienvenue"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Terminé
            </Link>
          )}
        </div>
      </div>

      {/* Edit Dialogs */}
      <EditDialog
        title="Modifier vos coordonnées"
        open={editCoordonneesOpen}
        onOpenChange={setEditCoordonneesOpen}
        onSave={saveCoordonnees}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-nom">Nom</Label>
            <Input id="edit-nom" value={tempNom} onChange={(e) => setTempNom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-prenom">Prénom</Label>
            <Input id="edit-prenom" value={tempPrenom} onChange={(e) => setTempPrenom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-telephone">Téléphone</Label>
            <Input id="edit-telephone" value={tempTelephone} onChange={(e) => setTempTelephone(e.target.value)} />
          </div>
        </div>
      </EditDialog>

      <EditDialog
        title="Modifier le numéro de dossier"
        open={editDossierOpen}
        onOpenChange={setEditDossierOpen}
        onSave={saveDossier}
      >
        <div>
          <Label htmlFor="edit-dossier">Numéro de dossier CMA</Label>
          <Input id="edit-dossier" value={tempNumeroDossier} onChange={(e) => setTempNumeroDossier(e.target.value)} className="font-mono" />
        </div>
      </EditDialog>

      <EditDialog
        title="Modifier le type d'examen"
        open={editExamenOpen}
        onOpenChange={setEditExamenOpen}
        onSave={saveExamen}
      >
        <div>
          <Label>Type d'examen</Label>
          <Select value={tempTypeExamen} onValueChange={setTempTypeExamen}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Sélectionnez le type d'examen..." />
            </SelectTrigger>
            <SelectContent>
              {typesExamen.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditDialog>

      <EditDialog
        title="Modifier la date d'examen"
        open={editDateOpen}
        onOpenChange={setEditDateOpen}
        onSave={saveDate}
      >
        <div>
          <Label>Date d'examen théorique</Label>
          <Select value={tempDateExamen} onValueChange={setTempDateExamen}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Sélectionnez une date..." />
            </SelectTrigger>
            <SelectContent>
              {datesExamenTheorique.map((exam) => (
                <SelectItem key={exam.value} value={exam.value}>
                  {exam.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EditDialog>
    </OnboardingLayout>
  );
}