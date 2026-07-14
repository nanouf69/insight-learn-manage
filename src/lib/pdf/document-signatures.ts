import { SIGNATURE_NAOUFAL_DATA_URL } from "@/lib/signatureNaoufal";

export const DOCUMENT_SIGNATURE_TYPES = new Set([
  "test-competences",
  "analyse-besoin",
  "projet-professionnel",
  "evaluation-acquis",
  "satisfaction",
]);

const SIGNATURE_IMAGE_KEYS = [
  "signature",
  "_signature_image",
  "signature_apprenant",
  "signatureDataUrl",
  "signature_data_url",
  "onboarding_signature",
];

const SIGNATURE_NAME_KEYS = [
  "_signed_by",
  "signed_by",
  "signatureNom",
  "signature_nom",
  "signatureName",
  "signature",
];

export function isImageSignature(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith("data:image/");
}

export function getStagiaireSignatureImage(donnees: any): string | undefined {
  if (!donnees || typeof donnees !== "object") return undefined;
  for (const key of SIGNATURE_IMAGE_KEYS) {
    const value = donnees[key];
    if (isImageSignature(value)) return value.trim();
  }
  return undefined;
}

export function getStagiaireSignatureName(donnees: any): string | undefined {
  if (!donnees || typeof donnees !== "object") return undefined;
  for (const key of SIGNATURE_NAME_KEYS) {
    const value = donnees[key] as unknown;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && !trimmed.startsWith("data:image/")) return trimmed;
    }
  }
  return undefined;
}

export function findSharedStagiaireSignature(documents: any[]): string | undefined {
  const prioritized = [
    ...documents.filter((doc) => DOCUMENT_SIGNATURE_TYPES.has(doc?.type_document)),
    ...documents.filter((doc) => !DOCUMENT_SIGNATURE_TYPES.has(doc?.type_document)),
  ];

  for (const doc of prioritized) {
    const signature = getStagiaireSignatureImage(doc?.donnees);
    if (signature) return signature;
  }
  return undefined;
}

export function findSharedStagiaireSignatureName(documents: any[]): string | undefined {
  const prioritized = [
    ...documents.filter((doc) => DOCUMENT_SIGNATURE_TYPES.has(doc?.type_document)),
    ...documents.filter((doc) => !DOCUMENT_SIGNATURE_TYPES.has(doc?.type_document)),
  ];

  for (const doc of prioritized) {
    const signatureName = getStagiaireSignatureName(doc?.donnees);
    if (signatureName) return signatureName;
  }
  return undefined;
}

export function ensureDocumentSignatures(
  donnees: any,
  sharedStagiaireSignature?: string,
  sharedStagiaireSignatureName?: string,
): any {
  const normalized = donnees && typeof donnees === "object" ? { ...donnees } : {};

  const ownSignature = getStagiaireSignatureImage(normalized);
  if (!ownSignature && sharedStagiaireSignature) {
    normalized.signature = sharedStagiaireSignature;
  }

  const ownSignatureName = getStagiaireSignatureName(normalized);
  if (!ownSignatureName && sharedStagiaireSignatureName) {
    normalized._signed_by = sharedStagiaireSignatureName;
  }

  if (!normalized.signatureResponsable) {
    normalized.signatureResponsable = SIGNATURE_NAOUFAL_DATA_URL;
  }

  return normalized;
}
