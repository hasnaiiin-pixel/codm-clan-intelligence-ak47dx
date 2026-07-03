import type { GameMode, MatchResult, ProfileImportType, TeamSide } from './types';

export type ParsedProfileStats = {
  importType: ProfileImportType;
  nickname?: string;
  uid?: string;
  level?: number | null;
  rankMp?: string;
  rankBr?: string;
  rankCurrent?: string;
  rankBest?: string;
  mvp?: number | null;
  matches?: number | null;
  wins?: number | null;
  top3?: number | null;
  kills?: number | null;
  kd?: number | null;
  accuracy?: number | null;
  avgDamage?: number | null;
  zombieUltimateDefeated?: number | null;
  teammatesSaved?: number | null;
  wavesClearedSolo?: number | null;
  extractionRate?: number | null;
  profitLossRatio?: number | null;
  totalWealth?: number | null;
  contractsCompleted?: number | null;
  rawText: string;
};

export type ParsedScoreRow = {
  rankPosition?: number | null;
  nickname: string;
  playerId?: string | null;
  ocrNickname?: string | null;
  needsReview?: boolean;
  readStatus?: 'ok' | 'partial' | 'manual';
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  impact?: number | null;
  objectiveTimeText?: string | null;
  objectiveTimeSeconds?: number | null;
  captures?: number | null;
  teamSide?: TeamSide;
  mvp?: boolean;
  mvpLabel?: 'MVP_WIN' | 'MVP_LOSE' | null;
  rawLine?: string;
};

export type ParsedScoreboard = {
  result?: MatchResult;
  teamScore?: number | null;
  enemyScore?: number | null;
  mode?: GameMode;
  mapName?: string;
  rows: ParsedScoreRow[];
  accuracy?: number | null;
  headshotPercent?: number | null;
  kdRatio?: number | null;
  rawText: string;
};

export type ParsedLoadout = {
  name?: string;
  mode?: string;
  slotIndex?: number | null;
  primaryWeapon?: string;
  secondaryWeapon?: string;
  characterName?: string;
  lethal?: string;
  tactical?: string;
  operatorSkill?: string;
  perks: string[];
  scorestreaks: string[];
  weaponBuild?: {
    weaponName?: string;
    blueprintName?: string;
    muzzle?: string;
    barrel?: string;
    optic?: string;
    stock?: string;
    perk?: string;
    laser?: string;
    underbarrel?: string;
    ammunition?: string;
    rearGrip?: string;
    damage?: number | null;
    fireRate?: number | null;
    accuracy?: number | null;
    mobility?: number | null;
    range?: number | null;
    control?: number | null;
  };
  rawText: string;
};

const MODE_ALIASES: Array<[RegExp, GameMode]> = [
  [/(CERCA\s*E\s*DISTRUGGI|SEARCH\s*&?\s*DESTROY|S\s*&\s*D|CED)/i, 'CED'],
  [/(POSTAZIONE|HARDPOINT|HARD\s*POINT)/i, 'POSTAZIONE'],
  [/(DOMINIO|DOMINATION)/i, 'DOMINIO'],
  [/(PRIMA\s*LINEA|FRONTLINE)/i, 'PRIMA_LINEA'],
  [/(DEATHMATCH|TDM|TEAM\s*DEATHMATCH)/i, 'TDM'],
  [/(UCCISIONE\s*CONFERMATA|KILL\s*CONFIRMED)/i, 'KILL_CONFIRMED'],
  [/(BATTLE\s*ROYALE|BR\s*SOLO)/i, 'BR_SOLO']
];

const MAP_WORDS = [
  'TUNISIA', 'STANDOFF', 'FIRING RANGE', 'SUMMIT', 'COASTAL', 'RAID', 'CRASH', 'NUKETOWN',
  'CROSSFIRE', 'SHOOT HOUSE', 'TAKEOFF', 'HACIENDA', 'SLUMS', 'MELTDOWN', 'TERMINAL',
  'ARSENAL', 'EXPRESS', 'DOME', 'DIESEL', 'KRAI', 'HIJACKED'
];

