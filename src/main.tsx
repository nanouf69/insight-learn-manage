import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installErrorMonitoring } from "@/lib/monitoring/errorLogger";
import { installAnswerPersistence, setAnswerSaveAuthToken } from "@/lib/answerPersistence";
import { supabase } from "@/integrations/supabase/client";

installErrorMonitoring();

// Persistance fiable des réponses apprenants (file durable + renvoi automatique).
installAnswerPersistence();
supabase.auth.getSession().then(({ data }) => setAnswerSaveAuthToken(data.session?.access_token ?? null));
supabase.auth.onAuthStateChange((_e, session) => setAnswerSaveAuthToken(session?.access_token ?? null));

// Patch for React/Radix removeChild DOM error (known issue with Select/Dialog portals)
const origRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    console.warn('[DOM Patch] removeChild: node not a child, skipping');
    return child;
  }
  return origRemoveChild.call(this, child) as T;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);