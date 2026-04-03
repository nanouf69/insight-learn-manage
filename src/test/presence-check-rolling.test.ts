/**
 * TDD tests for presence check rolling window
 *
 * BUG: The server-side presence check uses a FIXED checkpoint (started_at + 30min).
 * This means ALL users — even active ones — see the "Êtes-vous là ?" prompt at 30 min.
 * Also: during exams, heartbeats are paused → last_seen_at goes stale → RLS blocks
 * writes → session is closed immediately when exam ends.
 *
 * FIX: Use a ROLLING window based on last_action_at (real user interactions).
 * Heartbeats keep last_seen_at fresh (for RLS) but don't reset the rolling window.
 * During exams: send "heartbeat_exam" events that keep session alive but skip
 * presence checks. After exam: send "confirm_presence" to reset rolling window.
 */
import { describe, it, expect } from "vitest";
import {
  computePresenceCheck,
  type PresenceCheckInput,
} from "../components/cours-en-ligne/examens-blancs-utils";

const BASE_TIME = new Date("2026-04-01T10:00:00Z").getTime();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function makeInput(overrides: Partial<PresenceCheckInput> = {}): PresenceCheckInput {
  return {
    now: BASE_TIME + 15 * MIN,
    startedAt: BASE_TIME,
    lastSeenAt: BASE_TIME + 14 * MIN,
    lastActionAt: BASE_TIME + 14 * MIN,
    event: "heartbeat",
    isInExam: false,
    sessionEndedAt: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────
// Rolling window — active users should never see prompt
// ────────────────────────────────────────────────────────────

describe("Presence check — rolling window basics", () => {
  it("no prompt when last action was recent (within 30 min)", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 20 * MIN,
      lastActionAt: BASE_TIME + 19 * MIN,
    }));
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(false);
  });

  it("prompt when last action was >30 min ago (within grace)", () => {
    // Gap = 32 min → past 30-min window but within 35-min deadline
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 50 * MIN,
      lastActionAt: BASE_TIME + 18 * MIN,
    }));
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(true);
    expect(result.remainingPresenceSeconds).toBeGreaterThan(0);
  });

  it("close session when last action was >35 min ago (past grace period)", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 50 * MIN,
      lastActionAt: BASE_TIME + 5 * MIN,
    }));
    expect(result.isValid).toBe(false);
    expect(result.disconnectReason).toBe("no_response");
  });

  it("session valid at 30 min mark if recent action", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 30 * MIN,
      lastActionAt: BASE_TIME + 29 * MIN + 50 * 1000,
    }));
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// Timestamp updates — which events update which fields
// ────────────────────────────────────────────────────────────

describe("Presence check — timestamp updates", () => {
  it("action event updates both lastSeenAt and lastActionAt", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 40 * MIN,
      lastSeenAt: BASE_TIME + 10 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      event: "action",
    }));
    expect(result.updatedLastSeenAt).toBe(BASE_TIME + 40 * MIN);
    expect(result.updatedLastActionAt).toBe(BASE_TIME + 40 * MIN);
    // Action resets the rolling window → no prompt
    expect(result.shouldShowPresencePrompt).toBe(false);
  });

  it("heartbeat updates lastSeenAt but NOT lastActionAt", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 40 * MIN,
      lastSeenAt: BASE_TIME + 10 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      event: "heartbeat",
    }));
    expect(result.updatedLastSeenAt).toBe(BASE_TIME + 40 * MIN);
    expect(result.updatedLastActionAt).toBe(BASE_TIME + 10 * MIN); // NOT updated
  });

  it("confirm_presence updates both timestamps and resets window", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 40 * MIN,
      lastActionAt: BASE_TIME + 5 * MIN,
      event: "confirm_presence",
    }));
    expect(result.updatedLastActionAt).toBe(BASE_TIME + 40 * MIN);
    expect(result.updatedLastSeenAt).toBe(BASE_TIME + 40 * MIN);
    expect(result.shouldShowPresencePrompt).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it("heartbeat_exam updates lastSeenAt but NOT lastActionAt", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 40 * MIN,
      lastSeenAt: BASE_TIME + 39 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      event: "heartbeat_exam",
      isInExam: true,
    }));
    expect(result.updatedLastSeenAt).toBe(BASE_TIME + 40 * MIN);
    expect(result.updatedLastActionAt).toBe(BASE_TIME + 10 * MIN);
  });
});

// ────────────────────────────────────────────────────────────
// Exam mode — heartbeats keep session alive, no prompt
// ────────────────────────────────────────────────────────────

describe("Presence check — exam mode", () => {
  it("no prompt during exam even if last action was >30 min ago", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 50 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      isInExam: true,
      event: "heartbeat_exam",
    }));
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(false);
    expect(result.disconnectReason).toBe(null);
  });

  it("no disconnect during exam even if past deadline", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 2 * HOUR,
      lastActionAt: BASE_TIME + 10 * MIN,
      isInExam: true,
      event: "heartbeat_exam",
    }));
    expect(result.isValid).toBe(true);
    expect(result.disconnectReason).toBe(null);
  });

  it("heartbeat_exam keeps lastSeenAt fresh during exam", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 90 * MIN,
      lastSeenAt: BASE_TIME + 89 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      event: "heartbeat_exam",
      isInExam: true,
    }));
    expect(result.updatedLastSeenAt).toBe(BASE_TIME + 90 * MIN);
  });

  it("after exam ends, confirm_presence resets rolling window", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 90 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN,
      event: "confirm_presence",
      isInExam: false,
    }));
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(false);
    expect(result.updatedLastActionAt).toBe(BASE_TIME + 90 * MIN);
  });
});

