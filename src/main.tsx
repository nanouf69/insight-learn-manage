import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installErrorMonitoring } from "@/lib/monitoring/errorLogger";
import { installAnswerPersistence, setAnswerSaveAuthToken } from "@/lib/answerPersistence";
import { initQuizResultPersistence } from "@/lib/quizResultPersistence";
import { supabase } from "@/integrations/supabase/client";
import { installDomPatch } from "@/lib/domPatch";
import { installModulePagesPersistence } from "@/lib/modulePagesPersistence";
import { installChunkVersionGuard } from "@/lib/chunkVersionGuard";
import { CanonicalOriginNotice } from "@/components/CanonicalOriginNotice";

installErrorMonitoring();
// Ancien onglet après mise en ligne : notification + rechargement manuel sûr.
installChunkVersionGuard();

// Persistance fiable des réponses apprenants (file durable + renvoi automatique).
installAnswerPersistence();
installModulePagesPersistence();
// Persistance fiable des notes de matière (renvoi automatique jusqu'à confirmation).
initQuizResultPersistence();
supabase.auth.getSession().then(({ data }) =>
  setAnswerSaveAuthToken(data.session?.access_token ?? null, data.session?.user?.id ?? null),
);
supabase.auth.onAuthStateChange((_e, session) =>
  setAnswerSaveAuthToken(session?.access_token ?? null, session?.user?.id ?? null),
);

// Protection contre les modifications du DOM hors React (traduction, extensions).
installDomPatch();

const root = document.getElementById("root");
if (root) createRoot(root).render(
  <React.StrictMode>
    <CanonicalOriginNotice />
    <App />
  </React.StrictMode>
);