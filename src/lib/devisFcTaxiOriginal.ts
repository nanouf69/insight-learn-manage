/**
 * Devis FC TAXI au format Word ORIGINAL (public/devis/Devis_formation_continue_TAXI.docx,
 * jamais modifié). La cellule « Montant » de la ligne « Formation continue TAXI » est vide
 * dans le modèle : on y écrit, dans le fichier généré seulement, le prix de l'offre choisie
 * dans le CRM, avec le même style que la quantité. Rien d'autre n'est changé.
 */
export function formatMontantDevis(montant: number): string {
  return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function injecterMontantDevisOriginal(xml: string, montant: number): string {
  if (!(montant > 0)) return xml;
  const i = xml.indexOf('Formation continue TAXI');
  if (i < 0) return xml;
  const debut = Math.max(xml.lastIndexOf('<w:tr ', i), xml.lastIndexOf('<w:tr>', i));
  const fin = xml.indexOf('</w:tr>', i);
  if (debut < 0 || fin < 0) return xml;
  const ligne = xml.slice(debut, fin);
  const vide = '<w:r><w:t></w:t></w:r>';
  const pos = ligne.lastIndexOf(vide);
  // Seule la dernière cellule (montant) est remplie, et seulement si elle est encore vide.
  if (pos < 0 || pos < ligne.lastIndexOf('<w:tc>')) return xml;
  const texte = (montant: number) => formatMontantDevis(montant).replace(/&/g, '&amp;');
  const run = `<w:r><w:rPr><w:rStyle w:val="document-layout-shortcodesshortcode"/></w:rPr><w:t xml:space="preserve">${texte(montant)}</w:t></w:r>`;
  const nouvelleLigne = ligne.slice(0, pos) + run + ligne.slice(pos + vide.length);
  return xml.slice(0, debut) + nouvelleLigne + xml.slice(fin);
}
