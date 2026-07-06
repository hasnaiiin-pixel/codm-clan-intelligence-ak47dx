import { NextRequest, NextResponse } from 'next/server';
import { getUserContext, resolveClanId, isUuid } from '@/lib/server/codmEventsApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const ctx = await getUserContext(token);
    const requestedClanId = request.nextUrl.searchParams.get('clan_id');
    const clanId = await resolveClanId(ctx, isUuid(requestedClanId) ? requestedClanId : null, false);

    let eventsQuery = ctx.db
      .from('codm_events')
      .select('*')
      .order('starts_at', { ascending: true })
      .limit(500);
    if (clanId) eventsQuery = eventsQuery.eq('clan_id', clanId);

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) throw eventsError;

    const eventIds = (events || []).map((event: any) => event.id).filter((id: unknown): id is string => isUuid(String(id)));
    let eventPlayers: any[] = [];
    if (eventIds.length) {
      const { data, error } = await ctx.db
        .from('codm_event_players')
        .select('event_id,player_id,nickname,status')
        .in('event_id', eventIds);
      if (error) throw error;
      eventPlayers = data || [];
    }

    return NextResponse.json({ ok: true, events: events || [], eventPlayers, clanId, serverMode: ctx.admin ? 'service-role' : 'authenticated-rls' }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore caricamento eventi.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
