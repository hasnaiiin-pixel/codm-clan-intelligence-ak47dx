"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { kdRatio, winRate, normalizeGameMode, modeLabel } from "@/lib/statistics";
import type { Match, MatchPlayerStat, Player } from "@/lib/types";

type StatRow = MatchPlayerStat & {
  players?: { nickname: string; clan_name?: string | null } | null;
  matches?: {
    mode: string;
    result: string;
    map_name: string | null;
    match_date: string;
    season_id?: string | null;
  } | null;
};

type ScoreboardRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  nickname_raw: string | null;
  nickname_resolved: string | null;
  team_color: "blue" | "red";
  team_side: "ALLY" | "ENEMY";
  team_rank: number | null;
  kills: number;
  deaths: number;
  assists: number;
  mvp_type: string | null;
  objective_time_seconds?: number | null;
  objective_time_text?: string | null;
  players?: { nickname: string; clan_name?: string | null } | null;
};

type PieSlice = { label: string; value: number; percent: number };

const OBJECTIVE_MODES = ['POSTAZIONE', 'DOMINIO', 'CONTROLLO'] as const;
function supportsObjectiveTime(mode?: string | null): boolean {
  return OBJECTIVE_MODES.some(m => m === normalizeGameMode(mode));
}
function formatObjectiveDuration(value: number): string {
  const n = Math.max(0, Math.floor(value));
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n % 3600) / 60);
  const seconds = n % 60;
  return hours ? `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}` : `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
function objectiveSeconds(row: {objective_time_seconds?: number | null; objective_time_text?: string | null}): number | null {
  const raw = row.objective_time_seconds;
  const text = String(row.objective_time_text || '').trim();
  // Nei vecchi record il default 0 non indica necessariamente una misura acquisita.
  if (raw != null && Number.isFinite(Number(raw)) && Number(raw) >= 0 && (Number(raw) !== 0 || text)) return Math.floor(Number(raw));
  if (/^\d{1,4}:[0-5]\d$/.test(text)) { const [mm,ss] = text.split(':').map(Number); return mm*60+ss; }
  return null;
}

type ObjectivePlayerRow = { name:string; clan:string; mode:string; playerId:string|null; total:number; maximum:number; count:number; matchIds:Set<string> };


function pct(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function pieGradient(slices: PieSlice[]) {
  const colors = [
    "var(--ok)",
    "var(--accent)",
    "var(--accent2)",
    "var(--warning)",
    "#a78bfa",
    "#22d3ee",
    "#f97316",
  ];
  let start = 0;
  const parts = slices.map((slice, index) => {
    const end = start + slice.percent;
    const part = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return part;
  });
  if (!parts.length || start === 0)
    return "linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03))";
  if (start < 100) parts.push(`rgba(255,255,255,.08) ${start}% 100%`);
  return `conic-gradient(${parts.join(", ")})`;
}

function groupPie(
  rows: Array<{ key: string }>,
  fallback = "Sconosciuto",
): PieSlice[] {
  const grouped = new Map<string, number>();
  for (const row of rows)
    grouped.set(
      row.key || fallback,
      (grouped.get(row.key || fallback) || 0) + 1,
    );
  const total = Array.from(grouped.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value, percent: pct(value, total) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

export default function AnalyticsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [scoreboardRows, setScoreboardRows] = useState<ScoreboardRow[]>([]);
  const [filterClan, setFilterClan] = useState("ALL");
  const [filterSeason, setFilterSeason] = useState("ACTIVE");
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [filterMode, setFilterMode] = useState("ALL");
  const [filterMap, setFilterMap] = useState("ALL");
  const [message, setMessage] = useState("");
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const seasonResult = await supabase.from("codm_seasons").select("id,name,is_active").order("name");
    if (!seasonResult.error) setSeasons(seasonResult.data || []);
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });
    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .order("nickname");
    const { data: statData } = await supabase
      .from("match_player_stats")
      .select(
        "*, players(nickname,clan_name), matches(mode,result,map_name,match_date,season_id)",
      )
      .order("created_at", { ascending: false });
    const { data: boardData } = await supabase
      .from("match_scoreboard_rows")
      .select("*, players(nickname,clan_name)")
      .order("team_rank", { ascending: true });
    if (matchError) setMessage(matchError.message);
    setMatches((matchData || []) as Match[]);
    setPlayers((playerData || []) as Player[]);
    setStats((statData || []) as StatRow[]);
    setScoreboardRows((boardData || []) as ScoreboardRow[]);
  }

  const clanOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => set.add(p.clan_name || "Senza clan"));
    stats.forEach((s) => set.add(s.players?.clan_name || "Senza clan"));
    scoreboardRows.forEach((r) =>
      set.add(r.players?.clan_name || "Senza clan"),
    );
    return ["ALL", ...Array.from(set).sort()];
  }, [players, stats, scoreboardRows]);

  const modeOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(matches.map((m) => normalizeGameMode(m.mode)).filter(Boolean))).sort(),
    ],
    [matches],
  );
  const mapOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(matches.map((m) => m.map_name || "Mappa non letta")),
      ).sort(),
    ],
    [matches],
  );

  const selectedSeasonId = filterSeason === "ACTIVE" ? (seasons.find(s => s.is_active)?.id || "ALL") : filterSeason;
  const isInSeason = (match?: Match | null) => selectedSeasonId === "ALL" || match?.season_id === selectedSeasonId;
  const scopedMatches = useMemo(
    () =>
      matches.filter(
        (m) =>
          isInSeason(m) && (filterMode === "ALL" || normalizeGameMode(m.mode) === normalizeGameMode(filterMode)) &&
          (filterMap === "ALL" ||
            (m.map_name || "Mappa non letta") === filterMap),
      ),
    [matches, filterMode, filterMap, selectedSeasonId],
  );
  // Le serie (Scrim 3-2) non devono diventare una singola partita nei totali partite.
  const filteredMatches = useMemo(()=>scopedMatches.filter(m=>m.match_scope!=='series'),[scopedMatches]);
  const filteredSeries = useMemo(()=>scopedMatches.filter(m=>m.match_scope==='series'),[scopedMatches]);
  const historicalCount = scopedMatches.filter(m=>m.record_quality==='result_only').length;
  const seriesWins = filteredSeries.filter(m=>m.result==='WIN').length;
  const seriesLosses = filteredSeries.filter(m=>m.result==='LOSE').length;


  const filteredRows = useMemo(
    () =>
      scoreboardRows.filter((r) => {
        const clan = r.players?.clan_name || "Senza clan";
        if (filterClan !== "ALL" && clan !== filterClan) return false;
        const match = matches.find((m) => m.id === r.match_id);
        if (!isInSeason(match)) return false;
        if (filterMode !== "ALL" && normalizeGameMode(match?.mode) !== normalizeGameMode(filterMode)) return false;
        if (
          filterMap !== "ALL" &&
          (match?.map_name || "Mappa non letta") !== filterMap
        )
          return false;
        return true;
      }),
    [scoreboardRows, matches, filterClan, filterMode, filterMap, selectedSeasonId],
  );

  const filteredStats = useMemo(
    () =>
      stats.filter((s) => {
        const clan = s.players?.clan_name || "Senza clan";
        if (selectedSeasonId !== "ALL" && s.matches?.season_id !== selectedSeasonId) return false;
        if (filterClan !== "ALL" && clan !== filterClan) return false;
        if (filterMode !== "ALL" && normalizeGameMode(s.matches?.mode) !== normalizeGameMode(filterMode))
          return false;
        if (
          filterMap !== "ALL" &&
          (s.matches?.map_name || "Mappa non letta") !== filterMap
        )
          return false;
        return true;
      }),
    [stats, filterClan, filterMode, filterMap, selectedSeasonId],
  );

  // Una misura per giocatore e partita; evita doppi conteggi tra scoreboard e statistiche.
  const objectivePlayers = useMemo(() => {
    const lookup = new Map(matches.map(m => [m.id, m]));
    const grouped = new Map<string, ObjectivePlayerRow>();
    const already = new Set<string>();
    function add(row: {match_id:string; player_id?:string|null; objective_time_seconds?:number|null; objective_time_text?:string|null; players?:{nickname:string;clan_name?:string|null}|null}, nickname:string) {
      const match = lookup.get(row.match_id);
      if (!match || !supportsObjectiveTime(match.mode)) return;
      const seconds = objectiveSeconds(row);
      if (seconds == null) return;
      const name = nickname.trim() || row.players?.nickname || 'Giocatore';
      const mode = normalizeGameMode(match.mode);
      const normalizedName = name.toLocaleLowerCase('it-IT');
      const key = `${row.match_id}::${row.player_id || normalizedName}`;
      const alias = `${row.match_id}::${normalizedName}`;
      if (already.has(key) || already.has(alias)) return;
      already.add(key); already.add(alias);
      const bucket = `${mode}::${row.player_id || normalizedName}`;
      const item = grouped.get(bucket) || {name, clan:row.players?.clan_name||'Senza clan', mode, playerId:row.player_id||null, total:0, maximum:0, count:0, matchIds:new Set<string>()};
      item.total += seconds;
      item.maximum = Math.max(item.maximum,seconds);
      item.count++;
      item.matchIds.add(row.match_id);
      grouped.set(bucket,item);
    }
    for (const r of filteredRows) add(r, r.nickname_resolved || r.nickname_raw || r.players?.nickname || '');
    for (const r of filteredStats) add(r, r.players?.nickname || '');
    return [...grouped.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'it'));
  }, [matches,filteredRows,filteredStats]);
  const showObjective = filterMode === 'ALL' || supportsObjectiveTime(filterMode);
  const objectiveTotals = useMemo(() => {
    const map = new Map<string,number>();
    for (const p of objectivePlayers) {
      const key = (p.playerId || p.name).toLocaleLowerCase('it-IT');
      map.set(key,(map.get(key)||0)+p.total);
    }
    return map;
  },[objectivePlayers]);
  const objectiveTotalSeconds = objectivePlayers.reduce((sum,p)=>sum+p.total,0);
  const objectiveSamples = objectivePlayers.reduce((sum,p)=>sum+p.count,0);
  const objectivePlayerCount = new Set(objectivePlayers.map(p=>p.playerId||p.name.toLocaleLowerCase('it-IT'))).size;

  const summary = useMemo(() => {
    const wins = filteredMatches.filter((m) => m.result === "WIN").length;
    const losses = filteredMatches.filter((m) => m.result === "LOSE").length;
    const draw = filteredMatches.filter((m) => m.result === "DRAW").length;
    const kills =
      filteredRows.reduce((sum, r) => sum + (r.kills || 0), 0) ||
      filteredStats.reduce((sum, s) => sum + (s.kills || 0), 0);
    const deaths =
      filteredRows.reduce((sum, r) => sum + (r.deaths || 0), 0) ||
      filteredStats.reduce((sum, s) => sum + (s.deaths || 0), 0);
    const assists =
      filteredRows.reduce((sum, r) => sum + (r.assists || 0), 0) ||
      filteredStats.reduce((sum, s) => sum + (s.assists || 0), 0);
    return {
      wins,
      losses,
      draw,
      total: filteredMatches.length,
      kills,
      deaths,
      assists,
      kd: kdRatio(kills, deaths),
      wr: winRate(wins, filteredMatches.length),
    };
  }, [filteredMatches, filteredRows, filteredStats]);

  const resultPie = useMemo(() => {
    const total = summary.total;
    return [
      {
        label: "Vittorie",
        value: summary.wins,
        percent: pct(summary.wins, total),
      },
      {
        label: "Sconfitte",
        value: summary.losses,
        percent: pct(summary.losses, total),
      },
      {
        label: "Pareggi",
        value: summary.draw,
        percent: pct(summary.draw, total),
      },
    ].filter((x) => x.value > 0);
  }, [summary]);

  const modePie = useMemo(
    () => groupPie(filteredMatches.map((m) => ({ key: modeLabel(m.mode) }))),
    [filteredMatches],
  );
  const mapPie = useMemo(
    () =>
      groupPie(
        filteredMatches.map((m) => ({ key: m.map_name || "Mappa non letta" })),
      ),
    [filteredMatches],
  );
  const mvpPie = useMemo(
    () =>
      groupPie(
        filteredRows
          .filter((r) => r.mvp_type)
          .map((r) => ({
            key:
              r.nickname_resolved ||
              r.nickname_raw ||
              r.players?.nickname ||
              "MVP non letto",
          })),
      ),
    [filteredRows],
  );

  const clanSummary = useMemo(() => {
    const grouped = new Map<
      string,
      {
        clan: string;
        players: Set<string>;
        matches: Set<string>;
        kills: number;
        deaths: number;
        assists: number;
        mvp: number;
        gold: number;
        silver: number;
        bronze: number;
        wood: number;
        olympic: number;
        rankSum: number;
        rankCount: number;
      }
    >();
    for (const row of filteredRows) {
      const clan = row.players?.clan_name || "Senza clan";
      const item = grouped.get(clan) || {
        clan,
        players: new Set<string>(),
        matches: new Set<string>(),
        kills: 0,
        deaths: 0,
        assists: 0,
        mvp: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        wood: 0,
        olympic: 0,
        rankSum: 0,
        rankCount: 0,
      };
      item.players.add(
        row.player_id || row.nickname_resolved || row.nickname_raw || row.id,
      );
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      item.matches.add(row.match_id);
      if (row.team_rank === 1) item.gold += 1;
      if (row.team_rank === 2) item.silver += 1;
      if (row.team_rank === 3) item.bronze += 1;
      if (row.team_rank === 4) item.wood += 1;
      if (row.team_rank === 5) item.olympic += 1;
      if (row.team_rank) {
        item.rankSum += row.team_rank;
        item.rankCount += 1;
      }
      if (row.mvp_type) item.mvp += 1;
      grouped.set(clan, item);
    }
    return Array.from(grouped.values())
      .map((x) => ({
        ...x,
        playerCount: x.players.size,
        matchCount: x.matches.size,
        kd: kdRatio(x.kills, x.deaths),
        avgRank: x.rankCount ? (x.rankSum / x.rankCount).toFixed(1) : "-",
      }))
      .sort(
        (a, b) =>
          b.gold - a.gold ||
          b.silver - a.silver ||
          b.bronze - a.bronze ||
          b.wood - a.wood ||
          b.olympic - a.olympic ||
          b.mvp - a.mvp ||
          b.assists - a.assists ||
          b.kills - a.kills,
      );
  }, [filteredRows]);

  const topPlayers = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        clan: string;
        kills: number;
        deaths: number;
        assists: number;
        mvp: number;
        matches: Set<string>;
        rankSum: number;
        rankCount: number;
        gold: number;
        silver: number;
        bronze: number;
        wood: number;
        olympic: number;
      }
    >();
    for (const row of filteredRows) {
      const key =
        row.player_id || row.nickname_resolved || row.nickname_raw || row.id;
      const item = grouped.get(key) || {
        id: row.player_id || "",
        name:
          row.nickname_resolved ||
          row.nickname_raw ||
          row.players?.nickname ||
          "Player non letto",
        clan: row.players?.clan_name || "Senza clan",
        kills: 0,
        deaths: 0,
        assists: 0,
        mvp: 0,
        matches: new Set<string>(),
        rankSum: 0,
        rankCount: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        wood: 0,
        olympic: 0,
      };
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      item.matches.add(row.match_id);
      if (!item.id && row.player_id) item.id = row.player_id;
      if (row.team_rank) {
        item.rankSum += row.team_rank;
        item.rankCount += 1;
      }
      if (row.team_rank === 1) item.gold += 1;
      if (row.team_rank === 2) item.silver += 1;
      if (row.team_rank === 3) item.bronze += 1;
      if (row.team_rank === 4) item.wood += 1;
      if (row.team_rank === 5) item.olympic += 1;
      if (row.mvp_type) item.mvp += 1;
      grouped.set(key, item);
    }
    return Array.from(grouped.values())
      .map((x) => ({
        ...x,
        matchCount: x.matches.size,
        kd: kdRatio(x.kills, x.deaths),
        avgRank: x.rankCount ? (x.rankSum / x.rankCount).toFixed(1) : "-",
      }))
      .sort(
        (a, b) =>
          b.gold - a.gold ||
          b.silver - a.silver ||
          b.bronze - a.bronze ||
          b.wood - a.wood ||
          b.olympic - a.olympic ||
          b.mvp - a.mvp ||
          b.assists - a.assists ||
          b.kills - a.kills,
      )
      .slice(0, 12);
  }, [filteredRows]);

  const bestPlayersByMap = useMemo(() => {
    const matchById = new Map(matches.map((match) => [match.id, match]));
    const grouped = new Map<
      string,
      Map<
        string,
        {
          id: string;
          name: string;
          clan: string;
          matches: Set<string>;
          wins: Set<string>;
          kills: number;
          deaths: number;
          assists: number;
          mvp: number;
          rankSum: number;
          rankCount: number;
        }
      >
    >();

    for (const row of filteredRows) {
      const match = matchById.get(row.match_id);
      const mapName =
        filterMap === "ALL"
          ? "Tutte le mappe"
          : (match?.map_name || "Mappa non letta").trim();
      const playerKey =
        row.player_id || row.nickname_resolved || row.nickname_raw || row.id;
      if (!grouped.has(mapName)) grouped.set(mapName, new Map());
      const mapPlayers = grouped.get(mapName)!;
      const item = mapPlayers.get(playerKey) || {
        id: row.player_id || "",
        name:
          row.nickname_resolved ||
          row.nickname_raw ||
          row.players?.nickname ||
          "Player non letto",
        clan: row.players?.clan_name || "Senza clan",
        matches: new Set<string>(),
        wins: new Set<string>(),
        kills: 0,
        deaths: 0,
        assists: 0,
        mvp: 0,
        rankSum: 0,
        rankCount: 0,
      };
      item.matches.add(row.match_id);
      if (match?.result === "WIN") item.wins.add(row.match_id);
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      if (row.mvp_type) item.mvp += 1;
      if (row.team_rank) {
        item.rankSum += row.team_rank;
        item.rankCount += 1;
      }
      mapPlayers.set(playerKey, item);
    }

    return Array.from(grouped.entries())
      .map(([mapName, mapPlayers]) => {
        const ranking = Array.from(mapPlayers.values())
          .map((item) => {
            const matchCount = item.matches.size;
            const wins = item.wins.size;
            const wr = matchCount ? Math.round((wins / matchCount) * 100) : 0;
            const kd = kdRatio(item.kills, item.deaths);
            const avgRank = item.rankCount ? item.rankSum / item.rankCount : 99;
            const reliability = Math.min(matchCount, 5) / 5;
            const score =
              reliability *
              (wr * 0.35 +
                Number(kd) * 18 +
                item.mvp * 6 +
                Math.max(0, 6 - avgRank) * 4 +
                (item.kills / Math.max(matchCount, 1)) * 0.35);
            return {
              ...item,
              matchCount,
              winCount: wins,
              wr,
              kd,
              avgRank,
              score,
            };
          })
          .sort(
            (a, b) =>
              b.score - a.score ||
              b.matchCount - a.matchCount ||
              b.kills - a.kills,
          );
        const eligible = ranking.filter((player) => player.matchCount >= 2);
        return {
          mapName,
          best: eligible[0] || ranking[0],
          ranking,
        };
      })
      .filter((entry) => entry.best)
      .sort((a, b) => a.mapName.localeCompare(b.mapName));
  }, [filteredRows, matches, filterMap]);

  function PieCard({ title, slices }: { title: string; slices: PieSlice[] }) {
    const [selected, setSelected] = useState<string>("");
    const [chartType, setChartType] = useState<"pie" | "donut" | "bar">("pie");
    const active = slices.find((slice) => slice.label === selected) || null;
    const colors = ["var(--ok)", "var(--accent)", "var(--accent2)", "var(--warning)", "#a78bfa", "#22d3ee", "#f97316"];
    return (
      <div className="card stat-pie-card interactive-chart-card-v139">
        <div className="chart-card-head-v139">
          <h2>{title}</h2>
          <select className="select chart-type-select-v139" value={chartType} onChange={(e) => setChartType(e.target.value as "pie" | "donut" | "bar")}>
            <option value="pie">Torta</option>
            <option value="donut">Ciambella</option>
            <option value="bar">Barre</option>
          </select>
        </div>
        {chartType === "bar" ? (
          <div className="bar-chart-v139">
            {slices.map((slice, index) => (
              <button key={slice.label} type="button" className={`bar-row-v139 ${selected === slice.label ? "active" : ""}`} onClick={() => setSelected(selected === slice.label ? "" : slice.label)}>
                <span>{slice.label}</span>
                <i style={{ width: `${Math.max(slice.percent, 2)}%`, background: colors[index % colors.length] }} />
                <b>{slice.percent}%</b>
              </button>
            ))}
          </div>
        ) : (
          <button type="button" aria-label={`Apri dettagli ${title}`} className={`big-pie chart-click-v139 ${chartType === "donut" ? "donut-v139" : ""}`} style={{ background: pieGradient(slices) }} onClick={() => slices[0] && setSelected(selected ? "" : slices[0].label)} />
        )}
        {active && <div className="chart-selection-v139"><span><b>{active.label}</b>: {active.value} · {active.percent}%</span><button type="button" className="chart-clear-selection-v1312" onClick={() => setSelected("")} aria-label="Togli selezione">✕ Togli</button></div>}
        <div className="pie-legend interactive-legend-v139">
          {slices.map((slice, index) => (
            <button type="button" key={slice.label} className={selected === slice.label ? "active" : ""} onClick={() => setSelected(selected === slice.label ? "" : slice.label)}>
              <i style={{ background: colors[index % colors.length] }} />
              <b>{slice.percent}%</b> {slice.label} <small>({slice.value})</small>
            </button>
          ))}
          {!slices.length && <span className="muted">Nessun dato.</span>}
        </div>
      </div>
    );
  }

  function exportExcel(useAll = false) {
    const selectedMatches = useAll ? matches : scopedMatches;
    const selectedRows = useAll ? scoreboardRows : filteredRows;
    const selectedStats = useAll ? stats : filteredStats;
    const matchById = new Map(matches.map((match) => [match.id, match]));
    const grouped = new Map<string, { player: string; clan: string; matches: Set<string>; kills: number; deaths: number; assists: number; mvp: number; rankSum: number; rankCount: number }>();
    for (const row of selectedRows) {
      const key = row.player_id || row.nickname_resolved || row.nickname_raw || row.id;
      const item = grouped.get(key) || {
        player: row.nickname_resolved || row.nickname_raw || row.players?.nickname || "Player non letto",
        clan: row.players?.clan_name || "Senza clan",
        matches: new Set<string>(), kills: 0, deaths: 0, assists: 0, mvp: 0, rankSum: 0, rankCount: 0,
      };
      item.matches.add(row.match_id);
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      if (row.mvp_type) item.mvp += 1;
      if (row.team_rank) { item.rankSum += row.team_rank; item.rankCount += 1; }
      grouped.set(key, item);
    }
    if (!selectedRows.length) {
      for (const row of selectedStats) {
        const key = row.player_id || row.id;
        const item = grouped.get(key) || {
          player: row.players?.nickname || "Player",
          clan: row.players?.clan_name || "Senza clan",
          matches: new Set<string>(), kills: 0, deaths: 0, assists: 0, mvp: 0, rankSum: 0, rankCount: 0,
        };
        item.matches.add(row.match_id);
        item.kills += row.kills || 0;
        item.deaths += row.deaths || 0;
        item.assists += row.assists || 0;
        if (row.is_mvp) item.mvp += 1;
        grouped.set(key, item);
      }
    }
    const playerRows = Array.from(grouped.values()).map((item) => ({
      PLAYER: item.player,
      CLAN: item.clan,
      PARTITE: item.matches.size,
      KILL: item.kills,
      DEATH: item.deaths,
      ASSIST: item.assists,
      "K/D": kdRatio(item.kills, item.deaths),
      MVP: item.mvp,
      "POSIZIONE MEDIA": item.rankCount ? Number((item.rankSum / item.rankCount).toFixed(1)) : "-",
    }));
    const matchRows = selectedMatches.map((match) => ({
      DATA: new Date(match.match_date).toLocaleString("it-IT"),
      STAGIONE: seasons.find(s => s.id === match.season_id)?.name || "",
      LIVELLO: match.match_scope==='series'?'Incontro/serie':'Partita singola',
      COMPLETEZZA: match.record_quality==='result_only'?'Solo risultato':'Statistiche complete',
      TIPO: match.match_type,
      MODALITA: match.mode,
      MAPPA: match.map_name || "",
      AVVERSARIO: match.opponent || "",
      RISULTATO: match.result,
      "PUNTEGGIO NOSTRO": match.team_score ?? "",
      "PUNTEGGIO AVVERSARIO": match.enemy_score ?? "",
    }));
    const rawRows = selectedRows.map((row) => {
      const match = matchById.get(row.match_id);
      return {
        PARTITA: row.match_id,
        DATA: match ? new Date(match.match_date).toLocaleString("it-IT") : "",
        MODALITA: match?.mode || "",
        MAPPA: match?.map_name || "",
        PLAYER: row.nickname_resolved || row.nickname_raw || row.players?.nickname || "",
        CLAN: row.players?.clan_name || "",
        TEMPO_OBIETTIVO: supportsObjectiveTime(match?.mode) && objectiveSeconds(row) !== null ? formatObjectiveDuration(objectiveSeconds(row)!) : "",
        KILL: row.kills,
        DEATH: row.deaths,
        ASSIST: row.assists,
        "K/D": kdRatio(row.kills, row.deaths),
        POSIZIONE: row.team_rank || "",
        MVP: row.mvp_type || "",
      };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      FILTRO_CLAN: useAll ? "Tutti" : filterClan,
      STAGIONE: useAll ? "Carriera" : (seasons.find(s => s.id === selectedSeasonId)?.name || "Carriera"),
      FILTRO_MODALITA: useAll ? "Tutte" : filterMode,
      FILTRO_MAPPA: useAll ? "Tutte" : filterMap,
      PARTITE: selectedMatches.filter(m=>m.match_scope!=='series').length,
      SERIE_SCRIM: selectedMatches.filter(m=>m.match_scope==='series').length,
      VITTORIE: selectedMatches.filter((item) => item.result === "WIN").length,
      SCONFITTE: selectedMatches.filter((item) => item.result === "LOSE").length,
      PAREGGI: selectedMatches.filter((item) => item.result === "DRAW").length,
    }]), "RIEPILOGO");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(playerRows), "STATISTICHE_GIOCATORI");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(matchRows), "PARTITE");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawRows), "DETTAGLIO_KDA");
    XLSX.writeFile(workbook, `CODM_AK47DX_STATISTICHE_${useAll ? "COMPLETE" : "FILTRATE"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function whatsappText() {
    const ranking = (bestPlayersByMap[0]?.ranking || topPlayers || []).slice(0, 3);
    const lines = [
      "🏆 *STATISTICHE CLAN AK47DX*",
      "━━━━━━━━━━━━━━━━",
      "",
      "🎛️ *FILTRI APPLICATI*",
      `🎮 Modalità: ${filterMode === "ALL" ? "Tutte" : filterMode}`,
      `🗺️ Mappa: ${filterMap === "ALL" ? "Tutte" : filterMap}`,
      "",
      "📊 *RISULTATI*",
      `🎯 Partite: ${summary.total}`,
      `✅ Vittorie: ${summary.wins}`,
      `❌ Sconfitte: ${summary.losses}`,
      `➖ Pareggi: ${summary.draw}`,
      `📈 Win rate: ${summary.wr}%`,
      "",
      "⚔️ *PRESTAZIONI*",
      `💥 Kill: ${summary.kills}`,
      `💀 Death: ${summary.deaths}`,
      `🤝 Assist: ${summary.assists}`,
      `🎯 K/D: ${summary.kd}`,
    ];
    if (ranking.length) {
      lines.push("", "🥇 *TOP PLAYER*");
      const medals = ["🥇", "🥈", "🥉"];
      ranking.forEach((player: any, index: number) => {
        lines.push(`${medals[index] || `${index + 1}.`} ${player.name || player.player || "Player"}`);
      });
    }
    lines.push("", "🔥 AK47DX · CLAN MANAGER");
    return lines.join("\n");
  }

  async function shareWhatsApp() {
    const text = whatsappText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Statistiche AK47DX", text });
        return;
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function shareSummaryImage() {
    const element = document.getElementById("analytics-share-summary-v1311");
    if (!element) return;
    setShareBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { backgroundColor: "#07101d", scale: Math.min(window.devicePixelRatio || 1, 2) });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Immagine non generata");
      const file = new File([blob], `STATISTICHE_AK47DX_${new Date().toISOString().slice(0, 10)}.png`, { type: "image/png" });
      const shareNavigator = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navigator.share && (!shareNavigator.canShare || shareNavigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "Statistiche AK47DX", text: whatsappText(), files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossibile condividere l’immagine.");
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <main className="container wide analytics-page">
      <section className="card hero-compact gaming-panel">
        <p className="eyebrow">📊 Analytics 2.0</p>
        <h1>Statistiche clan e player</h1>
        <p className="muted">
          Grafici essenziali, classifiche e filtri per clan, modalità, MVP e
          mappa. K/D/A resta sempre Kill / Death / Assist. I player manuali
          restano visibili nelle statistiche anche senza profilo registrato.
        </p>
        {message && <div className="notice">{message}</div>}
        <div className="field top-gap"><label>Stagione statistiche</label><select className="select" value={filterSeason} onChange={e => setFilterSeason(e.target.value)}><option value="ACTIVE">Stagione attuale</option><option value="ALL">Tutte le stagioni · Carriera</option>{seasons.map(season => <option key={season.id} value={season.id}>{season.name}{season.is_active ? " · Attuale" : ""}</option>)}</select></div>
        <div className="grid grid-3 top-gap analytics-filter-grid-v138">
          <div className="field">
            <label>Clan appartenenza</label>
            <select
              className="select"
              value={filterClan}
              onChange={(e) => setFilterClan(e.target.value)}
            >
              {clanOptions.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Tutti i clan" : c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Modalità</label>
            <select
              className="select"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              {modeOptions.map((m) => (
                <option key={m} value={m}>
                  {m === "ALL" ? "Tutte le modalità" : m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mappa</label>
            <select
              className="select"
              value={filterMap}
              onChange={(e) => setFilterMap(e.target.value)}
            >
              {mapOptions.map((mapName) => (
                <option key={mapName} value={mapName}>
                  {mapName === "ALL" ? "Tutte le mappe" : mapName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="v14-history-stats top-gap"><div className="v14-stat-chip"><span>Risultati storici filtrati</span><strong>{historicalCount}</strong></div><div className="v14-stat-chip"><span>Scrim / serie registrate</span><strong>{filteredSeries.length}</strong></div><div className="v14-stat-chip"><span>Scrim vinte / perse</span><strong>{seriesWins} / {seriesLosses}</strong></div><div className="v14-stat-chip"><span>Win Rate serie</span><strong>{filteredSeries.length?Math.round(100*seriesWins/filteredSeries.length):0}%</strong></div><p className="muted">Le serie hanno un conteggio distinto. Le partite storiche singole entrano nel Win Rate del clan, non nelle metriche individuali senza dati.</p><a className="btn small secondary" href="/import/history">+ Registra risultati storici</a></div>
        <div className="analytics-share-actions-v1311 top-gap">
          <button className="btn" type="button" onClick={() => exportExcel(false)}>📊 Excel filtrato</button>
          <button className="btn secondary" type="button" onClick={() => exportExcel(true)}>📚 Excel completo</button>
          <button className="btn whatsapp-btn-v1311" type="button" onClick={() => void shareWhatsApp()}>🟢 Condividi WhatsApp</button>
          <button className="btn secondary" type="button" disabled={shareBusy} onClick={() => void shareSummaryImage()}>{shareBusy ? "Genero immagine..." : "🖼️ Condividi immagine"}</button>
        </div>
      </section>

      <section id="analytics-share-summary-v1311" className="card top-gap analytics-share-summary-v1311">
        <div><p className="eyebrow">AK47DX · RIEPILOGO CONDIVISIBILE</p><h2>{filterMap === "ALL" ? "Tutte le mappe" : filterMap} · {filterMode === "ALL" ? "Tutte le modalità" : filterMode}</h2></div>
        <div className="analytics-share-kpis-v1311"><span><b>{summary.total}</b> Partite</span><span><b>{summary.wr}%</b> Win rate</span><span><b>{summary.kd}</b> K/D</span><span><b>{summary.kills}/{summary.deaths}/{summary.assists}</b> Kill/Death/Assist</span></div>
      </section>

      <section className="grid grid-4 top-gap">
        <div className="kpi kpi-glow">
          <span>Partite</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="kpi kpi-glow">
          <span>Win rate</span>
          <strong>{summary.wr}%</strong>
        </div>
        <div className="kpi kpi-glow">
          <span>K/D</span>
          <strong>{summary.kd}</strong>
        </div>
        <div className="kpi kpi-glow">
          <span>Kill / Death / Assist</span>
          <strong>
            {summary.kills}/{summary.deaths}/{summary.assists}
          </strong>
        </div>
      </section>

      {showObjective && <section className="card top-gap v14-objective-stats">
        <div className="section-title"><div>
          <h2>⏱ Tempo obiettivo per giocatore</h2>
          <p className="muted">Solo Postazione, Dominio e Controllo. Rispetta i filtri di stagione, modalità, mappa e clan. Le altre modalità non usano il tempo.</p>
        </div></div>
        <div className="grid grid-3 top-gap">
          <div className="kpi"><span>Tempo totale</span><strong>{objectiveSamples?formatObjectiveDuration(objectiveTotalSeconds):'—'}</strong></div>
          <div className="kpi"><span>Giocatori con tempo</span><strong>{objectivePlayerCount}</strong></div>
          <div className="kpi"><span>Misure acquisite</span><strong>{objectiveSamples}</strong></div>
        </div>
        <div className="grid grid-2 top-gap">
          {OBJECTIVE_MODES.filter(mode=>filterMode==='ALL'||normalizeGameMode(filterMode)===mode).map(mode=>{
            const rows=objectivePlayers.filter(p=>p.mode===mode);
            return <div key={mode} className="card v14-objective-mode-card">
              <div className="section-title"><h3>{modeLabel(mode)}</h3><span className="badge">{rows.length} giocatori</span></div>
              <div className="table-scroll"><table className="table compact stats-lines-table-v132">
                <thead><tr><th>Giocatore</th><th>Clan</th><th>Partite</th><th>Totale</th><th>Media</th><th>Max</th></tr></thead>
                <tbody>{rows.map(p=><tr key={`${mode}-${p.playerId||p.name}`}>
                  <td>{p.playerId?<a href={`/players/${p.playerId}`}><b>{p.name}</b></a>:<b>{p.name}</b>}</td>
                  <td>{p.clan}</td><td>{p.matchIds.size}</td>
                  <td><b>{formatObjectiveDuration(p.total)}</b></td>
                  <td>{formatObjectiveDuration(Math.round(p.total/p.count))}</td>
                  <td>{formatObjectiveDuration(p.maximum)}</td>
                </tr>)}{!rows.length&&<tr><td colSpan={6} className="muted">Nessun tempo disponibile per i filtri scelti. Importa il valore TEMPO_OBIETTIVO mm:ss per i singoli giocatori.</td></tr>}</tbody>
              </table></div>
            </div>;
          })}
        </div>
        <p className="muted top-gap">I tempi mancanti non contribuiscono alle medie. Le partite storiche con il solo risultato non ricevono tempi fittizi.</p>
      </section>}

      <section className="grid grid-3 top-gap analytics-main-pies-v131">
        <PieCard title="Vittorie / sconfitte" slices={resultPie} />
        <PieCard title="Tipologia modalità" slices={modePie} />
        <PieCard title="Mappe giocate" slices={mapPie} />
      </section>

      <section className="grid grid-2 top-gap">
        <PieCard title="Distribuzione MVP" slices={mvpPie} />
        <div className="card">
          <h2>🏅 Statistiche per clan · medagliere MVP</h2>
          <div className="table-scroll">
            <table className="table compact stats-tight-table stats-lines-table-v132">
              <thead>
                <tr>
                  <th>Clan</th>
                  <th>Player</th>
                  <th>
                    <span>Partite</span>
                  </th>
                  <th>
                    <span>Kill</span>
                  </th>
                  <th>
                    <span>Death</span>
                  </th>
                  <th>
                    <span>Assist</span>
                  </th>
                  <th>
                    <span>K/D</span>
                  </th>
                  <th>
                    <span>
                      🥇
                      <br />
                      Oro
                    </span>
                  </th>
                  <th>
                    <span>
                      🥈
                      <br />
                      Arg.
                    </span>
                  </th>
                  <th>
                    <span>
                      🥉
                      <br />
                      Bro.
                    </span>
                  </th>
                  <th>
                    <span>4°</span>
                  </th>
                  <th>
                    <span>5°</span>
                  </th>
                  <th>
                    <span>
                      Pos.
                      <br />
                      media
                    </span>
                  </th>
                  <th>
                    <span>MVP</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clanSummary.map((c) => (
                  <tr key={c.clan}>
                    <td>{c.clan}</td>
                    <td>{c.playerCount}</td>
                    <td>{c.matchCount}</td>
                    <td>{c.kills}</td>
                    <td>{c.deaths}</td>
                    <td>{c.assists}</td>
                    <td>{c.kd}</td>
                    <td>{c.gold}</td>
                    <td>{c.silver}</td>
                    <td>{c.bronze}</td>
                    <td>{c.wood}</td>
                    <td>{c.olympic}</td>
                    <td>{c.avgRank}</td>
                    <td>{c.mvp}</td>
                  </tr>
                ))}
                {!clanSummary.length && (
                  <tr>
                    <td colSpan={14} className="muted">
                      Nessun dato clan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card top-gap map-ranking-section-v138">
        <div className="section-title">
          <div>
            <h2>🗺️ Migliori giocatori per mappa</h2>
            <p className="muted">
              Seleziona mappa e modalità dai filtri in alto. Viene mostrata una
              sola classifica ordinata usando partite, vittorie, K/D, Kill, MVP
              e posizione media.
            </p>
          </div>
          <span className="badge ok">
            {filterMap === "ALL" ? "Tutte le mappe" : filterMap} ·{" "}
            {filterMode === "ALL" ? "Tutte le modalità" : filterMode}
          </span>
        </div>
        <div className="map-filter-inline-v139 top-gap">
          <div className="field"><label>Filtra modalità</label><select className="select" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>{modeOptions.map((mode) => <option key={mode} value={mode}>{mode === "ALL" ? "Tutte le modalità" : modeLabel(mode)}</option>)}</select></div>
          <div className="field"><label>Filtra mappa</label><select className="select" value={filterMap} onChange={(e) => setFilterMap(e.target.value)}>{mapOptions.map((mapName) => <option key={mapName} value={mapName}>{mapName === "ALL" ? "Tutte le mappe" : mapName}</option>)}</select></div>
          <button type="button" className="btn secondary" onClick={() => { setFilterMode("ALL"); setFilterMap("ALL"); }}>Azzera filtri</button>
        </div>
        <div className="table-scroll top-gap">
          <table className="table compact stats-lines-table-v132 map-ranking-single-v138 map-ranking-v139">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Clan</th>
                <th>Partite</th>
                <th>Vittorie</th>
                <th>WR%</th>
                <th>Kill</th>
                <th>Death</th>
                <th>Assist</th>
                <th>K/D</th>
                <th>MVP</th>
                <th>Pos. media</th>
              </tr>
            </thead>
            <tbody>
              {(bestPlayersByMap[0]?.ranking || []).map((player, index) => (
                <tr key={`${filterMap}-${player.name}`}>
                  <td>{index + 1}</td>
                  <td>
                    {player.id ? (
                      <a href={`/players/${player.id}`}>
                        <b>{player.name}</b>
                      </a>
                    ) : (
                      <b>{player.name}</b>
                    )}
                  </td>
                  <td>{player.clan}</td>
                  <td>{player.matchCount}</td>
                  <td>{player.winCount}</td>
                  <td>{player.wr}%</td>
                  <td>{player.kills}</td>
                  <td>{player.deaths}</td>
                  <td>{player.assists}</td>
                  <td>{player.kd}</td>
                  <td>{player.mvp}</td>
                  <td>
                    {player.avgRank === 99 ? "-" : player.avgRank.toFixed(1)}
                  </td>
                </tr>
              ))}
              {!bestPlayersByMap[0]?.ranking?.length && (
                <tr>
                  <td colSpan={12} className="muted">
                    Nessun dato disponibile con i filtri selezionati.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card top-gap">
        <h2>🏆 Top player filtrati</h2>
        <div className="table-scroll">
          <table className="table compact stats-tight-table stats-lines-table-v132">
            <thead>
              <tr>
                <th>Player</th>
                <th>Clan</th>
                <th>
                  <span>Partite</span>
                </th>
                <th>
                  <span>Kill</span>
                </th>
                <th>
                  <span>Death</span>
                </th>
                <th>
                  <span>Assist</span>
                </th>
                <th>
                  <span>K/D</span>
                </th>
                <th>
                  <span>
                    🥇
                    <br />
                    Oro
                  </span>
                </th>
                <th>
                  <span>
                    🥈
                    <br />
                    Arg.
                  </span>
                </th>
                <th>
                  <span>
                    🥉
                    <br />
                    Bro.
                  </span>
                </th>
                <th>
                  <span>4°</span>
                </th>
                <th>
                  <span>5°</span>
                </th>
                <th>
                  <span>MVP</span>
                </th>
                {showObjective && <th>⏱ Tempo obiettivo</th>}
                <th>
                  <span>
                    Pos.
                    <br />
                    media
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((p) => (
                <tr key={`${p.name}-${p.clan}`}>
                  <td>
                    {p.id ? (
                      <a href={`/players/${p.id}`}>
                        <b>{p.name}</b>
                      </a>
                    ) : (
                      <a href={`/players?search=${encodeURIComponent(p.name)}`}>
                        <b>{p.name}</b>
                      </a>
                    )}
                  </td>
                  <td>{p.clan}</td>
                  <td>{p.matchCount}</td>
                  <td>{p.kills}</td>
                  <td>{p.deaths}</td>
                  <td>{p.assists}</td>
                  <td>{p.kd}</td>
                  <td>{p.gold}</td>
                  <td>{p.silver}</td>
                  <td>{p.bronze}</td>
                  <td>{p.wood}</td>
                  <td>{p.olympic}</td>
                  <td>{p.mvp}</td>
                  {showObjective && <td>{objectiveTotals.has((p.id || p.name).toLocaleLowerCase('it-IT')) ? formatObjectiveDuration(objectiveTotals.get((p.id || p.name).toLocaleLowerCase('it-IT'))!) : '—'}</td>}
                  <td>{p.avgRank}</td>
                </tr>
              ))}
              {!topPlayers.length && (
                <tr>
                  <td colSpan={showObjective ? 15 : 14} className="muted">
                    Nessun player trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
