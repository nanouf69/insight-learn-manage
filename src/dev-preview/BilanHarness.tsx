import { createRoot } from "react-dom/client";
import "../index.css";
import { BilanFutureExam } from "@/components/cours-en-ligne/BilanFutureExam";
createRoot(document.getElementById("root")!).render(
  <div className="p-4"><BilanFutureExam moduleId={5} ownerId="u1" titre="5. BILAN EXAMEN VTC" description="Aperçu technique" onBack={() => {}} /></div>
);
