/** Existing rows must use UPDATE: UPSERT checks required insert dates even on conflict. */
export async function enregistrerListesPlanning({ exists, fields, insert, update }: {
  exists: boolean; fields: Record<string, unknown>;
  insert: (fields: Record<string, unknown>) => PromiseLike<{ data: { extra_candidats: string[] | null } | null; error: { message: string } | null }>;
  update: (fields: Record<string, unknown>) => PromiseLike<{ data: { extra_candidats: string[] | null } | null; error: { message: string } | null }>;
}) {
  const result = await (exists ? update(fields) : insert(fields));
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error('Planning non retrouvé : ajout non confirmé, rechargez la période.');
  const expected = fields.extra_candidats as string[];
  if (JSON.stringify(result.data.extra_candidats ?? []) !== JSON.stringify(expected)) {
    throw new Error('Liste de candidats non confirmée après enregistrement.');
  }
}