import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAIN_ADMIN_EMAIL = 'hasnaiiin@gmail.com';
const DEFAULT_CLAN_NAME = 'AK47DX';
const DEFAULT_CLAN_TAG = 'AK47DX';

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isLegacyClanTag(value?: string | null) {
  const clean = String(value || '').trim().toLowerCase();
  return !clean || ['ak', 'akঐ', 'ѧҝ', 'ѧҝঐ', 'senza clan', 'default'].includes(clean);
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Mancano variabili Supabase server: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ ok: false, error: 'Token login mancante.' }, { status: 401 });

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user?.id) return NextResponse.json({ ok: false, error: 'Sessione non valida.' }, { status: 401 });

    const email = normalizeEmail(userData.user.email);
    if (email !== MAIN_ADMIN_EMAIL) {
      return NextResponse.json({ ok: false, error: 'Questo endpoint è riservato all admin principale.' }, { status: 403 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const userId = userData.user.id;

    const { data: existingClans, error: clanReadError } = await admin
      .from('clans')
      .select('id,name,tag,owner_user_id')
      .or(`owner_user_id.eq.${userId},name.ilike.${DEFAULT_CLAN_NAME},tag.ilike.${DEFAULT_CLAN_TAG},tag.ilike.AK`)
      .order('created_at', { ascending: true })
      .limit(1);

    if (clanReadError) throw clanReadError;

    let clan = existingClans?.[0] as { id: string; name?: string | null; tag?: string | null; owner_user_id?: string | null } | undefined;

    if (!clan?.id) {
      const { data: createdClan, error: createClanError } = await admin
        .from('clans')
        .insert({ name: DEFAULT_CLAN_NAME, tag: DEFAULT_CLAN_TAG, owner_user_id: userId })
        .select('id,name,tag,owner_user_id')
        .single();
      if (createClanError) throw createClanError;
      clan = createdClan as typeof clan;
    } else {
      const nextName = clan.name && clan.name.trim() ? clan.name : DEFAULT_CLAN_NAME;
      const nextTag = isLegacyClanTag(clan.tag) ? DEFAULT_CLAN_TAG : clan.tag;
      const { data: updatedClan, error: updateClanError } = await admin
        .from('clans')
        .update({ owner_user_id: userId, name: nextName, tag: nextTag })
        .eq('id', clan.id)
        .select('id,name,tag,owner_user_id')
        .single();
      if (updateClanError) throw updateClanError;
      clan = updatedClan as typeof clan;
    }

    if (!clan?.id) throw new Error('Clan non trovato o non creato.');

    const { data: memberRows, error: memberReadError } = await admin
      .from('clan_members')
      .select('id,role')
      .eq('clan_id', clan.id)
      .eq('user_id', userId)
      .limit(1);
    if (memberReadError) throw memberReadError;

    const member = memberRows?.[0] as { id: string; role?: string | null } | undefined;
    if (member?.id) {
      const { error: updateMemberError } = await admin
        .from('clan_members')
        .update({ role: 'owner' })
        .eq('id', member.id);
      if (updateMemberError) throw updateMemberError;
    } else {
      const { error: insertMemberError } = await admin
        .from('clan_members')
        .insert({ clan_id: clan.id, user_id: userId, role: 'owner' });
      if (insertMemberError) throw insertMemberError;
    }

    // Corregge anche eventuali player creati automaticamente con TAG legacy.
    await admin
      .from('players')
      .update({ clan_name: DEFAULT_CLAN_TAG })
      .eq('clan_id', clan.id)
      .in('clan_name', ['AK', 'AKঐ', 'ѦҞ', 'ѦҞঐ', 'Senza clan', 'default']);

    return NextResponse.json({ ok: true, role: 'owner', clanId: clan.id, clanName: clan.name || DEFAULT_CLAN_NAME, clanTag: clan.tag || DEFAULT_CLAN_TAG });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore assegnazione admin principale.' }, { status: 500 });
  }
}
