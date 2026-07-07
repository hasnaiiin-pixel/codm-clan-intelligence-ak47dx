const memoryStore = new Map<string, unknown>();

export function getEphemeralValue<T>(key: string, fallback?: T): T | undefined {
  if (!memoryStore.has(key)) return fallback;
  return memoryStore.get(key) as T;
}

export function setEphemeralValue<T>(key: string, value: T) {
  memoryStore.set(key, value);
  return value;
}

export function deleteEphemeralValue(key: string) {
  memoryStore.delete(key);
}

export function clearEphemeralValue(prefix?: string) {
  if (!prefix) {
    memoryStore.clear();
    return;
  }
  for (const key of Array.from(memoryStore.keys())) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
}