export function normalizeOcrText(rawText: string): string {
  return rawText
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[|]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLine(line: string): string {
  return line
    .replace(/===\s*OCR_VARIANT[^=]+===/ig, ' ')
    .replace(/CONF\s*\d+/ig, ' ')
    .replace(/[_•·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberFrom(text: string | undefined | null): number | null {
  if (!text) return null;
  const cleaned = text
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/S(?=\d)/g, '5')
    .replace(/B(?=\d)/g, '8')
    .replace(/G(?=\d)/g, '6')
    .replace(/Z(?=\d)/g, '2')
    .replace(/l(?=\d)/g, '1')
    .replace(/I(?=\d)/g, '1')
    .replace(/\s/g, '')
    .replace(/[.,](?=\d{3}\b)/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function intAfter(label: string, text: string): number | null {
  const re = new RegExp(`${label}\s*[:\-]?\s*([0-9][0-9.,]*)`, 'i');
  return numberFrom(text.match(re)?.[1]);
}

function pctAfter(label: string, text: string): number | null {
  const re = new RegExp(`${label}\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*%?`, 'i');
  return numberFrom(text.match(re)?.[1]);
}

function findMode(text: string): GameMode | undefined {
  for (const [pattern, mode] of MODE_ALIASES) {
    if (pattern.test(text)) return mode;
  }
  return undefined;
}

function detectMap(text: string): string | undefined {
  const upper = text.toUpperCase();
  const found = MAP_WORDS.find((m) => upper.includes(m));
  if (found) return found.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
  const modeMatch = upper.match(/(?:CERCA\s*E\s*DISTRUGGI|POSTAZIONE|DOMINIO|HARDPOINT|SEARCH\s*&?\s*DESTROY|FRONTLINE|PRIMA\s*LINEA)\s+([A-Z][A-Z0-9 ]{2,24})/);
  return modeMatch?.[1]?.trim();
}

function parseVariantBlocks(rawText: string) {
  const blocks = rawText.split(/===\s*OCR_VARIANT\s+/i).slice(1);
  return blocks.map((block) => {
    const firstLine = block.split(/\r?\n/)[0] || '';
    const name = firstLine.replace(/\s*CONF\s*\d+.*/i, '').trim();
    const confidence = numberFrom(firstLine.match(/CONF\s*(\d+)/i)?.[1]) ?? undefined;
    const baseName = name.replace(/__(binary|gray|sharp|digits)$/i, '');
    const text = block.replace(/^.*?\n/, '').trim();
    return { name, baseName, text, confidence };
  });
}

function blockTexts(rawText: string, baseName: string): string[] {
  return parseVariantBlocks(rawText)
    .filter((block) => block.baseName.toLowerCase() === baseName.toLowerCase())
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .map((block) => block.text)
    .filter(Boolean);
}

function allTexts(rawText: string, baseNames: string[]): string {
  return baseNames.flatMap((name) => blockTexts(rawText, name)).join('\n');
}

function blockText(rawText: string, names: string[]): string {
  const selected: string[] = [];
  for (const block of parseVariantBlocks(rawText)) {
    if (names.some((name) => block.baseName.toLowerCase().includes(name.toLowerCase()))) {
      selected.push(block.text);
    }
  }
  return selected.join('\n') || rawText;
}

function detectProfileType(rawText: string, forced: ProfileImportType): ProfileImportType {
  if (forced !== 'profile_base') return forced;
  const text = normalizeOcrText(rawText).toLowerCase();
  if (text.includes('dmz')) return 'dmz';
  if (text.includes('zombi')) return 'zombie';
  if (text.includes('battle royale')) return 'battle_royale';
  if (text.includes('multigiocatore') || text.includes('u/m')) return 'multiplayer';
  return 'profile_base';
}

function detectNickname(rawText: string): string | undefined {
  const lines = rawText.split(/\r?\n/).map((line) => cleanLine(line)).filter(Boolean);
  const usable = lines.filter((line) =>
    !/PROFILO|SCHEDA|ONLINE|LIVELLO|LEVEL|UID|LIKE|BASE|OBIETTIVI|COLLEZIONE|CRONOLOGIA|SBLOCCO|OCR_VARIANT|CONF|ACCEDI|RIFUGIO/i.test(line)
    && /[A-Za-z0-9ѦҞঐ]/.test(line)
    && line.length >= 2
    && line.length <= 36
  );
  const withClan = usable.find((line) => /([ѦҞঐ]|AK|AP)/i.test(line) && /[A-Za-z]/.test(line));
  return withClan || usable[0];
}

export function parseCodmProfileText(rawText: string, importType: ProfileImportType = 'profile_base'): ParsedProfileStats {
  const preferred = blockText(rawText, ['PROFILE_BASE_CARD', 'PROFILE_BASE_NICKNAME', 'PROFILE_BASE_LEVEL', 'PROFILE_BASE_UID', 'PROFILE_BASE_LIKES', 'PROFILE_BASE_RANKS', 'PROFILE_STATS_PANEL', 'PROFILE_STATS_NUMBERS']);
  const text = normalizeOcrText(`${preferred}\n${rawText}`);
  const lower = text.toLowerCase();
  const type = detectProfileType(text, importType);

  const uidBlock = allTexts(rawText, ['PROFILE_BASE_UID']);
  const levelBlock = allTexts(rawText, ['PROFILE_BASE_LEVEL']);
  const nickBlock = allTexts(rawText, ['PROFILE_BASE_NICKNAME']);
  const likesBlock = allTexts(rawText, ['PROFILE_BASE_LIKES']);

  const uid = uidBlock.replace(/\D/g, '').match(/([0-9]{8,22})/)?.[1] || text.match(/(?:UID|ID)[:\s#-]*([0-9]{5,22})/i)?.[1];
  const level = numberFrom(levelBlock) ?? intAfter('(?:LV\.?|LEVEL|LIVELLO)', text);
  const nickname = detectNickname(nickBlock) || detectNickname(preferred) || detectNickname(rawText);

  const data: ParsedProfileStats = {
    importType: type,
    nickname,
    uid,
    level,
    rawText,
    matches: null,
    wins: null,
    top3: null,
    kills: null,
    kd: null,
    accuracy: null,
    mvp: numberFrom(likesBlock)
  };

  const rankWords = ['Leggendario', 'Legendary', 'Grand Master', 'Gran Maestro', 'Master', 'Maestro', 'Pro', 'Elite', 'Veterano', 'Veteran'];
  const ranks = rankWords.filter((rank) => lower.includes(rank.toLowerCase()));
  data.rankCurrent = ranks[0];
  data.rankBest = ranks[1];
  data.rankMp = ranks[0];
  data.rankBr = ranks[1];

  if (type === 'battle_royale') {
    data.mvp = intAfter('MVP', text);
    data.wins = intAfter('VITTORIE|WINS', text);
    data.matches = intAfter('PARTITE|MATCHES', text);
    data.kills = intAfter('UCCISIONI|KILLS', text);
    data.avgDamage = intAfter('DANNI\s*MEDI|AVG\.?\s*DAMAGE', text);
    data.accuracy = pctAfter('PRECISIONE\s*MEDIA|ACCURACY', text);
    return data;
  }

  if (type === 'zombie') {
    data.mvp = intAfter('MVP', text);
    data.matches = intAfter('PARTITE|MATCHES', text);
    data.zombieUltimateDefeated = intAfter('ZOMBI\s*ULTIMATE\s*SCONFITTI|ULTIMATE\s*ZOMBIES', text);
    data.teammatesSaved = intAfter('COMPAGNI\s*DI\s*SQUADRA\s*SALVATI|TEAMMATES\s*SAVED', text);
    data.wavesClearedSolo = intAfter('ONDATE\s*SUPERATE\s*SINGOLO|WAVES', text);
    return data;
  }

  if (type === 'dmz') {
    data.matches = intAfter('PARTITE\s*GIOCATE|MATCHES', text);
    data.extractionRate = pctAfter('TASSO\s*ESTRAZIONI|EXTRACTION\s*RATE', text);
    data.profitLossRatio = numberFrom(text.match(/(?:RAPPORTO\s*PROFITTI\s*\/\s*PERDITE|PROFIT.*LOSS)\s*([0-9.,]+)/i)?.[1]);
    data.totalWealth = intAfter('PATRIMONIO\s*TOTALE|TOTAL\s*WEALTH', text);
    data.kills = intAfter('UCCISIONI|KILLS', text);
    data.contractsCompleted = intAfter('CONTRATTI\s*COMPLETATI|CONTRACTS\s*COMPLETED', text);
    return data;
  }

  data.mvp = intAfter('MVP', text) ?? data.mvp;
  data.matches = intAfter('PARTITE|MATCHES', text);
  data.top3 = intAfter('TOP\s*3', text);
  data.kills = intAfter('UCCISIONI|KILLS', text);
  data.kd = numberFrom(text.match(/(?:U\/M|K\/D|KD|RAPPORTO\s*U\/M)[:\s-]*([0-9]+(?:[.,][0-9]+)?)/i)?.[1]);
  data.accuracy = pctAfter('PRECISIONE\s*MEDIA|ACCURACY|PRECISIONE', text);
  return data;
}

export function secondsFromTime(text?: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseKda(kda: string): { kills: number; deaths: number; assists: number } {
  const normalized = kda
    .replace(/[lI|\\]/g, '/')
    .replace(/O/g, '0')
    .replace(/S(?=\d)/g, '5')
    .replace(/B(?=\d)/g, '8')
    .replace(/G(?=\d)/g, '6')
    .replace(/Z(?=\d)/g, '2')
    .replace(/\s+/g, '')
    .replace(/[^0-9/]/g, '');
  const parts = normalized.split('/').map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return { kills: parts[0] || 0, deaths: parts[1] || 0, assists: parts[2] || 0 };
}

function parseNumberCell(rawText: string, baseName: string): number | null {
  const candidates = blockTexts(rawText, baseName);
  const values: number[] = [];
  for (const text of candidates) {
    const normalized = text
      .replace(/O/g, '0')
      .replace(/Q/g, '0')
      .replace(/S(?=\d)/g, '5')
      .replace(/B(?=\d)/g, '8')
      .replace(/G(?=\d)/g, '6')
      .replace(/Z(?=\d)/g, '2')
      .replace(/[lI|]/g, '1')
      .replace(/,/g, '.')
      .replace(/[^0-9.\s:-]/g, ' ');
    for (const match of normalized.matchAll(/\b([0-9]{1,6}(?:[.][0-9]+)?)\b/g)) {
      const value = numberFrom(match[1]);
      if (value !== null) values.push(value);
    }
  }

  if (!values.length) return null;
  const isImpact = /IMPACT/i.test(baseName);
  const isScore = /SCORE/i.test(baseName);
  const isObjective = /OBJECTIVE/i.test(baseName);

  let filtered = values.filter((v) => Number.isFinite(v));
  if (isImpact) filtered = filtered.filter((v) => v >= 40 && v <= 260);
  if (isScore) {
    filtered = filtered.filter((v) => v >= 0 && v <= 9999);
    if (filtered.length > 1) filtered = filtered.filter((v) => v !== 400);
  }
  if (isObjective) filtered = filtered.filter((v) => v >= 0 && v <= 300);
  if (!filtered.length) return null;

  return isScore ? Math.max(...filtered) : filtered[0];
}

function parseKdaCell(rawText: string, baseName: string): { kills: number; deaths: number; assists: number } | null {
  const candidates = blockTexts(rawText, baseName);
  for (const text of candidates) {
    const compact = text
      .replace(/O/g, '0')
      .replace(/[lI|\\]/g, '/')
      .replace(/S(?=\d)/g, '5')
      .replace(/B(?=\d)/g, '8')
      .replace(/G(?=\d)/g, '6')
      .replace(/Z(?=\d)/g, '2')
      .replace(/\s+/g, '');
    const direct = compact.match(/([0-9]{1,3}\/[0-9]{1,3}\/[0-9]{1,3})/);
    if (direct) {
      const kda = parseKda(direct[1]);
      if (kda.kills <= 150 && kda.deaths <= 150 && kda.assists <= 150) return kda;
    }

    const groups = Array.from(compact.matchAll(/\b([0-9]{1,3})\b/g)).map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
    if (groups.length >= 3) {
      const [kills, deaths, assists] = groups;
      if (kills <= 150 && deaths <= 150 && assists <= 150) return { kills, deaths, assists };
    }
  }
  return null;
}

function chooseBestDigitCandidate(rawText: string, baseNames: string[], min = 0, max = 999): number | null {
  const values: number[] = [];
  for (const baseName of baseNames) {
    for (const text of blockTexts(rawText, baseName)) {
      const normalized = text
        .replace(/O/g, '0')
        .replace(/Q/g, '0')
        .replace(/S(?=\d)/g, '5')
        .replace(/B(?=\d)/g, '8')
        .replace(/G(?=\d)/g, '6')
        .replace(/Z(?=\d)/g, '2');
      for (const match of normalized.matchAll(/\b([0-9]{1,3})\b/g)) {
        const value = numberFrom(match[1]);
        if (value !== null && value >= min && value <= max) values.push(value);
      }
    }
  }
  if (!values.length) return null;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]))[0]?.[0] ?? null;
}

function parseTimeOrNumberCell(rawText: string, baseName: string): { timeText?: string | null; seconds?: number | null; value?: number | null } {
  const candidates = blockTexts(rawText, baseName);
  for (const text of candidates) {
    const time = text.match(/([0-9]{1,2}\s*[:.]\s*[0-9]{2})/)?.[1]?.replace(/\s+/g, '').replace('.', ':');
    if (time) return { timeText: time, seconds: secondsFromTime(time), value: null };
    const value = numberFrom(text.match(/\b([0-9]{1,3})\b/)?.[1]);
    if (value !== null) return { value };
  }
  return {};
}

function scoreFromResultHeader(rawText: string): { result?: MatchResult; teamScore?: number | null; enemyScore?: number | null } {
  const resultText = allTexts(rawText, ['SCOREBOARD_RESULT_LABEL', 'SCOREBOARD_RESULT_FULL']);
  const blueScore = chooseBestDigitCandidate(rawText, ['SCOREBOARD_SCORE_BLUE'], 0, 200);
  const redScore = chooseBestDigitCandidate(rawText, ['SCOREBOARD_SCORE_RED'], 0, 200);
  const combined = normalizeOcrText(`${resultText}\n${rawText}`);
  const result: MatchResult | undefined = /(VITTORIA|VICTORY|WIN)/i.test(combined)
    ? 'WIN'
    : /(SCONFITTA|DEFEAT|LOSE|LOST)/i.test(combined)
      ? 'LOSE'
      : undefined;

  if (blueScore !== null && redScore !== null) return { result, teamScore: blueScore, enemyScore: redScore };

  const fallbackText = allTexts(rawText, ['SCOREBOARD_RESULT_FULL', 'SCOREBOARD_RESULT_LABEL']);
  const withColon = fallbackText.replace(/O/g, '0').match(/([0-9]{1,3})\s*[:|]\s*([0-9]{1,3})/);
  if (withColon) return { result, teamScore: numberFrom(withColon[1]), enemyScore: numberFrom(withColon[2]) };

  return { result, teamScore: null, enemyScore: null };
}

function modeMapFromHeader(rawText: string) {
  const header = allTexts(rawText, ['SCOREBOARD_MODE_MAP', 'SCOREBOARD_RESULT_FULL']);
  const text = normalizeOcrText(`${header}\n${rawText}`);
  return { mode: findMode(text), mapName: detectMap(text) };
}

function cleanNicknamePart(value: string): string {
  return value
    .replace(/===\s*OCR_VARIANT[^=]+===/ig, ' ')
    .replace(/CONF\s*\d+/ig, ' ')
    .replace(/ALLY|ENEMY|BLUE|RED|ROW|SCOREBOARD|TEAM/ig, ' ')
    .replace(/MVP|PUNTEGGIO|SCORE|U\/M\/A|K\/D\/A|IMPATTO|IMPACT|TEMPO|TIME|CATTURATA|CAPTURED/ig, ' ')
    .replace(/\b(?:400|369|171|56|S6|SS|III|II|IV|I)\b/g, ' ')
    .replace(/^\s*[0-9]{1,2}\s+/, '')
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/[^\p{L}\p{N}ѦҞঐ♡☆★@#_+\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNicknameCell(rawText: string, baseName: string, fallback: string): string {
  const candidates = blockTexts(rawText, baseName);
  let best = '';
  for (const text of candidates) {
    const lines = text.split(/\r?\n/).map((line) => cleanNicknamePart(line)).filter(Boolean);
    for (const line of lines) {
      if (!/[A-Za-zѦҞঐ]/.test(line)) continue;
      if (line.length < 2 || line.length > 28) continue;
      if (/^(Blu|Rosso|Blue|Red|Player|Enemy)\b/i.test(line)) continue;
      if ((/[ѦҞঐ]|AK|AP/i.test(line) && line.length >= 4) || line.length > best.length) best = line;
    }
  }
  return best || fallback;
}

function parseScoreRowLine(lineRaw: string, mode?: GameMode, forcedSide?: TeamSide, forcedRank?: number): ParsedScoreRow | null {
  const line = cleanLine(lineRaw)
    .replace(/([0-9])\s*[lI|]\s*([0-9])/g, '$1/$2')
    .replace(/([0-9])\s*\\\s*([0-9])/g, '$1/$2');

  const kdaMatch = line.match(/([0-9]{1,3}\s*[\/]\s*[0-9]{1,3}\s*[\/]\s*[0-9]{1,3})/);
  if (!kdaMatch) return null;
  if (/PUNTEGGIO|SCORE|GIOCATORE|PLAYER|IMPATTO|IMPACT|TEMPO|TIME|CATTURATA/i.test(line) && !/AK|AP|MVP/i.test(line)) return null;

  const beforeKda = line.slice(0, kdaMatch.index).trim();
  const afterKda = line.slice((kdaMatch.index || 0) + kdaMatch[0].length).trim();
  const kda = parseKda(kdaMatch[1]);

  const scoreCandidates = Array.from(beforeKda.matchAll(/\b([0-9]{3,5})\b/g)).map((m) => ({ value: Number(m[1]), index: m.index || 0 }));
  const score = scoreCandidates.length ? scoreCandidates[scoreCandidates.length - 1].value : 0;

  let nicknamePart = beforeKda;
  if (scoreCandidates.length) nicknamePart = beforeKda.slice(0, scoreCandidates[scoreCandidates.length - 1].index).trim();
  nicknamePart = cleanNicknamePart(nicknamePart);

  const rankPosition = forcedRank ?? numberFrom(line.match(/^\s*([0-9]{1,2})\b/)?.[1]);
  const mvp = /MVP/i.test(line);

  const timeMatch = afterKda.match(/\b([0-9]{1,2}:[0-9]{2})\b/);
  const afterNumbers = Array.from(afterKda.matchAll(/\b([0-9]{1,3})\b/g)).map((m) => Number(m[1]));
  let captures: number | null = null;
  let impact: number | null = null;

  if (timeMatch) {
    impact = afterNumbers.filter((n) => n > 40).slice(-1)[0] ?? null;
  } else if (mode === 'DOMINIO') {
    captures = afterNumbers[0] ?? null;
    impact = afterNumbers[1] ?? null;
  } else {
    impact = afterNumbers.slice(-1)[0] ?? null;
  }

  const teamSide: TeamSide = forcedSide || (/AP|Red|Prince|KARMA|Crix|Eleanor|ENEMY/i.test(line) ? 'ENEMY' : 'ALLY');
  if (!nicknamePart || nicknamePart.length < 2) nicknamePart = `${teamSide === 'ENEMY' ? 'Enemy' : 'Player'} ${rankPosition || ''}`.trim();

  return {
    rankPosition,
    nickname: nicknamePart,
    score,
    kills: kda.kills,
    deaths: kda.deaths,
    assists: kda.assists,
    impact,
    captures,
    objectiveTimeText: timeMatch?.[1] || null,
    objectiveTimeSeconds: secondsFromTime(timeMatch?.[1]),
    teamSide,
    mvp,
    rawLine: lineRaw
  };
}

function isGeneratedFallbackName(name: string): boolean {
  return /^(Blue|Red|Blu|Rosso|Player|Enemy)\s*\d*$/i.test(name.trim());
}

function cellBasedRows(rawText: string, mode?: GameMode): ParsedScoreRow[] {
  const rows: ParsedScoreRow[] = [];
  for (const sideLabel of ['BLUE', 'RED'] as const) {
    const teamSide: TeamSide = sideLabel === 'BLUE' ? 'ALLY' : 'ENEMY';
    for (let rank = 1; rank <= 5; rank += 1) {
      const prefix = `${sideLabel}_R${rank}`;
      const fallback = `${teamSide === 'ALLY' ? 'Blu' : 'Rosso'} ${rank}`;
      const nickname = parseNicknameCell(rawText, `${prefix}_NICK`, fallback);
      const score = parseNumberCell(rawText, `${prefix}_SCORE`);
      const kda = parseKdaCell(rawText, `${prefix}_KDA`);
      const objective = parseTimeOrNumberCell(rawText, `${prefix}_OBJECTIVE`);
      const impact = parseNumberCell(rawText, `${prefix}_IMPACT`);
      const rowFullText = allTexts(rawText, [`${prefix}_ROW_FULL`]);
      const fallbackRow = parseScoreRowLine(rowFullText, mode, teamSide, rank);

      const finalNickname = nickname !== fallback ? nickname : (fallbackRow?.nickname && !isGeneratedFallbackName(fallbackRow.nickname) ? fallbackRow.nickname : fallback);
      const hasScore = score !== null || (fallbackRow?.score ?? 0) > 0;
      const hasKda = !!kda || !!fallbackRow;
      const hasImpact = impact !== null || fallbackRow?.impact !== null;
      const needsReview = isGeneratedFallbackName(finalNickname) || !hasKda || !hasScore;

      rows.push({
        rankPosition: rank,
        nickname: finalNickname,
        ocrNickname: finalNickname !== fallback ? finalNickname : null,
        playerId: null,
        needsReview,
        readStatus: !needsReview && hasImpact ? 'ok' : hasScore || hasKda ? 'partial' : 'manual',
        score: score ?? fallbackRow?.score ?? 0,
        kills: kda?.kills ?? fallbackRow?.kills ?? 0,
        deaths: kda?.deaths ?? fallbackRow?.deaths ?? 0,
        assists: kda?.assists ?? fallbackRow?.assists ?? 0,
        impact: impact ?? fallbackRow?.impact ?? null,
        objectiveTimeText: objective.timeText ?? fallbackRow?.objectiveTimeText ?? null,
        objectiveTimeSeconds: objective.seconds ?? fallbackRow?.objectiveTimeSeconds ?? null,
        captures: mode === 'DOMINIO' ? (objective.value ?? fallbackRow?.captures ?? null) : fallbackRow?.captures ?? null,
        teamSide,
        mvp: /MVP/i.test(rowFullText),
        rawLine: rowFullText || undefined
      });
    }
  }
  return rows;
}

export function parseScoreboardText(rawText: string): ParsedScoreboard {
  const headerScore = scoreFromResultHeader(rawText);
  const headerModeMap = modeMapFromHeader(rawText);
  const mode = headerModeMap.mode;

  const rows: ParsedScoreRow[] = [];
  const seen = new Set<string>();
  const pushRow = (row: ParsedScoreRow | null) => {
    if (!row) return;
    const key = `${row.teamSide}|${row.rankPosition}|${row.kills}/${row.deaths}/${row.assists}|${row.score}|${normalizeNicknameForMatch(row.nickname)}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  cellBasedRows(rawText, mode).forEach(pushRow);

  if (rows.length < 5) {
    for (const block of parseVariantBlocks(rawText)) {
      if (!/ROW_FULL|TEAM_BLUE_TABLE_FULL|TEAM_RED_TABLE_FULL/i.test(block.baseName)) continue;
      const side: TeamSide | undefined = /RED/i.test(block.baseName) ? 'ENEMY' : /BLUE/i.test(block.baseName) ? 'ALLY' : undefined;
      const rank = numberFrom(block.baseName.match(/_R(\d)_/i)?.[1]) ?? undefined;
      const combined = block.text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).join(' ');
      pushRow(parseScoreRowLine(combined, mode, side, typeof rank === 'number' ? rank : undefined));
      for (const line of block.text.split(/\r?\n/)) pushRow(parseScoreRowLine(line, mode, side, typeof rank === 'number' ? rank : undefined));
    }
  }

  const sortedRows = rows.sort((a, b) => (a.teamSide === b.teamSide ? (a.rankPosition || 0) - (b.rankPosition || 0) : a.teamSide === 'ALLY' ? -1 : 1));
  const allyRows = sortedRows.filter((row) => row.teamSide !== 'ENEMY').sort((a, b) => (a.rankPosition || 0) - (b.rankPosition || 0));
  const enemyRows = sortedRows.filter((row) => row.teamSide === 'ENEMY').sort((a, b) => (a.rankPosition || 0) - (b.rankPosition || 0));
  const allyMvpRank = allyRows[0]?.rankPosition;
  const enemyMvpRank = enemyRows[0]?.rankPosition;

  for (const row of sortedRows) {
    const isAllyTop = row.teamSide !== 'ENEMY' && row.rankPosition === allyMvpRank;
    const isEnemyTop = row.teamSide === 'ENEMY' && row.rankPosition === enemyMvpRank;
    row.mvp = isAllyTop || isEnemyTop;
    row.mvpLabel = isAllyTop
      ? ((headerScore.result || 'WIN') === 'WIN' ? 'MVP_WIN' : 'MVP_LOSE')
      : isEnemyTop
        ? ((headerScore.result || 'WIN') === 'WIN' ? 'MVP_LOSE' : 'MVP_WIN')
        : null;
  }

  return {
    result: headerScore.result,
    teamScore: headerScore.teamScore,
    enemyScore: headerScore.enemyScore,
    mode,
    mapName: headerModeMap.mapName,
    rows: sortedRows,
    accuracy: null,
    headshotPercent: null,
    kdRatio: null,
    rawText
  };
}

export function normalizeNicknameForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

export function findBestNicknameMatch(nickname: string, roster: Array<{ id: string; nickname: string }>) {
  const normalized = normalizeNicknameForMatch(nickname);
  if (!normalized) return undefined;
  return roster.find((p) => normalizeNicknameForMatch(p.nickname) === normalized)
    || roster.find((p) => normalizeNicknameForMatch(p.nickname).includes(normalized) || normalized.includes(normalizeNicknameForMatch(p.nickname)));
}

export function parseLoadoutText(rawText: string): ParsedLoadout {
  const preferred = blockText(rawText, ['loadout_right_panel', 'loadout_name_weapons', 'gunsmith_stats', 'gunsmith_attachments']);
  const text = normalizeOcrText(`${preferred}\n${rawText}`);
  const mode = text.match(/(CERCA\s*E\s*DISTRUGGI|POSTAZIONE|BATTLE\s*ROYALE|MULTIGIOCATORE|HARDPOINT|DOMINIO)/i)?.[1];
  const knownWeapons = 'AK117|Locus|Krig\s*6|BP50|DR-H|DLQ33|QQ9|M13|Kilo|ASM10|HVK|Fennec|Switchblade|Lancia|Katana';
  const weaponLine = preferred.split(/\r?\n/).map((x) => x.trim()).find((line) => new RegExp(knownWeapons, 'i').test(line));
  const weapon = weaponLine?.replace(/^\W+/, '').replace(/ARMAIOLO.*/i, '').trim();
  const slot = numberFrom(text.match(/\b([1-8])\b/)?.[1]);

  const weaponBuild = {
    weaponName: weapon?.split('-')[0]?.trim(),
    blueprintName: weapon?.includes('-') ? weapon.split('-').slice(1).join('-').trim() : undefined,
    muzzle: text.match(/Volata\s+([A-Za-z0-9 \-]+)/i)?.[1],
    barrel: text.match(/Canna\s+([A-Za-z0-9 \-]+)/i)?.[1],
    optic: text.match(/Ottica\s+([A-Za-z0-9 \-]+)/i)?.[1],
    stock: text.match(/Calcio\s+([A-Za-z0-9 \-]+)/i)?.[1],
    perk: text.match(/Specialità\s+([A-Za-z0-9 \-]+)/i)?.[1],
    laser: text.match(/Laser\s+([A-Za-z0-9 \-]+)/i)?.[1],
    underbarrel: text.match(/Sottocanna\s+([A-Za-z0-9 \-]+)/i)?.[1],
    ammunition: text.match(/Munizioni\s+([A-Za-z0-9 \-]+)/i)?.[1],
    rearGrip: text.match(/Impugnatura\s+([A-Za-z0-9 \-]+)/i)?.[1],
    damage: intAfter('DANNI', text),
    fireRate: intAfter('CADENZA', text),
    accuracy: intAfter('PRECISIONE', text),
    mobility: intAfter('MOBILITÀ|MOBILITA', text),
    range: intAfter('PORTATA', text),
    control: intAfter('CONTROLLO', text)
  };

  const perks = Array.from(text.matchAll(/\b(FMJ|Silenzi[oa] radio|Toughness|Dead Silence|Agile|Leggero|Fantasma|Hardline)\b/ig)).map((m) => m[1]);
  const scorestreaks = Array.from(text.matchAll(/\b(UAV|Predator|Hunter|Drone|Shock RC|Counter UAV|Missile|Lancia aereo)\b/ig)).map((m) => m[1]);

  return {
    name: text.match(/(?:PREDEFINITO|CED[- ]ENERGY|CECCHINO SPEED|Postazione)/i)?.[0],
    mode,
    slotIndex: slot,
    primaryWeapon: weapon,
    secondaryWeapon: text.match(/Lancia\s*-\s*[^\n]+|Katana\s*-\s*[^\n]+/i)?.[0],
    characterName: text.match(/Sirena\s*-\s*[^\n]+|Vagr Modir\s*-\s*[^\n]+/i)?.[0],
    lethal: text.match(/Granata|Trip Mine|Molotov|Termite|Ascia/i)?.[0],
    tactical: text.match(/Flashbang|Concussione|Fumo|Cryo|Stim/i)?.[0],
    operatorSkill: text.match(/Ninja|Kinetic|Purifier|Annihilator|War Machine/i)?.[0],
    perks,
    scorestreaks,
    weaponBuild,
    rawText
  };
}
