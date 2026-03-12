import { supabase } from "@/integrations/supabase/client";

interface SavePublicFormParams {
  apprenantId: string;
  typeDocument: string;
  titre: string;
  donnees: Record<string, any>;
}

export async function savePublicFormDocument({
  apprenantId,
  typeDocument,
  titre,
  donnees,
}: SavePublicFormParams): Promise<boolean> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !apikey) {
    console.error("Missing backend configuration for save-public-form");
    return false;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      apikey,
      "Content-Type": "application/json",
    };

    const accessToken = sessionData?.session?.access_token;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${baseUrl}/functions/v1/save-public-form`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        apprenantId,
        typeDocument,
        titre,
        donnees,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("save-public-form failed:", response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error("save-public-form exception:", error);
    return false;
  }
}
