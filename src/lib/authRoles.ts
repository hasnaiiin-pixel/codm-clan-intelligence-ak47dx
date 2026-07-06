'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { loadClanIdentity, clanDisplayName } from '@/lib/clanIdentity';

export type CodmRole = 'anon' | 'registered' | 'viewer' | 'player' | 'staff' | 'coach' | 'owner';

export type CodmAuthState = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  clanId: string | null;
  clanName: string;
  role: CodmRole;
  canView: boolean;
  canWrite: boolean;
  canManageUsers: boolean;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WRITE_ROLES: CodmRole[] = ['owner', 'coach', 'staff'];
const USER_MANAGEMENT_ROLES: CodmRole[] = ['owner'];

export function canWriteRole(role: CodmRole) {
  return WRITE_ROLES.includes(role);
}

export function canManageUsersRole(role: CodmRole) {
  return USER_MANAGEMENT_ROLES.includes(role);
}

export function roleLabel(role: CodmRole) {
  const labels: Record<CodmRole, string> = {
    anon: 'Visitatore',
    registered: 'Registrato senza ruolo',
    viewer: 'Viewer',
    player: 'Player',
    staff: 'Staff',
    coach: 'Coach',
    owner: 'Owner/Admin'
  };
  return labels[role] || role;
}

async function getFirstClan() {
  const identity = await loadClanIdentity();
  return {
    clanId: identity.clanId,
    clanName: clanDisplayName(identity)
  };
}

async function getRoleForUser(userId: string, clanId: string | null): Promise<CodmRole> {
  if (!clanId) return 'registered';

  const { data, error } = await supabase
    .from('clan_members')
    .select('role')
    .eq('clan_id', clanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return 'registered';
  return (data?.role as CodmRole) || 'registered';
}

export function useCodmAuth(): CodmAuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [clanId, setClanId] = useState<string | null>(null);
  const [clanName, setClanName] = useState('AK47DX');
  const [role, setRole] = useState<CodmRole>('anon');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const activeSession = sessionData.session;
      setSession(activeSession);

      const clan = await getFirstClan();
      setClanId(clan.clanId);
      setClanName(clan.clanName);

      if (!activeSession?.user?.id) {
        setRole('anon');
      } else {
        setRole(await getRoleForUser(activeSession.user.id, clan.clanId));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void reload();
    });
    return () => data.subscription.unsubscribe();
  }, [reload]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await reload();
    window.location.href = '/dashboard';
  }, [reload]);

  return useMemo(() => ({
    loading,
    configured: isSupabaseConfigured,
    session,
    user: session?.user || null,
    clanId,
    clanName,
    role,
    canView: true,
    canWrite: canWriteRole(role),
    canManageUsers: canManageUsersRole(role),
    reload,
    signOut
  }), [loading, session, clanId, clanName, role, reload, signOut]);
}
