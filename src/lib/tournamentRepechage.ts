/**
 * Ripescaggio AK47DX: distribuisce TUTTE le non qualificate nei percorsi
 * scelti dall'organizzatore, senza eliminare o duplicare nessuno.
 * Un percorso assegna un solo posto al tabellone principale.
 */
export function makeRepechageBuckets<T>(eliminated: T[], requestedSlots: number): T[][] {
  const available = eliminated.length;
  if (available < 2) return [];
  const slots = Math.max(1, Math.min(Math.floor(available / 2), Math.floor(requestedSlots || 1)));
  const buckets: T[][] = Array.from({ length: slots }, () => []);
  eliminated.forEach((participant, i) => buckets[i % slots].push(participant));
  return buckets;
}

/** Girone all'italiana: ogni coppia si incontra una volta, senza duplicati. */
export function roundRobinPairs<T>(group: T[]): Array<[T,T]> {
  const games: Array<[T,T]> = [];
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) games.push([group[i], group[j]]);
  }
  return games;
}
