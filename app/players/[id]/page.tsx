"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { kdRatio, winRate, normalizeGameMode, modeLabel } from "@/lib/statistics";
import type { Player, PlayerSnapshot } from "@/lib/types";

type StatRow = {
  id: string;
  match_id?: string | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  is_mvp?: boolean | null;
  rank_position?: number | null;
  objective_time_seconds?: number | null;
  objective_time_text?: string | null;
  created_at?: string | null;
  matches?: {
    id?: string;
    mode?: string | null;
    result?: string | null;
    map_name?: string | null;
    match_date?: string | null;
    match_type?: string | null;
  } | null;
};

type BoardRow = {
  id: string;
  match_id?: string | null;
  nickname_resolved?: string | null;
  nickname_raw?: string | null;
  team_rank?: number | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  mvp_type?: string | null;
  objective_time_seconds?: number | null;
  objective_time_text?: string | null;
  matches?: { mode?: string | null } | null;
};

function dateLabel(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("it-IT");
  } catch {
    return "-";
  }
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const playerId = String(params?.id || "");
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [boardRows, setBoardRows] = useState<BoardRow[]>([]);
  const [snapshots, setSnapshots] = useState<PlayerSnapshot[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [playerId]);

  async function load() {
    if (!playerId) return;
    setLoading(true);
    setMessage("");
    try {
      const [
        { data: playerData, error: playerError },
        { data: statData, error: statError },
        { data: snapData },
        { data: boardData },
      ] = await Promise.all([
        supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
        supabase
          .from("match_player_stats")
          .select("*, matches(id,mode,result,map_name,match_date,match_type)")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("player_snapshots")
          .select("*")
          .eq("player_id", playerId)
          .order("imported_at", { ascending: false }),
        supabase
          .from("match_scoreboard_rows")
          .select("*, matches(mode)")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false }),
      ]);
      if (playerError) throw playerError;
      if (
        statError &&
        !/relationship|schema cache/i.test(statError.message || "")
      )
        throw statError;
      setPlayer((playerData || null) as Player | null);
      setStats((statData || []) as StatRow[]);
      setSnapshots((snapData || []) as PlayerSnapshot[]);
      setBoardRows((boardData || []) as BoardRow[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore caricamento profilo player.",
      );
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const sourceRows = boardRows.length ? boardRows : stats;
    const matchIds = new Set(
      sourceRows.map((row) => row.match_id || row.id).filter(Boolean),
    );
    const kills = sourceRows.reduce(
      (sum, row) => sum + Number(row.kills || 0),
      0,
    );
    const deaths = sourceRows.reduce(
      (sum, row) => sum + Number(row.deaths || 0),
      0,
    );
    const assists = sourceRows.reduce(
      (sum, row) => sum + Number(row.assists || 0),
      0,
    );
    const wins = stats.filter(
      (row) => String(row.matches?.result || "").toUpperCase() === "WIN",
    ).length;
    const mvp = sourceRows.filter((row) =>
      Boolean(
        (row as any).is_mvp ||
        (row as BoardRow).mvp_type ||
        (row as any).team_rank === 1,
      ),
    ).length;
    const rankValues = sourceRows
      .map((row) =>
        Number((row as any).rank_position || (row as any).team_rank || 0),
      )
      .filter((n) => n > 0);
    const avgRank = rankValues.length
      ? (rankValues.reduce((a, b) => a + b, 0) / rankValues.length).toFixed(1)
      : "-";
    return {
      matches: matchIds.size,
      kills,
      deaths,
      assists,
      kd: kdRatio(kills, deaths),
      wins,
      winRate: winRate(wins, matchIds.size),
      mvp,
      avgRank,
    };
  }, [stats, boardRows]);

  const objectiveByMode = useMemo(() => {
    const supported = ['POSTAZIONE','DOMINIO','CONTROLLO'];
    const byMode = new Map<string,{total:number; count:number; maximum:number}>();
    const visited = new Set<string>();
    const statById = new Map(stats.map(s=>[s.match_id,s]));
    function add(row: StatRow | BoardRow, mode?: string | null) {
      const normalized = normalizeGameMode(mode);
      if (!supported.includes(normalized)) return;
      const secondsRaw = row.objective_time_seconds;
      const text = String(row.objective_time_text || '').trim();
      let seconds: number | null = null;
      if (secondsRaw != null && Number.isFinite(Number(secondsRaw)) && (Number(secondsRaw)>0 || !!text)) seconds = Number(secondsRaw);
      else if (/^\d{1,4}:[0-5]\d$/.test(text)) {const [mm,ss]=text.split(':').map(Number); seconds=mm*60+ss;}
      if (seconds == null || seconds<0) return;
      const id = String(row.match_id || row.id);
      if (visited.has(id)) return;
      visited.add(id);
      const item = byMode.get(normalized) || {total:0,count:0,maximum:0};
      item.total+=seconds;item.count++;item.maximum=Math.max(item.maximum,seconds);
      byMode.set(normalized,item);
    }
    // Preferenza scoreboard; fallback alle statistiche individuali.
    for (const row of boardRows) add(row,row.matches?.mode || statById.get(row.match_id)?.matches?.mode);
    for (const row of stats) add(row,row.matches?.mode);
    return supported.map(mode=>({mode,...(byMode.get(mode)||{total:0,count:0,maximum:0})}));
  },[stats,boardRows]);
  function duration(total:number){const n=Math.floor(Math.max(0,total));const h=Math.floor(n/3600),m=Math.floor(n%3600/60),sec=n%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}

  if (loading)
    return (
      <main className="container wide">
        <div className="notice">Caricamento profilo player...</div>
      </main>
    );

  return (
    <main className="container wide player-profile-page-v132">
      <section className="card gaming-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">👤 Profilo player</p>
            <h1>{player?.nickname || "Player non trovato"}</h1>
            <p className="muted">
              Scheda personale con dati roster, statistiche K/D/A e storico
              partite.
            </p>
          </div>
          <a className="btn small secondary" href="/players">
            ← Torna giocatori
          </a>
        </div>
        {message && <div className="notice top-gap">{message}</div>}
        {!player && (
          <p className="empty-state">Player non trovato nel roster.</p>
        )}
      </section>

      {player && (
        <>
          <section className="grid grid-4 top-gap">
            <div className="kpi kpi-glow">
              <span>Partite</span>
              <strong>{summary.matches}</strong>
            </div>
            <div className="kpi kpi-glow">
              <span>Kill / Death / Assist</span>
              <strong>
                {summary.kills}/{summary.deaths}/{summary.assists}
              </strong>
            </div>
            <div className="kpi kpi-glow">
              <span>K/D</span>
              <strong>{summary.kd}</strong>
            </div>
            <div className="kpi kpi-glow">
              <span>MVP / Pos. media</span>
              <strong>
                {summary.mvp} / {summary.avgRank}
              </strong>
            </div>
          </section>

          <section className="card top-gap">
            <h2>⏱ Tempo obiettivo — Postazione, Dominio e Controllo</h2>
            <p className="muted">Tempi registrati per questo giocatore. Le altre modalità non prevedono questa statistica.</p>
            <div className="grid grid-3 top-gap">
              {objectiveByMode.map(row=><div className="kpi" key={row.mode}>
                <span>{modeLabel(row.mode)}</span><strong>{row.count?duration(row.total):'—'}</strong>
                <small className="muted">{row.count?`${row.count} partite · media ${duration(Math.round(row.total/row.count))}`:'Nessun tempo registrato'}</small>
              </div>)}
            </div>
          </section>

          <section className="grid grid-2 top-gap">
            <div className="card">
              <h2>Dati roster</h2>
              <div className="grid grid-2 top-gap">
                <div className="field">
                  <label>Nickname</label>
                  <input
                    className="input"
                    value={player.nickname || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Clan</label>
                  <input
                    className="input"
                    value={player.clan_name || "Senza clan"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>UID CODM</label>
                  <input
                    className="input"
                    value={player.uid_codm || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Stato</label>
                  <input
                    className="input"
                    value={player.status || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Ruolo</label>
                  <input
                    className="input"
                    value={player.main_role || "-"}
                    disabled
                  />
                </div>
                <div className="field">
                  <label>Rank MP / BR</label>
                  <input
                    className="input"
                    value={`${player.rank_mp_current || "-"} / ${player.rank_br_current || "-"}`}
                    disabled
                  />
                </div>
              </div>
              {player.notes && (
                <div className="notice top-gap">{player.notes}</div>
              )}
            </div>

            <div className="card">
              <h2>Snapshot profilo</h2>
              <div className="player-mini-list top-gap">
                {snapshots.slice(0, 5).map((snapshot) => (
                  <div className="player-mini" key={snapshot.id}>
                    <div className="avatar-placeholder small-avatar">📸</div>
                    <div>
                      <b>{snapshot.source_type || "profilo"}</b>
                      <br />
                      <small className="muted">
                        {dateLabel(snapshot.imported_at)} ·{" "}
                        {(snapshot as any).rank_current ||
                          (snapshot as any).rank_legendary ||
                          "-"}
                      </small>
                    </div>
                  </div>
                ))}
                {!snapshots.length && (
                  <p className="empty-state">
                    Nessuno snapshot profilo importato.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card top-gap">
            <h2>Storico partite del giocatore</h2>
            <p className="muted">K/D/A resta Kill / Death / Assist.</p>
            <div className="table-scroll top-gap">
              <table className="table compact stats-tight-table stats-lines-table-v132">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Modalità</th>
                    <th>Mappa</th>
                    <th>Esito</th>
                    <th>Kill</th>
                    <th>Death</th>
                    <th>Assist</th>
                    <th>K/D</th>
                    <th>MVP</th>
                    <th>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {dateLabel(row.matches?.match_date || row.created_at)}
                      </td>
                      <td>
                        {row.matches?.mode || row.matches?.match_type || "-"}
                      </td>
                      <td>{row.matches?.map_name || "-"}</td>
                      <td>{row.matches?.result || "-"}</td>
                      <td>{row.kills || 0}</td>
                      <td>{row.deaths || 0}</td>
                      <td>{row.assists || 0}</td>
                      <td>
                        {kdRatio(
                          Number(row.kills || 0),
                          Number(row.deaths || 0),
                        )}
                      </td>
                      <td>{row.is_mvp ? "Sì" : "-"}</td>
                      <td>{row.rank_position || "-"}</td>
                    </tr>
                  ))}
                  {!stats.length && (
                    <tr>
                      <td colSpan={10} className="muted">
                        Nessuna partita collegata in match_player_stats.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
