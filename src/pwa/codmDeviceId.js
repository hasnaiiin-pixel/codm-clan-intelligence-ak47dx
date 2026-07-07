const DEVICE_KEY = 'codm_pwa_device_id';
let cachedDeviceId = null;

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rnd = Math.random() * 16 | 0;
    const value = char === 'x' ? rnd : (rnd & 0x3 | 0x8);
    return value.toString(16);
  });
}

export function createCodmUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return fallbackUuid();
}

export function getCodmDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    if (typeof window !== 'undefined' && window[DEVICE_KEY]) {
      cachedDeviceId = window[DEVICE_KEY];
      return cachedDeviceId;
    }
    const created = createCodmUuid();
    cachedDeviceId = created;
    if (typeof window !== 'undefined') window[DEVICE_KEY] = created;
    return created;
  } catch (_) {
    cachedDeviceId = createCodmUuid();
    return cachedDeviceId;
  }
}
