/** Preparation only: no imports from the legacy learner/editor or exam engines. */
export const BILAN_FUTURE_PAIRS = [[5, 500], [5, 501], [5, 502], [5, 503], [5, 504],
  [11, 600], [11, 601], [11, 602], [11, 603], [11, 604]] as const;

export type FutureChoice = { lettre: string; texte: string; correct?: boolean; explication?: string };
export type FutureQuestion = {
  id: number; uid?: string; enonce: string; choix: FutureChoice[];
  type?: string; image?: string | null; imageSize?: string; explication?: string;
};
export type BilanSource = { module_id: number; exercices: { id: number; questions: FutureQuestion[] }[] }[];
export type FutureSubject = {
  subject: number; questions: FutureQuestion[];
  provenance: { questionId: number; moduleId: number; exerciseId: number; sourceUid: string | null }[];
  suspended: { questionId: number; reason: string }[];
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const choices = (q: FutureQuestion) => q.choix.map(c => ({ lettre: c.lettre, texte: c.texte, correct: c.correct === true }));

/** Build a detached candidate, never write to either legacy source. Unresolved images/keys stay suspended. */
/**
 * Road-safety image decisions from the 29/10 visual audit (actual loaded files, not paths).
 * 'vtc'  = VTC storage file shows the sign the statement/key describe (Q55 overtaking ban >3.5 t,
 *          Q60 alternate parking 1-15/16-31, Q61 priority road).
 * 'none' = TAXI file is shifted (shows another question's text card, an explanation screenshot or an
 *          unrelated photo) and VTC has no image; the statement is self-sufficient without it.
 * Q79/Q80/Q92 stay suspended (key or image still to confirm).
 */
export const ROAD_IMAGE_DECISIONS: Record<number, 'vtc' | 'taxi' | 'none'> = {
  55: 'vtc', 60: 'vtc', 61: 'vtc', 79: 'vtc', // Q79: VTC file = tunnel + 50 sign; TAXI image77 shifted.
  ...Object.fromEntries([68,69,70,71,72,74,75,76,77,78,81,82,83,84,85,87,88,89,90,91,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107].map(id => [id, 'none' as const])),
};

export function prepareBilanFutureBank(source: BilanSource): FutureSubject[] {
  const exercise = (module: number, id: number) => {
    const found = source.find(m => m.module_id === module)?.exercices.find(e => e.id === id);
    if (!found) throw new Error(`Missing verified source ${module}/${id}`);
    if (new Set(found.questions.map(q => q.id)).size !== found.questions.length) throw new Error('Duplicate source identity');
    return found;
  };
  return Array.from({ length: 5 }, (_, subject) => {
    const vtc = exercise(5, 500 + subject), taxi = exercise(11, 600 + subject);
    const v = new Map(vtc.questions.map(q => [q.id, q])), t = new Map(taxi.questions.map(q => [q.id, q]));
    const questions: FutureQuestion[] = [], provenance: FutureSubject['provenance'] = [], suspended: FutureSubject['suspended'] = [];
    for (const id of [...new Set([...v.keys(), ...t.keys()])].sort((a, b) => a - b)) {
      const a = v.get(id), b = t.get(id), candidate = a ?? b;
      if (!candidate) throw new Error('Missing question');
      // These eight approved questions explicitly concern T3P, business or general road safety.
      const approvedExclusive = subject === 0 && [59, 112, 113, 114].includes(id)
        || subject === 1 && [198, 199].includes(id);
      let reason: string | undefined;
      if ((!a || !b) && !approvedExclusive) reason = 'Exclusive question requires evidence';
      if (subject === 2 && [80, 92, 177, 212, 213].includes(id)) reason = 'Road key or image requires independent verification';
      // Q63: image is the temporary "slippery road" sign (AK4), not specific to ice; "Oui" cannot be proven.
      if (subject === 2 && id === 63) reason = 'Q63 image shows temporary slippery road, not specifically ice';
      if (a && b && a.enonce !== b.enonce) reason = 'Statement conflict';
      if (a && b && !same(choices(a), choices(b)) && !(subject === 1 && id === 48)) reason = 'Choice or key conflict';
      const roadImage = subject === 2 ? ROAD_IMAGE_DECISIONS[id] : undefined;
      if (a && b && (a.image ?? null) !== (b.image ?? null) && !(subject === 2 && id === 73) && roadImage === undefined) reason = 'Image correspondence not proven';
      if (reason) { suspended.push({ questionId: id, reason }); continue; }
      const q: FutureQuestion = {
        id, enonce: candidate.enonce, choix: structuredClone(candidate.choix), type: 'QCM',
        image: candidate.image ?? null,
        ...(candidate.imageSize ? { imageSize: candidate.imageSize } : {}),
      };
      if (subject === 1 && id === 48) q.choix = q.choix.map(c => ({ ...c, texte: c.texte.replace(/ {2,}/g, ' ') }));
      // Q53 C is approved; do not invent or select an unproven explanatory exception.
      if (subject === 1 && id === 53) q.choix = q.choix.map(({ explication: _unused, ...c }) => c);
      else if (a?.explication === b?.explication && candidate.explication) q.explication = candidate.explication;
      if (subject === 2 && id === 73) q.image = null;
      if (roadImage !== undefined) q.image = roadImage === 'none' ? null : (roadImage === 'vtc' ? a!.image ?? null : b!.image ?? null);
      // Q62: loaded image is the locomotive sign (A8) = level crossing WITHOUT barriers; future key = B only.
      if (subject === 2 && id === 62) q.choix = q.choix.map(({ correct: _k, ...c }) => (c.lettre === 'B' ? { ...c, correct: true } : c));
      if (!q.choix.length || !q.choix.some(c => c.correct === true) || new Set(q.choix.map(c => c.lettre)).size !== q.choix.length)
        throw new Error(`Invalid verified QCM ${subject}/${id}`);
      questions.push(q);
      provenance.push({ questionId: id, moduleId: a ? 5 : 11, exerciseId: (a ? 500 : 600) + subject, sourceUid: candidate.uid ?? null });
    }
    return { subject, questions, provenance, suspended };
  });
}

export type FutureReceipt = { passageId: string; versionId: string; moduleId: number; exerciseId: number; ownerId: string };
/** No receipt means unchanged legacy reading, regardless of dates or absence of server answers. */
export function selectBilanFutureRoute(input: {
  ownerId: string; moduleId: number; exerciseId: number; receipt: FutureReceipt | null;
  receiptReadFailed: boolean;
}): 'legacy' | 'isolated' | 'blocked' {
  const inScope = BILAN_FUTURE_PAIRS.some(([m, e]) => m === input.moduleId && e === input.exerciseId);
  if (!inScope) return 'legacy';
  if (input.receiptReadFailed) return 'blocked';
  if (!input.receipt) return 'legacy';
  const r = input.receipt;
  if (!r.passageId || !r.versionId || r.ownerId !== input.ownerId || r.moduleId !== input.moduleId || r.exerciseId !== input.exerciseId) return 'blocked';
  return 'isolated';
}

/** Detached immutable content. No fallback to the current editor, no merging legacy answers. */
export function freezeBilanFutureCandidate(questions: FutureQuestion[]): readonly FutureQuestion[] {
  const copy = structuredClone(questions);
  for (const q of copy) {
    q.choix.forEach(c => Object.freeze(c));
    Object.freeze(q.choix); Object.freeze(q);
  }
  return Object.freeze(copy);
}