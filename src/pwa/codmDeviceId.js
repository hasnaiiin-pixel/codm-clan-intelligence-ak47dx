const DEVICE_KEY = 'codm_pwa_device_id';

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
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = createCodmUuid();
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch (_) {
    return createCodmUuid();
  }
}
