'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCodmAuth } from '@/lib/authRoles';
import { supabase } from '@/lib/supabaseClient';

type NameHistoryEntry = { at: string; oldName: string; newName: string; source: string };
type PlayerLite = { id: string; nickname: string; avatar_url?: string | null; uid_codm?: string | null };

function historyKey(userId?: string) {
  return `codm_name_history_${userId || 'anonymous'}`;
}

export default function ProfilePage() {
  const auth = useCodmAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [codmNickname, setCodmNickname] = useState('');
  const [uidCodm, setUidCodm] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTikTok, setSocialTikTok] = useState('');
  const [socialYouTube, setSocialYouTube] = useState('');
  const [socialDiscord, setSocialDiscord] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [players, setPlayers] = useState<PlayerLite[]>([]);
  const [linkedPlayerId, setLinkedPlayerId] = useState('');
  const [history, setHistory] = useState<NameHistoryEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  const [playerMatches, setPlayerMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.user) return;
    const meta = auth.user.user_metadata || {};
    setDisplayName(String(meta.display_name || auth.user.email || ''));
    setCodmNickname(String(meta.player_nickname || meta.codm_nickname || ''));
    setUidCodm(String(meta.codm_uid || ''));
    setAvatarUrl(String(meta.avatar_url || ''));
    setDescription(String(meta.description || meta.codm_description || ''));
    setSocialInstagram(String(meta.social_instagram || ''));
    setSocialTikTok(String(meta.social_tiktok || ''));
    setSocialYouTube(String(meta.social_youtube || ''));
    setSocialDiscord(String(meta.social_discord || ''));
    setProfileNotes(String(meta.profile_notes || ''));
    try {
      setHistory(JSON.parse(localStorage.getItem(historyKey(auth.user.id)) || '[]'));
    } catch {
      setHistory([]);
    }
    void loadLinkedPlayer();
  }, [auth.user?.id]);

  async function loadLinkedPlayer() {
    if (!auth.user?.id) return;
    const { data: roster } = await supabase.from('players').select('id,nickname,avatar_url,uid_codm').order('nickname');
    setPlayers((roster || []) as PlayerLite[]);
    const linked = (roster || []).find((p: any) => p.user_id === auth.user?.id || p.uid_codm === auth.user?.user_metadata?.codm_uid);
    if (linked?.id) setLinkedPlayerId(linked.id);
  }

  useEffect(() => { void loadIndividualStats(); }, [linkedPlayerId]);

  async function loadIndividualStats() {
    if (!linkedPlayerId) { setPlayerStats([]); setPlayerMatches([]); return; }
    const { data: statsRows } = await supabase.from('match_player_stats').select('*, matches(id,mode,map_name,result,match_date)').eq('player_id', linkedPlayerId).limit(500);
    const { data: rowRows } = await supabase.from('match_scoreboard_rows').select('*, matches(id,mode,map_name,result,match_date)').eq('player_id', linkedPlayerId).limit(500);
    setPlayerStats((statsRows || []) as any[]);
    setPlayerMatches((rowRows || []) as any[]);
  }

  function addHistory(oldName: string, newName: string, source = 'profilo') {
    if (!auth.user?.id || oldName.trim() === newName.trim()) return;
    const entry: NameHistoryEntry = { at: new Date().toISOString(), oldName, newName, source };
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    try { localStorage.setItem(historyKey(auth.user.id), JSON.stringify(next)); } catch {}
    // Tentativo opzionale: se la tabella non esiste non blocca la pagina.
    void supabase.from('player_name_history').insert({ user_id: auth.user.id, old_name: oldName, new_name: newName, source }).then(() => undefined);
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !auth.user?.id) return;
    setLoading(true);
    setMessage('Carico foto profilo...');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${auth.user.id}/avatar-${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('codm-screenshots').upload(path, file, { upsert: true });
      if (error) throw error;
      const url = supabase.storage.from('codm-screenshots').getPublicUrl(path).data.publicUrl;
      setAvatarUrl(url);
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      if (linkedPlayerId) await supabase.from('players').update({ avatar_url: url }).eq('id', linkedPlayerId);
      setMessage('Foto profilo aggiornata.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento foto.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!auth.user) return;
    setLoading(true);
    setMessage('Salvataggio profilo...');
    try {
      const oldCodm = String(auth.user.user_metadata?.player_nickname || auth.user.user_metadata?.codm_nickname || '');
      await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          player_nickname: codmNickname,
          codm_nickname: codmNickname,
          codm_uid: uidCodm,
          avatar_url: avatarUrl,
          description,
          codm_description: description,
          social_instagram: socialInstagram,
          social_tiktok: socialTikTok,
          social_youtube: socialYouTube,
          social_discord: socialDiscord,
          profile_notes: profileNotes,
        }
      });
      addHistory(oldCodm, codmNickname, 'profilo_utente');
      if (linkedPlayerId) {
        await supabase.from('players').update({ nickname: codmNickname || null, uid_codm: uidCodm || null, avatar_url: avatarUrl || null }).eq('id', linkedPlayerId);
      }
      setMessage('Profilo salvato.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore salvataggio profilo.');
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) return setMessage('Password nuova: minimo 6 caratteri.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setMessage('Password aggiornata.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore modifica password.');
    } finally {
      setLoading(false);
    }
  }

  const individualSummary = useMemo(() => {
    const source = playerMatches.length ? playerMatches : playerStats;
    const matches = source.length;
    const kills = source.reduce((sum, row) => sum + Number(row.kills || 0), 0);
    const deaths = source.reduce((sum, row) => sum + Number(row.deaths || 0), 0);
    const assists = source.reduce((sum, row) => sum + Number(row.assists || 0), 0);
    const mvp = source.filter((row) => Number(row.team_rank || row.rank_position || 0) === 1 || row.mvp_type).length;
    const wins = source.filter((row) => String(row.matches?.result || row.result || '').toUpperCase() === 'WIN').length;
    return { matches, kills, deaths, assists, mvp, wins, kd: deaths ? (kills / deaths).toFixed(2) : String(kills) };
  }, [playerStats, playerMatches]);

  if (auth.loading) return <main className="container"><div className="card">Caricamento profilo...</div></main>;
  if (!auth.user) return <main className="container"><div className="card"><h1>Profilo</h1><p>Accedi per modificare profilo, foto e password.</p><a className="btn" href="/login">Login</a></div></main>;

  return (
    <main className="container wide ak-page-compact">
      <section className="card ak-section-head profile-page-hero">
        <div>
          <p className="eyebrow">🪪 Profilo account</p>
          <h1>Profilo, foto e storico nome gioco</h1>
          <p className="muted">Gestisci account, nickname CODM, foto profilo, password e collegamento al roster.</p>
        </div>
        <div className="profile-avatar-card">
          {avatarUrl ? <img src={avatarUrl} alt="Foto profilo" /> : <div className="profile-avatar-placeholder">AK</div>}
          <input className="input" type="file" accept="image/*" onChange={(e) => void uploadAvatar(e.target.files?.[0] || null)} />
        </div>
      </section>

      <section className="card top-gap profile-import-shortcut"><div><strong>Import profilo CODM</strong><p className="muted">Carica screenshot profilo e aggiorna dati/Leggendario dal tuo account.</p></div><a className="btn" href="/import/profile">🖼️ Importa dati profilo</a></section>

      {message && <div className="notice top-gap">{message}</div>}

      <section className="grid grid-2 top-gap profile-settings-grid">
        <div className="card">
          <h2>Dati profilo</h2>
          <div className="form">
            <div className="field"><label>Email</label><input className="input" value={auth.user.email || ''} disabled /></div>
            <div className="field"><label>Nome visualizzato</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <div className="grid grid-2">
              <div className="field"><label>Nome gioco CODM</label><input className="input" value={codmNickname} onChange={(e) => setCodmNickname(e.target.value)} /></div>
              <div className="field"><label>UID CODM</label><input className="input" value={uidCodm} onChange={(e) => setUidCodm(e.target.value)} /></div>
            </div>
            <div className="field"><label>Collega giocatore roster</label><select className="select" value={linkedPlayerId} onChange={(e) => setLinkedPlayerId(e.target.value)}><option value="">Nessun collegamento</option>{players.map((player) => <option key={player.id} value={player.id}>{player.nickname}</option>)}</select></div>
            <div className="field"><label>Descrizione profilo</label><textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ruolo, stile di gioco, orari, specialità..." /></div>
            <div className="profile-social-grid">
              <div className="field"><label>📸 Instagram</label><input className="input" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} placeholder="link o username" /></div>
              <div className="field"><label>🎵 TikTok</label><input className="input" value={socialTikTok} onChange={(e) => setSocialTikTok(e.target.value)} placeholder="link o username" /></div>
              <div className="field"><label>▶️ YouTube</label><input className="input" value={socialYouTube} onChange={(e) => setSocialYouTube(e.target.value)} placeholder="link canale" /></div>
              <div className="field"><label>💬 Discord</label><input className="input" value={socialDiscord} onChange={(e) => setSocialDiscord(e.target.value)} placeholder="server o username" /></div>
            </div>
            <div className="field"><label>Note private</label><textarea className="input" rows={3} value={profileNotes} onChange={(e) => setProfileNotes(e.target.value)} placeholder="Note admin/personali, preferenze, disponibilità..." /></div>
            <button className="btn" type="button" disabled={loading} onClick={saveProfile}>💾 Salva profilo</button>
          </div>
        </div>

        <div className="card">
          <h2>Password</h2>
          <div className="form">
            <div className="field"><label>Nuova password</label><input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="minimo 6 caratteri" /></div>
            <button className="btn secondary" type="button" disabled={loading} onClick={changePassword}>🔐 Modifica password</button>
          </div>
          <h2 className="top-gap">Storico cambio nome gioco</h2>
          <div className="name-history-list">
            {history.length ? history.map((entry, index) => <div className="name-history-row" key={`${entry.at}-${index}`}><strong>{entry.oldName || '-'}</strong><span>→</span><strong>{entry.newName || '-'}</strong><small>{new Date(entry.at).toLocaleString('it-IT')} · {entry.source}</small></div>) : <p className="muted">Nessun cambio nome registrato da questo dispositivo.</p>}
          </div>
        </div>
      </section>

      <section className="card top-gap">
        <div className="section-title"><div><p className="eyebrow">📊 Statistiche individuali</p><h2>Riepilogo del tuo profilo CODM</h2></div><a className="btn small secondary" href="/import/profile">Importa profilo</a></div>
        <div className="grid grid-6 top-gap">
          <div className="kpi"><span>Partite</span><strong>{individualSummary.matches}</strong></div>
          <div className="kpi"><span>Vittorie</span><strong>{individualSummary.wins}</strong></div>
          <div className="kpi"><span>Kill</span><strong>{individualSummary.kills}</strong></div>
          <div className="kpi"><span>Death</span><strong>{individualSummary.deaths}</strong></div>
          <div className="kpi"><span>Assist</span><strong>{individualSummary.assists}</strong></div>
          <div className="kpi"><span>MVP / K-D</span><strong>{individualSummary.mvp} / {individualSummary.kd}</strong></div>
        </div>
        <div className="table-scroll top-gap">
          <table className="table compact"><thead><tr><th>Data</th><th>Modalità</th><th>Mappa</th><th>Esito</th><th>K/D/A</th><th>Rank</th></tr></thead><tbody>
            {playerMatches.slice(0, 20).map((row) => <tr key={row.id}><td>{row.matches?.match_date ? new Date(row.matches.match_date).toLocaleDateString('it-IT') : '-'}</td><td>{row.matches?.mode || '-'}</td><td>{row.matches?.map_name || '-'}</td><td>{row.matches?.result || '-'}</td><td>{row.kills || 0}/{row.deaths || 0}/{row.assists || 0}</td><td>{row.team_rank || '-'}</td></tr>)}
            {!playerMatches.length && <tr><td colSpan={6} className="muted">Nessuna statistica individuale collegata a questo player.</td></tr>}
          </tbody></table>
        </div>
      </section>
    </main>
  );
}
