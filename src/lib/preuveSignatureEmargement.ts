/** Live attendance display only. A default timestamp is never a signature proof. */
export function aImageSignatureEmargement(row: { signature_data_url?: unknown } | null | undefined): boolean {
  return typeof row?.signature_data_url === 'string' && /^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=\s]+$/i.test(row.signature_data_url);
}

export function aPreuveSignatureEmargement(row: { signature_data_url?: unknown; absent?: boolean; masque?: boolean } | null | undefined): boolean {
  return row?.masque !== true && row?.absent !== true && aImageSignatureEmargement(row);
}