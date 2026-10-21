import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  RATTRAPAGE_ABA_BAKRE_APPRENANT as A, RATTRAPAGE_ABA_BAKRE_PASSAGES, RATTRAPAGE_ABA_BAKRE_QRC,
  passageAutoriseAbaBakre, qrcAutoriseeAbaBakre,
} from "./qrcRattrapageAbaBakre.ts";

Deno.test("liste figée : exactement 64 QRC et 20 passages", () => {
  assertEquals(RATTRAPAGE_ABA_BAKRE_QRC.size, 64);
  assertEquals(RATTRAPAGE_ABA_BAKRE_PASSAGES.size, 20);
});
Deno.test("passage listé autorisé pour Aba-Bakre seulement", () => {
  assert(passageAutoriseAbaBakre("a85ff518-3e31-49d5-b676-4b5ef2f5a3bf", A));
  assert(!passageAutoriseAbaBakre("a85ff518-3e31-49d5-b676-4b5ef2f5a3bf", "c0844007-b999-4385-9665-918e5077c3b5"));
  assert(!passageAutoriseAbaBakre("00000000-0000-0000-0000-000000000000", A));
});
Deno.test("QRC hors liste ou sur un autre passage refusée", () => {
  assert(qrcAutoriseeAbaBakre("0687dea2-a35e-4372-ac01-c7d0213b31b8", "a85ff518-3e31-49d5-b676-4b5ef2f5a3bf"));
  assert(!qrcAutoriseeAbaBakre("0687dea2-a35e-4372-ac01-c7d0213b31b8", "ec1515cb-48e6-49e0-a768-88b319d83bf9"));
  assert(!qrcAutoriseeAbaBakre("11111111-1111-1111-1111-111111111111", "a85ff518-3e31-49d5-b676-4b5ef2f5a3bf"));
});
