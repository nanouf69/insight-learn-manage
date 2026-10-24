/** Safe diagnostics: never serialize payloads, SQL details, responses or credentials. */
export function statutEchecPersistance(code?: string): number {
  return !code || /^(08|40|53|57|58|XX)/.test(code) || ['57014', '55P03', 'PGRST000', 'PGRST001', 'PGRST002', 'PGRST003'].includes(code) ? 503 : 400;
}
export function traceSauvegarde(requestId: string, stage: string, status: number, operation: unknown, code?: string) {
  const operationId = typeof operation === 'string' && /^[a-zA-Z0-9_-]{1,180}$/.test(operation) ? operation : null;
  console.info('[answer-save-result]', JSON.stringify({ request_id: requestId, operation_id: operationId, stage, status, code: code && /^[A-Za-z0-9_]{1,24}$/.test(code) ? code : null }));
}