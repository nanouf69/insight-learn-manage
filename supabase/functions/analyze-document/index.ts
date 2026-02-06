import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeDocumentRequest {
  documentUrl: string;
  documentType: 'piece_identite' | 'permis_conduire' | 'justificatif_domicile';
}

interface AnalysisResult {
  isValid: boolean;
  expirationDate?: string;
  issueDate?: string;
  rejectionReason?: string;
  details?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrl, documentType } = await req.json() as AnalyzeDocumentRequest;

    if (!documentUrl || !documentType) {
      return new Response(
        JSON.stringify({ error: 'documentUrl et documentType sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Build the prompt based on document type
    let prompt = '';
    if (documentType === 'piece_identite') {
      prompt = `Analyse cette image d'une pièce d'identité (carte d'identité ou passeport).

INSTRUCTIONS:
1. Identifie la date d'expiration/validité du document
2. Vérifie si le document est périmé par rapport à la date actuelle (${new Date().toLocaleDateString('fr-FR')})
3. Retourne un JSON avec les champs suivants:
   - isValid: boolean (true si le document n'est pas périmé)
   - expirationDate: string (date d'expiration au format JJ/MM/AAAA si trouvée)
   - rejectionReason: string (si isValid=false, explique pourquoi: "Pièce d'identité périmée depuis le [date]")
   - details: string (informations supplémentaires extraites)

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
    } else if (documentType === 'permis_conduire') {
      prompt = `Analyse cette image d'un permis de conduire.

INSTRUCTIONS:
1. Identifie la date d'obtention du permis (date de délivrance initiale, pas la date du document)
2. Identifie la date d'expiration si présente
3. Calcule si le permis a moins de 3 ans (période probatoire) par rapport à la date actuelle (${new Date().toLocaleDateString('fr-FR')})
4. Vérifie si le document est périmé
5. Retourne un JSON avec les champs suivants:
   - isValid: boolean (true si le permis n'est pas périmé ET a plus de 3 ans)
   - issueDate: string (date d'obtention au format JJ/MM/AAAA si trouvée)
   - expirationDate: string (date d'expiration au format JJ/MM/AAAA si trouvée)
   - rejectionReason: string (si isValid=false, explique pourquoi: "Permis en période probatoire (moins de 3 ans)" ou "Permis de conduire périmé")
   - details: string (informations supplémentaires extraites)

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
    } else if (documentType === 'justificatif_domicile') {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      prompt = `Analyse cette image d'un justificatif de domicile (facture EDF, eau, téléphone, avis d'imposition, etc.).

INSTRUCTIONS:
1. Identifie la date du document (date d'émission ou date de la facture)
2. Vérifie si le document a moins de 3 mois par rapport à la date actuelle (${new Date().toLocaleDateString('fr-FR')})
3. La date limite acceptable est le ${threeMonthsAgo.toLocaleDateString('fr-FR')}
4. Retourne un JSON avec les champs suivants:
   - isValid: boolean (true si le document date de moins de 3 mois)
   - issueDate: string (date du document au format JJ/MM/AAAA si trouvée)
   - rejectionReason: string (si isValid=false: "Justificatif de domicile de plus de 3 mois (daté du [date])")
   - details: string (type de document identifié: facture EDF, eau, etc.)

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
    }

    // Call Lovable AI Gateway with vision
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: documentUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`Erreur lors de l'analyse du document: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Réponse IA vide');
    }

    // Parse the JSON response
    let result: AnalysisResult;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON non trouvé dans la réponse');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
      // Return a default uncertain result
      result = {
        isValid: true,
        details: "Impossible d'analyser automatiquement le document. Vérification manuelle recommandée.",
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de l\'analyse' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
