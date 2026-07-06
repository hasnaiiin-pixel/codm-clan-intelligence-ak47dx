export const CODM_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CODM_LOCAL_ID_RE = /^local[-_]/i;

export function isValidCodmUuid(value) {
  return typeof value === 'string' && CODM_UUID_RE.test(value);
}

export function isLocalCodmId(value) {
  return typeof value === 'string' && CODM_LOCAL_ID_RE.test(value);
}

export function createCodmLocalId(prefix = 'local') {
  const partA = Date.now().toString(36);
  const partB = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${partA}-${partB}`;
}

export function removeInvalidUuidFieldsForSupabase(input, uuidFields = []) {
  const output = { ...input };
  const localUuidRefs = {};

  for (const field of uuidFields) {
    const value = output[field];
    if (value === undefined || value === null || value === '') continue;
    if (isValidCodmUuid(value)) continue;

    localUuidRefs[field] = value;
    delete output[field];
  }

  if (isLocalCodmId(input.id)) {
    output.local_id = output.local_id || input.id;
    localUuidRefs.id = input.id;
    delete output.id;
  }

  return {
    safe: output,
    localUuidRefs
  };
}
