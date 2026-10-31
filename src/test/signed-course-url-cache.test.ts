import { describe, it, expect, beforeEach, vi } from "vitest";
import { signCourseObject, getCachedSignedUrl, __resetSignedCourseUrlCache } from "@/lib/signedCourseUrlCache";

describe("signed course media URL stays stable across remounts", () => {
  beforeEach(() => __resetSignedCourseUrlCache());

  it("signs once and returns the same URL to later mounts", async () => {
    const sign = vi.fn().mockResolvedValue("https://x/signed?token=1");
    const [a, b] = await Promise.all([signCourseObject("b", "p.pdf", sign), signCourseObject("b", "p.pdf", sign)]);
    const c = await signCourseObject("b", "p.pdf", sign);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(new Set([a, b, c])).toEqual(new Set(["https://x/signed?token=1"]));
    expect(getCachedSignedUrl("b", "p.pdf")).toBe("https://x/signed?token=1");
  });

  it("re-signs after expiry and never caches failures", async () => {
    let t = 0;
    const now = () => t;
    const fail = vi.fn().mockResolvedValue(null);
    expect(await signCourseObject("b", "q", fail, now)).toBeNull();
    const ok = vi.fn().mockResolvedValue("u1");
    expect(await signCourseObject("b", "q", ok, now)).toBe("u1");
    t = 51 * 60 * 1000;
    const ok2 = vi.fn().mockResolvedValue("u2");
    expect(await signCourseObject("b", "q", ok2, now)).toBe("u2");
  });
});
