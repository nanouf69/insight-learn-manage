import { useState } from "react";
import { Search, Filter, MoreVertical, Clock, Users, Euro, Calendar, Download, Send, ChevronDown, ChevronUp, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormationForm } from "./FormationForm";
import { Badge } from "@/components/ui/badge";

interface Formation {
  id: number;
  title: string;
  category: "Présentiel" | "E-learning";
  duration: string;
  price: number;
  priceWithExam?: number;
  participants: number;
  sessions: number;
  status: string;
  image: string;
  cpfEligible: boolean;
  dates: string[];
  prerequisites: string[];
  objectives: string;
  program: {
    troncCommun: string[];
    modulesSpecifiques: string[];
  };
  documents: string[];
  examDuration: string;
  accessibility: boolean;
}

const formations: Formation[] = [
  // Formations Présentiel VTC
  {
    id: 1,
    title: "Formation VTC",
    category: "Présentiel",
    duration: "2 semaines + 1 jour pratique",
    price: 1099,
    priceWithExam: 1599,
    participants: 24,
    sessions: 6,
    status: "active",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Du 12 au 25 janvier 2026",
      "Du 16 au 30 mars 2026",
      "Du 11 au 24 mai 2026",
      "Du 6 au 19 juillet 2026",
      "Du 14 au 27 septembre 2026",
      "Du 2 au 15 novembre 2026"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge"
    ],
    objectives: "Former les stagiaires au métier de chauffeur VTC et préparer à l'examen VTC réalisé par la Chambre des Métiers et de l'Artisanat.",
    program: {
      troncCommun: [
        "Réglementation T3P - Connaître la réglementation des transports publics particuliers",
        "Sécurité routière - Appliquer les règles du code de la route et sécurité",
        "Gestion - Principes de gestion et comptabilité",
        "Développement commercial - Bases de la relation client et marketing",
        "Relation client - Accueillir et prendre en charge la clientèle",
        "Orientation - Outils de navigation et axes de circulation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique VTC et T3P",
        "Développement commercial pour VTC",
        "Les applications de mise en relation",
        "La création et gestion d'entreprise VTC",
        "Le véhicule VTC : normes et exigences"
      ]
    },
    documents: [
      "Pièce d'identité ou carte de séjour ou résident",
      "Justificatif de domicile de moins de 3 mois",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  // Formation VTC avec frais d'examen
  {
    id: 2,
    title: "Formation VTC avec frais d'examen",
    category: "Présentiel",
    duration: "2 semaines + 1 jour pratique",
    price: 1599,
    participants: 22,
    sessions: 6,
    status: "active",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Du 12 au 25 janvier 2026",
      "Du 16 au 30 mars 2026",
      "Du 11 au 24 mai 2026",
      "Du 6 au 19 juillet 2026",
      "Du 14 au 27 septembre 2026",
      "Du 2 au 15 novembre 2026"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge"
    ],
    objectives: "Former les stagiaires au métier de chauffeur VTC avec frais d'examen inclus et voiture double commande.",
    program: {
      troncCommun: [
        "Réglementation T3P",
        "Sécurité routière",
        "Gestion et comptabilité",
        "Développement commercial",
        "Relation client",
        "Orientation et navigation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique VTC",
        "Applications de mise en relation",
        "Création d'entreprise VTC",
        "Véhicule VTC : normes"
      ]
    },
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  // Formations Présentiel TAXI
  {
    id: 3,
    title: "Formation TAXI",
    category: "Présentiel",
    duration: "3 semaines + 1 jour pratique",
    price: 1299,
    priceWithExam: 1799,
    participants: 24,
    sessions: 6,
    status: "active",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge"
    ],
    objectives: "Former les stagiaires au métier de chauffeur TAXI et préparer à l'examen TAXI réalisé par la Chambre des Métiers et de l'Artisanat.",
    program: {
      troncCommun: [
        "Réglementation T3P - Connaître la réglementation des transports publics particuliers",
        "Sécurité routière - Appliquer les règles du code de la route et sécurité",
        "Gestion - Principes de gestion et comptabilité",
        "Développement commercial - Bases de la relation client et marketing",
        "Relation client - Accueillir et prendre en charge la clientèle",
        "Orientation - Outils de navigation et axes de circulation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique TAXI",
        "La licence de taxi (ADS)",
        "Connaissance du territoire local",
        "La tarification taxi",
        "Les équipements obligatoires du taxi"
      ]
    },
    documents: [
      "Pièce d'identité ou carte de séjour ou résident",
      "Justificatif de domicile de moins de 3 mois",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  // Formation TAXI avec frais d'examen
  {
    id: 4,
    title: "Formation TAXI avec frais d'examen",
    category: "Présentiel",
    duration: "3 semaines + 1 jour pratique",
    price: 1799,
    participants: 18,
    sessions: 6,
    status: "active",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Du 5 au 26 janvier 2026",
      "Du 9 au 30 mars 2026",
      "Du 4 au 25 mai 2026",
      "Du 29 juin au 20 juillet 2026",
      "Du 7 au 28 septembre 2026",
      "Du 26 octobre au 16 novembre 2026"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge"
    ],
    objectives: "Former les stagiaires au métier de chauffeur TAXI avec frais d'examen inclus et voiture double commande.",
    program: {
      troncCommun: [
        "Réglementation T3P",
        "Sécurité routière",
        "Gestion et comptabilité",
        "Développement commercial",
        "Relation client",
        "Orientation et navigation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique TAXI",
        "Licence de taxi (ADS)",
        "Territoire local",
        "Tarification taxi",
        "Équipements obligatoires"
      ]
    },
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  // Formation Passerelle Taxi pour VTC
  {
    id: 5,
    title: "Formation TAXI pour chauffeur VTC",
    category: "Présentiel",
    duration: "35h",
    price: 599,
    participants: 15,
    sessions: 4,
    status: "active",
    image: "https://images.unsplash.com/photo-1594535182038-1f8d4c5d4e60?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Sessions sur demande",
      "Contactez-nous pour les prochaines dates"
    ],
    prerequisites: [
      "Être titulaire de la carte professionnelle VTC en cours de validité",
      "Savoir lire et écrire le français",
      "Casier judiciaire B2 vierge"
    ],
    objectives: "Permettre aux chauffeurs VTC d'obtenir la carte professionnelle TAXI via une formation passerelle.",
    program: {
      troncCommun: [],
      modulesSpecifiques: [
        "Réglementation spécifique TAXI",
        "La licence de taxi (ADS)",
        "Connaissance du territoire local",
        "La tarification taxi",
        "Les équipements obligatoires du taxi"
      ]
    },
    documents: [
      "Carte professionnelle VTC",
      "Pièce d'identité",
      "Justificatif de domicile",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Examen spécifique TAXI",
    accessibility: true
  },
  // Formations E-learning
  {
    id: 6,
    title: "Formation VTC",
    category: "E-learning",
    duration: "2 semaines + 1 jour pratique",
    price: 1599,
    participants: 156,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Démarrage immédiat",
      "Formation accessible 24h/24"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge",
      "Accès à un ordinateur et internet"
    ],
    objectives: "Former à distance les stagiaires au métier de chauffeur VTC avec accès aux cours en ligne et accompagnement personnalisé.",
    program: {
      troncCommun: [
        "Réglementation T3P",
        "Sécurité routière",
        "Gestion et comptabilité",
        "Développement commercial",
        "Relation client",
        "Orientation et navigation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique VTC",
        "Applications de mise en relation",
        "Création d'entreprise VTC",
        "QCM et examens blancs interactifs"
      ]
    },
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  {
    id: 7,
    title: "Formation TAXI",
    category: "E-learning",
    duration: "3 semaines + 1 jour pratique",
    price: 1299,
    participants: 128,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Démarrage immédiat",
      "Formation accessible 24h/24"
    ],
    prerequisites: [
      "Savoir lire et écrire le français",
      "Permis de conduire hors période probatoire (3 ans minimum)",
      "Casier judiciaire B2 vierge",
      "Accès à un ordinateur et internet"
    ],
    objectives: "Former à distance les stagiaires au métier de chauffeur TAXI avec accès aux cours en ligne et accompagnement personnalisé.",
    program: {
      troncCommun: [
        "Réglementation T3P",
        "Sécurité routière",
        "Gestion et comptabilité",
        "Développement commercial",
        "Relation client",
        "Orientation et navigation"
      ],
      modulesSpecifiques: [
        "Réglementation spécifique TAXI",
        "Licence de taxi (ADS)",
        "Territoire local",
        "Tarification taxi",
        "QCM et examens blancs interactifs"
      ]
    },
    documents: [
      "Pièce d'identité",
      "Justificatif de domicile",
      "Permis de conduire",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Théorique: 3h50 | Pratique: ~45 min",
    accessibility: true
  },
  {
    id: 8,
    title: "Formation TAXI pour chauffeur VTC",
    category: "E-learning",
    duration: "35h",
    price: 499,
    participants: 67,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Démarrage immédiat",
      "Formation accessible 24h/24"
    ],
    prerequisites: [
      "Être titulaire de la carte professionnelle VTC",
      "Accès à un ordinateur et internet"
    ],
    objectives: "Formation passerelle e-learning permettant aux chauffeurs VTC d'obtenir la carte professionnelle TAXI.",
    program: {
      troncCommun: [],
      modulesSpecifiques: [
        "Réglementation spécifique TAXI",
        "Licence de taxi (ADS)",
        "Territoire local",
        "Tarification taxi",
        "Examens blancs interactifs"
      ]
    },
    documents: [
      "Carte professionnelle VTC",
      "Pièce d'identité",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Examen spécifique TAXI",
    accessibility: true
  },
  {
    id: 9,
    title: "Formation VTC pour chauffeur TAXI",
    category: "E-learning",
    duration: "35h",
    price: 499,
    participants: 45,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
    cpfEligible: true,
    dates: [
      "Démarrage immédiat",
      "Formation accessible 24h/24"
    ],
    prerequisites: [
      "Être titulaire de la carte professionnelle TAXI",
      "Accès à un ordinateur et internet"
    ],
    objectives: "Formation passerelle e-learning permettant aux chauffeurs TAXI d'obtenir la carte professionnelle VTC.",
    program: {
      troncCommun: [],
      modulesSpecifiques: [
        "Réglementation spécifique VTC",
        "Applications de mise en relation",
        "Création d'entreprise VTC",
        "Véhicule VTC : normes",
        "Examens blancs interactifs"
      ]
    },
    documents: [
      "Carte professionnelle TAXI",
      "Pièce d'identité",
      "Photo d'identité",
      "Signature sur papier blanc"
    ],
    examDuration: "Examen spécifique VTC",
    accessibility: true
  }
];

function FormationDetailDialog({ formation }: { formation: Formation }) {
  const [programOpen, setProgramOpen] = useState(false);

  const handleDownloadProgram = () => {
    // Générer le contenu du programme en texte
    const programContent = `
PROGRAMME DE FORMATION
======================

${formation.title}
${formation.category}

DURÉE: ${formation.duration}
PRIX: ${formation.price}€${formation.priceWithExam ? ` (ou ${formation.priceWithExam}€ avec frais d'examen)` : ''}

OBJECTIFS
---------
${formation.objectives}

PRÉREQUIS
---------
${formation.prerequisites.map(p => `• ${p}`).join('\n')}

PROGRAMME
---------

${formation.program.troncCommun.length > 0 ? `Tronc Commun VTC/TAXI:
${formation.program.troncCommun.map(p => `• ${p}`).join('\n')}` : ''}

Modules Spécifiques:
${formation.program.modulesSpecifiques.map(p => `• ${p}`).join('\n')}

DOCUMENTS REQUIS POUR L'INSCRIPTION
-----------------------------------
${formation.documents.map(d => `• ${d}`).join('\n')}

DURÉE DE L'EXAMEN
-----------------
${formation.examDuration}

DATES DE SESSION
----------------
${formation.dates.join('\n')}

ACCESSIBILITÉ
-------------
${formation.accessibility ? 'Formation accessible aux personnes en situation de handicap' : 'Nous contacter pour les modalités d\'accessibilité'}

---
Ftransport Lyon
86 Route de Genas, 69003 Lyon
Tél: 04 28 29 60 91
Email: contact@ftransport.fr
`;

    const blob = new Blob([programContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Programme_${formation.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendProgram = () => {
    const subject = encodeURIComponent(`Demande d'information - ${formation.title}`);
    const body = encodeURIComponent(`Bonjour,

Je souhaite recevoir plus d'informations concernant la formation "${formation.title}" (${formation.category}).

Merci de me contacter pour discuter des modalités d'inscription.

Cordialement`);
    window.open(`mailto:contact@ftransport.fr?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-primary">
          Voir détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={formation.category === "Présentiel" ? "default" : "secondary"}>
              {formation.category}
            </Badge>
            {formation.cpfEligible && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Éligible CPF
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{formation.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Objectifs */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Objectifs de la formation
            </h4>
            <p className="text-sm text-muted-foreground">{formation.objectives}</p>
          </div>

          {/* Prix et Durée */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Euro className="w-4 h-4" />
                Prix
              </div>
              <div className="text-2xl font-bold text-primary">{formation.price}€</div>
              {formation.priceWithExam && (
                <div className="text-sm text-muted-foreground">
                  ou {formation.priceWithExam}€ avec examen
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                Durée
              </div>
              <div className="text-lg font-semibold">{formation.duration}</div>
              <div className="text-sm text-muted-foreground">{formation.examDuration}</div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              Prochaines sessions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {formation.dates.map((date, index) => (
                <div key={index} className="text-sm bg-muted/30 rounded px-3 py-2">
                  {date}
                </div>
              ))}
            </div>
          </div>

          {/* Prérequis */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4" />
              Prérequis
            </h4>
            <ul className="space-y-2">
              {formation.prerequisites.map((prereq, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>

          {/* Programme */}
          <Collapsible open={programOpen} onOpenChange={setProgramOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Programme de la formation
                </span>
                {programOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {formation.program.troncCommun.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-2">Tronc Commun VTC/TAXI</h5>
                  <ul className="space-y-1.5">
                    {formation.program.troncCommun.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h5 className="font-medium text-sm text-muted-foreground mb-2">Modules Spécifiques</h5>
                <ul className="space-y-1.5">
                  {formation.program.modulesSpecifiques.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Documents requis */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Documents requis pour l'inscription</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {formation.documents.map((doc, index) => (
                <li key={index}>• {doc}</li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleDownloadProgram} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Télécharger le programme
            </Button>
            <Button onClick={handleSendProgram} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Demander des infos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FormationsList() {
  const [filter, setFilter] = useState<"all" | "Présentiel" | "E-learning">("all");

  const filteredFormations = filter === "all" 
    ? formations 
    : formations.filter(f => f.category === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une formation..." 
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                Toutes les formations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("Présentiel")}>
                Présentiel uniquement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("E-learning")}>
                E-learning uniquement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <FormationForm />
      </div>

      {/* Filter Tags */}
      <div className="flex gap-2">
        <Badge 
          variant={filter === "all" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setFilter("all")}
        >
          Toutes ({formations.length})
        </Badge>
        <Badge 
          variant={filter === "Présentiel" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setFilter("Présentiel")}
        >
          Présentiel ({formations.filter(f => f.category === "Présentiel").length})
        </Badge>
        <Badge 
          variant={filter === "E-learning" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setFilter("E-learning")}
        >
          E-learning ({formations.filter(f => f.category === "E-learning").length})
        </Badge>
      </div>

      {/* Formations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFormations.map((formation) => (
          <div 
            key={formation.id} 
            className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 animate-slide-up"
          >
            <div className="relative h-40 overflow-hidden">
              <img 
                src={formation.image} 
                alt={formation.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant={formation.category === "Présentiel" ? "default" : "secondary"}>
                  {formation.category}
                </Badge>
                {formation.cpfEligible && (
                  <Badge variant="outline" className="bg-background/80 text-green-600 border-green-600">
                    CPF
                  </Badge>
                )}
              </div>
              <div className="absolute top-3 right-3">
                <span className={formation.status === "active" ? "badge-success" : "badge-warning"}>
                  {formation.status === "active" ? "Active" : "Brouillon"}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {formation.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formation.duration}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                    <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                    <DropdownMenuItem>Planifier session</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Euro className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{formation.price}€</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {formation.participants}
                </span>
                {formation.category === "Présentiel" && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formation.sessions} dates
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formation.dates[0]}
                </span>
                <FormationDetailDialog formation={formation} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
