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
  email?: string | null;
  codm_uid?: string | null;
  player_nickname?: string | null;
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

type ProfileRow = {
  id: string;
  display_name: string | null;
  player_nickname: string | null;
  codm_uid: string | null;
  email?: string | null;
  created_at?: string | null;
};

const roleOptions: CodmRole[] = ['viewer', 'player', 'staff', 'coach', 'owner'];

export default function AdminUsersPage() {
  const auth = useCodmAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingRequests = useMemo(() => requests.filter((row) => row.status === 'pending'), [requests]);
  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const pendingUserIds = useMemo(() => new Set(requests.map((r) => r.user_id).filter(Boolean) as string[]), [requests]);
  const registeredWithoutRequest = useMemo(
    () => profiles.filter((p) => !memberIds.has(p.id) && !pendingUserIds.has(p.id)),
    [profiles, memberIds, pendingUserIds]
  );

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

      const rawMembers = (memberData || []) as Array<Omit<Member, 'display_name' | 'codm_uid' | 'player_nickname'>>;
      const userIds = rawMembers.map((m) => m.user_id).filter(Boolean);
      let profileMap = new Map<string, ProfileRow>();
      if (userIds.length) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id,email,display_name,player_nickname,codm_uid,created_at')
          .in('id', userIds);
        profileMap = new Map((profileData || []).map((p: any) => [p.id, p as ProfileRow]));
      }
      setMembers(rawMembers.map((m) => ({ ...m, ...(profileMap.get(m.user_id) || {}) })) as Member[]);

      const { data: requestData, error: requestError } = await supabase
        .from('clan_invite_requests')
        .select('id,clan_id,user_id,nickname,uid_codm,social_contact,status,linked_player_id,created_at')
        .eq('clan_id', auth.clanId)
        .order('created_at', { ascending: false })
        .limit(300);
      if (requestError) throw requestError;
      setRequests((requestData || []) as RequestRow[]);

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id,email,display_name,player_nickname,codm_uid,created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      setProfiles((profileRows || []) as ProfileRow[]);
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
      const finalNickname = row.nickname || row.social_contact || 'Player registrato';
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('clan_id', auth.clanId)
        .eq('nickname', finalNickname)
        .maybeSingle();

      let playerId = existingPlayer?.id as string | undefined;
      if (!playerId) {
        const { data: createdPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            clan_id: auth.clanId,
            nickname: finalNickname,
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
          { clan_id: auth.clanId, user_id: row.user_id, role },
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
      setMessage(`Richiesta approvata come ${roleLabel(role)}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Errore approvazione richiesta.');
    }
  }

  async function approveProfile(profile: ProfileRow, role: CodmRole = 'player') {
    if (!auth.clanId) return;
    const nickname = profile.player_nickname || profile.display_name || 'Player registrato';
    const { error } = await supabase.from('clan_invite_requests').insert({
      clan_id: auth.clanId,
      user_id: profile.id,
      nickname,
      uid_codm: profile.codm_uid,
      social_contact: profile.email || null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    await load();
    const created = await supabase
      .from('clan_invite_requests')
      .select('id,clan_id,user_id,nickname,uid_codm,social_contact,status,linked_player_id,created_at')
      .eq('clan_id', auth.clanId)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (created.data) await approveRequest(created.data as RequestRow, role);
  }

  if (auth.loading) return <WriteAccessBlock loading />;
  if (!auth.canManageUsers) {
    return <WriteAccessBlock role={auth.role} title="Solo Owner può gestire utenti" description="Staff e Coach possono caricare risultati, ma solo Owner assegna ruoli e permessi." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-cyan-400/20 bg-slate-900/80 p-6">
          <div className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">Owner panel</div>
          <h1 className="mt-2 text-3xl font-black">Utenti, registrazioni e permessi</h1>
          <p className="mt-2 text-slate-300">Approva nuovi player registrati con email e assegna accesso: viewer, player, staff, coach, owner.</p>
          <button onClick={() => void load()} className="mt-4 rounded-2xl bg-cyan-400 px-4 py-2 font-black text-slate-950">Aggiorna lista</button>
          {message && <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">{message}</div>}
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black">Da approvare</h2>
          <p className="text-sm text-slate-400">Utenti registrati da email, login o import profilo.</p>
          {loading && <p className="mt-4 text-slate-300">Caricamento...</p>}
          {!loading && pendingRequests.length === 0 && <p className="mt-4 rounded-2xl border border-white/10 p-4 text-slate-300">Nessuna richiesta pending.</p>}
          <div className="mt-4 grid gap-3">
            {pendingRequests.map((row) => (
              <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
                <div><div className="text-xs text-slate-500">Nickname</div><div className="font-black">{row.nickname}</div></div>
                <div><div className="text-xs text-slate-500">UID</div><div>{row.uid_codm || '-'}</div></div>
                <div><div className="text-xs text-slate-500">Contatto</div><div>{row.social_contact || '-'}</div></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void approveRequest(row, 'player')} className="rounded-xl bg-emerald-400 px-3 py-2 font-black text-slate-950">Player</button>
                  <button onClick={() => void approveRequest(row, 'staff')} className="rounded-xl bg-cyan-400 px-3 py-2 font-black text-slate-950">Staff</button>
                  <button onClick={() => void approveRequest(row, 'coach')} className="rounded-xl bg-violet-400 px-3 py-2 font-black text-slate-950">Coach</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {registeredWithoutRequest.length > 0 && (
          <section className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/5 p-5">
            <h2 className="text-2xl font-black">Registrati senza richiesta</h2>
            <p className="text-sm text-slate-400">Questi account hanno profilo, ma non sono ancora in clan_members né pending.</p>
            <div className="mt-4 grid gap-3">
              {registeredWithoutRequest.map((profile) => (
                <div key={profile.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                  <div><div className="text-xs text-slate-500">Nome registrazione</div><div className="font-black">{profile.display_name || profile.id}</div><div className="text-xs text-slate-400">{profile.email || '-'}</div></div>
                  <div><div className="text-xs text-slate-500">Nome giocatore / UID</div><div>{profile.player_nickname || '-'} / {profile.codm_uid || '-'}</div></div>
                  <button onClick={() => void approveProfile(profile, 'player')} className="rounded-xl bg-emerald-400 px-3 py-2 font-black text-slate-950">Approva come player</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black">Membri clan</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-slate-400"><tr><th>Email</th><th>Nome registrato</th><th>Nome giocatore</th><th>UID</th><th>Ruolo</th><th>Permesso</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="bg-slate-900">
                    <td className="rounded-l-2xl p-3 text-sm">{member.email || '-'}</td>
                    <td className="p-3 font-bold">{member.display_name || 'Utente registrato'}</td>
                    <td className="p-3">{member.player_nickname || '-'}</td>
                    <td className="p-3">{member.codm_uid || '-'}</td>
                    <td className="p-3">
                      <select value={member.role} onChange={(event) => void changeRole(member.id, event.target.value as CodmRole)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white">
                        {roleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                      </select>
                    </td>
                    <td className="rounded-r-2xl p-3">{['owner', 'coach', 'staff'].includes(member.role) ? 'Può modificare/caricare' : 'Sola lettura / profilo'}</td>
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
