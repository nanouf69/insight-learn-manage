import { test, expect } from "vitest";
import { retirerCreneauxPratique } from "/dev-server/src/lib/reports/exclusionPratique";
test("pratique", () => {
  // 09/10 Paris UTC+2 : 10h09-10h42 = exclu ; 16h10-16h40 compté ; 11h30-13h30 -> 12h-13h gardé
  const rows = [
    { id:"a", started_at:"2026-10-09T08:09:00Z", ended_at:"2026-10-09T08:42:00Z", last_action_at:"2026-10-09T08:42:00Z" },
    { id:"b", started_at:"2026-10-09T14:10:00Z", ended_at:"2026-10-09T14:40:00Z", last_action_at:"2026-10-09T14:40:00Z" },
    { id:"c", started_at:"2026-10-09T09:30:00Z", ended_at:"2026-10-09T11:30:00Z", last_action_at:"2026-10-09T11:30:00Z" },
    { id:"d", started_at:"2026-10-10T08:09:00Z", ended_at:"2026-10-10T08:42:00Z", last_action_at:"2026-10-10T08:42:00Z" },
  ];
  const r = retirerCreneauxPratique(rows as any, ["2026-10-09"]);
  expect(r.map(x=>[x.id,x.started_at,x.ended_at])).toEqual([
    ["b","2026-10-09T14:10:00Z","2026-10-09T14:40:00Z"],
    ["c","2026-10-09T10:00:00.000Z","2026-10-09T11:00:00.000Z"],
    ["d","2026-10-10T08:09:00Z","2026-10-10T08:42:00Z"],
  ]);
});
