import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, Save, X, CheckCircle2, Eye, Settings } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
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
}

// ===== Données initiales des modules PRATIQUE =====
const PRATIQUE_TAXI_DATA: ModuleData = {
  id: 6,
  nom: "8.PRATIQUE TAXI",
  description: "Cours et exercices pour la préparation à l'épreuve pratique TAXI — Déroulement de l'examen, lieux touristiques de Lyon, facturation et relation client.",
  cours: [
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique TAXI", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique TAXI", sousTitre: "Accueil des jurys, tirage au sort de la destination, taximètre, parcours aller-retour, prise de congé", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges, Place Bellecour, Palais de Justice", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place des Terreaux, Opéra de Lyon, Hôtel de Ville, Hôtel-Dieu, Musée des Confluences", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts, Mur du cinéma — Paul Bocuse, Frères Lumière, Tony Garnier", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Parc de Gerland — Châteaux de la Motte, Fort St Jean", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes — Brasserie Georges, Bouchons lyonnais", actif: true },
    { id: 9, titre: "9. Facturation et taximètre", sousTitre: "Utilisation du compteur horokilométrique, sélection du tarif, suppléments, terminal de paiement", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre, questions de confort", actif: true },
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
    { id: 1, titre: "1. Grille de notation de l'épreuve pratique VTC", sousTitre: "Barème : Parcours (2pts), Sécurité/Conduite (10pts), Relation client (5pts), Facturation (3pts) — Note min. 12/20", actif: true },
    { id: 2, titre: "2. Déroulement de l'épreuve pratique VTC", sousTitre: "Accueil des jurys, tirage au sort, devis (transfert ou mise à disposition), parcours, facture, prise de congé", actif: true },
    { id: 3, titre: "3. Monuments historiques de Lyon", sousTitre: "Cathédrale St Jean, Basilique de Fourvière, Église St Georges, Place Bellecour, Palais de Justice", actif: true },
    { id: 4, titre: "4. Places et bâtiments remarquables", sousTitre: "Place des Terreaux, Opéra de Lyon, Hôtel de Ville, Hôtel-Dieu, Musée des Confluences", actif: true },
    { id: 5, titre: "5. Tours et architecture moderne", sousTitre: "Tour Part-Dieu (le crayon, 165m), Tour Oxygène (117m), Tour Incity (la gomme, 202m)", actif: true },
    { id: 6, titre: "6. Fresques et personnalités lyonnaises", sousTitre: "Fresque des Lyonnais, Mur des Canuts, Mur du cinéma — Paul Bocuse, Frères Lumière, Tony Garnier", actif: true },
    { id: 7, titre: "7. Parcs et châteaux", sousTitre: "Parc de la Tête d'Or, Parc Blandan, Parc de Parilly, Parc de Gerland — Châteaux, Domaine de la Bachasse", actif: true },
    { id: 8, titre: "8. Spécialités culinaires et restaurants", sousTitre: "Quenelle, Cervelle de canut, Tablier de sapeur, Bugnes — Brasserie Georges, Bouchons lyonnais", actif: true },
    { id: 9, titre: "9. Devis et facturation VTC", sousTitre: "Transfert vs Mise à disposition, calcul TVA 10%, signature du devis, modèle de facture", actif: true },
    { id: 10, titre: "10. Conseils pratiques pour le jour de l'examen", sousTitre: "Tenue vestimentaire, GPS, gestion du feu orange, comportement neutre, questions de confort", actif: true },
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

function getInitialModuleData(module: { id: number; nom: string }): ModuleData {
  // Module IDs: 6 = PRATIQUE TAXI, 8 = PRATIQUE VTC
  if (module.id === 6) return JSON.parse(JSON.stringify(PRATIQUE_TAXI_DATA));
  if (module.id === 8) return JSON.parse(JSON.stringify(PRATIQUE_VTC_DATA));
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
}: {
  item: ContentItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onEdit: (id: number) => void;
  borderColor: string;
}) => (
  <Card className={`border-2 ${borderColor} transition-all hover:shadow-md`}>
    <CardContent className="p-4 space-y-3">
      <div>
        <h4 className="font-bold text-base">{item.titre}</h4>
        {item.sousTitre && (
          <p className="text-sm text-muted-foreground">{item.sousTitre}</p>
        )}
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

const ModuleDetailView = ({ module, onBack }: ModuleDetailViewProps) => {
  const [moduleData, setModuleData] = useState<ModuleData>(() => getInitialModuleData(module));
  const [editingCoursId, setEditingCoursId] = useState<number | null>(null);

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
  const LearnerPreview = () => {
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

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{moduleData.nom}</h2>
          <p className="text-muted-foreground">{moduleData.description}</p>
        </div>

        {/* Cours */}
        {activeCours.length > 0 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">📚 Cours</h3>
              <div className="space-y-3">
                {activeCours.map((cours, i) => (
                  <div key={cours.id} className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold">{cours.titre}</h4>
                    {cours.sousTitre && <p className="text-sm text-muted-foreground mt-1">{cours.sousTitre}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-lg font-bold block mb-2">Titre du module</label>
                <Input value={moduleData.nom} onChange={(e) => setModuleData({ ...moduleData, nom: e.target.value })} className="text-base font-semibold" />
              </div>
              <div>
                <label className="text-lg font-bold block mb-2">Description du module</label>
                <Textarea value={moduleData.description} onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast.success("Module sauvegardé")} className="gap-2">
                  Sauvegarder le module
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cours */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Cours</h3>
                <Button onClick={() => addItem("cours")} className="gap-2">
                  <Plus className="w-4 h-4" /> Ajouter un cours
                </Button>
              </div>
              {moduleData.cours.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Aucun cours dans ce module</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moduleData.cours.map((cours, index) => (
                    editingCoursId === cours.id ? (
                      <CoursEditor
                        key={cours.id}
                        item={cours}
                        onSave={(updated) => {
                          setModuleData({ ...moduleData, cours: moduleData.cours.map(c => c.id === updated.id ? updated : c) });
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
                        borderColor="border-emerald-400"
                      />
                    )
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercices */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Exercices</h3>
                <Button onClick={() => addItem("exercices")} className="gap-2">
                  <Plus className="w-4 h-4" /> Ajouter un exercice
                </Button>
              </div>
              {moduleData.exercices.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Aucun exercice dans ce module</p>
              ) : (
                <div className="space-y-4">
                  {isPratique ? (
                    moduleData.exercices.map((exercice, index) => (
                      <ExerciceCard
                        key={exercice.id}
                        item={exercice as ExerciceItem}
                        index={index}
                        total={moduleData.exercices.length}
                        onMove={(i, d) => moveItem("exercices", i, d)}
                        onDelete={(id) => deleteItem("exercices", id)}
                        onToggle={(id) => toggleItem("exercices", id)}
                        onUpdateQuestions={updateExerciceQuestions}
                      />
                    ))
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {moduleData.exercices.map((exercice, index) => (
                        <ContentCard
                          key={exercice.id}
                          item={exercice}
                          index={index}
                          total={moduleData.exercices.length}
                          onMove={(i, d) => moveItem("exercices", i, d)}
                          onDelete={(id) => deleteItem("exercices", id)}
                          onToggle={(id) => toggleItem("exercices", id)}
                          onEdit={() => {}}
                          borderColor="border-slate-300"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apercu">
          <LearnerPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuleDetailView;