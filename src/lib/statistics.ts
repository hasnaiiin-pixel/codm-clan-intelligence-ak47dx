export type RawPlayerScore = {
  kills?: number;
  deaths?: number;
  assists?: number;
  objectiveScore?: number;
  captures?: number | null;
  impact?: number | null;
  objectiveTimeSeconds?: number | null;
  win?: boolean;
  mvp?: boolean;
};

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function kdRatio(kills: number, deaths: number): number {
  if (deaths <= 0) return kills;
  return Number((kills / deaths).toFixed(2));
}

export function winRate(wins: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((wins / total) * 100).toFixed(1));
}

export function average(total: number, count: number): number {
  if (count <= 0) return 0;
  return Number((total / count).toFixed(2));
}

export function calculatePlayerRating(score: RawPlayerScore): number {
  const kills = safeNumber(score.kills);
  const deaths = safeNumber(score.deaths);
  const assists = safeNumber(score.assists);
  const captures = safeNumber(score.captures);
  const time = safeNumber(score.objectiveTimeSeconds);

  // 1.0: rating KDA-first. Score player e impatto non vengono più usati perché OCR li confondeva.
  const kd = kdRatio(kills, deaths);
  const kdPart = Math.min(kd, 3) * 22;
  const killPart = Math.min(kills, 20) * 1.1;
  const assistPart = Math.min(assists, 30) * 0.9;
  const survivalPart = deaths === 0 ? 8 : Math.max(0, 8 - deaths * 0.9);
  const capturesPart = Math.min(captures, 30) * 0.7;
  const timePart = Math.min(time / 10, 14);
  const winPart = score.win ? 8 : 0;
  const mvpPart = score.mvp ? 8 : 0;

  return Number(Math.min(kdPart + killPart + assistPart + survivalPart + capturesPart + timePart + winPart + mvpPart, 100).toFixed(1));
}

export function formatSeconds(seconds?: number | null): string {
  if (!seconds) return '-';
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function modeLabel(mode?: string | null): string {
  const labels: Record<string, string> = {
    CED: 'Cerca e Distruggi',
    TDM: 'Deathmatch',
    PRIMA_LINEA: 'Prima Linea',
    DOMINIO: 'Dominio',
    POSTAZIONE: 'Postazione',
    KILL_CONFIRMED: 'Kill Confirmed',
    BR_SOLO: 'BR Solo',
    BR_DUO: 'BR Duo',
    BR_SQUAD: 'BR Squad'
  };
  return mode ? labels[mode] || mode : '-';
}
