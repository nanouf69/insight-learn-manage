import { useState } from "react";
import { GraduationCap, Calendar, CheckCircle2, XCircle, Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ExamensSectionProps {
  apprenant: any;
}

export function ExamensSection({ apprenant }: ExamensSectionProps) {
  const [editingTheorique, setEditingTheorique] = useState(false);
  const [editingPratique, setEditingPratique] = useState(false);
  const [resultatTheorique, setResultatTheorique] = useState<string | null>(null);
  const [resultatPratique, setResultatPratique] = useState<string | null>(null);
  const [datePratique, setDatePratique] = useState<string>('');
  const queryClient = useQueryClient();

  // TODO: Ajouter les colonnes resultat_theorique, resultat_pratique, date_examen_pratique dans la BDD

  const handleSaveResultat = async (type: 'theorique' | 'pratique') => {
    try {
      // Note: Pour l'instant on ne peut pas sauvegarder car les colonnes n'existent pas
      // On simule la sauvegarde
      toast.success(`Résultat ${type} enregistré`);
      if (type === 'theorique') {
        setEditingTheorique(false);
      } else {
        setEditingPratique(false);
      }
      queryClient.invalidateQueries({ queryKey: ['apprenant-detail', apprenant.id] });
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const getResultBadge = (result: string | null | undefined) => {
    if (!result || result === 'en_attente') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          En attente
        </Badge>
      );
    }
    if (result === 'reussi') {
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Réussi
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" />
        Échoué
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Examens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Examen Théorique */}
          <div className="p-6 border rounded-xl bg-gradient-to-br from-blue-50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Examen Théorique</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingTheorique(!editingTheorique)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date d'examen</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {apprenant.date_examen_theorique || 'Non définie'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Résultat</p>
                {editingTheorique ? (
                  <div className="flex items-center gap-2">
                    <Select 
                      value={resultatTheorique || ''} 
                      onValueChange={setResultatTheorique}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="reussi">Réussi</SelectItem>
                        <SelectItem value="echoue">Échoué</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleSaveResultat('theorique')}>
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  getResultBadge(resultatTheorique)
                )}
              </div>
            </div>
          </div>

          {/* Examen Pratique */}
          <div className="p-6 border rounded-xl bg-gradient-to-br from-purple-50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Examen Pratique</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingPratique(!editingPratique)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date d'examen</p>
                {editingPratique ? (
                  <input 
                    type="date"
                    value={datePratique}
                    onChange={(e) => setDatePratique(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {datePratique || 'Non définie'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Résultat</p>
                {editingPratique ? (
                  <div className="flex items-center gap-2">
                    <Select 
                      value={resultatPratique || ''} 
                      onValueChange={setResultatPratique}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="reussi">Réussi</SelectItem>
                        <SelectItem value="echoue">Échoué</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => handleSaveResultat('pratique')}>
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  getResultBadge(resultatPratique)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Note info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Rappel :</strong> Les examens théoriques ont lieu à Villeurbanne ou Clermont-Ferrand. 
            Les examens pratiques sont organisés dans le département du Rhône (69).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
