/** Riepiloghi basati sulle partite: non sommano due volte i risultati delle serie. */
export type ResultMatch = {
  id: string;
  season_id?: string | null;
  match_date: string;
  opponent?: string | null;
  mode?: string | null;
  map_name?: string | null;
  match_scope?: string | null;
  record_quality?: string | null;
  result: string;
  team_score?: number | null;
  enemy_score?: number | null;
};

export type ResultCounts = {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  wr: number;
};

export type ResultsSummary = {
  singles: ResultCounts;
  series: ResultCounts;
  resultOnly: number;
  totalRecords: number;
};

export type SeasonDef = { id: string; name: string; is_active?: boolean; is_historical?: boolean };

export function normalizeOpponent(value: string | null | undefined): string {
  return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT');
}

export function countResults(matches: readonly ResultMatch[]): ResultsSummary {
  const singles = { played: 0, wins: 0, losses: 0, draws: 0, wr: 0 };
  const series = { played: 0, wins: 0, losses: 0, draws: 0, wr: 0 };
  let resultOnly = 0;
  for (const match of matches) {
    if (match.record_quality === 'result_only') resultOnly++;
    const group = match.match_scope === 'series' ? series : singles;
    group.played++;
    if (match.result === 'WIN') group.wins++;
    if (match.result === 'LOSE') group.losses++;
    if (match.result === 'DRAW') group.draws++;
  }
  singles.wr = singles.played ? Number((singles.wins / singles.played * 100).toFixed(1)) : 0;
  series.wr = series.played ? Number((series.wins / series.played * 100).toFixed(1)) : 0;
  return { singles, series, resultOnly, totalRecords: matches.length };
}

export function summarizeSeasons(matches: readonly ResultMatch[], seasons: readonly SeasonDef[]) {
  const known = new Map(seasons.map(season => [season.id, season]));
  const groups = new Map<string, ResultMatch[]>();
  for (const season of seasons) groups.set(season.id, []);
  for (const match of matches) {
    const key = match.season_id && known.has(match.season_id) ? match.season_id : '__UNASSIGNED__';
    const list = groups.get(key) || [];
    list.push(match);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([id, list]) => ({
      id, name: id === '__UNASSIGNED__' ? 'Senza stagione / stagione non trovata' : known.get(id)?.name || 'Senza stagione',
      isActive: Boolean(known.get(id)?.is_active),
      isHistorical: Boolean(known.get(id)?.is_historical),
      ...countResults(list),
    }))
    .filter(row => row.id !== '__UNASSIGNED__' || row.totalRecords > 0);
}

export function summarizeOpponents(matches: readonly ResultMatch[]) {
  const grouped = new Map<string, { name: string; matches: ResultMatch[] }>();
  for (const match of matches) {
    const key = normalizeOpponent(match.opponent) || '__UNKNOWN__';
    const name = String(match.opponent || '').trim().replace(/\s+/g, ' ') || 'Avversario non registrato';
    const current = grouped.get(key) || { name, matches: [] };
    current.matches.push(match);
    grouped.set(key, current);
  }
  return [...grouped.entries()].map(([key, group]) => ({
    key,
    name: group.name,
    matches: group.matches.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    ...countResults(group.matches),
  })).sort((a, b) => b.series.played - a.series.played || b.singles.played - a.singles.played || a.name.localeCompare(b.name, 'it'));
}
