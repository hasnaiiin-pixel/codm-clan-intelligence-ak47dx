import { supabase } from '@/lib/supabaseClient';

export type ClanIdentity = {
  clanId: string | null;
  clanName: string;
  clanTag: string;
  logoUrl?: string | null;
};

export const DEFAULT_CLAN_NAME = 'AK47DX';
export const DEFAULT_CLAN_TAG = 'AK47DX';
export const CLAN_IDENTITY_CACHE_KEY = 'clan_manager_active_clan_identity_v6_7';

function clean(value?: string | null) {
  return String(value || '').trim();
}

export function clanDisplayName(identity?: Partial<ClanIdentity> | null) {
  return clean(identity?.clanTag) || clean(identity?.clanName) || DEFAULT_CLAN_TAG;
}

function readLocalIdentity(): Partial<ClanIdentity> | null {
  if (typeof window === 'undefined') return null;
  try {
    const direct = JSON.parse(window.localStorage.getItem(CLAN_IDENTITY_CACHE_KEY) || 'null');
    if (direct) return direct as Partial<ClanIdentity>;
  } catch {}
  try {
    const profile = JSON.parse(window.localStorage.getItem('codm_clan_hq_profile_v2_0') || 'null');
    if (profile) {
      return {
        clanName: clean(profile.clan_name),
        clanTag: clean(profile.tag),
        logoUrl: clean(profile.logo_url) || null
      };
    }
  } catch {}
  return null;
}

export async function loadClanIdentity(): Promise<ClanIdentity> {
  const local = readLocalIdentity();
  let clanId: string | null = clean(local?.clanId) || null;
  let clanName = clean(local?.clanName);
  let clanTag = clean(local?.clanTag);
  let logoUrl = clean(local?.logoUrl) || null;

  try {
    const { data: clanRows } = await supabase
      .from('clans')
      .select('id,name,tag,logo_url')
      .order('created_at', { ascending: true })
      .limit(1);
    const clan = clanRows?.[0] as { id?: string; name?: string | null; tag?: string | null; logo_url?: string | null } | undefined;
    if (clan?.id) clanId = clan.id;
    if (!clanName) clanName = clean(clan?.name);
    if (!clanTag) clanTag = clean(clan?.tag);
    if (!logoUrl) logoUrl = clean(clan?.logo_url) || null;
  } catch {}

  try {
    const { data: publicProfile } = await supabase
      .from('clan_public_profiles')
      .select('clan_name,tag,logo_url')
      .eq('profile_key', 'main')
      .maybeSingle();
    const profile = publicProfile as { clan_name?: string | null; tag?: string | null; logo_url?: string | null } | null;
    if (clean(profile?.clan_name)) clanName = clean(profile?.clan_name);
    if (clean(profile?.tag)) clanTag = clean(profile?.tag);
    if (clean(profile?.logo_url)) logoUrl = clean(profile?.logo_url) || logoUrl;
  } catch {}

  const identity: ClanIdentity = {
    clanId,
    clanName: clanName || DEFAULT_CLAN_NAME,
    clanTag: clanTag || clanName || DEFAULT_CLAN_TAG,
    logoUrl
  };

  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CLAN_IDENTITY_CACHE_KEY, JSON.stringify(identity)); } catch {}
  }

  return identity;
}

export function cacheClanIdentity(identity: Partial<ClanIdentity>) {
  if (typeof window === 'undefined') return;
  const normalized: ClanIdentity = {
    clanId: clean(identity.clanId) || null,
    clanName: clean(identity.clanName) || DEFAULT_CLAN_NAME,
    clanTag: clean(identity.clanTag) || clean(identity.clanName) || DEFAULT_CLAN_TAG,
    logoUrl: clean(identity.logoUrl) || null
  };
  try { window.localStorage.setItem(CLAN_IDENTITY_CACHE_KEY, JSON.stringify(normalized)); } catch {}
}
