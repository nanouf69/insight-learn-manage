/**
 * TDD tests for question image upload in admin editors
 *
 * Feature: Admin can optionally attach an image to any question
 * (both in module exercices and examens blancs editors).
 * The image is uploaded to Supabase storage (cours-fichiers bucket)
 * and stored as a URL string on the question's `image` field.
 * The image displays on the student side.
 */
import { describe, it, expect } from "vitest";
import {
  buildQuestionImagePath,
  validateQuestionImageFile,
} from "../components/cours-en-ligne/examens-blancs-utils";

// ────────────────────────────────────────────────────────────
// Image path generation
// ────────────────────────────────────────────────────────────

describe("buildQuestionImagePath — generates unique storage paths", () => {
  it("generates path with module context", () => {
    const path = buildQuestionImagePath("module", 42, 3, "photo.png");
    expect(path).toMatch(/^question-images\/module-42\/q3_\d+_photo\.png$/);
  });

  it("generates path with exam context", () => {
    const path = buildQuestionImagePath("exam", "EB1", 7, "diagram.jpg");
    expect(path).toMatch(/^question-images\/exam-EB1\/q7_\d+_diagram\.jpg$/);
  });

  it("sanitizes filename (spaces, accents, special chars)", () => {
    const path = buildQuestionImagePath("module", 1, 1, "photo été (2).PNG");
    expect(path).not.toContain(" ");
    expect(path).not.toContain("(");
    expect(path).not.toContain(")");
    expect(path).toMatch(/\.PNG$/);
  });

  it("handles very long filenames by truncating", () => {
    const longName = "a".repeat(200) + ".jpg";
    const path = buildQuestionImagePath("module", 1, 1, longName);
    expect(path.length).toBeLessThan(250);
    expect(path).toMatch(/\.jpg$/);
  });
});

// ────────────────────────────────────────────────────────────
// File validation
// ────────────────────────────────────────────────────────────

describe("validateQuestionImageFile — accepts images, rejects others", () => {
  const makeFile = (name: string, type: string, sizeKB: number) =>
    ({ name, type, size: sizeKB * 1024 } as File);

  it("accepts PNG", () => {
    expect(validateQuestionImageFile(makeFile("photo.png", "image/png", 100))).toEqual({ valid: true });
  });

  it("accepts JPEG", () => {
    expect(validateQuestionImageFile(makeFile("photo.jpg", "image/jpeg", 200))).toEqual({ valid: true });
  });

  it("accepts WebP", () => {
    expect(validateQuestionImageFile(makeFile("photo.webp", "image/webp", 50))).toEqual({ valid: true });
  });

  it("accepts GIF", () => {
    expect(validateQuestionImageFile(makeFile("anim.gif", "image/gif", 300))).toEqual({ valid: true });
  });

  it("rejects PDF", () => {
    const result = validateQuestionImageFile(makeFile("doc.pdf", "application/pdf", 100));
    expect(result.valid).toBe(false);
    expect((result as any).error).toBeDefined();
  });

  it("rejects SVG (XSS risk)", () => {
    const result = validateQuestionImageFile(makeFile("icon.svg", "image/svg+xml", 10));
    expect(result.valid).toBe(false);
  });

  it("rejects files > 5MB", () => {
    const result = validateQuestionImageFile(makeFile("huge.png", "image/png", 6000));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("5");
  });

  it("accepts files at exactly 5MB", () => {
    expect(validateQuestionImageFile(makeFile("ok.png", "image/png", 5120))).toEqual({ valid: true });
  });
});
