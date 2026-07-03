'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { kdRatio, winRate } from '@/lib/statistics';
import type { Match, Player } from '@/lib/types';

type ScoreboardRow = {
  id: string;
  match_id: string;
  player_id: string | null;
  nickname_raw: string | null;
  nickname_resolved: string | null;
  team_rank: number | null;
  kills: number;
  deaths: number;
  assists: number;
  mvp_type: string | null;
  players?: { nickname: string; clan_name?: string | null } | null;
};

type ClanProfile = {
  clan_name: string;
  tag: string;
  motto: string;
  story: string;
  leaders: string;
  vice_admins: string;
  social_discord: string;
  social_whatsapp: string;
  social_tiktok: string;
  social_youtube: string;
  social_instagram: string;
  notice_title: string;
  notice_body: string;
};

const defaultProfile: ClanProfile = {
  clan_name: 'AK47DX',
  tag: 'AK47DX',
  motto: 'Lupi della luna rossa · competizione, presenza e rispetto.',
  story: 'Scrivi qui la storia del clan, quando è nato, obiettivi, regole e identità del gruppo.',
  leaders: 'Capo clan: MIRZA',
  vice_admins: 'Vice / admin: da compilare',
  social_discord: '',
  social_whatsapp: '',
  social_tiktok: '',
  social_youtube: '',
  social_instagram: '',
  notice_title: 'Avviso clan',
  notice_body: 'Scrivi qui comunicazioni importanti, roster, allenamenti, scrim o regole aggiornate.'
};

