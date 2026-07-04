'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCodmAuth, roleLabel, type CodmRole } from '@/lib/authRoles';
import { WriteAccessBlock } from '@/components/WriteAccessBlock';

type Member = {
  id: string;
  user_id: string;
  role: CodmRole;
  created_at: string;
  display_name?: string | null;
};

type RequestRow = {
  id: string;
  clan_id: string;
  user_id: string | null;
  nickname: string;
  uid_codm: string | null;
  social_contact: string | null;
  status: string;
  linked_player_id: string | null;
  created_at: string;
};

const roleOptions: CodmRole[] = ['viewer', 'player', 'staff', 'coach', 'owner'];

export default function AdminUsersPage() {
  const auth = useCodmAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingRequests = useMemo(() => requests.filter((row) => row.status === 'pending'), [requests]);

  const load = useCallback(async () => {
    if (!auth.clanId) return;
    setLoading(true);
    setMessage('');
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('clan_members')
        .select('id,user_id,role,created_at')
        .eq('clan_id', auth.clanId)
        .order('created_at', { ascending: false });
      if (memberError) throw memberError;

      const rawMembers = (memberData || []) as Array<Omit<Member, 'display_name'>>;
      const userIds = rawMembers.map((m) => m.user_id).filter(Boolean);
      let profileMap = new Map<string, string | null>();
      if (userIds.length) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id,display_name')
          .in('id', userIds);
        profileMap = new Map((profileData || []).map((p: any) => [p.id, p.display_name || null]));
      }

      setMembers(rawMembers.map((m) => ({ ...m, display_name: profileMap.get(m.user_id) || null })) as Member[]);

      const { data: requestData, error: requestError } = await supabase
        .from('clan_invite_requests')
        .select('id,clan_id,user_id,nickname,uid_codm,social_contact,status,linked_player_id,created_at')
        .eq('clan_id', auth.clanId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (requestError) throw requestError;
      setRequests((requestData || []) as RequestRow[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore caricamento utenti.');
    } finally {
      setLoading(false);
    }
  }, [auth.clanId]);

  useEffect(() => {
    if (auth.canManageUsers && auth.clanId) void load();
  }, [auth.canManageUsers, auth.clanId, load]);

  async function changeRole(memberId: string, role: CodmRole) {
    const { error } = await supabase.from('clan_members').update({ role }).eq('id', memberId);
    setMessage(error ? error.message : 'Ruolo aggiornato.');
    await load();
  }

  async function approveRequest(row: RequestRow, role: CodmRole = 'player') {
    if (!auth.clanId) return;
    setMessage('');
    try {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('clan_id', auth.clanId)
        .eq('nickname', row.nickname)
        .maybeSingle();

      let playerId = existingPlayer?.id as string | undefined;
      if (!playerId) {
        const { data: createdPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            clan_id: auth.clanId,
            nickname: row.nickname,
            uid_codm: row.uid_codm,
            clan_name: auth.clanName,
            status: 'active',
            notes: `Creato da registrazione player. Contatto: ${row.social_contact || '-'}`,
          })
          .select('id')
          .single();
        if (playerError) throw playerError;
        playerId = createdPlayer?.id as string | undefined;
      }

      if (row.user_id) {
        const { error: memberError } = await supabase.from('clan_members').upsert(
          {
            clan_id: auth.clanId,
            user_id: row.user_id,
            role,
          },
          { onConflict: 'clan_id,user_id' }
        );
        if (memberError) throw memberError;
      }

      const { error } = await supabase
        .from('clan_invite_requests')
        .update({
          status: 'approved',
          linked_player_id: playerId || null,
          approved_at: new Date().toISOString(),
          approved_by: auth.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw error;
      setMessage(`Richiesta approvata come ${role}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore approvazione richiesta.');
    }
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.canManageUsers) {
    return (
      <WriteAccessBlock
        role={auth.role}
        title="Solo Owner può gestire utenti"
        description="Staff e Coach possono caricare risultati, ma solo Owner assegna ruoli e permessi."
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Owner panel</p>
          <h1 className="mt-3 text-3xl font-black">Utenti e permessi</h1>
          <p className="mt-2 text-slate-300">Qui approvi player registrati e assegni il livello accesso: viewer, player, staff, coach, owner.</p>
          <button onClick={() => void load()} className="mt-4 rounded-2xl bg-cyan-400 px-4 py-2 font-black text-slate-950">Aggiorna lista</button>
          {message && <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-200">{message}</div>}
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Da approvare</h2>
          <p className="mt-1 text-sm text-slate-400">Nuovi player registrati da /login e profili inviati da /profile-import.</p>
          {loading && <p className="mt-4 text-slate-300">Caricamento...</p>}
          {!loading && pendingRequests.length === 0 && <p className="mt-4 text-slate-400">Nessuna richiesta pending.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-3">Nickname</th>
                  <th className="p-3">UID</th>
                  <th className="p-3">Contatto</th>
                  <th className="p-3">Ruolo rapido</th>
                  <th className="p-3">Azione</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((row) => (
                  <tr key={row.id} className="border-t border-white/10">
                    <td className="p-3 font-bold">{row.nickname}</td>
                    <td className="p-3 text-slate-300">{row.uid_codm || '-'}</td>
                    <td className="p-3 text-slate-300">{row.social_contact || '-'}</td>
                    <td className="p-3 text-slate-300">Player</td>
                    <td className="p-3">
                      <button onClick={() => void approveRequest(row, 'player')} className="rounded-xl bg-emerald-400 px-3 py-2 font-black text-slate-950">Approva player</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">Membri clan</h2>
          <p className="mt-1 text-sm text-slate-400">Modifica ruolo account. Solo staff/coach/owner può scrivere dati.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-3">Utente</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Ruolo</th>
                  <th className="p-3">Permesso</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-t border-white/10">
                    <td className="p-3 font-bold">{member.display_name || 'Utente registrato'}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">{member.user_id}</td>
                    <td className="p-3">
                      <select value={member.role} onChange={(event) => void changeRole(member.id, event.target.value as CodmRole)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white">
                        {roleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-slate-300">{['owner', 'coach', 'staff'].includes(member.role) ? 'Può modificare/caricare' : 'Sola lettura / profilo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
