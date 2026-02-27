import { supabase } from "@/integrations/supabase/client";

// Mapping des dates du catalogue vers dates réelles
const catalogueDateMapping: Record<string, { debut: string; fin: string }> = {
  "Du 12 au 25 janvier 2026": { debut: "2026-01-12", fin: "2026-01-25" },
  "Du 16 au 30 mars 2026": { debut: "2026-03-16", fin: "2026-03-30" },
  "Du 11 au 24 mai 2026": { debut: "2026-05-11", fin: "2026-05-24" },
  "Du 6 au 19 juillet 2026": { debut: "2026-07-06", fin: "2026-07-19" },
  "Du 14 au 27 septembre 2026": { debut: "2026-09-14", fin: "2026-09-27" },
  "Du 2 au 15 novembre 2026": { debut: "2026-11-02", fin: "2026-11-15" },
  "Du 5 au 26 janvier 2026": { debut: "2026-01-05", fin: "2026-01-26" },
  "Du 9 au 30 mars 2026": { debut: "2026-03-09", fin: "2026-03-30" },
  "Du 4 au 25 mai 2026": { debut: "2026-05-04", fin: "2026-05-25" },
  "Du 29 juin au 20 juillet 2026": { debut: "2026-06-29", fin: "2026-07-20" },
  "Du 7 au 28 septembre 2026": { debut: "2026-09-07", fin: "2026-09-28" },
  "Du 26 octobre au 16 novembre 2026": { debut: "2026-10-26", fin: "2026-11-16" },
};

// Mapper le créneau horaire de l'apprenant vers le format session
const mapCreneauToSession = (creneau: string | null): string[] => {
  if (!creneau) return [];
  
  const creneauLower = creneau.toLowerCase();
  if (creneauLower.includes('journée') || creneauLower.includes('journee') || creneauLower === 'journée') {
    return ['09:00-12:00', '13:00-17:00'];
  }
  if (creneauLower.includes('soirée') || creneauLower.includes('soiree') || creneauLower === 'soirée') {
    return ['18:00-21:00'];
  }
  return [];
};

// Mapper le type d'apprenant vers les types de session
const normalizeType = (type: string | null): string[] => {
  if (!type) return [];
  
  const typeLower = type.toLowerCase();
  // VTC types
  if (typeLower.includes('vtc')) return ['vtc', 'VTC'];
  // TAXI types
  if (typeLower.includes('taxi')) return ['taxi', 'TAXI'];
  // TA (passerelle TAXI)
  if (typeLower === 'ta' || typeLower.includes('ta-')) return ['ta', 'TA', 'taxi', 'TAXI'];
  // VA (passerelle VTC)
  if (typeLower === 'va' || typeLower.includes('va-')) return ['va', 'VA', 'vtc', 'VTC'];
  
  return [type];
};

interface AssignSessionResult {
  success: boolean;
  sessionId?: string;
  sessionName?: string;
  created?: boolean;
  error?: string;
}

export async function autoAssignToSession(
  apprenantId: string,
  typeApprenant: string | null,
  creneauHoraire: string | null,
  dateCatalogue: string | null,
  montantTtc: number | null
): Promise<AssignSessionResult> {
  try {
    // Si pas de date catalogue, on ne peut pas associer automatiquement
    if (!dateCatalogue || !catalogueDateMapping[dateCatalogue]) {
      return { success: false, error: "Pas de date de formation valide" };
    }

    const { debut: dateDebut, fin: dateFin } = catalogueDateMapping[dateCatalogue];
    const typesCompatibles = normalizeType(typeApprenant);
    const creneauxSession = mapCreneauToSession(creneauHoraire);

    // Chercher une session existante correspondante
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .lte('date_debut', dateFin)
      .gte('date_fin', dateDebut);

    if (sessionsError) throw sessionsError;

    // Filtrer les sessions compatibles
    let matchingSession = sessions?.find(session => {
      // Vérifier le type d'apprenant
      const sessionTypes = session.types_apprenant || [];
      const typeMatch = typesCompatibles.length === 0 || 
        sessionTypes.length === 0 || 
        sessionTypes.some((t: string) => typesCompatibles.includes(t.toLowerCase()) || typesCompatibles.includes(t));

      // Vérifier les créneaux
      const sessionCreneaux = session.creneaux || [];
      const creneauMatch = creneauxSession.length === 0 || 
        sessionCreneaux.length === 0 || 
        creneauxSession.some(c => sessionCreneaux.includes(c));

      // Vérifier les places disponibles
      const placesOk = (session.places_disponibles || 18) > 0;

      return typeMatch && creneauMatch && placesOk;
    });

    let sessionId: string;
    let sessionName: string;
    let created = false;

    if (matchingSession) {
      // Session existante trouvée
      sessionId = matchingSession.id;
      sessionName = matchingSession.nom || `Session ${dateCatalogue}`;
    } else {
      // Créer une nouvelle session
      const newSessionName = `Session ${typeApprenant?.toUpperCase() || ''} - ${dateCatalogue}`.trim();
      
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          nom: newSessionName,
          date_debut: dateDebut,
          date_fin: dateFin,
          types_apprenant: typesCompatibles.length > 0 ? [typesCompatibles[0].toUpperCase()] : [],
          creneaux: creneauxSession,
          places_disponibles: 17,
          statut: 'planifiee',
          lieu: '86 route de genas 69003 Lyon',
        })
        .select()
        .single();

      if (createError) throw createError;

      sessionId = newSession.id;
      sessionName = newSessionName;
      created = true;
    }

    // Vérifier si l'apprenant n'est pas déjà inscrit à cette session
    const { data: existingLink, error: checkError } = await supabase
      .from('session_apprenants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('apprenant_id', apprenantId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingLink) {
      return { success: true, sessionId, sessionName, created: false };
    }

    // Associer l'apprenant à la session
    const { error: linkError } = await supabase
      .from('session_apprenants')
      .insert({
        session_id: sessionId,
        apprenant_id: apprenantId,
        montant_total: montantTtc || 0,
        montant_paye: 0,
        mode_financement: 'personnel',
      });

    if (linkError) throw linkError;

    // Décrémenter les places disponibles
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ 
        places_disponibles: matchingSession 
          ? Math.max(0, (matchingSession.places_disponibles || 18) - 1)
          : 17
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return { success: true, sessionId, sessionName, created };
  } catch (error: any) {
    console.error('Erreur auto-assign session:', error);
    return { success: false, error: error.message };
  }
}
