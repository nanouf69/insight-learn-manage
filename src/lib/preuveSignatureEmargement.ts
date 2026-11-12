/** Live attendance display only. A default timestamp is never a signature proof. */
/** Images vierges (canvas sans aucun trait) relevées en base le 12/11/2026 : longueur + fin exactes. */
const SIGNATURES_VIDES_CONNUES: ReadonlyArray<readonly [number, string]> = [
  [4642, '/6n6jacAAAAGSURBVAMAsfYBgSFBzwQAAAAASUVORK5CYII='],
  [3782, '2CZqFIIAAQIECBAgQOABapcAwbzSp88AAAAASUVORK5CYII='],
  [6774, '/wqDd10AAAAGSURBVAMAkhoB37/tmuMAAAAASUVORK5CYII='],
  [2842, '/zCE8zgAAAAGSURBVAMAvTUBIS6o+00AAAAASUVORK5CYII='],
];
export function estSignatureVideConnue(url: unknown): boolean {
  return typeof url === 'string' && SIGNATURES_VIDES_CONNUES.some(([l, fin]) => url.length === l && url.endsWith(fin));
}

export function aImageSignatureEmargement(row: { signature_data_url?: unknown } | null | undefined): boolean {
  return typeof row?.signature_data_url === 'string' && !estSignatureVideConnue(row.signature_data_url) && /^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=\s]+$/i.test(row.signature_data_url);
}

export function aPreuveSignatureEmargement(row: { signature_data_url?: unknown; absent?: boolean; masque?: boolean } | null | undefined): boolean {
  return row?.masque !== true && row?.absent !== true && aImageSignatureEmargement(row);
}