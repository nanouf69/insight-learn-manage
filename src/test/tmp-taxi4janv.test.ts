import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { calendrierSession } from "@/lib/programmeCalendrierDevis";
import { buildProgrammeCalendrierPDF } from "@/lib/pdf/programme-calendrier-devis";
it("réel", async () => {
  const sb = createClient("https://qywdsohyuigjmclemqgm.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2Rzb2h5dWlnam1jbGVtcWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDcxNTQsImV4cCI6MjA4NTcyMzE1NH0.9YXj7SGVrhlrQ6EuBzdaAit0sCSn9BQ8HCxau6QAies");
  const { data, error } = await sb.rpc("sessions_publiques_devis");
  expect(error).toBeNull();
  const s = (data as any[]).find((x) => x.date_debut === "2027-01-04");
  const c = calendrierSession(s, "taxi");
  console.log(JSON.stringify({ n: c.jours.length, h: c.heuresSaisies, att: c.heuresAttendues, valide: c.valide, an: c.anomalies }));
  const sig = buildProgrammeCalendrierPDF.toString().slice(0, 0);
  void sig;
});
