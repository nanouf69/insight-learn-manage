import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) } } }));

import { ExamQuestionImage, questionImageReserveHeight } from "@/components/cours-en-ligne/ExamQuestionImage";

describe("question images: no blank under the visible image", () => {
  it("reserves only the caller's own height cap while loading", () => {
    expect(questionImageReserveHeight("max-h-40 rounded border")).toBe("10rem");
    expect(questionImageReserveHeight("mt-1 max-h-24 rounded border")).toBe("6rem");
    expect(questionImageReserveHeight("mt-4 w-full h-auto max-h-[480px] object-contain")).toBe("480px");
    expect(questionImageReserveHeight("w-20 h-20 object-contain")).toBe("5rem");
    expect(questionImageReserveHeight("rounded")).toBe("10rem");
  });

  it("default frame no longer uses the full-width 4:3 box and hugs the image once loaded", () => {
    const { container } = render(<ExamQuestionImage image="/qa/sign-a.png" alt="i" className="max-h-40 rounded border" />);
    const frame = container.querySelector(".question-image-frame") as HTMLElement;
    expect(frame).not.toBeNull();
    expect(container.querySelector(".aspect-\\[4\\/3\\]")).toBeNull();
    expect(frame.style.getPropertyValue("--question-image-reserve")).toBe("10rem");
    expect(frame.hasAttribute("data-loaded")).toBe(false);
    const img = frame.querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 198 });
    Object.defineProperty(img, "naturalHeight", { value: 198 });
    fireEvent.load(img);
    expect(frame.hasAttribute("data-loaded")).toBe(true);
    expect(img.className).not.toContain("h-full");
  });

  it("road-safety callers keep their dedicated frame", () => {
    const { container } = render(<ExamQuestionImage image="/qa/sign-b.png" alt="i" frameClassName="road-safety-question-image" fitFrameToImage />);
    expect(container.querySelector(".road-safety-question-image")).not.toBeNull();
    expect(container.querySelector(".question-image-frame")).toBeNull();
  });

  it("a broken image shows only the short message, without a reserved blank box", () => {
    const { container, getByText } = render(<ExamQuestionImage image="/qa/broken.png" alt="i" className="max-h-40" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(getByText("Image non disponible")).toBeTruthy();
    expect(container.querySelector(".question-image-frame")).toBeNull();
    expect(container.querySelector(".aspect-\\[4\\/3\\]")).toBeNull();
  });
});
