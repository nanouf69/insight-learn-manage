import page1 from "@/assets/pratique-vtc-lyon/page-01.jpg.asset.json";
import page2 from "@/assets/pratique-vtc-lyon/page-02.jpg.asset.json";
import page3 from "@/assets/pratique-vtc-lyon/page-03.jpg.asset.json";
import page4 from "@/assets/pratique-vtc-lyon/page-04.jpg.asset.json";
import page5 from "@/assets/pratique-vtc-lyon/page-05.jpg.asset.json";
import page6 from "@/assets/pratique-vtc-lyon/page-06.jpg.asset.json";
import page7 from "@/assets/pratique-vtc-lyon/page-07.jpg.asset.json";
import page8 from "@/assets/pratique-vtc-lyon/page-08.jpg.asset.json";
import page9 from "@/assets/pratique-vtc-lyon/page-09.jpg.asset.json";
import page10 from "@/assets/pratique-vtc-lyon/page-10.jpg.asset.json";
import page11 from "@/assets/pratique-vtc-lyon/page-11.jpg.asset.json";
import page12 from "@/assets/pratique-vtc-lyon/page-12.jpg.asset.json";
import page13 from "@/assets/pratique-vtc-lyon/page-13.jpg.asset.json";
import page14 from "@/assets/pratique-vtc-lyon/page-14.jpg.asset.json";
import page15 from "@/assets/pratique-vtc-lyon/page-15.jpg.asset.json";
import page16 from "@/assets/pratique-vtc-lyon/page-16.jpg.asset.json";
import page17 from "@/assets/pratique-vtc-lyon/page-17.jpg.asset.json";
import page18 from "@/assets/pratique-vtc-lyon/page-18.jpg.asset.json";
import page19 from "@/assets/pratique-vtc-lyon/page-19.jpg.asset.json";

// Display-only: never added to course pages or ACTIVITES_CODE.
export const PRATIQUE_VTC_LYON_SUPPORT = {
  id: "pratique-vtc-lyon-2026-10-28",
  titre: "Examen pratique VTC — Connaissance de Lyon",
  pages: [page1.url, page2.url, page3.url, page4.url, page5.url, page6.url, page7.url, page8.url, page9.url, page10.url, page11.url, page12.url, page13.url, page14.url, page15.url, page16.url, page17.url, page18.url, page19.url],
  consultationSeule: true,
} as const;

export function supportPratiqueVtcLyon(moduleId: number) {
  return moduleId === 8 ? PRATIQUE_VTC_LYON_SUPPORT : null;
}
