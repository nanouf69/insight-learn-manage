import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installErrorMonitoring } from "@/lib/monitoring/errorLogger";
import { installAnswerPersistence, setAnswerSaveAuthToken } from "@/lib/answerPersistence";
import { initQuizResultPersistence } from "@/lib/quizResultPersistence";
import { supabase } from "@/integrations/supabase/client";

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

// Patch for React/Radix removeChild DOM error (known issue with Select/Dialog portals)
const origRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    console.warn('[DOM Patch] removeChild: node not a child, skipping');
    return child;
  }
  return origRemoveChild.call(this, child) as T;
};
// Même protection pour insertBefore : erreurs « insertBefore … not a child » / « The object can not
// be found here » (Safari) observées en production quand le DOM a été modifié hors de React
// (traduction automatique, extensions). On insère en fin de parent au lieu de faire planter l'écran.
const origInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
  if (refNode && refNode.parentNode !== this) {
    console.warn('[DOM Patch] insertBefore: reference node not a child, appending');
    return origInsertBefore.call(this, newNode, null) as T;
  }
  return origInsertBefore.call(this, newNode, refNode) as T;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);