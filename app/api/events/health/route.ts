import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveOfficialClanId, isMainAdmin, noStoreHeaders } from '@/lib/server/codmEventsApi';
import { telegramConfigured } from '@/lib/server/codmTelegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, { ...init, headers: noStoreHeaders(init?.headers) });
}

export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const clanId = await resolveOfficialClanId(ctx, false);
    const [{ count }, { data: samples }, { data: member }] = await Promise.all([
      ctx.admin!.from('codm_events').select('id', { count: 'exact', head: true }).eq('clan_id', clanId),
      ctx.admin!.from('codm_events').select('id,title,starts_at,updated_at').eq('clan_id', clanId).order('updated_at', { ascending: false }).limit(5),
      ctx.admin!.from('clan_members').select('role').eq('clan_id', clanId).eq('user_id', ctx.userId).maybeSingle()
    ]);
    return noStoreJson({
      ok: true,
      app: 'CLAN MANAGER',
      mode: 'service-role-required',
      database: 'supabase',
      table: 'public.codm_events',
      resolvedClanId: clanId,
      userEmail: ctx.email,
      userRole: isMainAdmin(ctx.email) ? 'owner-main-admin' : member?.role || 'not-member',
      eventsCount: count || 0,
      lastEvents: samples || [],
      localEventsEnabled: false,
      clientClanIdAccepted: false,
      telegramConfigured: telegramConfigured(),
      serviceRole: true
    });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore health eventi.' }, { status: 500 });
  }
}
