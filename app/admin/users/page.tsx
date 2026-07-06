'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCodmAuth, roleLabel, type CodmRole } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';

type AdminUserRow = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  display_name?: string | null;
  player_nickname?: string | null;
  codm_uid?: string | null;
  member_id?: string | null;
  role: CodmRole | 'registered';
  player_id?: string | null;
  roster_status?: string | null;
  clan_name?: string | null;
  pending_request_id?: string | null;
  pending_status?: string | null;
};

type Diagnostics = {
  auth_users: number;
  profiles: number;
  clan_members: number;
  roster_players: number;
  pending_requests: number;
  synced: number;
  service_role: boolean;
  requester?: string | null;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  message?: string;
  users?: AdminUserRow[];
  diagnostics?: Diagnostics;
  clan?: { id: string; name?: string | null; tag?: string | null };
};

const roleOptions: CodmRole[] = ['viewer', 'player', 'staff', 'coach', 'owner'];
const statusOptions = ['active', 'tryout', 'bench', 'inactive'];

function dateLabel(value?: string | null) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('it-IT'); } catch { return '-'; }
}

function roleBadgeClass(role: string) {
  if (role === 'owner') return 'loaded';
  if (role === 'coach' || role === 'staff') return 'played';
  return '';
}

export default function AdminUsersPage() {
  const auth = useCodmAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [clanLabel, setClanLabel] = useState('AK47DX');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const token = auth.session?.access_token || '';

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${response.status}`);
    return data as ApiResponse;
  }, [token]);

  const load = useCallback(async (sync = false) => {
    if (!token) return;
    setLoading(true);
    setMessage(sync ? 'Sincronizzo utenti registrati con roster e ruoli...' : '');
    try {
      const data = await apiFetch(`/api/admin/users${sync ? '?sync=1' : ''}`);
      setUsers(data.users || []);
      setDiagnostics(data.diagnostics || null);
      setClanLabel(`${data.clan?.tag || data.clan?.name || 'AK47DX'}`);
      if (sync || data.diagnostics?.synced) setMessage(`Lista aggiornata. Sync completato: ${data.diagnostics?.synced || 0} utenti.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento utenti.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => {
    if (auth.canManageUsers && token) void load(false);
  }, [auth.canManageUsers, token, load]);

  const filteredUsers = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return users;
    return users.filter((row) => [row.email, row.display_name, row.player_nickname, row.codm_uid, row.role, row.clan_name]
      .some((value) => String(value || '').toLowerCase().includes(clean)));
  }, [users, query]);

  const needsSync = useMemo(() => users.filter((user) => !user.player_id || !user.member_id).length, [users]);

  async function syncAll() {
    if (!token) return;
    setSyncing(true);
    setMessage('Sync completo in corso: Auth → Profili → Roster → Ruoli...');
    try {
      const result = await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'syncAll' }) });
      setMessage(result.message || 'Sync completato.');
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore sync utenti.');
    } finally {
      setSyncing(false);
    }
  }

  async function updateRole(row: AdminUserRow, role: CodmRole) {
    setMessage('Aggiorno ruolo...');
    try {
      const result = await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'updateRole', userId: row.id, role, email: row.email }) });
      setMessage(result.message || 'Ruolo aggiornato.');
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore aggiornamento ruolo.');
    }
  }

  async function updateRosterStatus(row: AdminUserRow, status: string) {
    if (!row.player_id) return setMessage('Prima sincronizza il player nel roster.');
    setMessage('Aggiorno stato roster...');
    try {
      const result = await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'setRosterStatus', playerId: row.player_id, status }) });
      setMessage(result.message || 'Stato roster aggiornato.');
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore aggiornamento stato roster.');
    }
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.canManageUsers) {
    return <WriteAccessBlock role={auth.role} title="Solo Owner può gestire utenti" description="L’admin principale è hasnaiiin@gmail.com. Da questa pagina si vedono utenti registrati, roster e ruoli solo con permesso Owner." />;
  }

  return (
    <main className="container wide admin-users-stable">
      <section className="card ak-section-head">
        <p className="eyebrow">🔐 Clan Manager Owner Center</p>
        <h1>Gestione utenti, ruoli e roster</h1>
        <p className="muted">Lista reale da Supabase Auth tramite API sicura server. Qui vedi utenti registrati, profili, membri clan e roster collegato.</p>
        <div className="top-gap admin-toolbar-v69">
          <button className="btn small" onClick={() => void load(false)} disabled={loading}>{loading ? 'Carico...' : 'Aggiorna lista'}</button>
          <button className="btn small secondary" onClick={() => void syncAll()} disabled={syncing}>{syncing ? 'Sync...' : 'Sincronizza Auth → Roster'}</button>
          <input className="input admin-search-v69" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca email, nome, nickname, UID, ruolo..." />
        </div>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="grid grid-4 top-gap admin-diagnostic-grid-v69">
        <div className="card"><p className="eyebrow">Clan</p><h2>{clanLabel}</h2><p className="muted">TAG ufficiale assegnato ai player.</p></div>
        <div className="card"><p className="eyebrow">Auth users</p><h2>{diagnostics?.auth_users ?? '-'}</h2><p className="muted">Account registrati reali.</p></div>
        <div className="card"><p className="eyebrow">Roster</p><h2>{diagnostics?.roster_players ?? '-'}</h2><p className="muted">Giocatori presenti nel roster.</p></div>
        <div className="card"><p className="eyebrow">Da sincronizzare</p><h2>{needsSync}</h2><p className="muted">Account senza membro o player collegato.</p></div>
      </section>

      <section className="card top-gap">
        <div className="section-title">
          <div>
            <h2>Utenti registrati</h2>
            <p className="muted">Cambia ruolo e stato roster. hasnaiiin@gmail.com resta sempre Owner.</p>
          </div>
          <span className="match-status-pill loaded">{filteredUsers.length} utenti</span>
        </div>

        {loading && <p className="notice top-gap">Caricamento lista utenti...</p>}
        {!loading && !filteredUsers.length && <p className="empty-state">Nessun utente visibile. Controlla SUPABASE_SERVICE_ROLE_KEY in Vercel e premi Sincronizza.</p>}

        <div className="admin-users-list-v69 top-gap">
          {filteredUsers.map((row) => (
            <article key={row.id} className="admin-user-card-v69">
              <div className="admin-user-main-v69">
                <div>
                  <div className="eyebrow">Account</div>
                  <h3>{row.player_nickname || row.display_name || row.email || 'Utente registrato'}</h3>
                  <p className="muted">{row.email || '-'} · UID {row.codm_uid || '-'}</p>
                </div>
                <div className="admin-user-badges-v69">
                  <span className={`match-status-pill ${roleBadgeClass(row.role)}`}>{row.role === 'registered' ? 'Registrato' : roleLabel(row.role as CodmRole)}</span>
                  <span className={`match-status-pill ${row.player_id ? 'loaded' : ''}`}>{row.player_id ? 'Nel roster' : 'No roster'}</span>
                  <span className={`match-status-pill ${row.member_id ? 'played' : ''}`}>{row.member_id ? 'Membro clan' : 'No membro'}</span>
                </div>
              </div>

              <div className="grid grid-4 top-gap">
                <div className="field"><label>Nome registrato</label><input className="input" value={row.display_name || '-'} disabled /></div>
                <div className="field"><label>Nome in gioco</label><input className="input" value={row.player_nickname || '-'} disabled /></div>
                <div className="field"><label>Data registrazione</label><input className="input" value={dateLabel(row.created_at)} disabled /></div>
                <div className="field"><label>Ultimo accesso</label><input className="input" value={dateLabel(row.last_sign_in_at)} disabled /></div>
              </div>

              <div className="grid grid-3 top-gap">
                <div className="field">
                  <label>Ruolo app</label>
                  <select className="select" value={row.role === 'registered' ? 'player' : row.role} disabled={row.email?.toLowerCase() === 'hasnaiiin@gmail.com'} onChange={(event) => void updateRole(row, event.target.value as CodmRole)}>
                    {roleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                  </select>
                  {row.email?.toLowerCase() === 'hasnaiiin@gmail.com' && <small className="muted">Admin principale bloccato come Owner.</small>}
                </div>
                <div className="field">
                  <label>Stato roster</label>
                  <select className="select" value={row.roster_status || 'active'} onChange={(event) => void updateRosterStatus(row, event.target.value)}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>TAG clan</label>
                  <input className="input" value={row.clan_name || clanLabel} disabled />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card top-gap">
        <h2>Diagnostica rilascio stabile</h2>
        <p className="muted">Se la lista resta vuota, quasi sempre manca <b>SUPABASE_SERVICE_ROLE_KEY</b> su Vercel o non è stato eseguito lo SQL V6.9.</p>
        <pre className="diagnostic-pre-v69">{JSON.stringify(diagnostics || {}, null, 2)}</pre>
      </section>
    </main>
  );
}