// ────────────────────────────────────────────────────────────
// Max duration + already-closed session
// ────────────────────────────────────────────────────────────

describe("Presence check — max duration", () => {
  it("close session after 7 hours", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 7 * HOUR + MIN,
      lastActionAt: BASE_TIME + 7 * HOUR,
    }));
    expect(result.isValid).toBe(false);
    expect(result.disconnectReason).toBe("max_duration");
  });

  it("valid just before 7 hours", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 7 * HOUR - MIN,
      lastActionAt: BASE_TIME + 7 * HOUR - 2 * MIN,
    }));
    expect(result.isValid).toBe(true);
  });

  it("max duration overrides exam mode", () => {
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 7 * HOUR + MIN,
      isInExam: true,
      event: "heartbeat_exam",
    }));
    expect(result.isValid).toBe(false);
    expect(result.disconnectReason).toBe("max_duration");
  });
});

describe("Presence check — already closed session", () => {
  it("invalid for ended session", () => {
    const result = computePresenceCheck(makeInput({
      sessionEndedAt: BASE_TIME + 30 * MIN,
    }));
    expect(result.isValid).toBe(false);
    expect(result.disconnectReason).toBe("already_closed");
  });
});

// ────────────────────────────────────────────────────────────
// BUG REPRODUCTION — active user should never see prompt
// ────────────────────────────────────────────────────────────

describe("BUG REPRODUCTION — old fixed-checkpoint showed prompt for active users", () => {
  it("active user at 30m+15s should NOT see prompt (action 25s ago)", () => {
    // OLD BUG: fixed checkpoint at started_at + 30min → prompt always at 30min
    // NEW FIX: rolling window from last action → no prompt if recent action
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 30 * MIN + 15 * 1000,
      lastActionAt: BASE_TIME + 29 * MIN + 50 * 1000,
      lastSeenAt: BASE_TIME + 30 * MIN,
      event: "heartbeat",
    }));
    expect(result.shouldShowPresencePrompt).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it("continuously active user never sees prompt over 3 hours", () => {
    let lastActionAt = BASE_TIME;
    let lastSeenAt = BASE_TIME;

    for (let t = 0; t < 3 * 60; t++) {
      const now = BASE_TIME + t * MIN;

      // Heartbeat
      const hb = computePresenceCheck({
        now, startedAt: BASE_TIME, lastSeenAt, lastActionAt,
        event: "heartbeat", isInExam: false, sessionEndedAt: null,
      });
      expect(hb.isValid).toBe(true);
      expect(hb.shouldShowPresencePrompt).toBe(false);
      lastSeenAt = hb.updatedLastSeenAt;
      lastActionAt = hb.updatedLastActionAt;

      // Action (every minute simulates user interaction)
      const act = computePresenceCheck({
        now: now + 30 * 1000, startedAt: BASE_TIME, lastSeenAt, lastActionAt,
        event: "action", isInExam: false, sessionEndedAt: null,
      });
      expect(act.isValid).toBe(true);
      expect(act.shouldShowPresencePrompt).toBe(false);
      lastSeenAt = act.updatedLastSeenAt;
      lastActionAt = act.updatedLastActionAt;
    }
  });
});

// ────────────────────────────────────────────────────────────
// BUG REPRODUCTION — exam ends → immediate disconnect
// ────────────────────────────────────────────────────────────

describe("BUG REPRODUCTION — exam end should not trigger disconnect", () => {
  it("60-min exam: confirm_presence after exam prevents disconnect", () => {
    // Simulate: user starts exam at T=10min, exam lasts 60min
    // After exam (T=70min), first event is confirm_presence
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 70 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN, // last action before exam (60 min ago!)
      lastSeenAt: BASE_TIME + 69 * MIN, // heartbeat_exam kept this fresh
      event: "confirm_presence",
      isInExam: false,
    }));
    // confirm_presence resets lastActionAt → no prompt, no disconnect
    expect(result.isValid).toBe(true);
    expect(result.shouldShowPresencePrompt).toBe(false);
    expect(result.disconnectReason).toBe(null);
  });

  it("WITHOUT fix: heartbeat after 60-min exam would close session", () => {
    // If we sent a regular heartbeat (not confirm_presence) after a long exam:
    const result = computePresenceCheck(makeInput({
      now: BASE_TIME + 70 * MIN,
      lastActionAt: BASE_TIME + 10 * MIN, // 60 min since last action → past deadline
      lastSeenAt: BASE_TIME + 69 * MIN,
      event: "heartbeat",
      isInExam: false,
    }));
    // Heartbeat doesn't reset lastActionAt → past 35min deadline → session closed
    expect(result.isValid).toBe(false);
    expect(result.disconnectReason).toBe("no_response");
  });
});
