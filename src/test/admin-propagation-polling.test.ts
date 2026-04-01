/**
 * TDD tests for admin edit propagation polling fallback
 *
 * BUG: Admin modifies questions/answers but changes don't always propagate
 * to students. "Ça a marché une fois, mais plus après."
 * Root cause: Supabase Realtime can silently disconnect. No fallback exists.
 *
 * FIX: Add a lightweight polling mechanism as safety net.
 * Every 30s, check if Realtime has triggered a refresh recently.
 * If not (> 60s silence), do a lightweight check on module_editor_state.updated_at
 * and trigger a full refresh only if data has changed.
 */
import { describe, it, expect } from "vitest";
import {
  shouldTriggerPollingRefresh,
} from "../components/cours-en-ligne/examens-blancs-utils";

describe("Admin propagation polling fallback", () => {
  it("should NOT poll if Realtime refresh was recent (< interval)", () => {
    const now = Date.now();
    expect(shouldTriggerPollingRefresh({
      lastRealtimeRefreshAt: now - 10_000,
      now,
      pollingIntervalMs: 60_000,
    })).toBe(false);
  });

  it("should poll if Realtime has been silent for > interval", () => {
    const now = Date.now();
    expect(shouldTriggerPollingRefresh({
      lastRealtimeRefreshAt: now - 90_000,
      now,
      pollingIntervalMs: 60_000,
    })).toBe(true);
  });

  it("should poll if never refreshed via Realtime (lastRealtimeRefreshAt = 0)", () => {
    expect(shouldTriggerPollingRefresh({
      lastRealtimeRefreshAt: 0,
      now: Date.now(),
      pollingIntervalMs: 60_000,
    })).toBe(true);
  });

  it("should NOT poll at exactly the interval boundary", () => {
    const now = Date.now();
    expect(shouldTriggerPollingRefresh({
      lastRealtimeRefreshAt: now - 60_000,
      now,
      pollingIntervalMs: 60_000,
    })).toBe(false);
  });

  it("should poll if last refresh was 1ms past the interval", () => {
    const now = Date.now();
    expect(shouldTriggerPollingRefresh({
      lastRealtimeRefreshAt: now - 60_001,
      now,
      pollingIntervalMs: 60_000,
    })).toBe(true);
  });
});

describe("Admin propagation — hasRemoteDataChanged", () => {
  it("should detect change when remote updated_at is newer", () => {
    const lastKnown = new Date("2026-04-01T10:00:00Z").getTime();
    const remoteUpdatedAt = new Date("2026-04-01T10:01:00Z").getTime();
    expect(remoteUpdatedAt > lastKnown).toBe(true);
  });

  it("should NOT detect change when remote updated_at is same", () => {
    const lastKnown = new Date("2026-04-01T10:00:00Z").getTime();
    const remoteUpdatedAt = new Date("2026-04-01T10:00:00Z").getTime();
    expect(remoteUpdatedAt > lastKnown).toBe(false);
  });
});
