import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, CheckCircle, AlertTriangle, Phone, User, Search, Loader2 } from "lucide-react";
import logoFtransport from "@/assets/logo-ftransport.png";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fonction pour normaliser le texte (supprimer accents, tirets, espaces multiples et mettre en minuscules)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[-']/g, ' ')           // Remplace tirets et apostrophes par des espaces
    .replace(/\s+/g, ' ')            // Normalise les espaces multiples
    .trim();
};

// Distance de Levenshtein pour tolérer les fautes d'orthographe
const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

// Vérifie si deux textes sont similaires (tolérance aux fautes)
const isSimilar = (input: string, target: string, maxDistance = 2): boolean => {
  const a = normalizeText(input);
  const b = normalizeText(target);
  if (a === b) return true;
  // Pour les noms courts (<=3 chars), tolérer seulement 1 erreur
  const tolerance = Math.min(maxDistance, Math.floor(b.length / 3));
  return levenshtein(a, b) <= Math.max(1, tolerance);
};

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [attempted, setAttempted] = useState(false); // Pour afficher les erreurs

  const handleSearch = async () => {
    setAttempted(true);
    
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Veuillez saisir votre nom et prénom");
      return;
    }

    setIsSearching(true);

    try {
      // Récupérer tous les apprenants pour faire une recherche normalisée côté client
      const { data: apprenants, error } = await supabase
        .from('apprenants')
        .select('*');

      if (error) throw error;

      // Normaliser les termes de recherche
      const nomNormalized = normalizeText(nom);
      const prenomNormalized = normalizeText(prenom);

      // Chercher l'apprenant avec correspondance exacte normalisée d'abord
      let found = apprenants?.find(a => 
        normalizeText(a.nom) === nomNormalized && 
        normalizeText(a.prenom) === prenomNormalized
      );

      // Si pas trouvé, essayer avec tolérance aux fautes d'orthographe
      if (!found) {
        found = apprenants?.find(a => 
          isSimilar(nom, a.nom) && isSimilar(prenom, a.prenom)
        );
      }

      // Sauvegarder les infos dans localStorage
      localStorage.setItem('onboarding_nom', nom.trim());
      localStorage.setItem('onboarding_prenom', prenom.trim());

      if (found) {
        // Apprenant trouvé - sauvegarder toutes ses infos
        localStorage.setItem('onboarding_apprenant_id', found.id);
        localStorage.setItem('onboarding_email', found.email || '');
        localStorage.setItem('onboarding_telephone', found.telephone || '');
        localStorage.setItem('onboarding_adresse', found.adresse || '');
        localStorage.setItem('onboarding_code_postal', found.code_postal || '');
        localStorage.setItem('onboarding_ville', found.ville || '');
        localStorage.setItem('onboarding_found', 'true');
        // Utiliser le nom/prénom exact de la BDD
        localStorage.setItem('onboarding_nom', found.nom);
        localStorage.setItem('onboarding_prenom', found.prenom);
        toast.success(`Bienvenue ${found.prenom} ! Nous avons trouvé votre dossier.`);
      } else {
        // Apprenant non trouvé - afficher message d'erreur
        toast.error(
          "Dossier non trouvé. Veuillez écrire votre nom et prénom exactement comme sur votre compte CPF, ou contactez le centre au 04 28 29 60 91",
          { duration: 10000 }
        );
        setIsSearching(false);
        return; // Ne pas continuer
      }

      // Rediriger vers l'étape 1 seulement si trouvé
      navigate('/bienvenue/etape-1');
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-black to-black" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center mb-12">
            <img 
              src={logoFtransport} 
              alt="FTRANSPORT" 
              className="h-16 mx-auto mb-8"
            />
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Bienvenue chez{" "}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                FTRANSPORT
              </span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              Vous êtes inscrit(e) pour la formation <strong className="text-white">TAXI / VTC</strong>.
              Suivez les étapes ci-dessous pour compléter votre inscription.
            </p>
          </div>

          {/* Formulaire d'identification */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 lg:p-8 mb-12 max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Identification</h2>
                <p className="text-white/60 text-sm">Entrez votre nom et prénom pour commencer</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-white/80">Nom <span className="text-red-400">*</span></Label>
                  <Input
                    id="nom"
                    type="text"
                    placeholder="Votre nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className={`bg-white/10 text-white placeholder:text-white/40 ${
                      attempted && !nom.trim() 
                        ? 'border-red-500 border-2' 
                        : 'border-white/20'
                    }`}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {attempted && !nom.trim() && (
                    <p className="text-red-400 text-xs">Champ obligatoire</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-white/80">Prénom <span className="text-red-400">*</span></Label>
                  <Input
                    id="prenom"
                    type="text"
                    placeholder="Votre prénom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className={`bg-white/10 text-white placeholder:text-white/40 ${
                      attempted && !prenom.trim() 
                        ? 'border-red-500 border-2' 
                        : 'border-white/20'
                    }`}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  {attempted && !prenom.trim() && (
                    <p className="text-red-400 text-xs">Champ obligatoire</p>
                  )}
                </div>
              </div>
              
              <Button
                onClick={handleSearch}
                disabled={isSearching || !nom.trim() || !prenom.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-6 text-lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Commencer mon inscription
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Prérequis */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 mb-12">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Rappel : pour accéder à la formation, vous devez
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Savoir lire et écrire le français</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Avoir un permis de conduire de plus de 3 ans (ou 2 ans si conduite accompagnée) en cours de validité</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Avoir le casier judiciaire B2 vierge</span>
              </li>
            </ul>
            <p className="mt-6 text-white/60 text-sm">
              Si une de ces conditions n'est pas respectée, merci de nous contacter.
            </p>
          </div>

          {/* Info carte pro */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 lg:p-8 mb-12">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Obtenir votre carte professionnelle</h3>
                <p className="text-white/70">
                  Pour obtenir la carte professionnelle de chauffeur TAXI ou VTC, vous devez réussir deux épreuves : 
                  un <strong className="text-white">examen d'admissibilité</strong> (théorique) et un <strong className="text-white">examen d'admission</strong> (pratique).
                </p>
              </div>
            </div>
          </div>

          {/* Steps overview */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">Les 11 étapes de votre inscription</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                "Documents requis",
                "Inscription CMA",
                "Département",
                "Type d'épreuve",
                "Date d'examen",
                "Formulaire",
                "Mot de passe",
                "Validation email",
                "Activer compte",
                "Documents CMA",
                "Numéro dossier",
              ].map((step, index) => (
                <div 
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mx-auto mb-2">
                    {index + 1}
                  </div>
                  <span className="text-xs text-white/70">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white/60 mb-4">
            <Phone className="w-4 h-4" />
            <span>04.28.29.60.91</span>
          </div>
          <p className="text-white/40 text-sm">
            FTRANSPORT - Centre de formation<br />
            86 Route de Genas, 69003 Lyon<br />
            De 9h à 17h sur rendez-vous
          </p>
        </div>
      </footer>
    </div>
  );
}
