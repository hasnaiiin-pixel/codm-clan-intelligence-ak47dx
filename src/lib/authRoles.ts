'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { loadClanIdentity, clanDisplayName, cacheClanIdentity } from '@/lib/clanIdentity';

export type CodmRole = 'anon' | 'registered' | 'viewer' | 'player' | 'staff' | 'coach' | 'owner';
export type CodmPermissionKey =
  | 'view_events'
  | 'create_events'
  | 'edit_events'
  | 'delete_events'
  | 'insert_results'
  | 'view_stats'
  | 'manage_players'
  | 'link_accounts'
  | 'manage_users'
  | 'manage_telegram'
  | 'view_admin_panel';
export type CodmPermissions = Record<CodmPermissionKey, boolean>;

export type CodmAuthState = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  clanId: string | null;
  clanName: string;
  role: CodmRole;
  permissions: CodmPermissions;
  canView: boolean;
  canWrite: boolean;
  canManageUsers: boolean;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const CODM_PERMISSION_KEYS: CodmPermissionKey[] = [
  'view_events',
  'create_events',
  'edit_events',
  'delete_events',
  'insert_results',
  'view_stats',
  'manage_players',
  'link_accounts',
  'manage_users',
  'manage_telegram',
  'view_admin_panel',
];

const EMPTY_PERMISSIONS = Object.fromEntries(CODM_PERMISSION_KEYS.map((key) => [key, false])) as CodmPermissions;
const FULL_PERMISSIONS = Object.fromEntries(CODM_PERMISSION_KEYS.map((key) => [key, true])) as CodmPermissions;

const ROLE_DEFAULT_PERMISSIONS: Record<CodmRole, CodmPermissions> = {
  anon: { ...EMPTY_PERMISSIONS, view_events: true, view_stats: true },
  registered: { ...EMPTY_PERMISSIONS, view_events: true, view_stats: true },
  viewer: { ...EMPTY_PERMISSIONS, view_events: true, view_stats: true },
  player: { ...EMPTY_PERMISSIONS, view_events: true, view_stats: true },
  staff: { ...EMPTY_PERMISSIONS, view_events: true, create_events: true, edit_events: true, insert_results: true, view_stats: true, manage_players: true },
  coach: { ...EMPTY_PERMISSIONS, view_events: true, create_events: true, edit_events: true, delete_events: true, insert_results: true, view_stats: true, manage_players: true, link_accounts: true, manage_telegram: true, view_admin_panel: true },
  owner: FULL_PERMISSIONS,
};

const WRITE_ROLES: CodmRole[] = ['owner', 'coach', 'staff'];
const USER_MANAGEMENT_ROLES: CodmRole[] = ['owner'];
export const CODM_MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';

export function defaultPermissionsForRole(role: CodmRole): CodmPermissions {
  return { ...(ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.registered) };
}

export function normalizeCodmPermissions(role: CodmRole, raw?: Record<string, unknown> | null): CodmPermissions {
  const base = defaultPermissionsForRole(role);
  if (!raw || typeof raw !== 'object') return base;
  const next = { ...base };
  for (const key of CODM_PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) next[key] = Boolean(raw[key]);
  }
  return next;
}

export function canWriteRole(role: CodmRole) {
  return WRITE_ROLES.includes(role);
}

export function canManageUsersRole(role: CodmRole) {
  return USER_MANAGEMENT_ROLES.includes(role);
}

export function isCodmMainAdminEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase() === CODM_MAIN_ADMIN_EMAIL;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value?: string | null) {
  return typeof value === 'string' && UUID_RE.test(value);
}

async function ensureMainAdminOwner(session: Session | null) {
  if (!session?.access_token || !isCodmMainAdminEmail(session.user?.email)) return null;
  try {
    const response = await fetch('/api/admin/ensure-main-owner', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

async function getAccessForUser(userId: string, clanId: string | null, email?: string | null): Promise<{ role: CodmRole; permissions: CodmPermissions }> {
  if (isCodmMainAdminEmail(email)) return { role: 'owner', permissions: defaultPermissionsForRole('owner') };
  if (!clanId) return { role: 'registered', permissions: defaultPermissionsForRole('registered') };

  let { data, error } = await supabase
    .from('clan_members')
    .select('role,permissions')
    .eq('clan_id', clanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && /permissions|column/i.test(error.message || '')) {
    const fallback = await supabase
      .from('clan_members')
      .select('role')
      .eq('clan_id', clanId)
      .eq('user_id', userId)
      .maybeSingle();
    data = fallback.data as any;
    error = fallback.error;
  }

  if (error) return { role: 'registered', permissions: defaultPermissionsForRole('registered') };
  const role = ((data?.role as CodmRole) || 'registered');
  return { role, permissions: normalizeCodmPermissions(role, (data as any)?.permissions) };
}

export function useCodmAuth(): CodmAuthState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [clanId, setClanId] = useState<string | null>(null);
  const [clanName, setClanName] = useState('AK47DX');
  const [role, setRole] = useState<CodmRole>('anon');
  const [permissions, setPermissions] = useState<CodmPermissions>(() => defaultPermissionsForRole('anon'));

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const activeSession = sessionData.session;
      setSession(activeSession);

      let ensuredOwner: any = null;
      if (activeSession?.user?.id) {
        ensuredOwner = await ensureMainAdminOwner(activeSession);
        if (ensuredOwner?.clanId) {
          cacheClanIdentity({
            clanId: ensuredOwner.clanId,
            clanName: ensuredOwner.clanName || 'AK47DX',
            clanTag: ensuredOwner.clanTag || ensuredOwner.clanName || 'AK47DX'
          });
        }
      }

      const clan = await getFirstClan();
      const resolvedClanId = isUuid(ensuredOwner?.clanId) ? ensuredOwner.clanId : (isUuid(clan.clanId) ? clan.clanId : null);
      const resolvedClanName = ensuredOwner?.clanName || clan.clanName;
      setClanId(resolvedClanId);
      setClanName(resolvedClanName);

      if (!activeSession?.user?.id) {
        setRole('anon');
        setPermissions(defaultPermissionsForRole('anon'));
      } else {
        const access = await getAccessForUser(activeSession.user.id, resolvedClanId, activeSession.user.email);
        setRole(access.role);
        setPermissions(access.permissions);
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

  return useMemo(() => {
    const canWriteFromFlags = permissions.create_events || permissions.edit_events || permissions.delete_events || permissions.insert_results || permissions.manage_players;
    const canManageUsersFromFlags = permissions.manage_users;
    return {
      loading,
      configured: isSupabaseConfigured,
      session,
      user: session?.user || null,
      clanId,
      clanName,
      role,
      permissions,
      canView: permissions.view_events || permissions.view_stats,
      canWrite: canWriteFromFlags || canWriteRole(role),
      canManageUsers: canManageUsersFromFlags || canManageUsersRole(role),
      reload,
      signOut
    };
  }, [loading, session, clanId, clanName, role, permissions, reload, signOut]);
}
