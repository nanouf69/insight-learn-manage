import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, Save, X, CheckCircle2, Eye, Settings, Download, FileText, Upload, Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
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
import { VTC_COURS_DATA } from "./vtc-cours-data";

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  description?: string;
  image?: string;
  actif: boolean;
  fichiers?: { nom: string; url: string }[];
  slidesKey?: string;
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
}

// ===== Données initiales du module INTRODUCTION =====
const INTRODUCTION_DATA: ModuleData = {
  id: 1,
  nom: "1.INTRODUCTION",
  description: "Présentation de la plateforme, contenu de l'examen TAXI/VTC, modalités d'évaluation et conditions générales.",
  cours: [
    {
      id: 1,
      titre: "Bienvenue sur la plateforme",
      description: `Cette plateforme est dédiée aux futurs chauffeurs VTC et TAXIS.

Vous devez réussir deux épreuves pour obtenir votre carte de chauffeur VTC ou de chauffeur TAXI :
• L'épreuve d'admissibilité (théorie avec 7 matières) — minimum 10/20
• L'épreuve d'admission (pratique) — minimum 12/20
Le tout sans note éliminatoire.

Vous avez à disposition : des cours, des exercices, des examens blancs et des bilans. L'accès à cette plateforme est limité.

📌 Étapes conseillées :
1. Commencez par les cours et les exercices
2. Puis les bilans exercices
3. Ensuite les examens blancs
4. Enfin les bilans examen

Lorsque vous aurez fini vos examens blancs, merci de nous envoyer un mail pour correction.`,
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
      titre: "Conditions générales et informations pratiques",
      description: `🏢 FTRANSPORT — Centre de formation
86 Route de Genas, 69003 Lyon

📞 Tel : 04 28 29 60 91
📧 Email : contact@ftransport.fr

👥 Équipe :
• Responsable pédagogique : Guenichi Naoufal
• Responsable administrative : Baaziz Fadela
• Formatrice Taxi : Rim Touil
• Formateur VTC : Guenichi Naoufal
• Formateur Anglais : Albert Akono

⏰ Horaires : 9h-12h et 13h-17h
📋 Effectif maximum : 21 stagiaires par session

📌 Prérequis : savoir lire et écrire, casier B2 vierge.`,
      actif: true,
    },
  ],
  exercices: [
    {
      id: 1,
      titre: "Quiz Introduction",
      sousTitre: "Vérifiez vos connaissances sur l'examen",
      actif: true,
      questions: [
        {
          id: 1,
          enonce: "Quelle note minimale faut-il obtenir à l'épreuve théorique (admissibilité) ?",
          choix: [
            { lettre: "A", texte: "8/20", correct: false },
            { lettre: "B", texte: "10/20", correct: true },
            { lettre: "C", texte: "12/20", correct: false },
            { lettre: "D", texte: "14/20", correct: false },
          ],
        },
        {
          id: 2,
          enonce: "Quelle note minimale faut-il obtenir à l'épreuve pratique (admission) ?",
          choix: [
            { lettre: "A", texte: "10/20", correct: false },
            { lettre: "B", texte: "11/20", correct: false },
            { lettre: "C", texte: "12/20", correct: true },
            { lettre: "D", texte: "14/20", correct: false },
          ],
        },
        {
          id: 3,
          enonce: "Combien de matières comporte l'épreuve théorique ?",
          choix: [
            { lettre: "A", texte: "5 matières", correct: false },
            { lettre: "B", texte: "6 matières", correct: false },
            { lettre: "C", texte: "7 matières", correct: true },
            { lettre: "D", texte: "8 matières", correct: false },
          ],
        },
        {
          id: 4,
          enonce: "Quelle est la durée de l'épreuve A (Réglementation T3P) ?",
          choix: [
            { lettre: "A", texte: "20 minutes", correct: false },
            { lettre: "B", texte: "30 minutes", correct: false },
            { lettre: "C", texte: "45 minutes", correct: true },
            { lettre: "D", texte: "60 minutes", correct: false },
          ],
        },
        {
          id: 5,
          enonce: "En cas d'échec à l'examen théorique, quel est le coût approximatif des frais d'examen ?",
          choix: [
            { lettre: "A", texte: "150€", correct: false },
            { lettre: "B", texte: "237€", correct: true },
            { lettre: "C", texte: "300€", correct: false },
            { lettre: "D", texte: "180€", correct: false },
          ],
        },
        {
          id: 6,
          enonce: "Pour l'épreuve de Français (D), combien de fautes d'orthographe entraînent une pénalité de -1 point ?",
          choix: [
            { lettre: "A", texte: "3 fautes", correct: false },
            { lettre: "B", texte: "5 fautes", correct: true },
            { lettre: "C", texte: "10 fautes", correct: false },
            { lettre: "D", texte: "Aucune pénalité", correct: false },
          ],
        },
        {
          id: 7,
          enonce: "Combien de fois un candidat admissible peut-il se présenter à l'épreuve pratique ?",
          choix: [
            { lettre: "A", texte: "1 fois", correct: false },
            { lettre: "B", texte: "2 fois", correct: false },
            { lettre: "C", texte: "3 fois", correct: true },
            { lettre: "D", texte: "Illimité", correct: false },
          ],
        },
        {
          id: 8,
          enonce: "Quel est le délai pour réussir l'examen théorique après réception des identifiants ?",
          choix: [
            { lettre: "A", texte: "3 mois", correct: false },
            { lettre: "B", texte: "6 mois", correct: true },
            { lettre: "C", texte: "12 mois", correct: false },
            { lettre: "D", texte: "Pas de délai", correct: false },
          ],
        },
        {
          id: 9,
          enonce: "Quelle est la note éliminatoire pour l'épreuve d'Anglais (E) ?",
          choix: [
            { lettre: "A", texte: "4/20", correct: true },
            { lettre: "B", texte: "6/20", correct: false },
            { lettre: "C", texte: "8/20", correct: false },
            { lettre: "D", texte: "10/20", correct: false },
          ],
        },
        {
          id: 10,
          enonce: "Quelle est la durée minimale de la phase de conduite lors de l'épreuve pratique ?",
          choix: [
            { lettre: "A", texte: "10 minutes", correct: false },
            { lettre: "B", texte: "15 minutes", correct: false },
            { lettre: "C", texte: "20 minutes", correct: true },
            { lettre: "D", texte: "30 minutes", correct: false },
          ],
        },
      ],
    },
  ],
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

function getInitialModuleData(module: { id: number; nom: string }): ModuleData {
  // Module IDs: 1 = INTRODUCTION, 6 = PRATIQUE TAXI, 8 = PRATIQUE VTC, 12 = CAS PRATIQUE TAXI
  if (module.id === 1) return JSON.parse(JSON.stringify(INTRODUCTION_DATA));
  if (module.id === 6) return JSON.parse(JSON.stringify(PRATIQUE_TAXI_DATA));
  if (module.id === 2) return JSON.parse(JSON.stringify(VTC_COURS_DATA));
  if (module.id === 8) return JSON.parse(JSON.stringify(PRATIQUE_VTC_DATA));
  if (module.id === 12) return JSON.parse(JSON.stringify(CAS_PRATIQUE_TAXI_DATA));
  return {
    id: module.id,
    nom: module.nom,
    description: "Il s'agit des cours et d'exercices à effectuer",
    cours: [
      { id: 1, titre: "1.T3P 1/2", actif: true },
      { id: 2, titre: "1.T3P 2/3", actif: true },
      { id: 3, titre: "1.T3P 3/3", actif: true },
    ],
    exercices: [
      { id: 10, titre: "1.T3P", sousTitre: "1/2", actif: true },
      { id: 11, titre: "1.T3P", sousTitre: "2/2", actif: true },
      { id: 12, titre: "2.Gestion", sousTitre: "1/3", actif: true },
    ],
  };
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

const ModuleDetailView = ({ module, onBack, studentOnly = false }: ModuleDetailViewProps) => {
  const createInitialSlidesByKey = (): Record<string, Slide[]> => ({
    "t3p-partie1": [...T3P_PARTIE1_SLIDES],
    "t3p-partie2": [...T3P_PARTIE2_SLIDES],
    "gestion-partie1": [...GESTION_PARTIE1_SLIDES],
    "gestion-partie2": [...GESTION_PARTIE2_SLIDES],
    "gestion-partie3": [...GESTION_PARTIE3_SLIDES],
  });

  const [moduleData, setModuleData] = useState<ModuleData>(() => getInitialModuleData(module));
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
    const [showResults, setShowResults] = useState(false);

    const activeCours = moduleData.cours.filter(c => c.actif);
    const activeExercices = moduleData.exercices.filter(e => e.actif) as ExerciceItem[];

    const handleAnswer = (exoId: number, qId: number, lettre: string) => {
      if (showResults) return;
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

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{moduleData.nom}</h2>
          <p className="text-muted-foreground">{moduleData.description}</p>
        </div>

        {/* Cours */}
        {activeCours.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">📚 Cours</h3>
            {activeCours.map((cours) => (
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
                    const hasInteractiveSlides = Boolean(cours.slidesKey && slidesByKey[cours.slidesKey]?.length > 0);
                    // Viewer mode state is stored per-course in a local map
                    const courseViewerKey = `viewer-mode-${cours.id}`;

                    return (
                      <>
                        {/* Fichiers source */}
                        {cours.fichiers && cours.fichiers.length > 0 && (() => {
                          // PDF uses relative path (loaded locally by react-pdf, not by external viewer)
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
                                    {/* Hide download links in secure learner mode */}
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
                                        studentOnly={secureMode}
                                      />
                                    )}

                                    {/* Afficher le lecteur PDF HD directement pour les fichiers PDF */}
                                    {isPdf && !shouldShowViewers && (
                                      <div className="mt-2">
                                        <PdfSlideViewer
                                          url={f.url.startsWith("http") ? f.url : f.url.startsWith("/") ? f.url : `/${f.url}`}
                                          nom={cours.titre}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Slides interactives complètes */}
                        {hasInteractiveSlides && cours.slidesKey && (
                          <div className="mt-4">
                            <SlideViewer
                              slides={slidesByKey[cours.slidesKey] ?? []}
                              titre={cours.titre}
                              brand="FTRANSPORT"
                              onBack={() => {}}
                              editable
                              onSlidesChange={(slides) => updateSlidesForKey(cours.slidesKey!, slides)}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Exercices QCM */}
        {activeExercices.length > 0 && (
          <div className="space-y-4">
            {activeExercices.map(exo => (
              <Card key={exo.id}>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-bold">📝 {exo.titre}</h3>
                  {exo.questions && exo.questions.map((q, qi) => {
                    const key = `${exo.id}-${q.id}`;
                    const selected = selectedAnswers[key];
                    const correctChoice = q.choix.find(c => c.correct);
                    return (
                      <div key={q.id} className="space-y-2 p-4 border rounded-lg">
                        <p className="font-medium">{qi + 1}. {q.enonce}</p>
                        <div className="space-y-1.5 ml-2">
                          {q.choix.map(c => {
                            let bg = "bg-background hover:bg-muted/50 border";
                            if (selected === c.lettre && !showResults) bg = "bg-primary/10 border-primary border-2";
                            if (showResults && c.correct) bg = "bg-emerald-50 border-emerald-500 border-2 dark:bg-emerald-950";
                            if (showResults && selected === c.lettre && !c.correct) bg = "bg-destructive/10 border-destructive border-2";
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
                                {showResults && c.correct && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Score */}
        {totalQuestions > 0 && (
          <div className="flex justify-center gap-4">
            {!showResults ? (
              <Button size="lg" onClick={() => setShowResults(true)} className="gap-2">
                <CheckCircle2 className="w-5 h-5" /> Valider mes réponses
              </Button>
            ) : (
              <Card className="w-full">
                <CardContent className="p-6 text-center space-y-2">
                  <p className="text-2xl font-bold">{correctCount} / {totalQuestions}</p>
                  <p className="text-muted-foreground">
                    {correctCount === totalQuestions ? "🎉 Parfait !" : correctCount >= totalQuestions * 0.6 ? "👍 Bon travail !" : "📖 Continuez à réviser"}
                  </p>
                  <Button variant="outline" onClick={() => { setSelectedAnswers({}); setShowResults(false); }}>
                    Recommencer
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
      </Tabs>
    </div>
  );
};

export default ModuleDetailView;