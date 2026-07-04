'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth, type CodmRole } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';

type Member = {
  id: string;
  user_id: string;
  role: CodmRole;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

type RequestRow = {
  id: string;
  nickname: string;
  uid_codm: string | null;
  social_contact: string | null;
  status: string;
  created_at: string;
};

const roleOptions: CodmRole[] = ['viewer', 'player', 'staff', 'coach', 'owner'];

export default function AdminUsersPage() {
  const auth = useCodmAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.canManageUsers && auth.clanId) void load();
  }, [auth.canManageUsers, auth.clanId]);

  async function load() {
    if (!auth.clanId) return;
    setLoading(true);
    const { data: memberData } = await supabase
      .from('clan_members')
      .select('id,user_id,role,created_at, profiles(display_name)')
      .eq('clan_id', auth.clanId)
      .order('created_at', { ascending: false });
    const { data: requestData } = await supabase
      .from('clan_invite_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setMembers((memberData || []) as Member[]);
    setRequests((requestData || []) as RequestRow[]);
    setLoading(false);
  }

  async function changeRole(memberId: string, role: CodmRole) {
    const { error } = await supabase.from('clan_members').update({ role }).eq('id', memberId);
    setMessage(error ? error.message : 'Ruolo aggiornato.');
    await load();
  }

  async function approveRequest(row: RequestRow, role: CodmRole = 'player') {
    if (!auth.clanId) return;
    setMessage('');
    const { data: createdPlayer, error: playerError } = await supabase
      .from('players')
      .insert({
        clan_id: auth.clanId,
        nickname: row.nickname,
        uid_codm: row.uid_codm,
        clan_name: auth.clanName,
        status: 'active',
        notes: `Creato da richiesta registrazione. Contatto: ${row.social_contact || '-'}`
      })
      .select('id')
      .single();

    if (playerError) return setMessage(playerError.message);

    const { error } = await supabase
      .from('clan_invite_requests')
      .update({ status: 'approved', linked_player_id: createdPlayer?.id || null, approved_at: new Date().toISOString(), approved_by: auth.user?.id })
      .eq('id', row.id);

    setMessage(error ? error.message : `Richiesta approvata come ${role}. Ora assegna il ruolo account se il player ha già fatto login.`);
    await load();
  }

  async function createInviteNote() {
    setMessage('Per aggiungere un utente tramite email: fallo registrare da /login. Poi, quando appare tra richieste/profili, assegna ruolo qui.');
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.canManageUsers) return <WriteAccessBlock role={auth.role} title="Solo Owner può gestire utenti" description="Staff e Coach possono caricare risultati, ma solo Owner assegna ruoli e permessi." />;

  return (
    <main className="page-shell admin-page">
      <section className="card">
        <p className="eyebrow">Owner panel</p>
        <h1>Utenti e permessi</h1>
        <p className="muted">Qui assegni il livello accesso degli utenti registrati. Le modifiche dati restano bloccate dal DB se il ruolo non è staff/coach/owner.</p>
        {message && <div className="notice top-gap">{message}</div>}
      </section>

      <section className="card top-gap">
        <h2>Invita nuovo player</h2>
        <p className="muted">Il metodo semplice è: player si registra con email da /login, poi invia profilo da /profile-import. Dopo approvi qui.</p>
        <div className="inline-form">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email player da avvisare" />
          <button className="btn secondary" type="button" onClick={createInviteNote}>Istruzioni</button>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Richieste player</h2>
        {loading && <p className="muted">Caricamento...</p>}
        <div className="responsive-table">
          <table>
            <thead><tr><th>Nickname</th><th>UID</th><th>Contatto</th><th>Stato</th><th>Azione</th></tr></thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id}>
                  <td>{row.nickname}</td>
                  <td>{row.uid_codm || '-'}</td>
                  <td>{row.social_contact || '-'}</td>
                  <td>{row.status}</td>
                  <td>{row.status === 'pending' ? <button className="btn small" onClick={() => approveRequest(row)}>Approva player</button> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card top-gap">
        <h2>Membri clan</h2>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Utente</th><th>User ID</th><th>Ruolo</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.profiles?.display_name || 'Utente registrato'}</td>
                  <td><code>{m.user_id}</code></td>
                  <td>
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as CodmRole)}>
                      {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
