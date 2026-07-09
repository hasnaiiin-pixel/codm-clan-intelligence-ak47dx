"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { kdRatio } from "@/lib/statistics";
import { useCodmAuth } from "@/lib/authRoles";
import { loadClanIdentity, clanDisplayName } from "@/lib/clanIdentity";
import type { MatchPlayerStat, Player, PlayerSnapshot } from "@/lib/types";

type StatWithMatch = MatchPlayerStat & {
  matches?: {
    mode: string;
    result: string;
    map_name: string | null;
    match_date: string;
  } | null;
};

type PlayerCard = {
  player: Player;
  matchCount: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  wins: number;
  winRate: number;
  gold: number;
  silver: number;
  bronze: number;
  mvp: number;
  avgRank: string;
  mpSnapshot?: PlayerSnapshot;
  brSnapshot?: PlayerSnapshot;
};

function safeClan(player: Player) {
  return player.clan_name || "Senza clan";
}

function profileStatus(player: Player) {
  return player.uid_codm ? "Registrato" : "Manuale / da collegare";
}

export default function PlayersPage() {
  const auth = useCodmAuth();
  const canWrite = auth.canWrite;
  const [players, setPlayers] = useState<Player[]>([]);
  const [snapshots, setSnapshots] = useState<PlayerSnapshot[]>([]);
  const [stats, setStats] = useState<StatWithMatch[]>([]);
  const [clanId, setClanId] = useState("");
  const [nickname, setNickname] = useState("");
  const [uid, setUid] = useState("");
  const [playerClanName, setPlayerClanName] = useState("AK47DX");
  const [rankMp, setRankMp] = useState("");
  const [rankBr, setRankBr] = useState("");
  const [role, setRole] = useState("Slayer");
  const [filterClan, setFilterClan] = useState("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [clanEdits, setClanEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const identity = await loadClanIdentity();
    if (identity.clanId) {
      setClanId(identity.clanId);
      setPlayerClanName(clanDisplayName(identity));
    }

    const { data: playerData, error } = await supabase
      .from("players")
      .select("*")
      .order("nickname");
    const { data: snapData } = await supabase
      .from("player_snapshots")
      .select("*")
      .order("imported_at", { ascending: false });
    const { data: statData } = await supabase
      .from("match_player_stats")
      .select("*, matches(mode,result,map_name,match_date)")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    const loadedPlayers = (playerData || []) as Player[];
    setPlayers(loadedPlayers);
    setSnapshots((snapData || []) as PlayerSnapshot[]);
    setStats((statData || []) as StatWithMatch[]);
    setClanEdits(
      Object.fromEntries(loadedPlayers.map((p) => [p.id, p.clan_name || ""])),
    );
  }

  async function addPlayer() {
    setMessage("");
    if (!canWrite)
      return setMessage("Solo Staff, Coach o Owner possono aggiungere player.");
    if (!clanId) return setMessage("Prima crea il clan in Onboarding.");
    if (!nickname.trim()) return setMessage("Inserisci nickname.");
    const { error } = await supabase.from("players").insert({
      clan_id: clanId,
      nickname: nickname.trim(),
      uid_codm: uid || null,
      clan_name: playerClanName || null,
      rank_mp_current: rankMp || null,
      rank_br_current: rankBr || null,
      main_role: role,
      status: uid ? "active" : "tryout",
      notes: uid
        ? null
        : "Player creato manualmente o da statistiche: profilo CODM non ancora collegato.",
    });
    if (error) return setMessage(error.message);
    setNickname("");
    setUid("");
    setRankMp("");
    setRankBr("");
    setMessage(
      "Player aggiunto. Le statistiche future saranno associate a questo nome/clan.",
    );
    load();
  }

  async function updatePlayerClan(player: Player) {
    if (!canWrite)
      return setMessage("Solo Staff, Coach o Owner possono modificare player.");
    const nextClan = (clanEdits[player.id] || "").trim() || null;
    const { error } = await supabase
      .from("players")
      .update({ clan_name: nextClan })
      .eq("id", player.id);
    if (error)
      return setMessage(
        `Errore aggiornamento clan ${player.nickname}: ${error.message}`,
      );
    setMessage(
      `Clan aggiornato per ${player.nickname}: ${nextClan || "Senza clan"}.`,
    );
    load();
  }

  const clanOptions = useMemo(() => {
    const set = new Set(players.map((p) => safeClan(p)));
    return ["ALL", ...Array.from(set).sort()];
  }, [players]);

  const playerCards = useMemo<PlayerCard[]>(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => filterClan === "ALL" || safeClan(p) === filterClan)
      .filter(
        (p) =>
          !q ||
          `${p.nickname} ${p.clan_name || ""} ${p.uid_codm || ""}`
            .toLowerCase()
            .includes(q),
      )
      .map((p) => {
        const pStats = stats.filter((s) => s.player_id === p.id);
        const pSnapshots = snapshots.filter((s) => s.player_id === p.id);
        const mpSnapshot = pSnapshots.find(
          (s) => s.source_type === "multiplayer",
        );
        const brSnapshot = pSnapshots.find(
          (s) => s.source_type === "battle_royale",
        );
        const kills = pStats.reduce((sum, s) => sum + (s.kills || 0), 0);
        const deaths = pStats.reduce((sum, s) => sum + (s.deaths || 0), 0);
        const assists = pStats.reduce((sum, s) => sum + (s.assists || 0), 0);
        const wins = pStats.filter((s) => s.matches?.result === "WIN").length;
        const gold = pStats.filter((s) => s.rank_position === 1).length;
        const silver = pStats.filter((s) => s.rank_position === 2).length;
        const bronze = pStats.filter((s) => s.rank_position === 3).length;
        const rankValues = pStats
          .map((s) => s.rank_position || 0)
          .filter((x) => x > 0);
        const rankAvg = rankValues.length
          ? rankValues.reduce((a, b) => a + b, 0) / rankValues.length
          : 0;
        return {
          player: p,
          matchCount: pStats.length,
          kills,
          deaths,
          assists,
          kd: kdRatio(kills, deaths),
          wins,
          winRate: pStats.length ? Math.round((wins / pStats.length) * 100) : 0,
          gold,
          silver,
          bronze,
          mvp: pStats.filter((s) => s.is_mvp).length,
          avgRank: rankAvg ? rankAvg.toFixed(1) : "-",
          mpSnapshot,
          brSnapshot,
        };
      })
      .sort(
        (a, b) =>
          b.kills - a.kills ||
          a.player.nickname.localeCompare(b.player.nickname),
      );
  }, [players, stats, snapshots, filterClan, search]);

  const clanSummary = useMemo(() => {
    const grouped = new Map<
      string,
      {
        clan: string;
        players: number;
        kills: number;
        deaths: number;
        assists: number;
        matches: number;
        gold: number;
        silver: number;
        bronze: number;
        rankSum: number;
        rankCount: number;
      }
    >();
    for (const p of players) {
      const clan = safeClan(p);
      const item = grouped.get(clan) || {
        clan,
        players: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        matches: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        rankSum: 0,
        rankCount: 0,
      };
      item.players += 1;
      const pStats = stats.filter((s) => s.player_id === p.id);
      item.matches += pStats.length;
      item.kills += pStats.reduce((sum, s) => sum + (s.kills || 0), 0);
      item.deaths += pStats.reduce((sum, s) => sum + (s.deaths || 0), 0);
      item.assists += pStats.reduce((sum, s) => sum + (s.assists || 0), 0);
      item.gold += pStats.filter((s) => s.rank_position === 1).length;
      item.silver += pStats.filter((s) => s.rank_position === 2).length;
      item.bronze += pStats.filter((s) => s.rank_position === 3).length;
      for (const stat of pStats) {
        if (stat.rank_position) {
          item.rankSum += stat.rank_position;
          item.rankCount += 1;
        }
      }
      grouped.set(clan, item);
    }
    return Array.from(grouped.values())
      .map((c) => ({
        ...c,
        kd: kdRatio(c.kills, c.deaths),
        avgRank: c.rankCount ? (c.rankSum / c.rankCount).toFixed(1) : "-",
      }))
      .sort((a, b) => b.kills - a.kills);
  }, [players, stats]);

  return (
    <main className="container wide">
      <section className="grid grid-2">
        <div className="card gaming-panel">
          <p className="eyebrow">👥 Roster e player manuali</p>
          <h1>Tutti i giocatori e statistiche</h1>
          <p className="muted">
            Qui vedi player registrati e manuali. La consultazione è pubblica;
            aggiunta e modifica sono riservate a Staff, Coach e Owner.
          </p>
          {!canWrite && (
            <div className="notice top-gap">
              🔒 Modalità sola lettura: fai login con ruolo Staff, Coach o Owner
              per aggiungere o modificare player.
            </div>
          )}
          {canWrite && (
            <div className="form">
              <div className="grid grid-2">
                <div className="field">
                  <label>Nome in gioco CODM</label>
                  <input
                    className="input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="MIRZA o nome in gioco CODM"
                  />
                </div>
                <div className="field">
                  <label>TAG assegnato da Clan HQ</label>
                  <input
                    className="input"
                    value={playerClanName}
                    onChange={(e) => setPlayerClanName(e.target.value)}
                    placeholder="AK47DX / clan avversario"
                  />
                </div>
              </div>
              <div className="field">
                <label>UID CODM opzionale</label>
                <input
                  className="input"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="vuoto = player manuale/provvisorio"
                />
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label>Rank MP</label>
                  <input
                    className="input"
                    value={rankMp}
                    onChange={(e) => setRankMp(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Rank BR</label>
                  <input
                    className="input"
                    value={rankBr}
                    onChange={(e) => setRankBr(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Ruolo</label>
                <select
                  className="select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option>Slayer</option>
                  <option>Objective</option>
                  <option>Sniper</option>
                  <option>Anchor</option>
                  <option>Support</option>
                </select>
              </div>
              <button className="btn" onClick={addPlayer}>
                ➕ Aggiungi player
              </button>
              {message && <div className="notice">{message}</div>}
            </div>
          )}
          {!canWrite && message && (
            <div className="notice top-gap">{message}</div>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">🛡️ Filtri clan</p>
          <h2>Statistiche per clan appartenenza</h2>
          <div className="grid grid-2">
            <div className="field">
              <label>Filtro clan</label>
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
              <label>Cerca player</label>
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="nickname, clan, UID"
              />
            </div>
          </div>
          <div className="table-scroll top-gap">
            <table className="table compact stats-tight-table">
              <thead>
                <tr>
                  <th>Clan</th>
                  <th>Player</th>
                  <th>Match</th>
                  <th>K/D/A</th>
                  <th>K/D</th>
                  <th>🥇</th>
                  <th>🥈</th>
                  <th>🥉</th>
                  <th>Pos. media</th>
                </tr>
              </thead>
              <tbody>
                {clanSummary.map((c) => (
                  <tr key={c.clan}>
                    <td>{c.clan}</td>
                    <td>{c.players}</td>
                    <td>{c.matches}</td>
                    <td>
                      {c.kills}/{c.deaths}/{c.assists}
                    </td>
                    <td>{c.kd}</td>
                    <td>{c.gold}</td>
                    <td>{c.silver}</td>
                    <td>{c.bronze}</td>
                    <td>{c.avgRank}</td>
                  </tr>
                ))}
                {!clanSummary.length && (
                  <tr>
                    <td colSpan={9} className="muted">
                      Nessun dato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Elenco player con statistiche</h2>
        <p className="muted">
          Clicca sul nome del giocatore per aprire il profilo personale con
          tutti i dati.
        </p>
        <div className="table-scroll">
          <table className="table compact player-stats-table stats-tight-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Clan</th>
                <th>Tipo</th>
                <th>Match</th>
                <th>W/R</th>
                <th>WR%</th>
                <th>Kill</th>
                <th>Death</th>
                <th>Assist</th>
                <th>K/D</th>
                <th>🥇 Oro/MVP</th>
                <th>🥈 Argento</th>
                <th>🥉 Bronzo</th>
                <th>Pos. media</th>
                <th>Azione clan</th>
              </tr>
            </thead>
            <tbody>
              {playerCards.map((card) => (
                <tr key={card.player.id}>
                  <td>
                    <a
                      className="player-click-link-v132"
                      href={`/players/${card.player.id}`}
                    >
                      <b>{card.player.nickname}</b>
                    </a>
                    <br />
                    <span className="muted">
                      {card.player.uid_codm
                        ? `UID ${card.player.uid_codm}`
                        : "profilo CODM da collegare"}
                    </span>
                  </td>
                  <td>{safeClan(card.player)}</td>
                  <td>
                    <span
                      className={
                        card.player.uid_codm ? "badge ok" : "badge warn"
                      }
                    >
                      {profileStatus(card.player)}
                    </span>
                  </td>
                  <td>{card.matchCount}</td>
                  <td>
                    {card.wins}/{Math.max(card.matchCount - card.wins, 0)}
                  </td>
                  <td>{card.winRate}%</td>
                  <td>{card.kills}</td>
                  <td>{card.deaths}</td>
                  <td>{card.assists}</td>
                  <td>{card.kd}</td>
                  <td>
                    <span className="rank-medal medal-gold">
                      🥇 {card.gold}
                    </span>
                  </td>
                  <td>
                    <span className="rank-medal medal-silver">
                      🥈 {card.silver}
                    </span>
                  </td>
                  <td>
                    <span className="rank-medal medal-bronze">
                      🥉 {card.bronze}
                    </span>
                  </td>
                  <td>{card.avgRank}</td>
                  <td>
                    {canWrite ? (
                      <div className="inline-edit">
                        <input
                          className="input clan-edit"
                          value={clanEdits[card.player.id] ?? ""}
                          onChange={(e) =>
                            setClanEdits((current) => ({
                              ...current,
                              [card.player.id]: e.target.value,
                            }))
                          }
                          placeholder="AK47DX / clan avversario"
                        />
                        <button
                          className="btn small secondary"
                          onClick={() => updatePlayerClan(card.player)}
                        >
                          Salva
                        </button>
                      </div>
                    ) : (
                      <span>{card.player.clan_name || "Senza clan"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!playerCards.length && (
                <tr>
                  <td colSpan={15} className="muted">
                    Nessun player per i filtri selezionati.
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