export default function ClanPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rows, setRows] = useState<ScoreboardRow[]>([]);
  const [selectedClan, setSelectedClan] = useState('ALL');
  const [profile, setProfile] = useState<ClanProfile>(defaultProfile);
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('codm_clan_hq_profile_v2_0') || window.localStorage.getItem('codm_clan_hq_profile_v1_2') : null;
    if (saved) {
      try { setProfile({ ...defaultProfile, ...JSON.parse(saved) as Partial<ClanProfile> }); } catch { /* ignore local backup */ }
    }

    const { data: playerData } = await supabase.from('players').select('*').order('nickname');
    const { data: matchData } = await supabase.from('matches').select('*').order('match_date', { ascending: false });
    const { data: rowData } = await supabase.from('match_scoreboard_rows').select('*, players(nickname,clan_name)').order('team_rank', { ascending: true });
    setPlayers((playerData || []) as Player[]);
    setMatches((matchData || []) as Match[]);
    setRows((rowData || []) as ScoreboardRow[]);
  }

  function update<K extends keyof ClanProfile>(key: K, value: ClanProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setMessage('');
    window.localStorage.setItem('codm_clan_hq_profile_v2_0', JSON.stringify(profile));
    const { error } = await supabase.from('clan_public_profiles').upsert({
      profile_key: 'main',
      clan_name: profile.clan_name,
      tag: profile.tag,
      motto: profile.motto,
      story: profile.story,
      leaders: profile.leaders,
      vice_admins: profile.vice_admins,
      social_discord: profile.social_discord,
      social_whatsapp: profile.social_whatsapp,
      social_tiktok: profile.social_tiktok,
      social_youtube: profile.social_youtube,
      social_instagram: profile.social_instagram,
      notice_title: profile.notice_title,
      notice_body: profile.notice_body,
      updated_at: new Date().toISOString()
    }, { onConflict: 'profile_key' });
    if (error) {
      setMessage(`Profilo salvato localmente. Supabase: ${error.message}`);
    } else {
      setMessage('Clan HQ salvato su Supabase e backup locale aggiornato.');
    }
  }

  const clanOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => set.add(p.clan_name || 'Senza clan'));
    rows.forEach((r) => set.add(r.players?.clan_name || 'Senza clan'));
    return ['ALL', ...Array.from(set).sort()];
  }, [players, rows]);

  const clanStats = useMemo(() => {
    const grouped = new Map<string, { clan: string; players: Set<string>; kills: number; deaths: number; assists: number; mvpWin: number; mvpLose: number; rows: number }>();
    for (const player of players) {
      const clan = player.clan_name || 'Senza clan';
      const item = grouped.get(clan) || { clan, players: new Set<string>(), kills: 0, deaths: 0, assists: 0, mvpWin: 0, mvpLose: 0, rows: 0 };
      item.players.add(player.id);
      grouped.set(clan, item);
    }
    for (const row of rows) {
      const clan = row.players?.clan_name || 'Senza clan';
      const item = grouped.get(clan) || { clan, players: new Set<string>(), kills: 0, deaths: 0, assists: 0, mvpWin: 0, mvpLose: 0, rows: 0 };
      item.players.add(row.player_id || row.nickname_resolved || row.nickname_raw || row.id);
      item.kills += row.kills || 0;
      item.deaths += row.deaths || 0;
      item.assists += row.assists || 0;
      item.rows += 1;
      if (row.mvp_type === 'MVP_WIN') item.mvpWin += 1;
      if (row.mvp_type === 'MVP_LOSE') item.mvpLose += 1;
      grouped.set(clan, item);
    }
    return Array.from(grouped.values())
      .map((x) => ({ ...x, playerCount: x.players.size, kd: kdRatio(x.kills, x.deaths) }))
      .filter((x) => selectedClan === 'ALL' || x.clan === selectedClan)
      .sort((a, b) => b.kills - a.kills);
  }, [players, rows, selectedClan]);

  const selectedPlayers = useMemo(() => {
    return players.filter((p) => selectedClan === 'ALL' || (p.clan_name || 'Senza clan') === selectedClan);
  }, [players, selectedClan]);

  const globalSummary = useMemo(() => {
    const wins = matches.filter((m) => m.result === 'WIN').length;
    const losses = matches.filter((m) => m.result === 'LOSE').length;
    const kills = clanStats.reduce((sum, c) => sum + c.kills, 0);
    const deaths = clanStats.reduce((sum, c) => sum + c.deaths, 0);
    const assists = clanStats.reduce((sum, c) => sum + c.assists, 0);
    return { wins, losses, wr: winRate(wins, matches.length), kills, deaths, assists, kd: kdRatio(kills, deaths) };
  }, [matches, clanStats]);

  return (
    <main className="container wide">
      <section className="clan-hero gaming-panel">
        <div>
          <p className="eyebrow">🛡️ Clan HQ</p>
          <h1>{profile.clan_name}</h1>
          <p className="clan-motto">{profile.motto}</p>
          <div className="quick-actions">
            {profile.social_discord && <a className="btn secondary" href={profile.social_discord} target="_blank">💬 Discord</a>}
            {profile.social_whatsapp && <a className="btn secondary" href={profile.social_whatsapp} target="_blank">📱 WhatsApp</a>}
            {profile.social_tiktok && <a className="btn secondary" href={profile.social_tiktok} target="_blank">🎬 TikTok</a>}
            {profile.social_youtube && <a className="btn secondary" href={profile.social_youtube} target="_blank">▶️ YouTube</a>}
            {profile.social_instagram && <a className="btn secondary" href={profile.social_instagram} target="_blank">📸 Instagram</a>}
          </div>
        </div>
        <div className="clan-emblem logo-clan-emblem"><img src="/assets/ak47dx-logo.jpeg" alt="AK47DX logo" /><span>{profile.tag || 'AK47DX'}</span></div>
      </section>

      <section className="grid grid-4 top-gap">
        <div className="kpi kpi-glow"><span>Win rate</span><strong>{globalSummary.wr}%</strong></div>
        <div className="kpi kpi-glow"><span>K/D clan</span><strong>{globalSummary.kd}</strong></div>
        <div className="kpi kpi-glow"><span>Kill / Death / Assist</span><strong>{globalSummary.kills}/{globalSummary.deaths}/{globalSummary.assists}</strong></div>
        <div className="kpi kpi-glow"><span>Player visibili</span><strong>{selectedPlayers.length}</strong></div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Storia e identità clan</h2>
          <p className="muted multiline">{profile.story}</p>
          <div className="grid grid-2 top-gap">
            <div className="kpi"><span>Capi clan</span><p>{profile.leaders}</p></div>
            <div className="kpi"><span>Vice / amministratori</span><p>{profile.vice_admins}</p></div>
          </div>
        </div>
        <div className="card notice-card">
          <p className="eyebrow">📢 Avvisi</p>
          <h2>{profile.notice_title}</h2>
          <p className="multiline">{profile.notice_body}</p>
        </div>
      </section>

      <section className="grid grid-2 top-gap">
        <div className="card">
          <h2>Statistiche per clan</h2>
          <div className="field"><label>Filtro clan</label><select className="select" value={selectedClan} onChange={(e) => setSelectedClan(e.target.value)}>{clanOptions.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'Tutti i clan' : c}</option>)}</select></div>
          <div className="table-scroll top-gap">
            <table className="table compact"><thead><tr><th>Clan</th><th>Player</th><th>Righe</th><th>K/D/A</th><th>K/D</th><th>MVP V</th><th>MVP P</th></tr></thead><tbody>{clanStats.map((c) => <tr key={c.clan}><td>{c.clan}</td><td>{c.playerCount}</td><td>{c.rows}</td><td>{c.kills}/{c.deaths}/{c.assists}</td><td>{c.kd}</td><td>{c.mvpWin}</td><td>{c.mvpLose}</td></tr>)}{!clanStats.length && <tr><td colSpan={7} className="muted">Nessuna statistica clan.</td></tr>}</tbody></table>
          </div>
        </div>
        <div className="card">
          <h2>Giocatori del clan</h2>
          <div className="player-mini-list">
            {selectedPlayers.map((player) => <div className="player-mini" key={player.id}><span className="avatar-placeholder small-avatar">{player.nickname.slice(0, 2).toUpperCase()}</span><div><b>{player.nickname}</b><p className="muted">{player.clan_name || 'Senza clan'} · {player.main_role || 'Ruolo da definire'} · {player.uid_codm ? `UID ${player.uid_codm}` : 'profilo non collegato'}</p></div></div>)}
            {!selectedPlayers.length && <p className="muted">Nessun player per questo clan.</p>}
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Modifica Clan HQ</h2>
        <p className="muted">Questa sezione serve per descrivere il clan, capi, vice, social, avvisi e identità AK47DX. Salva su Supabase con la migrazione 2.0; in ogni caso viene mantenuto un backup locale nel browser.</p>
        {message && <div className="notice">{message}</div>}
        <div className="grid grid-2 top-gap">
          <div className="field"><label>Nome clan</label><input className="input" value={profile.clan_name} onChange={(e) => update('clan_name', e.target.value)} /></div>
          <div className="field"><label>Tag / stemma</label><input className="input" value={profile.tag} onChange={(e) => update('tag', e.target.value)} /></div>
        </div>
        <div className="field top-gap"><label>Motto</label><input className="input" value={profile.motto} onChange={(e) => update('motto', e.target.value)} /></div>
        <div className="field top-gap"><label>Storia clan</label><textarea className="textarea" value={profile.story} onChange={(e) => update('story', e.target.value)} /></div>
        <div className="grid grid-2 top-gap">
          <div className="field"><label>Capi clan</label><textarea className="textarea" value={profile.leaders} onChange={(e) => update('leaders', e.target.value)} /></div>
          <div className="field"><label>Vice / amministratori</label><textarea className="textarea" value={profile.vice_admins} onChange={(e) => update('vice_admins', e.target.value)} /></div>
        </div>
        <div className="grid grid-5 top-gap">
          <div className="field"><label>Discord</label><input className="input" value={profile.social_discord} onChange={(e) => update('social_discord', e.target.value)} /></div>
          <div className="field"><label>WhatsApp</label><input className="input" value={profile.social_whatsapp} onChange={(e) => update('social_whatsapp', e.target.value)} /></div>
          <div className="field"><label>TikTok</label><input className="input" value={profile.social_tiktok} onChange={(e) => update('social_tiktok', e.target.value)} /></div>
          <div className="field"><label>YouTube</label><input className="input" value={profile.social_youtube} onChange={(e) => update('social_youtube', e.target.value)} /></div>
          <div className="field"><label>Instagram</label><input className="input" value={profile.social_instagram} onChange={(e) => update('social_instagram', e.target.value)} /></div>
        </div>
        <div className="grid grid-2 top-gap">
          <div className="field"><label>Titolo avviso</label><input className="input" value={profile.notice_title} onChange={(e) => update('notice_title', e.target.value)} /></div>
          <div className="field"><label>Testo avviso</label><textarea className="textarea" value={profile.notice_body} onChange={(e) => update('notice_body', e.target.value)} /></div>
        </div>
        <button className="btn top-gap" onClick={saveProfile}>💾 Salva Clan HQ</button>
      </section>
    </main>
  );
}
