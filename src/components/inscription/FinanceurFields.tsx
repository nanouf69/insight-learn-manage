import { memo, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FinanceurValues {
  siren: string;
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
}

interface FinanceurFieldsProps {
  initial: FinanceurValues;
  onChange: (values: FinanceurValues) => void;
}

/**
 * Composant ISOLÉ pour les coordonnées du financeur.
 * - État strictement local (les re-renders du parent ne touchent pas ces inputs).
 * - memo() empêche tout re-render inutile du parent.
 * - Sync vers le parent en différé (rAF) pour ne jamais bloquer la saisie.
 * Résout le bug : les champs perdaient le focus pendant la frappe.
 */
function FinanceurFieldsInner({ initial, onChange }: FinanceurFieldsProps) {
  const [values, setValues] = useState<FinanceurValues>(initial);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Propage les valeurs au parent sans déclencher de re-render synchrone
  // qui pourrait faire perdre le focus aux inputs.
  useEffect(() => {
    const id = requestAnimationFrame(() => onChangeRef.current(values));
    return () => cancelAnimationFrame(id);
  }, [values]);

  const update = (key: keyof FinanceurValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValues(prev => prev[key] === v ? prev : { ...prev, [key]: v });
    };

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-slate-50/50">
      <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md p-2">
        ℹ️ Toutes les coordonnées du financeur sont obligatoires pour l'établissement de la facture.
      </p>

      <div className="space-y-1">
        <Label>N° SIREN <span className="text-red-500">*</span></Label>
        <Input
          placeholder="123 456 789"
          value={values.siren}
          onChange={update("siren")}
          autoComplete="off"
          inputMode="numeric"
        />
      </div>

      <div className="space-y-1">
        <Label>Nom de l'entreprise / organisme <span className="text-red-500">*</span></Label>
        <Input
          placeholder="Nom de l'entreprise ou de l'organisme financeur"
          value={values.nom}
          onChange={update("nom")}
          autoComplete="organization"
        />
      </div>

      <div className="space-y-1">
        <Label>Adresse postale <span className="text-red-500">*</span></Label>
        <Input
          placeholder="Adresse du siège"
          value={values.adresse}
          onChange={update("adresse")}
          autoComplete="street-address"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Code postal <span className="text-red-500">*</span></Label>
          <Input
            placeholder="69000"
            value={values.codePostal}
            onChange={update("codePostal")}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label>Ville <span className="text-red-500">*</span></Label>
          <Input
            placeholder="Lyon"
            value={values.ville}
            onChange={update("ville")}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Téléphone <span className="text-red-500">*</span></Label>
          <Input
            type="tel"
            placeholder="01 00 00 00 00"
            value={values.telephone}
            onChange={update("telephone")}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
        <div className="space-y-1">
          <Label>Email <span className="text-red-500">*</span></Label>
          <Input
            type="email"
            placeholder="contact@entreprise.fr"
            value={values.email}
            onChange={update("email")}
            autoComplete="email"
            inputMode="email"
          />
        </div>
      </div>
    </div>
  );
}

// memo strict : ne re-render JAMAIS à cause du parent (props stables).
export const FinanceurFields = memo(FinanceurFieldsInner, () => true);
