import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveOfficialClanId, isUuid, noStoreHeaders } from '@/lib/server/codmEventsApi';

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

    const { data: events, error: eventsError } = await ctx.admin!
      .from('codm_events')
      .select('*')
      .eq('clan_id', clanId)
      .order('starts_at', { ascending: true })
      .limit(500);
    if (eventsError) throw eventsError;

    const eventIds = (events || []).map((event: any) => event.id).filter((id: unknown): id is string => isUuid(String(id)));
    let eventPlayers: any[] = [];
    if (eventIds.length) {
      const { data, error } = await ctx.admin!
        .from('codm_event_players')
        .select('event_id,player_id,nickname,status')
        .in('event_id', eventIds);
      if (error && error.code !== '42P01') throw error;
      eventPlayers = data || [];
    }

    return noStoreJson({ ok: true, events: events || [], eventPlayers, clanId, serverMode: 'service-role', clientClanIdAccepted: false, localEventsEnabled: false });
  } catch (error) {
    return noStoreJson({ ok: false, error: error instanceof Error ? error.message : 'Errore caricamento eventi.' }, { status: 500 });
  }
}
