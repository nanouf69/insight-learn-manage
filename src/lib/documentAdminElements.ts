import { supabase } from "@/integrations/supabase/client";

export const DOCUMENT_ADMIN_ELEMENTS = [
  { id: "signature", label: "Ma signature", path: "admin-elements/2026-10-26-naoufal-signature.png", w: 30, h: 5 },
  { id: "tampon", label: "Mon tampon", path: "admin-elements/2026-10-26-naoufal-tampon.png", w: 30, h: 7 },
] as const;
export type AdminElementId = typeof DOCUMENT_ADMIN_ELEMENTS[number]["id"];

export async function chargerElementAdmin(id: AdminElementId): Promise<string> {
  const element = DOCUMENT_ADMIN_ELEMENTS.find((item) => item.id === id);
  if (!element) throw new Error("Élément introuvable");
  const { data, error } = await supabase.storage.from("documents-a-signer").download(element.path);
  if (error || !data) throw new Error("Impossible de charger cet élément privé");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image illisible"));
    reader.onerror = () => reject(new Error("Image illisible"));
    reader.readAsDataURL(data);
  });
}