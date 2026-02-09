import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowUp, ArrowDown, Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: number;
  titre: string;
  sousTitre?: string;
  actif: boolean;
}

interface ModuleData {
  id: number;
  nom: string;
  description: string;
  cours: ContentItem[];
  exercices: ContentItem[];
}

interface ModuleDetailViewProps {
  module: { id: number; nom: string };
  onBack: () => void;
}

const ContentCard = ({
  item,
  index,
  total,
  onMove,
  onDelete,
  onToggle,
  borderColor,
}: {
  item: ContentItem;
  index: number;
  total: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
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
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, "up")}
          disabled={index === 0}
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, "down")}
          disabled={index === total - 1}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button variant="default" size="sm" className="gap-1">
          <Pencil className="w-3 h-3" />
          Modifier
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="gap-1"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3 h-3" />
          Supprimer
        </Button>
        <button
          onClick={() => onToggle(item.id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={item.actif ? "Désactiver" : "Activer"}
        >
          {item.actif ? (
            <ToggleRight className="w-8 h-8 text-emerald-500" />
          ) : (
            <ToggleLeft className="w-8 h-8" />
          )}
        </button>
      </div>
    </CardContent>
  </Card>
);

const ModuleDetailView = ({ module, onBack }: ModuleDetailViewProps) => {
  const [moduleData, setModuleData] = useState<ModuleData>({
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
  });

  const moveItem = (
    type: "cours" | "exercices",
    index: number,
    direction: "up" | "down"
  ) => {
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
      [type]: moduleData[type].map((i) =>
        i.id === id ? { ...i, actif: !i.actif } : i
      ),
    });
  };

  const addItem = (type: "cours" | "exercices") => {
    const newId = Date.now();
    const newItem: ContentItem = {
      id: newId,
      titre: type === "cours" ? "Nouveau cours" : "Nouvel exercice",
      actif: true,
    };
    setModuleData({
      ...moduleData,
      [type]: [...moduleData[type], newItem],
    });
    toast.success(`${type === "cours" ? "Cours" : "Exercice"} ajouté`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold">Détail du module</h2>
      </div>

      {/* Module info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-lg font-bold block mb-2">Titre du module</label>
            <Input
              value={moduleData.nom}
              onChange={(e) =>
                setModuleData({ ...moduleData, nom: e.target.value })
              }
              className="text-base font-semibold"
            />
          </div>
          <div>
            <label className="text-lg font-bold block mb-2">Description du module</label>
            <Textarea
              value={moduleData.description}
              onChange={(e) =>
                setModuleData({ ...moduleData, description: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => toast.success("Module sauvegardé")}
              className="gap-2"
            >
              Sauvegarder le module
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cours section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Cours</h3>
            <Button onClick={() => addItem("cours")} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un cours
            </Button>
          </div>
          {moduleData.cours.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucun cours dans ce module
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {moduleData.cours.map((cours, index) => (
                <ContentCard
                  key={cours.id}
                  item={cours}
                  index={index}
                  total={moduleData.cours.length}
                  onMove={(i, d) => moveItem("cours", i, d)}
                  onDelete={(id) => deleteItem("cours", id)}
                  onToggle={(id) => toggleItem("cours", id)}
                  borderColor="border-emerald-400"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercices section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Exercices</h3>
            <Button onClick={() => addItem("exercices")} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un exercice
            </Button>
          </div>
          {moduleData.exercices.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucun exercice dans ce module
            </p>
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
                  borderColor="border-slate-300"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleDetailView;
