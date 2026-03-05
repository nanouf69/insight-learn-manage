import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, Save, X, CheckCircle2, Eye, Settings, Download, FileText, Upload, Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import SlideViewer from "./slides/SlideViewer";
import PdfSlideViewer from "./PdfSlideViewer";
import ImageCarouselViewer from "./ImageCarouselViewer";
import PptxViewerComparison from "./PptxViewerComparison";
import { T3P_PARTIE1_SLIDES, type Slide } from "./slides/t3p-partie1-data";
import { T3P_PARTIE2_SLIDES } from "./slides/t3p-partie2-data";
import { GESTION_PARTIE1_SLIDES } from "./slides/gestion-partie1-data";
import { GESTION_PARTIE2_SLIDES } from "./slides/gestion-partie2-data";
import { GESTION_PARTIE3_SLIDES } from "./slides/gestion-partie3-data";

// Images des monuments et lieux de Lyon
import imgCathedraleStJean from "@/assets/pratique/cathedrale-st-jean.jpg";
import imgBasiliqueFourviere from "@/assets/pratique/basilique-fourviere.jpg";
import imgEgliseStGeorges from "@/assets/pratique/eglise-st-georges.jpg";
import imgPlaceBellecour from "@/assets/pratique/place-bellecour.jpg";
import imgPlaceTerreaux from "@/assets/pratique/place-terreaux.jpg";
import imgOperaLyon from "@/assets/pratique/opera-lyon.jpg";
import imgHotelDeVille from "@/assets/pratique/hotel-de-ville.jpg";
import imgParcTeteDor from "@/assets/pratique/parc-tete-dor.jpg";
import imgHotelDieu from "@/assets/pratique/hotel-dieu.jpg";
import imgMuseeConfluences from "@/assets/pratique/musee-confluences.jpg";
import imgTourOxygene from "@/assets/pratique/tour-oxygene.jpg";
import imgTourIncity from "@/assets/pratique/tour-incity.jpg";
import imgFresqueLyonnais from "@/assets/pratique/fresque-lyonnais.jpg";
import imgMurCanuts from "@/assets/pratique/mur-canuts.jpg";
import imgPaulBocuse from "@/assets/pratique/paul-bocuse.jpg";
import imgChateauMotte from "@/assets/pratique/chateau-motte.jpg";
import imgBrasserieGeorges from "@/assets/pratique/brasserie-georges.jpg";
import imgParcBlandan from "@/assets/pratique/parc-blandan.jpg";
import imgQuenelle from "@/assets/pratique/quenelle.jpg";
import imgBugnes from "@/assets/pratique/bugnes.jpg";
import { VTC_COURS_DATA, VTC_SECTIONS } from "./vtc-cours-data";
import { FORMULES_DATA } from "./formules-data";
import { TAXI_COURS_DATA, TAXI_SECTIONS } from "./taxi-cours-data";
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from "./controle-connaissances-taxi-data";
import { CONNAISSANCES_VILLE_TAXI_DATA } from "./connaissances-ville-taxi-data";
import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";
import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { BILAN_EXAMEN_VTC } from "./bilan-examen-vtc-data";
import { BILAN_EXAMEN_TAXI } from "./bilan-examen-taxi-data";

interface InlineQuizQuestion {
  id: number;
  enonce: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
  explication?: string;
}

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string;
  quiz?: InlineQuizQuestion[];
}

interface ExerciceChoix {
  lettre: string;
  texte: string;
  correct?: boolean;
}

interface ExerciceQuestion {
  id: number;
  enonce: string;
  choix: ExerciceChoix[];
}

interface ExerciceItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
  questions?: ExerciceQuestion[];
  fichiers?: { nom: string; url: string }[];
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ExerciceItem[];
}

interface ModuleDetailViewProps {
  module: { id: number; nom: string };
  onBack: () => void;
  studentOnly?: boolean;
  apprenantId?: string | null;
  onModuleCompleted?: (moduleId: number) => void;
  apprenantType?: string | null;
}

// ===== Données initiales du module INTRODUCTION PRÉSENTIEL =====
const INTRODUCTION_PRESENTIEL_DATA: ModuleData = {
  id: 1,
  nom: "1.INTRODUCTION PRÉSENTIEL",
  description: "Livret d'accueil pour les formations en présentiel : organisation de l'examen, programme, coefficients, CGV, règlement intérieur.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue sur la plateforme",
      description: `Cette plateforme est dédiée aux futurs chauffeurs VTC et TAXIS. Vous devez réussir deux épreuves pour obtenir votre carte de chauffeur VTC ou de chauffeur TAXI :
• L'épreuve d'admissibilité (théorie avec 7 matières) — minimum 10/20
• L'épreuve d'admission (pratique) — minimum 12/20
Le tout sans note éliminatoire.

Vous avez à disposition : des cours, des exercices, des examens blancs et des bilans. L'accès à cette plateforme est limité.`,
      actif: true,
    },
    {
      id: 2,
      titre: "Informations importantes",
      description: `⚠️ Délai : Vous devez réussir votre examen théorique sous 6 mois à compter de l'envoi de vos identifiants. Passé ce délai, l'entraînement pratique et le véhicule seront facturés.

💰 Frais d'examen en cas d'échec (à votre charge) :
• Examen théorique : environ 237€
• Examen pratique : environ 180€

📋 Les examens sont organisés par la Chambre des Métiers et de l'Artisanat. Vérifiez bien votre inscription.

📞 Contactez-nous le jour des résultats de l'examen théorique (et non le jour de réception de la convocation pratique). En nous contactant plus tard, nous ne pouvons garantir un entraînement pratique et un véhicule.`,
      actif: true,
    },
    {
      id: 3,
      titre: "Contenu de l'examen — Épreuves communes",
      description: `L'examen se compose d'épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES COMMUNES TAXI & VTC :

A — Réglementation T3P et prévention des discriminations
   Durée : 45 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

B — Gestion et développement commercial
   Durée : 45 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20

C — Sécurité routière
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

D — Français (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20
   ⚠️ -1 point toutes les 5 fautes d'orthographe sur les QRC

E — Anglais (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 1 | Éliminatoire : 4/20`,
      actif: true,
    },
    {
      id: 4,
      titre: "Épreuves spécifiques VTC & TAXI",
      description: `📝 ÉPREUVES SPÉCIFIQUES VTC :
F(V) — Développement commercial et gestion VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(V) — Réglementation nationale spécifique VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

📝 ÉPREUVES SPÉCIFIQUES TAXI :
F(T) — Connaissance du territoire et réglementation locale
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(T) — Réglementation nationale TAXI et gestion
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`,
      actif: true,
    },
    {
      id: 5,
      titre: "L'épreuve d'admission (pratique)",
      description: `Après chaque session d'admissibilité, une session d'admission est organisée dans un délai maximum de 2 mois.

L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20

💰 En cas d'échec à l'examen pratique :
• Frais d'examen CMA à votre charge
• Location du véhicule : environ 200€ TTC`,
      actif: true,
    },
    {
      id: 6,
      titre: "Horaires et accueil — Formation présentielle",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

⏰ Horaires de formation : 9h-12h et 13h-17h
📋 Effectif maximum : 21 stagiaires par session

📌 Prérequis : savoir lire et écrire, casier B2 vierge.

👥 Équipe :
• Responsable pédagogique : Guenichi Naoufal
• Responsable administrative : Baaziz Fadela
• Formatrice Taxi : Rim Touil
• Formateur VTC : Guenichi Naoufal
• Formateur Anglais : Albert Akono`,
      actif: true,
    },
    {
      id: 7,
      titre: "Livret d'accueil complet (PDF)",
      description: "Téléchargez le livret d'accueil complet au format PDF pour la formation en présentiel.",
      actif: true,
      fichiers: [
        { nom: "Livret d'accueil Présentiel", url: "/cours/vtc/INTRODUCTION_presentiel.docx" },
      ],
    },
  ],
  exercices: [
    {
      id: 1,
      titre: "Quiz Introduction",
      sousTitre: "Vérifiez vos connaissances sur l'examen",
      actif: true,
      questions: [
        { id: 1, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique (admissibilité) ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }, { lettre: "D", texte: "14/20" }] },
        { id: 2, enonce: "Quelle note minimale faut-il obtenir à l'épreuve pratique (admission) ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "11/20" }, { lettre: "C", texte: "12/20", correct: true }, { lettre: "D", texte: "14/20" }] },
        { id: 3, enonce: "Combien de matières comporte l'épreuve théorique ?", choix: [{ lettre: "A", texte: "5 matières" }, { lettre: "B", texte: "6 matières" }, { lettre: "C", texte: "7 matières", correct: true }, { lettre: "D", texte: "8 matières" }] },
        { id: 4, enonce: "Quelle est la durée de l'épreuve A (Réglementation T3P) ?", choix: [{ lettre: "A", texte: "20 minutes" }, { lettre: "B", texte: "30 minutes" }, { lettre: "C", texte: "45 minutes", correct: true }, { lettre: "D", texte: "60 minutes" }] },
        { id: 5, enonce: "En cas d'échec à l'examen théorique, quel est le coût approximatif des frais d'examen ?", choix: [{ lettre: "A", texte: "150€" }, { lettre: "B", texte: "237€", correct: true }, { lettre: "C", texte: "300€" }, { lettre: "D", texte: "180€" }] },
        { id: 6, enonce: "Pour l'épreuve de Français (D), combien de fautes d'orthographe entraînent une pénalité de -1 point ?", choix: [{ lettre: "A", texte: "3 fautes" }, { lettre: "B", texte: "5 fautes", correct: true }, { lettre: "C", texte: "10 fautes" }, { lettre: "D", texte: "Aucune pénalité" }] },
        { id: 7, enonce: "Combien de fois un candidat admissible peut-il se présenter à l'épreuve pratique ?", choix: [{ lettre: "A", texte: "1 fois" }, { lettre: "B", texte: "2 fois" }, { lettre: "C", texte: "3 fois", correct: true }, { lettre: "D", texte: "Illimité" }] },
        { id: 8, enonce: "Quel est le délai pour réussir l'examen théorique après réception des identifiants ?", choix: [{ lettre: "A", texte: "3 mois" }, { lettre: "B", texte: "6 mois", correct: true }, { lettre: "C", texte: "12 mois" }, { lettre: "D", texte: "Pas de délai" }] },
        { id: 9, enonce: "Quelle est la note éliminatoire pour l'épreuve d'Anglais (E) ?", choix: [{ lettre: "A", texte: "4/20", correct: true }, { lettre: "B", texte: "6/20" }, { lettre: "C", texte: "8/20" }, { lettre: "D", texte: "10/20" }] },
        { id: 10, enonce: "Quelle est la durée minimale de la phase de conduite lors de l'épreuve pratique ?", choix: [{ lettre: "A", texte: "10 minutes" }, { lettre: "B", texte: "15 minutes" }, { lettre: "C", texte: "20 minutes", correct: true }, { lettre: "D", texte: "30 minutes" }] },
      ],
    },
  ],
};

// ===== Données initiales du module INTRODUCTION E-LEARNING =====
const INTRODUCTION_ELEARNING_DATA: ModuleData = {
  id: 26,
  nom: "1.INTRODUCTION E-LEARNING",
  description: "Livret d'accueil pour les formations en e-learning : organisation de l'examen, programme, coefficients, CGV.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue sur la plateforme",
      description: `Cette plateforme est dédiée aux futurs chauffeurs VTC et TAXIS. Vous devez réussir deux épreuves pour obtenir votre carte de chauffeur VTC ou de chauffeur TAXI :
• L'épreuve d'admissibilité (théorie avec 7 matières) — minimum 10/20
• L'épreuve d'admission (pratique) — minimum 12/20
Le tout sans note éliminatoire.

Vous avez à disposition : des cours, des exercices, des examens blancs et des bilans. L'accès à cette plateforme est limité. Réalisez bien le Bilan QCM examen et révisez bien les QRC examen : ce sont des questions type examen.`,
      actif: true,
    },
    {
      id: 2,
      titre: "Informations importantes",
      description: `💰 Frais d'examen en cas d'échec (toujours à votre charge) :
• Examen théorique : environ 240€
• Examen pratique : environ 200€

📋 Les examens sont organisés par la Chambre des Métiers et de l'Artisanat. Vérifiez bien que vous êtes inscrit aux examens ; vous pouvez toujours nous contacter pour cela.

📞 Merci de nous contacter le jour des résultats de l'examen théorique (épreuve d'admissibilité) et non le jour de réception de la convocation de l'épreuve d'admission.

En nous contactant plus tard, le centre ne peut vous garantir un entraînement pratique Taxi/VTC et un véhicule pour l'épreuve d'admission (pratique).`,
      actif: true,
    },
    {
      id: 3,
      titre: "Contenu de l'examen — Épreuves communes",
      description: `L'examen se compose d'épreuves théoriques d'admissibilité (QCM + QRC) et d'une épreuve pratique d'admission.

📝 ÉPREUVES COMMUNES TAXI & VTC :

A — Réglementation T3P et prévention des discriminations
   Durée : 45 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

B — Gestion et développement commercial
   Durée : 45 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20

C — Sécurité routière
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

D — Français (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 2 | Éliminatoire : 6/20
   ⚠️ -1 point toutes les 5 fautes d'orthographe sur les QRC

E — Anglais (expression et compréhension)
   Durée : 30 min | Note sur 20 | Coeff. 1 | Éliminatoire : 4/20`,
      actif: true,
    },
    {
      id: 4,
      titre: "Épreuves spécifiques VTC & TAXI",
      description: `📝 ÉPREUVES SPÉCIFIQUES VTC :
F(V) — Développement commercial et gestion VTC
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(V) — Réglementation nationale spécifique VTC
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

📝 ÉPREUVES SPÉCIFIQUES TAXI :
F(T) — Connaissance du territoire et réglementation locale
   Durée : 30 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20
G(T) — Réglementation nationale TAXI et gestion
   Durée : 20 min | Note sur 20 | Coeff. 3 | Éliminatoire : 6/20

✅ CONDITIONS D'ADMISSIBILITÉ :
• Moyenne ≥ 10/20 (pondérée des coefficients)
• Aucune note éliminatoire

Un candidat admissible peut se présenter 3 fois à l'épreuve pratique dans un délai d'1 an.`,
      actif: true,
    },
    {
      id: 5,
      titre: "L'épreuve d'admission (pratique)",
      description: `Après chaque session d'admissibilité, une session d'admission est organisée dans un délai maximum de 2 mois.

L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points.

📌 Note minimale requise : 12/20`,
      actif: true,
    },
    {
      id: 6,
      titre: "Contact et informations pratiques",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

📌 Prérequis : savoir lire et écrire, casier B2 vierge.`,
      actif: true,
    },
    {
      id: 7,
      titre: "Livret d'accueil complet (PDF)",
      description: "Téléchargez le livret d'accueil complet au format PDF pour la formation en e-learning.",
      actif: true,
      fichiers: [
        { nom: "Livret d'accueil E-learning", url: "/cours/vtc/INTRODUCTION_elearning.docx" },
      ],
    },
  ],
  exercices: [
    {
      id: 1,
      titre: "Quiz Introduction",
      sousTitre: "Vérifiez vos connaissances sur l'examen",
      actif: true,
      questions: [
        { id: 1, enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique (admissibilité) ?", choix: [{ lettre: "A", texte: "8/20" }, { lettre: "B", texte: "10/20", correct: true }, { lettre: "C", texte: "12/20" }, { lettre: "D", texte: "14/20" }] },
        { id: 2, enonce: "Quelle note minimale faut-il obtenir à l'épreuve pratique (admission) ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "11/20" }, { lettre: "C", texte: "12/20", correct: true }, { lettre: "D", texte: "14/20" }] },
        { id: 3, enonce: "Combien de matières comporte l'épreuve théorique ?", choix: [{ lettre: "A", texte: "5 matières" }, { lettre: "B", texte: "6 matières" }, { lettre: "C", texte: "7 matières", correct: true }, { lettre: "D", texte: "8 matières" }] },
        { id: 4, enonce: "Quelle est la durée de l'épreuve A (Réglementation T3P) ?", choix: [{ lettre: "A", texte: "20 minutes" }, { lettre: "B", texte: "30 minutes" }, { lettre: "C", texte: "45 minutes", correct: true }, { lettre: "D", texte: "60 minutes" }] },
        { id: 5, enonce: "En cas d'échec à l'examen théorique, quel est le coût approximatif des frais d'examen ?", choix: [{ lettre: "A", texte: "150€" }, { lettre: "B", texte: "240€", correct: true }, { lettre: "C", texte: "300€" }, { lettre: "D", texte: "180€" }] },
        { id: 6, enonce: "Pour l'épreuve de Français (D), combien de fautes d'orthographe entraînent une pénalité de -1 point ?", choix: [{ lettre: "A", texte: "3 fautes" }, { lettre: "B", texte: "5 fautes", correct: true }, { lettre: "C", texte: "10 fautes" }, { lettre: "D", texte: "Aucune pénalité" }] },
        { id: 7, enonce: "Combien de fois un candidat admissible peut-il se présenter à l'épreuve pratique ?", choix: [{ lettre: "A", texte: "1 fois" }, { lettre: "B", texte: "2 fois" }, { lettre: "C", texte: "3 fois", correct: true }, { lettre: "D", texte: "Illimité" }] },
        { id: 8, enonce: "Quelle est la note éliminatoire pour l'épreuve d'Anglais (E) ?", choix: [{ lettre: "A", texte: "4/20", correct: true }, { lettre: "B", texte: "6/20" }, { lettre: "C", texte: "8/20" }, { lettre: "D", texte: "10/20" }] },
        { id: 9, enonce: "Quelle est la durée minimale de la phase de conduite lors de l'épreuve pratique ?", choix: [{ lettre: "A", texte: "10 minutes" }, { lettre: "B", texte: "15 minutes" }, { lettre: "C", texte: "20 minutes", correct: true }, { lettre: "D", texte: "30 minutes" }] },
        { id: 10, enonce: "Quel est le coefficient de l'épreuve C (Sécurité routière) ?", choix: [{ lettre: "A", texte: "1" }, { lettre: "B", texte: "2" }, { lettre: "C", texte: "3", correct: true }, { lettre: "D", texte: "4" }] },
      ],
    },
  ],
};

// ===== Introduction TA Présentiel (ID 31) =====
const INTRODUCTION_TA_PRESENTIEL_DATA: ModuleData = {
  id: 31,
  nom: "1.INTRODUCTION TA",
  description: "Livret d'accueil pour la formation passerelle TA (présentiel) : programme, planning, règlement intérieur.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue — Formation TAXI pour chauffeurs VTC",
      description: `Cette formation passerelle vous permet d'obtenir votre carte de chauffeur TAXI si vous êtes déjà titulaire de la carte VTC.

L'examen comporte 2 matières spécifiques :
• Réglementation nationale TAXI
• Réglementation locale`,
      actif: true,
    },
    {
      id: 2,
      titre: "Programme — Réglementation nationale",
      description: `📝 RÉGLEMENTATION NATIONALE TAXI :

• Connaître le fonctionnement des équipements spéciaux obligatoires et du terminal de paiement électronique
• Connaître l'articulation entre les réglementations nationales et locales
• Connaître les régimes d'autorisation de stationnement
• Connaître les règles de tarification d'une course de Taxi
• Connaître les activités complémentaires ouvertes aux taxis : services réguliers de transport, transport assis professionnalisé
• Connaître les règles de détaxation partielle de la TICPE
• Connaître la réglementation relative à la taxe de stationnement
• Connaître le territoire d'exercice de l'activité
• Connaître le règlement local en vigueur`,
      actif: true,
    },
    {
      id: 3,
      titre: "Programme — Réglementation locale",
      description: `📝 RÉGLEMENTATION LOCALE (spécifique TAXI) :

Connaître le territoire d'exercice de l'activité :
• Les principaux lieux, sites, bâtiments publics
• Les principaux axes routiers
• Connaître le règlement local en vigueur`,
      actif: true,
    },
    {
      id: 4,
      titre: "Planning de formation",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

⏰ Horaires de formation : 9h-12h et 13h-17h

Le planning détaillé vous sera communiqué en début de formation.`,
      actif: true,
    },
    {
      id: 5,
      titre: "Règlement intérieur",
      description: `📋 RÈGLEMENT INTÉRIEUR :

• Ponctualité obligatoire — toute absence doit être signalée
• Tenue correcte exigée
• Interdiction d'utiliser le téléphone pendant les cours
• Respect des locaux et du matériel
• Respect mutuel entre stagiaires et formateurs
• Toute forme de discrimination est interdite

Le règlement intérieur complet est disponible en téléchargement.`,
      actif: true,
    },
  ],
  exercices: [],
};

// ===== Introduction TA E-Learning (ID 32) =====
const INTRODUCTION_TA_ELEARNING_DATA: ModuleData = {
  id: 32,
  nom: "1.INTRODUCTION TA E-LEARNING",
  description: "Livret d'accueil pour la formation passerelle TA (e-learning) : programme des 2 matières.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue — Formation TAXI pour chauffeurs VTC (E-learning)",
      description: `Cette formation passerelle en e-learning vous permet d'obtenir votre carte de chauffeur TAXI si vous êtes déjà titulaire de la carte VTC.

L'examen comporte 2 matières spécifiques :
• Réglementation nationale TAXI
• Réglementation locale`,
      actif: true,
    },
    {
      id: 2,
      titre: "Programme — Réglementation nationale",
      description: `📝 RÉGLEMENTATION NATIONALE TAXI :

• Connaître le fonctionnement des équipements spéciaux obligatoires et du terminal de paiement électronique
• Connaître l'articulation entre les réglementations nationales et locales
• Connaître les régimes d'autorisation de stationnement
• Connaître les règles de tarification d'une course de Taxi
• Connaître les activités complémentaires ouvertes aux taxis : services réguliers de transport, transport assis professionnalisé
• Connaître les règles de détaxation partielle de la TICPE
• Connaître la réglementation relative à la taxe de stationnement
• Connaître le territoire d'exercice de l'activité
• Connaître le règlement local en vigueur`,
      actif: true,
    },
    {
      id: 3,
      titre: "Programme — Réglementation locale",
      description: `📝 RÉGLEMENTATION LOCALE (spécifique TAXI) :

Connaître le territoire d'exercice de l'activité :
• Les principaux lieux, sites, bâtiments publics
• Les principaux axes routiers
• Connaître le règlement local en vigueur`,
      actif: true,
    },
    {
      id: 4,
      titre: "Contact",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr`,
      actif: true,
    },
  ],
  exercices: [],
};

// ===== Introduction VA Présentiel (ID 33) =====
const INTRODUCTION_VA_PRESENTIEL_DATA: ModuleData = {
  id: 33,
  nom: "1.INTRODUCTION VA",
  description: "Livret d'accueil pour la formation passerelle VA (présentiel) : programme, planning, règlement intérieur.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue — Formation VTC pour chauffeurs TAXI",
      description: `Cette formation passerelle vous permet d'obtenir votre carte de chauffeur VTC si vous êtes déjà titulaire de la carte TAXI.

L'examen comporte 2 matières spécifiques :
• Développement Commercial
• Réglementation spécifique VTC`,
      actif: true,
    },
    {
      id: 2,
      titre: "Programme — Développement Commercial",
      description: `📝 DÉVELOPPEMENT COMMERCIAL :

• Connaître et comprendre les principes généraux du marketing (analyse de marché, ciblage de l'offre, compétitivité, détermination du prix...)
• Savoir valoriser les qualités de la prestation commerciale VTC
• Savoir fidéliser ses clients et prospecter pour en obtenir d'autres
• Savoir mener des actions de communication pour faire connaître son entreprise, notamment par internet et les moyens numériques
• Savoir développer un réseau de partenaires favorisant l'accès à la clientèle (hôtels, entreprises...)`,
      actif: true,
    },
    {
      id: 3,
      titre: "Programme — Réglementation spécifique VTC",
      description: `📝 RÉGLEMENTATION SPÉCIFIQUE VTC :

• Connaître les dispositions relatives aux exploitants : les modalités d'inscription au registre des VTC, les règles relatives à la capacité financière…
• Connaître les obligations spécifiques relatives aux véhicules d'exploitation (dimensions, puissance, âge...) et connaître leur signalisation
• Savoir établir les documents relatifs à l'exécution de la prestation de transport qui doivent être présentés en cas de contrôle`,
      actif: true,
    },
    {
      id: 4,
      titre: "Planning de formation",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

⏰ Horaires de formation : 9h-12h et 13h-17h

Le planning détaillé vous sera communiqué en début de formation.`,
      actif: true,
    },
    {
      id: 5,
      titre: "Règlement intérieur",
      description: `📋 RÈGLEMENT INTÉRIEUR :

• Ponctualité obligatoire — toute absence doit être signalée
• Tenue correcte exigée
• Interdiction d'utiliser le téléphone pendant les cours
• Respect des locaux et du matériel
• Respect mutuel entre stagiaires et formateurs
• Toute forme de discrimination est interdite

Le règlement intérieur complet est disponible en téléchargement.`,
      actif: true,
    },
  ],
  exercices: [],
};

// ===== Introduction VA E-Learning (ID 34) =====
const INTRODUCTION_VA_ELEARNING_DATA: ModuleData = {
  id: 34,
  nom: "1.INTRODUCTION VA E-LEARNING",
  description: "Livret d'accueil pour la formation passerelle VA (e-learning) : programme des 2 matières.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue — Formation VTC pour chauffeurs TAXI (E-learning)",
      description: `Cette formation passerelle en e-learning vous permet d'obtenir votre carte de chauffeur VTC si vous êtes déjà titulaire de la carte TAXI.

L'examen comporte 2 matières spécifiques :
• Développement Commercial
• Réglementation spécifique VTC`,
      actif: true,
    },
    {
      id: 2,
      titre: "Programme — Développement Commercial",
      description: `📝 DÉVELOPPEMENT COMMERCIAL :

• Connaître et comprendre les principes généraux du marketing (analyse de marché, ciblage de l'offre, compétitivité, détermination du prix...)
• Savoir valoriser les qualités de la prestation commerciale VTC
• Savoir fidéliser ses clients et prospecter pour en obtenir d'autres
• Savoir mener des actions de communication pour faire connaître son entreprise, notamment par internet et les moyens numériques
• Savoir développer un réseau de partenaires favorisant l'accès à la clientèle (hôtels, entreprises...)`,
      actif: true,
    },
    {
      id: 3,
      titre: "Programme — Réglementation spécifique VTC",
      description: `📝 RÉGLEMENTATION SPÉCIFIQUE VTC :

• Connaître les dispositions relatives aux exploitants : les modalités d'inscription au registre des VTC, les règles relatives à la capacité financière…
• Connaître les obligations spécifiques relatives aux véhicules d'exploitation (dimensions, puissance, âge...) et connaître leur signalisation
• Savoir établir les documents relatifs à l'exécution de la prestation de transport qui doivent être présentés en cas de contrôle`,
      actif: true,
    },
    {
      id: 4,
      titre: "Contact",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr`,
      actif: true,
    },
  ],
  exercices: [],
};

// ===== Données initiales des modules PRATIQUE =====
const PRATIQUE_TAXI_DATA: ModuleData = {
  id: 6,
  nom: "8.PRATIQUE TAXI",
  description: "Cours et exercices pour la préparation à l'épreuve pratique TAXI — Déroulement de l'examen, lieux touristiques de Lyon, facturation et relation client.",
  cours: [
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique TAXI", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", description: "L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points. Est déclaré reçu le candidat ayant obtenu au moins 12/20.", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique TAXI", sousTitre: "Accueil des jurys, tirage au sort de la destination, taximètre, parcours aller-retour, prise de congé", description: "1) Arrangements techniques. 2) Accueil des jurys. 3) Présentation carte grise et assurance. 4) Tirage au sort destination. 5) Démarrage taximètre et GPS (6 min max). 6) Parcours aller-retour. 7) Facturation et prise de congé.", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges", image: imgCathedraleStJean, description: "• Cathédrale St Jean (1480) — Vieux Lyon, 5e arr., près du funiculaire de Fourvière.\n• Basilique de Fourvière (1886) — Patrimoine mondial UNESCO 1998, surplombe la ville.\n• Église St Georges (1848) — Vieux Lyon, entre Quarantaine et St-Jean.", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place Bellecour, Palais de Justice, Place des Terreaux, Opéra, Hôtel de Ville", image: imgPlaceBellecour, description: "• Place Bellecour — 5e plus grande place de France, statue de Louis XIV.\n• Palais de Justice (1835) — 5e arr., « Palais des 24 colonnes ».\n• Place des Terreaux — 1er arr., fontaine Bartholdi.\n• Opéra de Lyon (1831) — restructuré par Jean Nouvel (1993).\n• Hôtel de Ville — entre Place des Terreaux et Place de la Comédie.", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", image: imgTourIncity, description: "• Tour Part-Dieu « le crayon » — 42 étages, 165m, ouverte depuis 1977.\n• Tour Oxygène — 28 niveaux, 117m, inaugurée en 2010.\n• Tour Incity « la gomme » — 39 étages, 202m, 3e plus haut gratte-ciel de France, inaugurée en 2016.", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts, Mur du cinéma — Paul Bocuse, Frères Lumière", image: imgFresqueLyonnais, description: "• Fresque des Lyonnais — 800m², 30 personnages, 2 rue de la Martinière 69001.\n• Mur des Canuts — 36 Bd des Canuts 69004, plus grand d'Europe (1200m²).\n• Mur du cinéma — Place Gabriel Péri 69007.\n• Paul Bocuse — 3 étoiles Michelin 53 ans.\n• Frères Lumière — pionniers du cinéma.\n• Tony Garnier — architecte urbaniste.", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Parc de Gerland", image: imgParcTeteDor, description: "• Parc de la Tête d'Or (117 ha) — zoo, jardin botanique, vélodrome, Guignol.\n• Parc Blandan — skate park, carousel, jeux enfants.\n• Parc de Parilly — hippodrome, stade d'athlétisme, 10 terrains de foot.\n• Château de la Motte — 7e arr., motte castrale.\n• Fort St Jean — 1er arr., première ceinture.\n• Domaine de la Bachasse — Sainte-Foy-lès-Lyon.", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes, Bouchons lyonnais", image: imgQuenelle, description: "• Quenelle — semoule de blé dur, beurre, œufs, lait.\n• Cervelle de canut — fromage blanc, herbes, échalote.\n• Tablier de sapeur — gras-double (estomac de bœuf).\n• Bugnes, Coussins lyonnais, Tarte praline.\n• Brasserie Georges (2e, cours Verdun) — fruits de mer, choucroute.\n• Bouchons lyonnais — restaurants typiques (Le Mercière, Aux Trois Maries).", actif: true },
    { id: 9, titre: "9. Facturation et taximètre", sousTitre: "Compteur horokilométrique, sélection du tarif, suppléments, terminal de paiement", description: "Utilisation du compteur horokilométrique, sélection du tarif approprié, établissement de la facturation avec suppléments, terminal de paiement électronique. Note de course obligatoire à partir de 25€ TTC.", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre", description: "• Tenue élégante (pas de baskets/casquettes).\n• GPS sur téléphone (Waze/Maps), tester avant l'examen.\n• Feu orange : s'arrêter sauf danger pour véhicules suivants.\n• Rester poli, courtois, neutre (pas d'opinions politiques/religieuses).\n• « Je ne sais pas mais je peux me renseigner » si question inconnue.", actif: true },
  ],
  exercices: [
    {
      id: 100, titre: "Épreuve pratique — Barème et déroulement", actif: true,
      questions: [
        { id: 1, enonce: "Quelle est la note minimale requise pour être reçu à l'épreuve pratique TAXI ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "12/20", correct: true }, { lettre: "C", texte: "14/20" }, { lettre: "D", texte: "8/20" }] },
        { id: 2, enonce: "Combien de points sont attribués à la 'Préparation et réalisation du parcours' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "2 points", correct: true }, { lettre: "C", texte: "3 points" }, { lettre: "D", texte: "10 points" }] },
        { id: 3, enonce: "Combien de temps avez-vous pour actionner le taximètre, GPS et montrer les points sur la carte ?", choix: [{ lettre: "A", texte: "3 minutes" }, { lettre: "B", texte: "10 minutes" }, { lettre: "C", texte: "6 minutes", correct: true }, { lettre: "D", texte: "8 minutes" }] },
        { id: 4, enonce: "Que devez-vous présenter aux jurys avant de démarrer ?", choix: [{ lettre: "A", texte: "Le permis de conduire uniquement" }, { lettre: "B", texte: "La carte grise et l'assurance du véhicule", correct: true }, { lettre: "C", texte: "La carte professionnelle" }] },
        { id: 5, enonce: "Combien de points sont attribués à la 'Sécurité et souplesse de la conduite' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "10 points", correct: true }, { lettre: "C", texte: "8 points" }] },
        { id: 6, enonce: "Combien de points pour la 'Facturation et utilisation des équipements spéciaux' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "2 points" }, { lettre: "C", texte: "3 points", correct: true }] },
        { id: 7, enonce: "Si vous dépassez les 6 minutes de préparation, que risquez-vous ?", choix: [{ lettre: "A", texte: "Pénalité de 2 points" }, { lettre: "B", texte: "Élimination", correct: true }, { lettre: "C", texte: "Rien de particulier" }] },
      ]
    },
    {
      id: 101, titre: "Relation client et questions touristiques", actif: true,
      questions: [
        { id: 1, enonce: "Que faire si vous ne connaissez pas la réponse à une question touristique ?", choix: [{ lettre: "A", texte: "Inventer une réponse" }, { lettre: "B", texte: "Dire 'Je ne sais pas mais je peux me renseigner'", correct: true }, { lettre: "C", texte: "Ne rien dire" }] },
        { id: 2, enonce: "Avez-vous le droit de prendre un client hélé à moins de 50m d'une station taxi ?", choix: [{ lettre: "A", texte: "Oui, toujours" }, { lettre: "B", texte: "Non", correct: true }, { lettre: "C", texte: "Oui, si la station est vide" }] },
        { id: 3, enonce: "À partir de quel montant la note de course TAXI est-elle obligatoire ?", choix: [{ lettre: "A", texte: "15,24 €" }, { lettre: "B", texte: "25 € TTC", correct: true }, { lettre: "C", texte: "10 €" }] },
        { id: 4, enonce: "Un chauffeur taxi a-t-il l'obligation de détenir un siège enfant dans son véhicule ?", choix: [{ lettre: "A", texte: "Oui" }, { lettre: "B", texte: "Non", correct: true }, { lettre: "C", texte: "Oui, seulement la nuit" }] },
        { id: 5, enonce: "Qu'est-ce qu'un bouchon lyonnais ?", choix: [{ lettre: "A", texte: "Un embouteillage typique de Lyon" }, { lettre: "B", texte: "Un restaurant typique avec spécialités locales", correct: true }, { lettre: "C", texte: "Un bar à vins" }] },
        { id: 6, enonce: "Quel moyen de transport permet d'aller à l'aéroport de Lyon ?", choix: [{ lettre: "A", texte: "Le Rhône Express", correct: true }, { lettre: "B", texte: "Le TGV" }, { lettre: "C", texte: "Le tramway T4" }] },
        { id: 7, enonce: "Quelle est la spécialité de la Brasserie Georges ?", choix: [{ lettre: "A", texte: "Pizza et pâtes" }, { lettre: "B", texte: "Fruits de mer et choucroute", correct: true }, { lettre: "C", texte: "Cuisine asiatique" }] },
      ]
    },
    {
      id: 102, titre: "Monuments et lieux de Lyon", actif: true,
      questions: [
        { id: 1, enonce: "En quelle année la Cathédrale Saint-Jean a-t-elle été achevée ?", choix: [{ lettre: "A", texte: "1200" }, { lettre: "B", texte: "1480", correct: true }, { lettre: "C", texte: "1650" }] },
        { id: 2, enonce: "Dans quel arrondissement est situé le Vieux Lyon ?", choix: [{ lettre: "A", texte: "1er" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "3ème" }] },
        { id: 3, enonce: "Quel surnom donne-t-on à la Tour Part-Dieu ?", choix: [{ lettre: "A", texte: "La gomme" }, { lettre: "B", texte: "Le crayon", correct: true }, { lettre: "C", texte: "La fusée" }] },
        { id: 4, enonce: "Quelle est la hauteur de la Tour Incity ?", choix: [{ lettre: "A", texte: "165 mètres" }, { lettre: "B", texte: "117 mètres" }, { lettre: "C", texte: "202 mètres", correct: true }] },
        { id: 5, enonce: "Quelle fontaine se trouve sur la Place des Terreaux ?", choix: [{ lettre: "A", texte: "Fontaine de Trévi" }, { lettre: "B", texte: "Fontaine Bartholdi", correct: true }, { lettre: "C", texte: "Fontaine Médicis" }] },
        { id: 6, enonce: "La Place Bellecour est la combientième plus grande place de France ?", choix: [{ lettre: "A", texte: "3ème" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "1ère" }] },
        { id: 7, enonce: "Le Musée des Confluences a été inauguré en quelle année ?", choix: [{ lettre: "A", texte: "2010" }, { lettre: "B", texte: "2014", correct: true }, { lettre: "C", texte: "2018" }] },
      ]
    },
  ],
};

const PRATIQUE_VTC_DATA: ModuleData = {
  id: 8,
  nom: "7.PRATIQUE VTC",
  description: "Cours et exercices pour la préparation à l'épreuve pratique VTC — Déroulement de l'examen, devis et facturation, lieux touristiques de Lyon, relation client.",
  cours: [
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique VTC", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", description: "L'épreuve pratique comprend une phase de conduite en circulation d'une durée minimum de 20 minutes, notée sur 20 points. Est déclaré reçu le candidat ayant obtenu au moins 12/20.", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique VTC", sousTitre: "Accueil des jurys, tirage au sort, devis, parcours, facture, prise de congé", description: "1) Arrangements techniques. 2) Accueil des jurys. 3) Présentation carte grise et assurance. 4) Tirage au sort destination. 5) Réalisation du devis (transfert ou mise à disposition) + GPS (6 min max). 6) Signature du devis par le client. 7) Parcours aller-retour. 8) Facturation et prise de congé.", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges", image: imgCathedraleStJean, description: "• Cathédrale St Jean (1480) — Vieux Lyon, 5e arr., près du funiculaire de Fourvière.\n• Basilique de Fourvière (1886) — Patrimoine mondial UNESCO 1998, surplombe la ville.\n• Église St Georges (1848) — Vieux Lyon, entre Quarantaine et St-Jean.", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place Bellecour, Palais de Justice, Place des Terreaux, Opéra, Hôtel de Ville", image: imgPlaceTerreaux, description: "• Place Bellecour — 5e plus grande place de France, statue de Louis XIV.\n• Palais de Justice (1835) — 5e arr., « Palais des 24 colonnes ».\n• Place des Terreaux — 1er arr., fontaine Bartholdi.\n• Opéra de Lyon (1831) — restructuré par Jean Nouvel (1993).\n• Hôtel de Ville — entre Place des Terreaux et Place de la Comédie.\n• Hôtel-Dieu — premier hôpital lyonnais (1184), aujourd'hui InterContinental.\n• Musée des Confluences — inauguré en 2014.", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", image: imgTourOxygene, description: "• Tour Part-Dieu « le crayon » — 42 étages, 165m, ouverte depuis 1977.\n• Tour Oxygène — 28 niveaux, 117m, inaugurée en 2010.\n• Tour Incity « la gomme » — 39 étages, 202m, 3e plus haut gratte-ciel de France, inaugurée en 2016.", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts — Paul Bocuse, Frères Lumière", image: imgMurCanuts, description: "• Fresque des Lyonnais — 800m², 30 personnages, 2 rue de la Martinière 69001.\n• Mur des Canuts — 36 Bd des Canuts 69004, plus grand d'Europe (1200m²).\n• Paul Bocuse — 3 étoiles Michelin 53 ans.\n• Frères Lumière — pionniers du cinéma.\n• Tony Garnier — architecte urbaniste.", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Châteaux", image: imgParcBlandan, description: "• Parc de la Tête d'Or (117 ha) — zoo, jardin botanique, vélodrome, Guignol.\n• Parc Blandan — skate park, carousel, jeux enfants.\n• Parc de Parilly — hippodrome, stade d'athlétisme.\n• Château de la Motte — 7e arr.\n• Fort St Jean — 1er arr.\n• Domaine de la Bachasse — Sainte-Foy-lès-Lyon.", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes, Bouchons lyonnais", image: imgBrasserieGeorges, description: "• Quenelle — semoule de blé dur, beurre, œufs, lait.\n• Cervelle de canut — fromage blanc, herbes, échalote.\n• Tablier de sapeur — gras-double.\n• Bugnes, Coussins lyonnais, Tarte praline.\n• Brasserie Georges (2e, cours Verdun) — fruits de mer, choucroute.\n• Bouchons lyonnais — restaurants typiques.", actif: true },
    { id: 9, titre: "9. Devis et facturation VTC", sousTitre: "Transfert vs Mise à disposition, calcul TVA 10%, signature du devis", description: "• Transfert (A→B) : prix forfaitaire HT + TVA 10%.\n• Mise à disposition : tarif horaire.\n• Minimum 10€ HT (11€ TTC).\n• Faire signer le devis par le client avant de démarrer.\n• Facture à établir à l'arrivée.", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre", description: "• Tenue élégante (pas de baskets/casquettes).\n• GPS sur téléphone (Waze/Maps), tester avant l'examen.\n• Feu orange : s'arrêter sauf danger pour véhicules suivants.\n• Rester poli, courtois, neutre.\n• Bien écrire le point de départ de la facturation sur le devis.\n• À destination : retourner au siège ou stationner hors chaussée.", actif: true },
  ],
  exercices: [
    {
      id: 200, titre: "Épreuve pratique — Barème et déroulement VTC", actif: true,
      questions: [
        { id: 1, enonce: "Quelle est la note minimale requise pour être reçu à l'épreuve pratique VTC ?", choix: [{ lettre: "A", texte: "10/20" }, { lettre: "B", texte: "12/20", correct: true }, { lettre: "C", texte: "14/20" }] },
        { id: 2, enonce: "Combien de temps avez-vous pour faire le devis, GPS et montrer les points sur la carte ?", choix: [{ lettre: "A", texte: "3 minutes" }, { lettre: "B", texte: "6 minutes", correct: true }, { lettre: "C", texte: "10 minutes" }] },
        { id: 3, enonce: "Que devez-vous présenter aux jurys avant de démarrer ?", choix: [{ lettre: "A", texte: "Le permis uniquement" }, { lettre: "B", texte: "La carte grise et l'assurance du véhicule", correct: true }, { lettre: "C", texte: "La carte professionnelle" }] },
        { id: 4, enonce: "Quel document devez-vous faire signer au client avant de démarrer la course VTC ?", choix: [{ lettre: "A", texte: "Un contrat de transport" }, { lettre: "B", texte: "Le devis", correct: true }, { lettre: "C", texte: "Aucun document" }] },
        { id: 5, enonce: "Si vous dépassez les 6 minutes de préparation, que risquez-vous ?", choix: [{ lettre: "A", texte: "Pénalité de 2 points" }, { lettre: "B", texte: "Élimination", correct: true }, { lettre: "C", texte: "Rien" }] },
        { id: 6, enonce: "Combien de points pour la 'Sécurité et souplesse de la conduite' ?", choix: [{ lettre: "A", texte: "5 points" }, { lettre: "B", texte: "10 points", correct: true }, { lettre: "C", texte: "8 points" }] },
        { id: 7, enonce: "Combien de points pour 'Qualité de la prise en charge et relation client' ?", choix: [{ lettre: "A", texte: "5 points", correct: true }, { lettre: "B", texte: "3 points" }, { lettre: "C", texte: "8 points" }] },
      ]
    },
    {
      id: 201, titre: "Devis, facturation et relation client VTC", actif: true,
      questions: [
        { id: 1, enonce: "Quel est le taux de TVA applicable pour une prestation VTC ?", choix: [{ lettre: "A", texte: "20%" }, { lettre: "B", texte: "10%", correct: true }, { lettre: "C", texte: "5,5%" }] },
        { id: 2, enonce: "Que faites-vous une fois arrivé à destination en tant que VTC ?", choix: [{ lettre: "A", texte: "Je reste sur la chaussée en attente" }, { lettre: "B", texte: "Je retourne au siège ou stationne hors chaussée", correct: true }, { lettre: "C", texte: "Je cherche d'autres clients" }] },
        { id: 3, enonce: "Que faire si le client ne paie pas ?", choix: [{ lettre: "A", texte: "Appeler la police" }, { lettre: "B", texte: "Injonction de payer devant le tribunal d'instance", correct: true }, { lettre: "C", texte: "Refuser de le laisser sortir" }] },
        { id: 4, enonce: "Quel est le montant minimum pour un devis VTC (HT) ?", choix: [{ lettre: "A", texte: "5 €" }, { lettre: "B", texte: "10 €", correct: true }, { lettre: "C", texte: "15 €" }] },
        { id: 5, enonce: "Quelles précautions pour transporter un enfant de 9 mois à 4 ans ?", choix: [{ lettre: "A", texte: "Ceinture classique" }, { lettre: "B", texte: "Siège auto adapté à l'arrière face à la route", correct: true }, { lettre: "C", texte: "Pas de précaution" }] },
        { id: 6, enonce: "Quelles précautions pour transporter un animal de compagnie ?", choix: [{ lettre: "A", texte: "Aucune précaution" }, { lettre: "B", texte: "Ceinture de sécurité ou caisse de transport", correct: true }, { lettre: "C", texte: "Refuser le transport" }] },
        { id: 7, enonce: "Que faire si vous ne connaissez pas la réponse à une question touristique ?", choix: [{ lettre: "A", texte: "Inventer" }, { lettre: "B", texte: "Dire 'Je ne sais pas mais je peux me renseigner'", correct: true }, { lettre: "C", texte: "Ignorer la question" }] },
      ]
    },
    {
      id: 202, titre: "Monuments et lieux de Lyon", actif: true,
      questions: [
        { id: 1, enonce: "En quelle année la Cathédrale Saint-Jean a-t-elle été achevée ?", choix: [{ lettre: "A", texte: "1200" }, { lettre: "B", texte: "1480", correct: true }, { lettre: "C", texte: "1650" }] },
        { id: 2, enonce: "Quel surnom donne-t-on à la Tour Part-Dieu ?", choix: [{ lettre: "A", texte: "La gomme" }, { lettre: "B", texte: "Le crayon", correct: true }, { lettre: "C", texte: "La fusée" }] },
        { id: 3, enonce: "La Place Bellecour est la combientième plus grande place de France ?", choix: [{ lettre: "A", texte: "3ème" }, { lettre: "B", texte: "5ème", correct: true }, { lettre: "C", texte: "1ère" }] },
        { id: 4, enonce: "Quelle fontaine se trouve Place des Terreaux ?", choix: [{ lettre: "A", texte: "Fontaine de Trévi" }, { lettre: "B", texte: "Fontaine Bartholdi", correct: true }, { lettre: "C", texte: "Fontaine Médicis" }] },
        { id: 5, enonce: "Le Musée des Confluences a été inauguré en quelle année ?", choix: [{ lettre: "A", texte: "2010" }, { lettre: "B", texte: "2014", correct: true }, { lettre: "C", texte: "2018" }] },
        { id: 6, enonce: "Qu'est-ce qu'un bouchon lyonnais ?", choix: [{ lettre: "A", texte: "Un embouteillage" }, { lettre: "B", texte: "Un restaurant typique avec spécialités locales", correct: true }, { lettre: "C", texte: "Un bar à vins" }] },
        { id: 7, enonce: "Quel moyen de transport permet d'aller à l'aéroport de Lyon ?", choix: [{ lettre: "A", texte: "Le Rhône Express", correct: true }, { lettre: "B", texte: "Le TGV" }, { lettre: "C", texte: "Le tramway T4" }] },
      ]
    },
  ],
};

// ===== Données initiales du module CAS PRATIQUE TAXI =====
const CAS_PRATIQUE_TAXI_DATA: ModuleData = {
  id: 12,
  nom: "9.CAS PRATIQUE TAXI",
  description: "Exercices de mise en situation : calcul de courses taxi avec tarifs, suppléments, réservation et bagages. 10 cas pratiques sous forme de QCM.",
  cours: [
    {
      id: 1,
      titre: "📥 Document complet — Cas Pratique Taxi",
      sousTitre: "Téléchargez le document avec tous les cas pratiques de facturation taxi",
      description: "Ce document contient l'ensemble des 10 cas pratiques de facturation taxi avec les tarifs, suppléments, réservations et bagages.",
      actif: true,
      fichiers: [
        { nom: "Cas Pratique Taxi (Word)", url: "/cours/vtc/CAS_PRATIQUE.docx" },
      ],
    },
    {
      id: 2,
      titre: "Précisions importantes",
      description: `Avant de commencer les cas pratiques, retenez bien ces règles :

• Il n'y a PAS de réservation immédiate ou à l'avance lorsque l'on est dans une station ou lorsqu'un client vous hèle.
• Il y a une réservation à l'avance à partir du moment où l'on vous donne une date ou une heure.
• S'il n'y a aucune précision sur la date ou l'heure, c'est qu'il s'agit de la date d'aujourd'hui.

📋 Tarifs de référence :
• Tarif A : 1,00 €/km
• Tarif B : 1,50 €/km  
• Tarif C : 1,47 €/km
• Tarif D : 2,94 €/km (tarifs A ou B × 2, jours fériés/nuit)

• Prise en charge : 3,00 €
• Course minimum : 8,00 €
• Supplément réservation : 4 € (à l'avance) ou 2 € (immédiate)
• Supplément bagage (3e et au-delà) : 2 € par bagage
• Supplément passager (5e et au-delà) : 2 € par personne
• Supplément animal : gratuit`,
      actif: true,
    },
  ],
  exercices: [
    {
      id: 300, titre: "Tarifs de base", actif: true,
      questions: [
        { id: 1, enonce: "Quel est le prix du tarif A ?", choix: [{ lettre: "A", texte: "0,96 €" }, { lettre: "B", texte: "1,00 €", correct: true }, { lettre: "C", texte: "1,34 €" }, { lettre: "D", texte: "1,85 €" }] },
        { id: 2, enonce: "Quel est le prix du tarif B ?", choix: [{ lettre: "A", texte: "1,50 €", correct: true }, { lettre: "B", texte: "1,49 €" }, { lettre: "C", texte: "1,51 €" }, { lettre: "D", texte: "2,58 €" }] },
        { id: 3, enonce: "Quel est le prix du tarif C ?", choix: [{ lettre: "A", texte: "0,78 €" }, { lettre: "B", texte: "1,47 €", correct: true }, { lettre: "C", texte: "1,59 €" }, { lettre: "D", texte: "2,00 €" }] },
        { id: 4, enonce: "Quel est le prix du tarif D ?", choix: [{ lettre: "A", texte: "2,90 €" }, { lettre: "B", texte: "2,91 €" }, { lettre: "C", texte: "3,00 €" }, { lettre: "D", texte: "2,94 €", correct: true }] },
      ]
    },
    {
      id: 301, titre: "Cas n°1 — 1er mai, 16h, réservation la veille, 66 rue Smith → Mairie Lyon 2 (2.3km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°1 : 1er mai, 16h, client dans le véhicule, appelé hier soir, 66 rue Smith → Mairie Lyon 2 (2.3 km), 4 bagages dont 2 instruments. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
        { id: 2, enonce: "Cas n°1 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°1 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°1 : Quel est le coût total des suppléments (réservation + bagages + passagers) ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
        { id: 5, enonce: "Cas n°1 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "11,20 €" }, { lettre: "B", texte: "12,20 €" }, { lettre: "C", texte: "15,90 €", correct: true }, { lettre: "D", texte: "17,50 €" }] },
      ]
    },
    {
      id: 302, titre: "Cas n°2 — 15 août, 6h, Hôpital St Foy → 66 rue Smith (6.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°2 : 15 août, 6h, client demande de le chercher de suite à l'hôpital de St Foy les Lyon → 66 rue Smith (6.6 km), pas de bagages. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°2 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°2 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°2 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 5, enonce: "Cas n°2 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,80 €", correct: true }, { lettre: "B", texte: "23,97 €" }, { lettre: "C", texte: "24,02 €" }, { lettre: "D", texte: "26,70 €" }] },
      ]
    },
    {
      id: 303, titre: "Cas n°3 — 19h, client hélé, 66 rue Smith → Mairie Oullins A/R (6.4km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°3 : 19h, client vous hèle, 1 malle + 1 animal, 66 rue Smith → Mairie Oullins A/R (6.4 km aller simple). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°3 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°3 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°3 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°3 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "4 €" }] },
        { id: 6, enonce: "Cas n°3 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "20,89 €" }, { lettre: "C", texte: "22,20 €", correct: true }, { lettre: "D", texte: "22,77 €" }] },
      ]
    },
    {
      id: 304, titre: "Cas n°4 — 24 déc, 23h50, appel immédiat, 66 rue Smith → Stade Gerland (3.1km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°4 : 24 décembre, 23h50, on vous appelle pour emmener 5 personnes + 5 bagages au Stade de Gerland tout de suite (3.1 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }] },
        { id: 2, enonce: "Cas n°4 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°4 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°4 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°4 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "3 €" }, { lettre: "C", texte: "6 €", correct: true }, { lettre: "D", texte: "8 €" }] },
        { id: 6, enonce: "Cas n°4 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "13,77 €" }, { lettre: "B", texte: "14,74 €" }, { lettre: "C", texte: "15,88 €" }, { lettre: "D", texte: "18,30 €", correct: true }] },
      ]
    },
    {
      id: 305, titre: "Cas n°5 — 15 fév, 16h, station, neige, 2 pers + 10 bagages → Hôpital St Luc A/R (3.5km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°5 : 15 février, 16h, neige, station, 2 personnes + 10 bagages → Hôpital St Luc St Joseph A/R (3.5 km aller). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°5 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 3, enonce: "Cas n°5 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "6 €" }, { lettre: "B", texte: "8 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 4, enonce: "Cas n°5 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°5 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €" }, { lettre: "D", texte: "14 €" }] },
        { id: 6, enonce: "Cas n°5 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "21,50 €", correct: true }, { lettre: "B", texte: "21,51 €" }, { lettre: "C", texte: "22,14 €" }, { lettre: "D", texte: "23,98 €" }] },
      ]
    },
    {
      id: 306, titre: "Cas n°6 — 1er nov, 14h, appel, 6 pers, Mairie 5e → 66 rue Smith (4.7km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°6 : 1er novembre, 14h, on vous appelle pour 6 personnes sans bagages, Mairie du 5e → 66 rue Smith (4.7 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°6 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 3, enonce: "Cas n°6 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°6 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "4 €", correct: true }, { lettre: "B", texte: "2 €" }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°6 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "8 €" }, { lettre: "B", texte: "10 €" }, { lettre: "C", texte: "12 €", correct: true }] },
        { id: 6, enonce: "Cas n°6 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "24,88 €" }, { lettre: "B", texte: "25,87 €" }, { lettre: "C", texte: "29,10 €", correct: true }, { lettre: "D", texte: "27,28 €" }] },
      ]
    },
    {
      id: 307, titre: "Cas n°7 — 12 juil, 17h, appel, 66 rue Smith → Aéroport St Exupéry (24km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°7 : 12 juillet, 17h, on vous appelle pour 1 personne sans bagages, 66 rue Smith → Aéroport Lyon St Exupéry (24 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B", correct: true }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°7 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°7 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°7 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°7 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 6, enonce: "Cas n°7 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "51 €" }, { lettre: "B", texte: "55 €", correct: true }, { lettre: "C", texte: "54,47 €" }, { lettre: "D", texte: "55,87 €" }] },
      ]
    },
    {
      id: 308, titre: "Cas n°8 — Gare Part-Dieu, 3 pers + 3 bagages → Guillotière (2.4km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°8 : Gare Part-Dieu, 3 personnes + 3 bagages entrent dans le véhicule → quartier Guillotière (2.4 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°8 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "0 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°8 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°8 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°8 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 6, enonce: "Cas n°8 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "8 €", correct: true }, { lettre: "B", texte: "9,56 €" }, { lettre: "C", texte: "9,54 €" }, { lettre: "D", texte: "10,72 €" }] },
      ]
    },
    {
      id: 309, titre: "Cas n°9 — 3 janv, 6h, appel, 5 pers, Gare Perrache → Halles Bocuse (5.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°9 : 3 janvier, 6h, on vous appelle pour 5 personnes sans bagages, Gare Perrache → Halles Paul Bocuse (5.6 km). Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A" }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D", correct: true }] },
        { id: 2, enonce: "Cas n°9 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €", correct: true }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "8 €" }] },
        { id: 3, enonce: "Cas n°9 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°9 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "3 €" }, { lettre: "B", texte: "4 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 5, enonce: "Cas n°9 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "6 €", correct: true }, { lettre: "C", texte: "Pas de surplus" }] },
        { id: 6, enonce: "Cas n°9 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "25,80 €", correct: true }, { lettre: "B", texte: "24,58 €" }, { lettre: "C", texte: "25,69 €" }, { lettre: "D", texte: "26,88 €" }] },
      ]
    },
    {
      id: 310, titre: "Cas n°10 — 22 juin, 9h, hélé, Gare Part-Dieu → Place Bellecour A/R (2.6km)", actif: true,
      questions: [
        { id: 1, enonce: "Cas n°10 : 22 juin, 9h, client vous hèle à la Gare Part-Dieu → Place Bellecour A/R (2.6 km aller), pas de bagages, il pleut. Quel tarif appliqué ?", choix: [{ lettre: "A", texte: "Tarif A", correct: true }, { lettre: "B", texte: "Tarif B" }, { lettre: "C", texte: "Tarif C" }, { lettre: "D", texte: "Tarif D" }] },
        { id: 2, enonce: "Cas n°10 : Quel est le coût de la réservation ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "6 €" }, { lettre: "D", texte: "Aucun", correct: true }] },
        { id: 3, enonce: "Cas n°10 : Quel est le coût des bagages supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 4, enonce: "Cas n°10 : Quel est le coût des passagers supplémentaires ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 5, enonce: "Cas n°10 : Quel est le coût total des suppléments ?", choix: [{ lettre: "A", texte: "2 €" }, { lettre: "B", texte: "4 €" }, { lettre: "C", texte: "Pas de surplus", correct: true }] },
        { id: 6, enonce: "Cas n°10 : Quel est le tarif total de la course ?", choix: [{ lettre: "A", texte: "4,89 €" }, { lettre: "B", texte: "8,20 €", correct: true }, { lettre: "C", texte: "8,99 €" }, { lettre: "D", texte: "9,99 €" }] },
      ]
    },
  ],
};

function getInitialModuleData(module: { id: number; nom: string }, apprenantType?: string | null): ModuleData {
  // Module IDs: 1 = INTRODUCTION PRÉSENTIEL, 26 = INTRODUCTION E-LEARNING, 6 = PRATIQUE TAXI, 8 = PRATIQUE VTC, 12 = CAS PRATIQUE TAXI
  if (module.id === 1) return JSON.parse(JSON.stringify(INTRODUCTION_PRESENTIEL_DATA));
  if (module.id === 26) return JSON.parse(JSON.stringify(INTRODUCTION_ELEARNING_DATA));
  if (module.id === 31) return JSON.parse(JSON.stringify(INTRODUCTION_TA_PRESENTIEL_DATA));
  if (module.id === 32) return JSON.parse(JSON.stringify(INTRODUCTION_TA_ELEARNING_DATA));
  if (module.id === 33) return JSON.parse(JSON.stringify(INTRODUCTION_VA_PRESENTIEL_DATA));
  if (module.id === 34) return JSON.parse(JSON.stringify(INTRODUCTION_VA_ELEARNING_DATA));
  if (module.id === 6) return JSON.parse(JSON.stringify(PRATIQUE_TAXI_DATA));
  if (module.id === 8) return JSON.parse(JSON.stringify(PRATIQUE_VTC_DATA));
  if (module.id === 12) return JSON.parse(JSON.stringify(CAS_PRATIQUE_TAXI_DATA));
  if (module.id === 3) return JSON.parse(JSON.stringify(FORMULES_DATA));
  if (module.id === 13) return JSON.parse(JSON.stringify(CONTROLE_CONNAISSANCES_TAXI_DATA));
  if (module.id === 7) return JSON.parse(JSON.stringify(CONNAISSANCES_VILLE_TAXI_DATA));

  // Bilan Exercices VTC (module 4) — tous les exercices regroupés par matière (sauf Français/Anglais)
  if (module.id === 4) {
    return {
      id: 4,
      nom: "4.BILAN EXERCICES VTC",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: BILAN_EXERCICES_VTC.filter(e => e.id !== 103 && e.id !== 105),
    };
  }

  // Bilan Exercices TAXI (module 9) — tous les exercices regroupés par matière (sauf Français/Anglais/Marketing/Réglem. VTC)
  if (module.id === 9) {
    return {
      id: 9,
      nom: "4.BILAN EXERCICES TAXI",
      description: "Tous les exercices regroupés par matière. Refaites-les autant de fois que nécessaire pour maîtriser chaque sujet.",
      cours: [],
      exercices: BILAN_EXERCICES_TAXI,
    };
  }

  // Bilan Exercices TA (module 27) — uniquement réglementation nationale + locale
  if (module.id === 27) {
    return {
      id: 27,
      nom: "4.BILAN EXERCICES TA",
      description: "Exercices de réglementation nationale et locale. Refaites-les autant de fois que nécessaire.",
      cours: [],
      exercices: BILAN_EXERCICES_TAXI.filter(e => e.id === 203 || e.id === 204),
    };
  }

  // Bilan Exercices VA (module 29) — uniquement développement commercial + réglementation spécifique
  if (module.id === 29) {
    return {
      id: 29,
      nom: "4.BILAN EXERCICES VA",
      description: "Exercices développement commercial et réglementation spécifique. Refaites-les autant de fois que nécessaire.",
      cours: [],
      exercices: BILAN_EXERCICES_VTC.filter(e => e.id === 104 || e.id === 106),
    };
  }

  // VTC sub-modules (matières A-G, anciennement module 2)
  if (module.id === 2) {
    return createSectionModuleData(2, "A. Réglementation T3P — Partie 1/2", "Cours et exercices T3P — Partie 1", {
      cours: VTC_SECTIONS[0].cours.slice(0, 1),
      exercices: VTC_SECTIONS[0].exercices.slice(0, 1),
    });
  }
  if (module.id === 25) {
    return createSectionModuleData(25, "A. Réglementation T3P — Partie 2/2", "Cours et exercices T3P — Partie 2", {
      cours: VTC_SECTIONS[0].cours.slice(1, 2),
      exercices: VTC_SECTIONS[0].exercices.slice(1, 2),
    });
  }
  if (module.id === 14) return createSectionModuleData(14, "B. Gestion", "Cours et exercices de gestion", VTC_SECTIONS[1]);
  if (module.id === 15) return createSectionModuleData(15, "C. Sécurité Routière", "Cours sur la sécurité routière", VTC_SECTIONS[2]);
  if (module.id === 16) return createSectionModuleData(16, "D. Français", "Cours et exercices de français", VTC_SECTIONS[3]);
  if (module.id === 17) return createSectionModuleData(17, "E. Anglais", "Cours et exercices d'anglais", VTC_SECTIONS[4]);
  if (module.id === 18) return createSectionModuleData(18, "F. Réglementation Spécifique", "Réglementation nationale, spécifique VTC et locale", VTC_SECTIONS[5]);
  if (module.id === 19) return createSectionModuleData(19, "G. Développement Commercial", "Marketing et développement commercial", VTC_SECTIONS[6]);

  // TAXI sub-modules (matières A-F, anciennement module 10)
  if (module.id === 10) return createSectionModuleData(10, "A. Réglementation T3P", "Cours et exercices T3P (TAXI)", TAXI_SECTIONS[0]);
  if (module.id === 20) return createSectionModuleData(20, "B. Gestion", "Cours et exercices de gestion (TAXI)", TAXI_SECTIONS[1]);
  if (module.id === 21) return createSectionModuleData(21, "C. Sécurité Routière", "Cours sur la sécurité routière (TAXI)", TAXI_SECTIONS[2]);
  if (module.id === 22) return createSectionModuleData(22, "D. Français", "Cours et exercices de français (TAXI)", TAXI_SECTIONS[3]);
  if (module.id === 23) return createSectionModuleData(23, "E. Anglais", "Cours et exercices d'anglais (TAXI)", TAXI_SECTIONS[4]);
  if (module.id === 24) return createSectionModuleData(24, "F. Réglementation", "Réglementation nationale et locale (TAXI)", TAXI_SECTIONS[5]);

  // Bilan Examen VTC (module 5) — 7 matières séparées sans chronomètre
  if (module.id === 5) {
    return {
      id: 5,
      nom: "6.BILAN EXAMEN VTC",
      description: "Bilan examen VTC — 7 matières séparées. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_VTC,
    };
  }

  // Bilan Examen TAXI (module 11) — 7 matières séparées sans chronomètre
  if (module.id === 11) {
    return {
      id: 11,
      nom: "6.BILAN EXAMEN TAXI",
      description: "Bilan examen TAXI — 7 matières séparées. Questions type examen, sans chronomètre.",
      cours: [],
      exercices: BILAN_EXAMEN_TAXI,
    };
  }

  return {
    id: module.id,
    nom: module.nom,
    description: "Module en cours de construction",
    cours: [],
    exercices: [],
  };
}

function createSectionModuleData(id: number, nom: string, description: string, section: { cours: any[]; exercices: any[] }): ModuleData {
  return JSON.parse(JSON.stringify({
    id,
    nom,
    description,
    cours: section.cours,
    exercices: section.exercices,
  }));
}

// ===== Éditeur de question QCM =====
function QuestionEditor({
  question,
  onSave,
  onDelete,
  onCancel,
}: {
  question: ExerciceQuestion;
  onSave: (q: ExerciceQuestion) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [enonce, setEnonce] = useState(question.enonce);
  const [choix, setChoix] = useState<ExerciceChoix[]>([...question.choix]);

  const handleChoixTexte = (i: number, val: string) => {
    setChoix(prev => prev.map((c, idx) => idx === i ? { ...c, texte: val } : c));
  };
  const handleChoixCorrect = (i: number) => {
    // 1 seule bonne réponse = radio
    setChoix(prev => prev.map((c, idx) => ({ ...c, correct: idx === i })));
  };
  const addChoix = () => {
    const lettres = ["A", "B", "C", "D", "E", "F"];
    setChoix(prev => [...prev, { lettre: lettres[prev.length] || String(prev.length + 1), texte: "" }]);
  };
  const removeChoix = (i: number) => {
    setChoix(prev => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <Badge>QCM — Q{question.id}</Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          <Button size="sm" onClick={() => onSave({ ...question, enonce, choix })} className="gap-1">
            <Save className="w-3 h-3" /> Enregistrer
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold">Énoncé</label>
        <Textarea value={enonce} onChange={e => setEnonce(e.target.value)} rows={2} className="text-sm" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold">Réponses (cochez la bonne — 1 bonne réponse = 1 point)</label>
        {choix.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-xs font-bold text-muted-foreground">{c.lettre}</span>
            <Input value={c.texte} onChange={e => handleChoixTexte(i, e.target.value)} className="text-sm flex-1" placeholder={`Choix ${c.lettre}`} />
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={!!c.correct}
                onChange={() => handleChoixCorrect(i)}
                className="w-4 h-4 accent-primary"
                title="Bonne réponse"
              />
              <span className="text-xs text-emerald-600 font-bold">{c.correct ? "✓" : ""}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeChoix(i)}><X className="w-3 h-3" /></Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addChoix} className="gap-1">
          <Plus className="w-3 h-3" /> Ajouter un choix
        </Button>
      </div>
    </div>
  );
}

// ===== Carte exercice avec questions =====
function ExerciceCard({
  item,
  index,
  total,
  onMove,
  onDelete,
  onToggle,
  onUpdateQuestions,
}: {
  item: ExerciceItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onUpdateQuestions: (id: number, questions: ExerciceQuestion[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingQId, setEditingQId] = useState<number | null>(null);

  const hasQuestions = item.questions && item.questions.length > 0;

  const saveQuestion = (updated: ExerciceQuestion) => {
    if (!item.questions) return;
    const newQ = item.questions.map(q => q.id === updated.id ? updated : q);
    onUpdateQuestions(item.id, newQ);
    setEditingQId(null);
  };

  const deleteQuestion = (qId: number) => {
    if (!item.questions) return;
    onUpdateQuestions(item.id, item.questions.filter(q => q.id !== qId));
    setEditingQId(null);
  };

  const addQuestion = () => {
    const existing = item.questions || [];
    const newId = Math.max(0, ...existing.map(q => q.id)) + 1;
    const newQ: ExerciceQuestion = {
      id: newId,
      enonce: "Nouvelle question",
      choix: [
        { lettre: "A", texte: "Choix A", correct: true },
        { lettre: "B", texte: "Choix B" },
        { lettre: "C", texte: "Choix C" },
      ],
    };
    onUpdateQuestions(item.id, [...existing, newQ]);
    setEditingQId(newId);
    setExpanded(true);
  };

  return (
    <Card className="border-2 border-slate-300 transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base">{item.titre}</h4>
            {hasQuestions && (
              <Badge variant="secondary" className="text-xs">{item.questions!.length} questions</Badge>
            )}
          </div>
          {item.sousTitre && <p className="text-sm text-muted-foreground">{item.sousTitre}</p>}
          {item.fichiers && item.fichiers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {item.fichiers.map((f, i) => (
                <a key={i} href={f.url} download className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileText className="w-3 h-3" /> {f.nom}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "up")} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "down")} disabled={index === total - 1}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          {hasQuestions && (
            <Button variant="default" size="sm" className="gap-1" onClick={() => setExpanded(!expanded)}>
              <Pencil className="w-3 h-3" />
              {expanded ? "Fermer" : "Modifier les questions"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={addQuestion}>
            <Plus className="w-3 h-3" /> Ajouter question
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3 h-3" /> Supprimer
          </Button>
          <button onClick={() => onToggle(item.id)} className="text-muted-foreground hover:text-foreground transition-colors" title={item.actif ? "Désactiver" : "Activer"}>
            {item.actif ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>

        {/* Questions list */}
        {expanded && hasQuestions && (
          <div className="space-y-2 pt-2 border-t">
            {item.questions!.map(q => (
              <div key={q.id}>
                {editingQId === q.id ? (
                  <QuestionEditor
                    question={q}
                    onSave={saveQuestion}
                    onDelete={() => deleteQuestion(q.id)}
                    onCancel={() => setEditingQId(null)}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/20 group transition-colors">
                    <Badge className="text-xs shrink-0 mt-0.5">Q{q.id}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-2">{q.enonce}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.choix.map(c => (
                          <span key={c.lettre} className={`text-xs px-2 py-0.5 rounded-full ${c.correct ? "bg-emerald-100 text-emerald-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                            {c.lettre}. {c.texte.slice(0, 30)}{c.texte.length > 30 ? "…" : ""} {c.correct ? "✓" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 px-2" onClick={() => setEditingQId(q.id)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== Éditeur inline pour un cours =====
function CoursEditor({ item, onSave, onCancel }: { item: ContentItem; onSave: (updated: ContentItem) => void; onCancel: () => void }) {
  const [titre, setTitre] = useState(item.titre);
  const [sousTitre, setSousTitre] = useState(item.sousTitre || "");
  return (
    <Card className="border-2 border-primary/30 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge>Modifier le cours</Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
            <Button size="sm" onClick={() => { onSave({ ...item, titre, sousTitre: sousTitre || undefined }); toast.success("Cours modifié"); }} className="gap-1">
              <Save className="w-3 h-3" /> Enregistrer
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Titre</label>
          <Input value={titre} onChange={e => setTitre(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Sous-titre / Contenu</label>
          <Textarea value={sousTitre} onChange={e => setSousTitre(e.target.value)} rows={3} className="text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}

const ContentCard = ({
  item,
  index,
  total,
  onMove,
  onDelete,
  onToggle,
  onEdit,
  borderColor,
  onFileUploaded,
  onFileDeleted,
}: {
  item: ContentItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  borderColor: string;
  onFileUploaded?: (itemId: number, fichier: { nom: string; url: string }) => void;
  onFileDeleted?: (itemId: number, fichierIndex: number, url: string) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez un fichier .pptx, .ppt ou .pdf");
      return;
    }

    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `vtc/${item.id}_${Date.now()}_${safeName}`;
      
      const { error } = await supabase.storage
        .from("cours-fichiers")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("cours-fichiers")
        .getPublicUrl(path);

      onFileUploaded?.(item.id, { nom: file.name, url: publicUrlData.publicUrl });
      toast.success(`Fichier "${file.name}" uploadé avec succès`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={`border-2 ${borderColor} transition-all hover:shadow-md`}>
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-bold text-base">{item.titre}</h4>
          {item.sousTitre && (
            <p className="text-sm text-muted-foreground">{item.sousTitre}</p>
          )}
        </div>
        {/* Fichiers PowerPoint */}
        {item.fichiers && item.fichiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.fichiers.map((f, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium">
                <a
                  href={f.url}
                  download
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  {f.nom}
                  <Download className="w-3 h-3" />
                </a>
                <button
                  onClick={() => onFileDeleted?.(item.id, i, f.url)}
                  className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
                  title="Supprimer ce fichier"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Upload PowerPoint */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.ppt,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Upload en cours..." : "Ajouter un PowerPoint"}
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "up")} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMove(index, "down")} disabled={index === total - 1}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="gap-1" onClick={() => onEdit(item.id)}>
            <Pencil className="w-3 h-3" />
            Modifier
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3 h-3" />
            Supprimer
          </Button>
          <button onClick={() => onToggle(item.id)} className="text-muted-foreground hover:text-foreground transition-colors" title={item.actif ? "Désactiver" : "Activer"}>
            {item.actif ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const ModuleDetailView = ({ module, onBack, studentOnly = false, apprenantId, onModuleCompleted, apprenantType }: ModuleDetailViewProps) => {
  const createInitialSlidesByKey = (): Record<string, Slide[]> => ({
    "t3p-partie1": [...T3P_PARTIE1_SLIDES],
    "t3p-partie2": [...T3P_PARTIE2_SLIDES],
    "gestion-partie1": [...GESTION_PARTIE1_SLIDES],
    "gestion-partie2": [...GESTION_PARTIE2_SLIDES],
    "gestion-partie3": [...GESTION_PARTIE3_SLIDES],
  });

  const [moduleData, setModuleData] = useState<ModuleData>(() => getInitialModuleData(module, apprenantType));
  const [editingCoursId, setEditingCoursId] = useState<number | null>(null);
  const [slidesByKey, setSlidesByKey] = useState<Record<string, Slide[]>>(() => createInitialSlidesByKey());

  useEffect(() => {
    setSlidesByKey((current) => {
      const hasPlaceholderSlides = Object.values(current).some((slides) =>
        slides.some((slide) => /^Slide\s+\d+$/i.test(slide.title))
      );

      return hasPlaceholderSlides ? createInitialSlidesByKey() : current;
    });
  }, [
    module.id,
    T3P_PARTIE1_SLIDES[0]?.title,
    T3P_PARTIE2_SLIDES[0]?.title,
    GESTION_PARTIE1_SLIDES[0]?.title,
    GESTION_PARTIE2_SLIDES[0]?.title,
    GESTION_PARTIE3_SLIDES[0]?.title,
  ]);

  const updateSlidesForKey = (key: string, slides: Slide[]) => {
    setSlidesByKey((prev) => ({ ...prev, [key]: slides }));
  };

  const isPratique = module.id === 6 || module.id === 8;

  const moveItem = (type: "cours" | "exercices", index: number, direction: "up" | "down") => {
    const items = [...moduleData[type]];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    setModuleData({ ...moduleData, [type]: items });
  };

  const deleteItem = (type: "cours" | "exercices", id: number) => {
    setModuleData({
      ...moduleData,
      [type]: moduleData[type].filter((i) => i.id !== id),
    });
    toast.success(`${type === "cours" ? "Cours" : "Exercice"} supprimé`);
  };

  const toggleItem = (type: "cours" | "exercices", id: number) => {
    setModuleData({
      ...moduleData,
      [type]: moduleData[type].map((i) => i.id === id ? { ...i, actif: !i.actif } : i),
    });
  };

  const addItem = (type: "cours" | "exercices") => {
    const newId = Date.now();
    if (type === "exercices" && isPratique) {
      const newExo: ExerciceItem = {
        id: newId,
        titre: "Nouvel exercice",
        actif: true,
        questions: [
          { id: 1, enonce: "Nouvelle question", choix: [{ lettre: "A", texte: "Choix A", correct: true }, { lettre: "B", texte: "Choix B" }, { lettre: "C", texte: "Choix C" }] },
        ],
      };
      setModuleData({ ...moduleData, exercices: [...moduleData.exercices, newExo] });
    } else {
      const newItem: ContentItem = { id: newId, titre: type === "cours" ? "Nouveau cours" : "Nouvel exercice", actif: true };
      setModuleData({ ...moduleData, [type]: [...moduleData[type], newItem] });
    }
    toast.success(`${type === "cours" ? "Cours" : "Exercice"} ajouté`);
  };

  const updateExerciceQuestions = (exerciceId: number, questions: ExerciceQuestion[]) => {
    setModuleData({
      ...moduleData,
      exercices: moduleData.exercices.map(e => e.id === exerciceId ? { ...e, questions } : e),
    });
  };

  // === Aperçu apprenant ===
  const LearnerPreview = ({ secureMode = true }: { secureMode?: boolean }) => {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showResultsFor, setShowResultsFor] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(0);
    const [completedPages, setCompletedPages] = useState<Set<number>>(new Set());
    const [inlineQuizAnswers, setInlineQuizAnswers] = useState<Record<string, string>>({});
    const [inlineQuizValidated, setInlineQuizValidated] = useState<Set<number>>(new Set());
    const [qrcAnswers, setQrcAnswers] = useState<Record<string, string>>({});
    const [qrcResults, setQrcResults] = useState<Record<string, { estCorrect: boolean; pointsObtenus: number; explication: string } | "loading">>({});
    
    const [introAcknowledged, setIntroAcknowledged] = useState<Set<number>>(new Set());

    const activeCours = moduleData.cours.filter(c => c.actif);
    const activeExercices = moduleData.exercices.filter(e => e.actif) as ExerciceItem[];

    // Build pages: interleave cours and exercises for matière sub-modules
    type PageType = { type: "cours"; cours: ContentItem } | { type: "exercices" } | { type: "exercice-single"; exercice: ExerciceItem };
    const INTERLEAVED_IDS = new Set([2, 10, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    const pages: PageType[] = (() => {
      if (INTERLEAVED_IDS.has(Number(moduleData.id))) {
        // Simple zip: cours[0] → exo[0] → cours[1] → exo[1] → ...
        const ac = activeCours;
        const ae = activeExercices;
        const result: PageType[] = [];
        const maxLen = Math.max(ac.length, ae.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < ac.length) result.push({ type: "cours", cours: ac[i] });
          if (i < ae.length) result.push({ type: "exercice-single", exercice: ae[i] });
        }
        return result;
      }
      // Other modules: all cours first, then exercises
      return [
        ...activeCours.map(c => ({ type: "cours" as const, cours: c })),
        ...activeExercices.map(e => ({ type: "exercice-single" as const, exercice: e })),
      ];
    })();

    const totalPages = pages.length;
    const currentPageData = pages[currentPage];
    const progressPercent = totalPages > 0 ? Math.round((completedPages.size / totalPages) * 100) : 0;

    const handleAnswer = (exoId: number, qId: number, lettre: string) => {
      if (showResultsFor.has(exoId)) return;
      setSelectedAnswers(prev => ({ ...prev, [`${exoId}-${qId}`]: lettre }));
    };

    const totalQuestions = activeExercices.reduce((sum, e) => sum + (e.questions?.length || 0), 0);
    const correctCount = activeExercices.reduce((sum, e) => {
      if (!e.questions) return sum;
      return sum + e.questions.filter(q => {
        const key = `${e.id}-${q.id}`;
        const selected = selectedAnswers[key];
        const correct = q.choix.find(c => c.correct);
        return selected && correct && selected === correct.lettre;
      }).length;
    }, 0);

    const resolvePublicFileUrl = (fileUrl: string) => {
      if (fileUrl.startsWith("http")) return fileUrl;
      const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
      const fallbackPublicOrigin = "https://insight-learn-manage.lovable.app";
      const isPreviewHost = window.location.hostname.endsWith("lovableproject.com");
      const baseOrigin = isPreviewHost ? fallbackPublicOrigin : window.location.origin;
      return `${baseOrigin}${normalizedPath}`;
    };

    const completionPersistedRef = useRef(false);

    const markPageCompleted = (pageIndex: number) => {
      setCompletedPages(prev => {
        const next = new Set(prev);
        next.add(pageIndex);
        return next;
      });
    };

    const persistModuleCompletion = async () => {
      if (completionPersistedRef.current) return true;

      if (!apprenantId) {
        return true;
      }

      try {
        // Build question-level details
        const questionDetails = activeExercices.flatMap(e =>
          (e.questions || []).map(q => {
            const key = `${e.id}-${q.id}`;
            const selected = selectedAnswers[key];
            const correct = q.choix.find(c => c.correct);
            return {
              exerciceId: e.id,
              exerciceTitre: e.titre,
              questionId: q.id,
              enonce: q.enonce,
              reponseEleve: selected || null,
              reponseCorrecte: correct?.lettre || null,
              correct: selected != null && correct != null && selected === correct.lettre,
            };
          })
        );

        const { error } = await supabase.from("apprenant_module_completion").upsert({
          apprenant_id: apprenantId,
          module_id: module.id,
          score_obtenu: totalQuestions > 0 ? correctCount : null,
          score_max: totalQuestions > 0 ? totalQuestions : null,
          details: questionDetails,
        } as any, { onConflict: "apprenant_id,module_id" });

        if (error) {
          completionPersistedRef.current = false;
          console.error("Erreur completion module:", error);
          toast.error("Le résultat du quiz n'a pas pu être enregistré");
          return false;
        }

        completionPersistedRef.current = true;
        onModuleCompleted?.(module.id);
        return true;
      } catch (e) {
        completionPersistedRef.current = false;
        console.error("Erreur completion module:", e);
        toast.error("Le résultat du quiz n'a pas pu être enregistré");
        return false;
      }
    };


    // Introduction module IDs that require acknowledgment before quiz
    const INTRO_MODULE_IDS = new Set([1, 26, 31, 32, 33, 34]);
    const isIntroModule = INTRO_MODULE_IDS.has(Number(moduleData.id));

    // Auto-complete pages that have no PDF and no quiz (text-only cours)
    // BUT NOT for intro modules — those require explicit acknowledgment
    useEffect(() => {
      pages.forEach((p, i) => {
        if (p.type === "cours") {
          const hasPdf = p.cours.fichiers?.some(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
          const hasSlides = p.cours.slidesKey && slidesByKey[p.cours.slidesKey]?.length > 0;
          const hasQuiz = p.cours.quiz && p.cours.quiz.length > 0;
          if (!hasPdf && !hasSlides && !hasQuiz && !isIntroModule) {
            markPageCompleted(i);
          }
        }
        // exercice-single pages: don't auto-complete, user must validate

      });
    }, [pages.length]);

    const isPageUnlocked = (pageIndex: number): boolean => {
      if (pageIndex === 0) return true;
      // All previous pages must be completed
      for (let i = 0; i < pageIndex; i++) {
        if (!completedPages.has(i)) return false;
      }
      return true;
    };

    const goToPage = (page: number) => {
      if (page >= 0 && page < totalPages && isPageUnlocked(page)) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const renderCoursPage = (cours: ContentItem) => {
      const hasInteractiveSlides = Boolean(cours.slidesKey && slidesByKey[cours.slidesKey]?.length > 0);

      return (
        <div className="space-y-4">
        <Card key={cours.id} className="overflow-hidden">
          {cours.image && (
            <div className="w-full h-48 sm:h-64 overflow-hidden">
              <img src={cours.image} alt={cours.titre} className="w-full h-full object-cover" />
            </div>
          )}
          <CardContent className="p-5 space-y-2">
            <h4 className="font-bold text-lg">{cours.titre}</h4>
            {cours.sousTitre && <p className="text-sm text-muted-foreground">{cours.sousTitre}</p>}
            {cours.description && (
              <div className="text-sm whitespace-pre-line leading-relaxed mt-2">
                {cours.description}
              </div>
            )}
            {(() => {
              return (
                <>
                  {cours.fichiers && cours.fichiers.length > 0 && (() => {
                    const pdfFile = cours.fichiers!.find(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
                    const pdfLocalUrl = pdfFile ? (pdfFile.url.startsWith("http") ? pdfFile.url : pdfFile.url.startsWith("/") ? pdfFile.url : `/${pdfFile.url}`) : undefined;

                    return (
                      <div className="space-y-3 mt-3">
                        {cours.fichiers!.map((f, i) => {
                          const isPptx = f.nom.endsWith(".pptx") || f.nom.endsWith(".ppt") || f.url.endsWith(".pptx") || f.url.endsWith(".ppt");
                          const isPdf = f.nom.endsWith(".pdf") || f.url.endsWith(".pdf");
                          const absoluteFileUrl = resolvePublicFileUrl(f.url);
                          const googleViewerUrl = isPptx
                            ? `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteFileUrl)}&embedded=true`
                            : null;
                          const msViewerUrl = isPptx
                            ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`
                            : null;
                          const shouldShowViewers = Boolean(isPptx && !hasInteractiveSlides);

                          return (
                            <div key={i} className="space-y-3">
                              {!secureMode && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <a
                                    href={f.url}
                                    download
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    {f.nom}
                                    <Download className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {shouldShowViewers && (
                                <PptxViewerComparison
                                  googleViewerUrl={googleViewerUrl!}
                                  msViewerUrl={msViewerUrl!}
                                  absoluteFileUrl={absoluteFileUrl}
                                  nom={f.nom}
                                  pdfUrl={pdfLocalUrl}
                                  onLastPageReached={() => markPageCompleted(currentPage)}
                                  studentOnly={secureMode}
                                />
                              )}

                              {isPdf && !shouldShowViewers && (
                                <div className="mt-2">
                                  <PdfSlideViewer
                                    url={f.url.startsWith("http") ? f.url : f.url.startsWith("/") ? f.url : `/${f.url}`}
                                    nom={cours.titre}
                                    onLastPageReached={() => markPageCompleted(currentPage)}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {hasInteractiveSlides && cours.slidesKey && (
                    <div className="mt-4">
                      <SlideViewer
                        slides={slidesByKey[cours.slidesKey] ?? []}
                        titre={cours.titre}
                        brand="FTRANSPORT"
                        onBack={() => {}}
                        editable
                        onLastSlideReached={() => markPageCompleted(currentPage)}
                        onSlidesChange={(slides) => updateSlidesForKey(cours.slidesKey!, slides)}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Acknowledgment button for intro modules (text-only pages) */}
        {isIntroModule && (() => {
          const hasPdf = cours.fichiers?.some(f => f.nom.endsWith(".pdf") || f.url.endsWith(".pdf"));
          const hasSlides = cours.slidesKey && slidesByKey[cours.slidesKey]?.length > 0;
          const hasQuiz = cours.quiz && cours.quiz.length > 0;
          const isTextOnly = !hasPdf && !hasSlides && !hasQuiz;
          const isAcknowledged = introAcknowledged.has(cours.id);
          
          if (isTextOnly && !completedPages.has(currentPage)) {
            return (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`ack-${cours.id}`}
                      checked={isAcknowledged}
                      onChange={(e) => {
                        setIntroAcknowledged(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(cours.id);
                          else next.delete(cours.id);
                          return next;
                        });
                      }}
                      className="mt-1 h-4 w-4 rounded border-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor={`ack-${cours.id}`} className="text-sm cursor-pointer select-none">
                      J'ai lu et compris le contenu ci-dessus.
                    </label>
                  </div>
                  <Button
                    size="sm"
                    disabled={!isAcknowledged}
                    onClick={() => {
                      markPageCompleted(currentPage);
                      if (currentPage < totalPages - 1) {
                        goToPage(currentPage + 1);
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider et continuer
                  </Button>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {/* Inline Quiz after course content */}
        {cours.quiz && cours.quiz.length > 0 && (() => {
          const pageIdx = currentPage;
          const isValidated = inlineQuizValidated.has(cours.id);
          const allAnswered = cours.quiz!.every(q => inlineQuizAnswers[`inline-${cours.id}-${q.id}`]);
          const correctInline = cours.quiz!.filter(q => {
            const sel = inlineQuizAnswers[`inline-${cours.id}-${q.id}`];
            const correct = q.choix.find(c => c.correct);
            return sel && correct && sel === correct.lettre;
          }).length;

          return (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  🧠 Exercice d'application
                </h4>
                {cours.quiz!.map((q, qi) => {
                  const key = `inline-${cours.id}-${q.id}`;
                  const selected = inlineQuizAnswers[key];
                  return (
                    <div key={q.id} className="space-y-2 p-4 border rounded-lg bg-background">
                      <p className="font-medium">{qi + 1}. {q.enonce}</p>
                      <div className="space-y-1.5 ml-2">
                        {q.choix.map(c => {
                          let bg = "bg-background hover:bg-muted/50 border";
                          if (selected === c.lettre && !isValidated) bg = "bg-primary/10 border-primary border-2";
                          if (isValidated && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
                          if (isValidated && selected === c.lettre && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
                          return (
                            <button
                              key={c.lettre}
                              onClick={() => {
                                if (isValidated) return;
                                setInlineQuizAnswers(prev => ({ ...prev, [key]: c.lettre }));
                              }}
                              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${bg}`}
                            >
                              <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                                {c.lettre}
                              </span>
                              <span className="text-sm">{c.texte}</span>
                              {isValidated && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {/* Explanation after validation */}
                      {isValidated && q.explication && (
                        <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                          <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">💡 Explication :</p>
                          <p className="text-blue-700 dark:text-blue-300">{q.explication}</p>
                        </div>
                      )}
                      {isValidated && !q.explication && (() => {
                        const correctChoice = q.choix.find(c => c.correct);
                        return correctChoice ? (
                          <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                            <p className="font-semibold text-blue-800 dark:text-blue-200">✅ Bonne réponse : {correctChoice.lettre}. {correctChoice.texte}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}

                {!isValidated ? (
                  <Button
                    onClick={async () => {
                      if (!allAnswered) {
                        toast.error("Répondez à toutes les questions avant de valider");
                        return;
                      }
                      setInlineQuizValidated(prev => {
                        const next = new Set(prev);
                        next.add(cours.id);
                        return next;
                      });
                      markPageCompleted(pageIdx);

                      if (correctInline === cours.quiz!.length) {
                        toast.success("🎉 Parfait ! Toutes les réponses sont correctes !");
                      } else {
                        toast("📖 Consultez les corrections ci-dessus");
                      }
                    }}
                    className="gap-2"
                    disabled={!allAnswered}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Valider mes réponses
                  </Button>
                ) : (() => {
                  const totalInline = cours.quiz!.length;
                  const pctInline = totalInline > 0 ? Math.round((correctInline / totalInline) * 100) : 0;
                  const cColor = pctInline >= 80 ? "text-emerald-500" : pctInline >= 50 ? "text-amber-500" : "text-destructive";
                  const cBg = pctInline >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : pctInline >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
                  const circ = 2 * Math.PI * 40;
                  const offset = circ - (pctInline / 100) * circ;
                  return (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${cBg}`}>
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                        <circle cx="45" cy="45" r="40" fill="none" stroke="currentColor" strokeWidth="6" className={cColor} strokeLinecap="round"
                          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                      </svg>
                      <span className={`text-2xl font-black ${cColor}`}>{pctInline}%</span>
                    </div>
                    <p className="text-lg font-bold">Points : {correctInline} / {totalInline}</p>
                    <p className="text-sm text-muted-foreground">
                      {correctInline === totalInline ? "🎉 Parfait !" : "📖 Révisez les corrections ci-dessus"}
                    </p>
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    );
    };

    const renderSingleExercicePage = (exo: ExerciceItem) => {
      const handleQrcCorrection = async (exoId: number, q: any, key: string) => {
        const reponse = qrcAnswers[key]?.trim();
        if (!reponse) { toast.error("Écrivez une réponse avant de valider"); return; }
        setQrcResults(prev => ({ ...prev, [key]: "loading" }));
        try {
          const { data, error } = await supabase.functions.invoke("corriger-qrc", {
            body: {
              question: q.enonce,
              reponseEtudiant: reponse,
              reponsesAttendues: q.reponsesAttendues || [],
              matiereId: "reglementation_taxi",
              pointsQuestion: 2,
            },
          });
          if (error) throw error;
          setQrcResults(prev => ({ ...prev, [key]: data }));
        } catch (e) {
          console.error(e);
          setQrcResults(prev => ({ ...prev, [key]: { estCorrect: false, pointsObtenus: 0, explication: "Erreur de correction" } }));
          toast.error("Erreur lors de la correction IA");
        }
      };

      const exoQuestions = exo.questions || [];
      const exoTotalQ = exoQuestions.length;
      const exoCorrect = exoQuestions.filter(q => {
        const key = `${exo.id}-${q.id}`;
        const selected = selectedAnswers[key];
        const correct = (q as any).choix?.find((c: any) => c.correct);
        return selected && correct && selected === correct.lettre;
      }).length;

      return (
      <div className="space-y-4">
          <Card key={exo.id}>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold">📝 {exo.titre}</h3>
              {exo.sousTitre && <p className="text-sm text-muted-foreground">{exo.sousTitre}</p>}
              {exo.questions && exo.questions.map((q: any, qi: number) => {
                const key = `${exo.id}-${q.id}`;
                const isQrc = q.type === "qrc" || (q.choix?.length === 0 && q.reponsesAttendues);
                const selected = selectedAnswers[key];
                const qrcResult = qrcResults[key];

                if (isQrc) {
                  return (
                    <div key={q.id} id={`exo-q-${exo.id}-${qi}`} className="space-y-2 p-4 border rounded-lg scroll-mt-20">
                      <p className="font-medium">{qi + 1}. {q.enonce}</p>
                      <Badge variant="outline" className="text-xs">QRC — Réponse libre</Badge>
                      <Textarea
                        placeholder="Écrivez votre réponse ici..."
                        value={qrcAnswers[key] || ""}
                        onChange={(e) => setQrcAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                        disabled={qrcResult !== undefined && qrcResult !== "loading"}
                        className="mt-2"
                      />
                      {!qrcResult && (
                        <Button size="sm" onClick={() => handleQrcCorrection(exo.id, q, key)} className="gap-2 mt-1">
                          🤖 Corriger par IA
                        </Button>
                      )}
                      {qrcResult === "loading" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Correction en cours...
                        </div>
                      )}
                      {qrcResult && qrcResult !== "loading" && (
                        <div className={`p-3 rounded-lg border-2 mt-2 ${qrcResult.estCorrect ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950" : "bg-destructive/10 border-destructive"}`}>
                          <p className="font-semibold text-sm">
                            🤖 {qrcResult.estCorrect ? "✅ Correct" : "❌ Incorrect"} — {qrcResult.pointsObtenus}/2 pts
                          </p>
                          <p className="text-sm mt-1">{qrcResult.explication}</p>
                          {q.reponsesAttendues && (
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 Réponses attendues : {q.reponsesAttendues.join(" / ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={q.id} id={`exo-q-${exo.id}-${qi}`} className="space-y-2 p-4 border rounded-lg scroll-mt-20">
                    <p className="font-medium">{qi + 1}. {q.enonce}</p>
                    <div className="space-y-1.5 ml-2">
                      {q.choix.map((c: any) => {
                        const exoShowResults = showResultsFor.has(exo.id);
                        let bg = "bg-background hover:bg-muted/50 border";
                        if (selected === c.lettre && !exoShowResults) bg = "bg-primary/10 border-primary border-2";
                        if (exoShowResults && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
                        if (exoShowResults && selected === c.lettre && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
                        return (
                          <button
                            key={c.lettre}
                            onClick={() => handleAnswer(exo.id, q.id, c.lettre)}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${bg}`}
                          >
                            <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0">
                              {c.lettre}
                            </span>
                            <span className="text-sm">{c.texte}</span>
                            {exoShowResults && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {exoTotalQ > 0 && (
                <div className="flex justify-center gap-4">
                  {!showResultsFor.has(exo.id) ? (
                    <Button
                      size="lg"
                      onClick={async () => {
                        setShowResultsFor(prev => new Set(prev).add(exo.id));
                        markPageCompleted(currentPage);

                        toast.success("✅ Quiz validé ! Consultez vos résultats puis cliquez sur Suivant.");
                      }}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Valider les QCM
                    </Button>
                  ) : (() => {
                    const pct = exoTotalQ > 0 ? Math.round((exoCorrect / exoTotalQ) * 100) : 0;
                    const circleColor = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-destructive";
                    const circleBg = pct >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : pct >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
                    const circumference = 2 * Math.PI * 54;
                    const strokeDashoffset = circumference - (pct / 100) * circumference;

                    return (
                    <div className="w-full space-y-5">
                      {/* Score circle */}
                      <div className="flex flex-col items-center gap-3">
                        <div className={`relative w-36 h-36 rounded-full flex items-center justify-center ${circleBg}`}>
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className={circleColor} strokeLinecap="round"
                              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                          </svg>
                          <span className={`text-4xl font-black ${circleColor}`}>{pct}%</span>
                        </div>
                        <p className="text-lg font-bold">Points : {exoCorrect} / {exoTotalQ}</p>
                      </div>

                      {/* Answer grid */}
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Réponses</h4>
                        <p className="text-xs text-muted-foreground">Cliquez sur une question pour revoir la correction</p>
                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                          {(exo.questions || []).map((q, qi) => {
                            const key = `${exo.id}-${q.id}`;
                            const selected = selectedAnswers[key];
                            const correct = q.choix.find((c: any) => c.correct);
                            const isCorrect = selected && correct && selected === correct.lettre;
                            return (
                              <div key={q.id}
                                className="flex items-center gap-2 rounded-lg border bg-background p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                title={`Q${qi + 1}: ${isCorrect ? "Correct" : "Incorrect"} — Cliquer pour voir`}
                                onClick={() => {
                                  const el = document.getElementById(`exo-q-${exo.id}-${qi}`);
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }}
                              >
                                <span className="text-sm font-bold min-w-[1.2rem] text-center">{qi + 1}</span>
                                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${isCorrect ? "bg-emerald-500" : "bg-destructive"}`} />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Progress + Actions */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Progrès</h4>
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="text-xs text-muted-foreground">Soumis</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="text-xs text-muted-foreground">Noté</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-lg border p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Actions</h4>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                              const exoKeys = (exo.questions || []).map(q => `${exo.id}-${q.id}`);
                              setSelectedAnswers(prev => {
                                const next = { ...prev };
                                exoKeys.forEach(k => delete next[k]);
                                return next;
                              });
                              setShowResultsFor(prev => { const next = new Set(prev); next.delete(exo.id); return next; });
                            }}>
                              🔄 Recommencer
                            </Button>
                            {currentPage < totalPages - 1 && completedPages.has(currentPage) && (
                              <Button size="sm" className="gap-2" onClick={() => {
                                goToPage(currentPage + 1);
                              }}>
                                Suivant ➡️
                              </Button>
                            )}
                            {currentPage === totalPages - 1 && (
                              <Button size="sm" variant="secondary" className="gap-2" onClick={async () => {
                                const ok = await persistModuleCompletion();
                                if (ok) { onBack(); toast.success("🎉 Module terminé !"); }
                              }}>
                                <CheckCircle2 className="w-4 h-4" /> Terminé
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    );
    };

    if (totalPages === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun contenu disponible pour ce module.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header with progress */}
        <div className="space-y-3">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{moduleData.nom}</h2>
            <p className="text-muted-foreground text-sm">{moduleData.description}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {currentPageData?.type === "cours" ? "📚 Cours" : "📝 Exercices"} — {currentPage + 1} / {totalPages}
              </span>
              <span className="font-semibold text-primary">{progressPercent}%</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Page dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              {pages.map((p, i) => {
                const unlocked = isPageUnlocked(i);
                return (
                  <button
                    key={i}
                    onClick={() => unlocked && goToPage(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentPage
                        ? "w-6 bg-primary"
                        : completedPages.has(i)
                          ? "w-2 bg-primary/40"
                          : unlocked
                            ? "w-2 bg-muted-foreground/30"
                            : "w-2 bg-muted-foreground/10 cursor-not-allowed"
                    }`}
                    title={!unlocked ? "🔒 Terminez la partie précédente" : p.type === "cours" ? p.cours.titre : p.type === "exercice-single" ? `📝 ${p.exercice.titre}` : "Exercices"}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Lock message */}
        {!completedPages.has(currentPage) && currentPage < totalPages - 1 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
            <span>🔒</span>
            <span>
              {isIntroModule && currentPageData?.type === "cours" && !currentPageData.cours.quiz?.length
                ? "Lisez le contenu puis cochez « J'ai lu et compris » pour continuer."
                : currentPageData?.type === "cours" && currentPageData.cours.quiz?.length
                  ? "Répondez au QCM ci-dessous pour débloquer les exercices et la partie suivante."
                  : "Parcourez toutes les slides jusqu'à la dernière pour débloquer les exercices et la partie suivante."}
            </span>
          </div>
        )}

        {/* Current page content */}
        <div className="animate-fade-in">
          {currentPageData?.type === "cours" && renderCoursPage(currentPageData.cours)}
          {currentPageData?.type === "exercice-single" && renderSingleExercicePage(currentPageData.exercice)}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            {currentPage + 1} / {totalPages}
          </span>
          {currentPage < totalPages - 1 ? (
            <Button
              onClick={() => {
                goToPage(currentPage + 1);
              }}
              disabled={!completedPages.has(currentPage)}
              className="gap-2"
              title={!completedPages.has(currentPage) ? "Parcourez toutes les slides pour continuer" : ""}
            >
              {!completedPages.has(currentPage) && <span>🔒</span>}
              Suivant <ArrowDown className="w-4 h-4 -rotate-90" />
            </Button>
          ) : (
            <Button variant="secondary" className="gap-2" onClick={async () => {
              const ok = await persistModuleCompletion();
              if (ok) {
                onBack();
                toast.success("🎉 Module terminé !");
              }
            }}>
              <CheckCircle2 className="w-4 h-4" /> Terminé
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (studentOnly) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">{moduleData.nom}</h2>
        </div>
        <LearnerPreview secureMode />
      </div>
    );
  }

  // ===== Résultats élèves par module =====
  const ModuleResultsTab = ({ moduleId, moduleName }: { moduleId: number; moduleName: string }) => {
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const { data: results, isLoading: loadingResults } = useQuery({
      queryKey: ['module-results', moduleId],
      queryFn: async () => {
        const { data: completions, error } = await supabase
          .from('apprenant_module_completion')
          .select('apprenant_id, score_obtenu, score_max, completed_at, details')
          .eq('module_id', moduleId)
          .order('completed_at', { ascending: false });
        if (error) throw error;
        if (!completions?.length) return [];

        const ids = [...new Set(completions.map(c => c.apprenant_id))];
        const { data: apprenants } = await supabase
          .from('apprenants')
          .select('id, nom, prenom, type_apprenant, formation_choisie')
          .in('id', ids);

        const appMap = new Map((apprenants || []).map(a => [a.id, a]));

        const bestByApprenant = new Map<string, typeof completions[0]>();
        for (const c of completions) {
          const existing = bestByApprenant.get(c.apprenant_id);
          if (!existing || (c.score_obtenu || 0) > (existing.score_obtenu || 0)) {
            bestByApprenant.set(c.apprenant_id, c);
          }
        }

        return Array.from(bestByApprenant.values()).map(c => {
          const app = appMap.get(c.apprenant_id);
          const pct = c.score_max ? Math.round(((c.score_obtenu || 0) / c.score_max) * 100) : 0;
          return {
            ...c,
            nom: app ? `${app.prenom} ${app.nom}` : 'Inconnu',
            type: app?.type_apprenant || '',
            formation: app?.formation_choisie || '',
            pct,
          };
        }).sort((a, b) => b.pct - a.pct);
      },
    });

    if (loadingResults) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

    if (!results?.length) return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Aucun résultat enregistré pour ce module.
      </CardContent></Card>
    );

    const avgScore = Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length);

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{results.length}</p>
            <p className="text-sm text-muted-foreground">Élèves</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className={`text-3xl font-bold ${avgScore >= 60 ? 'text-emerald-600' : 'text-destructive'}`}>{avgScore}%</p>
            <p className="text-sm text-muted-foreground">Moyenne</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-emerald-600">{results.filter(r => r.pct >= 60).length}</p>
            <p className="text-sm text-muted-foreground">Réussi (≥60%)</p>
          </CardContent></Card>
        </div>

        {/* Module number */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">Module n°{moduleId}</Badge>
          <span className="text-sm font-medium text-muted-foreground">{moduleName}</span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Élève</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-[200px]">Progression</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => {
                  const details = Array.isArray(r.details) ? r.details as Array<{
                    questionId: number;
                    enonce: string;
                    reponseEleve: string | null;
                    reponseCorrecte: string | null;
                    correct: boolean;
                    exerciceTitre?: string;
                  }> : [];
                  const isExpanded = expandedRow === r.apprenant_id;
                  const hasDetails = details.length > 0;

                  return (
                    <>
                      <TableRow
                        key={i}
                        className={hasDetails ? 'cursor-pointer' : ''}
                        onClick={() => hasDetails && setExpandedRow(isExpanded ? null : r.apprenant_id)}
                      >
                        <TableCell className="w-8 px-2">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{r.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.type?.toUpperCase() || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{r.score_obtenu}/{r.score_max}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={r.pct} className="h-2 flex-1" />
                            <span className={`text-xs font-bold min-w-[3ch] ${r.pct >= 80 ? 'text-emerald-600' : r.pct >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                              {r.pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.completed_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                      {isExpanded && details.length > 0 && (
                        <TableRow key={`${i}-details`}>
                          <TableCell colSpan={6} className="p-0">
                            <div className="bg-muted/30 px-6 py-4 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                                Détail des {details.length} questions
                              </p>
                              <div className="grid gap-1.5">
                                {details.map((q, qi) => (
                                  <div
                                    key={qi}
                                    className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
                                      q.correct
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                                    }`}
                                  >
                                    <span className={`shrink-0 font-bold text-xs mt-0.5 rounded-full w-6 h-6 flex items-center justify-center ${
                                      q.correct
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-red-500 text-white'
                                    }`}>
                                      {qi + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm ${q.correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                                        {q.enonce}
                                      </p>
                                      {!q.correct && q.reponseCorrecte && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Réponse : <span className="font-semibold text-emerald-600">{q.reponseCorrecte}</span>
                                          {q.reponseEleve && <> — Élève : <span className="font-semibold text-red-500">{q.reponseEleve}</span></>}
                                        </p>
                                      )}
                                    </div>
                                    <span className="shrink-0">
                                      {q.correct ? '✅' : '❌'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold">Détail du module</h2>
      </div>

      <Tabs defaultValue="edition" className="w-full">
         <TabsList className="mb-4">
          <TabsTrigger value="edition" className="gap-2"><Settings className="w-4 h-4" /> Édition</TabsTrigger>
          <TabsTrigger value="apercu" className="gap-2"><Eye className="w-4 h-4" /> Aperçu apprenant</TabsTrigger>
          <TabsTrigger value="resultats" className="gap-2"><Users className="w-4 h-4" /> Résultats élèves</TabsTrigger>
        </TabsList>

        <TabsContent value="edition" className="space-y-6">
          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-1">{moduleData.nom}</h3>
              <p className="text-sm text-muted-foreground">{moduleData.description}</p>
            </CardContent>
          </Card>

          {/* Cours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">📚 Cours ({moduleData.cours.length})</h3>
              <Button size="sm" className="gap-1" onClick={() => addItem("cours")}>
                <Plus className="w-4 h-4" /> Ajouter un cours
              </Button>
            </div>
            {moduleData.cours.map((cours, index) =>
              editingCoursId === cours.id ? (
                <CoursEditor
                  key={cours.id}
                  item={cours}
                  onSave={(updated) => {
                    setModuleData({
                      ...moduleData,
                      cours: moduleData.cours.map(c => c.id === updated.id ? updated : c),
                    });
                    setEditingCoursId(null);
                  }}
                  onCancel={() => setEditingCoursId(null)}
                />
              ) : (
                <ContentCard
                  key={cours.id}
                  item={cours}
                  index={index}
                  total={moduleData.cours.length}
                  onMove={(i, d) => moveItem("cours", i, d)}
                  onDelete={(id) => deleteItem("cours", id)}
                  onToggle={(id) => toggleItem("cours", id)}
                  onEdit={(id) => setEditingCoursId(id)}
                  borderColor="border-primary/30"
                />
              )
            )}
          </div>

          {/* Exercices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">📝 Exercices ({moduleData.exercices.length})</h3>
              <Button size="sm" className="gap-1" onClick={() => addItem("exercices")}>
                <Plus className="w-4 h-4" /> Ajouter un exercice
              </Button>
            </div>
            {isPratique ? (
              moduleData.exercices.map((exo, index) => (
                <ExerciceCard
                  key={exo.id}
                  item={exo as ExerciceItem}
                  index={index}
                  total={moduleData.exercices.length}
                  onMove={(i, d) => moveItem("exercices", i, d)}
                  onDelete={(id) => deleteItem("exercices", id)}
                  onToggle={(id) => toggleItem("exercices", id)}
                  onUpdateQuestions={(id, questions) => updateExerciceQuestions(id, questions)}
                />
              ))
            ) : (
              moduleData.exercices.map((exo, index) => (
                <ContentCard
                  key={exo.id}
                  item={exo as ContentItem}
                  index={index}
                  total={moduleData.exercices.length}
                  onMove={(i, d) => moveItem("exercices", i, d)}
                  onDelete={(id) => deleteItem("exercices", id)}
                  onToggle={(id) => toggleItem("exercices", id)}
                  onEdit={() => {}}
                  borderColor="border-muted"
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="apercu">
          <LearnerPreview secureMode />
        </TabsContent>
        <TabsContent value="resultats">
          <ModuleResultsTab moduleId={module.id} moduleName={module.nom} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuleDetailView;