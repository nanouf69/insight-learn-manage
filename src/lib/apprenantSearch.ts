export type ApprenantSearchLike = {
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  civilite?: string | null;
  statut?: string | null;
  mode_financement?: string | null;
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  numero_dossier_cma?: string | null;
};

export const normalizeApprenantSearchText = (value: string | null | undefined) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (value: string | null | undefined) =>
  normalizeApprenantSearchText(value).replace(/[^a-z0-9]/g, "");

const levenshteinLimited = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }

  return previous[b.length];
};

const buildSearchValues = (apprenant: ApprenantSearchLike) => {
  const firstName = normalizeApprenantSearchText(apprenant.prenom);
  const lastName = normalizeApprenantSearchText(apprenant.nom);
  const fullName = normalizeApprenantSearchText(`${apprenant.prenom ?? ""} ${apprenant.nom ?? ""}`);
  const reverseName = normalizeApprenantSearchText(`${apprenant.nom ?? ""} ${apprenant.prenom ?? ""}`);
  const searchable = normalizeApprenantSearchText(
    [
      apprenant.civilite,
      apprenant.prenom,
      apprenant.nom,
      apprenant.email,
      apprenant.telephone,
      apprenant.adresse,
      apprenant.code_postal,
      apprenant.ville,
      apprenant.numero_dossier_cma,
      apprenant.type_apprenant,
      apprenant.formation_choisie,
      apprenant.mode_financement,
      apprenant.statut,
    ].join(" "),
  );

  const digitsSearchable = [
    apprenant.telephone,
    apprenant.code_postal,
    apprenant.numero_dossier_cma,
  ]
    .map((v) => String(v ?? "").replace(/\D/g, ""))
    .filter(Boolean)
    .join(" ");

  const localisation = normalizeApprenantSearchText(
    [apprenant.ville, apprenant.code_postal, apprenant.adresse].join(" "),
  );

  return {
    firstName,
    lastName,
    fullName,
    reverseName,
    searchable,
    digitsSearchable,
    localisation,
    words: searchable.split(" ").filter(Boolean),
    compactSearchable: compact(searchable),
  };
};

export const scoreApprenantSearch = (apprenant: ApprenantSearchLike, query: string) => {
  const normalizedQuery = normalizeApprenantSearchText(query);
  if (!normalizedQuery) return 0;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const queryCompact = compact(normalizedQuery);
  const values = buildSearchValues(apprenant);

  const tokenMatches = tokens.every((token) => {
    if (values.searchable.includes(token)) return true;
    if (token.length >= 3 && values.words.some((word) => word.startsWith(token) || word.includes(token))) return true;
    if (token.length >= 4) {
      const maxDistance = token.length >= 7 ? 2 : 1;
      return values.words.some((word) => levenshteinLimited(word, token, maxDistance) <= maxDistance);
    }
    return false;
  });

  const compactMatch = queryCompact.length >= 3 && values.compactSearchable.includes(queryCompact);

  // Recherche par téléphone / code postal (chiffres uniquement)
  const queryDigits = query.replace(/\D/g, "");
  const digitsMatch =
    queryDigits.length >= 2 &&
    values.digitsSearchable
      .split(" ")
      .some((d) => d.includes(queryDigits));

  // Recherche par ville / code postal / adresse
  const localisationMatch =
    normalizedQuery.length >= 2 && values.localisation.includes(normalizedQuery);

  if (!tokenMatches && !compactMatch && !digitsMatch && !localisationMatch) return null;

  if (values.fullName === normalizedQuery || values.reverseName === normalizedQuery) return 0;
  if (values.fullName.startsWith(normalizedQuery) || values.reverseName.startsWith(normalizedQuery)) return 1;
  if (tokens.every((token) => values.fullName.includes(token) || values.reverseName.includes(token))) return 2;
  if (values.lastName.startsWith(normalizedQuery) || values.firstName.startsWith(normalizedQuery)) return 3;
  if (digitsMatch) return 3;
  if (compactMatch) return 4;
  if (localisationMatch) return 4;
  return 5;
};

export const filterAndSortApprenants = <T extends ApprenantSearchLike>(rows: T[], query: string) => {
  const normalizedQuery = normalizeApprenantSearchText(query);
  if (!normalizedQuery) return rows;

  return rows
    .map((apprenant, index) => ({ apprenant, index, score: scoreApprenantSearch(apprenant, normalizedQuery) }))
    .filter((item): item is { apprenant: T; index: number; score: number } => item.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((item) => item.apprenant);
};