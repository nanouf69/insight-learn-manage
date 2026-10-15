import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installErrorMonitoring } from "@/lib/monitoring/errorLogger";
import { installAnswerPersistence, setAnswerSaveAuthToken } from "@/lib/answerPersistence";
import { initQuizResultPersistence } from "@/lib/quizResultPersistence";
import { supabase } from "@/integrations/supabase/client";
import { installDomPatch } from "@/lib/domPatch";

installErrorMonitoring();

// Persistance fiable des réponses apprenants (file durable + renvoi automatique).
installAnswerPersistence();
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);